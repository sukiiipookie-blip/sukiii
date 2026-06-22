import { getSupabase } from './state.js';
import { OWNER_EMAIL } from './config.js';
import { DEFAULT_ADMIN_PERMISSIONS } from './permissions.js';
import { showToast } from './utils.js';

/** Fetch site_users row for a auth user id */
export async function getSiteUser(userId) {
  const supabase = getSupabase();
  if (!supabase) return { user_id: 'dev', email: 'dev@local', display_name: 'Dev', role: 'owner', permissions: {} };

  const { data } = await supabase
    .from('site_users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

/** On login: auto-claim invite, or bootstrap first owner */
export async function provisionSiteUser(user) {
  const supabase = getSupabase();
  if (!supabase) return { user_id: user.id, role: 'owner', permissions: {} };

  let existing = await getSiteUser(user.id);
  if (existing) return existing;

  const { data: invite } = await supabase
    .from('user_invites')
    .select('*')
    .ilike('email', user.email)
    .maybeSingle();

  if (invite) {
    const row = {
      user_id: user.id,
      email: user.email,
      display_name: invite.display_name || user.user_metadata?.display_name || user.email.split('@')[0],
      role: invite.role || 'admin',
      permissions: invite.permissions || DEFAULT_ADMIN_PERMISSIONS,
      created_by: invite.invited_by,
    };
    const { data, error } = await supabase.from('site_users').insert(row).select().single();
    if (!error && data) {
      await supabase.from('user_invites').delete().eq('id', invite.id);
      return data;
    }
  }

  const { count } = await supabase
    .from('site_users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'owner');

  if ((count ?? 0) === 0 && OWNER_EMAIL && user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
    const { data, error } = await supabase.from('site_users').insert({
      user_id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name || 'Owner',
      role: 'owner',
      permissions: {},
    }).select().single();
    if (!error) return data;
  }

  return null;
}

export async function listSiteUsers() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('site_users').select('*').order('created_at');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function listInvites() {
  const supabase = getSupabase();
  const { data } = await supabase.from('user_invites').select('*').order('created_at');
  return data || [];
}

/** Owner: invite + create auth account in one step (owner must sign back in after) */
export async function createAdminUser({ email, password, displayName, permissions }) {
  const supabase = getSupabase();
  const { data: { user: owner } } = await supabase.auth.getUser();

  const { error: invErr } = await supabase.from('user_invites').upsert({
    email: email.toLowerCase(),
    display_name: displayName,
    role: 'admin',
    permissions: permissions || DEFAULT_ADMIN_PERMISSIONS,
    invited_by: owner.id,
  }, { onConflict: 'email' });
  if (invErr) throw new Error(invErr.message);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw new Error(error.message);

  await supabase.auth.signOut();
  return {
    created: true,
    email,
    message: 'Admin account created! The database trigger adds their permissions automatically. Please sign back in.',
  };
}

/** Owner: invite only — they register at #suki-register */
export async function inviteAdmin({ email, displayName, permissions }) {
  const supabase = getSupabase();
  const { data: { user: owner } } = await supabase.auth.getUser();

  const { error } = await supabase.from('user_invites').upsert({
    email: email.toLowerCase(),
    display_name: displayName,
    role: 'admin',
    permissions: permissions || DEFAULT_ADMIN_PERMISSIONS,
    invited_by: owner.id,
  }, { onConflict: 'email' });
  if (error) throw new Error(error.message);
  return { email, displayName };
}

export async function removeSiteUser(userId) {
  const supabase = getSupabase();
  const { error } = await supabase.from('site_users').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function promoteToOwner(userId) {
  const supabase = getSupabase();
  const { error } = await supabase.from('site_users').update({ role: 'owner' }).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function updateUserPermissions(userId, permissions) {
  const supabase = getSupabase();
  const { error } = await supabase.from('site_users').update({ permissions }).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function cancelInvite(email) {
  const supabase = getSupabase();
  await supabase.from('user_invites').delete().ilike('email', email);
}
