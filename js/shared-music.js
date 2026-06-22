/** Shared music player — persists across hub + admin via sessionStorage */

import { $ } from './utils.js';

const STORAGE_KEY = 'suki:music-state';

let audio = null;
let trackIdx = 0;
let shuffleOrder = [];
let onNowPlaying = null;

export function getCurrentTrack(cfg) {
  if (!cfg?.music?.tracks?.length) return null;
  return cfg.music.tracks[trackIdx] ?? cfg.music.tracks[0];
}

export function saveMusicState() {
  if (!audio) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      trackIdx,
      currentTime: audio.currentTime,
      playing: !audio.paused,
      volume: audio.volume,
      muted: audio.muted,
      shuffleOrder,
    }));
  } catch (_) { /* private mode */ }
}

function loadSavedState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
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

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wireBar(cfg) {
  const bar = $('#music-bar');
  if (!bar) return;
  $('#m-play', bar)?.addEventListener('click', () => togglePlay(cfg));
  $('#m-prev', bar)?.addEventListener('click', () => changeTrack(cfg, -1));
  $('#m-next', bar)?.addEventListener('click', () => changeTrack(cfg, 1));
  $('#m-vol', bar)?.addEventListener('input', (e) => {
    const v = e.target.value / 100;
    if (audio) audio.volume = v;
    cfg.music.volume = v;
    saveMusicState();
  });
  $('#m-mute', bar)?.addEventListener('click', () => {
    if (!audio) return;
    audio.muted = !audio.muted;
    renderMusicBar(cfg);
    saveMusicState();
  });
}

export function renderMusicBar(cfg) {
  const bar = $('#music-bar');
  if (!bar || !cfg.music?.tracks?.length) {
    bar?.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  const t = cfg.music.tracks[trackIdx] || cfg.music.tracks[0];
  const vol = Math.round((audio?.volume ?? cfg.music.volume ?? 0.25) * 100);
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
  wireBar(cfg);
}

function loadTrack(cfg, idx, resumeTime = 0, autoPlay = false) {
  const tracks = cfg.music.tracks;
  if (!tracks.length) return;
  trackIdx = ((idx % tracks.length) + tracks.length) % tracks.length;
  const t = tracks[trackIdx];
  const wasPlaying = autoPlay || (audio && !audio.paused);
  if (audio) {
    audio.pause();
    audio.removeEventListener('timeupdate', saveMusicState);
  }
  audio = new Audio(t.src);
  audio.volume = cfg.music.volume ?? 0.25;
  if (resumeTime > 0) audio.currentTime = resumeTime;
  audio.addEventListener('ended', () => changeTrack(cfg, 1));
  audio.addEventListener('play', () => onNowPlaying?.());
  audio.addEventListener('timeupdate', saveMusicState);
  renderMusicBar(cfg);
  onNowPlaying?.();
  if (wasPlaying) audio.play().catch(() => {});
  saveMusicState();
}

export function changeTrack(cfg, dir) {
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
  loadTrack(cfg, next, 0, wasPlaying);
}

export function shuffleOnTabChange(cfg) {
  if (!cfg?.music?.shuffle || !cfg.music.tracks?.length) return;
  if (cfg.music.tracks.length <= 1) return;
  buildShuffle(cfg.music.tracks.length);
  const next = shuffleOrder[Math.floor(Math.random() * shuffleOrder.length)];
  const wasPlaying = !audio || !audio.paused;
  loadTrack(cfg, next, 0, wasPlaying || cfg.music.autoplay);
}

function togglePlay(cfg) {
  if (!audio) return;
  if (audio.paused) {
    audio.play().catch(() => {});
  } else {
    audio.pause();
  }
  renderMusicBar(cfg);
  saveMusicState();
}

export function initSharedMusic(cfg, nowPlayingFn) {
  onNowPlaying = nowPlayingFn || null;
  if (audio) {
    renderMusicBar(cfg);
    return;
  }
  if (!cfg.music?.tracks?.length) {
    renderMusicBar(cfg);
    return;
  }

  const saved = loadSavedState();
  if (saved?.shuffleOrder?.length === cfg.music.tracks.length) {
    shuffleOrder = saved.shuffleOrder;
  } else {
    buildShuffle(cfg.music.tracks.length);
  }

  const idx = saved?.trackIdx ?? 0;
  const resume = saved?.currentTime ?? 0;
  const shouldPlay = saved?.playing ?? cfg.music.autoplay;

  loadTrack(cfg, idx, resume, shouldPlay);

  if (saved?.volume != null && audio) audio.volume = saved.volume;
  if (saved?.muted && audio) audio.muted = true;

  window.addEventListener('beforeunload', saveMusicState);
  setInterval(saveMusicState, 4000);
}
