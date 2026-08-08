require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

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
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
}

// ==================== AUTH ROUTES ====================

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  
  if (error) return res.status(400).json({ error: error.message });
  
  res.json({ message: 'User registered successfully', user: data.user });
});

// Sign In
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return res.status(400).json({ error: error.message });

  // Set secure cookie for session
  res.cookie('sb-access-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({ message: 'Signed in successfully', user: data.user, session: data.session });
});

// Get Current User Session
app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies['sb-access-token'] || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ user: null });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ user: null });

  res.json({ user });
});

// Sign Out
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('sb-access-token');
  res.json({ message: 'Signed out successfully' });
});

// ==================== POOL ROUTES ====================

// Get All Pools
app.get('/api/pools', async (req, res) => {
  const { data, error } = await supabase
    .from('pools')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ pools: data });
});

// Create a New Pool (Protected Route)
app.post('/api/pools', requireAuth, async (req, res) => {
  const { title, town, price, targetShares, woreda } = req.body;
  
  if (!title || !town || !price || !targetShares || !woreda) {
    return res.status(400).json({ error: 'All pool fields are required.' });
  }

  const retailPrice = Math.round(price * 1.35); // Estimated 35% standard retail markup

  const { data, error } = await supabase
    .from('pools')
    .insert([{ 
      title, 
      town, 
      price, 
      retail_price: retailPrice, 
      target_shares: targetShares, 
      current_shares: 0, 
      woreda, 
      locked: false 
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Pool created successfully', pool: data });
});

// Reserve a Share in a Pool (Protected Route)
app.post('/api/pools/:id/reserve', requireAuth, async (req, res) => {
  const poolId = req.params.id;
  const userId = req.user.id;

  // 1. Fetch current pool status
  const { data: pool, error: fetchError } = await supabase
    .from('pools')
    .select('*')
    .eq('id', poolId)
    .single();

  if (fetchError || !pool) return res.status(404).json({ error: 'Pool not found.' });
  if (pool.locked) return res.status(400).json({ error: 'This pool is already locked.' });
  if (pool.current_shares >= pool.target_shares) {
    return res.status(400).json({ error: 'This pool has reached its target shares.' });
  }

  // 2. Check if user already reserved a share
  const { data: existingReservation } = await supabase
    .from('reservations')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', userId)
    .single();

  if (existingReservation) {
    return res.status(400).json({ error: 'You have already reserved a share in this pool.' });
  }

  // 3. Insert reservation record
  const { error: reserveError } = await supabase
    .from('reservations')
    .insert([{ pool_id: poolId, user_id: userId }]);

  if (reserveError) return res.status(400).json({ error: 'Could not reserve share: ' + reserveError.message });

  // 4. Increment share count and check if target reached
  const newShares = pool.current_shares + 1;
  const shouldLock = newShares >= pool.target_shares;

  const { data: updatedPool, error: updateError } = await supabase
    .from('pools')
    .update({ 
      current_shares: newShares, 
      locked: shouldLock 
    })
    .eq('id', poolId)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ message: 'Share reserved successfully!', pool: updatedPool });
});

// Start Server
app.listen(PORT, () => {
  console.log(`NuroTewedede backend running on http://localhost:${PORT}`);
});