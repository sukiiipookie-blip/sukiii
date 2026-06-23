import { getSupabase } from './state.js';
import { escapeHtml, $, showToast } from './utils.js';

let realtimeChannel = null;
let commentsCache = [];

export async function loadComments(forceRefresh = false) {
  const supabase = getSupabase();
  if (!supabase) return commentsCache;

  if (forceRefresh) commentsCache = [];

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.warn('Comments load error:', error.message);
    throw new Error(error.message);
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

export function getCustomRole(badges) {
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

  container.innerHTML = `
    <div class="comments-wrap">
      <form class="comment-form" id="comment-form">
        <div class="comment-form-row">
          <input class="form-input" id="comment-name" placeholder="${escapeHtml(settings.namePlaceholder || 'Your name')}" maxlength="40" required />
          <button type="submit" class="comment-submit">Post ✨</button>
        </div>
        <textarea class="form-textarea" id="comment-body" rows="3" maxlength="${settings.maxLength || 500}" placeholder="${escapeHtml(settings.placeholder || 'Write a comment...')}" required></textarea>
      </form>
      <div class="comments-live-indicator"><span class="live-dot"></span> Live comments</div>
      <div class="comments-list" id="comments-list">
        ${comments.length ? comments.map(c => renderCommentItem(c)).join('') : '<p class="comments-empty">Be the first to leave a message 💜</p>'}
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
}

function renderCommentItem(c) {
  const nameStyle = authorNameStyle(c);
  const badges = (c.badges || []).filter(b => b.id !== 'custom-role').map(renderCommentBadge).join('');
  const customRole = getCustomRole(c.badges);
  const roleBadge = customRole ? renderCommentBadge(customRole) : '';
  const hl = c.is_highlighted || c.author_color ? 'comment-highlighted' : '';

  return `
    <div class="comment-item ${hl}" data-id="${c.id}">
      <div class="comment-header">
        <span class="comment-author" style="${nameStyle}">${escapeHtml(c.author_name)}</span>
        ${roleBadge}${badges}
        <span class="comment-time">${formatTime(c.created_at)}</span>
      </div>
      <p class="comment-body">${escapeHtml(c.content)}</p>
    </div>
  `;
}

function formatTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export function refreshCommentsList(config, container) {
  const list = $('#comments-list', container);
  if (!list) return;
  list.innerHTML = commentsCache.length
    ? commentsCache.map(c => renderCommentItem(c)).join('')
    : '<p class="comments-empty">Be the first to leave a message 💜</p>';
}
