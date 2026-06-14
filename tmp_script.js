
    const pages = {
      main: document.getElementById('main-page'),
      promo: document.getElementById('promo-page'),
      heart: document.getElementById('heart-page')
    };
    function showPage(id) {
      Object.values(pages).forEach(page => page.classList.add('hidden'));
      pages[id].classList.remove('hidden');
    }
    document.getElementById('promo-open-btn').addEventListener('click', () => showPage('promo'));
    document.getElementById('promo-btn').addEventListener('click', () => showPage('promo'));
    document.getElementById('promo-back').addEventListener('click', () => showPage('main'));
    document.getElementById('heart-page-btn').addEventListener('click', () => showPage('heart'));
    document.getElementById('heart-back').addEventListener('click', () => showPage('main'));
    document.getElementById('custom-text-btn').addEventListener('click', () => showPage('heart'));
    document.getElementById('enter-text').addEventListener('click', () => {
      document.getElementById('enter-screen').style.display = 'none';
      audio.volume = 0.18;
      audioContext.resume().then(() => {
        audio.play().then(() => {
          playButton.textContent = 'Pause';
        }).catch(() => {});
      }).catch(() => {});
    });
    const typeTexts = [
      'Sweet streamer energy with neon glow.',
      'Built for PC and mobile with a cute heart grid.',
      'Ready to customize your own promo section.'
    ];
    const typeTarget = document.getElementById('typewriter-text');
    let textIndex = 0;
    let charIndex = 0;
    function typeEffect() {
      const current = typeTexts[textIndex];
      typeTarget.textContent = current.slice(0, charIndex);
      if (charIndex < current.length) {
        charIndex += 1;
        setTimeout(typeEffect, 70);
      } else {
        setTimeout(() => {
          charIndex = 0;
          textIndex = (textIndex + 1) % typeTexts.length;
          typeEffect();
        }, 1800);
      }
    }
    typeEffect();
    function buildHeartGrid() {
      const heartGrid = document.getElementById('heart-grid');
      heartGrid.innerHTML = '';
      for (let i = 0; i < 160; i += 1) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        heart.style.opacity = 0.15 + Math.random() * 0.18;
        heart.style.animationDelay = `${Math.random() * 3}s`;
        heart.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-7.5-4.35-7.5-10.5S6.5 3 12 7.5 19.5 3 19.5 10.5 12 21 12 21Z" stroke="rgba(255,255,255,0.45)" stroke-width="1.5" fill="none"/></svg>`;
        heartGrid.appendChild(heart);
      }
    }
    buildHeartGrid();
    const canvas = document.getElementById('heart-canvas');
    const ctx = canvas.getContext('2d');
    let hearts = [];
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    class Heart {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = 18 + Math.random() * 42;
        this.speed = 0.2 + Math.random() * 0.45;
        this.opacity = 0.08 + Math.random() * 0.18;
        this.hue = 300 + Math.random() * 60;
        this.phase = Math.random() * Math.PI * 2;
      }
      update() {
        this.y -= this.speed;
        this.phase += 0.01;
        if (this.y < -this.size) {
          this.reset();
          this.y = canvas.height + this.size;
        }
      }
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.sin(this.phase) * 0.15);
        ctx.font = `${this.size}px serif`;
        ctx.fillStyle = `hsla(${this.hue}, 84%, 77%, ${this.opacity})`;
        ctx.fillText('❤', 0, 0);
        ctx.restore();
      }
    }
    function initHearts() {
      hearts = Array.from({ length: 40 }, () => new Heart());
    }
    function animateHearts() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hearts.forEach(heart => { heart.update(); heart.draw(); });
      requestAnimationFrame(animateHearts);
    }
    window.addEventListener('resize', () => {
      resizeCanvas();
      initHearts();
    });
    resizeCanvas();
    initHearts();
    animateHearts();
    const audio = document.getElementById('audio-player');
    audio.volume = 0.18;
    const playButton = document.getElementById('play-pause-btn');
    const volumeSlider = document.getElementById('volume-slider');
    const trackSelect = document.getElementById('track-select');
    const visualizer = document.getElementById('visualizer');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let analyser;
    let dataArray;
    function createVisualizer() {
      if (!analyser) {
        const source = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      }
      visualizer.width = visualizer.clientWidth * devicePixelRatio;
      visualizer.height = visualizer.clientHeight * devicePixelRatio;
      const vctx = visualizer.getContext('2d');
      vctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        vctx.clearRect(0, 0, visualizer.clientWidth, visualizer.clientHeight);
        const barCount = 22;
        const barWidth = visualizer.clientWidth / barCount - 6;
        for (let i = 0; i < barCount; i++) {
          const value = dataArray[i + 10] / 255;
          const barHeight = value * visualizer.clientHeight * 0.95;
          const x = i * (barWidth + 6);
          const y = visualizer.clientHeight - barHeight;
          const hue = 310 + i * 4;
          vctx.fillStyle = `hsl(${hue}, 98%, ${35 + value * 32}%)`;
          vctx.fillRect(x, y, barWidth, barHeight);
          vctx.fillStyle = `rgba(255,255,255,${0.18 + value * 0.24})`;
          vctx.fillRect(x, y - 6, barWidth, 4);
        }
      }
      draw();
    }
    function toggleAudio() {
      if (audio.paused) {
        audioContext.resume();
        audio.play();
        playButton.textContent = 'Pause';
      } else {
        audio.pause();
        playButton.textContent = 'Play';
      }
    }
    playButton.addEventListener('click', toggleAudio);
    volumeSlider.addEventListener('input', event => { audio.volume = event.target.value; });
    trackSelect.addEventListener('change', event => {
      const src = event.target.value;
      audio.pause();
      audio.src = src;
      audio.load();
      if (audioContext.state !== 'suspended') {
        audio.play();
        playButton.textContent = 'Pause';
      }
    });
    audio.addEventListener('play', () => {
      if (!analyser) createVisualizer();
    });
    createVisualizer();
    const customText = document.getElementById('custom-text');
    const previewText = document.getElementById('preview-text');
    const fallingHearts = document.getElementById('falling-hearts');
    function updatePreview() {
      previewText.textContent = customText.value || 'I love you, Sebastian 💖';
    }
    customText.addEventListener('input', updatePreview);
    updatePreview();
    function createFallingHearts() {
      fallingHearts.innerHTML = '';
      for (let i = 0; i < 12; i++) {
        const heart = document.createElement('span');
        heart.textContent = '❣';
        heart.style.left = `${Math.random() * 90}%`;
        heart.style.animationDuration = `${3 + Math.random() * 3}s`;
        heart.style.animationDelay = `${Math.random() * 4}s`;
        heart.style.fontSize = `${13 + Math.random() * 8}px`;
        fallingHearts.appendChild(heart);
      }
    }
    createFallingHearts();
  