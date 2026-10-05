/* ==========================================================================
   Orbit
   One clock drives everything: the wheel's swing, the scrolling type, the
   coin and the glitch. Pausing stops all of it, exactly.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-ui-orbit]');
  if (!root) return;

  /* ---------------------------------------------------------------- Timing
     Taken from the source video (960 x 720, 30 fps, a 5.33s loop). */
  var LOOP = 160 / 30;        // 5.333s
  var PITCH = 14.25;          // degrees between neighbouring cards
  var SWING_OUT = { at: 0.2, dur: 1.4, ease: bezier(0.9, 0, 0.3, 1) };   // the left card swings in
  var SWING_BACK = { at: 3.7, dur: 1.3, ease: bezier(0.65, 0, 0.15, 1) }; // and back again
  var STEP_DUR = 1.0;         // a step the visitor asks for
  var STEP_EASE = bezier(0.65, 0, 0.15, 1);
  var SETTLE_EASE = bezier(0, 0, 0.2, 1);
  var SCROLL_SPEED = 93;      // type scroll, in source px per second (two cycles per loop)
  var SCROLL_CYCLE = 248;     // four lines of 62px
  var HALF_TURN = LOOP / 12;  // the coin turns 180deg and swaps its word every 0.44s
  var GLITCH_EVERY = LOOP / 4;
  var GLITCH_FROM = 0.17, GLITCH_TO = 0.45;
  var TICKERS = ['USD', 'XRP', 'BTC', 'ETH'];
  var START = 4;              // Bodywork faces the front, as in the first frame

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- Helpers */
  function mod(a, n) { return ((a % n) + n) % n; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function mix(a, b, t) { return a + (b - a) * t; }

  // cubic-bezier(x1, y1, x2, y2) as a function of x, solved with Newton steps
  function bezier(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; }
    function b(p1, p2) { return 3 * p2 - 6 * p1; }
    function c(p1) { return 3 * p1; }
    function at(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function slope(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        t -= (at(t, x1, x2) - x) / s;
      }
      t = clamp(t, 0, 1);
      // A few bisection steps for the flat ends of strong eases
      var lo = 0, hi = 1;
      for (var j = 0; j < 12 && Math.abs(at(t, x1, x2) - x) > 1e-5; j++) {
        if (at(t, x1, x2) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return at(t, y1, y2);
    };
  }

  // Small deterministic noise for the glitch, so ?t= always shows the same frame
  function hash(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* ---------------------------------------------------------------- Build
     Seven highlights, each in the DOM twice: the ring has 14 places, so the
     card that leaves one end comes back at the other well below the screen,
     and the seven cards in view are always seven different ones. */
  var wheel = root.querySelector('[data-wheel]');
  var originals = Array.prototype.slice.call(wheel.querySelectorAll('[data-item]'));
  var COUNT = originals.length;
  originals.forEach(function (li) {
    var copy = li.cloneNode(true);
    // Keep ids unique: rename the SVG paint servers in the copy and repoint them
    var ids = copy.querySelectorAll('[id]');
    Array.prototype.forEach.call(ids, function (el) {
      var oldId = el.id, newId = oldId + '-b';
      el.id = newId;
      Array.prototype.forEach.call(copy.querySelectorAll('[fill],[stroke],[filter]'), function (n) {
        ['fill', 'stroke', 'filter'].forEach(function (attr) {
          var v = n.getAttribute(attr);
          if (v === 'url(#' + oldId + ')') n.setAttribute(attr, 'url(#' + newId + ')');
        });
      });
    });
    copy.setAttribute('data-copy', '');
    wheel.appendChild(copy);
  });
  var N = COUNT * 2;

  var items = Array.prototype.slice.call(wheel.querySelectorAll('[data-item]')).map(function (li, i) {
    var it = {
      el: li,
      index: i,
      base: i % COUNT,
      card: li.querySelector('.ui-orbit__card'),
      title: li.getAttribute('data-title'),
      coin: li.querySelector('[data-coin]'),
      scroll: li.querySelector('[data-scroll]'),
      bands: Array.prototype.slice.call(li.querySelectorAll('.ui-orbit__band')),
      shown: true,
      lastT: '',
      lastWords: '',
      glitchOn: false
    };
    if (it.coin) buildCoin(it);
    it.card.addEventListener('click', function (e) { onCardClick(it, e); });
    return it;
  });

  function buildCoin(it) {
    var FACETS = 48;
    var frag = document.createDocumentFragment();
    for (var k = 0; k < FACETS; k++) {
      var phi = (k / FACETS) * 360;
      // Light from the upper left: brighter facets there, darker below right
      var lit = 0.5 + 0.5 * Math.cos((phi - 315) * Math.PI / 180);
      var hi = Math.round(mix(150, 232, lit));
      var lo = Math.round(mix(34, 70, lit));
      var f = document.createElement('span');
      f.className = 'ui-orbit__facet';
      f.style.height = 'calc(var(--d) * 3.1416 / ' + FACETS + ' + 1px)';
      f.style.marginTop = 'calc((var(--d) * 3.1416 / ' + FACETS + ' + 1px) / -2)';
      f.style.transform = 'rotateZ(' + phi.toFixed(2) + 'deg) translateY(calc(var(--d) / -2)) rotateX(90deg) rotateZ(90deg)';
      // Reeding: fine dark and light ribs that read as lines edge-on
      f.style.background = 'repeating-linear-gradient(to bottom,' +
        'rgb(' + lo + ',' + (lo + 6) + ',' + (lo + 16) + ') 0 1px,' +
        'rgb(' + hi + ',' + (hi + 4) + ',' + Math.min(255, hi + 14) + ') 1px 2.4px)';
      frag.appendChild(f);
    }
    it.coin.appendChild(frag);
    it.wordOld = it.el.querySelector('[data-word-old]');
    it.wordNew = it.el.querySelector('[data-word-new]');
  }

  /* ---------------------------------------------------------------- State */
  var params = new URLSearchParams(location.search);
  var frozenAt = params.has('t') ? parseFloat(params.get('t')) : NaN;
  var frozen = !isNaN(frozenAt);

  var motion = !reduceMQ.matches && params.get('autoplay') !== '0' && !frozen; // Play / Pause
  var touring = motion;       // the demo swing; stops once the visitor takes over
  var holdForFocus = false;   // keyboard focus is on a card: the swing waits
  var tourTime = 0;           // position in the 5.33s loop
  var clock = 0;              // drives the type, the coin and the glitch
  var tourBase = START;
  var pos = START;            // the ring index facing the front, a float
  var tween = null;           // { from, to, t0, dur, ease }
  var centre = -1;            // ring index of the front card, for a11y state
  var unit = 1;               // px per source px
  var announceOnSettle = false;


  var playBtn = root.querySelector('[data-play]');
  var playLabel = root.querySelector('[data-play-label]');
  var live = root.querySelector('[data-live]');

  function measure() {
    // The layout size, not getBoundingClientRect, which includes the rotation
    unit = (items[0].el.offsetHeight / 432) || unit;
  }

  /* ---------------------------------------------------------------- Tour */
  function swing(T) {
    if (T < SWING_OUT.at) return 0;
    if (T < SWING_OUT.at + SWING_OUT.dur) return SWING_OUT.ease((T - SWING_OUT.at) / SWING_OUT.dur);
    if (T < SWING_BACK.at) return 1;
    if (T < SWING_BACK.at + SWING_BACK.dur) return 1 - SWING_BACK.ease((T - SWING_BACK.at) / SWING_BACK.dur);
    return 0;
  }

  function stopTour() {
    if (!touring) return;
    touring = false;
    tourTime = 0;
  }

  /* ---------------------------------------------------------------- Moves */
  function now() { return performance.now() / 1000; }

  function goTo(target, dur, ease) {
    if (reduceMQ.matches) dur = 0;
    tween = { from: pos, to: target, t0: now(), dur: dur, ease: ease || STEP_EASE };
    if (dur === 0) { pos = target; tween = null; }
  }

  function step(d) {
    stopTour();
    var base = tween ? tween.to : Math.round(pos);
    goTo(base + d, STEP_DUR);
    announceOnSettle = true;
  }

  // Shortest way round to a ring index
  function bringToFront(index) {
    var base = tween ? tween.to : Math.round(pos);
    var d = mod(index - base + N / 2, N) - N / 2;
    if (d === 0) return;
    stopTour();
    goTo(base + d, STEP_DUR);
    announceOnSettle = true;
  }

  var suppressClick = false;
  function onCardClick(it, e) {
    if (suppressClick) { e.preventDefault(); return; }
    bringToFront(it.index);
  }

  /* ---------------------------------------------------------------- Render */
  function offsetOf(i) { return mod(i - pos + N / 2, N) - N / 2; }

  function render() {
    items.forEach(function (it) {
      var off = offsetOf(it.index);
      var seen = Math.abs(off) < 5.2;
      if (seen !== it.shown) {
        it.el.style.visibility = seen ? '' : 'hidden';
        it.shown = seen;
      }
      if (!seen) return;
      var t = 'rotate(' + (off * PITCH).toFixed(3) + 'deg)';
      if (t !== it.lastT) {
        it.el.style.transform = t;
        // Only ultrawide screens reach past the third card out: fade those,
        // so a highlight never shows twice
        var fade = clamp((4 - Math.abs(off)) / 0.8, 0, 1);
        it.el.style.opacity = fade < 1 ? fade.toFixed(3) : '';
        // Each card lies on top of its left-hand neighbour
        it.el.style.zIndex = String(Math.round((off + N / 2) * 10) + 1);
        it.lastT = t;
      }
      if (it.scroll) renderScroll(it);
      if (it.coin) renderCoin(it);
      if (it.bands.length) renderGlitch(it);
    });
    syncCentre();
  }

  function renderScroll(it) {
    var y = mod(clock * SCROLL_SPEED, SCROLL_CYCLE);
    it.scroll.style.transform = 'translate3d(0,' + (-y * unit).toFixed(2) + 'px,0)';
  }

  // The coin eases through each half-turn, so the words read clearly face-on
  function coinAngle() {
    var k = Math.floor(clock / HALF_TURN);
    var f = clock / HALF_TURN - k;
    var e = 0.35 * f + 0.65 * (f * f * (3 - 2 * f));
    return (k + e) * 180;
  }

  function renderCoin(it) {
    var th = coinAngle();
    it.coin.style.transform = 'rotateY(' + th.toFixed(2) + 'deg)';

    // The near rim wipes the next word in from the left, half-way across
    // when the coin is edge-on.
    var m = th / 180;
    var n = Math.floor(m + 1e-6);
    var u = m - n;
    var oldW = TICKERS[mod(n, 4)];
    var newW = TICKERS[mod(n + 1, 4)];
    if (oldW + newW !== it.lastWords) {
      it.wordOld.textContent = oldW;
      it.wordNew.textContent = newW;
      it.lastWords = oldW + newW;
    }
    if (u < 1e-4) {
      it.wordOld.style.clipPath = 'none';
      it.wordNew.style.clipPath = 'inset(0 100% 0 0)';
      return;
    }
    var w = 236 * unit;
    var r = 70 * unit;
    var b = w / 2 - r * Math.cos(u * Math.PI);
    it.wordOld.style.clipPath = 'inset(0 0 0 ' + b.toFixed(1) + 'px)';
    it.wordNew.style.clipPath = 'inset(0 ' + (w - b).toFixed(1) + 'px 0 0)';
  }

  // Short bursts: the five bands of the mark slip sideways and drop out
  function renderGlitch(it) {
    var local = mod(clock, GLITCH_EVERY);
    var on = local >= GLITCH_FROM && local < GLITCH_TO;
    if (!on) {
      if (it.glitchOn) {
        it.bands.forEach(function (b) { b.style.transform = ''; b.style.opacity = ''; });
        it.glitchOn = false;
      }
      return;
    }
    it.glitchOn = true;
    var tick = Math.floor(clock * 20);
    it.bands.forEach(function (b, k) {
      var r1 = hash(tick * 7 + k), r2 = hash(tick * 13 + k * 3 + 1);
      var dx = (r1 - 0.5) * 2 * 18 * unit;
      b.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,0,0)';
      b.style.opacity = r2 < 0.22 ? '0' : '1';
    });
  }

  /* ---------------------------------------------------------------- A11y state */
  function syncCentre() {
    var c = mod(Math.round(pos), N);
    if (c === centre) return;
    var hadFocus = centre >= 0 && root.contains(document.activeElement) &&
      document.activeElement.classList.contains('ui-orbit__card');
    centre = c;
    items.forEach(function (it) {
      var off = offsetOf(it.index);
      // Of the two copies of a highlight, the one nearer the front is the real one
      var twin = items[mod(it.index + COUNT, N)];
      var primary = Math.abs(off) <= Math.abs(offsetOf(twin.index)) && !(Math.abs(off) === Math.abs(offsetOf(twin.index)) && it.index > twin.index);
      var isCentre = it.index === c;
      it.el.classList.toggle('is-centre', isCentre);
      if (primary) it.el.removeAttribute('aria-hidden');
      else it.el.setAttribute('aria-hidden', 'true');
      it.card.tabIndex = isCentre ? 0 : -1;
      if (isCentre) it.card.setAttribute('aria-current', 'true');
      else it.card.removeAttribute('aria-current');
    });
    if (hadFocus) items[c].card.focus({ preventScroll: true });
  }

  function announce() {
    var it = items[mod(Math.round(pos), N)];
    live.textContent = it.title + ', ' + (it.base + 1) + ' of ' + COUNT;
  }

  function setMotion(on) {
    motion = on;
    playBtn.classList.toggle('is-paused', !on);
    playLabel.textContent = on ? 'Pause' : 'Play';
    if (on && !touring && !tween) {
      touring = true;
      tourTime = 0;
      tourBase = Math.round(pos);
      pos = tourBase;
    }
    if (!on) stopTour();
  }

  /* ---------------------------------------------------------------- Clock */
  var last = 0;
  function frame(ts) {
    var dt = last ? Math.min((ts - last) / 1000, 0.05) : 0;
    last = ts;
    if (frozen) dt = 0;

    if (motion) clock += dt;

    if (tween) {
      var k = tween.dur ? clamp((now() - tween.t0) / tween.dur, 0, 1) : 1;
      pos = mix(tween.from, tween.to, tween.ease(k));
      if (k >= 1) {
        pos = tween.to;
        tween = null;
        if (announceOnSettle) { announce(); announceOnSettle = false; }
      }
    } else if (touring && !dragging) {
      if (motion && !holdForFocus) tourTime = mod(tourTime + dt, LOOP);
      pos = tourBase - swing(tourTime);
    }

    render();
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- Input */
  // Keys
  root.addEventListener('keydown', function (e) {
    if (e.target.closest('.ui-orbit__bar')) return;
    var k = e.key;
    if (k === 'ArrowRight') { step(1); e.preventDefault(); }
    else if (k === 'ArrowLeft') { step(-1); e.preventDefault(); }
    else if (k === 'Home' || k === 'End') {
      var target = k === 'Home' ? 0 : COUNT - 1;
      var cur = items[mod(Math.round(tween ? tween.to : pos), N)].base;
      if (target !== cur) step(target - cur);
      e.preventDefault();
    }
  });

  root.querySelector('[data-prev]').addEventListener('click', function () { step(-1); });
  root.querySelector('[data-next]').addEventListener('click', function () { step(1); });
  playBtn.addEventListener('click', function () { setMotion(!motion); });

  // The swing waits while keyboard focus is on a card
  root.addEventListener('focusin', function (e) {
    holdForFocus = !!e.target.closest('.ui-orbit__card') && e.target.matches(':focus-visible');
  });
  root.addEventListener('focusout', function () { holdForFocus = false; });

  // Drag or swipe: the wheel follows the finger, then settles on a card
  var stage = root.querySelector('[data-stage]');
  var dragging = false, pointer = null;
  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, pos: pos, lastX: e.clientX, lastT: now(), v: 0, moved: false };
  });
  stage.addEventListener('pointermove', function (e) {
    if (!pointer || e.pointerId !== pointer.id) return;
    var dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    if (!pointer.moved) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      pointer.moved = true;
      dragging = true;
      tween = null;
      stopTour();
      root.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    }
    var slotPx = 221.6 * unit; // the arc between cards, at the cards' middle
    var t = now();
    var vdt = t - pointer.lastT;
    if (vdt > 0) pointer.v = mix(pointer.v, -(e.clientX - pointer.lastX) / slotPx / vdt, 0.4);
    pointer.lastX = e.clientX; pointer.lastT = t;
    pos = pointer.pos - dx / slotPx;
  });
  function endDrag(e) {
    if (!pointer || (e && e.pointerId !== pointer.id)) return;
    if (pointer.moved) {
      var target = Math.round(pos + clamp(pointer.v * 0.18, -2, 2));
      goTo(target, 0.6, SETTLE_EASE);
      announceOnSettle = true;
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 0);
    }
    dragging = false;
    pointer = null;
    root.classList.remove('is-dragging');
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  // Sideways trackpad swipes: one step per gesture. Vertical scrolling is left alone.
  var wheelLock = 0, wheelAcc = 0;
  stage.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    var t = now();
    if (t < wheelLock) return;
    wheelAcc += e.deltaX;
    if (Math.abs(wheelAcc) > 30) {
      step(wheelAcc > 0 ? 1 : -1);
      wheelAcc = 0;
      wheelLock = t + 0.6;
    }
  }, { passive: false });

  // Reduced motion: stop everything unless the visitor presses Play
  function onReduce() { if (reduceMQ.matches) setMotion(false); }
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduce);
  else if (reduceMQ.addListener) reduceMQ.addListener(onReduce);

  window.addEventListener('resize', function () { measure(); items.forEach(function (it) { it.lastT = ''; }); });

  /* ---------------------------------------------------------------- Go */
  measure();
  setMotion(motion);
  if (frozen) {
    // ?t=1.6 freezes the demo at that moment, for review and screenshots
    clock = frozenAt;
    touring = true;
    tourTime = mod(frozenAt, LOOP);
    pos = tourBase - swing(tourTime);
  }
  root.classList.add('is-ready');
  render();
  requestAnimationFrame(frame);
})();
