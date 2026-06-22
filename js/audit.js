import { getSupabase } from './state.js';
import { getSiteUser } from './auth.js';

export async function logAudit(action, details = {}) {
  const sb = getSupabase();
  const user = getSiteUser();
  if (!sb || !user) return;
  try {
    await sb.from('audit_log').insert({
      user_id: user.user_id,
      user_email: user.email,
      action,
      details,
    });
  } catch (e) {
    console.warn('Audit log failed:', e.message);
  }
}

export async function loadAuditLog(limit = 50) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}
