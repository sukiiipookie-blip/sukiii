let animFrame = null;
let particles = [];
let canvas = null;
let ctx = null;
let currentAnim = 'none';
let speed = 1;
let opacity = 1;
let isVisible = true;

export function initBackgrounds() {
  canvas = document.getElementById('bg-canvas');
  if (canvas) ctx = canvas.getContext('2d', { alpha: true });
  resize();
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (isVisible && currentAnim !== 'none') startAnimation();
    else stopAnimation();
  });
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initParticles();
}

function initParticles() {
  if (!canvas) return;
  const max = window.innerWidth < 768 ? 12 : 20;
  particles = Array.from({ length: max }, () => createParticle(currentAnim));
}

function createParticle(type) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: 1 + Math.random() * 2.5,
    speedY: 0.08 + Math.random() * 0.2,
    opacity: 0.15 + Math.random() * 0.35,
    hue: 265 + Math.random() * 30,
    type,
  };
}

export function applyBackground(config) {
  const bg = config.background;
  const layer = document.getElementById('bg-layer');
  const media = document.getElementById('bg-media');
  if (!layer) return;

  layer.querySelector('.aurora-blobs')?.remove();
  layer.querySelector('.cyber-grid')?.remove();

  if (media) {
    media.style.display = 'none';
    media.src = '';
  }

  speed = bg.speed ?? 0.6;
  opacity = bg.opacity ?? 1;

  switch (bg.type) {
    case 'solid':
      layer.style.background = bg.solid || '#08060f';
      break;
    case 'gradient':
      layer.style.background = bg.gradient || '';
      break;
    case 'image':
      layer.style.background = bg.image ? `url(${bg.image}) center/cover no-repeat` : '';
      break;
    case 'video':
      layer.style.background = '#08060f';
      if (media && bg.video) {
        media.style.display = 'block';
        media.src = bg.video;
        media.play?.().catch(() => {});
      }
      break;
    default:
      layer.style.background = bg.gradient || '';
  }

  const anim = bg.animation || 'none';
  if (anim !== currentAnim) {
    currentAnim = anim;
    initParticles();
  }

  layer.classList.toggle('holographic-shimmer', anim === 'shimmer');

  if (anim === 'none' || !isVisible) {
    stopAnimation();
    if (canvas) canvas.style.opacity = '0';
  } else {
    if (canvas) canvas.style.opacity = String(Math.min(opacity, 0.7));
    startAnimation();
  }

  if (anim === 'aurora') renderAurora(layer);
  if (anim === 'grid') renderGrid(layer);
}

function renderAurora(layer) {
  if (layer.querySelector('.aurora-blobs')) return;
  const aurora = document.createElement('div');
  aurora.className = 'aurora-blobs';
  aurora.innerHTML = `
    <div style="position:absolute;width:55%;height:55%;top:5%;left:15%;background:radial-gradient(circle,rgba(181,123,255,0.2),transparent 70%);border-radius:50%;animation:aurora-shift 14s ease infinite;"></div>
    <div style="position:absolute;width:45%;height:45%;bottom:5%;right:10%;background:radial-gradient(circle,rgba(224,102,255,0.15),transparent 70%);border-radius:50%;animation:aurora-shift 18s ease infinite reverse;"></div>
  `;
  layer.appendChild(aurora);
}

function renderGrid(layer) {
  if (layer.querySelector('.cyber-grid')) return;
  const grid = document.createElement('div');
  grid.className = 'cyber-grid';
  grid.style.cssText = `
    position:absolute;inset:0;opacity:0.2;pointer-events:none;
    background-image:linear-gradient(rgba(181,123,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(181,123,255,0.12) 1px,transparent 1px);
    background-size:48px 48px;
  `;
  layer.appendChild(grid);
}

function startAnimation() {
  if (animFrame || currentAnim === 'none') return;
  let last = 0;
  function loop(ts) {
    animFrame = requestAnimationFrame(loop);
    if (!isVisible) return;
    if (ts - last < 33) return;
    last = ts;
    draw();
  }
  loop(0);
}

function stopAnimation() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  if (ctx && canvas) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function draw() {
  if (!ctx || currentAnim === 'none') return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  for (const p of particles) {
    p.y -= p.speedY * speed;
    if (p.y < -5) {
      p.y = h + 5;
      p.x = Math.random() * w;
    }

    if (currentAnim === 'stars') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.opacity * opacity})`;
      ctx.fill();
    } else if (currentAnim === 'bokeh') {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40);
      grad.addColorStop(0, `hsla(${p.hue}, 70%, 60%, ${p.opacity * 0.15})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function destroyBackgrounds() {
  stopAnimation();
  window.removeEventListener('resize', resize);
}
