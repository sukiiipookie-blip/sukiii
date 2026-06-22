-- Suki Creator Hub — Full Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- Safe to re-run — cleans up old schema first.

-- ═══════════════════════════════════════════
-- 0. CLEAN UP OLD SCHEMA (from first version)
-- ═══════════════════════════════════════════

-- Remove policies that referenced the old allowed_admins table
DROP POLICY IF EXISTS "Allowed admins can update site config" ON site_config;
DROP POLICY IF EXISTS "Allowed admins can insert site config" ON site_config;
DROP POLICY IF EXISTS "Users can check own admin status" ON allowed_admins;

-- Now safe to drop the old table
DROP TABLE IF EXISTS allowed_admins;

-- ═══════════════════════════════════════════
-- 1. TABLES
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS site_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin')),
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin')),
  permissions JSONB NOT NULL DEFAULT '{}',
  invited_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  badges JSONB DEFAULT '[]',
  is_highlighted BOOLEAN DEFAULT false,
  highlight_color TEXT,
  author_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO site_config (id, config) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS unique_visitors (
  visitor_id TEXT PRIMARY KEY,
  first_visit TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- 2. HELPER FUNCTIONS (after tables exist)
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM site_users WHERE user_id = auth.uid() AND role = 'owner') $$;

CREATE OR REPLACE FUNCTION public.is_site_user()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM site_users WHERE user_id = auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.register_visitor(vid TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO unique_visitors (visitor_id) VALUES (vid)
  ON CONFLICT (visitor_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_visitor_count()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT COUNT(*)::BIGINT FROM unique_visitors $$;

-- ═══════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE site_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE unique_visitors ENABLE ROW LEVEL SECURITY;

-- site_users
DROP POLICY IF EXISTS "Users read own" ON site_users;
CREATE POLICY "Users read own" ON site_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners read all users" ON site_users;
CREATE POLICY "Owners read all users" ON site_users FOR SELECT TO authenticated
  USING (is_owner());

DROP POLICY IF EXISTS "Bootstrap first owner" ON site_users;
CREATE POLICY "Bootstrap first owner" ON site_users FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND role = 'owner'
    AND (SELECT COUNT(*) FROM site_users WHERE role = 'owner') = 0
  );

DROP POLICY IF EXISTS "Owners manage users" ON site_users;
CREATE POLICY "Owners manage users" ON site_users FOR INSERT TO authenticated
  WITH CHECK (is_owner() AND role = 'admin');

DROP POLICY IF EXISTS "Owners update users" ON site_users;
CREATE POLICY "Owners update users" ON site_users FOR UPDATE TO authenticated
  USING (is_owner());

DROP POLICY IF EXISTS "Owners remove admins" ON site_users;
CREATE POLICY "Owners remove admins" ON site_users FOR DELETE TO authenticated
  USING (is_owner() AND role = 'admin');

-- user_invites
DROP POLICY IF EXISTS "Owners read invites" ON user_invites;
CREATE POLICY "Owners read invites" ON user_invites FOR SELECT TO authenticated
  USING (is_owner());

DROP POLICY IF EXISTS "Owners insert invites" ON user_invites;
CREATE POLICY "Owners insert invites" ON user_invites FOR INSERT TO authenticated
  WITH CHECK (is_owner());

DROP POLICY IF EXISTS "Owners delete invites" ON user_invites;
CREATE POLICY "Owners delete invites" ON user_invites FOR DELETE TO authenticated
  USING (is_owner());

DROP POLICY IF EXISTS "Owners update invites" ON user_invites;
CREATE POLICY "Owners update invites" ON user_invites FOR UPDATE TO authenticated
  USING (is_owner());

-- site_config
DROP POLICY IF EXISTS "Public can read site config" ON site_config;
CREATE POLICY "Public can read site config" ON site_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allowed admins can update site config" ON site_config;
DROP POLICY IF EXISTS "Site users can update config" ON site_config;
CREATE POLICY "Site users can update config" ON site_config FOR UPDATE TO authenticated
  USING (is_site_user());

DROP POLICY IF EXISTS "Allowed admins can insert site config" ON site_config;
DROP POLICY IF EXISTS "Site users can insert config" ON site_config;
CREATE POLICY "Site users can insert config" ON site_config FOR INSERT TO authenticated
  WITH CHECK (is_site_user());

-- comments
DROP POLICY IF EXISTS "Anyone can read comments" ON comments;
CREATE POLICY "Anyone can read comments" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can post comments" ON comments;
CREATE POLICY "Anyone can post comments" ON comments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Mods can delete comments" ON comments;
CREATE POLICY "Mods can delete comments" ON comments FOR DELETE TO authenticated
  USING (
    is_owner() OR EXISTS (
      SELECT 1 FROM site_users
      WHERE user_id = auth.uid()
      AND (permissions->>'moderate_comments')::boolean IS NOT FALSE
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Owner can style comments" ON comments;
CREATE POLICY "Owner can style comments" ON comments FOR UPDATE TO authenticated
  USING (is_owner());

-- unique_visitors (anon key can register + read count via RPC; direct table locked down)
DROP POLICY IF EXISTS "No direct visitor reads" ON unique_visitors;
CREATE POLICY "No direct visitor reads" ON unique_visitors FOR SELECT USING (false);

DROP POLICY IF EXISTS "No direct visitor writes" ON unique_visitors;
CREATE POLICY "No direct visitor writes" ON unique_visitors FOR INSERT WITH CHECK (false);

-- ═══════════════════════════════════════════
-- 4. TRIGGERS (auto-add invited admins)
-- ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE inv RECORD;
BEGIN
  SELECT * INTO inv FROM user_invites WHERE lower(email) = lower(NEW.email);
  IF FOUND THEN
    INSERT INTO site_users (user_id, email, display_name, role, permissions, created_by)
    VALUES (
      NEW.id, NEW.email,
      COALESCE(inv.display_name, NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
      'admin', inv.permissions, inv.invited_by
    ) ON CONFLICT (user_id) DO NOTHING;
    DELETE FROM user_invites WHERE id = inv.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_invited ON auth.users;
CREATE TRIGGER on_auth_user_invited
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_invited_user();

-- ═══════════════════════════════════════════
-- 5. LIVE COMMENTS (optional — enable in Dashboard too)
-- Dashboard → Database → Replication → toggle ON for "comments"
-- Or uncomment the line below:
-- ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Allow anon visitors to register & read count via RPC only
GRANT EXECUTE ON FUNCTION public.register_visitor(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_visitor_count() TO anon, authenticated;

-- ═══════════════════════════════════════════
-- 6. AUDIT LOG (owner-only read)
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read audit log" ON audit_log;
CREATE POLICY "Owners read audit log" ON audit_log FOR SELECT TO authenticated
  USING (is_owner());

DROP POLICY IF EXISTS "Site users insert audit log" ON audit_log;
CREATE POLICY "Site users insert audit log" ON audit_log FOR INSERT TO authenticated
  WITH CHECK (is_site_user());
