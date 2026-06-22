-- IP bans table (section 7) — run in Supabase SQL Editor if you already deployed the main schema.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  reason TEXT DEFAULT '',
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS banned_ips_ip_unique ON banned_ips (lower(trim(ip_address)));

ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read bans" ON banned_ips;
CREATE POLICY "Owners read bans" ON banned_ips FOR SELECT TO authenticated
  USING (is_owner());

DROP POLICY IF EXISTS "Owners insert bans" ON banned_ips;
CREATE POLICY "Owners insert bans" ON banned_ips FOR INSERT TO authenticated
  WITH CHECK (is_owner());

DROP POLICY IF EXISTS "Owners delete bans" ON banned_ips;
CREATE POLICY "Owners delete bans" ON banned_ips FOR DELETE TO authenticated
  USING (is_owner());
