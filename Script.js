/* ================================================================
   BIRTHDAY SURPRISE — main script
   Sections:
   1. Smooth scroll (Lenis) + AOS init
   2. Ambient canvases: bokeh + falling petals (sakura -> rose after gift opens)
   3. Mouse glow
   4. QR landing scene
   5. Intro scene (whisper line -> Open Gift button)
   6. Gift unboxing animation (GSAP timeline)
   7. Main experience reveal + per-page interactions
   8. Music player
   9. Photo grid + lightbox
   10. Garden growing animation
   11. Timeline fill animation
   12. Thank-you page flower field
   13. Finale (Forever button -> full takeover)
================================================================ */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FLOWER_EMOJIS = ['🌸', '🌹', '🌷', '🌺', '🌻'];

  /* -------------------------------------------------------------
     1. SMOOTH SCROLL + AOS
  ------------------------------------------------------------- */
  let lenis;
  function initSmoothScroll() {
    if (reduceMotion || typeof Lenis === 'undefined') return;
    lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    if (window.ScrollTrigger && window.gsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  function initAOS() {
    if (typeof AOS === 'undefined') return;
    AOS.init({
      duration: 900,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
      disable: reduceMotion,
    });
  }

  /* -------------------------------------------------------------
     2. AMBIENT CANVASES — bokeh + falling petals
     Petals start as soft sakura tones. Once the gift is tapped/opened,
     petalTheme flips to 'rose' and every falling petal (current ones
     respawn gradually, all new ones immediately) turns rose-colored.
  ------------------------------------------------------------- */
  const petalCanvas = document.getElementById('petal-canvas');
  const bokehCanvas = document.getElementById('bokeh-canvas');
  const pctx = petalCanvas.getContext('2d');
  const bctx = bokehCanvas.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;

  let petalTheme = 'sakura'; // 'sakura' | 'rose'
  const PETAL_HUES = {
    sakura: ['255,143,171', '227,169,154'],
    rose: ['255,95,150', '214,50,90', '166,60,120'],
  };

  function resizeCanvases() {
    W = window.innerWidth; H = window.innerHeight;
    [petalCanvas, bokehCanvas, document.getElementById('finale-canvas')].forEach((c) => {
      if (!c) return;
      c.width = W * devicePixelRatio;
      c.height = H * devicePixelRatio;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
      const ctx = c.getContext('2d');
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    });
  }
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  // ---- bokeh (soft glowing dots drifting slowly) ----
  const bokehColors = ['rgba(255,143,171,', 'rgba(185,138,223,', 'rgba(243,217,174,'];
  const bokehDots = Array.from({ length: 22 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 40 + Math.random() * 90,
    dx: (Math.random() - 0.5) * 0.12,
    dy: (Math.random() - 0.5) * 0.08,
    color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
    alpha: 0.05 + Math.random() * 0.09,
    pulse: Math.random() * Math.PI * 2,
  }));

  function drawBokeh() {
    bctx.clearRect(0, 0, W, H);
    bokehDots.forEach((d) => {
      d.x += d.dx; d.y += d.dy; d.pulse += 0.004;
      if (d.x < -120) d.x = W + 120; if (d.x > W + 120) d.x = -120;
      if (d.y < -120) d.y = H + 120; if (d.y > H + 120) d.y = -120;
      const a = d.alpha + Math.sin(d.pulse) * 0.02;
      const grad = bctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      grad.addColorStop(0, d.color + a + ')');
      grad.addColorStop(1, d.color + '0)');
      bctx.fillStyle = grad;
      bctx.beginPath();
      bctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      bctx.fill();
    });
    requestAnimationFrame(drawBokeh);
  }

  // ---- falling petals (continuous, whole site) ----
  const PETAL_COUNT = reduceMotion ? 0 : (window.innerWidth < 700 ? 18 : 32);
  const petals = Array.from({ length: PETAL_COUNT }, () => makePetal(true));

  function makePetal(randomY) {
    const hues = PETAL_HUES[petalTheme];
    const isRose = petalTheme === 'rose';
    return {
      x: Math.random() * W,
      y: randomY ? Math.random() * H : -20,
      size: (isRose ? 9 : 8) + Math.random() * (isRose ? 11 : 10),
      speedY: (isRose ? 0.45 : 0.5) + Math.random() * 1.1,
      speedX: (Math.random() - 0.5) * 0.6,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.015,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 1.4,
      hue: hues[Math.floor(Math.random() * hues.length)],
      opacity: 0.55 + Math.random() * 0.35,
    };
  }

  // Flips the falling-petal palette to rose and gradually recycles every
  // petal currently on screen into the new color, so the change reads as
  // a natural "bloom" rather than an abrupt swap.
  function switchToRosePetals() {
    if (petalTheme === 'rose') return;
    petalTheme = 'rose';
    petals.forEach((p, i) => {
      setTimeout(() => {
        Object.assign(p, makePetal(false), { x: Math.random() * W, y: -Math.random() * 260 });
      }, i * 70);
    });
  }

  // The ambient falling-petal layer stays off during the QR / intro / gift
  // scenes. It only starts once the gift box has actually been opened.
  let petalsStarted = false;
  function startFallingPetals() {
    if (petalsStarted || reduceMotion) return;
    petalsStarted = true;
    petalCanvas.style.opacity = '0';
    petalCanvas.style.transition = 'opacity 1.2s ease';
    requestAnimationFrame(() => { petalCanvas.style.opacity = '1'; });
    drawPetals();
  }

  function drawPetal(p) {
    pctx.save();
    pctx.translate(p.x, p.y);
    pctx.rotate((p.rotation * Math.PI) / 180);
    pctx.globalAlpha = p.opacity;
    const grad = pctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
    grad.addColorStop(0, `rgba(${p.hue},0.9)`);
    grad.addColorStop(1, `rgba(${p.hue},0.15)`);
    pctx.fillStyle = grad;
    pctx.beginPath();
    // simple petal shape: two curved lobes
    pctx.moveTo(0, -p.size / 2);
    pctx.bezierCurveTo(p.size / 2, -p.size / 2, p.size / 2, p.size / 2, 0, p.size);
    pctx.bezierCurveTo(-p.size / 2, p.size / 2, -p.size / 2, -p.size / 2, 0, -p.size / 2);
    pctx.fill();
    pctx.restore();
  }

  function drawPetals() {
    pctx.clearRect(0, 0, W, H);
    petals.forEach((p) => {
      p.sway += p.swaySpeed;
      p.x += p.speedX + Math.sin(p.sway) * 0.5;
      p.y += p.speedY;
      p.rotation += p.rotSpeed;
      if (p.y > H + 30) Object.assign(p, makePetal(false), { x: Math.random() * W });
      if (p.x < -30) p.x = W + 30;
      if (p.x > W + 30) p.x = -30;
      drawPetal(p);
    });
    requestAnimationFrame(drawPetals);
  }

  /* -------------------------------------------------------------
     3. MOUSE GLOW
  ------------------------------------------------------------- */
  function initMouseGlow() {
    const glow = document.getElementById('mouse-glow');
    if (reduceMotion) { glow.style.display = 'none'; return; }
    let mx = W / 2, my = H / 2, gx = mx, gy = my;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; });
    function loop() {
      gx += (mx - gx) * 0.08;
      gy += (my - gy) * 0.08;
      glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* -------------------------------------------------------------
     4. QR LANDING SCENE
  ------------------------------------------------------------- */
  function initQRScene() {
    const holder = document.getElementById('qr-love');
    try {
      if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(document.createElement('canvas'), window.location.href, {
          width: 400,
          margin: 1,
          color: { dark: '#f7ecf3', light: '#00000000' },
        }, (err, canvas) => {
          if (!err) holder.appendChild(canvas);
        });
      }
    } catch (e) { /* library unavailable — frame still looks intentional */ }

    const qrScene = document.getElementById('scene-qr');
    const wrap = qrScene.querySelector('.qr-wrap');
    wrap.addEventListener('click', () => goToIntro());
  }

  function goToIntro() {
    const qrScene = document.getElementById('scene-qr');
    qrScene.classList.add('fade-out');
    setTimeout(() => {
      qrScene.classList.add('hidden');
      startIntro();
    }, 900);
  }

  /* -------------------------------------------------------------
     5. INTRO SCENE
  ------------------------------------------------------------- */
  function startIntro() {
    const scene = document.getElementById('scene-intro');
    scene.classList.remove('hidden');
    const line = document.getElementById('intro-line');
    const btn = document.getElementById('btn-open-gift');

    if (window.gsap) {
      gsap.to(line, { opacity: 1, y: 0, duration: 1.6, ease: 'power2.out', delay: .3 });
      gsap.to(btn, { opacity: 1, duration: 1, ease: 'power2.out', delay: 2.4, onStart: () => btn.classList.remove('hidden') });
    } else {
      line.style.opacity = 1;
      btn.classList.remove('hidden');
      btn.style.opacity = 1;
    }

    btn.addEventListener('click', () => {
      scene.classList.add('fade-out');
      setTimeout(() => {
        scene.classList.add('hidden');
        startGiftScene();
      }, 900);
    }, { once: true });
  }

  /* -------------------------------------------------------------
     6. GIFT UNBOXING ANIMATION
  ------------------------------------------------------------- */
  // pastel palette for the gift-reveal bloom specifically (site-wide falling
  // flowers elsewhere still use FLOWER_EMOJIS)
  const GIFT_BLOOM_EMOJIS = ['🌸', '🌷', '💮', '🪷', '🌸', '🪻'];

  function startGiftScene() {
    const scene = document.getElementById('scene-gift');
    scene.classList.remove('hidden');

    const box = document.getElementById('gift-box');
    const lid = box.querySelector('.gift-lid');
    const glow = document.getElementById('gift-glow');
    const flowersHolder = document.getElementById('gift-flowers');
    const particlesHolder = document.getElementById('gift-particles');
    const sparklesHolder = document.getElementById('gift-sparkles');
    const hint = document.getElementById('gift-hint');

    // build flower + burst-particle + sparkle DOM up front
    GIFT_BLOOM_EMOJIS.forEach((f) => {
      const s = document.createElement('span');
      s.textContent = f;
      flowersHolder.appendChild(s);
    });
    for (let i = 0; i < 24; i++) particlesHolder.appendChild(document.createElement('i'));
    for (let i = 0; i < 20; i++) sparklesHolder.appendChild(document.createElement('i'));

    let opened = false;

    function enableContinue() {
      hint.textContent = 'tap anywhere to continue';
      hint.classList.remove('pulse');
      hint.classList.add('show');
      scene.addEventListener('click', () => {
        scene.classList.add('fade-out');
        setTimeout(() => { scene.classList.add('hidden'); revealMainExperience(); }, 1000);
      }, { once: true });
    }

    if (!window.gsap) {
      // fallback: no gsap available, skip straight through
      box.style.opacity = 1; box.style.transform = 'none';
      playMusic();
      switchToRosePetals();
      startFallingPetals();
      enableContinue();
      return;
    }

    // ---- entrance: box drifts up into place, then idles ----
    const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } });
    entrance
      .to(glow, { opacity: 1, scale: 1, duration: 1.2 }, 0)
      .to(box, { opacity: 1, y: 0, duration: 1, ease: 'back.out(1.6)' }, 0.1)
      .add(() => {
        box.classList.add('floating');
        hint.classList.add('show', 'pulse');
      });

    // ---- click-to-open interaction ----
    box.addEventListener('click', () => {
      if (opened) return;
      opened = true;
      box.classList.remove('floating');
      hint.classList.remove('show', 'pulse');
      gsap.killTweensOf(box);
      gsap.set(box, { clearProps: 'transform' });

      // the moment the gift is tapped, music starts and ambient falling
      // petals begin — already in the rose palette, since sakura
      // shouldn't fall before the gift is opened
      playMusic();
      switchToRosePetals();
      startFallingPetals();

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.to(box, { y: -10, duration: .3, ease: 'power2.out' }, 0)
        .to(glow, { scale: 1.4, opacity: 1, duration: .5 }, 0.1)
        // lid opens smoothly upward (hinge at the back)
        .to(lid, { rotateX: -125, y: -22, duration: .55, ease: 'power2.out' }, 0.15)
        // magical light flash the instant it cracks open
        .to(glow, { scale: 2.4, opacity: 1, duration: .35, ease: 'power1.out' }, 0.55)
        // lid then tips forward and falls toward the viewer, tumbling away
        .to(lid, {
          rotateX: 65, y: '+=90', z: 120, scale: .7, opacity: 0,
          duration: .6, ease: 'power2.in',
        }, 0.7)
        .add(() => { burstParticles(particlesHolder); sparkleBurst(sparklesHolder); }, 0.75)
        .add(() => bloomFlowers(flowersHolder), 0.95)
        .to(glow, { opacity: .0, duration: 1.4 }, 1.6)
        .add(enableContinue, 3.2);
    });
  }

  function burstParticles(holder) {
    if (!window.gsap) return;
    const items = holder.querySelectorAll('i');
    items.forEach((it) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 140;
      gsap.set(it, { x: 0, y: 0, opacity: 1 });
      gsap.to(it, {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 40,
        opacity: 0,
        duration: 1.1 + Math.random() * .6,
        ease: 'power2.out',
      });
    });
  }

  // twinkling sparkles around the flowers — quick in, gentle drift, fade out
  function sparkleBurst(holder) {
    if (!window.gsap) return;
    const items = holder.querySelectorAll('i');
    items.forEach((it) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 120;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 30;
      gsap.set(it, { x: 0, y: 0, scale: 0, opacity: 0 });
      const tl = gsap.timeline({ delay: Math.random() * .5 });
      tl.to(it, { x: tx, y: ty, scale: 1, opacity: 1, duration: .5, ease: 'back.out(3)' })
        .to(it, { opacity: .3, duration: .3, repeat: 3, yoyo: true, ease: 'sine.inOut' })
        .to(it, { y: ty - 30, opacity: 0, duration: 1, ease: 'power1.in' });
    });
  }

  function bloomFlowers(holder) {
    if (!window.gsap) return;
    const items = holder.querySelectorAll('span');
    items.forEach((it, i) => {
      const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
      const dist = 90 + Math.random() * 40;
      gsap.set(it, { x: 0, y: 10, scale: 0, opacity: 0, rotate: 0 });
      // bloom outward with a soft spring
      gsap.to(it, {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist - 20,
        scale: 1,
        opacity: 1,
        rotate: (Math.random() - 0.5) * 90,
        duration: .9,
        delay: i * .12,
        ease: 'back.out(2)',
      });
      // then drift upward like petals on a slow current, swaying gently
      gsap.to(it, {
        y: '-=140',
        x: `+=${(Math.random() - 0.5) * 80}`,
        rotate: `+=${(Math.random() - 0.5) * 120}`,
        opacity: 0,
        duration: 3.2,
        delay: 1.3 + i * .12,
        ease: 'sine.in',
      });
    });
  }

  /* -------------------------------------------------------------
     7. MAIN EXPERIENCE REVEAL
  ------------------------------------------------------------- */
  function revealMainExperience() {
    const main = document.getElementById('main-experience');
    main.classList.remove('hidden');
    document.body.style.overflow = 'auto';
    initSmoothScroll();
    initAOS();
    initFallingFlowers();
    initNoteLines();
    initGarden();
    initPhotoGrid();
    initTimeline();
    initThankYouFlowers();
    initFinale();
    window.scrollTo(0, 0);
  }

  /* -------------------------------------------------------------
     continuous falling flower emojis across the main experience
     (this reveal only happens after the gift has been opened, so it
     already leans on roses first in FLOWER_EMOJIS)
  ------------------------------------------------------------- */
  function initFallingFlowers() {
    if (reduceMotion) return;
    const holder = document.getElementById('falling-flowers');
    const max = window.innerWidth < 700 ? 10 : 16;
    for (let i = 0; i < max; i++) spawnFlower(holder, true);
    setInterval(() => {
      if (holder.children.length < max) spawnFlower(holder, false);
    }, 900);
  }

  function spawnFlower(holder, randomStart) {
    const span = document.createElement('span');
    span.textContent = FLOWER_EMOJIS[Math.floor(Math.random() * FLOWER_EMOJIS.length)];
    const size = 14 + Math.random() * 16;
    const left = Math.random() * 100;
    span.style.left = left + 'vw';
    span.style.fontSize = size + 'px';
    holder.appendChild(span);

    const duration = 10 + Math.random() * 8;
    const startY = randomStart ? Math.random() * -window.innerHeight : -40;
    const drift = (Math.random() - 0.5) * 200;

    if (window.gsap) {
      gsap.fromTo(span,
        { y: startY, x: 0, rotate: 0, opacity: 0 },
        {
          y: window.innerHeight + 60, x: drift, rotate: 360 * (Math.random() > .5 ? 1 : -1),
          opacity: .9, duration, ease: 'none',
          onStart: () => gsap.to(span, { opacity: .9, duration: 1 }),
          onComplete: () => span.remove(),
        });
    } else {
      span.remove();
    }
  }

  /* -------------------------------------------------------------
     PAGE 2 — note lines reveal on scroll
  ------------------------------------------------------------- */
  function initNoteLines() {
    const lines = document.querySelectorAll('.note-line');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = Array.from(lines).indexOf(entry.target);
          setTimeout(() => entry.target.classList.add('in-view'), idx * 260);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    lines.forEach((l) => obs.observe(l));
  }

  /* -------------------------------------------------------------
     8. MUSIC PLAYER
  ------------------------------------------------------------- */
  const audio = document.getElementById('bg-audio');
  function playMusic() {
    audio.volume = 0.6;
    const p = audio.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked or no file — user can press play */ });
    updatePlayIcon(true);
  }

  function initMusicPlayer() {
    const playBtn = document.getElementById('mp-play');
    const volBtn = document.getElementById('mp-vol');
    const bar = document.getElementById('mp-progress-bar');

    playBtn.addEventListener('click', () => {
      if (audio.paused) { audio.play().catch(() => {}); updatePlayIcon(true); }
      else { audio.pause(); updatePlayIcon(false); }
    });

    volBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      volBtn.style.opacity = audio.muted ? 0.4 : 1;
    });

    audio.addEventListener('timeupdate', () => {
      if (audio.duration) bar.style.width = (audio.currentTime / audio.duration) * 100 + '%';
    });
    audio.addEventListener('error', () => {
      document.getElementById('mp-title').textContent = 'Add your song';
      document.getElementById('mp-artist').textContent = 'assets/music/song.mp3';
    });
  }

  function updatePlayIcon(playing) {
    document.querySelector('.icon-play').classList.toggle('hidden', playing);
    document.querySelector('.icon-pause').classList.toggle('hidden', !playing);
  }

  /* -------------------------------------------------------------
     10. GARDEN GROWING ANIMATION (page 4)
  ------------------------------------------------------------- */
  function initGarden() {
    const container = document.getElementById('garden-plants');
    const flowers = ['🌸', '🌷', '🌺', '🌹', '🌻', '🌼'];
    const count = window.innerWidth < 700 ? 5 : 7;
    for (let i = 0; i < count; i++) {
      const plant = document.createElement('div');
      plant.className = 'plant';
      const stemH = 60 + Math.random() * 60;
      plant.innerHTML = `
        <span class="plant-bloom">${flowers[i % flowers.length]}</span>
        <span class="plant-leaf left" style="bottom:${stemH * 0.35}px"></span>
        <span class="plant-leaf right" style="bottom:${stemH * 0.55}px"></span>
        <div class="plant-stem" data-height="${stemH}"></div>
      `;
      container.appendChild(plant);
    }

    let grown = false;
    const section = document.getElementById('page-4');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !grown) {
          grown = true;
          growGarden();
          obs.disconnect();
        }
      });
    }, { threshold: 0.35 });
    obs.observe(section);
  }

  function growGarden() {
    const plants = document.querySelectorAll('.plant');
    if (!window.gsap) {
      plants.forEach((p) => {
        const stem = p.querySelector('.plant-stem');
        stem.style.height = stem.dataset.height + 'px';
        p.querySelector('.plant-bloom').style.opacity = 1;
        p.querySelector('.plant-bloom').style.transform = 'scale(1)';
      });
      return;
    }
    plants.forEach((p, i) => {
      const stem = p.querySelector('.plant-stem');
      const leaves = p.querySelectorAll('.plant-leaf');
      const bloom = p.querySelector('.plant-bloom');
      const tl = gsap.timeline({ delay: i * 0.35 });
      tl.to(stem, { height: stem.dataset.height + 'px', duration: 1, ease: 'power2.out' })
        .to(leaves, { opacity: 1, duration: .5, stagger: .15 }, '-=.4')
        .to(bloom, { opacity: 1, scale: 1, duration: .7, ease: 'back.out(2.5)' }, '-=.2');
    });
  }

  /* -------------------------------------------------------------
     9. PHOTO CAROUSEL — 2 photos per slide, swipe/click through pairs
     Edit this array to swap in your real photos. Put each image file
     next to index.html (or inside a subfolder) and reference it here.
     6 photos = 3 slides of 2. Add/remove entries in pairs to keep every
     slide balanced (an odd last photo will just get a slide to itself).
  ------------------------------------------------------------- */
  const PHOTOS = [
    { src: 'potho1.jpg', caption: 'A moment worth keeping' },
    { src: 'potho2.jpg', caption: 'That smile I adore' },
    { src: 'photo3.jpg', caption: 'One of my favorite days' },
    { src: 'photo4.jpg', caption: 'Us, being us' },
    { src: 'photo5.jpg', caption: 'A memory I replay' },
    { src: 'photo6.jpg', caption: 'Just you and me' },
  ];

  const PHOTOS_PER_SLIDE = 1;
  let carIndex = 0;
  let carSlideCount = 0;

  function initPhotoGrid() {
    const track = document.getElementById('car-track');
    const dotsHolder = document.getElementById('car-dots');
    if (!track) return;

    // cache-buster: forces the browser to always fetch the current file
    // instead of an old cached version with the same filename
    const cacheBust = `?v=${Date.now()}`;

    // group photos into chunks of PHOTOS_PER_SLIDE
    const groups = [];
    for (let i = 0; i < PHOTOS.length; i += PHOTOS_PER_SLIDE) {
      groups.push(PHOTOS.slice(i, i + PHOTOS_PER_SLIDE));
    }
    carSlideCount = groups.length;

    groups.forEach((group) => {
      const slide = document.createElement('div');
      slide.className = 'car-slide';

      group.forEach((photo) => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.innerHTML = `
          <img src="${photo.src}${cacheBust}" alt="${photo.caption}" loading="lazy">
          <span class="photo-caption">${photo.caption}</span>
        `;
        card.addEventListener('click', () => openLightbox(card));
        slide.appendChild(card);
      });
      // if this slide has only one photo (odd photo out), let it fill the row
      if (group.length === 1) slide.querySelector('.photo-card').classList.add('wide');

      track.appendChild(slide);

      const dot = document.createElement('span');
      const dotIndex = dotsHolder.children.length;
      dot.addEventListener('click', () => goToSlide(dotIndex));
      dotsHolder.appendChild(dot);
    });

    const prevBtn = document.querySelector('.car-prev');
    const nextBtn = document.querySelector('.car-next');
    if (prevBtn) prevBtn.addEventListener('click', () => goToSlide(carIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => goToSlide(carIndex + 1));

    document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
    document.getElementById('lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') closeLightbox();
    });

    updateCarousel();
  }

  function goToSlide(i) {
    carIndex = (i + carSlideCount) % carSlideCount;
    updateCarousel();
  }

  function updateCarousel() {
    const track = document.getElementById('car-track');
    track.style.transform = `translateX(-${carIndex * 100}%)`;
    document.querySelectorAll('#car-dots span').forEach((d, i) => d.classList.toggle('active', i === carIndex));
  }

  function openLightbox(card) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const existingImg = card.querySelector('img');
    if (existingImg) {
      img.src = existingImg.src;
      img.style.display = 'block';
    } else {
      img.removeAttribute('src');
      img.style.display = 'none';
    }
    lb.classList.remove('hidden');
  }
  function closeLightbox() { document.getElementById('lightbox').classList.add('hidden'); }

  /* -------------------------------------------------------------
     11. TIMELINE FILL (page 6)
  ------------------------------------------------------------- */
  function initTimeline() {
    const section = document.getElementById('page-6');
    const fill = document.getElementById('timeline-fill');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (window.gsap) gsap.to(fill, { height: '100%', duration: 2.2, ease: 'power2.out' });
          else fill.style.height = '100%';
          obs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(section);
  }

  /* -------------------------------------------------------------
     12. THANK YOU PAGE — flower field burst
  ------------------------------------------------------------- */
  function initThankYouFlowers() {
    const holder = document.querySelector('.thankyou-flowers');
    const section = document.getElementById('page-7');
    let done = false;
    for (let i = 0; i < 26; i++) {
      const s = document.createElement('span');
      s.textContent = FLOWER_EMOJIS[Math.floor(Math.random() * FLOWER_EMOJIS.length)];
      s.style.position = 'absolute';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.fontSize = (14 + Math.random() * 18) + 'px';
      s.style.opacity = '0';
      s.style.filter = 'drop-shadow(0 0 8px rgba(255,143,171,.5))';
      holder.appendChild(s);
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !done) {
          done = true;
          const items = holder.querySelectorAll('span');
          items.forEach((it, i) => {
            if (window.gsap) {
              gsap.to(it, { opacity: 1, y: -12, duration: 1, delay: i * .04, ease: 'power2.out' });
              gsap.to(it, { y: 0, duration: 2, delay: i * .04 + 1, ease: 'sine.inOut', repeat: -1, yoyo: true });
            } else { it.style.opacity = 1; }
          });
          obs.disconnect();
        }
      });
    }, { threshold: 0.25 });
    obs.observe(section);
  }

  /* -------------------------------------------------------------
     13. FINALE — Forever button
  ------------------------------------------------------------- */
  function initFinale() {
    const btn = document.getElementById('btn-forever');
    const overlay = document.getElementById('finale-overlay');
    const line = document.getElementById('finale-line');

    btn.addEventListener('click', () => {
      overlay.classList.remove('hidden');
      requestAnimationFrame(() => overlay.classList.add('show'));
      startFinalePetals();
      if (window.gsap) {
        gsap.to(line, { opacity: 1, scale: 1, duration: 1.4, delay: .6, ease: 'back.out(1.4)' });
      } else {
        line.style.opacity = 1; line.style.transform = 'scale(1)';
      }
    });

    overlay.addEventListener('click', () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.classList.add('hidden'), 900);
    });
  }

  function startFinalePetals() {
    const canvas = document.getElementById('finale-canvas');
    const ctx = canvas.getContext('2d');
    const count = reduceMotion ? 0 : 90;
    // by the time the finale plays, the gift has long been opened, so this
    // always uses the current (rose) palette via makePetal()
    const items = Array.from({ length: count }, () => makePetal(true));
    let frame = 0, running = true;

    function loop() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      items.forEach((p) => {
        p.sway += p.swaySpeed;
        p.x += p.speedX + Math.sin(p.sway) * 0.6;
        p.y += p.speedY;
        p.rotation += p.rotSpeed;
        if (p.y > H + 30) Object.assign(p, makePetal(false), { x: Math.random() * W });
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
        grad.addColorStop(0, `rgba(${p.hue},0.9)`);
        grad.addColorStop(1, `rgba(${p.hue},0.15)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -p.size / 2);
        ctx.bezierCurveTo(p.size / 2, -p.size / 2, p.size / 2, p.size / 2, 0, p.size);
        ctx.bezierCurveTo(-p.size / 2, p.size / 2, -p.size / 2, -p.size / 2, 0, -p.size / 2);
        ctx.fill();
        ctx.restore();
      });
      frame++;
      requestAnimationFrame(loop);
    }
    loop();

    document.getElementById('finale-overlay').addEventListener('click', () => { running = false; }, { once: true });
  }

  /* -------------------------------------------------------------
     BOOTSTRAP
  ------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    // QR landing scene is disabled for now (see qr-scene.html.txt to
    // bring it back once the site has a real deployed URL). For now
    // the experience starts straight at the intro whisper line.
    initMusicPlayer();
    // bokeh (soft glow) is fine to run from the start; the falling petals
    // themselves stay off until the gift box is opened (see
    // startFallingPetals(), triggered inside the gift-box click handler)
    if (!reduceMotion) { drawBokeh(); }
    initMouseGlow();
    startIntro();
  });
})();