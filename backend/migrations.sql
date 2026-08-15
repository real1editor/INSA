-- ============================================================
-- NuroTewedede — Migration for the Google AI Studio feature port
-- Run this ENTIRE file in the Supabase SQL Editor (once).
-- It is safe to re-run (uses IF NOT EXISTS).
-- ============================================================

-- 1) Richer POOLS columns (category, unit, hub, organizer, image, status...)
ALTER TABLE public.pools
  ADD COLUMN IF NOT EXISTS category       TEXT DEFAULT 'Grains & Teff',
  ADD COLUMN IF NOT EXISTS unit           TEXT DEFAULT '50 kg Bag',
  ADD COLUMN IF NOT EXISTS hub_location   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS organizer      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_url      TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_date    TEXT DEFAULT 'Next Week',
  ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- 2) RESERVATIONS extras (shares, payment method, pickup voucher code)
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS shares         INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'telebirr',
  ADD COLUMN IF NOT EXISTS voucher_code   TEXT DEFAULT '';

-- 3) COMMUNITY COMMENTS table
-- NOTE: pools.id is BIGINT in this project (not UUID), so pool_id must be BIGINT.
CREATE TABLE IF NOT EXISTS public.comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id       BIGINT REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name     TEXT NOT NULL,
  user_town     TEXT NOT NULL,
  text          TEXT NOT NULL,
  is_coordinator BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_likes_select_all" ON public.comment_likes;
CREATE POLICY "comment_likes_select_all" ON public.comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "comment_likes_insert_own" ON public.comment_likes;
CREATE POLICY "comment_likes_insert_own" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_likes_delete_own" ON public.comment_likes;
CREATE POLICY "comment_likes_delete_own" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_all" ON public.comments;
CREATE POLICY "comments_select_all" ON public.comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments_insert_anon" ON public.comments;
CREATE POLICY "comments_insert_anon" ON public.comments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "comments_insert_auth" ON public.comments;
CREATE POLICY "comments_insert_auth" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow the server to bump the likes counter on comments
DROP POLICY IF EXISTS "comments_update_likes" ON public.comments;
CREATE POLICY "comments_update_likes" ON public.comments
  FOR UPDATE USING (true) WITH CHECK (true);

-- 4) Backfill: give existing pools a sensible category if it is blank
UPDATE public.pools
   SET category = 'Grains & Teff'
 WHERE category IS NULL OR category = '';

-- 5) Index for fast comment lookups
CREATE INDEX IF NOT EXISTS comments_pool_id_idx ON public.comments (pool_id);

-- 6) USER PROFILES (name + username for the signup/sign-in feature)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  username    TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Allow existing profiles (created before this migration) to take the default role.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'buyer';

-- Auto-create a profile row whenever a new auth user is created.
-- SECURITY DEFINER lets the trigger bypass RLS and write into profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.raw_user_meta_data ->> 'username', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'buyer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 7) DUAL-SIDED MARKETPLACE — SELLER SUPPLY LISTINGS (products)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id              BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  seller_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_name     TEXT NOT NULL DEFAULT '',
  crop_type       TEXT NOT NULL DEFAULT 'teff',        -- canonical PRODUCE_GROUPS id
  variety         TEXT NOT NULL DEFAULT '',
  grade           TEXT NOT NULL DEFAULT '',
  moisture_content NUMERIC,                             -- % (optional)
  cleanliness     NUMERIC,                              -- % (optional)
  harvest_year    TEXT NOT NULL DEFAULT '',
  volume          NUMERIC NOT NULL DEFAULT 0,           -- total available volume
  volume_unit     TEXT NOT NULL DEFAULT 'quintal',      -- quintal | kg | mt
  min_order_lot   NUMERIC NOT NULL DEFAULT 0,           -- minimum wholesale lot
  min_order_unit  TEXT NOT NULL DEFAULT 'quintal',
  pricing_model   TEXT NOT NULL DEFAULT 'fixed',        -- fixed | negotiable
  price_per_unit  NUMERIC NOT NULL DEFAULT 0,           -- ETB per min_order_unit
  currency        TEXT NOT NULL DEFAULT 'ETB',
  origin_region   TEXT NOT NULL DEFAULT '',
  origin_zone     TEXT NOT NULL DEFAULT '',
  origin_town     TEXT NOT NULL DEFAULT '',
  availability_from DATE,
  availability_to   DATE,
  photos          JSONB NOT NULL DEFAULT '[]',          -- array of image URLs / data URLs
  description     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active',       -- active | draft | sold | inactive
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select_all" ON public.products;
CREATE POLICY "products_select_all" ON public.products
  FOR SELECT USING (true);

-- The Express server validates seller identity before inserting, so keep the
-- table open to inserts the same way comments are handled.
DROP POLICY IF EXISTS "products_insert_auth" ON public.products;
CREATE POLICY "products_insert_auth" ON public.products
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "products_update_all" ON public.products;
CREATE POLICY "products_update_all" ON public.products
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "products_delete_all" ON public.products;
CREATE POLICY "products_delete_all" ON public.products
  FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS products_seller_id_idx ON public.products (seller_id);
CREATE INDEX IF NOT EXISTS products_crop_type_idx ON public.products (crop_type);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products (status);
