import { uid, $, $$, showToast, escapeHtml } from './utils.js';
import { getSiteUser, showAuthGate } from './auth.js';
import {
  listSiteUsers, listInvites, createAdminUser, inviteAdmin,
  removeSiteUser, promoteToOwner, updateUserPermissions, cancelInvite,
} from './users.js';
import { PERMISSION_LABELS, DEFAULT_ADMIN_PERMISSIONS } from './permissions.js';
import { loadComments, deleteComment, updateComment, getCustomRole } from './comments.js';
import { loadAuditLog, logAudit } from './audit.js';
import { uploadFile } from './state.js';
import { listBannedIps, addBannedIp, removeBannedIp } from './bans.js';

export function renderSiteSection(c) {
  const site = c.site || {};
  const favicon = site.favicon || 'assets/site-icon.svg';
  return `
    <div class="owner-panel">
      <div class="owner-panel-header">
        <h3>🌐 Browser Tab</h3>
        <p class="admin-hint">Owner only — the little icon in the browser tab + page title.</p>
      </div>
      <div class="admin-divider"></div>
      <div class="form-group">
        <label>Tab title</label>
        <input class="form-input" id="site-title" value="${esc(site.title)}" placeholder="Suki | Creator Hub" />
      </div>
      <div class="form-group">
        <label>Tab icon URL</label>
        <input class="form-input" id="site-favicon" value="${esc(favicon)}" placeholder="assets/site-icon.svg" />
        <input type="file" accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp" id="site-favicon-upload" class="form-file" />
        <p class="admin-hint">100% yours — upload any square PNG (32×32 or 64×64) or SVG. Works in Chrome, Edge, Firefox, Safari &amp; mobile. PNG is used as fallback everywhere.</p>
        <div class="favicon-preview-row">
          <div class="favicon-preview-box" title="32×32 tab size">
            <img id="site-favicon-preview-32" src="${esc(favicon)}" alt="" width="32" height="32" />
            <span>32px</span>
          </div>
          <div class="favicon-preview-box" title="16×16 tab size">
            <img id="site-favicon-preview-16" src="${esc(favicon)}" alt="" width="16" height="16" />
            <span>16px</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindSiteSection(draft) {
  if (!draft.site) draft.site = {};

  const syncPreview = (url) => {
    ['site-favicon-preview-32', 'site-favicon-preview-16'].forEach(id => {
      const img = document.getElementById(id);
      if (img) img.src = url || 'assets/site-icon.svg';
    });
  };

  $('#site-title')?.addEventListener('input', e => { draft.site.title = e.target.value; });
  $('#site-favicon')?.addEventListener('input', e => {
    draft.site.favicon = e.target.value;
    syncPreview(e.target.value);
  });

  $('#site-favicon-upload')?.addEventListener('change', async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadFile('assets', `favicon-${Date.now()}-${f.name}`, f);
      draft.site.favicon = url;
      if (/\.(png|jpe?g|webp|ico)$/i.test(f.name)) {
        draft.site.faviconPng = url;
        draft.site.appleTouchIcon = url;
      }
      const input = $('#site-favicon');
      if (input) input.value = url;
      syncPreview(url);
      showToast('Tab icon uploaded — save to apply everywhere!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

export function renderUsersSection() {
  return `
    <div class="owner-panel">
      <div class="owner-panel-header">
        <h3>👑 Owner Dashboard</h3>
        <p class="admin-hint">Add admins automatically — no SQL needed. Promote to Owner when you trust them fully.</p>
      </div>
      <div class="admin-divider"></div>
      <h4 style="margin-bottom:12px">Add Admin (automatic)</h4>
      <p class="admin-hint" style="margin-bottom:12px">Creates their login + permissions instantly. You'll need to sign back in after.</p>
      <div class="form-group"><label>Email</label><input class="form-input" id="new-admin-email" type="email" /></div>
      <div class="form-group"><label>Display Name</label><input class="form-input" id="new-admin-name" /></div>
      <div class="form-group"><label>Password</label><input class="form-input" id="new-admin-pass" type="password" /></div>
      <div class="form-group"><label>Permissions</label><div class="perm-grid" id="new-admin-perms">${renderPermCheckboxes('new', DEFAULT_ADMIN_PERMISSIONS)}</div></div>
      <button class="admin-btn admin-btn-primary" id="btn-create-admin" style="width:100%;margin-bottom:20px">Create Admin Account</button>
      <h4 style="margin-bottom:12px">Or invite only (they register themselves)</h4>
      <div class="form-row">
        <div class="form-group"><label>Email</label><input class="form-input" id="invite-email" type="email" /></div>
        <div class="form-group"><label>Name</label><input class="form-input" id="invite-name" /></div>
      </div>
      <button class="admin-btn admin-btn-secondary" id="btn-invite-admin" style="width:100%;margin-bottom:24px">Send Invite</button>
      <div class="admin-divider"></div>
      <h4 style="margin-bottom:12px">Team</h4>
      <div id="users-list" class="sortable-list"><p class="admin-hint">Loading…</p></div>
      <div class="admin-divider"></div>
      <h4 style="margin-bottom:12px">Pending Invites</h4>
      <div id="invites-list" class="sortable-list"><p class="admin-hint">Loading…</p></div>
    </div>
  `;
}

export function renderCommentsAdminSection(c) {
  const cm = c.comments || {};
  const isOwner = getSiteUser()?.role === 'owner';
  return `
    <div class="owner-panel">
      <h3 style="margin-bottom:12px">💬 Comments</h3>
      <p class="admin-hint">Highlight names, assign roles, and delete comments here — no popups, all inline. Changes apply to the public Comments tab immediately.</p>
      <div class="admin-divider"></div>
      ${isOwner ? `
      <div class="form-group"><label>Placeholder text</label><input class="form-input" id="cm-placeholder" value="${esc(cm.placeholder)}" /></div>
      <div class="form-group"><label>Name placeholder</label><input class="form-input" id="cm-name-ph" value="${esc(cm.namePlaceholder)}" /></div>
      <div class="form-group"><label>Max characters</label><input type="number" class="form-input" id="cm-max" value="${cm.maxLength || 500}" min="50" max="1000" /></div>
      <div class="admin-divider"></div>
      ` : ''}
      <h4 style="margin-bottom:12px">Manage Comments</h4>
      <div id="mod-comments-list" class="mod-comments-list"><p class="admin-hint">Loading…</p></div>
    </div>
  `;
}

function formatPerms(user) {
  if (user.role === 'owner') return '<span class="perm-tag perm-all">Full access</span>';
  const perms = user.permissions || {};
  const active = Object.entries(PERMISSION_LABELS).filter(([k]) =>
    perms[k] === true || (perms[k] !== false && DEFAULT_ADMIN_PERMISSIONS[k])
  );
  if (!active.length) return '<span class="admin-hint">No permissions</span>';
  return active.map(([, lbl]) => `<span class="perm-tag">${lbl}</span>`).join('');
}

export function renderAuditSection() {
  return `<h3>📋 Audit Log</h3>
    <p class="admin-hint">Owner-only history of config saves and team changes.</p>
    <div class="admin-divider"></div>
    <div id="audit-log-list"><p class="admin-hint">Loading…</p></div>`;
}

export function bindAuditSection() {
  refreshAuditLog();
}

export async function refreshAuditLog() {
  const list = $('#audit-log-list');
  if (!list) return;
  try {
    const entries = await loadAuditLog(60);
    list.innerHTML = entries.length ? entries.map(e => `
      <div class="audit-row">
        <div class="audit-meta">
          <strong>${escapeHtml(e.action.replace(/_/g, ' '))}</strong>
          <span class="admin-hint">${new Date(e.created_at).toLocaleString()}</span>
        </div>
        <div class="audit-user">${escapeHtml(e.user_email || 'unknown')}</div>
        ${e.details && Object.keys(e.details).length ? `<div class="audit-details admin-hint">${escapeHtml(JSON.stringify(e.details))}</div>` : ''}
      </div>
    `).join('') : '<p class="admin-hint">No audit entries yet — saves will appear here.</p>';
  } catch (e) {
    list.innerHTML = `<p class="admin-hint">Audit log unavailable — run the audit_log migration in Supabase SQL editor.</p>`;
  }
}

function renderPermCheckboxes(prefix, perms) {
  return Object.entries(PERMISSION_LABELS).map(([key, label]) => `
    <label class="form-checkbox perm-chip">
      <input type="checkbox" class="perm-cb" data-perm="${key}" data-prefix="${prefix}"
        ${perms[key] !== false && (perms[key] || DEFAULT_ADMIN_PERMISSIONS[key]) ? 'checked' : ''} />
      ${label}
    </label>
  `).join('');
}

export function bindUsersSection(draftConfig, onApply) {
  refreshUsersList();

  $('#btn-create-admin')?.addEventListener('click', async () => {
    const email = $('#new-admin-email')?.value?.trim();
    const displayName = $('#new-admin-name')?.value?.trim();
    const password = $('#new-admin-pass')?.value;
    const permissions = collectPerms('new');
    if (!email || !password) return showToast('Email and password required', 'error');
    try {
      const result = await createAdminUser({ email, displayName, permissions });
      showToast(result.message, 'success');
      setTimeout(() => showAuthGate('login'), 1500);
    } catch (e) { showToast(e.message, 'error'); }
  });

  $('#btn-invite-admin')?.addEventListener('click', async () => {
    const email = $('#invite-email')?.value?.trim();
    const displayName = $('#invite-name')?.value?.trim();
    if (!email) return;
    try {
      await inviteAdmin({ email, displayName, permissions: DEFAULT_ADMIN_PERMISSIONS });
      showToast(`Invited ${email} — they can register at #suki-register`);
      refreshUsersList();
    } catch (e) { showToast(e.message, 'error'); }
  });
}

export function bindCommentsAdminSection(draftConfig, onApply) {
  const apply = () => { onApply(draftConfig); };

  $('#cm-placeholder')?.addEventListener('input', e => {
    if (!draftConfig.comments) draftConfig.comments = {};
    draftConfig.comments.placeholder = e.target.value;
    apply();
  });
  $('#cm-name-ph')?.addEventListener('input', e => {
    draftConfig.comments.namePlaceholder = e.target.value;
    apply();
  });
  $('#cm-max')?.addEventListener('change', e => {
    draftConfig.comments.maxLength = parseInt(e.target.value, 10);
    apply();
  });

  refreshModCommentsList();
}

export async function refreshUsersList() {
  const list = $('#users-list');
  const invList = $('#invites-list');
  if (!list) return;

  try {
    const users = await listSiteUsers();
    const me = getSiteUser();
    list.innerHTML = users.map(u => `
      <div class="sortable-item user-row">
        <div class="sortable-item-content">
          <strong>${escapeHtml(u.display_name || u.email)}</strong>
          <span class="user-role-badge role-${u.role}">${u.role}</span>
          <div class="admin-hint">${escapeHtml(u.email)}</div>
          <div class="perm-tags">${formatPerms(u)}</div>
        </div>
        <div class="sortable-item-actions">
          ${u.role !== 'owner' ? `
            <button class="admin-btn admin-btn-sm admin-btn-secondary promote-owner" data-id="${u.user_id}" title="Promote to Owner">👑</button>
            <button class="admin-btn admin-btn-sm admin-btn-secondary edit-perms" data-id="${u.user_id}">Perms</button>
            <button class="admin-btn admin-btn-sm admin-btn-danger remove-user" data-id="${u.user_id}">Remove</button>
          ` : '<span class="admin-hint">Owner</span>'}
        </div>
      </div>
    `).join('') || '<p class="admin-hint">No users yet</p>';

    $$('.promote-owner', list).forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Promote this admin to Owner? They will have full control.')) return;
      try {
        await promoteToOwner(btn.dataset.id);
        showToast('Promoted to Owner!');
        refreshUsersList();
      } catch (e) { showToast(e.message, 'error'); }
    }));

    $$('.remove-user', list).forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Remove this admin? They lose panel access.')) return;
      try {
        await removeSiteUser(btn.dataset.id);
        showToast('Admin removed');
        refreshUsersList();
      } catch (e) { showToast(e.message, 'error'); }
    }));

    $$('.edit-perms', list).forEach(btn => btn.addEventListener('click', () => {
      const u = users.find(x => x.user_id === btn.dataset.id);
      if (u) openPermsModal(u, refreshUsersList);
    }));

    const invites = await listInvites();
    if (invList) {
      invList.innerHTML = invites.map(inv => `
        <div class="sortable-item">
          <div class="sortable-item-content">${escapeHtml(inv.email)} <span class="admin-hint">pending</span></div>
          <button class="admin-btn admin-btn-sm admin-btn-danger cancel-invite" data-email="${escapeHtml(inv.email)}">✕</button>
        </div>
      `).join('') || '<p class="admin-hint">No pending invites</p>';

      $$('.cancel-invite', invList).forEach(btn => btn.addEventListener('click', async () => {
        await cancelInvite(btn.dataset.email);
        refreshUsersList();
      }));
    }
  } catch (e) {
    list.innerHTML = `<p class="admin-hint">${e.message}</p>`;
  }
}

const NEON_SWATCHES = ['#e066ff', '#b57bff', '#7dffb2', '#ff6bcb', '#66d9ff', '#ffd166', '#ff8a9a', '#c4b5fd'];

function renderModCommentCard(c) {
  const customRole = getCustomRole(c.badges);
  const color = c.author_color || c.highlight_color || '#e066ff';
  const roleColor = customRole?.textColor || color;
  const highlighted = c.is_highlighted || Boolean(c.author_color);
  const nameStyle = highlighted ? `color:${color};text-shadow:0 0 10px ${color}66` : '';

  return `
    <div class="mod-comment-card" data-id="${c.id}">
      <div class="mod-comment-top">
        <div class="mod-comment-preview">
          <strong class="mod-comment-name" style="${nameStyle}">${escapeHtml(c.author_name)}</strong>
          ${customRole ? `<span class="mod-role-preview" style="color:${roleColor};border-color:${roleColor}44">✦ ${escapeHtml(customRole.label)}</span>` : ''}
          <p class="admin-hint mod-comment-snippet">${escapeHtml(c.content)}</p>
          <span class="admin-hint mod-comment-time">${new Date(c.created_at).toLocaleString()}</span>
        </div>
        <div class="mod-comment-btns">
          <button type="button" class="admin-btn admin-btn-sm admin-btn-secondary mod-toggle-edit">Edit</button>
          <button type="button" class="admin-btn admin-btn-sm admin-btn-danger mod-del-comment">Delete</button>
        </div>
      </div>
      <div class="mod-comment-editor hidden">
        <label class="form-checkbox mod-check">
          <input type="checkbox" class="mc-highlight" ${highlighted ? 'checked' : ''} />
          Neon highlight name
        </label>
        <div class="form-group">
          <label>Name color</label>
          <div class="admin-neon-swatches">
            ${NEON_SWATCHES.map(s => `<button type="button" class="admin-neon-swatch${s === color ? ' active' : ''}" data-color="${s}" style="--sw:${s}"></button>`).join('')}
          </div>
          <input type="color" class="form-color mc-color" value="${color}" />
        </div>
        <div class="form-group">
          <label>Custom role badge</label>
          <input class="form-input mc-role" placeholder="e.g. VIP, Mod, Bestie" value="${esc(customRole?.label || '')}" maxlength="24" />
        </div>
        <div class="form-group">
          <label>Role color</label>
          <input type="color" class="form-color mc-role-color" value="${roleColor}" />
        </div>
        <div class="mod-comment-editor-actions">
          <button type="button" class="admin-btn admin-btn-primary mc-save">Apply</button>
          <button type="button" class="admin-btn admin-btn-secondary mc-clear">Clear styling</button>
        </div>
      </div>
    </div>
  `;
}

async function refreshModCommentsList() {
  const list = $('#mod-comments-list');
  if (!list) return;
  const comments = await loadComments();
  list.innerHTML = comments.slice().reverse().map(c => renderModCommentCard(c)).join('')
    || '<p class="admin-hint">No comments yet</p>';

  if (!list.dataset.bound) {
    list.dataset.bound = '1';
    list.addEventListener('click', handleModCommentListClick);
  }
}

async function handleModCommentListClick(e) {
  const list = $('#mod-comments-list');
  if (!list?.contains(e.target)) return;

  const card = e.target.closest('.mod-comment-card');
  if (!card) return;
  const id = card.dataset.id;

  if (e.target.closest('.mod-toggle-edit')) {
    const editor = card.querySelector('.mod-comment-editor');
    editor?.classList.toggle('hidden');
    const open = editor && !editor.classList.contains('hidden');
    const btn = card.querySelector('.mod-toggle-edit');
    if (btn) btn.textContent = open ? 'Close' : 'Edit';
    return;
  }

  if (e.target.closest('.mod-del-comment')) {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteComment(id);
      await refreshModCommentsList();
      showToast('Comment deleted');
    } catch (err) { showToast(err.message, 'error'); }
    return;
  }

  const swatch = e.target.closest('.admin-neon-swatch');
  if (swatch && card.contains(swatch)) {
    card.querySelectorAll('.admin-neon-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    const colorInput = card.querySelector('.mc-color');
    if (colorInput) colorInput.value = swatch.dataset.color;
    return;
  }

  if (e.target.closest('.mc-save')) {
    const highlighted = card.querySelector('.mc-highlight')?.checked || false;
    const nameColor = card.querySelector('.mc-color')?.value || '#e066ff';
    const roleLabel = card.querySelector('.mc-role')?.value?.trim();
    const roleCol = card.querySelector('.mc-role-color')?.value || nameColor;
    const comments = await loadComments();
    const comment = comments.find(c => c.id === id);
    if (!comment) return;

    const otherBadges = (comment.badges || []).filter(b => b.id !== 'custom-role');
    const badges = [...otherBadges];
    if (roleLabel) {
      badges.push({
        id: 'custom-role',
        label: roleLabel,
        textColor: roleCol,
        bgColor: `${roleCol}22`,
        icon: '✦',
      });
    }

    try {
      await updateComment(id, {
        is_highlighted: highlighted,
        author_color: highlighted ? nameColor : null,
        highlight_color: highlighted ? nameColor : null,
        badges,
      });
      showToast('Comment updated!');
      await refreshModCommentsList();
    } catch (err) { showToast(err.message, 'error'); }
    return;
  }

  if (e.target.closest('.mc-clear')) {
    const comments = await loadComments();
    const comment = comments.find(c => c.id === id);
    if (!comment) return;
    try {
      await updateComment(id, {
        is_highlighted: false,
        author_color: null,
        highlight_color: null,
        badges: (comment.badges || []).filter(b => b.id !== 'custom-role'),
      });
      showToast('Styling cleared');
      await refreshModCommentsList();
    } catch (err) { showToast(err.message, 'error'); }
  }
}

function openPermsModal(user, onDone) {
  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <h3>Permissions — ${escapeHtml(user.display_name || user.email)}</h3>
      <div class="perm-grid">${renderPermCheckboxes('edit', user.permissions || {})}</div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="admin-btn admin-btn-primary" id="save-perms">Save</button>
        <button class="admin-btn admin-btn-secondary" id="cancel-perms">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  $('#cancel-perms', modal)?.addEventListener('click', () => modal.remove());
  $('#save-perms', modal)?.addEventListener('click', async () => {
    try {
      await updateUserPermissions(user.user_id, collectPerms('edit'));
      modal.remove();
      showToast('Permissions updated');
      onDone();
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function collectPerms(prefix) {
  const perms = {};
  $$(`.perm-cb[data-prefix="${prefix}"]`).forEach(cb => {
    perms[cb.dataset.perm] = cb.checked;
  });
  return perms;
}

export function renderBansSection(c) {
  const bp = c.site?.banPage || {};
  const cat = bp.catImage || 'assets/banned-cat.svg';
  return `
    <div class="owner-panel">
      <div class="owner-panel-header">
        <h3>🚫 IP Bans</h3>
        <p class="admin-hint">Blocked visitors see a custom page at the <strong>edge</strong> (before your site loads). Takes up to ~60 seconds to apply after ban/unban. Requires Cloudflare env vars — see setup note below.</p>
      </div>
      <div class="admin-divider"></div>
      <h4>Ban an IP</h4>
      <p class="admin-hint">Find IPs in Cloudflare Analytics → Security, or from comment abuse. IPv4 example: <code>203.0.113.42</code></p>
      <div class="form-row">
        <div class="form-group"><label>IP address</label><input class="form-input" id="ban-ip" placeholder="203.0.113.42" autocomplete="off" /></div>
        <div class="form-group"><label>Reason (optional)</label><input class="form-input" id="ban-reason" placeholder="Spam / harassment" /></div>
      </div>
      <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" id="ban-add-btn" style="margin-bottom:20px">Ban this IP</button>
      <h4>Active bans</h4>
      <div id="ban-list" class="sortable-list"><p class="admin-hint">Loading…</p></div>
      <div class="admin-divider"></div>
      <h4>Block page message</h4>
      <p class="admin-hint">Shown to banned visitors. Save Changes at the bottom to apply text + cat image.</p>
      <div class="form-group"><label>Title</label><input class="form-input" id="ban-page-title" value="${esc(bp.title)}" /></div>
      <div class="form-group"><label>Subtitle</label><input class="form-input" id="ban-page-sub" value="${esc(bp.subtitle)}" /></div>
      <div class="form-group"><label>Cat image URL</label>
        <input class="form-input" id="ban-page-cat" value="${esc(cat)}" placeholder="assets/banned-cat.svg" />
        <input type="file" accept="image/*,.svg" id="ban-cat-upload" class="form-file" />
        <img src="${esc(cat)}" alt="" class="admin-preview-img" style="margin-top:10px;max-width:180px" id="ban-cat-preview" />
      </div>
      <div class="admin-divider"></div>
      <p class="admin-hint"><strong>Cloudflare setup (one time):</strong> Pages → your project → Settings → Environment variables → add <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> (Supabase → Project Settings → API → service_role). Redeploy after adding.</p>
    </div>
  `;
}

export async function bindBansSection(draft) {
  if (!draft.site) draft.site = {};
  if (!draft.site.banPage) draft.site.banPage = {};

  const listEl = $('#ban-list');
  const refreshList = async () => {
    if (!listEl) return;
    try {
      const rows = await listBannedIps();
      listEl.innerHTML = rows.length ? rows.map(b => `
        <div class="sortable-item" data-ban-id="${b.id}">
          <div>
            <strong>${escapeHtml(b.ip_address)}</strong>
            ${b.reason ? `<span class="admin-hint" style="display:block;margin-top:2px">${escapeHtml(b.reason)}</span>` : ''}
            <span class="admin-hint" style="display:block;font-size:0.72rem;margin-top:2px">${new Date(b.created_at).toLocaleString()}${b.banned_by_email ? ` · ${escapeHtml(b.banned_by_email)}` : ''}</span>
          </div>
          <button type="button" class="admin-btn admin-btn-sm admin-btn-secondary unban-btn" data-id="${b.id}">Unban</button>
        </div>
      `).join('') : '<p class="admin-hint">No banned IPs yet.</p>';

      $$('.unban-btn', listEl).forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Remove this IP ban?')) return;
          try {
            await removeBannedIp(btn.dataset.id);
            await logAudit('ip_unban', { id: btn.dataset.id });
            showToast('IP unbanned');
            refreshList();
          } catch (e) { showToast(e.message, 'error'); }
        });
      });
    } catch (e) {
      listEl.innerHTML = `<p class="admin-hint" style="color:#ff8fa3">Could not load bans: ${escapeHtml(e.message)}. Run section 7 in supabase/schema.sql if the table is missing.</p>`;
    }
  };

  await refreshList();

  $('#ban-add-btn')?.addEventListener('click', async () => {
    const ip = $('#ban-ip')?.value?.trim();
    const reason = $('#ban-reason')?.value?.trim() || '';
    if (!ip) { showToast('Enter an IP address', 'error'); return; }
    try {
      await addBannedIp(ip, reason);
      await logAudit('ip_ban', { ip, reason });
      $('#ban-ip').value = '';
      $('#ban-reason').value = '';
      showToast('IP banned');
      refreshList();
    } catch (e) { showToast(e.message, 'error'); }
  });

  $('#ban-page-title')?.addEventListener('input', e => { draft.site.banPage.title = e.target.value; });
  $('#ban-page-sub')?.addEventListener('input', e => { draft.site.banPage.subtitle = e.target.value; });
  $('#ban-page-cat')?.addEventListener('input', e => {
    draft.site.banPage.catImage = e.target.value;
    const prev = $('#ban-cat-preview');
    if (prev) prev.src = e.target.value;
  });

  $('#ban-cat-upload')?.addEventListener('change', async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadFile('assets', `ban-cat-${Date.now()}-${f.name}`, f);
      draft.site.banPage.catImage = url;
      $('#ban-page-cat').value = url;
      const prev = $('#ban-cat-preview');
      if (prev) prev.src = url;
      showToast('Cat image uploaded — hit Save Changes');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function esc(s) {
  return (s ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
