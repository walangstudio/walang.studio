// tv2.js — walang.studio TV v2.1
// Hero = dead channel + original typewriter. Scroll fast-forwards the words and
// pulls volume down to 1-2 bars (never muted); last word + scroll → SMPTE.
// SMPTE: scroll up raises volume to "normal" then flips back to the dead channel.
(function () {
  const TV = (window.TV = window.TV || {});
  const $ = (s, r = document) => r.querySelector(s);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lerp = (a, b, t) => a + (b - a) * t;

  const audio = TV.audio;
  const heroNoise = new TV.TVNoise($('#hero-noise'), { scale: 3 });
  const fxNoise = new TV.TVNoise($('#fx-noise'), { scale: 3 });
  const fxCanvas = $('#fx-noise');
  const vhsGrain = new TV.TVNoise($('#vhs-grain'), { scale: 2 });
  const vhsGrainCanvas = $('#vhs-grain');

  const ORDER = ['ch-hero', 'ch-menu', 'ch-games', 'ch-apps', 'ch-contact', 'ch-code', 'ch-team'];
  const PAGES = [];                                   // VHS tapes (none active yet)
  const OFFAIR = ['ch-404'];                          // no-signal: errors / under construction
  const SCROLL = ['ch-games', 'ch-apps'];             // commercial / shopping — native scroll
  const SIMPLE = ['ch-contact', 'ch-code', 'ch-team']; // scroll-up returns to menu
  const CARTOON = ['ch-contact'];
  // realistic input labels
  const CH_LABEL = { 'ch-hero': 'CH 03', 'ch-menu': 'AUX', 'ch-games': 'VIDEO 1', 'ch-apps': 'VIDEO 2', 'ch-contact': 'VIDEO 4', 'ch-code': 'INFO', 'ch-team': 'VIDEO 3', 'ch-404': 'VIDEO 5' };

  // volume landmarks (logical 0..1; the audio engine caps real output at "normal")
  const VOL_BASE = 0.5;   // normal static on the dead channel
  const VOL_LOW = 0.12;   // 1-2 bars — what you arrive at SMPTE with
  const VOL_MENU_MAX = 1.0; // "full" on the TV scale — engine caps real loudness at ~half

  const state = { current: 'ch-hero', transitioning: false, chOsd: true, volOsd: true };

  /* ================= OSD ================= */
  const osdCh = $('#osd-ch');
  function showChOsd(id) {
    if (!state.chOsd) return;
    osdCh.textContent = CH_LABEL[id] || '--';
    osdCh.classList.add('show');
    clearTimeout(showChOsd._t);
    // real sets hold the channel/input OSD ~3–5s after a change
    showChOsd._t = setTimeout(() => osdCh.classList.remove('show'), 4500);
  }

  const osdVol = $('#osd-vol');
  const VOL_BLOCKS = 12;
  function showVolOsd() {
    if (!state.volOsd) return;
    const filled = Math.max(1, Math.round(audio.master * VOL_BLOCKS));
    let html = 'VOL&nbsp;&nbsp;';
    for (let i = 0; i < VOL_BLOCKS; i++) html += '<span class="vb' + (i < filled ? ' fill' : '') + '"></span>';
    osdVol.innerHTML = html;
    osdVol.classList.add('show');
    clearTimeout(showVolOsd._t);
    showVolOsd._t = setTimeout(() => osdVol.classList.remove('show'), 1100);
  }

  /* ================= channel switching ================= */
  function setActive(toId) {
    // toggle across ALL channels, not just ORDER — OFFAIR (ch-404) and PAGES
    // live outside ORDER and must still be able to show.
    document.querySelectorAll('.channel').forEach((c) => c.classList.toggle('active', c.id === toId));
    const prev = state.current;
    state.current = toId;
    if (prev === 'ch-hero') hero.leave();
    if (prev === 'ch-menu') menu.leave();
    if (OFFAIR.includes(prev)) offair.leave(prev);
    if (prev === 'ch-team') credits.leave();
    if (toId === 'ch-hero') hero.enter();
    if (toId === 'ch-menu') menu.enter();
    if (OFFAIR.includes(toId)) offair.enter(toId);
    if (CARTOON.includes(toId)) audio.sting();
    if (toId === 'ch-team') credits.enter();
    if (SCROLL.includes(toId)) scroller.reset();
    const isTape = PAGES.includes(toId);
    vhsChrome.set(isTape, toId);
    if (isTape) pages.reset(toId);
  }

  async function changeChannel(toId) {
    if (state.transitioning || toId === state.current) return;
    state.transitioning = true;
    audio.click();
    audio.burst(0.42);
    fxNoise.start();
    fxCanvas.style.opacity = '1';
    await sleep(160);
    setActive(toId);
    showChOsd(toId);
    await sleep(190);
    fxCanvas.style.opacity = '0';
    await sleep(60);
    fxNoise.stop();
    const el = $('#' + toId);
    el.classList.add('settle');
    setTimeout(() => el.classList.remove('settle'), 470);
    await sleep(220);
    state.transitioning = false;
  }
  TV.changeChannel2 = changeChannel;

  /* ================= WORDS API (ported from original script.js) ============ */
  const WordsAPI = (() => {
    const _pool = [
      'kwenta','trabaho','pera','magawa','makain','silbi','dahilan',
      'katuwiran','kinabukasan','katinuan','tulong','pangarap','masabi','layunin',
      'kalayaan','saysay','pag-asa','lakas','buhay','patutunguhan',
      'tulugan','galang','emosyon','kasama','karapatan','pagkakataon',
      'tulog','hiya','utang na loob','ambag','boses','malay','knowledge','power','modo',
    ];
    function _shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    function _fallback() {
      const words = _shuffle([..._pool]).slice(0, 10 + Math.floor(Math.random() * 11));
      words.push('studio');
      return words;
    }
    function fetchWords() {
      return fetch('/api/words')
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then((data) => {
          if (!Array.isArray(data.data) || data.data.length < 10) throw new Error();
          const pool = _shuffle(data.data.map((w) => w.text));
          const words = pool.slice(0, 10 + Math.floor(Math.random() * 11));
          words.push('studio');
          return words;
        })
        .catch(_fallback);
    }
    return { fetchWords };
  })();

  /* ================= HERO — typewriter on the dead channel ================= */
  const hero = (function () {
    const dynEl = $('#dynamic-word');
    const lineEl = $('#hero-line');
    let words = [], index = 0, active = false, runId = 0;
    let ffQueue = 0;     // words still to fast-forward through (scroll-driven)
    let endReady = false; // last word ('studio') fully typed
    let endReadyAt = 0;   // when it finished typing — enforces a small pause
    let endAcc = 0;       // scroll steps counted once the volume has drained
    let acc = 0, upAcc = 0;
    let startVol = VOL_BASE; // volume when the cycle began — fades from here to VOL_LOW

    const ff = () => ffQueue > 0;
    const spd = () => (ff() ? 13 : 1);
    const wait = (ms) => sleep(ms / spd());

    function setTyping(on) { lineEl.classList.toggle('typing', on); }

    function volForProgress() {
      if (words.length < 2) return;
      audio.setMaster(lerp(startVol, VOL_LOW, index / (words.length - 1)), 0.15);
      showVolOsd(); // make the lowering visible while the words rush by
    }

    // hold that can be cut short by scrolling or channel change
    async function holdWait(ms, myRun) {
      const t0 = performance.now();
      while (active && runId === myRun && performance.now() - t0 < ms) {
        if (ff()) return;
        await sleep(90);
      }
    }

    async function typeWord(word, myRun) {
      setTyping(true);
      dynEl.textContent = '';
      for (const char of word) {
        if (!active || runId !== myRun) return false;
        const delay = Math.random() < 0.05 ? 200 + Math.random() * 200 : 65 + Math.random() * 95;
        await wait(delay);
        if (!active || runId !== myRun) return false;
        dynEl.textContent += char;
      }
      setTyping(false);
      return true;
    }

    async function eraseWord(myRun) {
      setTyping(true);
      while (dynEl.textContent.length > 0) {
        if (!active || runId !== myRun) return false;
        await wait(35 + Math.random() * 45);
        dynEl.textContent = dynEl.textContent.slice(0, -1);
      }
      return true;
    }

    async function loop(myRun) {
      while (active && runId === myRun) {
        if (index >= words.length) {
          words = await WordsAPI.fetchWords();
          index = 0;
        }
        const word = words[index];
        const isLast = index === words.length - 1;

        if (!(await typeWord(word, myRun))) return;
        if (ff()) volForProgress();

        if (isLast) { endReady = true; endReadyAt = performance.now(); endAcc = 0; }
        await holdWait(isLast ? 30000 : 2000, myRun);
        if (!active || runId !== myRun) return;
        if (isLast && ff()) { endReady = true; return; } // parked on the end, waiting for the final scrolls

        endReady = isLast ? endReady : false;
        if (!(await eraseWord(myRun))) return;
        endReady = false;
        index++;
        if (ff()) { ffQueue--; volForProgress(); }
        await wait(350);
      }
    }

    function onWheel(dy) {
      if (dy > 0) {
        acc += dy;
        const STEP = 55;
        while (acc >= STEP) {
          acc -= STEP;
          if (endReady) {
            // small pause at "walang studio" — scrolls during it are swallowed,
            // giving a beat to settle before anything else can happen
            if (performance.now() - endReadyAt < 700) { acc = 0; return; }
            // any remaining volume drains to 1-2 ticks first…
            if (audio.master > VOL_LOW + 0.01) {
              audio.setMaster(Math.max(VOL_LOW, audio.master - 0.07), 0.12);
              showVolOsd();
            } else {
              // …then 2 deliberate scroll steps flip the channel
              endAcc++;
              if (endAcc >= 2) {
                acc = 0; ffQueue = 0; endAcc = 0;
                changeChannel('ch-menu');
                return;
              }
            }
          } else if (ffQueue < words.length - 1 - index) {
            ffQueue++;
          }
        }
      } else if (dy < 0) {
        acc = 0; endAcc = 0;
        if (ffQueue > 0) { ffQueue = Math.max(0, ffQueue - 2); return; }
        // scroll up on the dead channel = volume up, capped at the TV's full
        // (real loudness is capped at a comfortable level by the audio engine)
        upAcc += -dy;
        while (upAcc >= 50) {
          upAcc -= 50;
          audio.setMaster(Math.min(1, audio.master + 0.06));
          startVol = audio.master; // future fast-forward fades start from here
          showVolOsd();
        }
      }
    }

    return {
      enter() {
        active = true; runId++; ffQueue = 0; endReady = false; endAcc = 0; acc = 0; upAcc = 0;
        // the cycle always refreshes from the start with a fresh word set,
        // at whatever volume the viewer arrived with (full, after the menu)
        index = 0; words = [];
        startVol = Math.max(audio.master, VOL_BASE);
        heroNoise.start();
        audio.setHiss(true);
        (async () => {
          words = await WordsAPI.fetchWords();
          loop(runId);
        })();
      },
      leave() {
        active = false; runId++;
        setTyping(false);
        heroNoise.stop();
        audio.setHiss(false);
      },
      onWheel,
    };
  })();
  TV.hero2 = hero;

  /* ================= SMPTE MENU ================= */
  const menu = (function () {
    const root = $('#ch-menu');
    const bars = Array.from(root.querySelectorAll('.navbar-bar'));
    let active = false, volAcc = 0;

    bars.forEach((b) => {
      b.addEventListener('click', () => { if (active && !state.transitioning) changeChannel(b.dataset.target); });
    });

    // Hover is computed GEOMETRICALLY from the pointer position — the bars are
    // fixed rectangles that never move, so the reveal animation (which slides
    // elements out from under a stationary cursor) can never fire a spurious
    // mouseleave and snap the menu shut.
    function hitBar(x, y) {
      for (const b of bars) {
        const r = b.getBoundingClientRect();
        if (x >= r.left && x < r.right && y >= r.top && y < r.bottom) return b;
      }
      return null;
    }
    window.addEventListener('pointermove', (e) => {
      if (!active) return;
      reveal.setHover(hitBar(e.clientX, e.clientY));
    }, { passive: true });
    document.addEventListener('pointerout', (e) => {
      if (!active) return;
      if (!e.relatedTarget) reveal.setHover(null); // pointer left the window
    });

    // rAF-driven reveal manager — one bar open at a time, and every animation
    // plays out fully: an opening always completes before it may close; moving
    // to a new bar closes the old one first (fast, eased), then opens the new.
    const reveal = (function () {
      let raf = 0, cur = null, hoverBar = null;
      const E = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic
      function setT(b, p) {
        const f1 = E(Math.min(1, p));
        const f2 = E(Math.max(0, p - 1));
        b.querySelector('.bar-color').style.transform = 'translateX(' + (-101 * f1).toFixed(2) + '%)';
        b.querySelector('.vwrap').style.transform = 'translateY(' + (100 * (1 - f2)).toFixed(2) + '%)';
      }
      function loop() {
        raf = 0;
        if (!cur) {
          if (hoverBar) { cur = { bar: hoverBar, p: 0, phase: 'open', t: performance.now() }; }
          else return;
        }
        const now = performance.now();
        const dt = Math.min(0.05, (now - cur.t) / 1000); cur.t = now;
        if (cur.phase === 'open') {
          // slide-left 0.3s, then word rises 0.34s — always runs to completion
          const rate = cur.p < 1 ? 1 / 0.3 : 1 / 0.34;
          cur.p = Math.min(2, cur.p + rate * dt);
          setT(cur.bar, cur.p);
          if (cur.p >= 2) cur.phase = 'hold';
        } else if (cur.phase === 'hold') {
          if (hoverBar !== cur.bar) cur.phase = 'close';
          else { raf = 0; return; } // parked — sleep until mouse moves (kick())
        } else { // close — fast but eased: word drops 0.14s, color returns 0.2s
          const rate = cur.p > 1 ? 1 / 0.14 : 1 / 0.2;
          cur.p = Math.max(0, cur.p - rate * dt);
          setT(cur.bar, cur.p);
          if (cur.p <= 0) cur = null; // fully closed — next loop may open hoverBar
        }
        raf = requestAnimationFrame(loop);
      }
      function kick() { if (!raf) raf = requestAnimationFrame(loop); }
      return {
        setHover(b) {
          if (hoverBar === b) return;
          hoverBar = b;
          kick();
        },
        closeAll() {
          hoverBar = null;
          cancelAnimationFrame(raf); raf = 0;
          if (cur) { cur = null; }
          bars.forEach((b) => {
            b.querySelector('.bar-color').style.transform = '';
            b.querySelector('.vwrap').style.transform = '';
          });
        },
      };
    })();

    function closeAll() { reveal.closeAll(); }

    // size each sideways word so it spans the bar's height AND its stroke
    // thickness fills the bar's width (Anton caps ≈ 0.72em tall)
    function fitLabels() {
      bars.forEach((b) => {
        const label = b.querySelector('.vlabel');
        if (!label) return;
        const w = b.clientWidth, h = b.clientHeight;
        if (!w || !h) return;
        label.style.transform = 'none';
        label.style.fontSize = '100px';
        const tw = label.getBoundingClientRect().width || 1;
        const fs = (h * 0.92) / (tw / 100);
        label.style.fontSize = fs + 'px';
        const cap = fs * 0.72;
        const sy = Math.min(3, Math.max(1, (w * 0.95) / cap));
        label.style.transform =
          'translate(-50%, -50%) rotate(-90deg) scaleY(' + sy.toFixed(3) + ')';
      });
    }
    window.addEventListener('resize', fitLabels);
    // fonts load late — refit when Anton arrives
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLabels);

    function onWheel(dy) {
      if (dy < 0) {
        volAcc += -dy;
        const STEP = 50;
        while (volAcc >= STEP) {
          volAcc -= STEP;
          audio.setMaster(Math.min(VOL_MENU_MAX, audio.master + 0.06));
          showVolOsd();
          if (audio.master >= VOL_MENU_MAX - 0.001) {
            volAcc = 0;
            changeChannel('ch-hero');
            return;
          }
        }
      } else if (dy > 0) {
        volAcc = 0;
        audio.setMaster(Math.max(0.05, audio.master - 0.05));
        showVolOsd();
      }
    }

    let sel = -1;
    return {
      step(d) {
        if (!active) return;
        sel = Math.max(0, Math.min(bars.length - 1, sel < 0 ? (d > 0 ? 0 : bars.length - 1) : sel + d));
        reveal.setHover(bars[sel]);
      },
      activate() { if (active && sel >= 0 && !state.transitioning) changeChannel(bars[sel].dataset.target); },
      enter() {
        active = true; volAcc = 0; sel = -1;
        closeAll();
        fitLabels();
        audio.setBeep(true);
      },
      leave() {
        active = false;
        closeAll();
        audio.setBeep(false);
      },
      onWheel,
    };
  })();
  TV.menu2 = menu;

  /* ================= VHS chrome — tape grain + counter ================= */
  const vhsChrome = (function () {
    const timers = {};
    let int = 0;
    function fmt(s) {
      return 'SP ' + Math.floor(s / 3600) + ':' +
        String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }
    function set(on, id) {
      clearInterval(int);
      if (on) {
        vhsGrain.start();
        vhsGrainCanvas.style.opacity = '0.08';
        const el = $('#' + id + ' [data-counter]');
        if (el) el.textContent = fmt(timers[id] || 0);
        int = setInterval(() => {
          timers[id] = (timers[id] || 0) + 1;
          const c = $('#' + id + ' [data-counter]');
          if (c) c.textContent = fmt(timers[id]);
        }, 1000);
      } else {
        vhsGrain.stop();
        vhsGrainCanvas.style.opacity = '0';
      }
    }
    return { set };
  })();

  /* ============ SIMPLE channels (about/contact/code/team) — scroll up = menu */
  const simple = (function () {
    let upAcc = 0;
    function onWheel(e) {
      if (e.deltaY < 0) {
        upAcc += -e.deltaY;
        if (upAcc > 200) { upAcc = 0; changeChannel('ch-menu'); }
      } else { upAcc = 0; }
    }
    function reset() { upAcc = 0; }
    return { onWheel, reset };
  })();

  /* ============ TEAM — end-credits crawl ============ */
  const credits = (function () {
    const roll = $('#ch-team [data-credits]');
    function enter() {
      if (!roll) return;
      roll.classList.remove('run');
      void roll.offsetWidth;
      const dur = Math.max(14, (roll.scrollHeight + window.innerHeight) / 80); // ~80px/s
      roll.style.animationDuration = dur + 's';
      roll.style.animationIterationCount = 'infinite';
      roll.classList.add('run');
    }
    function leave() { if (roll) roll.classList.remove('run'); }
    return { enter, leave };
  })();

  /* ============ teletext clock ============ */
  (function ttClock() {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const el = $('#ch-code [data-ttclock]');
    if (!el) return;
    const p = (n) => String(n).padStart(2, '0');
    setInterval(() => {
      const d = new Date();
      el.textContent = days[d.getDay()] + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    }, 1000);
  })();

  /* ============ NO SIGNAL channels — blue back, muted, nothing playing ===== */  const offair = (function () {
    let upAcc = 0;
    function enter() {
      upAcc = 0;
      // blue-back behavior: the set mutes itself on an empty input — silence
    }
    function leave() {}
    function onWheel(e) {
      if (e.deltaY < 0) {
        upAcc += -e.deltaY;
        if (upAcc > 200) { upAcc = 0; changeChannel('ch-menu'); }
      } else {
        upAcc = 0;
      }
    }
    return { enter, leave, onWheel };
  })();

  /* ============ SCROLL channels (games/apps) — native scroll, up-at-top=menu */
  const scroller = (function () {
    let upAcc = 0;
    function region() { return $('#' + state.current + ' .scroll-region'); }
    function onWheel(e) {
      const sc = region();
      if (!sc) return;
      const atTop = sc.scrollTop <= 1;
      if (e.deltaY < 0 && atTop) {
        e.preventDefault();
        upAcc += -e.deltaY;
        if (upAcc > 220) { upAcc = 0; changeChannel('ch-menu'); }
      } else {
        upAcc = 0; // let the page scroll natively
      }
    }
    function reset() { upAcc = 0; const sc = region(); if (sc) sc.scrollTop = 0; }
    return { onWheel, reset };
  })();

  /* ============ shopping-channel clock ============ */
  (function shopClock() {
    const el = $('#ch-apps [data-shopclock]');
    if (!el) return;
    const p = (n) => String(n).padStart(2, '0');
    setInterval(() => {
      const d = new Date();
      el.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }, 1000);
  })();

  /* ================= CONTENT PAGES — in-tape pagination ================= */
  const pages = (function () {
    const map = {};
    PAGES.forEach((id) => {
      const root = $('#' + id);
      map[id] = {
        root,
        pages: Array.from(root.querySelectorAll('.vhs-page')),
        ind: root.querySelector('[data-ind]'),
        idx: 0,
      };
    });
    function show(id, idx) {
      const m = map[id]; if (!m) return;
      m.idx = idx;
      m.pages.forEach((p, i) => p.classList.toggle('active', i === idx));
      if (m.ind) m.ind.textContent = 'INDEX ' + (idx + 1) + '/' + m.pages.length;
      fit(id);
    }
    // scale the page content down when the viewport is too short for it
    function fit(id) {
      const m = map[id]; if (!m) return;
      const page = m.pages[m.idx];
      const inner = page && page.querySelector('.section-inner');
      if (!inner) return;
      inner.style.transform = 'none';
      const cs = getComputedStyle(page);
      const avail = page.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const need = inner.offsetHeight;
      if (need > avail && avail > 0) {
        inner.style.transform = 'scale(' + Math.max(0.5, avail / need).toFixed(3) + ')';
      }
    }
    window.addEventListener('resize', () => { if (PAGES.includes(state.current)) fit(state.current); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (PAGES.includes(state.current)) fit(state.current); });
    let busy = false, acc = 0, lastT = 0;
    async function flip(id, dir) {
      const m = map[id]; if (!m) return;
      const next = m.idx + dir;
      if (next < 0) { changeChannel('ch-menu'); return; }   // scroll up past page 1 → menu
      if (next >= m.pages.length) return;                    // end of tape — stay
      busy = true;
      m.root.classList.add('tracking');
      audio.burst(0.16);
      await sleep(140);
      show(id, next);
      await sleep(180);
      m.root.classList.remove('tracking');
      busy = false;
    }
    function onWheel(e) {
      e.preventDefault();
      if (busy) return;
      const now = performance.now();
      if (now - lastT > 400) acc = 0;
      lastT = now;
      acc += e.deltaY;
      const TH = 160;
      if (acc > TH) { acc = 0; flip(state.current, 1); }
      else if (acc < -TH) { acc = 0; flip(state.current, -1); }
    }
    function reset(id) { show(id, 0); }
    return { onWheel, reset };
  })();

  /* ================= input routing ================= */
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, () => audio.unlock(), { passive: true })
  );

  // One dispatch for both wheel and swipe. hero/menu take a raw delta; the rest
  // take an event-shaped object — scroller only preventDefaults when it's at the
  // top, so native scrolling inside games/apps keeps working under a finger.
  function routeScroll(dy, e) {
    const ev = { deltaY: dy, preventDefault: () => e.preventDefault() };
    if (state.transitioning) { e.preventDefault(); return; }
    if (state.current === 'ch-hero') { e.preventDefault(); hero.onWheel(dy); }
    else if (state.current === 'ch-menu') { e.preventDefault(); menu.onWheel(dy); }
    else if (OFFAIR.includes(state.current)) { e.preventDefault(); offair.onWheel(ev); }
    else if (SCROLL.includes(state.current)) { scroller.onWheel(ev); }
    else if (SIMPLE.includes(state.current)) { e.preventDefault(); simple.onWheel(ev); }
    else if (PAGES.includes(state.current)) { pages.onWheel(ev); }
  }

  window.addEventListener('wheel', (e) => routeScroll(e.deltaY, e), { passive: false });

  // A finger travels far fewer pixels than a wheel notch reports, so scale up to
  // keep the up-to-menu thresholds reachable in one comfortable swipe.
  const TOUCH_GAIN = 1.4;
  let touchY = null;
  window.addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (touchY == null) return;
    const dy = (touchY - e.touches[0].clientY) * TOUCH_GAIN;
    touchY = e.touches[0].clientY;
    routeScroll(dy, e);
  }, { passive: false });
  window.addEventListener('touchend', () => { touchY = null; }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.key === '`') { e.preventDefault(); debug.toggle(); return; }
    if (e.key === 'Escape') { changeChannel('ch-menu'); return; }
    if (k === 'i') { setTS('interlace', !tweakState.interlace); return; }
    if (k === 'o') {
      const on = !(state.chOsd || state.volOsd);
      setTS('chOsd', on); setTS('volOsd', on);
      if (on) { showVolOsd(); showChOsd(state.current); }
      return;
    }
    if (k === 'm' || k === 'v') { setTS('sound', !tweakState.sound); return; }
    const dy = KEY_DY[e.key] ?? KEY_DY[k];
    if (dy) { e.preventDefault(); keyScroll(dy, e); return; }
    if (state.current === 'ch-menu') {
      if (e.key === 'ArrowLeft' || k === 'a') { e.preventDefault(); menu.step(-1); }
      else if (e.key === 'ArrowRight' || k === 'd') { e.preventDefault(); menu.step(1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); menu.activate(); }
    }
  });

  // keys do what the wheel does: same thresholds, same channel hand-offs
  const KEY_DY = { ArrowDown: 120, s: 120, PageDown: 600, ArrowUp: -120, w: -120, PageUp: -600 };
  function keyScroll(dy, e) {
    if (state.transitioning) return;
    if (state.current === 'ch-menu') { if (dy < 0) changeChannel('ch-hero'); return; }
    if (SCROLL.includes(state.current)) {
      const sc = $('#' + state.current + ' .scroll-region');
      if (sc && !(dy < 0 && sc.scrollTop <= 1)) { sc.scrollBy({ top: dy }); return; }
    }
    routeScroll(dy, e);
  }

  // toggle a tweak from anywhere (keyboard, debug) and keep the panel in sync
  function setTS(k, v) {
    TV.applyTweaks2({ [k]: v });
    if (window.__setTweakExternal) window.__setTweakExternal(k, v);
  }

  /* ================= contact form ================= */
  const cform = $('#contact-form');
  if (cform) {
    cform.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = $('#form-status');
      const name = $('#cf-name').value.trim();
      const email = $('#cf-email').value.trim();
      if (!name || !email) { status.textContent = '[ incomplete — name and address required ]'; return; }
      const msg = $('#cf-msg').value.trim();
      status.textContent = '[ opening your mail program... ]';
      audio.burst(0.3);
      location.href = 'mailto:hello@walang.studio?subject=' + encodeURIComponent('Hello from ' + name) +
        '&body=' + encodeURIComponent([msg, name + ' <' + email + '>'].join(String.fromCharCode(10, 10)));
    });
  }

  /* ================= hidden debug panel ================= */
  const debug = (function () {
    const el = $('#debug');
    const mk = (label, fn) => {
      const b = document.createElement('button');
      b.className = 'dbtn'; b.textContent = label;
      b.addEventListener('click', fn);
      el.appendChild(b);
      return b;
    };
    const title = document.createElement('div');
    title.className = 'dbg-title'; title.textContent = 'DEBUG — press ` to hide';
    el.appendChild(title);
    [['noise', 'ch-hero'], ['smpte', 'ch-menu'], ['games', 'ch-games'], ['apps', 'ch-apps'], ['contact', 'ch-contact'], ['connect', 'ch-code'], ['about', 'ch-team'], ['404', 'ch-404']]
      .forEach(([l, id]) => mk(l, () => changeChannel(id)));
    const tInterlace = mk('interlace', () => setT('interlace', !tweakState.interlace));
    const tChOsd = mk('ch osd', () => setT('chOsd', !tweakState.chOsd));
    const tVolOsd = mk('vol osd', () => setT('volOsd', !tweakState.volOsd));
    const tSound = mk('sound', () => setT('sound', !tweakState.sound));
    function setT(k, v) {
      TV.applyTweaks2({ [k]: v });
      if (window.__setTweakExternal) window.__setTweakExternal(k, v);
    }
    function sync() {
      tInterlace.classList.toggle('on', !!tweakState.interlace);
      tChOsd.classList.toggle('on', !!tweakState.chOsd);
      tVolOsd.classList.toggle('on', !!tweakState.volOsd);
      tSound.classList.toggle('on', !!tweakState.sound);
    }
    let taps = [];
    window.addEventListener('pointerdown', (e) => {
      if (e.clientX > window.innerWidth - 90 && e.clientY < 90) {
        const now = performance.now();
        taps = taps.filter((t) => now - t < 800);
        taps.push(now);
        if (taps.length >= 3) { taps = []; debug.toggle(); }
      }
    });
    return {
      toggle() { el.classList.toggle('show'); sync(); },
      sync,
    };
  })();

  /* ================= tweaks bridge ================= */
  const tweakState = { interlace: true, chOsd: true, volOsd: true, sound: true };
  TV.applyTweaks2 = function (t) {
    if (!t) return;
    Object.assign(tweakState, t);
    if ('interlace' in t) $('#interlace').classList.toggle('off', !t.interlace);
    if ('chOsd' in t) state.chOsd = !!t.chOsd;
    if ('volOsd' in t) state.volOsd = !!t.volOsd;
    if ('sound' in t) audio.setEnabled(!!t.sound);
    debug.sync();
  };

  /* ================= boot ================= */
  setActive('ch-hero');
})();
