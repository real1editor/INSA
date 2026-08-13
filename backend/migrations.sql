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
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile row whenever a new auth user is created.
-- SECURITY DEFINER lets the trigger bypass RLS and write into profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.raw_user_meta_data ->> 'username', '')
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
