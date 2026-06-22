import { uid, $, $$, showToast, escapeHtml } from './utils.js';
import { getSiteUser, showAuthGate } from './auth.js';
import {
  listSiteUsers, listInvites, createAdminUser, inviteAdmin,
  removeSiteUser, promoteToOwner, updateUserPermissions, cancelInvite,
} from './users.js';
import { PERMISSION_LABELS, DEFAULT_ADMIN_PERMISSIONS } from './permissions.js';
import { loadComments, deleteComment } from './comments.js';
import { loadAuditLog } from './audit.js';

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
      <p class="admin-hint">Public guestbook with live updates.${isOwner ? ' As Owner, use ✨ on each comment to highlight names and assign badges.' : ' You can delete inappropriate comments below.'}</p>
      <div class="admin-divider"></div>
      ${isOwner ? `
      <div class="form-group"><label>Placeholder text</label><input class="form-input" id="cm-placeholder" value="${esc(cm.placeholder)}" /></div>
      <div class="form-group"><label>Name placeholder</label><input class="form-input" id="cm-name-ph" value="${esc(cm.namePlaceholder)}" /></div>
      <div class="form-group"><label>Max characters</label><input type="number" class="form-input" id="cm-max" value="${cm.maxLength || 500}" min="50" max="1000" /></div>
      <div class="admin-divider"></div>
      <h4 style="margin-bottom:12px">Comment Badge Templates</h4>
      <div id="cm-badge-list" class="sortable-list">${renderCommentBadgeTemplates(cm.badgeTemplates)}</div>
      <button class="admin-btn admin-btn-secondary admin-btn-sm" id="add-cm-badge" style="margin-top:10px">+ Add Badge Template</button>
      <div class="admin-divider"></div>
      ` : ''}
      <h4 style="margin-bottom:12px">Moderate Comments</h4>
      <div id="mod-comments-list"><p class="admin-hint">Loading…</p></div>
    </div>
  `;
}

function renderCommentBadgeTemplates(templates) {
  return (templates || []).map((t, i) => `
    <div class="sortable-item" data-cm-badge="${i}">
      <span>${t.icon} ${escapeHtml(t.label)}</span>
      <button class="admin-btn admin-btn-sm admin-btn-danger del-cm-badge" data-idx="${i}">✕</button>
    </div>
  `).join('') || '<p class="admin-hint">No badge templates yet</p>';
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

  $('#add-cm-badge')?.addEventListener('click', () => {
    if (!draftConfig.comments) draftConfig.comments = {};
    if (!draftConfig.comments.badgeTemplates) draftConfig.comments.badgeTemplates = [];
    draftConfig.comments.badgeTemplates.push({
      id: uid(), label: 'New Badge', icon: '✨', gradientFrom: '#c4a0ff', gradientTo: '#f0a8d0',
    });
    onApply(draftConfig);
    window.__rerenderAdmin?.();
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

async function refreshModCommentsList() {
  const list = $('#mod-comments-list');
  if (!list) return;
  const comments = await loadComments();
  list.innerHTML = comments.slice().reverse().slice(0, 30).map(c => `
    <div class="sortable-item">
      <div class="sortable-item-content">
        <strong>${escapeHtml(c.author_name)}</strong>
        <div class="admin-hint">${escapeHtml(c.content.slice(0, 80))}${c.content.length > 80 ? '…' : ''}</div>
      </div>
      <button class="admin-btn admin-btn-sm admin-btn-danger mod-del-comment" data-id="${c.id}">Delete</button>
    </div>
  `).join('') || '<p class="admin-hint">No comments yet</p>';

  $$('.mod-del-comment', list).forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete?')) return;
    await deleteComment(btn.dataset.id);
    refreshModCommentsList();
    showToast('Deleted');
  }));
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

function esc(s) {
  return (s ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
