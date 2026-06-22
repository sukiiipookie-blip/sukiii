import {
  getConfig, setConfig, saveConfigToSupabase, revertToLastSaved, uploadFile, subscribe,
} from './state.js';
import { THEME_PRESETS, SUNSET_THEME_PRESETS, NEON_THEME_KEYS, SUNSET_THEME_KEYS, BG_ANIMATIONS, SOCIAL_PLATFORMS, detectPlatform, createDefaultConfig } from './defaults.js';
import { uid, $, $$, showToast, debounce } from './utils.js';
import { closeAdminPanel, signOut, getSiteUser, isOwnerUser } from './auth.js';
import { openImageCropModal, loadImageForCrop, AVATAR_SIZE_NOTE } from './image-crop.js';
import { getVisibleSections, ADMIN_GROUPS } from './permissions.js';
import {
  renderUsersSection, renderCommentsAdminSection,
  bindUsersSection, bindCommentsAdminSection,
} from './admin-owner.js';

const ALL_SECTIONS = [
  'theme', 'background', 'profile', 'badges', 'tabs', 'promotions', 'music', 'typography', 'site', 'comments', 'users',
];

let draftConfig = null;
let activeSection = 'theme';
let editingItem = null;

export function initAdmin(onApply) {
  subscribe((config) => {
    if ($('#admin-panel')?.classList.contains('open')) {
      draftConfig = JSON.parse(JSON.stringify(config));
    }
  });

  buildAdminPanel(onApply);
  setupAdminTriggers();
}

function setupAdminTriggers() {
  document.addEventListener('click', (e) => {
    if (e.target.id === 'admin-overlay') closeAdminPanel();
  });
}

function buildAdminPanel(onApply) {
  if ($('#admin-panel')) return;

  const overlay = document.createElement('div');
  overlay.id = 'admin-overlay';
  document.body.appendChild(overlay);

  const panel = document.createElement('div');
  panel.id = 'admin-panel';
  panel.innerHTML = `
    <div class="admin-header">
      <div>
        <h2>✨ Admin Panel</h2>
        <span class="admin-role-tag" id="admin-role-tag"></span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="admin-btn admin-btn-sm admin-btn-secondary" id="admin-signout" title="Sign out">Sign out</button>
        <button class="admin-close" id="admin-close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="admin-nav" id="admin-nav"></div>
    <div class="admin-body" id="admin-body"></div>
    <div class="admin-footer">
      <button class="admin-btn admin-btn-secondary" id="admin-revert">Revert</button>
      <button class="admin-btn admin-btn-primary" id="admin-save">Save Changes</button>
    </div>
  `;
  document.body.appendChild(panel);

  $('#admin-close')?.addEventListener('click', closeAdminPanel);
  $('#admin-signout')?.addEventListener('click', () => signOut());
  $('#admin-revert')?.addEventListener('click', () => {
    revertToLastSaved();
    draftConfig = JSON.parse(JSON.stringify(getConfig()));
    renderAdminSection(onApply);
    onApply(getConfig());
    showToast('Reverted to last saved state');
  });
  $('#admin-save')?.addEventListener('click', async () => {
    try {
      await saveConfigToSupabase();
      showToast('Saved successfully!');
      closeAdminPanel();
    } catch (e) {
      showToast(e.message, 'error');
    }
  });

  renderAdminNav();
}

export function openAdminUI(onApply) {
  draftConfig = JSON.parse(JSON.stringify(getConfig()));
  const visible = getVisibleSections(getSiteUser());
  activeSection = visible[0] || 'theme';
  renderAdminNav();
  renderAdminSection(onApply);
  bindAdminEvents(onApply);
  const tag = $('#admin-role-tag');
  if (tag) tag.textContent = getSiteUser()?.role === 'owner' ? '👑 Owner' : '🛡️ Admin';
}

function renderAdminNav() {
  const nav = $('#admin-nav');
  if (!nav) return;
  const siteUser = getSiteUser();
  const visible = getVisibleSections(siteUser);
  const labels = {
    theme: 'Theme', background: 'Background', profile: 'Profile',
    badges: 'Badges', tabs: 'Tabs', promotions: 'Promos',
    music: 'Music', typography: 'Fonts', site: 'Site',
    comments: 'Comments', users: '👑 Team',
  };

  let html = '';
  for (const group of ADMIN_GROUPS) {
    if (group.ownerOnly && siteUser?.role !== 'owner') continue;
    const groupSections = group.sections.filter(s => visible.includes(s));
    if (!groupSections.length) continue;
    html += `<span class="admin-nav-group-label">${group.label}</span>`;
    html += groupSections.map(s => `
      <button class="admin-nav-btn ${s === activeSection ? 'active' : ''}" data-section="${s}">${labels[s]}</button>
    `).join('');
  }
  nav.innerHTML = html;

  $$('.admin-nav-btn', nav).forEach(btn => {
    btn.addEventListener('click', () => {
      activeSection = btn.dataset.section;
      renderAdminNav();
      renderAdminSection(window.__onApply);
    });
  });
}

function renderAdminSection(onApply) {
  window.__onApply = onApply;
  const body = $('#admin-body');
  if (!body || !draftConfig) return;

  const c = draftConfig;
  const visible = getVisibleSections(getSiteUser());
  const sections = {
    theme: renderThemeSection(c),
    background: renderBackgroundSection(c),
    profile: renderProfileSection(c),
    badges: renderBadgesSection(c),
    tabs: renderTabsSection(c),
    promotions: renderPromotionsSection(c),
    music: renderMusicSection(c),
    typography: renderTypographySection(c),
    site: renderSiteSection(c),
    comments: renderCommentsAdminSection(c),
    users: renderUsersSection(),
  };

  body.innerHTML = visible.map(s => `
    <div class="admin-section ${s === activeSection ? 'active' : ''}" data-admin-section="${s}">
      ${sections[s] || ''}
    </div>
  `).join('');

  bindSectionEvents(onApply);
  if (visible.includes('users')) bindUsersSection(draftConfig, onApply);
  if (visible.includes('comments')) bindCommentsAdminSection(draftConfig, onApply);
  window.__rerenderAdmin = () => renderAdminSection(onApply);
}

function renderThemeSection(c) {
  const neonGrid = renderPresetGrid(NEON_THEME_KEYS, THEME_PRESETS, c.theme.preset);
  const sunsetGrid = isOwnerUser()
    ? `<div class="admin-divider"></div>
       <h3 style="margin-bottom:8px">🌅 Sunset Themes <span class="admin-owner-tag">Owner only</span></h3>
       <p class="admin-hint" style="margin-bottom:12px">Warm golden & coral neon palettes — exclusive to you.</p>
       <div class="theme-presets">${renderPresetGrid(SUNSET_THEME_KEYS, SUNSET_THEME_PRESETS, c.theme.preset)}</div>`
    : '';

  const overlays = ['frost', 'glow'];
  const overlayChips = overlays.map(o => `
    <button class="overlay-chip ${(c.theme.overlays || []).includes(o) ? 'active' : ''}" data-overlay="${o}">
      ${o === 'frost' ? '❄️ Frosted Glass' : '✨ Boost Glow'}
    </button>
  `).join('');

  return `
    <h3 style="margin-bottom:16px">Neon / Lavender Themes</h3>
    <div class="theme-presets">${neonGrid}</div>
    ${sunsetGrid}
    <div class="admin-divider"></div>
    <h3 style="margin-bottom:12px">Variation Overlays</h3>
    <div class="overlay-toggles">${overlayChips}</div>
    <div class="form-group">
      <label>Glow Intensity</label>
      <input type="range" class="form-range" id="glow-intensity" min="0.5" max="2" step="0.1" value="${c.theme.glowIntensity || 1}" />
    </div>
    <div class="admin-divider"></div>
    <h3 style="margin-bottom:12px">Custom Colors</h3>
    <div class="form-row">
      <div class="form-group"><label>Accent Primary</label><input type="color" class="form-color" data-custom="--accent-primary" value="${hexFromVar(c.theme.custom?.['--accent-primary'] || '#b57bff')}" /></div>
      <div class="form-group"><label>Accent Rose</label><input type="color" class="form-color" data-custom="--accent-rose" value="${hexFromVar(c.theme.custom?.['--accent-rose'] || '#e066ff')}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Background</label><input type="color" class="form-color" data-custom="--bg-primary" value="${hexFromVar(c.theme.custom?.['--bg-primary'] || '#08060f')}" /></div>
      <div class="form-group"><label>Glass Border</label><input type="color" class="form-color" data-custom="--glass-border" value="${hexFromVar(c.theme.custom?.['--glass-border'] || '#b57bff')}" /></div>
    </div>
  `;
}

function renderPresetGrid(keys, presetMap, activeKey) {
  return keys.map(key => {
    const p = presetMap[key];
    if (!p) return '';
    return `
      <div class="theme-preset ${activeKey === key ? 'active' : ''}" data-preset="${key}">
        <div class="theme-preset-swatch" style="background:${p.swatch}"></div>
        <div class="theme-preset-name">${p.name}</div>
      </div>
    `;
  }).join('');
}

function renderBackgroundSection(c) {
  const bg = c.background;
  const types = ['solid', 'gradient', 'image', 'video', 'animation'];
  const typeBtns = types.map(t => `
    <button class="bg-type-btn ${bg.type === t ? 'active' : ''}" data-bg-type="${t}">${t}</button>
  `).join('');

  const animBtns = BG_ANIMATIONS.map(a => `
    <button class="bg-type-btn ${bg.animation === a ? 'active' : ''}" data-bg-anim="${a}">${a}</button>
  `).join('');

  return `
    <div class="bg-type-grid">${typeBtns}</div>
    <div class="form-group" id="bg-solid-group" ${bg.type !== 'solid' ? 'style="display:none"' : ''}>
      <label>Solid Color</label><input type="color" class="form-color" id="bg-solid" value="${hexFromVar(bg.solid)}" />
    </div>
    <div class="form-group" id="bg-gradient-group" ${bg.type !== 'gradient' ? 'style="display:none"' : ''}>
      <label>CSS Gradient</label>
      <textarea class="form-textarea" id="bg-gradient" rows="3">${bg.gradient || ''}</textarea>
    </div>
    <div class="form-group" id="bg-image-group" ${bg.type !== 'image' ? 'style="display:none"' : ''}>
      <label>Image URL</label><input class="form-input" id="bg-image" value="${bg.image || ''}" />
      <input type="file" accept="image/*" id="bg-image-upload" class="form-input" style="margin-top:8px" />
    </div>
    <div class="form-group" id="bg-video-group" ${bg.type !== 'video' ? 'style="display:none"' : ''}>
      <label>Video URL</label><input class="form-input" id="bg-video" value="${bg.video || ''}" />
    </div>
    <div class="admin-divider"></div>
    <h3 style="margin-bottom:12px">Animated Overlay</h3>
    <div class="bg-anim-grid">${animBtns}</div>
    <div class="form-row" style="margin-top:16px">
      <div class="form-group"><label>Speed</label><input type="range" class="form-range" id="bg-speed" min="0.2" max="3" step="0.1" value="${bg.speed || 1}" /></div>
      <div class="form-group"><label>Opacity</label><input type="range" class="form-range" id="bg-opacity" min="0.1" max="1" step="0.05" value="${bg.opacity || 0.85}" /></div>
    </div>
  `;
}

function renderProfileSection(c) {
  const p = c.profile;
  return `
    <div class="form-group"><label>Display Name</label><input class="form-input" id="prof-name" value="${esc(p.displayName)}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Nickname</label><input class="form-input" id="prof-nick" value="${esc(p.nickname || '')}" placeholder="Suki" /></div>
      <div class="form-group"><label>Username</label><input class="form-input" id="prof-user" value="${esc(p.username)}" /></div>
    </div>
    <div class="form-group"><label>Tagline</label><input class="form-input" id="prof-tag" value="${esc(p.tagline)}" /></div>
    <div class="form-group"><label>Bio</label><textarea class="form-textarea" id="prof-bio">${esc(p.bio)}</textarea></div>
    <div class="form-group avatar-upload-group">
      <label>Profile Photo</label>
      <p class="admin-hint avatar-size-note">💜 ${AVATAR_SIZE_NOTE}</p>
      <input class="form-input" id="prof-avatar" value="${esc(p.avatar)}" placeholder="Paste image URL or upload below" />
      <div class="form-row" style="margin-top:8px">
        <input type="file" accept="image/*" id="prof-avatar-upload" class="form-input" />
        <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" id="prof-avatar-crop">Crop URL / Preview</button>
      </div>
      ${p.avatar ? `<img src="${esc(p.avatar)}" class="avatar-admin-preview" id="avatar-preview" alt="" />` : '<img class="avatar-admin-preview hidden" id="avatar-preview" alt="" />'}
    </div>
    <div class="form-group"><label>Banner URL</label><input class="form-input" id="prof-banner" value="${esc(p.banner)}" /><input type="file" accept="image/*" id="prof-banner-upload" class="form-input" style="margin-top:8px" /></div>
    <div class="form-row">
      <div class="form-group"><label>Avatar Border</label>
        <select class="form-select" id="prof-border"><option value="ring" ${p.avatarBorder==='ring'?'selected':''}>Ring</option><option value="glow" ${p.avatarBorder==='glow'?'selected':''}>Glow</option><option value="sparkle" ${p.avatarBorder==='sparkle'?'selected':''}>Sparkle</option></select>
      </div>
      <div class="form-group"><label>Hover Animation</label>
        <select class="form-select" id="prof-hover"><option value="pulse" ${p.avatarHover==='pulse'?'selected':''}>Pulse</option><option value="float" ${p.avatarHover==='float'?'selected':''}>Float</option><option value="spin" ${p.avatarHover==='spin'?'selected':''}>Spin</option></select>
      </div>
    </div>
    <div class="admin-divider"></div>
    <h3 style="margin-bottom:12px">Social Links</h3>
    <div class="sortable-list" id="social-list">${renderSocialList(c.socialLinks)}</div>
    <button class="admin-btn admin-btn-secondary admin-btn-sm" id="add-social" style="margin-top:10px">+ Add Link</button>
    <div class="form-group" style="margin-top:16px"><label>Nav Style</label>
      <select class="form-select" id="nav-style"><option value="default" ${c.navigation?.style==='default'?'selected':''}>Default Bar</option><option value="pill" ${c.navigation?.style==='pill'?'selected':''}>Floating Pill</option><option value="floating" ${c.navigation?.style==='floating'?'selected':''}>Centered</option></select>
    </div>
  `;
}

function renderSocialList(links) {
  return (links || []).map((s, i) => `
    <div class="sortable-item" data-social-idx="${i}">
      <span class="sortable-handle">⠿</span>
      <div class="sortable-item-content">${SOCIAL_PLATFORMS[s.platform]?.icon || '🔗'} ${esc(s.url.slice(0, 40))}</div>
      <div class="sortable-item-actions">
        <button class="admin-btn admin-btn-sm admin-btn-secondary edit-social" data-idx="${i}">Edit</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger del-social" data-idx="${i}">✕</button>
      </div>
    </div>
  `).join('');
}

function renderBadgesSection(c) {
  return `
    <p class="admin-hint" style="margin-bottom:12px">Role pills with fancy hover tooltips — drag to reorder.</p>
    <div class="sortable-list" id="badge-list">${renderBadgeList(c.badges)}</div>
    <button class="admin-btn admin-btn-secondary admin-btn-sm" id="add-badge" style="margin-top:10px">+ Add Badge</button>
  `;
}

function renderBadgeList(badges) {
  return (badges || []).map((b, i) => `
    <div class="sortable-item" data-badge-idx="${i}" draggable="true">
      <span class="sortable-handle">⠿</span>
      <div class="sortable-item-content">${b.icon} ${esc(b.label)}</div>
      <div class="sortable-item-actions">
        <button class="admin-btn admin-btn-sm admin-btn-secondary edit-badge" data-idx="${i}">Edit</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger del-badge" data-idx="${i}">✕</button>
      </div>
    </div>
  `).join('');
}

function renderTabsSection(c) {
  return `
    <div class="sortable-list" id="tab-list">${renderTabList(c.tabs)}</div>
    <button class="admin-btn admin-btn-secondary admin-btn-sm" id="add-tab" style="margin-top:10px">+ Add Tab</button>
  `;
}

function renderTabList(tabs) {
  return (tabs || []).map((t, i) => `
    <div class="sortable-item" data-tab-idx="${i}" draggable="true">
      <span class="sortable-handle">⠿</span>
      <div class="sortable-item-content">${esc(t.label)} <span style="color:var(--text-muted)">(${t.type})</span></div>
      <div class="sortable-item-actions">
        <button class="admin-btn admin-btn-sm admin-btn-secondary edit-tab" data-idx="${i}">Edit</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger del-tab" data-idx="${i}">✕</button>
      </div>
    </div>
  `).join('');
}

function renderPromotionsSection(c) {
  return `
    <div class="sortable-list" id="promo-list">${renderPromoList(c.promotions)}</div>
    <button class="admin-btn admin-btn-secondary admin-btn-sm" id="add-promo" style="margin-top:10px">+ Add Promo</button>
  `;
}

function renderPromoList(promos) {
  return (promos || []).map((p, i) => `
    <div class="sortable-item" data-promo-idx="${i}" draggable="true">
      <span class="sortable-handle">⠿</span>
      <div class="sortable-item-content">${esc(p.title)} ${p.badge ? `<span style="color:var(--accent-primary)">[${p.badge}]</span>` : ''}</div>
      <div class="sortable-item-actions">
        <button class="admin-btn admin-btn-sm admin-btn-secondary edit-promo" data-idx="${i}">Edit</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger del-promo" data-idx="${i}">✕</button>
      </div>
    </div>
  `).join('');
}

function renderMusicSection(c) {
  const m = c.music;
  return `
    <div class="form-row">
      <div class="form-group"><label>Position</label>
        <select class="form-select" id="music-pos"><option value="bottom-right" ${m.position==='bottom-right'?'selected':''}>Bottom Right</option><option value="bottom-left" ${m.position==='bottom-left'?'selected':''}>Bottom Left</option><option value="bottom-center" ${m.position==='bottom-center'?'selected':''}>Bottom Center</option><option value="top-right" ${m.position==='top-right'?'selected':''}>Top Right</option></select>
      </div>
      <div class="form-group"><label>Style</label>
        <select class="form-select" id="music-style"><option value="minimal" ${m.style==='minimal'?'selected':''}>Minimal</option><option value="expanded" ${m.style==='expanded'?'selected':''}>Expanded</option></select>
      </div>
    </div>
    <div class="form-row">
      <label class="form-checkbox"><input type="checkbox" id="music-autoplay" ${m.autoplay?'checked':''} /> Autoplay</label>
      <label class="form-checkbox"><input type="checkbox" id="music-loop" ${m.loop?'checked':''} /> Loop</label>
      <label class="form-checkbox"><input type="checkbox" id="music-shuffle" ${m.shuffle?'checked':''} /> Shuffle</label>
    </div>
    <div class="admin-divider"></div>
    <div class="sortable-list" id="track-list">${renderTrackList(m.tracks)}</div>
    <button class="admin-btn admin-btn-secondary admin-btn-sm" id="add-track" style="margin-top:10px">+ Add Track</button>
  `;
}

function renderTrackList(tracks) {
  return (tracks || []).map((t, i) => `
    <div class="sortable-item" data-track-idx="${i}">
      <span class="sortable-handle">⠿</span>
      <div class="sortable-item-content">♪ ${esc(t.title)} — ${esc(t.artist || '')}</div>
      <div class="sortable-item-actions">
        <button class="admin-btn admin-btn-sm admin-btn-secondary edit-track" data-idx="${i}">Edit</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger del-track" data-idx="${i}">✕</button>
      </div>
    </div>
  `).join('');
}

function renderTypographySection(c) {
  const t = c.typography;
  return `
    <div class="form-row">
      <div class="form-group"><label>Display Font</label><input class="form-input" id="font-display" value="${esc(t.displayFont)}" /></div>
      <div class="form-group"><label>Body Font</label><input class="form-input" id="font-body" value="${esc(t.bodyFont)}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Base Size (px)</label><input type="number" class="form-input" id="font-size" value="${t.baseSize}" min="12" max="22" /></div>
      <div class="form-group"><label>Heading Effect</label>
        <select class="form-select" id="heading-effect"><option value="gradient" ${t.headingEffect==='gradient'?'selected':''}>Gradient</option><option value="glow" ${t.headingEffect==='glow'?'selected':''}>Glow</option><option value="none" ${t.headingEffect==='none'?'selected':''}>Plain</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Heading Weight</label><input type="number" class="form-input" id="heading-weight" value="${t.headingWeight}" min="300" max="900" step="100" /></div>
      <div class="form-group"><label>Line Height</label><input type="number" class="form-input" id="line-height" value="${t.lineHeight}" min="1" max="2.5" step="0.05" /></div>
    </div>
  `;
}

function renderSiteSection(c) {
  const s = c.site;
  return `
    <div class="form-group"><label>Page Title</label><input class="form-input" id="site-title" value="${esc(s.title)}" /></div>
    <div class="form-group"><label>Favicon URL</label><input class="form-input" id="site-favicon" value="${esc(s.favicon)}" /><input type="file" accept="image/*" id="favicon-upload" class="form-input" style="margin-top:8px" /></div>
    <div class="form-row">
      <div class="form-group"><label>Enter Screen Title</label><input class="form-input" id="enter-title" value="${esc(s.enterTitle)}" /></div>
      <div class="form-group"><label>Enter Subtitle</label><input class="form-input" id="enter-sub" value="${esc(s.enterSubtitle)}" /></div>
    </div>
    <label class="form-checkbox"><input type="checkbox" id="enter-screen" ${s.enterScreen?'checked':''} /> Show enter screen</label>
    <div class="admin-divider"></div>
    <div class="form-row">
      <div class="form-group"><label>Cursor Style</label>
        <select class="form-select" id="cursor-style"><option value="default" ${s.cursor==='default'?'selected':''}>System Default</option><option value="neon" ${s.cursor==='neon'||s.cursor==='dot'||s.cursor==='sparkle'?'selected':''}>Neon Dot</option><option value="custom" ${s.cursor==='custom'?'selected':''}>Custom Image</option></select>
      </div>
      <div class="form-group"><label>Page Transition</label>
        <select class="form-select" id="page-transition"><option value="fade" ${s.pageTransition==='fade'?'selected':''}>Fade</option><option value="slide" ${s.pageTransition==='slide'?'selected':''}>Slide Up</option><option value="scale" ${s.pageTransition==='scale'?'selected':''}>Scale</option></select>
      </div>
    </div>
    <div class="form-group"><label>Card Hover Effect</label>
      <select class="form-select" id="card-hover"><option value="lift" ${s.cardHover==='lift'?'selected':''}>Lift</option><option value="glow" ${s.cardHover==='glow'?'selected':''}>Glow</option><option value="tilt" ${s.cardHover==='tilt'?'selected':''}>Tilt</option></select>
    </div>
    <label class="form-checkbox"><input type="checkbox" id="show-music" ${s.showMusicPlayer?'checked':''} /> Show music player</label>
    <label class="form-checkbox"><input type="checkbox" id="show-visitors" ${s.showVisitorPill !== false ? 'checked' : ''} /> Show unique visitor pill</label>
    <div class="admin-divider"></div>
    <label class="form-checkbox"><input type="checkbox" id="maintenance" ${s.maintenanceMode?'checked':''} /> Maintenance mode</label>
    <div class="form-group"><label>Maintenance Message</label><textarea class="form-textarea" id="maintenance-msg">${esc(s.maintenanceMessage)}</textarea></div>
  `;
}

function bindAdminEvents(onApply) {
  bindSectionEvents(onApply);
}

function bindSectionEvents(onApply) {
  const apply = debounce(() => {
    setConfig(draftConfig);
    onApply(draftConfig);
  }, 150);

  $$('.theme-preset').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.preset;
      if (SUNSET_THEME_KEYS.includes(key) && !isOwnerUser()) {
        showToast('Sunset themes are owner-only', 'error');
        return;
      }
      draftConfig.theme.preset = key;
      renderAdminSection(onApply);
      apply();
    });
  });

  $$('.overlay-chip').forEach(el => {
    el.addEventListener('click', () => {
      const o = el.dataset.overlay;
      const arr = draftConfig.theme.overlays || [];
      if (arr.includes(o)) draftConfig.theme.overlays = arr.filter(x => x !== o);
      else draftConfig.theme.overlays = [...arr, o];
      renderAdminSection(onApply);
      apply();
    });
  });

  $('#glow-intensity')?.addEventListener('input', e => {
    draftConfig.theme.glowIntensity = parseFloat(e.target.value);
    apply();
  });

  $$('[data-custom]').forEach(el => {
    el.addEventListener('input', e => {
      if (!draftConfig.theme.custom) draftConfig.theme.custom = {};
      draftConfig.theme.custom[e.target.dataset.custom] = e.target.value;
      apply();
    });
  });

  $$('[data-bg-type]').forEach(el => {
    el.addEventListener('click', () => {
      draftConfig.background.type = el.dataset.bgType;
      renderAdminSection(onApply);
      apply();
    });
  });

  $$('[data-bg-anim]').forEach(el => {
    el.addEventListener('click', () => {
      draftConfig.background.animation = el.dataset.bgAnim;
      renderAdminSection(onApply);
      apply();
    });
  });

  bindInput('#bg-solid', 'background.solid', v => v, apply);
  bindInput('#bg-gradient', 'background.gradient', v => v, apply);
  bindInput('#bg-image', 'background.image', v => v, apply);
  bindInput('#bg-video', 'background.video', v => v, apply);
  bindInput('#bg-speed', 'background.speed', v => parseFloat(v), apply);
  bindInput('#bg-opacity', 'background.opacity', v => parseFloat(v), apply);

  bindProfileInputs(apply);
  bindTypographyInputs(apply);
  bindSiteInputs(apply);
  bindMusicInputs(apply);
  bindListActions(onApply, apply);
  bindProfileCrop(onApply, apply);
  bindFileUploads(onApply, apply);
  bindDragReorder(onApply, apply);
}

function bindInput(sel, path, transform, apply) {
  const el = $(sel);
  if (!el) return;
  el.addEventListener('input', () => {
    setNested(draftConfig, path, transform(el.value));
    apply();
  });
}

function bindProfileInputs(apply) {
  const fields = {
    '#prof-name': ['profile.displayName'],
    '#prof-nick': ['profile.nickname'],
    '#prof-user': ['profile.username'],
    '#prof-tag': ['profile.tagline'],
    '#prof-bio': ['profile.bio'],
    '#prof-avatar': ['profile.avatar'],
    '#prof-banner': ['profile.banner'],
    '#prof-border': ['profile.avatarBorder'],
    '#prof-hover': ['profile.avatarHover'],
    '#nav-style': ['navigation.style'],
  };
  Object.entries(fields).forEach(([sel, path]) => {
    $(sel)?.addEventListener('input', e => {
      setNested(draftConfig, path.join('.'), e.target.value);
      apply();
    });
    $(sel)?.addEventListener('change', e => {
      setNested(draftConfig, path.join('.'), e.target.value);
      apply();
    });
  });
}

function bindTypographyInputs(apply) {
  const map = {
    '#font-display': 'typography.displayFont',
    '#font-body': 'typography.bodyFont',
    '#font-size': 'typography.baseSize',
    '#heading-effect': 'typography.headingEffect',
    '#heading-weight': 'typography.headingWeight',
    '#line-height': 'typography.lineHeight',
  };
  Object.entries(map).forEach(([sel, path]) => {
    $(sel)?.addEventListener('change', e => {
      const v = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
      setNested(draftConfig, path, v);
      apply();
    });
  });
}

function bindSiteInputs(apply) {
  const textFields = {
    '#site-title': 'site.title',
    '#site-favicon': 'site.favicon',
    '#enter-title': 'site.enterTitle',
    '#enter-sub': 'site.enterSubtitle',
    '#maintenance-msg': 'site.maintenanceMessage',
    '#cursor-style': 'site.cursor',
    '#page-transition': 'site.pageTransition',
    '#card-hover': 'site.cardHover',
  };
  Object.entries(textFields).forEach(([sel, path]) => {
    $(sel)?.addEventListener('change', e => {
      setNested(draftConfig, path, e.target.value);
      apply();
    });
  });
  const checks = {
    '#enter-screen': 'site.enterScreen',
    '#show-music': 'site.showMusicPlayer',
    '#show-visitors': 'site.showVisitorPill',
    '#maintenance': 'site.maintenanceMode',
  };
  Object.entries(checks).forEach(([sel, path]) => {
    $(sel)?.addEventListener('change', e => {
      setNested(draftConfig, path, e.target.checked);
      apply();
    });
  });
}

function bindMusicInputs(apply) {
  $('#music-pos')?.addEventListener('change', e => { draftConfig.music.position = e.target.value; apply(); });
  $('#music-style')?.addEventListener('change', e => { draftConfig.music.style = e.target.value; apply(); });
  $('#music-autoplay')?.addEventListener('change', e => { draftConfig.music.autoplay = e.target.checked; apply(); });
  $('#music-loop')?.addEventListener('change', e => { draftConfig.music.loop = e.target.checked; apply(); });
  $('#music-shuffle')?.addEventListener('change', e => { draftConfig.music.shuffle = e.target.checked; apply(); });
}

function bindListActions(onApply, apply) {
  $('#add-badge')?.addEventListener('click', () => openItemModal('badge', null, onApply));
  $('#add-social')?.addEventListener('click', () => openItemModal('social', null, onApply));
  $('#add-tab')?.addEventListener('click', () => openItemModal('tab', null, onApply));
  $('#add-promo')?.addEventListener('click', () => openItemModal('promo', null, onApply));
  $('#add-track')?.addEventListener('click', () => openItemModal('track', null, onApply));

  $$('.edit-badge').forEach(b => b.addEventListener('click', () => openItemModal('badge', +b.dataset.idx, onApply)));
  $$('.del-badge').forEach(b => b.addEventListener('click', () => { draftConfig.badges.splice(+b.dataset.idx, 1); renderAdminSection(onApply); apply(); }));
  $$('.edit-social').forEach(b => b.addEventListener('click', () => openItemModal('social', +b.dataset.idx, onApply)));
  $$('.del-social').forEach(b => b.addEventListener('click', () => { draftConfig.socialLinks.splice(+b.dataset.idx, 1); renderAdminSection(onApply); apply(); }));
  $$('.edit-tab').forEach(b => b.addEventListener('click', () => openItemModal('tab', +b.dataset.idx, onApply)));
  $$('.del-tab').forEach(b => b.addEventListener('click', () => { draftConfig.tabs.splice(+b.dataset.idx, 1); renderAdminSection(onApply); apply(); }));
  $$('.edit-promo').forEach(b => b.addEventListener('click', () => openItemModal('promo', +b.dataset.idx, onApply)));
  $$('.del-promo').forEach(b => b.addEventListener('click', () => { draftConfig.promotions.splice(+b.dataset.idx, 1); renderAdminSection(onApply); apply(); }));
  $$('.edit-track').forEach(b => b.addEventListener('click', () => openItemModal('track', +b.dataset.idx, onApply)));
  $$('.del-track').forEach(b => b.addEventListener('click', () => { draftConfig.music.tracks.splice(+b.dataset.idx, 1); renderAdminSection(onApply); apply(); }));
}

function bindProfileCrop(onApply, apply) {
  $('#prof-avatar-crop')?.addEventListener('click', async () => {
    const url = $('#prof-avatar')?.value?.trim();
    if (!url) return showToast('Paste a URL or upload a file first', 'error');
    try {
      const src = await loadImageForCrop(url);
      openImageCropModal(src, {
        onComplete: async (blob) => {
          try {
            const uploaded = await uploadFile('avatars', `avatar-${Date.now()}.jpg`, blob);
            draftConfig.profile.avatar = uploaded;
            $('#prof-avatar').value = uploaded;
            const prev = $('#avatar-preview');
            if (prev) { prev.src = uploaded; prev.classList.remove('hidden'); }
            apply();
            showToast('Profile photo cropped & saved!');
          } catch (e) { showToast(e.message, 'error'); }
        },
      });
    } catch (e) { showToast(e.message, 'error'); }
  });

  $('#prof-avatar-upload')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = await loadImageForCrop(file);
    openImageCropModal(src, {
      onComplete: async (blob) => {
        try {
          const uploaded = await uploadFile('avatars', `avatar-${Date.now()}.jpg`, blob);
          draftConfig.profile.avatar = uploaded;
          $('#prof-avatar').value = uploaded;
          const prev = $('#avatar-preview');
          if (prev) { prev.src = uploaded; prev.classList.remove('hidden'); }
          apply();
          showToast('Profile photo uploaded!');
        } catch (err) { showToast(err.message, 'error'); }
      },
    });
    e.target.value = '';
  });
}

function bindFileUploads(onApply, apply) {
  const uploads = [
    ['#prof-banner-upload', 'profile.banner', 'banners'],
    ['#bg-image-upload', 'background.image', 'backgrounds'],
    ['#favicon-upload', 'site.favicon', 'assets'],
  ];
  uploads.forEach(([sel, path, bucket]) => {
    $(sel)?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const url = await uploadFile(bucket, `${Date.now()}-${file.name}`, file);
        setNested(draftConfig, path, url);
        renderAdminSection(onApply);
        apply();
        showToast('Upload complete');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function bindDragReorder(onApply, apply) {
  setupDragList('#badge-list', 'badges', onApply, apply);
  setupDragList('#tab-list', 'tabs', onApply, apply);
  setupDragList('#promo-list', 'promotions', onApply, apply);
}

function setupDragList(sel, key, onApply, apply) {
  const list = $(sel);
  if (!list) return;
  let dragIdx = null;

  $$('.sortable-item', list).forEach(item => {
    item.addEventListener('dragstart', () => { dragIdx = +item.dataset[`${key.slice(0, -1)}Idx`] || +item.dataset.badgeIdx || +item.dataset.tabIdx || +item.dataset.promoIdx; item.classList.add('dragging'); });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => e.preventDefault());
    item.addEventListener('drop', e => {
      e.preventDefault();
      const target = item;
      const keys = { badges: 'badgeIdx', tabs: 'tabIdx', promotions: 'promoIdx' };
      const attr = keys[key];
      const dropIdx = +target.dataset[attr];
      if (dragIdx === null || dragIdx === dropIdx) return;
      const arr = draftConfig[key];
      const [moved] = arr.splice(dragIdx, 1);
      arr.splice(dropIdx, 0, moved);
      renderAdminSection(onApply);
      apply();
    });
  });
}

function openItemModal(type, idx, onApply) {
  closeItemModal();
  const isEdit = idx !== null;
  let item = {};
  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.id = 'item-modal';

  if (type === 'badge') {
    item = isEdit ? { ...draftConfig.badges[idx] } : {
      id: uid(), label: '', icon: '✨', badgeType: 'custom', useGradient: false,
      gradientFrom: '#c4a0ff', gradientTo: '#f0a8d0', tooltip: '',
      bgColor: 'rgba(196,160,255,0.18)', textColor: '#e8b4f8', borderColor: 'rgba(196,160,255,0.4)',
      style: 'glow', visible: true,
    };
    modal.innerHTML = `<div class="admin-modal-content"><h3>${isEdit ? 'Edit' : 'Add'} Badge</h3>
      <div class="form-group"><label>Label</label><input class="form-input" id="m-label" value="${esc(item.label)}" /></div>
      <div class="form-row">
        <div class="form-group"><label>Type</label><select class="form-select" id="m-badge-type">
          <option value="custom" ${item.badgeType==='custom'?'selected':''}>Custom</option>
          <option value="developer" ${item.badgeType==='developer'?'selected':''}>Developer &lt;/&gt;</option>
        </select></div>
        <div class="form-group"><label>Icon (custom only)</label><input class="form-input" id="m-icon" value="${esc(item.icon)}" /></div>
      </div>
      <label class="form-checkbox"><input type="checkbox" id="m-use-gradient" ${item.useGradient?'checked':''} /> Use gradient colors</label>
      <div class="form-row">
        <div class="form-group"><label>Gradient From</label><input type="color" class="form-color" id="m-grad-from" value="${hexFromVar(item.gradientFrom || '#c4a0ff')}" /></div>
        <div class="form-group"><label>Gradient To</label><input type="color" class="form-color" id="m-grad-to" value="${hexFromVar(item.gradientTo || '#f0a8d0')}" /></div>
      </div>
      <div class="form-group"><label>Hover Tooltip</label><textarea class="form-textarea" id="m-tooltip">${esc(item.tooltip)}</textarea></div>
      <div class="form-row"><div class="form-group"><label>BG (solid)</label><input class="form-input" id="m-bg" value="${esc(item.bgColor)}" /></div>
      <div class="form-group"><label>Text Color</label><input class="form-input" id="m-text" value="${esc(item.textColor)}" /></div></div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="admin-btn admin-btn-primary" id="m-save">Save</button><button class="admin-btn admin-btn-secondary" id="m-cancel">Cancel</button></div></div>`;
  } else if (type === 'social') {
    item = isEdit ? { ...draftConfig.socialLinks[idx] } : { id: uid(), url: '', platform: 'link', visible: true };
    modal.innerHTML = `<div class="admin-modal-content"><h3>${isEdit ? 'Edit' : 'Add'} Social Link</h3>
      <div class="form-group"><label>URL</label><input class="form-input" id="m-url" value="${esc(item.url)}" /></div>
      <button class="admin-btn admin-btn-primary" id="m-save" style="margin-top:16px">Save</button>
      <button class="admin-btn admin-btn-secondary" id="m-cancel">Cancel</button></div>`;
  } else if (type === 'tab') {
    item = isEdit ? JSON.parse(JSON.stringify(draftConfig.tabs[idx])) : { id: uid(), label: 'New Tab', type: 'about', visible: true, content: { heading: '', subtitle: '', body: '', links: [] } };
    const linksJson = JSON.stringify(item.content?.links || [], null, 2);
    modal.innerHTML = `<div class="admin-modal-content"><h3>${isEdit ? 'Edit' : 'Add'} Tab</h3>
      <div class="form-group"><label>Label</label><input class="form-input" id="m-label" value="${esc(item.label)}" /></div>
      <div class="form-group"><label>Type</label><select class="form-select" id="m-type"><option value="about">About</option><option value="links">Links</option><option value="promotions">Promotions</option><option value="comments">Guestbook</option><option value="gallery">Gallery</option><option value="custom">Custom HTML</option></select></div>
      <div class="form-group"><label>Heading</label><input class="form-input" id="m-heading" value="${esc(item.content?.heading || '')}" /></div>
      <div class="form-group"><label>Subtitle</label><input class="form-input" id="m-sub" value="${esc(item.content?.subtitle || '')}" /></div>
      <div class="form-group" id="m-body-group"><label>Body (HTML for about/custom)</label><textarea class="form-textarea" id="m-body" rows="5">${esc(item.content?.body || item.content?.html || '')}</textarea></div>
      <div class="form-group" id="m-links-group" style="display:none"><label>Links (JSON array)</label><textarea class="form-textarea" id="m-links" rows="8">${esc(linksJson)}</textarea><p class="admin-hint">Each link: {"id","title","description","url","icon"}</p></div>
      <label class="form-checkbox"><input type="checkbox" id="m-visible" ${item.visible?'checked':''} /> Visible</label>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="admin-btn admin-btn-primary" id="m-save">Save</button><button class="admin-btn admin-btn-secondary" id="m-cancel">Cancel</button></div></div>`;
    setTimeout(() => {
      const t = $('#m-type');
      if (t) {
        t.value = item.type;
        t.addEventListener('change', () => {
          const isLinks = t.value === 'links';
          $('#m-links-group', modal).style.display = isLinks ? 'block' : 'none';
          $('#m-body-group', modal).style.display = isLinks ? 'none' : 'block';
        });
        const isLinks = item.type === 'links';
        $('#m-links-group', modal).style.display = isLinks ? 'block' : 'none';
        if (isLinks) $('#m-body-group', modal).style.display = 'none';
      }
    }, 0);
  } else if (type === 'promo') {
    item = isEdit ? { ...draftConfig.promotions[idx] } : { id: uid(), title: '', description: '', image: '', url: '', buttonText: 'Visit', accentColor: '#c4a0ff', badge: '', badgeColor: '', style: 'default', visible: true };
    modal.innerHTML = `<div class="admin-modal-content"><h3>${isEdit ? 'Edit' : 'Add'} Promotion</h3>
      <div class="form-group"><label>Title</label><input class="form-input" id="m-title" value="${esc(item.title)}" /></div>
      <div class="form-group"><label>Description</label><textarea class="form-textarea" id="m-desc">${esc(item.description)}</textarea></div>
      <div class="form-group"><label>URL</label><input class="form-input" id="m-url" value="${esc(item.url)}" /></div>
      <div class="form-group"><label>Image URL</label><input class="form-input" id="m-image" value="${esc(item.image)}" /></div>
      <div class="form-row"><div class="form-group"><label>Button Text</label><input class="form-input" id="m-btn" value="${esc(item.buttonText)}" /></div>
      <div class="form-group"><label>Accent Color</label><input type="color" class="form-color" id="m-accent" value="${hexFromVar(item.accentColor)}" /></div></div>
      <div class="form-row"><div class="form-group"><label>Badge (NEW/LIVE)</label><input class="form-input" id="m-badge" value="${esc(item.badge)}" /></div>
      <div class="form-group"><label>Badge Color</label><input type="color" class="form-color" id="m-badge-color" value="${hexFromVar(item.badgeColor || '#e8b4f8')}" /></div></div>
      <div style="display:flex;gap:10px;margin-top:16px"><button class="admin-btn admin-btn-primary" id="m-save">Save</button><button class="admin-btn admin-btn-secondary" id="m-cancel">Cancel</button></div></div>`;
  } else if (type === 'track') {
    item = isEdit ? { ...draftConfig.music.tracks[idx] } : { id: uid(), title: '', artist: '', src: '', cover: '' };
    modal.innerHTML = `<div class="admin-modal-content"><h3>${isEdit ? 'Edit' : 'Add'} Track</h3>
      <div class="form-group"><label>Title</label><input class="form-input" id="m-title" value="${esc(item.title)}" /></div>
      <div class="form-group"><label>Artist</label><input class="form-input" id="m-artist" value="${esc(item.artist)}" /></div>
      <div class="form-group"><label>Audio URL / path</label><input class="form-input" id="m-src" value="${esc(item.src)}" /></div>
      <div class="form-group"><label>Cover URL</label><input class="form-input" id="m-cover" value="${esc(item.cover)}" /></div>
      <input type="file" accept="audio/*" id="m-audio-upload" class="form-input" />
      <div style="display:flex;gap:10px;margin-top:16px"><button class="admin-btn admin-btn-primary" id="m-save">Save</button><button class="admin-btn admin-btn-secondary" id="m-cancel">Cancel</button></div></div>`;
    $('#m-audio-upload', modal)?.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await uploadFile('audio', `${Date.now()}-${file.name}`, file);
      $('#m-src', modal).value = url;
    });
  }

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeItemModal(); });
  $('#m-cancel', modal)?.addEventListener('click', closeItemModal);

  $('#m-save', modal)?.addEventListener('click', () => {
    if (type === 'badge') {
      Object.assign(item, {
        label: $('#m-label', modal).value,
        icon: $('#m-icon', modal).value,
        badgeType: $('#m-badge-type', modal).value,
        useGradient: $('#m-use-gradient', modal)?.checked || false,
        gradientFrom: $('#m-grad-from', modal).value,
        gradientTo: $('#m-grad-to', modal).value,
        tooltip: $('#m-tooltip', modal).value,
        bgColor: $('#m-bg', modal).value,
        textColor: $('#m-text', modal).value,
      });
      if (isEdit) draftConfig.badges[idx] = item;
      else draftConfig.badges.push(item);
    } else if (type === 'social') {
      item.url = $('#m-url', modal).value;
      item.platform = detectPlatform(item.url);
      if (isEdit) draftConfig.socialLinks[idx] = item;
      else draftConfig.socialLinks.push(item);
    } else if (type === 'tab') {
      item.label = $('#m-label', modal).value;
      item.type = $('#m-type', modal).value;
      item.visible = $('#m-visible', modal).checked;
      item.content = item.content || {};
      item.content.heading = $('#m-heading', modal).value;
      item.content.subtitle = $('#m-sub', modal).value;
      const body = $('#m-body', modal).value;
      if (item.type === 'custom') item.content.html = body;
      else if (item.type === 'links') {
        try { item.content.links = JSON.parse($('#m-links', modal).value || '[]'); }
        catch { showToast('Invalid links JSON', 'error'); return; }
      } else item.content.body = body;
      if (isEdit) draftConfig.tabs[idx] = item;
      else draftConfig.tabs.push(item);
    } else if (type === 'promo') {
      Object.assign(item, {
        title: $('#m-title', modal).value,
        description: $('#m-desc', modal).value,
        url: $('#m-url', modal).value,
        image: $('#m-image', modal).value,
        buttonText: $('#m-btn', modal).value,
        accentColor: $('#m-accent', modal).value,
        badge: $('#m-badge', modal).value,
        badgeColor: $('#m-badge-color', modal).value,
      });
      if (isEdit) draftConfig.promotions[idx] = item;
      else draftConfig.promotions.push(item);
    } else if (type === 'track') {
      Object.assign(item, {
        title: $('#m-title', modal).value,
        artist: $('#m-artist', modal).value,
        src: $('#m-src', modal).value,
        cover: $('#m-cover', modal).value,
      });
      if (isEdit) draftConfig.music.tracks[idx] = item;
      else draftConfig.music.tracks.push(item);
    }
    closeItemModal();
    setConfig(draftConfig);
    onApply(draftConfig);
    renderAdminSection(onApply);
    showToast('Updated');
  });
}

function closeItemModal() {
  $('#item-modal')?.remove();
}

function setNested(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]]) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

function hexFromVar(v) {
  if (!v) return '#c4a0ff';
  if (v.startsWith('#')) return v.length === 7 ? v : '#c4a0ff';
  return '#c4a0ff';
}

function esc(s) {
  return (s ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
