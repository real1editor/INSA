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
CREATE TABLE IF NOT EXISTS public.comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id       UUID REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name     TEXT NOT NULL,
  user_town     TEXT NOT NULL,
  text          TEXT NOT NULL,
  is_coordinator BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

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
