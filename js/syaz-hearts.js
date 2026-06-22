/** Heart grid — all hearts visible, S-curve pulses brighter */

const COLS = 20;
const ROWS = 16;

function sCurvePoint(t) {
  if (t < 0.5) {
    const u = t * 2;
    return { x: 0.84 - u * 0.7 + 0.1 * Math.sin(u * Math.PI), y: u * 0.46 + 0.04 };
  }
  const u = (t - 0.5) * 2;
  return { x: 0.14 + u * 0.7 - 0.1 * Math.sin(u * Math.PI), y: 0.5 + u * 0.46 };
}

function nearestOnCurve(nx, ny) {
  let bestT = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 140; i++) {
    const t = i / 140;
    const { x, y } = sCurvePoint(t);
    const d = (nx - x) ** 2 + (ny - y) ** 2;
    if (d < bestD) { bestD = d; bestT = t; }
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
    phase += 1;
    const waveT = (phase * 0.007) % 1;

    hearts.forEach(el => {
      const c = +el.dataset.c;
      const r = +el.dataset.r;
      const nx = c / (COLS - 1);
      const ny = r / (ROWS - 1);
      const { t, dist } = nearestOnCurve(nx, ny);

      const onS = Math.max(0, 1 - dist / 0.12);
      let dt = Math.abs(t - waveT);
      dt = Math.min(dt, 1 - dt);
      const wave = Math.max(0, 1 - dt / 0.1);
      const shimmer = 0.5 + 0.5 * Math.sin(phase * 0.05 + c * 0.3 + r * 0.25);

      const pulse = onS * wave * shimmer;
      const base = 0.38 + pulse * 0.62;

      el.style.opacity = base;
      el.style.color = pulse > 0.35 ? '#fff' : 'rgba(210, 170, 255, 0.95)';
      el.style.transform = `scale(${0.75 + pulse * 0.45})`;
      el.style.filter = pulse > 0.5
        ? `drop-shadow(0 0 ${3 + pulse * 5}px rgba(255,140,220,${0.4 + pulse * 0.5}))`
        : 'none';
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  return () => { running = false; container.innerHTML = ''; };
}
