document.documentElement.classList.add('js');

/* ============================================================
   Cielo animado: estrellas que titilan + estrellas fugaces
   ============================================================ */
(function () {
  var canvas = document.getElementById('cielo');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, stars = [], shots = [], lastT = 0, shotAt = 0, raf = null;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function makeStars() {
    var n = Math.min(280, Math.floor(W * H / 6500));
    stars = [];
    for (var i = 0; i < n; i++) {
      var roll = Math.random();
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(0.4, 1.5),
        a: rand(0.25, 0.85),
        tw: rand(0.4, 1.6),          // velocidad de titileo
        ph: rand(0, Math.PI * 2),    // fase
        vy: rand(1.5, 6),            // deriva vertical lenta
        c: roll < 0.12 ? '245,194,231'   // rosa
         : roll < 0.26 ? '166,227,255'   // celeste
         : roll < 0.36 ? '180,190,254'   // lavanda
         : '255,255,255'
      });
    }
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
    if (reduce) drawStatic();
  }

  function drawStatic() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = s.a;
      ctx.fillStyle = 'rgb(' + s.c + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.2832);
      ctx.fill();
      if (s.r > 1.1) {
        ctx.globalAlpha = s.a * 0.16;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3.2, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function spawnShot(t) {
    var dir = Math.random() < 0.5 ? 1 : -1;   // hacia la derecha o la izquierda
    var rad = rand(18, 38) * Math.PI / 180;
    var speed = rand(420, 820);
    shots.push({
      x: dir === 1 ? rand(-60, W * 0.55) : rand(W * 0.45, W + 60),
      y: rand(-40, H * 0.45),
      vx: Math.cos(rad) * speed * dir,
      vy: Math.sin(rad) * speed,
      len: rand(90, 170),
      life: 0,
      max: rand(0.9, 1.6)
    });
    shotAt = t + rand(1800, 5200);            // próxima fugaz
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (!lastT) lastT = t;
    var dt = (t - lastT) / 1000;
    lastT = t;
    if (dt > 0.1) dt = 0.016;

    ctx.clearRect(0, 0, W, H);
    var tt = t / 1000;

    // estrellas
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.y -= s.vy * dt;
      if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
      var a = s.a * (0.45 + 0.55 * Math.sin(tt * s.tw * 2 + s.ph));
      var va = a < 0.05 ? 0.05 : a;
      ctx.globalAlpha = va;
      ctx.fillStyle = 'rgb(' + s.c + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.2832);
      ctx.fill();
      if (s.r > 1.1) {
        ctx.globalAlpha = va * 0.16;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3.2, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // fugaces
    if (t >= shotAt && shots.length < 3) spawnShot(t);
    for (var j = shots.length - 1; j >= 0; j--) {
      var sh = shots[j];
      sh.life += dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      if (sh.life > sh.max || sh.y > H + 120 || sh.x < -220 || sh.x > W + 220) {
        shots.splice(j, 1);
        continue;
      }
      var sp = Math.hypot(sh.vx, sh.vy);
      var tx = sh.x - sh.vx / sp * sh.len;
      var ty = sh.y - sh.vy / sp * sh.len;
      var fade = Math.min(1, sh.life * 3, (sh.max - sh.life) * 2);
      if (fade < 0) fade = 0;
      var g = ctx.createLinearGradient(sh.x, sh.y, tx, ty);
      g.addColorStop(0, 'rgba(255,255,255,' + 0.95 * fade + ')');
      g.addColorStop(0.35, 'rgba(245,194,231,' + 0.55 * fade + ')');
      g.addColorStop(1, 'rgba(245,194,231,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sh.x, sh.y, 1.7, 0, 6.2832);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  if (!reduce) {
    shotAt = performance.now() + 1400;
    raf = requestAnimationFrame(frame);
    // pausar cuando la pestaña no se ve (ahorra batería)
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
      } else {
        lastT = 0;
        if (!raf) raf = requestAnimationFrame(frame);
      }
    });
  }
})();

/* ============================================================
   Máquina de escribir en el subtítulo del hero
   ============================================================ */
(function () {
  var el = document.getElementById('typeline');
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var txt = el.textContent;
  el.textContent = '';
  var i = 0;
  setTimeout(function step() {
    i++;
    el.textContent = txt.slice(0, i);
    if (i < txt.length) setTimeout(step, 30 + Math.random() * 50);
  }, 600);
})();

/* ============================================================
   Reveals al scrollear (con stagger por grupo)
   ============================================================ */
(function () {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function (e) { e.classList.add('in'); });
    return;
  }
  document.querySelectorAll('[data-stagger]').forEach(function (g) {
    g.querySelectorAll('.reveal').forEach(function (el, i) {
      el.style.setProperty('--rd', (i * 90) + 'ms');
    });
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (e) { io.observe(e); });
})();

/* ============================================================
   Nav: blur al scrollear, menú móvil y link activo
   ============================================================ */
(function () {
  var nav = document.getElementById('nav');
  if (!nav) return;
  var burger = document.getElementById('burger');

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (burger) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
  }

  var links = nav.querySelectorAll('.links a[href^="#"]');
  var map = {};
  links.forEach(function (a) {
    map[a.getAttribute('href').slice(1)] = a;
    a.addEventListener('click', function () {
      nav.classList.remove('open');
      if (burger) burger.setAttribute('aria-expanded', 'false');
    });
  });

  // scroll-spy: resalta la sección visible
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && map[en.target.id]) {
        links.forEach(function (a) { a.classList.remove('active'); });
        map[en.target.id].classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  Object.keys(map).forEach(function (id) {
    var sec = document.getElementById(id);
    if (sec) spy.observe(sec);
  });
})();

/* Año del footer siempre actualizado */
(function () {
  var y = document.getElementById('anio');
  if (y) y.textContent = new Date().getFullYear();
})();
