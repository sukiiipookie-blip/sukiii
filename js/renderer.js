import { SOCIAL_PLATFORMS, detectPlatform } from './defaults.js';
import { escapeHtml, $ } from './utils.js';
import { headingClass } from './theme-engine.js';
import { loadComments, renderCommentsUI, subscribeComments, refreshCommentsList } from './comments.js';
import { renderVisitorPillHtml, updateVisitorPill, getVisitorCount } from './visitors.js';
import { getIsAdmin } from './auth.js';

let viewMode = 'home';
let activeTabId = null;
let commentsMounted = false;
let cachedConfig = null;

export function renderSite(config) {
  cachedConfig = config;
  renderNav(config);
  if (viewMode === 'home') {
    renderProfile(config);
    $('#hero-section')?.classList.remove('hidden');
    $('#tab-content')?.classList.add('hidden');
    $('#tab-content').innerHTML = '';
  } else {
    $('#hero-section')?.classList.add('hidden');
    $('#tab-content')?.classList.remove('hidden');
    renderTabContent(config);
  }
  renderMaintenance(config);
  renderEnterScreen(config);
}

export function getActiveTabId() {
  return activeTabId;
}

export function setActiveTab(id) {
  viewMode = 'tab';
  activeTabId = id;
}

export function goHome() {
  viewMode = 'home';
  activeTabId = null;
  if (cachedConfig) renderSite(cachedConfig);
}

function renderNav(config) {
  const nav = $('#main-nav');
  if (!nav) return;

  const style = config.navigation?.style || 'default';
  nav.className = `nav-bar style-${style}`;

  const visibleTabs = (config.tabs || []).filter(t => t.visible);

  const tabsHtml = visibleTabs.map(tab => `
    <li>
      <button class="nav-tab ${viewMode === 'tab' && tab.id === activeTabId ? 'active' : ''}"
              data-tab="${tab.id}">${escapeHtml(tab.label)}</button>
    </li>
  `).join('');

  nav.innerHTML = `
    <button class="nav-brand ${viewMode === 'home' ? 'active' : ''}" id="nav-home" type="button" title="Home">
      <img class="nav-brand-avatar" src="${escapeHtml(config.profile?.avatar || defaultAvatar())}" alt="" />
      <span class="nav-brand-text">${escapeHtml(config.profile?.displayName?.split(' ')[0] || 'Home')}</span>
    </button>
    <button class="nav-mobile-toggle" id="nav-toggle" aria-label="Menu">☰</button>
    <ul class="nav-tabs" id="nav-tabs">
      ${tabsHtml}
      <li class="nav-admin-item">
        <button class="nav-tab nav-admin-btn ${getIsAdmin() ? 'nav-admin-active' : ''}" id="nav-admin-btn" type="button">${getIsAdmin() ? 'Panel' : 'Admin'}</button>
      </li>
    </ul>
  `;

  $('#nav-home')?.addEventListener('click', () => goHome());

  $$('#nav-tabs .nav-tab[data-tab]', nav).forEach(btn => {
    btn.addEventListener('click', () => {
      viewMode = 'tab';
      activeTabId = btn.dataset.tab;
      renderSite(config);
      $$('#nav-tabs .nav-tab[data-tab]').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === activeTabId);
      });
      $('#nav-home')?.classList.remove('active');
      $('#nav-tabs')?.classList.remove('open');
    });
  });

  $('#nav-admin-btn')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('suki:admin-open'));
    $('#nav-tabs')?.classList.remove('open');
  });

  $('#nav-toggle')?.addEventListener('click', () => {
    $('#nav-tabs')?.classList.toggle('open');
  });
}

function renderProfile(config) {
  const hero = $('#hero-section');
  if (!hero) return;

  const p = config.profile;
  const hc = headingClass(config.typography?.headingEffect);
  const avatarBorder = `avatar-border-${p.avatarBorder || 'glow'}`;
  const avatarHover = `avatar-hover-${p.avatarHover || 'float'}`;
  const avatarSrc = p.avatar || defaultAvatar();

  const badgesHtml = (config.badges || [])
    .filter(b => b.visible)
    .map(b => renderDiscordBadge(b)).join('');

  const socialHtml = (config.socialLinks || [])
    .filter(s => s.visible)
    .map(s => {
      const plat = SOCIAL_PLATFORMS[s.platform] || SOCIAL_PLATFORMS.link;
      return `
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="social-link" data-platform="${s.platform}" aria-label="${plat.label}">
          ${plat.icon}
          <span class="social-tooltip">${plat.label}</span>
        </a>
      `;
    }).join('');

  const showVisitors = config.site?.showVisitorPill !== false;
  const visitorHtml = showVisitors ? renderVisitorPillHtml() : '';

  hero.innerHTML = `
    <section class="home-profile">
      <div class="home-profile-inner">
        <img class="home-avatar ${avatarBorder} ${avatarHover}" src="${avatarSrc}" alt="${escapeHtml(p.displayName)}" />
        <div class="home-identity">
          <div class="home-name-row">
            <h1 class="home-name ${hc}">${escapeHtml(p.displayName)}</h1>
            ${badgesHtml ? `<div class="discord-badges">${badgesHtml}</div>` : ''}
          </div>
          ${p.nickname ? `<div class="home-nickname">${escapeHtml(p.nickname)}</div>` : ''}
          <div class="home-username">${escapeHtml(p.username)}</div>
          ${p.tagline ? `<p class="home-tagline">${escapeHtml(p.tagline)}</p>` : ''}
          ${visitorHtml}
          ${socialHtml ? `<div class="social-row home-social">${socialHtml}</div>` : ''}
        </div>
      </div>
    </section>
  `;

  if (showVisitors) updateVisitorPill(getVisitorCount());
}

function renderTabContent(config) {
  const container = $('#tab-content');
  if (!container) return;

  const tab = (config.tabs || []).find(t => t.id === activeTabId);
  if (!tab) {
    container.innerHTML = '';
    return;
  }

  const hc = headingClass(config.typography?.headingEffect);
  const hoverClass = `hover-${config.site?.cardHover || 'lift'}`;
  let html = `
    <section class="content-section">
      <div class="section-header">
        <h2 class="${hc}">${escapeHtml(tab.content?.heading || tab.label)}</h2>
        ${tab.content?.subtitle ? `<p class="section-subtitle">${escapeHtml(tab.content.subtitle)}</p>` : ''}
      </div>
  `;

  switch (tab.type) {
    case 'about':
      html += `<div class="content-body glass-card ${hoverClass} about-content">${tab.content?.body || ''}</div>`;
      if (config.profile?.bio) {
        html += `<div class="content-body glass-card ${hoverClass} profile-bio-block"><p>${escapeHtml(config.profile.bio)}</p></div>`;
      }
      break;

    case 'links':
      html += `<div class="links-grid">${renderLinks(tab.content?.links || [], hoverClass)}</div>`;
      break;

    case 'promotions':
      html += `<div class="promo-grid">${renderPromos(config.promotions || [], hoverClass)}</div>`;
      break;

    case 'gallery':
      html += `<div class="gallery-grid">${renderGallery(config.gallery || [])}</div>`;
      break;

    case 'comments':
      html += `<div id="comments-mount" class="glass-card"></div>`;
      break;

    case 'custom':
      html += `<div class="content-body glass-card ${hoverClass}">${tab.content?.html || ''}</div>`;
      break;

    default:
      html += `<div class="content-body glass-card ${hoverClass}"><p>Content coming soon</p></div>`;
  }

  html += '</section>';
  container.innerHTML = html;

  $$('.link-card', container).forEach(card => {
    card.addEventListener('click', () => {
      const url = card.dataset.url;
      if (url) window.open(url, '_blank');
    });
  });

  if (tab.type === 'comments') mountComments(config, container);
}

function renderDiscordBadge(b) {
  const isDev = b.badgeType === 'developer';
  const from = b.gradientFrom || b.bgColor || '#b57bff';
  const to = b.gradientTo || b.textColor || '#e066ff';
  const icon = isDev ? '&lt;/&gt;' : (b.icon || '★');
  const label = escapeHtml(b.label || 'Badge');
  const tip = escapeHtml(b.tooltip || b.label || '');

  return `
    <span class="d-badge ${isDev ? 'd-badge-dev' : ''}"
          style="--badge-from:${from};--badge-to:${to}">
      <span class="d-badge-icon">${icon}</span>
      <span class="d-badge-tip">
        <strong>${label}</strong>
        <span>${tip}</span>
      </span>
    </span>
  `;
}

async function mountComments(config, container) {
  const mount = $('#comments-mount', container);
  if (!mount) return;
  const comments = await loadComments();
  renderCommentsUI(config, comments, mount);
  if (!commentsMounted) {
    commentsMounted = true;
    subscribeComments(() => refreshCommentsList(config, mount));
  }
}

function renderLinks(links, hoverClass) {
  return links.map(link => `
    <div class="link-card glass-card ${hoverClass}" data-url="${escapeHtml(link.url)}">
      <div class="link-card-icon">${link.icon || '🔗'}</div>
      <div class="link-card-text">
        <h3>${escapeHtml(link.title)}</h3>
        <p>${escapeHtml(link.description || '')}</p>
      </div>
    </div>
  `).join('');
}

function renderPromos(promos, hoverClass) {
  return promos
    .filter(p => p.visible)
    .map(p => {
      const imgStyle = p.image ? `background-image:url(${p.image})` : `background:linear-gradient(135deg,${p.accentColor}44,${p.accentColor}22)`;
      return `
        <div class="promo-card glass-card ${hoverClass}">
          <div class="promo-card-image" style="${imgStyle}">
            ${p.badge ? `<span class="promo-badge" style="background:${p.badgeColor || p.accentColor};color:#fff">${escapeHtml(p.badge)}</span>` : ''}
          </div>
          <div class="promo-card-body">
            <h3 style="color:${p.accentColor}">${escapeHtml(p.title)}</h3>
            <p>${escapeHtml(p.description)}</p>
            <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener"
               class="promo-btn" style="background:${p.accentColor}22;color:${p.accentColor};border-color:${p.accentColor}55">
              ${escapeHtml(p.buttonText || 'Visit')} →
            </a>
          </div>
        </div>
      `;
    }).join('');
}

function renderGallery(items) {
  if (!items.length) return '<p class="empty-hint">No images yet</p>';
  return items.filter(i => i.visible !== false).map(item => `
    <div class="gallery-item">
      <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.caption || '')}" loading="lazy" />
    </div>
  `).join('');
}

function renderMaintenance(config) {
  let overlay = $('#maintenance-overlay');
  if (config.site?.maintenanceMode) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'maintenance-overlay';
      overlay.className = 'maintenance-overlay';
      $('#app')?.appendChild(overlay);
    }
    overlay.innerHTML = `
      <div class="maintenance-card glass-card">
        <h2 class="heading-gradient">Under Maintenance</h2>
        <p>${escapeHtml(config.site.maintenanceMessage)}</p>
      </div>
    `;
    document.body.classList.add('maintenance-active');
  } else {
    overlay?.remove();
    document.body.classList.remove('maintenance-active');
  }
}

function renderEnterScreen(config) {
  const screen = $('#enter-screen');
  if (!screen) return;

  if (!config.site?.enterScreen) {
    screen.classList.add('dismissed');
    return;
  }

  screen.innerHTML = `
    <div class="enter-content">
      <div class="enter-glow"></div>
      <div class="enter-title">${escapeHtml(config.site.enterTitle || 'Welcome')}</div>
      <div class="enter-sub">${escapeHtml(config.site.enterSubtitle || 'click to enter')}</div>
    </div>
  `;

  screen.onclick = () => screen.classList.add('dismissed');
}

function defaultAvatar() {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#c4a0ff"/><stop offset="100%" stop-color="#f0a8d0"/>
      </linearGradient></defs>
      <circle cx="60" cy="60" r="60" fill="url(#g)"/>
      <text x="60" y="72" text-anchor="middle" font-size="48" fill="#fff">♡</text>
    </svg>
  `)}`;
}

function $$(sel, root) {
  return [...(root || document).querySelectorAll(sel)];
}

export { detectPlatform };
