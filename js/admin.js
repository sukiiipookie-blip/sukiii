/**
 * Admin control panel — full-page neon dashboard
 */
import {
  getConfig, replaceConfig, saveConfigToSupabase, revertToLastSaved, uploadFile, subscribe,
} from './state.js';
import { THEMES, THEME_KEYS, AVATAR_FRAMES, AVATAR_FRAME_KEYS, DEFAULT_THEME_EFFECTS } from './defaults.js';
import { uid, $, $$, showToast, escapeHtml } from './utils.js';
import { signOut, getSiteUser } from './auth.js';
import { getVisibleSections, ADMIN_GROUPS } from './permissions.js';
import { renderUsersSection, bindUsersSection, renderAuditSection, bindAuditSection, renderSiteSection, bindSiteSection, renderBansSection, bindBansSection } from './admin-owner.js';
import { logAudit } from './audit.js';

let draft = null;
let section = 'theme';
let pageMode = false;
let adminNavReady = false;

export function initAdminPage() {
  pageMode = true;
  draft = JSON.parse(JSON.stringify(getConfig()));
  bindGlobalActions();
  renderAdminNav(true);
  renderSection(false);
}

export function openAdminUI() {
  if (pageMode || document.body.classList.contains('admin-page')) {
    initAdminPage();
    return;
  }
  if (!$('#admin-panel')) buildLegacyPanel();
  draft = JSON.parse(JSON.stringify(getConfig()));
  renderAdminNav(true);
  renderSection(false);
}

function bindGlobalActions() {
  if ($('#admin-save')?.dataset.bound) return;
  $('#admin-save')?.addEventListener('click', save);
  $('#admin-revert')?.addEventListener('click', () => {
    draft = JSON.parse(JSON.stringify(revertToLastSaved()));
    renderSection();
    showToast('Reverted to last saved');
  });
  $('#admin-signout')?.addEventListener('click', () => signOut());
  $('#admin-save')?.setAttribute('data-bound', '1');
}

function buildLegacyPanel() {
  const overlay = document.createElement('div');
  overlay.id = 'admin-overlay';
  document.body.appendChild(overlay);
  const panel = document.createElement('div');
  panel.id = 'admin-panel';
  panel.innerHTML = `<div class="admin-header"><div><h2>Admin</h2><p id="admin-role-label"></p></div></div>
    <nav id="admin-nav"></nav><div id="admin-content"></div>
    <div class="admin-footer"><button id="admin-save">Save</button></div>`;
  document.body.appendChild(panel);
  bindGlobalActions();
}

function renderAdminNav(forceRebuild = false) {
  const user = getSiteUser();
  const visible = getVisibleSections(user);
  const nav = $('#admin-nav');
  if (!nav) return;

  if (!adminNavReady) {
    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sec]');
      if (!btn) return;
      const next = btn.dataset.sec;
      if (next === section) return;
      section = next;
      nav.querySelectorAll('[data-sec]').forEach(b => {
        b.classList.toggle('active', b.dataset.sec === section);
      });
      renderSection(false);
    });
    adminNavReady = true;
  }

  if (!forceRebuild && nav.dataset.ready === '1') {
    nav.querySelectorAll('[data-sec]').forEach(b => {
      b.classList.toggle('active', b.dataset.sec === section);
    });
    return;
  }

  nav.innerHTML = ADMIN_GROUPS.map(g => {
    const items = g.sections.filter(s => visible.includes(s));
    if (!items.length) return '';
    return `<div class="cp-nav-group">
      <div class="cp-nav-label">${g.label}</div>
      ${items.map(s => `<button type="button" class="cp-nav-btn ${s === section ? 'active' : ''}" data-sec="${s}">${label(s)}</button>`).join('')}
    </div>`;
  }).join('');
  nav.dataset.ready = '1';
}

function updateAdminChrome() {
  const user = getSiteUser();
  const roleEl = $('#admin-role-label');
  if (roleEl) {
    roleEl.textContent = user?.role === 'owner'
      ? '👑 Owner — full customization access'
      : '🛡️ Admin — limited permissions';
  }
  const titleEl = $('#cp-section-title');
  if (titleEl) titleEl.textContent = label(section);
}

function renderSectionContent() {
  const content = $('#admin-content');
  if (!content) return;

  if (section === 'users') {
    content.innerHTML = `<div class="cp-section-card">${renderUsersSection()}</div>`;
    bindUsersSection(draft, () => {});
    return;
  }
  if (section === 'audit') {
    content.innerHTML = `<div class="cp-section-card">${renderAuditSection()}</div>`;
    bindAuditSection();
    return;
  }
  if (section === 'site') {
    content.innerHTML = `<div class="cp-section-card">${renderSiteSection(draft)}</div>`;
    bindSiteSection(draft);
    return;
  }
  if (section === 'bans') {
    content.innerHTML = `<div class="cp-section-card">${renderBansSection(draft)}</div>`;
    bindBansSection(draft);
    return;
  }
  if (section === 'comments') {
    content.innerHTML = `<div class="cp-section-card"><h3>💬 Comments</h3>
      <p class="admin-hint">Moderate comments directly on the Comments page. Admins with permission can delete there.</p></div>`;
    return;
  }

  content.innerHTML = `<div class="cp-section-card">${(renderers[section] || renderTheme)(draft)}</div>`;
  bindSection(section);
}

function renderSection(rebuildNav = false) {
  const visible = getVisibleSections(getSiteUser());
  if (!visible.includes(section)) {
    section = visible[0] || 'theme';
    rebuildNav = true;
  }

  updateAdminChrome();
  renderAdminNav(rebuildNav);

  const content = $('#admin-content');
  if (!content) return;

  content.classList.add('is-swapping');
  requestAnimationFrame(() => {
    renderSectionContent();
    requestAnimationFrame(() => content.classList.remove('is-swapping'));
  });
}

const renderers = {
  theme: renderTheme,
  media: renderMedia,
  profile: renderProfile,
  badges: renderBadges,
  about: renderHome,
  home: renderHome,
  promotions: renderPromos,
  music: renderMusic,
  special: renderSpecial,
};

function label(s) {
  return {
    theme: '🎨 Themes', media: '🖼️ Media', profile: '👤 Profile', badges: '🏅 Badges',
    home: '🏠 Home Box', about: '🏠 Home Box', promotions: '📢 Promotions', music: '🎵 Music', comments: '💬 Comments',
    special: '💜 Syaz', site: '🌐 Tab & Icon', bans: '🚫 IP Bans', users: '👑 Team', audit: '📋 Audit Log',
  }[s] || s;
}

function renderTheme(c) {
  const fx = c.theme?.effects || DEFAULT_THEME_EFFECTS;
  const presets = THEME_KEYS.map(k => {
    const t = THEMES[k];
    return `<div class="theme-preset ${c.theme.preset === k ? 'active' : ''}" data-theme="${k}">
      <div class="theme-preset-swatch" style="background:${t.swatch}"></div>
      <div class="theme-preset-name">${t.name}</div></div>`;
  }).join('');
  return `<h3>Neon Themes</h3>
    <p class="admin-hint">Girly neon vibes — pick a preset. Hit Save to apply site-wide.</p>
    <div class="theme-presets theme-presets-wide">${presets}</div>
    <div class="admin-divider"></div>
    <h4>Neon outline effects</h4>
    <p class="admin-hint">Animated glows on the profile box, nav bar, and content panels. Clean neon — no weird pulsing buttons.</p>
    <div class="fx-toggle-grid">
      <label class="fx-toggle"><input type="checkbox" id="fx-profile" ${fx.profileGlow !== false ? 'checked' : ''} /> Profile box glow</label>
      <label class="fx-toggle"><input type="checkbox" id="fx-nav" ${fx.navGlow !== false ? 'checked' : ''} /> Nav bar glow</label>
      <label class="fx-toggle"><input type="checkbox" id="fx-panel" ${fx.panelGlow !== false ? 'checked' : ''} /> Panel outlines glow</label>
    </div>
    <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" id="fx-revert-original" style="margin-top:12px">↩ Revert effects to original</button>`;
}

function renderMedia(c) {
  const avPrev = c.profile.avatar ? `<img src="${esc(c.profile.avatar)}" class="admin-preview-img" alt="" />` : '';
  return `<h3>Backgrounds & Uploads</h3>
    <p class="admin-hint">Profile: <strong>512×512</strong> · Background: <strong>1920×1080</strong></p>
    <div class="form-group"><label>Custom Background URL</label>
      <input class="form-input" id="bg-url" value="${esc(c.theme.customBg)}" placeholder="https://... or upload" />
      <input type="file" accept="image/*,.gif" id="bg-upload" class="form-file" />
    </div>
    <div class="form-group"><label>Profile Photo URL</label>
      <input class="form-input" id="avatar-url" value="${esc(c.profile.avatar)}" />
      <input type="file" accept="image/*" id="avatar-upload" class="form-file" />${avPrev}
    </div>
    <button class="admin-btn admin-btn-secondary admin-btn-sm" id="clear-bg">Clear custom background</button>`;
}

function renderProfile(c) {
  const p = c.profile;
  const lines = (p.infoLines || []).map((l, i) =>
    `<input class="form-input info-line" data-idx="${i}" value="${esc(l)}" />`).join('');
  const frames = AVATAR_FRAME_KEYS.map(k => {
    const f = AVATAR_FRAMES[k];
    return `<button type="button" class="frame-pick ${p.avatarFrame === k ? 'active' : ''}" data-frame="${k}">${f.name}</button>`;
  }).join('');
  return `<h3>Profile</h3>
    <div class="form-row">
      <div class="form-group"><label>Display Name</label><input class="form-input" id="p-name" value="${esc(p.displayName)}" /></div>
      <div class="form-group"><label>Username</label><input class="form-input" id="p-user" value="${esc(p.username)}" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Name Gradient From</label><input type="color" class="form-color" id="p-grad-from" value="${p.nameGradientFrom || '#ede9fe'}" /></div>
      <div class="form-group"><label>Name Gradient To</label><input type="color" class="form-color" id="p-grad-to" value="${p.nameGradientTo || '#e066ff'}" /></div>
    </div>
    <div class="form-group"><label>Avatar Frame</label><div class="frame-picks">${frames}</div>
      <p class="admin-hint">Discord-style frames — pure CSS, zero performance hit.</p></div>
    <div class="form-group"><label>Info Lines</label><div class="info-lines">${lines}</div>
      <button type="button" class="admin-btn admin-btn-sm admin-btn-neon" id="add-info-line">+ Add line</button></div>
    <div class="form-row">
      <div class="form-group"><label>Enter screen text</label><input class="form-input" id="enter-text" value="${esc(c.site.enterText)}" placeholder="Click to see whats waiting for you 💋" /></div>
    </div>
    <div class="form-group"><label>Footer Credit</label><input class="form-input" id="footer-credit" value="${esc(c.site.footerCredit)}" /></div>`;
}

function renderBadges(c) {
  const items = (c.badges || []).map((b, i) => {
    const preview = b.iconUrl ? `<img src="${esc(b.iconUrl)}" class="badge-list-icon" alt="" />` : (b.icon || '★');
    return `<div class="sortable-item" data-idx="${i}">
      <span class="badge-list-preview">${preview}</span>
      <span>${esc(b.label)}</span>
      <div class="sortable-item-actions">
        <button class="admin-btn admin-btn-sm admin-btn-neon edit-badge" data-i="${i}">Edit</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger del-badge" data-i="${i}">✕</button>
      </div>
    </div>`;
  }).join('');
  return `<h3>Badges / Roles</h3>
    <p class="admin-hint">Emoji, custom icon upload, or &lt;/&gt; for dev. Hover tooltips show on the profile.</p>
    <div class="sortable-list" id="badge-list">${items || '<p class="admin-hint">No badges yet</p>'}</div>
    <button class="admin-btn admin-btn-neon" id="add-badge">+ Add Badge</button>`;
}

function renderHome(c) {
  const h = c.home || {};
  const links = (h.quickLinks || []).map((l, i) => `
    <div class="sortable-item"><span>${esc(l.title)}</span>
      <div class="sortable-item-actions">
        <button class="edit-q-link admin-btn admin-btn-sm admin-btn-neon" data-i="${i}">Edit</button>
        <button class="del-q-link admin-btn admin-btn-sm admin-btn-danger" data-i="${i}">✕</button>
      </div></div>`).join('');
  return `<h3>Home Profile Box</h3>
    <p class="admin-hint">About blurb and quick links live inside the main profile card on Home — no separate About page.</p>
    <div class="form-group"><label>About blurb (HTML ok)</label>
      <textarea class="form-textarea" id="home-about" rows="6">${esc(h.aboutBody || '')}</textarea></div>
    <div class="admin-divider"></div>
    <div class="form-group"><label>Quick Links heading</label>
      <input class="form-input" id="home-ql-title" value="${esc(h.quickLinksTitle || 'Quick Links')}" /></div>
    <div class="sortable-list" id="ql-list">${links || '<p class="admin-hint">No quick links yet</p>'}</div>
    <button class="admin-btn admin-btn-neon admin-btn-sm" id="add-q-link">+ Add Quick Link</button>
    <div class="form-group" style="margin-top:16px"><label>Promotions teaser (underlined link on Home)</label>
      <input class="form-input" id="home-promo-cta" value="${esc(h.promoCtaText || '')}"
        placeholder="Want more info? Check out Promotions" /></div>`;
}

function renderPromos(c) {
  const items = (c.promotions || []).map((p, i) => `
    <div class="sortable-item"><span>${esc(p.title)}</span>
      <div class="sortable-item-actions">
        <button class="edit-promo admin-btn admin-btn-sm admin-btn-neon" data-i="${i}">Edit</button>
        <button class="del-promo admin-btn admin-btn-sm admin-btn-danger" data-i="${i}">✕</button>
      </div></div>`).join('');
  return `<h3>Promotions</h3><div class="sortable-list">${items}</div>
    <button class="admin-btn admin-btn-neon" id="add-promo">+ Add Promo</button>`;
}

function renderMusic(c) {
  const m = c.music;
  const tracks = (m.tracks || []).map((t, i) => `
    <div class="sortable-item"><span>${esc(t.title)} — ${esc(t.artist)}</span>
      <button class="del-track admin-btn admin-btn-sm admin-btn-danger" data-i="${i}">✕</button></div>`).join('');
  return `<h3>Music Player</h3>
    <div class="form-row-checks">
      <label class="form-checkbox"><input type="checkbox" id="m-autoplay" ${m.autoplay ? 'checked' : ''} /> Autoplay</label>
      <label class="form-checkbox"><input type="checkbox" id="m-shuffle" ${m.shuffle ? 'checked' : ''} /> Shuffle</label>
    </div>
    <div class="form-group"><label>Default Volume (0–1)</label><input type="number" class="form-input" id="m-vol" min="0" max="1" step="0.05" value="${m.volume ?? 0.25}" /></div>
    <div class="sortable-list">${tracks}</div>
    <div class="form-group"><label>Add track</label><input type="file" accept="audio/*" id="track-upload" class="form-file" /></div>`;
}

function renderSpecial(c) {
  const s = c.syazTribute || {};
  const chipPrev = s.chipAvatar ? `<img src="${esc(s.chipAvatar)}" alt="" class="admin-preview-img round" />` : '';
  const imgPrev = s.boxImage ? `<img src="${esc(s.boxImage)}" alt="" class="admin-preview-img" />` : '';
  return `<h3>💜 Syaz Tribute</h3>
    <p class="admin-hint">Syaz tab with animated ♥ S-grid. Set title to "Me & Syaz" and upload your photo below!</p>
    <label class="form-checkbox"><input type="checkbox" id="syaz-on" ${s.enabled ? 'checked' : ''} /> Enable tribute</label>
    <label class="form-checkbox"><input type="checkbox" id="syaz-nav-on" ${s.showNavTab !== false ? 'checked' : ''} /> Show nav tab</label>
    <div class="form-group"><label>Nav label</label><input class="form-input" id="syaz-nav-label" value="${esc(s.navLabel)}" /></div>
    <div class="admin-divider"></div>
    <h4>Chip below avatar</h4>
    <div class="form-row">
      <div class="form-group"><label>Chip name</label><input class="form-input" id="syaz-chip-name" value="${esc(s.chipName)}" /></div>
      <div class="form-group"><label>Chip avatar URL</label><input class="form-input" id="syaz-chip-av" value="${esc(s.chipAvatar)}" />${chipPrev}</div>
    </div>
    <input type="file" accept="image/*,.gif" id="syaz-chip-upload" class="form-file" />
    <div class="form-row">
      <div class="form-group"><label>Gradient from</label><input type="color" class="form-color" id="syaz-chip-from" value="${s.chipGradientFrom || '#fecdd3'}" /></div>
      <div class="form-group"><label>Gradient to</label><input type="color" class="form-color" id="syaz-chip-to" value="${s.chipGradientTo || '#ff6bcb'}" /></div>
    </div>
    <div class="admin-divider"></div>
    <h4>Roles pill badge (optional)</h4>
    <label class="form-checkbox"><input type="checkbox" id="syaz-badge-on" ${s.showBadge !== false ? 'checked' : ''} /> Show in roles pill</label>
    <div class="form-row">
      <div class="form-group"><label>Badge label</label><input class="form-input" id="syaz-badge-label" value="${esc(s.badgeLabel)}" /></div>
      <div class="form-group"><label>Tooltip</label><input class="form-input" id="syaz-badge-tip" value="${esc(s.badgeTooltip)}" /></div>
    </div>
    <div class="admin-divider"></div>
    <h4>Syaz tab page</h4>
    <div class="form-group"><label>Page title (e.g. Me & Syaz)</label><input class="form-input" id="syaz-box-title" value="${esc(s.boxTitle)}" /></div>
    <div class="form-group"><label>Subtitle line</label><input class="form-input" id="syaz-box-line" value="${esc(s.boxLine)}" /></div>
    <div class="form-group"><label>Photo / meme URL</label><input class="form-input" id="syaz-box-img" value="${esc(s.boxImage)}" />${imgPrev}</div>
    <input type="file" accept="image/*,.gif" id="syaz-img-upload" class="form-file" />`;
}

function bindSection(sec) {
  if (sec === 'theme') {
    if (!draft.theme.effects) draft.theme.effects = { ...DEFAULT_THEME_EFFECTS };
    $$('.theme-preset').forEach(el => el.addEventListener('click', () => {
      draft.theme.preset = el.dataset.theme;
      $$('.theme-preset').forEach(p => p.classList.toggle('active', p.dataset.theme === draft.theme.preset));
    }));
    $('#fx-profile')?.addEventListener('change', e => { draft.theme.effects.profileGlow = e.target.checked; });
    $('#fx-nav')?.addEventListener('change', e => { draft.theme.effects.navGlow = e.target.checked; });
    $('#fx-panel')?.addEventListener('change', e => { draft.theme.effects.panelGlow = e.target.checked; });
    $('#fx-revert-original')?.addEventListener('click', () => {
      draft.theme.effects = { ...DEFAULT_THEME_EFFECTS };
      renderSection();
      showToast('Effects reverted to original neon style');
    });
  }
  if (sec === 'media') bindMedia();
  if (sec === 'profile') bindProfile();
  if (sec === 'badges') bindBadges();
  if (sec === 'home' || sec === 'about') bindHome();
  if (sec === 'promotions') bindPromos();
  if (sec === 'music') bindMusic();
  if (sec === 'special') bindSpecial();
}

function bindMedia() {
  $('#bg-url')?.addEventListener('input', e => { draft.theme.customBg = e.target.value; });
  $('#avatar-url')?.addEventListener('input', e => { draft.profile.avatar = e.target.value; });
  $('#clear-bg')?.addEventListener('click', () => { draft.theme.customBg = ''; renderSection(); });
  $('#bg-upload')?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try { draft.theme.customBg = await uploadFile('backgrounds', `bg-${Date.now()}-${f.name}`, f); renderSection(); showToast('Uploaded!'); }
    catch (err) { showToast(err.message, 'error'); }
  });
  $('#avatar-upload')?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try { draft.profile.avatar = await uploadFile('avatars', `av-${Date.now()}.jpg`, f); renderSection(); showToast('Avatar uploaded!'); }
    catch (err) { showToast(err.message, 'error'); }
  });
}

function bindProfile() {
  $('#p-name')?.addEventListener('input', e => { draft.profile.displayName = e.target.value; });
  $('#p-user')?.addEventListener('input', e => { draft.profile.username = e.target.value; });
  $('#p-grad-from')?.addEventListener('input', e => { draft.profile.nameGradientFrom = e.target.value; });
  $('#p-grad-to')?.addEventListener('input', e => { draft.profile.nameGradientTo = e.target.value; });
  $('#enter-text')?.addEventListener('input', e => { draft.site.enterText = e.target.value; });
  $('#footer-credit')?.addEventListener('input', e => { draft.site.footerCredit = e.target.value; });
  $$('.info-line').forEach(inp => inp.addEventListener('input', e => {
    draft.profile.infoLines[+inp.dataset.idx] = e.target.value;
  }));
  $('#add-info-line')?.addEventListener('click', () => { draft.profile.infoLines.push(''); renderSection(); });
  $$('.frame-pick').forEach(btn => btn.addEventListener('click', () => {
    draft.profile.avatarFrame = btn.dataset.frame;
    renderSection();
  }));
}

function bindBadges() {
  $('#add-badge')?.addEventListener('click', () => openBadgeModal(null));
  $$('.edit-badge').forEach(b => b.addEventListener('click', () => openBadgeModal(+b.dataset.i)));
  $$('.del-badge').forEach(b => b.addEventListener('click', () => { draft.badges.splice(+b.dataset.i, 1); renderSection(); }));
}

function openBadgeModal(idx) {
  const b = idx != null ? draft.badges[idx] : {
    id: uid(), icon: '★', iconUrl: '', label: 'New', tooltip: '',
    colorFrom: '#b57bff', colorTo: '#e066ff', visible: true,
  };
  const prev = b.iconUrl ? `<img src="${esc(b.iconUrl)}" class="admin-preview-img small" alt="" />` : '';
  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.innerHTML = `<div class="admin-modal-content">
    <h3>${idx != null ? 'Edit' : 'Add'} Badge</h3>
    <div class="form-group"><label>Icon emoji (or &lt;/&gt; for dev)</label><input class="form-input" id="b-icon" value="${esc(b.icon)}" placeholder="🛡️ or ★" /></div>
    <div class="form-group"><label>Custom icon URL</label><input class="form-input" id="b-icon-url" value="${esc(b.iconUrl || '')}" placeholder="Overrides emoji if set" />${prev}</div>
    <input type="file" accept="image/*,.svg" id="b-icon-upload" class="form-file" />
    <div class="form-group"><label>Label</label><input class="form-input" id="b-label" value="${esc(b.label)}" /></div>
    <div class="form-group"><label>Hover tooltip</label><input class="form-input" id="b-tip" value="${esc(b.tooltip)}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Color from</label><input type="color" class="form-color" id="b-from" value="${b.colorFrom}" /></div>
      <div class="form-group"><label>Color to</label><input type="color" class="form-color" id="b-to" value="${b.colorTo}" /></div>
    </div>
    <div class="modal-actions">
      <button class="admin-btn admin-btn-primary" id="b-save">Save Badge</button>
      <button class="admin-btn admin-btn-secondary" id="b-cancel">Cancel</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  $('#b-cancel', modal)?.addEventListener('click', () => modal.remove());
  $('#b-icon-upload', modal)?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      b.iconUrl = await uploadFile('assets', `badge-${Date.now()}-${f.name}`, f);
      $('#b-icon-url', modal).value = b.iconUrl;
      showToast('Icon uploaded!');
    } catch (err) { showToast(err.message, 'error'); }
  });
  $('#b-save', modal)?.addEventListener('click', () => {
    Object.assign(b, {
      icon: $('#b-icon', modal).value,
      iconUrl: $('#b-icon-url', modal).value,
      label: $('#b-label', modal).value,
      tooltip: $('#b-tip', modal).value,
      colorFrom: $('#b-from', modal).value,
      colorTo: $('#b-to', modal).value,
    });
    if (idx != null) draft.badges[idx] = b; else draft.badges.push(b);
    modal.remove(); renderSection();
  });
}

function bindHome() {
  if (!draft.home) draft.home = {};
  $('#home-about')?.addEventListener('input', e => { draft.home.aboutBody = e.target.value; });
  $('#home-ql-title')?.addEventListener('input', e => { draft.home.quickLinksTitle = e.target.value; });
  $('#home-promo-cta')?.addEventListener('input', e => { draft.home.promoCtaText = e.target.value; });
  $('#add-q-link')?.addEventListener('click', () => {
    if (!draft.home.quickLinks) draft.home.quickLinks = [];
    draft.home.quickLinks.push({ id: uid(), title: 'New Link', subtitle: '', url: 'https://', accent: '#b57bff', visible: true });
    renderSection();
  });
  $$('.edit-q-link').forEach(b => b.addEventListener('click', () => openQuickLinkModal(+b.dataset.i)));
  $$('.del-q-link').forEach(b => b.addEventListener('click', () => {
    draft.home.quickLinks.splice(+b.dataset.i, 1);
    renderSection();
  }));
}

function openQuickLinkModal(idx) {
  const l = draft.home.quickLinks[idx];
  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.innerHTML = `<div class="admin-modal-content"><h3>Edit Quick Link</h3>
    <div class="form-group"><label>Title</label><input class="form-input" id="ql-title" value="${esc(l.title)}" /></div>
    <div class="form-group"><label>Small text underneath</label><input class="form-input" id="ql-sub" value="${esc(l.subtitle || '')}" /></div>
    <div class="form-group"><label>URL</label><input class="form-input" id="ql-url" value="${esc(l.url)}" /></div>
    <div class="form-group"><label>Accent color</label><input type="color" class="form-color" id="ql-accent" value="${l.accent || '#b57bff'}" /></div>
    <label class="form-check"><input type="checkbox" id="ql-vis" ${l.visible !== false ? 'checked' : ''} /> Visible</label>
    <div class="modal-actions"><button class="admin-btn admin-btn-primary" id="ql-save">Save</button>
      <button class="admin-btn admin-btn-secondary" id="ql-cancel">Cancel</button></div></div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  $('#ql-cancel', modal)?.addEventListener('click', () => modal.remove());
  $('#ql-save', modal)?.addEventListener('click', () => {
    Object.assign(l, {
      title: $('#ql-title', modal).value,
      subtitle: $('#ql-sub', modal).value,
      url: $('#ql-url', modal).value,
      accent: $('#ql-accent', modal).value,
      visible: $('#ql-vis', modal).checked,
    });
    modal.remove();
    renderSection();
  });
}

function bindPromos() {
  $('#add-promo')?.addEventListener('click', () => {
    draft.promotions.push({ id: uid(), title: 'New', description: '', url: '#', buttonText: 'Visit', accent: '#b57bff', logo: '', visible: true });
    renderSection();
  });
  $$('.edit-promo').forEach(b => b.addEventListener('click', () => openPromoModal(+b.dataset.i)));
  $$('.del-promo').forEach(b => b.addEventListener('click', () => { draft.promotions.splice(+b.dataset.i, 1); renderSection(); }));
}

function openPromoModal(idx) {
  const p = draft.promotions[idx];
  const logoPrev = p.logo ? `<img src="${esc(p.logo)}" alt="" class="admin-preview-img small" />` : '';
  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.innerHTML = `<div class="admin-modal-content"><h3>Edit Promo</h3>
    <div class="form-group"><label>Title</label><input class="form-input" id="pr-title" value="${esc(p.title)}" /></div>
    <div class="form-group"><label>Description</label><textarea class="form-textarea" id="pr-desc">${esc(p.description)}</textarea></div>
    <div class="form-group"><label>URL</label><input class="form-input" id="pr-url" value="${esc(p.url)}" /></div>
    <div class="form-group"><label>Button text</label><input class="form-input" id="pr-btn" value="${esc(p.buttonText)}" /></div>
    <div class="form-group"><label>Accent color</label><input type="color" class="form-color" id="pr-accent" value="${p.accent}" /></div>
    <div class="form-group"><label>Logo URL</label><input class="form-input" id="pr-logo" value="${esc(p.logo || '')}" />${logoPrev}</div>
    <input type="file" accept="image/*,.svg" id="pr-logo-upload" class="form-file" />
    <div class="modal-actions"><button class="admin-btn admin-btn-primary" id="pr-save">Save</button></div></div>`;
  document.body.appendChild(modal);
  $('#pr-logo-upload', modal)?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try { p.logo = await uploadFile('assets', `promo-logo-${Date.now()}-${f.name}`, f); $('#pr-logo', modal).value = p.logo; showToast('Logo uploaded!'); }
    catch (err) { showToast(err.message, 'error'); }
  });
  $('#pr-save', modal)?.addEventListener('click', () => {
    Object.assign(p, { title: $('#pr-title', modal).value, description: $('#pr-desc', modal).value,
      url: $('#pr-url', modal).value, buttonText: $('#pr-btn', modal).value, accent: $('#pr-accent', modal).value,
      logo: $('#pr-logo', modal).value });
    modal.remove(); renderSection();
  });
}

function bindMusic() {
  $('#m-autoplay')?.addEventListener('change', e => { draft.music.autoplay = e.target.checked; });
  $('#m-shuffle')?.addEventListener('change', e => { draft.music.shuffle = e.target.checked; });
  $('#m-vol')?.addEventListener('input', e => { draft.music.volume = parseFloat(e.target.value); });
  $$('.del-track').forEach(b => b.addEventListener('click', () => { draft.music.tracks.splice(+b.dataset.i, 1); renderSection(); }));
  $('#track-upload')?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const url = await uploadFile('music', `track-${Date.now()}-${f.name}`, f);
      draft.music.tracks.push({ id: uid(), title: f.name.replace(/\.[^.]+$/, ''), artist: '', src: url });
      renderSection(); showToast('Track added!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function bindSpecial() {
  if (!draft.syazTribute) draft.syazTribute = {};
  const s = draft.syazTribute;
  $('#syaz-on')?.addEventListener('change', e => { s.enabled = e.target.checked; });
  $('#syaz-nav-on')?.addEventListener('change', e => { s.showNavTab = e.target.checked; });
  $('#syaz-nav-label')?.addEventListener('input', e => { s.navLabel = e.target.value; });
  $('#syaz-chip-name')?.addEventListener('input', e => { s.chipName = e.target.value; });
  $('#syaz-chip-av')?.addEventListener('input', e => { s.chipAvatar = e.target.value; });
  $('#syaz-chip-from')?.addEventListener('input', e => { s.chipGradientFrom = e.target.value; });
  $('#syaz-chip-to')?.addEventListener('input', e => { s.chipGradientTo = e.target.value; });
  $('#syaz-badge-on')?.addEventListener('change', e => { s.showBadge = e.target.checked; });
  $('#syaz-badge-label')?.addEventListener('input', e => { s.badgeLabel = e.target.value; });
  $('#syaz-badge-tip')?.addEventListener('input', e => { s.badgeTooltip = e.target.value; });
  $('#syaz-box-title')?.addEventListener('input', e => { s.boxTitle = e.target.value; });
  $('#syaz-box-line')?.addEventListener('input', e => { s.boxLine = e.target.value; });
  $('#syaz-box-img')?.addEventListener('input', e => { s.boxImage = e.target.value; });
  $('#syaz-chip-upload')?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try { s.chipAvatar = await uploadFile('assets', `syaz-chip-${Date.now()}-${f.name}`, f); renderSection(); showToast('Uploaded!'); }
    catch (err) { showToast(err.message, 'error'); }
  });
  $('#syaz-img-upload')?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    try { s.boxImage = await uploadFile('assets', `syaz-${Date.now()}-${f.name}`, f); renderSection(); showToast('Photo uploaded!'); }
    catch (err) { showToast(err.message, 'error'); }
  });
}

async function save() {
  try {
    const prevSection = section;
    replaceConfig(draft);
    await saveConfigToSupabase();
    if (getSiteUser()?.role === 'owner') {
      await logAudit('config_save', { section: prevSection, theme: draft.theme?.preset });
    }
    showToast('Saved! ✨');
  } catch (err) { showToast(err.message, 'error'); }
}

function esc(s) { return escapeHtml(s ?? ''); }

subscribe(c => {
  if (pageMode && draft) draft = JSON.parse(JSON.stringify(c));
});
