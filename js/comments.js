import { getSupabase } from './state.js';
import { escapeHtml, $, showToast } from './utils.js';
import { isOwner, hasPermission } from './permissions.js';
import { getSiteUser as getAuthSiteUser } from './auth.js';

let realtimeChannel = null;
let commentsCache = [];

const NEON_SWATCHES = ['#e066ff', '#b57bff', '#7dffb2', '#ff6bcb', '#66d9ff', '#ffd166', '#ff8a9a', '#c4b5fd'];

export async function loadComments() {
  const supabase = getSupabase();
  if (!supabase) return commentsCache;

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('Comments load error:', error.message);
    return [];
  }
  commentsCache = data || [];
  return commentsCache;
}

export function subscribeComments(onUpdate) {
  const supabase = getSupabase();
  if (!supabase) return;

  if (realtimeChannel) supabase.removeChannel(realtimeChannel);

  realtimeChannel = supabase
    .channel('public-comments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async () => {
      commentsCache = await loadComments();
      onUpdate(commentsCache);
    })
    .subscribe();
}

export function destroyCommentsSubscription() {
  const supabase = getSupabase();
  if (supabase && realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

export async function postComment(authorName, content) {
  const supabase = getSupabase();
  if (!supabase) {
    const local = { id: crypto.randomUUID(), author_name: authorName, content, badges: [], created_at: new Date().toISOString() };
    commentsCache.push(local);
    return local;
  }

  const { data, error } = await supabase.from('comments').insert({
    author_name: authorName.trim().slice(0, 40),
    content: content.trim().slice(0, 500),
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteComment(id) {
  const supabase = getSupabase();
  if (!supabase) {
    commentsCache = commentsCache.filter(c => c.id !== id);
    return;
  }
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateComment(id, updates) {
  const supabase = getSupabase();
  if (!supabase) {
    const idx = commentsCache.findIndex(c => c.id === id);
    if (idx >= 0) commentsCache[idx] = { ...commentsCache[idx], ...updates };
    return;
  }
  const { error } = await supabase.from('comments').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

function canModerate(siteUser) {
  return siteUser && (isOwner(siteUser.role) || hasPermission(siteUser, 'moderate_comments'));
}

function canStyleComments(siteUser) {
  return canModerate(siteUser);
}

function getCustomRole(badges) {
  return (badges || []).find(b => b.id === 'custom-role') || null;
}

function renderCommentBadge(b) {
  const grad = b.gradientFrom && b.gradientTo
    ? `background:linear-gradient(135deg,${b.gradientFrom},${b.gradientTo});color:#fff;border:none;`
    : `background:${b.bgColor || 'rgba(196,160,255,0.2)'};color:${b.textColor || '#e8b4f8'};border-color:${b.textColor || '#e8b4f8'}44;`;
  return `<span class="comment-badge" style="${grad}">${escapeHtml(b.icon || '')} ${escapeHtml(b.label || '')}</span>`;
}

function authorNameStyle(c) {
  const color = c.author_color || c.highlight_color;
  if (!color && !c.is_highlighted) return '';
  const glow = color || '#e8b4f8';
  return `color:${glow};text-shadow:0 0 14px ${glow}88,0 0 28px ${glow}44;`;
}

export function renderCommentsUI(config, comments, container) {
  const settings = config.comments || {};
  const siteUser = getAuthSiteUser();
  const canMod = canModerate(siteUser);
  const canStyle = canStyleComments(siteUser);

  container.innerHTML = `
    <div class="comments-wrap">
      <form class="comment-form" id="comment-form">
        <div class="comment-form-row">
          <input class="form-input" id="comment-name" placeholder="${escapeHtml(settings.namePlaceholder || 'Your name')}" maxlength="40" required />
          <button type="submit" class="comment-submit">Post ✨</button>
        </div>
        <textarea class="form-textarea" id="comment-body" rows="3" maxlength="${settings.maxLength || 500}" placeholder="${escapeHtml(settings.placeholder || 'Write a comment...')}" required></textarea>
      </form>
      ${canStyle ? '<p class="comments-admin-hint">Admin: click a name to highlight & assign a role</p>' : ''}
      <div class="comments-live-indicator"><span class="live-dot"></span> Live comments</div>
      <div class="comments-list" id="comments-list">
        ${comments.length ? comments.map(c => renderCommentItem(c, canMod, canStyle)).join('') : '<p class="comments-empty">Be the first to leave a message 💜</p>'}
      </div>
    </div>
  `;

  $('#comment-form', container)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#comment-name', container)?.value;
    const body = $('#comment-body', container)?.value;
    if (!name?.trim() || !body?.trim()) return;
    try {
      await postComment(name, body);
      $('#comment-name', container).value = '';
      $('#comment-body', container).value = '';
      showToast('Comment posted!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  if (canMod || canStyle) bindModActions(container, canStyle);
}

function renderCommentItem(c, canMod, canStyle) {
  const nameStyle = authorNameStyle(c);
  const badges = (c.badges || []).filter(b => b.id !== 'custom-role').map(renderCommentBadge).join('');
  const customRole = getCustomRole(c.badges);
  const roleBadge = customRole ? renderCommentBadge(customRole) : '';
  const hl = c.is_highlighted || c.author_color ? 'comment-highlighted' : '';

  return `
    <div class="comment-item ${hl}" data-id="${c.id}">
      <div class="comment-header">
        <span class="comment-author${canStyle ? ' comment-author--admin' : ''}" data-style-id="${c.id}" style="${nameStyle}"${canStyle ? ' role="button" tabindex="0" title="Edit highlight & role"' : ''}>${escapeHtml(c.author_name)}</span>
        ${roleBadge}${badges}
        <span class="comment-time">${formatTime(c.created_at)}</span>
        ${canMod || canStyle ? `<div class="comment-actions">
          ${canStyle ? `<button type="button" class="comment-action-btn style-comment" data-id="${c.id}" title="Highlight & role">✨</button>` : ''}
          ${canMod ? `<button type="button" class="comment-action-btn delete-comment" data-id="${c.id}" title="Delete">✕</button>` : ''}
        </div>` : ''}
      </div>
      <p class="comment-body">${escapeHtml(c.content)}</p>
    </div>
  `;
}

function eventEl(e) {
  let el = e.target;
  while (el && el.nodeType !== Node.ELEMENT_NODE) el = el.parentElement;
  return el;
}

function bindModActions(container, canStyle) {
  container.addEventListener('click', async (e) => {
    const t = eventEl(e);
    if (!t) return;

    const del = t.closest('.delete-comment');
    if (del) {
      e.preventDefault();
      e.stopPropagation();
      if (!confirm('Delete this comment?')) return;
      try {
        await deleteComment(del.dataset.id);
        showToast('Comment deleted');
      } catch (err) { showToast(err.message, 'error'); }
      return;
    }

    const styleBtn = t.closest('.style-comment');
    const authorBtn = t.closest('.comment-author--admin');
    const styleId = styleBtn?.dataset.id || authorBtn?.dataset.styleId;
    if (styleId && canStyle) {
      e.preventDefault();
      e.stopPropagation();
      await openCommentStyleModal(styleId);
    }
  });

  container.addEventListener('mousedown', (e) => {
    const t = eventEl(e);
    if (t?.closest('.style-comment, .delete-comment, .comment-author--admin')) {
      e.preventDefault();
    }
  });

  container.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const authorBtn = e.target.closest?.('.comment-author--admin');
    if (authorBtn && canStyle) {
      e.preventDefault();
      void openCommentStyleModal(authorBtn.dataset.styleId);
    }
  });
}

async function openCommentStyleModal(commentId) {
  let comment = commentsCache.find(c => c.id === commentId);
  if (!comment) {
    await loadComments();
    comment = commentsCache.find(c => c.id === commentId);
  }
  if (!comment) {
    showToast('Could not open editor for this comment', 'error');
    return;
  }

  document.getElementById('comment-style-modal')?.remove();
  document.body.classList.add('comment-modal-open');

  const closeModal = (modal) => {
    modal.remove();
    document.body.classList.remove('comment-modal-open');
  };

  const customRole = getCustomRole(comment.badges);
  const currentColor = comment.author_color || comment.highlight_color || '#e066ff';
  const roleColor = customRole?.textColor || currentColor;

  const modal = document.createElement('div');
  modal.className = 'comment-style-modal';
  modal.id = 'comment-style-modal';
  modal.innerHTML = `
    <div class="comment-style-card">
      <h3>Edit — ${escapeHtml(comment.author_name)}</h3>
      <p class="comment-style-sub">Neon highlight & custom role badge</p>

      <label class="comment-style-check">
        <input type="checkbox" id="cs-highlight" ${comment.is_highlighted || comment.author_color ? 'checked' : ''} />
        Highlight name (neon glow)
      </label>

      <div class="form-group">
        <label>Name color</label>
        <div class="neon-swatches" id="cs-swatches">
          ${NEON_SWATCHES.map(c => `<button type="button" class="neon-swatch${c === currentColor ? ' active' : ''}" data-color="${c}" style="--sw:${c}" aria-label="${c}"></button>`).join('')}
        </div>
        <input type="color" class="form-color" id="cs-color" value="${currentColor}" />
      </div>

      <div class="form-group">
        <label>Custom role <span class="label-hint">(optional badge next to name)</span></label>
        <input class="form-input" id="cs-role" placeholder="e.g. VIP, Mod, Bestie" value="${escapeHtml(customRole?.label || '')}" maxlength="24" />
      </div>

      <div class="form-group">
        <label>Role badge color</label>
        <input type="color" class="form-color" id="cs-role-color" value="${roleColor}" />
      </div>

      <div class="comment-style-actions">
        <button type="button" class="comment-style-btn primary" id="cs-save">Save</button>
        <button type="button" class="comment-style-btn" id="cs-clear">Clear styling</button>
        <button type="button" class="comment-style-btn ghost" id="cs-cancel">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const colorInput = $('#cs-color', modal);
  $('#cs-swatches', modal)?.addEventListener('click', (e) => {
    const sw = e.target.closest('.neon-swatch');
    if (!sw) return;
    $$('.neon-swatch', modal).forEach(s => s.classList.remove('active'));
    sw.classList.add('active');
    if (colorInput) colorInput.value = sw.dataset.color;
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
  $('#cs-cancel', modal)?.addEventListener('click', () => closeModal(modal));

  $('#cs-clear', modal)?.addEventListener('click', async () => {
    try {
      await updateComment(commentId, {
        is_highlighted: false,
        author_color: null,
        highlight_color: null,
        badges: (comment.badges || []).filter(b => b.id !== 'custom-role'),
      });
      closeModal(modal);
      showToast('Styling cleared');
    } catch (err) { showToast(err.message, 'error'); }
  });

  $('#cs-save', modal)?.addEventListener('click', async () => {
    const highlighted = $('#cs-highlight', modal)?.checked || false;
    const nameColor = $('#cs-color', modal)?.value || '#e066ff';
    const roleLabel = $('#cs-role', modal)?.value?.trim();
    const roleCol = $('#cs-role-color', modal)?.value || nameColor;

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
      await updateComment(commentId, {
        is_highlighted: highlighted,
        author_color: highlighted ? nameColor : null,
        highlight_color: highlighted ? nameColor : null,
        badges,
      });
      closeModal(modal);
      showToast('Comment updated!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

function $$(sel, root) {
  return [...(root || document).querySelectorAll(sel)];
}

export function refreshCommentsList(config, container) {
  const list = $('#comments-list', container);
  if (!list) return;
  const siteUser = getAuthSiteUser();
  const canMod = canModerate(siteUser);
  const canStyle = canStyleComments(siteUser);
  list.innerHTML = commentsCache.length
    ? commentsCache.map(c => renderCommentItem(c, canMod, canStyle)).join('')
    : '<p class="comments-empty">Be the first to leave a message 💜</p>';
}
