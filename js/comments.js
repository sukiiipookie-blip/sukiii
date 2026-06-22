import { getSupabase } from './state.js';
import { escapeHtml, $, showToast } from './utils.js';
import { isOwner, hasPermission } from './permissions.js';
import { getSiteUser as getAuthSiteUser } from './auth.js';

let realtimeChannel = null;
let commentsCache = [];

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
  const { error } = await supabase.from('comments').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

function renderCommentBadge(b) {
  const grad = b.gradientFrom && b.gradientTo
    ? `background:linear-gradient(135deg,${b.gradientFrom},${b.gradientTo});color:#fff;border:none;`
    : `background:${b.bgColor || 'rgba(196,160,255,0.2)'};color:${b.textColor || '#e8b4f8'};`;
  return `<span class="comment-badge" style="${grad}">${escapeHtml(b.icon || '')} ${escapeHtml(b.label || '')}</span>`;
}

export function renderCommentsUI(config, comments, container) {
  const settings = config.comments || {};
  const siteUser = getAuthSiteUser();
  const canMod = siteUser && (isOwner(siteUser.role) || hasPermission(siteUser, 'moderate_comments'));
  const canStyle = siteUser && isOwner(siteUser.role);

  container.innerHTML = `
    <div class="comments-wrap glass-card">
      <form class="comment-form" id="comment-form">
        <div class="comment-form-row">
          <input class="form-input" id="comment-name" placeholder="${escapeHtml(settings.namePlaceholder || 'Your name')}" maxlength="40" required />
          <button type="submit" class="comment-submit">Send ✨</button>
        </div>
        <textarea class="form-textarea" id="comment-body" rows="3" maxlength="${settings.maxLength || 500}" placeholder="${escapeHtml(settings.placeholder || 'Say something nice...')}" required></textarea>
      </form>
      <div class="comments-live-indicator"><span class="live-dot"></span> Live</div>
      <div class="comments-list" id="comments-list">
        ${comments.length ? comments.map(c => renderCommentItem(c, canMod, canStyle, settings)).join('') : '<p class="comments-empty">Be the first to leave a message 💜</p>'}
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

  if (canMod || canStyle) bindModActions(container, settings, canStyle);
}

function renderCommentItem(c, canMod, canStyle, settings) {
  const nameStyle = c.author_color ? `color:${c.author_color}` : (c.is_highlighted ? `color:${c.highlight_color || '#e8b4f8'};text-shadow:0 0 12px ${c.highlight_color || '#e8b4f8'}55` : '');
  const badges = (c.badges || []).map(renderCommentBadge).join('');
  const hl = c.is_highlighted ? 'comment-highlighted' : '';

  return `
    <div class="comment-item ${hl}" data-id="${c.id}">
      <div class="comment-header">
        <span class="comment-author" style="${nameStyle}">${escapeHtml(c.author_name)}</span>
        ${badges}
        <span class="comment-time">${formatTime(c.created_at)}</span>
        ${canMod || canStyle ? `<div class="comment-actions">
          ${canStyle ? `<button class="comment-action-btn style-comment" data-id="${c.id}" title="Badges & highlight">✨</button>` : ''}
          ${canMod ? `<button class="comment-action-btn delete-comment" data-id="${c.id}" title="Delete">✕</button>` : ''}
        </div>` : ''}
      </div>
      <p class="comment-body">${escapeHtml(c.content)}</p>
    </div>
  `;
}

function bindModActions(container, settings, canStyle) {
  container.addEventListener('click', async (e) => {
    const del = e.target.closest('.delete-comment');
    if (del) {
      if (!confirm('Delete this comment?')) return;
      try {
        await deleteComment(del.dataset.id);
        showToast('Comment deleted');
      } catch (err) { showToast(err.message, 'error'); }
      return;
    }

    const style = e.target.closest('.style-comment');
    if (style && canStyle) openCommentStyleModal(style.dataset.id, settings, container);
  });
}

function openCommentStyleModal(commentId, settings, container) {
  const comment = commentsCache.find(c => c.id === commentId);
  if (!comment) return;

  const templates = settings.badgeTemplates || [];
  const modal = document.createElement('div');
  modal.className = 'admin-modal';
  modal.id = 'comment-style-modal';
  modal.innerHTML = `
    <div class="admin-modal-content">
      <h3>Style Comment — ${escapeHtml(comment.author_name)}</h3>
      <label class="form-checkbox"><input type="checkbox" id="cs-highlight" ${comment.is_highlighted ? 'checked' : ''} /> Highlight name</label>
      <div class="form-group"><label>Name color</label><input type="color" class="form-color" id="cs-color" value="${comment.author_color || '#e8b4f8'}" /></div>
      <div class="form-group"><label>Assign badges</label>
        <div class="badge-template-grid">${templates.map(t => `
          <label class="form-checkbox"><input type="checkbox" class="cs-badge" value="${t.id}" data-badge='${JSON.stringify(t).replace(/'/g, "&#39;")}' 
            ${(comment.badges || []).some(b => b.id === t.id) ? 'checked' : ''} /> ${t.icon} ${escapeHtml(t.label)}</label>
        `).join('') || '<p class="admin-hint">Add badge templates in Admin → Comments</p>'}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="admin-btn admin-btn-primary" id="cs-save">Save</button>
        <button class="admin-btn admin-btn-secondary" id="cs-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  $('#cs-cancel', modal)?.addEventListener('click', () => modal.remove());
  $('#cs-save', modal)?.addEventListener('click', async () => {
    const badges = $$('.cs-badge', modal).filter(cb => cb.checked).map(cb => JSON.parse(cb.dataset.badge));
    try {
      await updateComment(commentId, {
        is_highlighted: $('#cs-highlight', modal)?.checked || false,
        author_color: $('#cs-color', modal)?.value,
        highlight_color: $('#cs-color', modal)?.value,
        badges,
      });
      modal.remove();
      showToast('Comment styled!');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
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
  const canMod = siteUser && (isOwner(siteUser.role) || hasPermission(siteUser, 'moderate_comments'));
  const canStyle = siteUser && isOwner(siteUser.role);
  const settings = config.comments || {};
  list.innerHTML = commentsCache.length
    ? commentsCache.map(c => renderCommentItem(c, canMod, canStyle, settings)).join('')
    : '<p class="comments-empty">Be the first to leave a message 💜</p>';
}
