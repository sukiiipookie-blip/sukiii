let cursorType = 'default';
let customUrl = '';
let moveHandler = null;

export function initCursor(config) {
  destroyCursor();
  cursorType = config.site?.cursor || 'default';
  customUrl = config.site?.cursorCustomUrl || '';

  if (cursorType === 'default') return;

  document.body.style.cursor = 'none';

  moveHandler = (e) => {
    if (cursorType === 'sparkle') spawnSparkle(e.clientX, e.clientY);
    if (cursorType === 'petal') spawnPetal(e.clientX, e.clientY);
    if (cursorType === 'dot') moveDot(e.clientX, e.clientY);
    if (cursorType === 'custom' && customUrl) moveCustom(e.clientX, e.clientY);
  };

  document.addEventListener('mousemove', moveHandler);

  if (cursorType === 'dot') createDot();
  if (cursorType === 'custom' && customUrl) createCustomCursor();
}

function spawnSparkle(x, y) {
  if (Math.random() > 0.7) return;
  const el = document.createElement('div');
  el.className = 'cursor-sparkle';
  el.textContent = '✦';
  el.style.left = `${x + (Math.random() - 0.5) * 20}px`;
  el.style.top = `${y + (Math.random() - 0.5) * 20}px`;
  el.style.color = `hsl(${270 + Math.random() * 40}, 80%, 80%)`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

function spawnPetal(x, y) {
  if (Math.random() > 0.85) return;
  const el = document.createElement('div');
  el.className = 'cursor-petal';
  el.textContent = '🌸';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

let dotEl = null;
function createDot() {
  dotEl = document.createElement('div');
  dotEl.className = 'cursor-dot';
  document.body.appendChild(dotEl);
}

function moveDot(x, y) {
  if (dotEl) {
    dotEl.style.left = `${x}px`;
    dotEl.style.top = `${y}px`;
  }
}

let customEl = null;
function createCustomCursor() {
  customEl = document.createElement('div');
  customEl.className = 'cursor-custom';
  customEl.style.backgroundImage = `url(${customUrl})`;
  document.body.appendChild(customEl);
}

function moveCustom(x, y) {
  if (customEl) {
    customEl.style.left = `${x}px`;
    customEl.style.top = `${y}px`;
  }
}

export function destroyCursor() {
  if (moveHandler) {
    document.removeEventListener('mousemove', moveHandler);
    moveHandler = null;
  }
  document.body.style.cursor = '';
  dotEl?.remove();
  customEl?.remove();
  dotEl = null;
  customEl = null;
}
