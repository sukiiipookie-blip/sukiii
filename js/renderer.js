import { SOCIAL_PLATFORMS, detectPlatform } from './defaults.js';
import { escapeHtml, $ } from './utils.js';
import { headingClass } from './theme-engine.js';
import { loadComments, renderCommentsUI, subscribeComments, refreshCommentsList } from './comments.js';

let activeTabId = null;
let commentsMounted = false;

export function renderSite(config) {
  renderNav(config);
  renderProfile(config);
  renderTabContent(config);
  renderMaintenance(config);
  renderEnterScreen(config);
}

export function getActiveTabId() {
  return activeTabId;
}

export function setActiveTab(id) {
  activeTabId = id;
}

function renderNav(config) {
  const nav = $('#main-nav');
  if (!nav) return;

  const style = config.navigation?.style || 'default';
  nav.className = `nav-bar style-${style}`;

  const visibleTabs = (config.tabs || []).filter(t => t.visible);
  if (!activeTabId && visibleTabs.length) activeTabId = visibleTabs[0].id;

  const tabsHtml = visibleTabs.map(tab => `
    <li>
      <button class="nav-tab ${tab.id === activeTabId ? 'active' : ''}"
              data-tab="${tab.id}">${escapeHtml(tab.label)}</button>
    </li>
  `).join('');

  nav.innerHTML = `
    <div class="nav-logo" id="nav-logo" title="✨">
      <div class="nav-logo-icon">✨</div>
      <span class="nav-logo-text">${escapeHtml(config.profile?.displayName?.split(' ')[0] || 'Hub')}</span>
    </div>
    <button class="nav-mobile-toggle" id="nav-toggle" aria-label="Menu">☰</button>
    <ul class="nav-tabs" id="nav-tabs">${tabsHtml}</ul>
  `;

  $$('#nav-tabs .nav-tab', nav).forEach(btn => {
    btn.addEventListener('click', () => {
      activeTabId = btn.dataset.tab;
      renderTabContent(config);
      $$('#nav-tabs .nav-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTabId));
      $('#nav-tabs')?.classList.remove('open');
    });
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
  const avatarHover = `avatar-hover-${p.avatarHover || 'pulse'}`;
  const avatarSrc = p.avatar || defaultAvatar();

  const badgesHtml = (config.badges || [])
    .filter(b => b.visible)
    .map(b => renderProfileBadge(b)).join('');

  const socialHtml = (config.socialLinks || [])
    .filter(s => s.visible)
    .map(s => {
      const plat = SOCIAL_PLATFORMS[s.platform] || SOCIAL_PLATFORMS.link;
      return `
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="social-link" data-platform="${s.platform}">
          ${plat.icon}
          <span class="social-tooltip">${plat.label}</span>
        </a>
      `;
    }).join('');

  const bannerStyle = p.banner ? `background-image:url(${p.banner})` : '';

  hero.innerHTML = `
    <div class="profile-card glass-card">
      <div class="profile-banner" style="${bannerStyle}"></div>
      <div class="profile-body">
        <div class="avatar-wrap">
          <img class="avatar ${avatarBorder} ${avatarHover}" src="${avatarSrc}" alt="${escapeHtml(p.displayName)}" />
        </div>
        <div class="profile-info">
          <h1 class="profile-name ${hc}">${escapeHtml(p.displayName)}</h1>
          ${p.nickname ? `<div class="profile-nickname">${escapeHtml(p.nickname)}</div>` : ''}
          <div class="profile-username">${escapeHtml(p.username)}</div>
          <div class="profile-tagline">${escapeHtml(p.tagline)}</div>
          <p class="profile-bio">${escapeHtml(p.bio)}</p>
          <div class="role-pills">${badgesHtml}</div>
          <div class="social-row">${socialHtml}</div>
        </div>
      </div>
    </div>
  `;
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
        ${tab.content?.subtitle ? `<p>${escapeHtml(tab.content.subtitle)}</p>` : ''}
      </div>
  `;

  switch (tab.type) {
    case 'about':
      html += `<div class="glass-card ${hoverClass} about-content">${tab.content?.body || ''}</div>`;
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
      html += `<div id="comments-mount"></div>`;
      break;

    case 'custom':
      html += `<div class="glass-card ${hoverClass}">${tab.content?.html || ''}</div>`;
      break;

    default:
      html += `<div class="glass-card ${hoverClass}"><p>Content coming soon ✨</p></div>`;
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

function renderProfileBadge(b) {
  const isDev = b.badgeType === 'developer';
  const grad = b.useGradient && b.gradientFrom && b.gradientTo
    ? `background:linear-gradient(135deg,${b.gradientFrom},${b.gradientTo});color:#fff;border-color:transparent;box-shadow:0 0 18px ${b.gradientFrom}55;`
    : `background:${b.bgColor};color:${b.textColor};border-color:${b.borderColor};--pill-bg:${b.bgColor}`;
  const icon = isDev
    ? '<span class="role-icon dev-icon">&lt;/&gt;</span>'
    : `<span class="role-icon">${b.icon || '✨'}</span>`;
  return `
    <div class="role-pill style-${b.style || 'glow'} ${isDev ? 'role-pill-developer' : ''}"
         style="${grad}">
      ${icon}
      <span>${escapeHtml(b.label)}</span>
      ${b.tooltip ? `<div class="role-tooltip">${escapeHtml(b.tooltip)}</div>` : ''}
    </div>
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
  if (!items.length) return '<p style="color:var(--text-muted)">No images yet ✨</p>';
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
    <div class="enter-sparkles" id="enter-sparkles"></div>
    <div class="enter-content">
      <div class="enter-title">${escapeHtml(config.site.enterTitle || 'Welcome')}</div>
      <div class="enter-sub">${escapeHtml(config.site.enterSubtitle || '')}</div>
    </div>
  `;

  const sparkles = $('#enter-sparkles');
  if (sparkles) {
    for (let i = 0; i < 30; i++) {
      const s = document.createElement('div');
      s.className = 'ambient-sparkle';
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 100}%`;
      s.style.animationDelay = `${Math.random() * 3}s`;
      sparkles.appendChild(s);
    }
  }

  screen.onclick = () => screen.classList.add('dismissed');
}

function defaultAvatar() {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#c4a0ff"/><stop offset="100%" stop-color="#f0a8d0"/>
      </linearGradient></defs>
      <circle cx="60" cy="60" r="60" fill="url(#g)"/>
      <text x="60" y="72" text-anchor="middle" font-size="48" fill="#fff">✨</text>
    </svg>
  `)}`;
}

function $$(sel, root) {
  return [...(root || document).querySelectorAll(sel)];
}

export { detectPlatform };
