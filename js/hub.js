/**
 * Suki Creator Hub — main app
 * Enter screen · profile card · pages · music · themes
 */
import {
  initSupabase, loadConfigFromSupabase, loadConfigFromLocal,
  getConfig, replaceConfig, subscribe,
} from './state.js';
import { createDefaultConfig, normalizeSiteConfig, THEMES, AVATAR_FRAMES, DEFAULT_THEME_EFFECTS } from './defaults.js';
import { initAuth, getIsAdmin, showAuthGate, setAdminReadyCallback, openAdminPanel, getSiteUser } from './auth.js';
import { loadComments, postComment, deleteComment, subscribeComments } from './comments.js';
import { hasPermission, isOwner } from './permissions.js';
import { $, showToast, escapeHtml } from './utils.js';
import { ADMIN_HASH, REGISTER_HASH } from './config.js';
import { mountSyazHeartGrid } from './syaz-hearts.js';

let page = 'home';
let config = null;
let audio = null;
let trackIdx = 0;
let shuffleOrder = [];
let commentsCache = [];
let commentsSubscribed = false;
let syazHeartCleanup = null;

const SESSION_ENTER_KEY = 'suki:entered';

function persistEnterState() {
  try { sessionStorage.setItem(SESSION_ENTER_KEY, '1'); } catch (_) { /* private mode */ }
}

function restoreEnterState() {
  if (window.__sukiEntered) return true;
  try {
    if (sessionStorage.getItem(SESSION_ENTER_KEY) === '1') {
      window.__sukiEntered = true;
      $('#enter-gate')?.classList.add('dismissed');
      $('#app')?.classList.add('ready');
      $('#app')?.classList.remove('app-hidden');
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

/* ── Bootstrap ── */
async function init() {
  try {
    if (window.__sukiEntered) {
      const cfg = config || normalizeSiteConfig(getConfig());
      config = cfg;
      renderAll(cfg);
    }

    await initSupabase();
    await initAuth();

    if (!(await loadConfigFromSupabase())) loadConfigFromLocal();
    config = normalizeSiteConfig(getConfig());
    replaceConfig(config);

    applyTheme(config);
    setupEnterGate(config);
    renderAll(config);

    subscribe((c) => {
      config = normalizeSiteConfig(c);
      applyTheme(config);
      if (!$('#enter-gate')?.classList.contains('dismissed')) setupEnterGate(config);
      renderAll(config);
    });

    setAdminReadyCallback(() => {
      window.location.href = 'admin.html';
    });

    document.addEventListener('suki:auth-change', () => renderNav(config));

    if (location.hash === `#${ADMIN_HASH}`) {
      if (getIsAdmin()) window.location.href = 'admin.html';
      else showAuthGate('login');
    }
    if (location.hash === `#${REGISTER_HASH}`) showAuthGate('register');
    if (location.hash === '#home') page = 'home';
  } catch (err) {
    console.error('Init failed:', err);
    config = createDefaultConfig();
    applyTheme(config);
    setupEnterGate(config);
    renderAll(config);
  }
}

/* ── Enter gate — wire immediately so clicks always work ── */
let enterGateWired = false;
let enterTypewriterTimer = null;
let enterCopyDone = '';
let enterCopyRunning = false;

function dismissEnterGate() {
  const gate = $('#enter-gate');
  if (!gate || gate.classList.contains('dismissed')) return;
  gate.classList.add('dismissed');
  window.__sukiEntered = true;
  persistEnterState();
  $('#app')?.classList.add('ready');
  $('#app')?.classList.remove('app-hidden');
  const cfg = config || createDefaultConfig();
  if (!config) config = cfg;
  renderAll(cfg);
  initMusic(cfg);
}

function wireEnterGate() {
  const gate = $('#enter-gate');
  if (!gate || gate.dataset.wired === '1') return;
  gate.dataset.wired = '1';
  enterGateWired = true;

  gate.setAttribute('role', 'button');
  gate.setAttribute('tabindex', '0');
  gate.setAttribute('aria-label', 'Enter site');

  gate.addEventListener('click', dismissEnterGate);
  gate.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      dismissEnterGate();
    }
  });
}

function updateEnterGateCopy(cfg) {
  const wrap = $('#enter-text');
  const typedEl = $('#enter-typed');
  const gate = $('#enter-gate');
  if (!wrap || gate?.classList.contains('dismissed')) return;

  const text = cfg.site?.enterText || 'Click to see whats waiting for you 💋';
  const current = typedEl ? typedEl.textContent : wrap.textContent;
  if (enterCopyDone === text && current === text) return;
  if (enterCopyRunning && wrap.dataset.pendingText === text) return;

  startEnterTypewriter(text);
}

function startEnterTypewriter(text) {
  const wrap = $('#enter-text');
  const typedEl = $('#enter-typed');
  if (!wrap) return;

  if (enterTypewriterTimer) {
    clearTimeout(enterTypewriterTimer);
    enterTypewriterTimer = null;
  }

  enterCopyRunning = true;
  enterCopyDone = '';
  wrap.dataset.pendingText = text;
  wrap.setAttribute('data-text', text);
  wrap.classList.remove('enter-glitch-active');

  const target = typedEl || wrap;
  target.textContent = '';

  const chars = [...text];
  let i = 0;
  const step = () => {
    if ($('#enter-gate')?.classList.contains('dismissed')) {
      enterCopyRunning = false;
      return;
    }
    if (i < chars.length) {
      target.textContent += chars[i++];
      enterTypewriterTimer = setTimeout(step, 42 + Math.random() * 38);
    } else {
      enterCopyRunning = false;
      enterCopyDone = text;
    }
  };
  step();
}

function setupEnterGate(cfg) {
  updateEnterGateCopy(cfg);
}

/* ── Theme ── */
function applySiteMeta(cfg) {
  const site = cfg.site || {};
  document.title = site.title || 'Suki | Creator Hub';

  const favicon = site.favicon || 'assets/site-icon.svg';
  const isSvg = /\.svg(\?|$)/i.test(favicon);
  const pngFallback = site.faviconPng || 'assets/site-icon-32.png';
  const appleIcon = site.appleTouchIcon || site.faviconPng || pngFallback || favicon;

  document.querySelectorAll('link[rel="icon"], link[rel="alternate icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach(el => el.remove());

  const addIcon = (attrs) => {
    const link = document.createElement('link');
    Object.entries(attrs).forEach(([k, v]) => {
      if (v) link.setAttribute(k, v);
    });
    link.dataset.siteIcon = '1';
    document.head.appendChild(link);
  };

  if (isSvg) {
    addIcon({ rel: 'icon', href: favicon, type: 'image/svg+xml' });
    addIcon({ rel: 'alternate icon', href: pngFallback, type: 'image/png', sizes: '32x32' });
  } else {
    addIcon({ rel: 'icon', href: favicon, type: 'image/png', sizes: '32x32' });
    addIcon({ rel: 'shortcut icon', href: favicon });
  }
  addIcon({ rel: 'apple-touch-icon', href: appleIcon, sizes: '180x180' });
}

function applyTheme(cfg) {
  applySiteMeta(cfg);
  const fx = cfg.theme?.effects || DEFAULT_THEME_EFFECTS;
  document.body.classList.toggle('fx-profile-glow', fx.profileGlow !== false);
  document.body.classList.toggle('fx-nav-glow', fx.navGlow !== false);
  document.body.classList.toggle('fx-panel-glow', fx.panelGlow !== false);
  const preset = THEMES[cfg.theme?.preset] || THEMES.lavenderGalaxy;
  const root = document.documentElement;
  Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v));

  const p = cfg.profile || {};
  if (p.nameGradientFrom && p.nameGradientTo) {
    root.style.setProperty('--name-grad', `linear-gradient(90deg,${p.nameGradientFrom},${p.nameGradientTo})`);
  }

  const bg = $('#bg-layer');
  if (!bg) return;
  if (cfg.theme?.customBg) {
    const url = cfg.theme.customBg;
    const isVid = /\.(mp4|webm)$/i.test(url);
    if (isVid) {
      bg.innerHTML = `<video autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover"><source src="${escapeHtml(url)}"></video>`;
      bg.style.background = '';
    } else {
      bg.innerHTML = '';
      bg.style.background = `url(${url}) center/cover no-repeat`;
    }
  } else {
    bg.innerHTML = '';
    bg.style.background = preset.bg;
  }
}

/* ── Render all ── */
function renderAll(cfg) {
  renderNav(cfg);
  renderMain(cfg);
  renderFooter(cfg);
  if (!$('#enter-gate')?.classList.contains('dismissed')) return;
  renderMusicBar(cfg);
}

function renderNav(cfg) {
  const nav = $('#hub-nav');
  if (!nav) return;
  const isAdmin = getIsAdmin();
  const syazOn = cfg.syazTribute?.enabled && cfg.syazTribute?.showNavTab !== false;
  const syazLabel = escapeHtml(cfg.syazTribute?.navLabel || 'Syaz');

  const brand = escapeHtml(cfg.profile?.displayName || 'Suki');

  nav.innerHTML = `
    <button type="button" class="nav-brand" data-page="home">${brand}</button>
    <div class="hub-nav-menu" aria-label="Main navigation">
      <div class="hub-nav-links">
        <button type="button" class="nav-btn ${page === 'home' ? 'active' : ''}" data-page="home">Home</button>
        <span class="nav-sep" aria-hidden="true"></span>
        <button type="button" class="nav-btn ${page === 'promotions' ? 'active' : ''}" data-page="promotions">Promotions</button>
        ${syazOn ? `<span class="nav-sep" aria-hidden="true"></span>
        <button type="button" class="nav-btn nav-btn-syaz ${page === 'syaz' ? 'active' : ''}" data-page="syaz">♥ ${syazLabel}</button>` : ''}
        <span class="nav-sep" aria-hidden="true"></span>
        <button type="button" class="nav-btn ${page === 'comments' ? 'active' : ''}" data-page="comments">Comments</button>
      </div>
      <span class="nav-sep nav-sep-major" aria-hidden="true"></span>
      <button type="button" class="nav-btn admin-btn" id="nav-admin">${isAdmin ? 'Panel' : 'Admin'}</button>
    </div>
  `;
  nav.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (syazHeartCleanup) { syazHeartCleanup(); syazHeartCleanup = null; }
      page = btn.dataset.page;
      renderAll(cfg);
    });
  });
  $('#nav-admin')?.addEventListener('click', () => {
    if (getIsAdmin()) window.location.href = 'admin.html';
    else showAuthGate();
  });
}

function renderMain(cfg) {
  const main = $('#hub-main');
  if (!main) return;

  if (page === 'syaz' && !cfg.syazTribute?.enabled) page = 'home';

  if (page === 'about') page = 'home';

  if (page === 'home') {
    main.innerHTML = renderProfileCard(cfg);
    updateNowPlaying();
    bindSyazChip(main);
    bindTabLinks(main);
    return;
  }

  if (page === 'promotions') {
    const promos = (cfg.promotions || []).filter(p => p.visible !== false);
    main.innerHTML = `
      <div class="page-panel">
        <h1 class="page-title">Promotions</h1>
        <p class="page-sub">Stuff I genuinely recommend — starting with Nyxia.</p>
        ${promos.map(p => `
          <div class="promo-card">
            <div class="promo-logo-box" style="border-color:${p.accent}44;background:${p.accent}12">
              ${p.logo
                ? `<img src="${safeAttr(p.logo)}" alt="" class="promo-logo-img" />`
                : `<span class="promo-logo-fallback" style="color:${p.accent}">${escapeHtml(p.title.charAt(0))}</span>`}
            </div>
            <div class="promo-body">
              <h3 style="color:${p.accent}">${escapeHtml(p.title)}</h3>
              <p>${escapeHtml(p.description)}</p>
              <a class="promo-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener"
                 style="color:${p.accent};border-color:${p.accent}55;background:${p.accent}18">
                ${escapeHtml(p.buttonText || 'Visit')} →
              </a>
            </div>
          </div>
        `).join('')}
      </div>`;
    return;
  }

  if (page === 'syaz') {
    main.innerHTML = renderSyazPage(cfg);
    if (syazHeartCleanup) syazHeartCleanup();
    syazHeartCleanup = mountSyazHeartGrid($('#syaz-heart-grid'));
    return;
  }

  if (page === 'comments') {
    main.innerHTML = `<div class="comments-panel" id="comments-root"></div>`;
    mountComments(cfg);
  }
}

function renderProfileCard(cfg) {
  const p = cfg.profile || {};
  const avatar = p.avatar || defaultAvatar();
  const frameClass = AVATAR_FRAMES[p.avatarFrame]?.class || '';
  const badges = (cfg.badges || []).filter(b => b.visible !== false).map(b => {
    const isDev = b.icon === '</>' && !b.iconUrl;
    const inner = b.iconUrl
      ? `<img src="${safeAttr(b.iconUrl)}" alt="" class="badge-img" />`
      : (isDev ? '&lt;/&gt;' : escapeHtml(b.icon || '★'));
    return `<span class="badge-icon ${isDev ? 'dev' : ''}">
      ${inner}
      <span class="badge-tip"><strong>${escapeHtml(b.label)}</strong>${escapeHtml(b.tooltip || '')}</span>
    </span>`;
  }).join('');

  const syaz = cfg.syazTribute;
  const syazBadge = syaz?.enabled && syaz.showBadge ? `
    <span class="badge-icon badge-syaz">
      ${syaz.chipAvatar ? `<img src="${safeAttr(syaz.chipAvatar)}" alt="" class="badge-img" />` : '♥'}
      <span class="badge-tip"><strong>${escapeHtml(syaz.badgeLabel || 'Syaz')}</strong>${escapeHtml(syaz.badgeTooltip || '')}</span>
    </span>` : '';

  const syazChip = syaz?.enabled ? renderSyazChip(syaz) : '';
  const rolesHtml = `${badges}${syazBadge}`;
  const rolesBar = rolesHtml.trim() ? `<div class="roles-pill-bar">${rolesHtml}</div>` : '';

  const infoLines = (p.infoLines || []).map(line => `<div>${escapeHtml(line)}</div>`).join('');

  const socials = (cfg.socials || []).filter(s => s.visible !== false).map(s =>
    `<a class="social-btn" href="${escapeHtml(s.url)}" target="_blank" rel="noopener" aria-label="${s.platform}">${socialIcon(s.platform)}</a>`
  ).join('');

  const home = cfg.home || {};
  const aboutBlock = home.aboutBody
    ? `<div class="profile-about">${home.aboutBody}</div>`
    : '';

  const qlTitle = home.quickLinksTitle || 'Quick Links';
  const quickLinks = (home.quickLinks || []).filter(l => l.visible !== false);
  const quickLinksHtml = quickLinks.length ? `
    <div class="profile-quick-links">
      <div class="quick-links-title">${escapeHtml(qlTitle)}</div>
      <div class="quick-links-grid">
        ${quickLinks.map(l => `
          <a class="quick-link-card" href="${escapeHtml(l.url)}" target="_blank" rel="noopener"
             style="--ql-accent:${l.accent || '#b57bff'};border-color:${l.accent || '#b57bff'}59;background:${l.accent || '#b57bff'}1a">
            <span class="quick-link-name">${escapeHtml(l.title)}</span>
            ${l.subtitle ? `<span class="quick-link-sub">${escapeHtml(l.subtitle)}</span>` : ''}
          </a>
        `).join('')}
      </div>
      ${home.promoCtaText ? `<button type="button" class="promo-cta-link tab-link" data-page="promotions">${escapeHtml(home.promoCtaText)}</button>` : ''}
    </div>
  ` : '';

  return `
    <div class="profile-card">
      <div class="profile-top">
        <div class="profile-avatar-col">
          <div class="avatar-wrap ${frameClass}">
            <img class="profile-avatar" src="${safeAttr(avatar)}" alt="${escapeHtml(p.displayName)}" />
          </div>
          ${syazChip}
        </div>
        <div class="profile-meta">
          <div class="profile-name-row">
            <div class="profile-name">${escapeHtml(p.displayName)}</div>
            ${rolesBar}
          </div>
          <div class="profile-user">@${escapeHtml(p.username || 'suki')}</div>
        </div>
      </div>
      <div class="profile-info">${infoLines}<div class="now-playing" id="now-playing"></div></div>
      ${aboutBlock}
      <div class="profile-socials">${socials}</div>
      ${quickLinksHtml}
    </div>`;
}

function renderSyazChip(s) {
  const from = s.chipGradientFrom || '#fecdd3';
  const to = s.chipGradientTo || '#ff6bcb';
  const av = s.chipAvatar
    ? `<img class="syaz-chip-av" src="${safeAttr(s.chipAvatar)}" alt="" />`
    : `<span class="syaz-chip-heart">♥</span>`;
  return `
    <button type="button" class="syaz-nav-chip" data-page="syaz" style="--chip-from:${from};--chip-to:${to}">
      ${av}
      <span class="syaz-chip-name">${escapeHtml(s.chipName || s.navLabel || 'Syaz')}</span>
    </button>`;
}

function renderSyazPage(cfg) {
  const s = cfg.syazTribute || {};
  const img = s.boxImage
    ? `<img class="syaz-meme" src="${safeAttr(s.boxImage)}" alt="" />`
    : '';

  return `
    <div class="syaz-page">
      <div class="syaz-page-bg" id="syaz-heart-grid" aria-hidden="true"></div>
      <div class="syaz-page-content">
        <h1 class="syaz-page-title">${escapeHtml(s.boxTitle || 'Me & Syaz')}</h1>
        <p class="syaz-page-line">${escapeHtml(s.boxLine || '')}</p>
        ${img}
      </div>
    </div>`;
}

function bindSyazChip(root) {
  root.querySelectorAll('[data-page="syaz"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (syazHeartCleanup) { syazHeartCleanup(); syazHeartCleanup = null; }
      page = 'syaz';
      renderAll(config);
    });
  });
}

function bindTabLinks(root) {
  root.querySelectorAll('.tab-link[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      if (syazHeartCleanup) { syazHeartCleanup(); syazHeartCleanup = null; }
      page = el.dataset.page;
      renderAll(config);
    });
  });
}

function renderFooter(cfg) {
  const foot = $('#hub-footer');
  if (!foot) return;
  const credit = cfg.site?.footerCredit || 'Suki';
  const syazOn = cfg.syazTribute?.enabled;
  const syazLabel = escapeHtml(cfg.syazTribute?.navLabel || 'Syaz');
  foot.innerHTML = `
    <div class="footer-links">
      <a href="#" data-page="home">Home</a>
      <a href="#" data-page="promotions">Promotions</a>
      ${syazOn ? `<a href="#" data-page="syaz">♥ ${syazLabel}</a>` : ''}
      <a href="#" data-page="comments">Comments</a>
    </div>
    <div class="footer-credit">made with love by <span>${escapeHtml(credit)}</span></div>
  `;
  foot.querySelectorAll('[data-page]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      if (syazHeartCleanup) { syazHeartCleanup(); syazHeartCleanup = null; }
      page = a.dataset.page;
      renderAll(config);
    });
  });
}

/* ── Comments ── */
async function mountComments(cfg) {
  const root = $('#comments-root');
  if (!root) return;
  commentsCache = await loadComments();
  const siteUser = getSiteUser();
  const canMod = siteUser && (isOwner(siteUser.role) || hasPermission(siteUser, 'moderate_comments'));

  root.innerHTML = `
    <h1 class="page-title">Comments</h1>
    <p class="page-sub">Leave a message — updates live.</p>
    <form class="comments-form" id="comment-form">
      <input id="c-name" placeholder="${escapeHtml(cfg.comments?.namePlaceholder || 'Username')}" maxlength="40" required />
      <textarea id="c-body" rows="3" placeholder="${escapeHtml(cfg.comments?.placeholder || 'Write a comment...')}" maxlength="${cfg.comments?.maxLength || 500}" required></textarea>
      <button type="submit">Post Comment</button>
    </form>
    <div class="comments-live"><span class="live-dot"></span> Live comments</div>
    <div class="comments-scroll" id="comments-list">${renderCommentList(canMod)}</div>
  `;

  $('#comment-form', root)?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await postComment($('#c-name', root).value, $('#c-body', root).value);
      $('#c-name', root).value = '';
      $('#c-body', root).value = '';
      showToast('Comment posted!');
    } catch (err) { showToast(err.message, 'error'); }
  });

  if (!commentsSubscribed) {
    commentsSubscribed = true;
    subscribeComments(() => {
      loadComments().then(list => {
        commentsCache = list;
        const listEl = $('#comments-list');
        if (listEl) listEl.innerHTML = renderCommentList(canMod);
      });
    });
  }
}

function renderCommentList(canMod) {
  if (!commentsCache.length) return '<p class="comments-empty">Be the first to comment 💜</p>';
  return commentsCache.map(c => `
    <div class="comment-item">
      ${canMod ? `<button class="comment-delete" data-id="${c.id}">✕</button>` : ''}
      <span class="comment-author">${escapeHtml(c.author_name)}</span>
      <span class="comment-time">${formatTime(c.created_at)}</span>
      <p class="comment-body">${escapeHtml(c.content)}</p>
    </div>
  `).join('');
}

document.addEventListener('click', async e => {
  const btn = e.target.closest('.comment-delete');
  if (!btn) return;
  if (!confirm('Delete this comment?')) return;
  try {
    await deleteComment(btn.dataset.id);
    showToast('Deleted');
  } catch (err) { showToast(err.message, 'error'); }
});

/* ── Music ── */
function initMusic(cfg) {
  renderMusicBar(cfg);
  if (!cfg.music?.tracks?.length) return;
  buildShuffle(cfg.music.tracks.length);
  loadTrack(cfg, 0);
  if (cfg.music.autoplay) setTimeout(() => playAudio(), 400);
}

function renderMusicBar(cfg) {
  const bar = $('#music-bar');
  if (!bar || !cfg.music?.tracks?.length) { bar?.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  const t = cfg.music.tracks[trackIdx] || cfg.music.tracks[0];
  const vol = Math.round((cfg.music.volume ?? 0.25) * 100);
  const playing = audio && !audio.paused;
  bar.innerHTML = `
    <button class="music-btn" id="m-prev" title="Previous">${musicIcon('prev')}</button>
    <button class="music-btn" id="m-play" title="${playing ? 'Pause' : 'Play'}">${musicIcon(playing ? 'pause' : 'play')}</button>
    <button class="music-btn" id="m-next" title="Next">${musicIcon('next')}</button>
    <div class="music-info">
      <div class="music-title">${escapeHtml(t.title)}</div>
      <div class="music-artist">${escapeHtml(t.artist || '')}</div>
    </div>
    <div class="music-vol">
      <button class="music-btn" id="m-mute" title="Mute">${musicIcon(audio?.muted ? 'mute' : 'vol')}</button>
      <input type="range" id="m-vol" min="0" max="100" value="${vol}" />
    </div>
  `;
  $('#m-play', bar)?.addEventListener('click', togglePlay);
  $('#m-prev', bar)?.addEventListener('click', () => changeTrack(cfg, -1));
  $('#m-next', bar)?.addEventListener('click', () => changeTrack(cfg, 1));
  $('#m-vol', bar)?.addEventListener('input', e => {
    const v = e.target.value / 100;
    if (audio) audio.volume = v;
    cfg.music.volume = v;
  });
  $('#m-mute', bar)?.addEventListener('click', () => {
    if (!audio) return;
    audio.muted = !audio.muted;
    renderMusicBar(cfg);
  });
}

function musicIcon(type) {
  const icons = {
    prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7L8 5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 18h2V6h-2v12zm-11-7 8.5-6v12L5 11z"/></svg>',
    vol: '<svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03z"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>',
  };
  return icons[type] || '';
}

function buildShuffle(len) {
  shuffleOrder = [...Array(len).keys()];
  for (let i = shuffleOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
  }
}

function loadTrack(cfg, idx) {
  const tracks = cfg.music.tracks;
  if (!tracks.length) return;
  trackIdx = ((idx % tracks.length) + tracks.length) % tracks.length;
  const t = tracks[trackIdx];
  if (audio) { audio.pause(); audio = null; }
  audio = new Audio(t.src);
  audio.volume = cfg.music.volume ?? 0.25;
  audio.addEventListener('ended', () => changeTrack(cfg, 1));
  audio.addEventListener('play', updateNowPlaying);
  updateNowPlaying();
  renderMusicBar(cfg);
}

function changeTrack(cfg, dir) {
  const tracks = cfg.music.tracks;
  if (tracks.length <= 1) return;
  let next;
  if (cfg.music.shuffle) {
    const pos = shuffleOrder.indexOf(trackIdx);
    next = shuffleOrder[(pos + dir + shuffleOrder.length) % shuffleOrder.length];
  } else {
    next = (trackIdx + dir + tracks.length) % tracks.length;
  }
  const wasPlaying = audio && !audio.paused;
  loadTrack(cfg, next);
  if (wasPlaying) playAudio();
}

function togglePlay() {
  if (!audio) return;
  if (audio.paused) playAudio();
  else { audio.pause(); renderMusicBar(config); }
}

function playAudio() {
  audio?.play().catch(() => {});
  renderMusicBar(config);
}

function updateNowPlaying() {
  const el = $('#now-playing');
  if (!el || !config?.music?.tracks?.length) return;
  const t = config.music.tracks[trackIdx];
  el.textContent = `Now Playing: ${t.title}${t.artist ? ` — ${t.artist}` : ''}`;
}

/* ── Helpers ── */
function socialIcon(platform) {
  const icons = {
    discord: '<svg viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.16 8.16 0 0 0 4.77 1.52V6.85a4.85 4.85 0 0 1-1-.16z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  };
  return icons[platform] || '<svg viewBox="0 0 24 24"><path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.43l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.48a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"/></svg>';
}

function defaultAvatar() {
  return `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#b57bff"/><text x="50" y="62" text-anchor="middle" font-size="40" fill="#fff">♡</text></svg>')}`;
}

function safeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

function formatTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  restoreEnterState();
  wireEnterGate();
  init();
}

document.addEventListener('DOMContentLoaded', boot);
document.addEventListener('suki:enter', () => {
  if (!config) config = createDefaultConfig();
  renderAll(config);
});
if (document.readyState !== 'loading') boot();
