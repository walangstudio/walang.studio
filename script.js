/* ================================================================
   walang.studio — retro B&W movie site
   GSAP-powered: grain, flicker, scratch, typewriter, transitions
   ================================================================ */

/* ----------------------------------------------------------------
   0. PLUGIN REGISTRATION
   ---------------------------------------------------------------- */
gsap.registerPlugin(TextPlugin);

/* ----------------------------------------------------------------
   1. CONFIG — single source of truth
   ---------------------------------------------------------------- */
const CONFIG = {
  typewriter: {
    holdDuration:        2.0,   // seconds to hold completed word
    studioHoldDuration: 30.0,   // seconds to hold "studio"
    pauseAfterErase:     0.35,  // seconds before next word
  },
  flicker: {
    maxOpacity:   0.18,
    baseInterval: 0.11,
  },
  scratch: {
    minInterval:  2,    // seconds
    maxInterval:  7,
    duration:     0.55,
  },
  grain: {
    fps:     24,
    opacity: 0.35,
  },
  transition: {
    totalDuration: 1.4,
  },
};

/* ----------------------------------------------------------------
   2. WORDS API
   Fetches from /api/words.php, cycles through two batches.
   ---------------------------------------------------------------- */
const WordsAPI = (() => {
  const _pool = [
    'kwenta','tarabaho','pera','magawa','makain','silbi','dahilan',
    'katuwiran','mahal','bukas','tulong','pangarap','hirap','layunin',
    'kalayaan','saysay','pagasa','lakas','buhay','daan',
  ];

  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function _fallback() {
    const shuffled = _shuffle([..._pool]);
    const count = 10 + Math.floor(Math.random() * 11); // 10–20
    const words = shuffled.slice(0, count);
    words.push('studio');
    return words;
  }

  function fetchWords() {
    return fetch('api/words.php')
      .then(r => r.json())
      .then(data => data.words)
      .catch(_fallback);
  }

  return { fetchWords };
})();

/* ----------------------------------------------------------------
   3. SECTION LOADER
   Lazy-fetches news/apps/games from PHP; caches results.
   ---------------------------------------------------------------- */
const SectionLoader = (() => {
  const _cache = {};

  const RENDERERS = {
    news(data) {
      return data.articles.map(a => `
        <article class="news-item">
          <time class="news-item__date">${a.date}</time>
          <h3 class="news-item__headline">${a.headline}</h3>
          <p class="news-item__body">${a.body}</p>
        </article>
      `).join('');
    },

    apps(data) {
      const cards = data.apps.map(a => `
        <div class="app-card">
          <div class="app-card__id">${a.id}</div>
          <h3 class="app-card__title">${a.title}</h3>
          <p class="app-card__desc">${a.desc}</p>
          <span class="app-card__status">${a.status}</span>
        </div>
      `).join('');
      return `<div class="card-grid">${cards}</div>`;
    },

    games(data) {
      const cards = data.games.map(g => `
        <div class="game-card">
          <div class="game-card__badge">${g.badge}</div>
          <h3 class="game-card__title">${g.title}</h3>
          <p class="game-card__desc">${g.desc}</p>
        </div>
      `).join('');
      return `<div class="card-grid">${cards}</div>`;
    },
  };

  function load(sectionName) {
    if (sectionName === 'home' || sectionName === 'about') return Promise.resolve();
    if (_cache[sectionName]) return Promise.resolve();

    const contentEl = document.getElementById(sectionName + '-content');
    if (!contentEl) return Promise.resolve();

    return fetch('api/' + sectionName + '.php')
      .then(r => r.json())
      .then(data => {
        _cache[sectionName] = true;
        contentEl.innerHTML = RENDERERS[sectionName](data);

        // Stagger-fade cards/items in after content is injected
        const items = contentEl.querySelectorAll(
          '.news-item, .app-card, .game-card, .about-card'
        );
        gsap.fromTo(items,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power1.out' }
        );
      })
      .catch(() => {
        contentEl.innerHTML = '<p class="section__loading">[ dispatch unavailable ]</p>';
      });
  }

  return { load };
})();

/* ----------------------------------------------------------------
   4. FILM GRAIN — canvas RAF loop at 24 fps
   ---------------------------------------------------------------- */
const FilmGrain = (() => {
  const canvas  = document.getElementById('grain-canvas');
  const ctx     = canvas.getContext('2d');
  let   lastTime = 0;
  const interval = 1000 / CONFIG.grain.fps;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const img = ctx.createImageData(w, h);
    const d   = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v  = (Math.random() * 255) | 0;
      d[i]     = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 160; // ~63% per-pixel alpha; canvas opacity does the rest
    }
    ctx.putImageData(img, 0, 0);
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    if (ts - lastTime < interval) return;
    lastTime = ts;
    draw();
  }

  function setIntensity(val) {
    canvas.style.opacity = val;
  }

  function start() {
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(loop);
  }

  return { start, setIntensity };
})();

/* ----------------------------------------------------------------
   5. FLICKER — irregular GSAP timeline on #flicker-overlay
   ---------------------------------------------------------------- */
const Flicker = (() => {
  const el = document.getElementById('flicker-overlay');
  let tl   = null;

  function buildTimeline() {
    tl = gsap.timeline({ repeat: -1 });
    for (let i = 0; i < 50; i++) {
      const opacity  = Math.random() < 0.82
        ? 0
        : Math.random() * CONFIG.flicker.maxOpacity;
      const duration = CONFIG.flicker.baseInterval + (Math.random() - 0.5) * 0.07;
      tl.to(el, { opacity, duration, ease: 'none' });
    }
  }

  function start()  { buildTimeline(); }
  function pause()  { tl && tl.pause(); }
  function resume() { tl && tl.resume(); }

  function intensify() {
    if (tl) tl.pause();
    gsap.to(el, {
      opacity: 0.22,
      duration: 0.04,
      yoyo: true,
      repeat: 10,
      ease: 'none',
      onComplete: () => {
        gsap.set(el, { opacity: 0 });
        if (tl) tl.restart();
      },
    });
  }

  return { start, pause, resume, intensify };
})();

/* ----------------------------------------------------------------
   6. FILM SCRATCH — random vertical line appearances
   ---------------------------------------------------------------- */
const FilmScratch = (() => {
  const el = document.getElementById('film-scratch');
  let   timerId = null;

  function schedule() {
    const delay = (CONFIG.scratch.minInterval +
      Math.random() * (CONFIG.scratch.maxInterval - CONFIG.scratch.minInterval)) * 1000;
    timerId = setTimeout(show, delay);
  }

  function show() {
    const x = 30 + Math.random() * (window.innerWidth - 60);
    gsap.set(el, { left: x, opacity: 0 });
    gsap.timeline({ onComplete: schedule })
      .to(el, { opacity: 1, duration: 0.03, ease: 'none' })
      .to(el, { opacity: 0.65, duration: CONFIG.scratch.duration * 0.55, ease: 'power1.out' })
      .to(el, { opacity: 0, duration: CONFIG.scratch.duration * 0.45, ease: 'power2.in' });
  }

  function start() { schedule(); }

  function burst() {
    clearTimeout(timerId);
    let count = 0;
    const id = setInterval(() => {
      show();
      if (++count >= 4) {
        clearInterval(id);
        schedule();
      }
    }, 110);
  }

  return { start, burst };
})();

/* ----------------------------------------------------------------
   7. CURSOR — GSAP-driven blink on #hero-cursor
   ---------------------------------------------------------------- */
const Cursor = (() => {
  const el = document.getElementById('hero-cursor');
  let   tl = null;

  function start() {
    if (tl) { tl.restart(); return; }
    tl = gsap.timeline({ repeat: -1 })
      .set(el,  { opacity: 1 })
      .to(el,   { opacity: 1, duration: 0.42, ease: 'none' })
      .to(el,   { opacity: 0, duration: 0.01, ease: 'none' })
      .to(el,   { opacity: 0, duration: 0.40, ease: 'none' })
      .to(el,   { opacity: 1, duration: 0.01, ease: 'none' });
  }

  function solid() {
    if (tl) tl.pause();
    gsap.set(el, { opacity: 1 });
  }

  function blink() {
    if (tl) tl.restart();
    else start();
  }

  function hide() {
    if (tl) tl.pause();
    gsap.set(el, { opacity: 0 });
  }

  return { start, solid, blink, hide };
})();

/* ----------------------------------------------------------------
   8. TYPEWRITER — drives #dynamic-word with TextPlugin
   ---------------------------------------------------------------- */
const Typewriter = (() => {
  const el     = document.getElementById('dynamic-word');
  let   words  = [];
  let   index  = 0;
  let   active = false;

  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function typeWord(word) {
    Cursor.solid();
    el.textContent = '';
    for (const char of word) {
      if (!active) return;
      // ~5% chance of a brief hesitation between keystrokes
      const delay = Math.random() < 0.05
        ? 200 + Math.random() * 200
        : 65  + Math.random() * 95;
      await wait(delay);
      el.textContent += char;
    }
  }

  async function eraseWord() {
    Cursor.solid();
    while (el.textContent.length > 0) {
      if (!active) return;
      await wait(35 + Math.random() * 45);
      el.textContent = el.textContent.slice(0, -1);
    }
  }

  async function loop() {
    while (active) {
      if (index >= words.length) {
        words = await WordsAPI.fetchWords();
        index = 0;
      }

      const word = words[index++];
      const hold = word === 'studio'
        ? CONFIG.typewriter.studioHoldDuration * 1000
        : CONFIG.typewriter.holdDuration * 1000;

      await typeWord(word);
      if (!active) break;

      Cursor.blink();
      await wait(hold);
      if (!active) break;

      await eraseWord();
      await wait(CONFIG.typewriter.pauseAfterErase * 1000);
    }
  }

  async function start() {
    active = true;
    words  = await WordsAPI.fetchWords();
    index  = 0;
    loop();
  }

  function pause()  { active = false; }
  function resume() { active = true; loop(); }

  return { start, pause, resume };
})();

/* ----------------------------------------------------------------
   9. FILM TRANSITION — fast-forward / rewind effect between sections
   ---------------------------------------------------------------- */
const FilmTransition = (() => {
  const flash     = document.getElementById('flash-overlay');
  const scanlines = document.querySelector('.overlay--scanlines');

  function play(fromSection, toSection) {
    return new Promise(resolve => {
      const tl = gsap.timeline({ onComplete: resolve });

      // ── Pre-flash: grain spikes, scanlines thicken, old section exits ──
      tl.to('.overlay--grain', { opacity: 0.58, duration: 0.17 }, 0);
      tl.to(scanlines, { opacity: 0.88, duration: 0.14 }, 0);
      tl.to(fromSection, {
        y: -38,
        opacity: 0,
        filter: 'blur(5px)',
        duration: 0.17,
        ease: 'power2.in',
      }, 0);
      tl.call(() => {
        Flicker.intensify();
        FilmScratch.burst();

        if (fromSection.id === 'section-home') {
          Typewriter.pause();
          Cursor.hide();
        }
      }, null, 0);

      // ── White flash ──
      tl.to(flash, { opacity: 1, duration: 0.06, ease: 'power3.in' }, 0.17);

      // ── Behind the flash: prepare new section ──
      tl.call(() => {
        gsap.set(toSection, { opacity: 0, y: 28, filter: 'blur(0px)' });
        toSection.classList.add('section--active');
      }, null, 0.20);

      // ── Flash fades ──
      tl.to(flash, { opacity: 0, duration: 0.15, ease: 'power2.out' }, 0.23);

      // ── Grain and scanlines settle ──
      tl.to('.overlay--grain', { opacity: CONFIG.grain.opacity, duration: 0.38 }, 0.24);
      tl.to(scanlines, { opacity: 1, duration: 0.32 }, 0.24);

      // ── New section drifts in ──
      tl.to(toSection, {
        opacity: 1,
        y: 0,
        duration: 0.30,
        ease: 'power1.out',
      }, 0.27);

      // ── Remove departed section ──
      tl.call(() => {
        fromSection.classList.remove('section--active');
        gsap.set(fromSection, { y: 0, opacity: 0, filter: 'none' });
      }, null, 0.29);

      // ── ScrambleText on intertitle ──
      const intertitleText = toSection.querySelector('.intertitle__text');
      if (intertitleText) {
        const original = intertitleText.textContent;
        tl.call(() => { intertitleText.textContent = ''; }, null, 0.27);
        tl.to(intertitleText, {
          duration: 0.62,
          text: { value: original, delimiter: '' },
          ease: 'none',
        }, 0.43);
      }

      // ── Resume home effects if returning ──
      tl.call(() => {
        if (toSection.id === 'section-home') {
          Typewriter.resume();
          Cursor.start();
        }
      }, null, CONFIG.transition.totalDuration);

    }); // end Promise
  }

  return { play };
})();

/* ----------------------------------------------------------------
   10. NAVIGATION — wires up nav links, manages section state
   ---------------------------------------------------------------- */
const Nav = (() => {
  const links   = document.querySelectorAll('.film-nav__link');
  let   current = 'home';
  let   locked  = false;

  function getSection(name) {
    return document.getElementById('section-' + name);
  }

  function setActiveLink(name) {
    links.forEach(l =>
      l.classList.toggle('film-nav__link--active', l.dataset.target === name)
    );
  }

  async function navigateTo(target) {
    if (locked || target === current) return;
    locked = true;

    // Start loading content early (so it's ready after the flash)
    SectionLoader.load(target);

    const fromSection = getSection(current);
    const toSection   = getSection(target);

    await FilmTransition.play(fromSection, toSection);

    setActiveLink(target);
    current = target;
    locked  = false;
  }

  function init() {
    links.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(link.dataset.target);
      });
    });
  }

  return { init };
})();

/* ----------------------------------------------------------------
   11. INIT
   ---------------------------------------------------------------- */
function init() {
  FilmGrain.start();
  Flicker.start();
  FilmScratch.start();
  Cursor.start();

  // Home section starts active, visible
  gsap.set('#section-home', { opacity: 1 });

  // Typewriter kicks off (fetches first batch then loops)
  Typewriter.start();

  // Wire nav
  Nav.init();
}

document.addEventListener('DOMContentLoaded', init);
