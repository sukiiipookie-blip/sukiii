/**
 * Cloudflare Pages edge middleware — IP ban enforcement.
 *
 * Required env vars (Cloudflare Pages → Settings → Environment variables):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (never expose in client code)
 */

const CACHE_TTL_MS = 60_000;

const DEFAULT_BAN_PAGE = {
  title: "Whoops! This doesn't exist",
  subtitle: "Here's a picture of a cat instead.",
};

const BUILTIN_CAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 280" width="240" height="210" aria-hidden="true"><ellipse cx="160" cy="248" rx="120" ry="18" fill="#b57bff" opacity="0.15"/><path fill="#c4a0ff" d="M95 118c-18-42 8-78 42-82 24-3 38 12 48 12s24-15 48-12c34 4 60 40 42 82-8 18-28 32-52 38-8 2-16 3-24 3h-38c-8 0-16-1-24-3-24-6-44-20-52-38z"/><path fill="#e066ff" d="M88 92 72 44l36 18 20-34 20 34 36-18-16 48c-6 2-12 3-18 4l-40 6-40-6c-6-1-12-2-18-4z"/><ellipse fill="#1a1028" cx="124" cy="132" rx="14" ry="16"/><ellipse fill="#1a1028" cx="196" cy="132" rx="14" ry="16"/><ellipse fill="#f5f0ff" cx="128" cy="128" rx="5" ry="6"/><ellipse fill="#f5f0ff" cx="200" cy="128" rx="5" ry="6"/><path fill="#ff9ecf" d="M160 148c-10 0-18 6-18 14h36c0-8-8-14-18-14z"/><line x1="108" y1="156" x2="88" y2="152" stroke="#e066ff" stroke-width="3" stroke-linecap="round"/><line x1="212" y1="156" x2="232" y2="152" stroke="#e066ff" stroke-width="3" stroke-linecap="round"/><path fill="none" stroke="#b57bff" stroke-width="3" stroke-linecap="round" d="M132 168q28 12 56 0"/></svg>`;

/** @type {{ ips: Set<string>, banPage: object, at: number } | null} */
let cache = null;

function normalizeIp(raw) {
  if (!raw) return '';
  let ip = String(raw).trim().toLowerCase();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

function getClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    ''
  );
}

async function supabaseFetch(env, path) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const res = await fetch(`${url.replace(/\/$/, '')}${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) return null;
  return res.json();
}

async function refreshCache(env) {
  const [banRows, configRows] = await Promise.all([
    supabaseFetch(env, '/rest/v1/banned_ips?select=ip_address'),
    supabaseFetch(env, '/rest/v1/site_config?select=config&id=eq.1'),
  ]);

  const ips = new Set(
    (banRows || [])
      .map((row) => normalizeIp(row.ip_address))
      .filter(Boolean),
  );

  const banPage = configRows?.[0]?.config?.site?.banPage || DEFAULT_BAN_PAGE;

  cache = { ips, banPage, at: Date.now() };
  return cache;
}

async function getCache(env) {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache;
  return refreshCache(env);
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function blockPageHtml(banPage) {
  const title = escapeHtml(banPage.title || DEFAULT_BAN_PAGE.title);
  const subtitle = escapeHtml(banPage.subtitle || DEFAULT_BAN_PAGE.subtitle);
  const catUrl = banPage.catImage?.trim();
  const useExternalCat = catUrl && /^https?:\/\//i.test(catUrl);
  const catBlock = useExternalCat
    ? `<img src="${escapeHtml(catUrl)}" alt="" class="cat" width="240" height="210" />`
    : BUILTIN_CAT_SVG;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #08060f 70%);
      color: #f5f0ff;
      padding: 24px;
      text-align: center;
    }
    .card {
      max-width: 420px;
      padding: 32px 28px;
      border-radius: 20px;
      border: 1px solid rgba(181, 123, 255, 0.35);
      background: rgba(14, 10, 28, 0.88);
      box-shadow: 0 0 40px rgba(181, 123, 255, 0.15);
    }
    h1 {
      font-size: 1.45rem;
      margin-bottom: 10px;
      background: linear-gradient(90deg, #ede9fe, #e066ff);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }
    p { color: #a89bc4; font-size: 0.95rem; margin-bottom: 20px; line-height: 1.5; }
    .cat-wrap { display: flex; justify-content: center; margin-top: 8px; }
    .cat { max-width: 240px; height: auto; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <div class="cat-wrap">${catBlock}</div>
  </div>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return context.next();
  }

  const ip = normalizeIp(getClientIp(request));
  if (!ip) return context.next();

  try {
    const { ips, banPage } = await getCache(env);
    if (ips.has(ip)) {
      return new Response(blockPageHtml(banPage), {
        status: 403,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex',
        },
      });
    }
  } catch (_) {
    return context.next();
  }

  return context.next();
}
