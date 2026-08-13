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
    // Attach the public profile (name/username) if one exists.
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, username')
        .eq('id', user.id)
        .maybeSingle();
      if (profile) {
        req.user.name = profile.name;
        req.user.username = profile.username;
      }
    } catch (_) { /* profiles table may not exist yet */ }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
}

// ==================== AUTH ROUTES ====================

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, username } = req.body;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedUsername = String(username || '').trim().toLowerCase().replace(/^@/, '');
  const displayName = String(name || '').trim();

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
      data: { name: displayName, username: normalizedUsername }
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
        username: normalizedUsername
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
    user: { ...data.user, name: displayName, username: normalizedUsername },
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
  const { email, password } = req.body;
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

  // Attach the public profile (name/username) to the returned user.
  let profile = null;
  if (data.user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('name, username')
      .eq('id', data.user.id)
      .maybeSingle();
    if (prof) profile = prof;
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
    .select('name, username')
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

  const { data: comment } = await supabase
    .from('comments')
    .select('id, likes_count')
    .eq('id', commentId)
    .maybeSingle();

  if (!comment) return res.status(404).json({ error: 'Comment not found.' });

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .maybeSingle();

  let liked = true;
  const currentLikes = Number(comment.likes_count) || 0;

  if (existing) {
    liked = false;
    await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', userId);
    await supabase
      .from('comments')
      .update({ likes_count: Math.max(0, currentLikes - 1) })
      .eq('id', commentId);
  } else {
    const { error: likeError } = await supabase
      .from('comment_likes')
      .insert([{ comment_id: commentId, user_id: userId }]);
    if (likeError) {
      if (/does not exist|could not find the table|schema cache/i.test(likeError.message)) {
        return res.status(501).json({ error: 'Comment likes are not enabled yet. Run backend/migrations.sql in your Supabase SQL editor to enable them.' });
      }
      return res.status(400).json({ error: likeError.message });
    }
    await supabase
      .from('comments')
      .update({ likes_count: currentLikes + 1 })
      .eq('id', commentId);
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

// ==================== GEMINI AI ASSISTANT ====================

app.post('/api/ai-assistant', async (req, res) => {
  try {
    const { prompt } = req.body;
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

    const systemInstruction = `You are "NuroTewedede AI", an expert agricultural supply planner, group-buying coordinator, and food inflation advisor in Ethiopia.
Your mission is to help community leaders, families, and neighborhood hubs organize direct bulk purchasing from farming woredas (e.g. Gojjam, Sidama, Ziway, Arsi, Jimma).
Give practical, warm, well-structured, and helpful advice on:
1. Bulk produce quantities & cost estimates in ETB (Ethiopian Birr).
2. Proper produce storage & preservation (e.g., storing 50kg Teff bags, 25kg red onions, coffee beans).
3. Harvest timing and seasonal price trends in Ethiopian markets.
4. Recipe scaling for community feasts or holiday celebrations (Enkutatash, Meskel, Genna, Timkat, Eid).
5. Neighborhood pool logistics & fair cost sharing.

Keep formatting clean with bullet points and bold highlights. Always be encouraging, practical, and culturally authentic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || 'I apologize, but I could not generate a response at this time. Please try asking again!';
    res.json({ reply: replyText });
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
