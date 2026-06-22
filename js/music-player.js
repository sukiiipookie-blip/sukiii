import { $ } from './utils.js';

let audio = null;
let analyser = null;
let audioCtx = null;
let currentTrack = 0;
let shuffleOrder = [];
let vizFrame = null;

export function initMusicPlayer(config) {
  destroyMusicPlayer();

  if (!config.site?.showMusicPlayer || !config.music?.tracks?.length) return;

  const m = config.music;
  let player = $('#music-player');
  if (!player) {
    player = document.createElement('div');
    player.id = 'music-player';
    document.body.appendChild(player);
  }

  player.className = `pos-${m.position || 'bottom-right'} style-${m.style || 'expanded'}`;

  const track = m.tracks[currentTrack] || m.tracks[0];
  const coverSrc = track.cover || defaultCover();

  player.innerHTML = `
    <div class="music-track-info">
      <img class="music-cover" src="${coverSrc}" alt="" />
      <div>
        <div class="music-title">${track.title}</div>
        <div class="music-artist">${track.artist || ''}</div>
      </div>
    </div>
    <div class="music-controls">
      ${m.tracks.length > 1 ? '<button class="music-btn" id="music-prev" title="Previous">⏮</button>' : ''}
      <button class="music-btn play-btn" id="music-play" title="Play">▶</button>
      ${m.tracks.length > 1 ? '<button class="music-btn" id="music-next" title="Next">⏭</button>' : ''}
    </div>
    <canvas class="music-visualizer" id="music-viz"></canvas>
    <div class="music-progress" id="music-progress"><div class="music-progress-fill" id="music-progress-fill"></div></div>
  `;

  audio = new Audio(track.src);
  audio.loop = m.loop && m.tracks.length === 1;
  audio.volume = 0.3;

  $('#music-play')?.addEventListener('click', togglePlay);
  $('#music-prev')?.addEventListener('click', () => changeTrack(-1, config));
  $('#music-next')?.addEventListener('click', () => changeTrack(1, config));

  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('ended', () => {
    if (m.tracks.length > 1) changeTrack(1, config);
  });

  $('#music-progress')?.addEventListener('click', (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (audio) audio.currentTime = pct * audio.duration;
  });

  if (m.autoplay) {
    setTimeout(() => togglePlay(), 500);
  }
}

function togglePlay() {
  if (!audio) return;
  const btn = $('#music-play');
  if (audio.paused) {
    if (!audioCtx) initAudioContext();
    audioCtx?.resume();
    audio.play().catch(() => {});
    btn.textContent = '⏸';
    startVisualizer();
  } else {
    audio.pause();
    btn.textContent = '▶';
    stopVisualizer();
  }
}

function initAudioContext() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  } catch (e) {
    console.warn('Audio context error', e);
  }
}

function changeTrack(dir, config) {
  const tracks = config.music.tracks;
  if (tracks.length <= 1) return;

  if (config.music.shuffle) {
    if (!shuffleOrder.length) shuffleOrder = [...Array(tracks.length).keys()].sort(() => Math.random() - 0.5);
    const idx = shuffleOrder.indexOf(currentTrack);
    currentTrack = shuffleOrder[(idx + dir + shuffleOrder.length) % shuffleOrder.length];
  } else {
    currentTrack = (currentTrack + dir + tracks.length) % tracks.length;
  }

  const wasPlaying = audio && !audio.paused;
  initMusicPlayer(config);
  if (wasPlaying) togglePlay();
}

function updateProgress() {
  if (!audio || !audio.duration) return;
  const fill = $('#music-progress-fill');
  if (fill) fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
}

function startVisualizer() {
  const canvas = $('#music-viz');
  if (!canvas || !analyser) return;
  const vctx = canvas.getContext('2d');
  const data = new Uint8Array(analyser.frequencyBinCount);

  function draw() {
    vizFrame = requestAnimationFrame(draw);
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    vctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    analyser.getByteFrequencyData(data);
    vctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const bars = 24;
    const barW = canvas.clientWidth / bars - 4;
    for (let i = 0; i < bars; i++) {
      const val = data[i + 4] / 255;
      const h = val * canvas.clientHeight * 0.9;
      const x = i * (barW + 4);
      const hue = 270 + i * 3;
      vctx.fillStyle = `hsla(${hue}, 70%, 65%, ${0.5 + val * 0.5})`;
      vctx.fillRect(x, canvas.clientHeight - h, barW, h);
    }
  }
  draw();
}

function stopVisualizer() {
  if (vizFrame) cancelAnimationFrame(vizFrame);
}

function defaultCover() {
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <rect width="48" height="48" rx="8" fill="#2d1b4e"/>
      <text x="24" y="30" text-anchor="middle" font-size="20" fill="#c4a0ff">♪</text>
    </svg>
  `)}`;
}

export function updateMusicPlayerTheme() {
  const player = $('#music-player');
  if (player) {
    player.style.borderColor = 'var(--glass-border)';
    player.style.boxShadow = 'var(--shadow-soft), 0 0 20px var(--accent-glow)';
  }
}

export function destroyMusicPlayer() {
  stopVisualizer();
  if (audio) {
    audio.pause();
    audio.src = '';
    audio = null;
  }
  audioCtx = null;
  analyser = null;
}

export function dismissEnterAndPlay(config) {
  if (config.music?.autoplay && audio) {
    togglePlay();
  }
}
