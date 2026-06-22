-- Suki Creator Hub — Storage buckets + upload permissions
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to re-run.
--
-- Fixes: "new row violates row-level security policy" on avatar/background uploads.

-- ═══════════════════════════════════════════
-- 1. BUCKETS (public read — URLs work on the live site)
-- ═══════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('avatars',     'avatars',     true, 10485760),  -- 10 MB — profile photos
  ('backgrounds', 'backgrounds', true, 52428800),  -- 50 MB — wallpapers, GIFs, video
  ('music',       'music',       true, 52428800),  -- 50 MB — audio tracks
  ('assets',      'assets',      true, 10485760)   -- 10 MB — badges, favicons, promos
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- ═══════════════════════════════════════════
-- 2. STORAGE RLS — anyone can READ, site admins can UPLOAD
--    Uses public.is_site_user() from schema.sql
-- ═══════════════════════════════════════════

-- Public read (anon + logged-in visitors)
DROP POLICY IF EXISTS "Public read site uploads" ON storage.objects;
CREATE POLICY "Public read site uploads" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('avatars', 'backgrounds', 'music', 'assets'));

-- Site admins (owner + team in site_users) can upload, replace, delete
DROP POLICY IF EXISTS "Site users manage uploads" ON storage.objects;
CREATE POLICY "Site users manage uploads" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id IN ('avatars', 'backgrounds', 'music', 'assets')
    AND public.is_site_user()
  )
  WITH CHECK (
    bucket_id IN ('avatars', 'backgrounds', 'music', 'assets')
    AND public.is_site_user()
  );
