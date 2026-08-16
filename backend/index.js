require('dotenv').config({ path: require('node:path').join(__dirname, '.env') });
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Serve the frontend site from the sibling 'nurotewedede' folder
const FRONTEND_DIR = path.join(__dirname, '..', 'nurotewedede');
app.use(express.static(FRONTEND_DIR));

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Helper middleware to verify Supabase session token from cookies or headers
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies['sb-access-token'] || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    req.user = user;
    // Attach the public profile (name/username/role) if one exists.
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, username, role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        req.user.name = profile.name;
        req.user.username = profile.username;
        req.user.role = profile.role || 'buyer';
      }
    } catch (_) { /* profiles table may not exist yet */ }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
}

// Restrict a route to verified seller accounts. Must be chained AFTER requireAuth
// so req.user (with its attached role) is already populated.
function requireSeller(req, res, next) {
  if (!req.user || req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller account required. Please sign in as a Seller to access this feature.' });
  }
  next();
}

// Create a Supabase client bound to the request's user session, so RLS
// policies see auth.uid() = the signed-in user (the shared anon client
// cannot pass RLS checks that depend on the user's identity).
function authedSupabase(req) {
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  return createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: 'Bearer ' + token } }
  });
}

function likesNotEnabled(res) {
  return res.status(501).json({ error: 'Comment likes are not enabled yet. Run backend/migrations.sql in your Supabase SQL editor to enable them.' });
}

// ==================== AUTH ROUTES ====================

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, username, role } = req.body;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedUsername = String(username || '').trim().toLowerCase().replace(/^@/, '');
  const displayName = String(name || '').trim();
  const userRole = ['buyer', 'seller'].includes(role) ? role : 'buyer';

  if (!normalizedEmail || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!normalizedUsername || !/^[a-z0-9_.]+$/.test(normalizedUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores and dots.' });
  }

  // Usernames must be unique — check before creating the auth user.
  const { data: existingProfile, error: lookupError } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', normalizedUsername)
    .maybeSingle();
  if (lookupError && !/does not exist|could not find|schema cache/i.test(lookupError.message)) {
    return res.status(500).json({ error: lookupError.message });
  }
  if (existingProfile) {
    return res.status(400).json({ error: 'That username is already taken.' });
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { name: displayName, username: normalizedUsername, role: userRole }
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  // Profile row is created automatically by the handle_new_user() trigger.
  // If the trigger isn't installed yet, create it here as a fallback.
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: data.user.id,
        email: normalizedEmail,
        name: displayName,
        username: normalizedUsername,
        role: userRole
      }]);
    if (profileError && !/does not exist|could not find|schema cache/i.test(profileError.message)) {
      if (/duplicate|unique|already/i.test(profileError.message)) {
        return res.status(400).json({ error: 'That username is already taken.' });
      }
      console.error('Profile insert error:', profileError.message);
    }
  }

  if (data.session) {
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }

  res.json({
    message: 'User registered successfully',
    user: { ...data.user, name: displayName, username: normalizedUsername, role: userRole },
    session: data.session
  });
});

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { count, error } = await supabase.from('pools').select('id', { count: 'exact', head: true });
    if (error) return res.json({ status: 'ok', poolsCount: 0, db: 'unavailable' });
    res.json({ status: 'ok', poolsCount: count, db: 'connected' });
  } catch (err) {
    res.json({ status: 'ok', poolsCount: 0, db: 'unavailable' });
  }
});

// Sign In (with email OR username)
app.post('/api/auth/login', async (req, res) => {
  const { email, password, role } = req.body;
  const identifier = String(email || '').trim();
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' });
  }

  let loginEmail = identifier.toLowerCase();
  if (!identifier.includes('@')) {
    // Treat the identifier as a username and resolve it to the account's email.
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', identifier.toLowerCase().replace(/^@/, ''))
      .maybeSingle();
    if (lookupError && !/does not exist|could not find|schema cache/i.test(lookupError.message)) {
      return res.status(500).json({ error: lookupError.message });
    }
    if (!profile) {
      return res.status(400).json({ error: 'No account found with that username.' });
    }
    loginEmail = profile.email;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });

  if (error) return res.status(400).json({ error: error.message });

  // Attach the public profile (name/username/role) to the returned user.
  let profile = null;
  if (data.user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('name, username, role')
      .eq('id', data.user.id)
      .maybeSingle();
    if (prof) profile = prof;

    // The user picked a portal at sign-in ("Continue as Buyer/Seller").
    // Honor that choice by updating their stored role so routing is consistent
    // across sessions and devices.
    const selectedRole = ['buyer', 'seller'].includes(role) ? role : null;
    if (selectedRole && profile && profile.role !== selectedRole) {
      await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', data.user.id);
      profile.role = selectedRole;
    }
  }

  // Set secure cookie for session
  res.cookie('sb-access-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({ message: 'Signed in successfully', user: { ...data.user, ...(profile || {}) }, session: data.session });
});

// Get Current User Session
app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ user: null });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ user: null });

  let profile = null;
  const { data: prof } = await supabase
    .from('profiles')
    .select('name, username, role')
    .eq('id', user.id)
    .maybeSingle();
  if (prof) profile = prof;

  res.json({ user: { ...user, ...(profile || {}) } });
});

// Sign Out
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('sb-access-token');
  res.json({ message: 'Signed out successfully' });
});

// ==================== MARKETPLACE / SUPPLY ROUTES ====================

const PRODUCT_STATUSES = ['active', 'draft', 'sold', 'inactive'];
const PRODUCT_VOLUME_UNITS = ['quintal', 'kg', 'mt'];
const PRODUCT_PRICING_MODELS = ['fixed', 'negotiable'];

// Get All Active Product Listings (public marketplace).
// Optional filters: ?crop= , ?town= , ?search=
app.get('/api/products', async (req, res) => {
  const { crop, town, search } = req.query;

  let query = supabase
    .from('products')
    .select('*')
    .eq('status', 'active');

  if (crop && crop !== 'All') query = query.eq('crop_type', crop);
  if (town && town !== 'All') query = query.eq('origin_town', town);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    if (/does not exist|could not find|schema cache/i.test(error.message)) {
      return res.status(503).json({ error: 'The products table has not been created yet. Run backend/migrations.sql in your Supabase SQL editor first.' });
    }
    return res.status(500).json({ error: error.message });
  }

  let products = data || [];
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase();
    products = products.filter(p =>
      String(p.crop_type || '').toLowerCase().includes(q) ||
      String(p.variety || '').toLowerCase().includes(q) ||
      String(p.origin_region || '').toLowerCase().includes(q) ||
      String(p.origin_zone || '').toLowerCase().includes(q) ||
      String(p.origin_town || '').toLowerCase().includes(q) ||
      String(p.seller_name || '').toLowerCase().includes(q)
    );
  }

  res.json({ products });
});

// Get the signed-in seller's own listings (any status).
app.get('/api/products/mine', requireAuth, requireSeller, async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    if (/does not exist|could not find|schema cache/i.test(error.message)) {
      return res.status(503).json({ error: 'The products table has not been created yet. Run backend/migrations.sql in your Supabase SQL editor first.' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json({ products: data || [] });
});

// Get a single listing (public).
app.get('/api/products/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', Number(req.params.id))
    .maybeSingle();
  if (error) {
    if (/does not exist|could not find|schema cache/i.test(error.message)) {
      return res.status(503).json({ error: 'The products table has not been created yet. Run backend/migrations.sql in your Supabase SQL editor first.' });
    }
    return res.status(500).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: 'Listing not found.' });
  res.json({ product: data });
});

// Create a Listing ("+ List Your Harvest") — seller only.
app.post('/api/products', requireAuth, requireSeller, async (req, res) => {
  const {
    cropType, variety, grade, moistureContent, cleanliness, harvestYear,
    volume, volumeUnit, minOrderLot, minOrderUnit,
    pricingModel, pricePerUnit,
    originRegion, originZone, originTown,
    availabilityFrom, availabilityTo, photos, description
  } = req.body;

  if (!cropType || !volume || !pricePerUnit) {
    return res.status(400).json({ error: 'Crop type, volume and price per unit are required.' });
  }

  const unit = PRODUCT_VOLUME_UNITS.includes(volumeUnit) ? volumeUnit : 'quintal';
  const minUnit = PRODUCT_VOLUME_UNITS.includes(minOrderUnit) ? minOrderUnit : unit;
  const model = PRODUCT_PRICING_MODELS.includes(pricingModel) ? pricingModel : 'fixed';

  const insertPayload = {
    seller_id: req.user.id,
    seller_name: req.user.name || req.user.username || 'Seller',
    crop_type: cropType,
    variety: String(variety || ''),
    grade: String(grade || ''),
    moisture_content: moistureContent != null && moistureContent !== '' ? Number(moistureContent) : null,
    cleanliness: cleanliness != null && cleanliness !== '' ? Number(cleanliness) : null,
    harvest_year: String(harvestYear || ''),
    volume: Number(volume) || 0,
    volume_unit: unit,
    min_order_lot: Number(minOrderLot) || 0,
    min_order_unit: minUnit,
    pricing_model: model,
    price_per_unit: Number(pricePerUnit) || 0,
    currency: 'ETB',
    origin_region: String(originRegion || ''),
    origin_zone: String(originZone || ''),
    origin_town: String(originTown || ''),
    availability_from: availabilityFrom || null,
    availability_to: availabilityTo || null,
    photos: Array.isArray(photos) ? photos : [],
    description: String(description || ''),
    status: 'active'
  };

  const { data, error } = await supabase
    .from('products')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    if (/does not exist|could not find|schema cache/i.test(error.message)) {
      return res.status(503).json({ error: 'The products table has not been created yet. Run backend/migrations.sql in your Supabase SQL editor first.' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ message: 'Listing published', product: data });
});

// Update a Listing — seller owns it.
app.put('/api/products/:id', requireAuth, requireSeller, async (req, res) => {
  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select('seller_id')
    .eq('id', Number(req.params.id))
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!existing) return res.status(404).json({ error: 'Listing not found.' });
  if (existing.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only edit your own listings.' });
  }

  const allowed = {
    crop_type: 'cropType',
    variety: 'variety',
    grade: 'grade',
    harvest_year: 'harvestYear',
    volume: 'volume',
    volume_unit: 'volumeUnit',
    min_order_lot: 'minOrderLot',
    min_order_unit: 'minOrderUnit',
    pricing_model: 'pricingModel',
    price_per_unit: 'pricePerUnit',
    origin_region: 'originRegion',
    origin_zone: 'originZone',
    origin_town: 'originTown',
    availability_from: 'availabilityFrom',
    availability_to: 'availabilityTo',
    photos: 'photos',
    description: 'description',
    status: 'status'
  };

  const updates = {};
  for (const [dbKey, bodyKey] of Object.entries(allowed)) {
    if (req.body[bodyKey] !== undefined) {
      let value = req.body[bodyKey];
      if (['volume', 'min_order_lot', 'price_per_unit'].includes(dbKey)) value = Number(value) || 0;
      if (dbKey === 'status' && !PRODUCT_STATUSES.includes(value)) value = 'active';
      updates[dbKey] = value;
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', Number(req.params.id))
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Listing updated', product: data });
});

// Delete a Listing — seller owns it.
app.delete('/api/products/:id', requireAuth, requireSeller, async (req, res) => {
  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select('seller_id')
    .eq('id', Number(req.params.id))
    .maybeSingle();
  if (fetchError) return res.status(500).json({ error: fetchError.message });
  if (!existing) return res.status(404).json({ error: 'Listing not found.' });
  if (existing.seller_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only delete your own listings.' });
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', Number(req.params.id));
  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Listing deleted' });
});

// ==================== POOL ROUTES ====================

// Get All Pools (optional filters: ?town= , ?category= , ?search=)
app.get('/api/pools', async (req, res) => {
  const { town, category, search } = req.query;

  let query = supabase.from('pools').select('*');
  if (town && town !== 'All') query = query.eq('town', town);
  if (category && category !== 'All') query = query.eq('category', category);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let pools = data || [];
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase();
    pools = pools.filter(p =>
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.woreda || '').toLowerCase().includes(q) ||
      String(p.town || '').toLowerCase().includes(q) ||
      String(p.category || '').toLowerCase().includes(q)
    );
  }

  res.json({ pools });
});

// Create a New Pool (Protected Route)
app.post('/api/pools', requireAuth, async (req, res) => {
  const {
    title, category, town, woreda, price, retailPrice,
    unit, targetShares, hubLocation, organizer
  } = req.body;

  if (!title || !town || !woreda || !price || !targetShares) {
    return res.status(400).json({ error: 'Title, town, woreda, price and target shares are required.' });
  }

  const priceNum = Number(price);
  const retailPriceNum = retailPrice ? Number(retailPrice) : Math.round(priceNum * 1.45); // 45% standard retail markup

  const insertPayload = {
    title,
    town,
    price: priceNum,
    retail_price: retailPriceNum,
    target_shares: Number(targetShares),
    current_shares: 0,
    woreda,
    category: category || 'Grains & Teff',
    unit: unit || '50 kg Bag',
    hub_location: hubLocation || `${town} Neighborhood Distribution Hub`,
    organizer: organizer || 'Neighborhood Group Coordinator',
    pickup_date: 'Next Week',
    status: 'active',
    comments_count: 0,
    image_url: ''
  };

  let { data, error } = await supabase
    .from('pools')
    .insert([insertPayload])
    .select()
    .single();

  // Fallback: new columns may not exist yet if the migration has not been run
  if (error) {
    const basePayload = {
      title, town, price: priceNum, retail_price: retailPriceNum,
      target_shares: Number(targetShares), current_shares: 0, woreda
    };
    const retry = await supabase.from('pools').insert([basePayload]).select().single();
    if (retry.error) return res.status(500).json({ error: retry.error.message });
    data = retry.data;
  }

  res.status(201).json({ message: 'Pool created successfully', pool: data });
});

// Reserve Share(s) in a Pool (Protected Route)
app.post('/api/pools/:id/reserve', requireAuth, async (req, res) => {
  const poolId = req.params.id;
  const userId = req.user.id;
  const shares = Math.max(1, Math.floor(Number(req.body.shares) || 1));
  const paymentMethod = ['telebirr', 'cbe', 'cash'].includes(req.body.paymentMethod)
    ? req.body.paymentMethod
    : 'telebirr';

  // 1. Fetch current pool status
  const { data: pool, error: fetchError } = await supabase
    .from('pools')
    .select('*')
    .eq('id', poolId)
    .single();

  if (fetchError || !pool) return res.status(404).json({ error: 'Pool not found.' });

  const current = Number(pool.current_shares) || 0;
  const target = Number(pool.target_shares) || 1;
  const status = pool.status; // undefined until the migration adds the column

  if (status === 'in_transit' || status === 'ready_for_pickup') {
    return res.status(400).json({ error: 'This pool has already been locked and dispatched.' });
  }
  if (current >= target) {
    return res.status(400).json({ error: 'This pool has reached its target shares.' });
  }

  const addedShares = Math.min(shares, target - current);
  const voucherCode = `NT-${Math.floor(100000 + Math.random() * 900000)}`;

  // 2. Insert reservation record
  const { error: reserveError } = await supabase
    .from('reservations')
    .insert([{
      pool_id: poolId,
      user_id: userId,
      shares: addedShares,
      payment_method: paymentMethod,
      voucher_code: voucherCode
    }]);

  if (reserveError) {
    // Migration not run yet: fall back to the minimal columns that exist in the base schema.
    const retry = await supabase
      .from('reservations')
      .insert([{ pool_id: poolId, user_id: userId }]);
    if (retry.error) return res.status(400).json({ error: 'Could not reserve share: ' + retry.error.message });
  }

  // 3. Increment share count (and lock the pool when it fills up)
  const newShares = current + addedShares;
  const isNowLocked = newShares >= target;
  const updatePayload = { current_shares: newShares };
  if (status !== undefined && isNowLocked && status !== 'locked') {
    updatePayload.status = 'locked';
  }

  const { data: updatedPool, error: updateError } = await supabase
    .from('pools')
    .update(updatePayload)
    .eq('id', poolId)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({
    message: 'Share(s) reserved successfully!',
    pool: updatedPool,
    reservation: { shares: addedShares, paymentMethod, voucherCode }
  });
});

// ==================== COMMENTS ROUTES ====================

// Get Comments for a Pool
app.get('/api/pools/:id/comments', async (req, res) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('pool_id', req.params.id)
    .order('created_at', { ascending: false });

  // Attach a "liked" flag for the current user, if a session token is present.
  let likedByMe = {};
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.split(' ')[1];
  if (token && data && data.length) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user && data.length) {
        const ids = data.map(c => c.id);
        const { data: likes } = await supabase
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', ids);
        if (likes) likes.forEach(l => { likedByMe[l.comment_id] = true; });
      }
    } catch (_) { /* optional enhancement */ }
  }

  if (error) {
    // The comments table does not exist yet if the migration has not been run
    if (/does not exist|could not find the table|schema cache/i.test(error.message)) {
      return res.json({ comments: [] });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ comments: (data || []).map(c => ({ ...c, liked: !!likedByMe[c.id] })) });
});

// Toggle a like on a comment (Protected Route)
app.post('/api/comments/:id/like', requireAuth, async (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;
  const db = authedSupabase(req);

  const { data: comment, error: findError } = await supabase
    .from('comments')
    .select('id, likes_count')
    .eq('id', commentId)
    .maybeSingle();

  if (findError) {
    if (/does not exist|could not find the table|column|schema cache/i.test(findError.message)) {
      return likesNotEnabled(res);
    }
    return res.status(500).json({ error: findError.message });
  }
  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  const { data: existing, error: existingError } = await db
    .from('comment_likes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingError && !/does not exist|could not find the table|schema cache/i.test(existingError.message)) {
    return res.status(500).json({ error: existingError.message });
  }

  let liked = true;
  const currentLikes = Number(comment.likes_count) || 0;

  if (existing) {
    liked = false;
    const { error: delError } = await db
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);
    if (delError) {
      if (/does not exist|could not find the table|schema cache/i.test(delError.message)) {
        return likesNotEnabled(res);
      }
      return res.status(400).json({ error: delError.message });
    }
    const { error: bumpError } = await db
      .from('comments')
      .update({ likes_count: Math.max(0, currentLikes - 1) })
      .eq('id', commentId);
    if (bumpError && /does not exist|could not find the table|column|schema cache/i.test(bumpError.message)) {
      return likesNotEnabled(res);
    }
  } else {
    const { error: likeError } = await db
      .from('comment_likes')
      .insert([{ comment_id: commentId, user_id: userId }]);
    if (likeError) {
      if (/does not exist|could not find the table|schema cache/i.test(likeError.message)) {
        return likesNotEnabled(res);
      }
      return res.status(400).json({ error: likeError.message });
    }
    const { error: bumpError } = await db
      .from('comments')
      .update({ likes_count: currentLikes + 1 })
      .eq('id', commentId);
    if (bumpError && /does not exist|could not find the table|column|schema cache/i.test(bumpError.message)) {
      return likesNotEnabled(res);
    }
  }

  const newCount = Math.max(0, currentLikes + (liked ? 1 : -1));
  res.json({ liked, likes: newCount });
});

// Post Comment for a Pool (Protected Route)
app.post('/api/pools/:id/comments', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment text cannot be empty' });
  }

  const poolId = req.params.id;
  const userName = req.user.username || req.user.name || (req.user.email || 'Neighbor Buyer').split('@')[0];

  const { data: pool } = await supabase
    .from('pools')
    .select('town, comments_count')
    .eq('id', poolId)
    .single();

  const { data: comment, error: commentError } = await supabase
    .from('comments')
    .insert([{
      pool_id: poolId,
      user_id: req.user.id,
      user_name: userName,
      user_town: pool?.town || 'Addis Ababa',
      text: text.trim()
    }])
    .select()
    .single();

  if (commentError) {
    // The comments table does not exist yet if the migration has not been run
    if (/does not exist|could not find the table|schema cache/i.test(commentError.message)) {
      return res.status(501).json({ error: 'The community board is not available yet. Run backend/migrations.sql in your Supabase SQL editor to enable comments.' });
    }
    return res.status(400).json({ error: commentError.message });
  }

  // Bump the pool comment counter (only when the column exists)
  if (pool && pool.comments_count !== undefined) {
    await supabase
      .from('pools')
      .update({ comments_count: (pool.comments_count || 0) + 1 })
      .eq('id', poolId);
  }

  res.status(201).json({ comment });
});

// ==================== MY RESERVATIONS ====================

// Get the signed-in user's reservations with their pool details
app.get('/api/reservations/mine', requireAuth, async (req, res) => {
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Prefer the rich column set (available after migrations.sql has been run).
  let { data: pools, error: poolError } = await supabase
    .from('pools')
    .select('id, title, price, retail_price, unit, town, woreda, hub_location, pickup_date, image_url, category, status');

  // Migration not run yet: fall back to the columns that exist in the base schema.
  if (poolError) {
    const { data: basePools, error: baseError } = await supabase
      .from('pools')
      .select('id, title, price, retail_price, town, woreda');
    if (baseError) return res.status(500).json({ error: baseError.message });
    pools = basePools;
  }

  const poolMap = new Map((pools || []).map(p => [String(p.id), p]));

  const enriched = (reservations || []).map(r => ({
    ...r,
    pool: poolMap.get(String(r.pool_id)) || null
  }));

  res.json({ reservations: enriched });
});

// ==================== GEMINI AI ASSISTANT (action-aware) ====================

// Resolve the signed-in user (optional) so the assistant can act on their behalf.
async function resolveAiUser(req) {
  try {
    const token = req.cookies['sb-access-token'] || req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    let profile = {};
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name, username, role')
        .eq('id', user.id)
        .maybeSingle();
      if (data) profile = data;
    } catch (_) { /* profiles table may not exist yet */ }
    return { id: user.id, email: user.email, name: profile.name || '', username: profile.username || '', role: profile.role || 'buyer' };
  } catch (_) {
    return null;
  }
}

app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { prompt, role, context } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Add it to backend/.env to enable the AI Supply Assistant.'
      });
    }

    let GoogleGenAI;
    try {
      ({ GoogleGenAI } = require('@google/genai'));
    } catch (e) {
      return res.status(500).json({ error: 'AI package not installed. Run: npm install @google/genai' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    // --- Trusted live context (never trust the model for ids / numbers) ---
    const user = await resolveAiUser(req);
    const roleHint = (role === 'seller') ? 'seller' : 'buyer';
    const effectiveRole = user ? user.role : roleHint;

    let pools = [];
    let products = [];
    let reservations = [];
    let myListings = [];

    try {
      const { data } = await supabase.from('pools').select('*').order('created_at', { ascending: false }).limit(8);
      pools = data || [];
    } catch (_) { /* pools may be unavailable */ }

    try {
      const { data } = await supabase.from('products').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(10);
      products = data || [];
    } catch (_) { /* products table may not exist yet */ }

    if (user) {
      try {
        const { data } = await supabase.from('reservations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8);
        reservations = data || [];
      } catch (_) { /* reservations may be unavailable */ }
      if (effectiveRole === 'seller') {
        try {
          const { data } = await supabase.from('products').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }).limit(10);
          myListings = data || [];
        } catch (_) { /* products table may not exist yet */ }
      }
    }

    const compactPools = pools.map(p => ({
      id: p.id,
      title: p.title || 'Untitled pool',
      category: p.category || '',
      town: p.town || '',
      unit: p.unit || 'bag',
      price: p.price ?? 0,
      retailPrice: p.retail_price ?? 0,
      currentShares: p.current_shares ?? 0,
      targetShares: p.target_shares ?? 0,
      status: p.status || 'active'
    }));

    const compactProducts = products.map(p => ({
      id: p.id,
      seller: p.seller_name || 'Seller',
      crop: p.crop_type || '',
      variety: p.variety || '',
      grade: p.grade || '',
      volume: p.volume ?? 0,
      volumeUnit: p.volume_unit || 'quintal',
      pricePerUnit: p.price_per_unit ?? 0,
      minOrderUnit: p.min_order_unit || p.volume_unit || 'quintal',
      pricing: p.pricing_model || 'fixed',
      origin: [p.origin_region, p.origin_zone, p.origin_town].filter(Boolean).join(', ')
    }));

    const compactReservations = reservations.map(r => ({
      poolId: r.pool_id,
      shares: r.shares ?? 1,
      paymentMethod: r.payment_method || 'telebirr',
      status: r.status || 'active',
      voucher: r.voucher_code || ''
    }));

    const compactMyListings = myListings.map(p => ({
      id: p.id,
      crop: p.crop_type || '',
      variety: p.variety || '',
      grade: p.grade || '',
      volume: p.volume ?? 0,
      volumeUnit: p.volume_unit || 'quintal',
      pricePerUnit: p.price_per_unit ?? 0,
      minOrderUnit: p.min_order_unit || 'quintal',
      pricing: p.pricing_model || 'fixed',
      status: p.status || 'active',
      origin: [p.origin_region, p.origin_zone, p.origin_town].filter(Boolean).join(', ')
    }));

    const clientListingContext = (effectiveRole === 'seller' && context && typeof context === 'string')
      ? `\n\nAdditional listing details provided by the client for this session:\n${context}`
      : '';

    const contextBlock = `\n\n===== LIVE SITE DATA (trust only these ids and numbers) =====
Signed-in user: ${user ? (user.name || user.username || user.email) + ' (role: ' + user.role + ')' : 'none (not signed in)'}
Requested role lens: ${effectiveRole}

Active community pools:
${compactPools.length ? JSON.stringify(compactPools) : '(none available right now)'}

Marketplace listings from sellers (buyable):
${compactProducts.length ? JSON.stringify(compactProducts) : '(none available right now)'}

${user ? 'My reservations:\n' + (compactReservations.length ? JSON.stringify(compactReservations) : '(none yet)') + '\n' : ''}
${user && effectiveRole === 'seller' ? 'My marketplace listings:\n' + (compactMyListings.length ? JSON.stringify(compactMyListings) : '(none yet)') + '\n' : ''}
${clientListingContext}
===== END OF LIVE DATA =====`;

    const ACTION_SCHEMA = `You may also help the user actually DO things. Always answer in English unless the user writes in another language (then match it).
If the user asks to place an order, reserve shares, mark a listing sold, update a listing, or create a listing, and the data to do it is in the LIVE SITE DATA above, you MUST respond with a structured action instead of just advice.
Valid action types:
- "reserve_shares": { poolId, shares, paymentMethod } — buyer reserves {shares} in an existing pool (use only a pool id from the LIVE DATA). paymentMethod must be one of: "telebirr", "cbe", "cash". Requires a signed-in user.
- "create_listing_draft": { cropType, variety, grade, volume, volumeUnit, minOrderLot, minOrderUnit, pricingModel, pricePerUnit, originRegion, originZone, originTown, harvestYear, description } — seller wants to list new supply. volumeUnit/minOrderUnit must be one of: "quintal", "kg", "mt". pricingModel must be "fixed" or "negotiable". pricePerUnit is ETB per minOrderUnit. Requires a signed-in seller.
- "update_listing": { productId, ...only the fields the user wants changed, using the create_listing_draft field names } — seller edits one of their OWN listings (id from LIVE DATA "My marketplace listings"). Requires a signed-in seller.
- "mark_sold": { productId } — seller marks one of their OWN listings as sold. Requires a signed-in seller.

Rules:
1. NEVER invent pool ids, product ids, prices, or volumes. Only use values present in LIVE SITE DATA.
2. If the user is not signed in and tries an action, set action to null and gently tell them to sign in first in your reply.
3. If the data needed for the action is missing (e.g. no matching pool), set action to null and explain in your reply.
4. For pure questions/advice, set action to null.
5. For sellers, prefer advice and actions based on their OWN listings ("My marketplace listings") when relevant.
6. Convert share/order totals to ETB in the reply (e.g. pool price x shares).`;

    const isSeller = effectiveRole === 'seller';

    const BUYER_INSTRUCTION = `You are "NuroTewedede AI", an expert agricultural supply planner, group-buying coordinator, and food inflation advisor in Ethiopia.
Your mission is to help community leaders, families, and neighborhood hubs organize direct bulk purchasing from farming woredas (e.g. Gojjam, Sidama, Ziway, Arsi, Jimma).
Give practical, warm, well-structured, and helpful advice on:
1. Bulk produce quantities & cost estimates in ETB (Ethiopian Birr).
2. Proper produce storage & preservation (e.g., storing 50kg Teff bags, 25kg red onions, coffee beans).
3. Harvest timing and seasonal price trends in Ethiopian markets.
4. Recipe scaling for community feasts or holiday celebrations (Enkutatash, Meskel, Genna, Timkat, Eid).
5. Neighborhood pool logistics & fair cost sharing.
When a pool or marketplace listing from the LIVE SITE DATA matches the user's request, reference it by name and help them reserve/order it.

Keep formatting clean with bullet points and bold highlights. Always be encouraging, practical, and culturally authentic.`;

    const SELLER_INSTRUCTION = `You are "NuroTewedede AI", an expert agricultural marketing and wholesale pricing advisor for smallholder farmers and sellers in Ethiopia.
Your mission is to help farmers and sellers earn fair prices by listing quality-graded supply on the NuroTewedede marketplace and reaching buyers in urban hubs (Addis Ababa, Bahir Dar, Hawassa, Dire Dawa, Jimma, Mekelle).
Give practical, warm, well-structured, and helpful advice on:
1. Pricing guidance in ETB: how to set fixed vs negotiable prices per quintal, kg, or metric ton for crops like Teff, Wheat, Maize, Onions, Coffee, and Pulses.
2. Quality & grading: how moisture content and cleanliness percentage affect grade and price, and what grades wholesale buyers expect.
3. Listing best practices: writing a strong marketplace listing (volume, min order lot, harvest year, origin region/zone/town, photos, description) that attracts serious buyers.
4. Market demand & timing: when wholesale demand and prices peak for common crops across Ethiopia, and seasonal sell recommendations.
5. Inventory & post-harvest management: storing bulk stock, keeping quality, updating available volumes, and marking listings sold.
6. Fair trade: comparing offers, avoiding exploitative middlemen, and keeping sales records.
When the seller mentions their own listings, reference the LIVE SITE DATA "My marketplace listings" and tailor advice to them.

Keep formatting clean with bullet points and bold highlights. Always be encouraging, practical, and culturally authentic.`;

    const systemInstruction = (isSeller ? SELLER_INSTRUCTION : BUYER_INSTRUCTION) + contextBlock + '\n\n' + ACTION_SCHEMA;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        responseMimeType: 'application/json'
      }
    });

    const rawText = response.text || '';

    // Parse the model's JSON envelope: { reply, action }
    let replyText = rawText;
    let action = null;
    try {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed.reply === 'string') {
        replyText = parsed.reply;
      }
      if (parsed && parsed.action && typeof parsed.action === 'object' && parsed.action.type) {
        action = parsed.action;
      }
    } catch (_) {
      // Not JSON — treat the raw text as a plain advice reply.
    }

    // Safety: never pass an action that requires identity when the user is signed out.
    const AUTH_ACTION_TYPES = ['reserve_shares', 'create_listing_draft', 'update_listing', 'mark_sold'];
    if (action && AUTH_ACTION_TYPES.includes(action.type) && !user) {
      action = null;
      replyText = replyText || 'You need to sign in before I can place orders, reserve shares, or manage listings for you.';
    }

    // Safety: sellers can only act on their OWN listings.
    if (action && (action.type === 'update_listing' || action.type === 'mark_sold')) {
      const ok = myListings.some(p => String(p.id) === String(action.productId));
      if (!ok) action = null;
    }
    if (action && action.type === 'create_listing_draft' && (!user || user.role !== 'seller')) {
      action = null;
      replyText = replyText || 'You need to be signed in as a Seller to list new harvest. Choose "Continue as Seller" to get started.';
    }

    if (!replyText || !replyText.trim()) {
      replyText = 'I apologize, but I could not generate a response at this time. Please try asking again!';
    }

    res.json({ reply: replyText, action: action });
  } catch (err) {
    console.error('Gemini AI assistant error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate AI response' });
  }
});

// Serve the frontend for any other GET route (single-page app)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  }
  next();
});

// Central error handler: return JSON for any unhandled error (Express 5 forwards async rejections here)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`NuroTewedede backend running on http://localhost:${PORT}`);
});
