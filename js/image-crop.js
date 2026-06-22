import { $, showToast } from './utils.js';

const OUTPUT_SIZE = 512;

/**
 * Open square crop modal. onComplete receives a Blob (JPEG 512×512).
 */
export function openImageCropModal(imageSrc, { title = 'Crop profile photo', onComplete, onCancel } = {}) {
  closeImageCropModal();

  const modal = document.createElement('div');
  modal.className = 'admin-modal crop-modal';
  modal.id = 'image-crop-modal';
  modal.innerHTML = `
    <div class="admin-modal-content crop-modal-content">
      <h3>${title}</h3>
      <p class="admin-hint crop-note">Output: <strong>${OUTPUT_SIZE}×${OUTPUT_SIZE}px</strong> square — perfect for your profile avatar.</p>
      <div class="crop-stage" id="crop-stage">
        <canvas id="crop-canvas"></canvas>
        <div class="crop-mask"></div>
      </div>
      <div class="form-group">
        <label>Zoom</label>
        <input type="range" class="form-range" id="crop-zoom" min="1" max="3" step="0.01" value="1" />
      </div>
      <p class="admin-hint">Drag the image to reposition · use zoom to fit</p>
      <div class="crop-actions">
        <button type="button" class="admin-btn admin-btn-primary" id="crop-save">Use cropped photo</button>
        <button type="button" class="admin-btn admin-btn-secondary" id="crop-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const canvas = $('#crop-canvas', modal);
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.crossOrigin = 'anonymous';

  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
  const stageSize = 280;

  canvas.width = stageSize;
  canvas.height = stageSize;

  function draw() {
    if (!img.complete || !img.naturalWidth) return;
    ctx.clearRect(0, 0, stageSize, stageSize);
    ctx.fillStyle = '#0f0a1a';
    ctx.fillRect(0, 0, stageSize, stageSize);

    const baseScale = Math.max(stageSize / img.naturalWidth, stageSize / img.naturalHeight);
    const s = baseScale * scale;
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    const x = (stageSize - w) / 2 + offsetX;
    const y = (stageSize - h) / 2 + offsetY;
    ctx.drawImage(img, x, y, w, h);
  }

  img.onload = () => {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    draw();
  };

  img.onerror = () => {
    showToast('Could not load image. Try uploading a file instead.', 'error');
    closeImageCropModal();
    onCancel?.();
  };

  img.src = imageSrc;

  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
  });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', () => { dragging = false; });

  function onMove(e) {
    if (!dragging) return;
    offsetX = dragStart.ox + (e.clientX - dragStart.x);
    offsetY = dragStart.oy + (e.clientY - dragStart.y);
    draw();
  }

  $('#crop-zoom', modal)?.addEventListener('input', (e) => {
    scale = parseFloat(e.target.value);
    draw();
  });

  $('#crop-cancel', modal)?.addEventListener('click', () => {
    cleanup();
    onCancel?.();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) { cleanup(); onCancel?.(); }
  });

  $('#crop-save', modal)?.addEventListener('click', () => {
    const out = document.createElement('canvas');
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const octx = out.getContext('2d');
    octx.drawImage(canvas, 0, 0, stageSize, stageSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    out.toBlob((blob) => {
      if (blob) onComplete?.(blob);
      cleanup();
    }, 'image/jpeg', 0.92);
  });

  function cleanup() {
    window.removeEventListener('mousemove', onMove);
    closeImageCropModal();
  }
}

export function closeImageCropModal() {
  $('#image-crop-modal')?.remove();
}

export function loadImageForCrop(source) {
  return new Promise((resolve, reject) => {
    if (source instanceof Blob || source instanceof File) {
      const url = URL.createObjectURL(source);
      resolve(url);
      return;
    }
    if (typeof source === 'string') {
      resolve(source);
      return;
    }
    reject(new Error('Invalid image source'));
  });
}

export const AVATAR_SIZE_NOTE = `Profile photos work best at ${OUTPUT_SIZE}×${OUTPUT_SIZE}px (square). You'll crop before saving.`;
