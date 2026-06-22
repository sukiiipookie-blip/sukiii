/** Heart grid — S-outline pulse wave (lighter on mobile) */

function gridSize() {
  const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  return mobile ? { cols: 18, rows: 14, lite: true } : { cols: 32, rows: 24, lite: false };
}

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
  const { cols: COLS, rows: ROWS, lite } = gridSize();

  container.innerHTML = '';
  container.classList.add('syaz-heart-grid');
  if (lite) container.classList.add('syaz-heart-grid-lite');
  container.style.setProperty('--cols', COLS);
  container.style.setProperty('--rows', ROWS);

  const hearts = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const nx = c / (COLS - 1);
      const ny = r / (ROWS - 1);
      const { t, dist } = nearestOnS(nx, ny);
      const el = document.createElement('span');
      el.className = 'syaz-grid-heart';
      el.textContent = '♥';
      container.appendChild(el);
      hearts.push({
        el,
        t,
        onS: Math.max(0, 1 - dist / 0.1),
        c,
        r,
      });
    }
  }

  let phase = 0;
  let running = true;
  let frameSkip = 0;

  function tick() {
    if (!running) return;
    frameSkip += 1;
    if (lite && frameSkip % 2 !== 0) {
      requestAnimationFrame(tick);
      return;
    }

    phase += lite ? 0.28 : 0.32;
    const waveT = (phase * 0.0028) % 1;

    for (const h of hearts) {
      let dt = Math.abs(h.t - waveT);
      dt = Math.min(dt, 1 - dt);
      const wave = Math.max(0, 1 - dt / 0.09);
      const shimmer = 0.42 + 0.58 * Math.sin(phase * 0.028 + h.c * 0.22 + h.r * 0.18);
      const pulse = h.onS * wave;
      const base = 0.28 + shimmer * 0.35 + pulse * 0.55;
      const scale = 0.68 + pulse * 0.5 + shimmer * 0.08;

      h.el.style.opacity = Math.min(1, base);
      h.el.style.transform = `scale(${scale})`;
      if (lite) {
        h.el.style.color = pulse > 0.35 ? '#fff' : 'rgba(220, 180, 255, 0.92)';
      } else {
        h.el.style.color = pulse > 0.35 ? '#fff' : 'rgba(220, 180, 255, 0.92)';
        h.el.style.filter = pulse > 0.3
          ? `drop-shadow(0 0 ${5 + pulse * 10}px rgba(255,140,220,${0.5 + pulse * 0.5}))`
          : 'drop-shadow(0 0 2px rgba(255,107,203,0.15)';
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
  return () => {
    running = false;
    container.innerHTML = '';
    container.classList.remove('syaz-heart-grid-lite');
  };
}
