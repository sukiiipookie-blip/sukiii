let animFrame = null;
let particles = [];
let canvas = null;
let ctx = null;
let currentAnim = 'none';
let speed = 1;
let opacity = 1;

export function initBackgrounds() {
  canvas = document.getElementById('bg-canvas');
  if (canvas) ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles();
}

function initParticles() {
  if (!canvas) return;
  const count = Math.floor((canvas.width * canvas.height) / 12000);
  particles = [];
  for (let i = 0; i < Math.min(count, 80); i++) {
    particles.push(createParticle(currentAnim));
  }
}

function createParticle(type) {
  const w = canvas.width;
  const h = canvas.height;
  const base = {
    x: Math.random() * w,
    y: Math.random() * h,
    size: 2 + Math.random() * 6,
    speedX: (Math.random() - 0.5) * 0.5,
    speedY: 0.3 + Math.random() * 0.8,
    opacity: 0.2 + Math.random() * 0.5,
    hue: 270 + Math.random() * 60,
    phase: Math.random() * Math.PI * 2,
    type,
  };
  if (type === 'stars') {
    base.speedY = 0.1 + Math.random() * 0.3;
    base.size = 1 + Math.random() * 3;
  }
  if (type === 'bokeh') {
    base.size = 30 + Math.random() * 80;
    base.speedX = (Math.random() - 0.5) * 0.15;
    base.speedY = (Math.random() - 0.5) * 0.15;
    base.opacity = 0.05 + Math.random() * 0.12;
  }
  if (type === 'snow') {
    base.speedY = 0.5 + Math.random() * 1;
    base.size = 2 + Math.random() * 4;
  }
  return base;
}

export function applyBackground(config) {
  const bg = config.background;
  const layer = document.getElementById('bg-layer');
  const media = document.getElementById('bg-media');
  if (!layer) return;

  layer.style.background = '';
  if (media) {
    media.style.display = 'none';
    media.src = '';
  }

  speed = bg.speed ?? 1;
  opacity = bg.opacity ?? 1;
  layer.style.setProperty('--bg-media-opacity', opacity);

  switch (bg.type) {
    case 'solid':
      layer.style.background = bg.solid || '#0c0818';
      break;
    case 'gradient':
      layer.style.background = bg.gradient || 'linear-gradient(180deg, #1a0a2e, #6b3fa0)';
      break;
    case 'image':
      if (bg.image) layer.style.background = `url(${bg.image}) center/cover no-repeat`;
      break;
    case 'video':
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

  if (anim === 'shimmer') {
    layer.classList.add('holographic-shimmer');
  } else {
    layer.classList.remove('holographic-shimmer');
  }

  if (anim === 'none' || anim === 'shimmer') {
    stopAnimation();
    if (canvas) canvas.style.opacity = '0';
  } else {
    if (canvas) canvas.style.opacity = String(opacity);
    startAnimation();
  }

  if (anim === 'aurora') renderAurora(layer);
  if (anim === 'grid') renderGrid(layer);
}

function renderAurora(layer) {
  let aurora = layer.querySelector('.aurora-blobs');
  if (!aurora) {
    aurora = document.createElement('div');
    aurora.className = 'aurora-blobs';
    aurora.innerHTML = `
      <div class="aurora-blob" style="position:absolute;width:60%;height:60%;top:10%;left:10%;background:radial-gradient(circle,rgba(196,160,255,0.3),transparent 70%);border-radius:50%;animation:aurora-shift 12s ease infinite;"></div>
      <div class="aurora-blob" style="position:absolute;width:50%;height:50%;bottom:10%;right:10%;background:radial-gradient(circle,rgba(240,168,208,0.25),transparent 70%);border-radius:50%;animation:aurora-shift 15s ease infinite reverse;"></div>
      <div class="aurora-blob" style="position:absolute;width:40%;height:40%;top:40%;left:40%;background:radial-gradient(circle,rgba(167,139,250,0.2),transparent 70%);border-radius:50%;animation:aurora-shift 10s ease infinite 2s;"></div>
    `;
    layer.appendChild(aurora);
  }
}

function renderGrid(layer) {
  let grid = layer.querySelector('.cyber-grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'cyber-grid';
    grid.style.cssText = `
      position:absolute;inset:0;opacity:${opacity * 0.3};
      background-image:linear-gradient(rgba(196,160,255,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(196,160,255,0.15) 1px,transparent 1px);
      background-size:40px 40px;
      animation:grid-scroll 3s linear infinite;
      transform-origin:center bottom;
    `;
    layer.appendChild(grid);
  }
}

function startAnimation() {
  if (animFrame) return;
  function loop() {
    draw();
    animFrame = requestAnimationFrame(loop);
  }
  loop();
}

function stopAnimation() {
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function draw() {
  if (!ctx || !canvas || currentAnim === 'none') return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.phase += 0.01 * speed;
    p.x += p.speedX * speed;
    p.y += p.speedY * speed;

    if (p.y > canvas.height + 20) {
      p.y = -20;
      p.x = Math.random() * canvas.width;
    }
    if (p.x < -20) p.x = canvas.width + 20;
    if (p.x > canvas.width + 20) p.x = -20;

    const alpha = p.opacity * opacity;

    if (currentAnim === 'petals' || currentAnim === 'hearts') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(p.phase) * 0.5);
      ctx.font = `${p.size * 3}px serif`;
      ctx.globalAlpha = alpha;
      ctx.fillText(currentAnim === 'hearts' ? '♥' : '🌸', 0, 0);
      ctx.restore();
    } else if (currentAnim === 'stars' || currentAnim === 'snow') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = currentAnim === 'snow'
        ? `rgba(255,255,255,${alpha})`
        : `hsla(${p.hue},80%,85%,${alpha})`;
      ctx.fill();
      if (currentAnim === 'stars') {
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${p.hue},80%,85%,${alpha})`;
      }
    } else if (currentAnim === 'bokeh') {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, `hsla(${p.hue},70%,70%,${alpha})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function destroyBackgrounds() {
  stopAnimation();
  window.removeEventListener('resize', resize);
}
