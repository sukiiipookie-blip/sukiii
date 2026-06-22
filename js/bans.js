import { getSupabase } from './state.js';
import { getSiteUser } from './auth.js';

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

export function normalizeIpInput(raw) {
  let ip = String(raw || '').trim().toLowerCase();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

export function isValidIp(ip) {
  if (!ip) return false;
  if (IPV4.test(ip)) {
    return ip.split('.').every((n) => {
      const x = Number(n);
      return x >= 0 && x <= 255;
    });
  }
  if (ip.includes(':') && IPV6.test(ip)) return true;
  return false;
}

export async function listBannedIps() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('banned_ips')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addBannedIp(ipAddress, reason = '') {
  const sb = getSupabase();
  const user = getSiteUser();
  if (!sb || !user) throw new Error('Not signed in');

  const ip = normalizeIpInput(ipAddress);
  if (!isValidIp(ip)) throw new Error('Enter a valid IPv4 or IPv6 address');

  const { data, error } = await sb
    .from('banned_ips')
    .insert({
      ip_address: ip,
      reason: reason.trim(),
      banned_by: user.user_id,
      banned_by_email: user.email,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('That IP is already banned');
    throw new Error(error.message);
  }
  return data;
}

export async function removeBannedIp(id) {
  const sb = getSupabase();
  if (!sb) throw new Error('Not connected');
  const { error } = await sb.from('banned_ips').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
