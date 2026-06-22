let cursorType = 'default';
let customUrl = '';
let rafId = null;
let mouseX = 0;
let mouseY = 0;
let ringX = 0;
let ringY = 0;
let dotEl = null;
let ringEl = null;
let customEl = null;
let moveHandler = null;

export function initCursor(config) {
  const raw = config.site?.cursor || 'default';
  const next = ['neon', 'dot', 'sparkle', 'petal'].includes(raw) ? 'neon' : raw;
  if (next === cursorType && next !== 'custom') {
    if (next === 'default') return;
    return;
  }

  destroyCursor();
  cursorType = next;
  customUrl = config.site?.cursorCustomUrl || '';

  if (cursorType === 'default') return;

  document.body.classList.add('custom-cursor-active');

  if (cursorType === 'custom' && customUrl) {
    customEl = document.createElement('div');
    customEl.className = 'cursor-custom';
    customEl.style.backgroundImage = `url(${customUrl})`;
    document.body.appendChild(customEl);
  } else {
    ringEl = document.createElement('div');
    ringEl.className = 'cursor-neon-ring';
    dotEl = document.createElement('div');
    dotEl.className = 'cursor-neon-dot';
    document.body.appendChild(ringEl);
    document.body.appendChild(dotEl);
    tick();
  }

  moveHandler = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (customEl) {
      customEl.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    }
  };

  document.addEventListener('mousemove', moveHandler, { passive: true });

  document.addEventListener('mousedown', () => document.body.classList.add('cursor-clicking'));
  document.addEventListener('mouseup', () => document.body.classList.remove('cursor-clicking'));
}

function tick() {
  ringX += (mouseX - ringX) * 0.18;
  ringY += (mouseY - ringY) * 0.18;

  if (ringEl) {
    ringEl.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
  }
  if (dotEl) {
    dotEl.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
  }

  rafId = requestAnimationFrame(tick);
}

export function destroyCursor() {
  if (moveHandler) {
    document.removeEventListener('mousemove', moveHandler);
    moveHandler = null;
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  document.body.classList.remove('custom-cursor-active', 'cursor-clicking');
  dotEl?.remove();
  ringEl?.remove();
  customEl?.remove();
  dotEl = ringEl = customEl = null;
  cursorType = 'default';
}
