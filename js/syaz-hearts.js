/** Heart grid — dense field with literal S-outline pulse wave */

const COLS = 32;
const ROWS = 24;

/** Points along a readable letter S (normalized 0–1) */
function sLetterPoint(t) {
  if (t < 0.5) {
    const u = t * 2;
    const angle = Math.PI * (1.05 - u * 1.15);
    const cx = 0.62;
    const cy = 0.26;
    const rx = 0.26;
    const ry = 0.2;
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  }
  const u = (t - 0.5) * 2;
  const angle = Math.PI * (-0.05 + u * 1.15);
  const cx = 0.38;
  const cy = 0.74;
  const rx = 0.26;
  const ry = 0.2;
  return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
}

function nearestOnS(nx, ny) {
  let bestT = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 160; i++) {
    const t = i / 160;
    const { x, y } = sLetterPoint(t);
    const d = (nx - x) ** 2 + (ny - y) ** 2;
    if (d < bestD) {
      bestD = d;
      bestT = t;
    }
  }
  return { t: bestT, dist: Math.sqrt(bestD) };
}

export function mountSyazHeartGrid(container) {
  if (!container) return () => {};
  container.innerHTML = '';
  container.classList.add('syaz-heart-grid');
  container.style.setProperty('--cols', COLS);
  container.style.setProperty('--rows', ROWS);

  const hearts = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = document.createElement('span');
      el.className = 'syaz-grid-heart';
      el.textContent = '♥';
      el.dataset.c = c;
      el.dataset.r = r;
      container.appendChild(el);
      hearts.push(el);
    }
  }

  let phase = 0;
  let running = true;

  function tick() {
    if (!running) return;
    phase += 0.32;
    const waveT = (phase * 0.0028) % 1;

    hearts.forEach((el) => {
      const c = +el.dataset.c;
      const r = +el.dataset.r;
      const nx = c / (COLS - 1);
      const ny = r / (ROWS - 1);
      const { t, dist } = nearestOnS(nx, ny);

      const onS = Math.max(0, 1 - dist / 0.1);
      let dt = Math.abs(t - waveT);
      dt = Math.min(dt, 1 - dt);
      const wave = Math.max(0, 1 - dt / 0.09);
      const shimmer = 0.42 + 0.58 * Math.sin(phase * 0.028 + c * 0.22 + r * 0.18);

      const pulse = onS * wave;
      const base = 0.28 + shimmer * 0.35 + pulse * 0.55;

      el.style.opacity = Math.min(1, base);
      el.style.color = pulse > 0.35 ? '#fff' : 'rgba(220, 180, 255, 0.92)';
      el.style.transform = `scale(${0.68 + pulse * 0.5 + shimmer * 0.08})`;
      el.style.filter = pulse > 0.3
        ? `drop-shadow(0 0 ${5 + pulse * 10}px rgba(255,140,220,${0.5 + pulse * 0.5}))`
        : 'drop-shadow(0 0 2px rgba(255,107,203,0.15)';
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  return () => {
    running = false;
    container.innerHTML = '';
  };
}
