import { getSupabase } from './state.js';

const STORAGE_KEY = 'suki_visitor_id';
let cachedCount = null;

function getVisitorId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID?.() || `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** Register this browser as a unique visitor and fetch total count */
export async function initVisitors() {
  const supabase = getSupabase();
  if (!supabase) {
    cachedCount = 1;
    updateVisitorPill(cachedCount);
    return cachedCount;
  }

  const visitorId = getVisitorId();

  try {
    const { error } = await supabase.rpc('register_visitor', { vid: visitorId });
    if (error) throw error;
  } catch {
    /* RPC unavailable — count stays at fallback */
  }

  try {
    const { data, error } = await supabase.rpc('get_visitor_count');
    if (!error && data != null) {
      cachedCount = Number(data);
    }
  } catch {
    cachedCount = cachedCount ?? 0;
  }

  updateVisitorPill(cachedCount);
  return cachedCount;
}

export function getVisitorCount() {
  return cachedCount;
}

export function updateVisitorPill(count) {
  const num = document.getElementById('visitor-pill-count');
  if (num) num.textContent = formatCount(count ?? cachedCount ?? '—');
  document.getElementById('visitor-pill')?.classList.remove('loading');
}

function formatCount(n) {
  if (n == null || n === '—') return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function renderVisitorPillHtml() {
  return `
    <div class="visitor-pill loading" id="visitor-pill" title="Unique visitors to this site">
      <span class="visitor-pill-dot"></span>
      <span id="visitor-pill-count">—</span>
      <span class="visitor-pill-label">visitors</span>
    </div>
  `;
}
