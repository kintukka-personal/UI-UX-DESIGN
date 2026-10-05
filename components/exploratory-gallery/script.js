/* ==========================================================================
   Exploratory gallery
   One clock drives everything: the slide tweens, the focus zoom, the coin
   and the demo tour. So pausing is exact and ?t=2.5 freezes any moment of
   the tour for review.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-ui-gallery]');
  if (!root) return;

  var stage = root.querySelector('[data-stage]');
  var track = root.querySelector('[data-track]');
  var slot = root.querySelector('[data-slot]');
  var dot = root.querySelector('[data-cursor]');
  var countEl = root.querySelector('[data-count]');
  var liveEl = root.querySelector('[data-live]');
  var playBtn = root.querySelector('[data-play]');
  var playLabel = root.querySelector('[data-play-label]');
  var prevBtn = root.querySelector('[data-prev]');
  var nextBtn = root.querySelector('[data-next]');

  var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  var fineMQ = matchMedia('(hover: hover) and (pointer: fine)');
  var forcedMQ = matchMedia('(forced-colors: active)');

  /* ---------------------------------------------------------------- Timing
     All measured from the source video (30 fps). */
  var SLIDE_DUR = 1.55;      // one step, leading card
  var SLIDE_USER = 1.15;     // a little quicker when the visitor drives
  var STAGGER = 0.05;        // each card trails the one ahead of it by 50ms
  var SPIN_DUR = 1.9;        // the coin turns 720deg per step
  var SPIN_LAG = 0.2;        // ...starting just after its card moves off
  var FOCUS_IN = 0.42;
  var FOCUS_OUT = 0.55;

  // The demo tour, in seconds. It loops every TOUR_LOOP.
  var TOUR_LOOP = 7.63;
  var TOUR = [
    { t: 0.02, run: function () { step(1, false); } },
    { t: 1.23, run: function () { if (ghostOn()) { pressDot(); setFocus(true); } } },
    { t: 1.92, run: function () { step(1, false); } },
    { t: 3.85, run: function () { step(1, false); } },
    { t: 5.76, run: function () { step(1, false); } }
  ];

  var TICKERS = ['USD', 'XRP', 'BTC', 'ETH'];

  /* ---------------------------------------------------------------- Easing */
  function bezier(x1, y1, x2, y2) {
    function sx(t) { return ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t; }
    function sy(t) { return ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 26; i++) {
        var v = sx(t);
        if (Math.abs(v - x) < 1e-6) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }
  var EASE_SLIDE = bezier(0.45, 0, 0.05, 1);   // slow lift-off, long glide in
  var EASE_SPIN = bezier(0.25, 0, 0.3, 1);
  var EASE_POP = bezier(0.3, 1.32, 0.45, 1);   // focus: a small overshoot
  var EASE_OUT = bezier(0.4, 0, 0.2, 1);
  function easeOutCubic(u) { return 1 - Math.pow(1 - u, 3); }
  function clamp01(u) { return u < 0 ? 0 : u > 1 ? 1 : u; }
  function mix(a, b, u) { return a + (b - a) * u; }
  function mod(n, m) { return ((n % m) + m) % m; }

  /* ---------------------------------------------------------------- Clock + tweens */
  var clock = 0;

  function Tween(from, to, dur, ease, delay) {
    this.from = from; this.to = to; this.dur = dur; this.ease = ease;
    this.start = clock + (delay || 0);
  }
  Tween.prototype.value = function () {
    var u = this.dur <= 0 ? 1 : (clock - this.start) / this.dur;
    if (u <= 0) return this.from;
    if (u >= 1) return this.to;
    return mix(this.from, this.to, this.ease(u));
  };
  Tween.prototype.done = function () { return clock >= this.start + this.dur; };

  /* ---------------------------------------------------------------- Build
     Four projects are doubled to eight cards, so the row stays full on an
     ultrawide screen. Each project's nearer copy is the one assistive tech
     sees; the other is hidden. */
  var originals = Array.prototype.slice.call(track.querySelectorAll('[data-item]'));
  var COUNT = originals.length;
  originals.forEach(function (li) {
    var copy = li.cloneNode(true);
    copy.setAttribute('data-copy', '');
    track.appendChild(copy);
  });
  var N = COUNT * 2;

  var items = Array.prototype.slice.call(track.querySelectorAll('[data-item]')).map(function (li, i) {
    var base = i % COUNT;
    var it = {
      el: li,
      card: li.querySelector('.ui-gallery__card'),
      inner: li.querySelector('[data-inner]'),
      coin: li.querySelector('[data-coin]'),
      base: base,
      title: li.getAttribute('data-title'),
      target: mod(i + COUNT, N) - COUNT,  // slot index relative to centre, in [-N/2, N/2)
      pos: 0,
      move: null,
      theta: 0,
      spin: null,
      lastWords: ''
    };
    it.pos = it.target;
    if (it.coin) buildCoin(it);
    it.card.addEventListener('click', function (e) { onCardClick(it, e); });
    return it;
  });

  function buildCoin(it) {
    var FACETS = 64;
    var frag = document.createDocumentFragment();
    for (var k = 0; k < FACETS; k++) {
      var phi = (k / FACETS) * 360;
      // Light from the upper left: brighter facets there, darker below right
      var lit = 0.5 + 0.5 * Math.cos((phi - 315) * Math.PI / 180);
      var hi = Math.round(mix(150, 232, lit));
      var lo = Math.round(mix(34, 70, lit));
      var f = document.createElement('span');
      f.className = 'ui-gallery__facet';
      f.style.height = 'calc(var(--d) * 3.1416 / ' + FACETS + ' + 1px)';
      f.style.marginTop = 'calc((var(--d) * 3.1416 / ' + FACETS + ' + 1px) / -2)';
      f.style.transform = 'rotateZ(' + phi.toFixed(2) + 'deg) translateY(calc(var(--d) / -2)) rotateX(90deg) rotateZ(90deg)';
      // Reeding: fine dark/light ribs that read as horizontal lines edge-on
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
  var active = 0;             // index into the project list, can run past COUNT
  var focus = { tw: null, value: 0, on: false, item: null }; // item: the open card, kept until it has closed
  var playing = !reduceMQ.matches;
  var userPaused = false;     // the visitor pressed Pause, or took the wheel
  var holdForFocus = false;   // keyboard focus is inside: rotation waits
  var tourTime = -0.6;        // a beat before the first move
  var cardPx = 0, pitchPx = 0, stageW = 0, stageH = 0;

  var params = new URLSearchParams(location.search);
  if (params.get('autoplay') === '0') { playing = false; userPaused = true; }

  /* ---------------------------------------------------------------- Layout */
  function measure() {
    var r = stage.getBoundingClientRect();
    stageW = r.width; stageH = r.height;
    cardPx = slot.offsetWidth;
    pitchPx = cardPx * parseFloat(getComputedStyle(root).getPropertyValue('--pitch') || 1.259);
  }

  /* ---------------------------------------------------------------- Actions */
  function step(n, byUser) {
    if (!n) return;
    if (focus.on) setFocus(false);
    var reduce = reduceMQ.matches;
    var dur = reduce ? 0 : (byUser ? SLIDE_USER : SLIDE_DUR);
    var dir = n > 0 ? 1 : -1;

    for (var s = 0; s < Math.abs(n); s++) {
      active += dir;
      items.forEach(function (it) {
        var from = it.move ? it.move.value() : it.pos;
        var to = it.target - dir;
        // Wrap the card that falls off one end round to the other, unseen
        if (to < -N / 2) { to += N; from = to + dir; }
        else if (to >= N / 2) { to -= N; from = to + dir; }
        it.target = to;
        // The card nearest the direction of travel leads, the rest trail
        var lead = dir > 0 ? from : -from;
        var delay = reduce ? 0 : Math.max(0, Math.min(lead, 4)) * STAGGER;
        it.move = new Tween(from, to, dur, EASE_SLIDE, delay);
        if (it.coin) {
          var start = it.spin ? it.spin.value() : it.theta;
          var goal = (it.spin ? it.spin.to : it.theta) + 720 * dir;
          it.spin = reduce ? null : new Tween(start, goal, SPIN_DUR, EASE_SPIN, delay + SPIN_LAG);
          if (reduce) it.theta = goal;
        }
      });
    }
    syncRoles();
    announce(byUser);
  }

  function setFocus(on) {
    if (on === focus.on) return;
    focus.on = on;
    var from = focus.tw ? focus.tw.value() : focus.value;
    if (reduceMQ.matches) focus.tw = new Tween(from, on ? 1 : 0, 0, EASE_OUT);
    else focus.tw = on ? new Tween(from, 1, FOCUS_IN, EASE_POP) : new Tween(from, 0, FOCUS_OUT, EASE_OUT);
    var c = activeItem();
    if (c) c.card.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) {
      if (focus.item) focus.item.el.classList.remove('is-open');
      focus.item = c;
      if (c) c.el.classList.add('is-open');
    }
  }

  function activeItem() {
    for (var i = 0; i < items.length; i++) if (items[i].target === 0) return items[i];
    return null;
  }

  /* Each project has two copies. The one closer to the centre is real to
     assistive tech; the other is hidden from it. Only the centre card
     sits in the tab order (roving tabindex). */
  function syncRoles() {
    var primary = [];
    items.forEach(function (it) {
      var cur = primary[it.base];
      if (!cur || Math.abs(it.target) < Math.abs(cur.target)) primary[it.base] = it;
    });
    items.forEach(function (it) {
      var isPrimary = primary[it.base] === it;
      var isActive = it.target === 0;
      it.el.classList.toggle('is-active', isActive);
      // Not inert: the hidden copy can still be on screen and clicked
      if (isPrimary) it.el.removeAttribute('aria-hidden');
      else it.el.setAttribute('aria-hidden', 'true');
      it.card.tabIndex = isActive ? 0 : -1;
      if (isActive) it.card.setAttribute('aria-pressed', focus.on ? 'true' : 'false');
      else it.card.removeAttribute('aria-pressed');
    });
    var n = mod(active, COUNT) + 1;
    countEl.textContent = n + '-' + String(COUNT).padStart(2, '0') + ' (LITE)';
  }

  function announce(byUser) {
    if (!byUser) return;
    var it = activeItem();
    if (it) liveEl.textContent = it.title + ', ' + (mod(active, COUNT) + 1) + ' of ' + COUNT;
  }

  /* ---------------------------------------------------------------- Playback */
  function setPlaying(on, fromUser) {
    playing = on;
    if (fromUser) userPaused = !on;
    playBtn.classList.toggle('is-paused', !on);
    playLabel.textContent = on ? 'Pause' : 'Play';
  }

  function takeOver() {
    frozen = false;
    // The visitor is driving: stop the tour so it never fights them
    if (playing) setPlaying(false, true);
  }

  /* ---------------------------------------------------------------- Cursor dot
     On mouse and trackpad the dot replaces the pointer over the stage. During
     the tour, before the visitor moves the mouse, a ghost dot plays the
     clicks from the source video. */
  var realPointer = false;
  var frozen = false;         // set by ?t=: keep the ghost on screen
  var pointer = { x: 0, y: 0, inside: false, overCard: false, down: false };
  var dotState = { x: 0, y: 0, s: 18, o: 0 };
  var pressAt = -10;

  function dotAllowed() { return fineMQ.matches && !forcedMQ.matches && !reduceMQ.matches; }
  function ghostOn() { return dotAllowed() && !realPointer && playing; }
  function pressDot() { pressAt = clock; }

  root.classList.toggle('has-dot', dotAllowed());

  // Ghost path in card units from the stage centre, by tour time
  function ghost(t) {
    var P0 = [0.44, 0.78], P1 = [0.33, 0.47], P2 = [0.35, 0.75];
    var x, y, s, o;
    if (t < 0.95 || t > 2.7) return null;
    if (t < 1.25) {
      var u = easeOutCubic(clamp01((t - 0.95) / 0.3));
      x = mix(P0[0], P1[0], u); y = mix(P0[1], P1[1], u);
      s = mix(18, 26, u); o = clamp01((t - 0.95) / 0.15);
    } else if (t < 1.92) {
      var g = easeOutCubic(clamp01((t - 1.3) / 0.25));
      var drift = clamp01((t - 1.5) / 0.42);
      x = P1[0] + 0.006 * drift; y = P1[1] + 0.012 * drift;
      s = t < 1.3 ? mix(26, 21, (t - 1.25) / 0.05) : mix(21, 56, g);
      o = 1;
    } else {
      var v = easeOutCubic(clamp01((t - 1.92) / 0.5));
      x = mix(P1[0] + 0.006, P2[0], v); y = mix(P1[1] + 0.012, P2[1], v);
      s = mix(56, 18, v); o = 1 - clamp01((t - 2.25) / 0.4);
    }
    return { x: x, y: y, s: s, o: o };
  }

  function renderDot(dt) {
    if (!dotAllowed()) { dot.style.opacity = 0; return; }
    var target;
    if (realPointer) {
      var big = pointer.overActive && focus.on;
      var s = big ? 56 : pointer.overCard ? 28 : 18;
      if (pointer.down) s *= 0.8;
      target = { x: pointer.x, y: pointer.y, s: s, o: pointer.inside ? 1 : 0 };
      var k = 1 - Math.pow(0.0001, dt);        // frame-rate independent follow
      dotState.x = mix(dotState.x, target.x, Math.min(1, k * 1.6));
      dotState.y = mix(dotState.y, target.y, Math.min(1, k * 1.6));
      dotState.s = mix(dotState.s, target.s, Math.min(1, k * 0.9));
      dotState.o = mix(dotState.o, target.o, Math.min(1, k));
    } else {
      var g = ghost(mod(tourTime, TOUR_LOOP));
      if (!g || !(playing || frozen)) {
        dotState.o = Math.max(0, dotState.o - dt * 4);
      } else {
        dotState.x = stageW / 2 + g.x * cardPx;
        dotState.y = stageH / 2 + g.y * cardPx;
        dotState.s = g.s; dotState.o = g.o;
      }
    }
    var press = clock - pressAt < 0.12 ? 0.85 : 1;
    dot.style.opacity = dotState.o.toFixed(3);
    dot.style.transform = 'translate3d(' + dotState.x.toFixed(1) + 'px,' + dotState.y.toFixed(1) + 'px,0) scale(' + (dotState.s * press / 100).toFixed(4) + ')';
  }

  /* ---------------------------------------------------------------- Frame */
  function update(dt) {
    clock += dt;
    if (playing && !holdForFocus) {
      var before = tourTime;
      tourTime += dt;
      TOUR.forEach(function (ev) {
        // Fire every event whose time was crossed, across the loop seam too
        var a = before, b = tourTime;
        var loops = Math.floor(b / TOUR_LOOP) - Math.floor(a / TOUR_LOOP);
        var ta = mod(a, TOUR_LOOP), tb = mod(b, TOUR_LOOP);
        var hit = loops === 0 ? (ev.t > ta && ev.t <= tb) : (ev.t > ta || ev.t <= tb);
        if (hit && a >= -1) ev.run();
      });
    }
  }

  function render(dt) {
    // Focus amount
    var f = focus.tw ? focus.tw.value() : focus.value;
    focus.value = f;
    root.style.setProperty('--f', f.toFixed(4));
    root.classList.toggle('is-focusing', f > 0.001);
    if (f <= 0.001 && !focus.on && focus.item) {
      focus.item.el.classList.remove('is-open');
      focus.item = null;
    }

    var half = stageW / 2 + cardPx;
    items.forEach(function (it) {
      var p = it.move ? it.move.value() : it.pos;
      if (it.move && it.move.done()) it.move = null;
      it.pos = p;
      var x = p * pitchPx;
      var seen = Math.abs(x) < half + cardPx * 0.4;
      it.el.style.visibility = seen ? '' : 'hidden';
      if (!seen) return;
      it.el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      if (it.inner) it.inner.style.transform = 'translate3d(' + (-p * cardPx * 0.03).toFixed(2) + 'px,0,0)';
      if (it.coin) renderCoin(it);
    });

    renderDot(dt);
  }

  function renderCoin(it) {
    var th = it.spin ? it.spin.value() : it.theta;
    if (it.spin && it.spin.done()) { it.theta = it.spin.to; it.spin = null; th = it.theta; }
    else it.theta = th;
    it.coin.style.transform = 'rotateY(' + th.toFixed(2) + 'deg)';

    // The word changes as the glass turns: the near rim wipes the new word
    // in from the left, half-way across when the coin is edge-on.
    var m = th / 180;
    var n = Math.floor(m + 1e-6);
    var u = m - n;
    var oldW = TICKERS[mod(n, 4)];
    var newW = TICKERS[mod(n + 1, 4)];
    var words = oldW + newW;
    if (words !== it.lastWords) {
      it.wordOld.textContent = oldW;
      it.wordNew.textContent = newW;
      it.lastWords = words;
    }
    if (u < 1e-4) {
      it.wordOld.style.clipPath = 'none';
      it.wordNew.style.clipPath = 'inset(0 100% 0 0)';
      return;
    }
    var w = cardPx;
    var r = cardPx * 0.29;
    var b = w / 2 - r * Math.cos(u * Math.PI);      // boundary, px from the card's left
    it.wordOld.style.clipPath = 'inset(0 0 0 ' + b.toFixed(1) + 'px)';
    it.wordNew.style.clipPath = 'inset(0 ' + (w - b).toFixed(1) + 'px 0 0)';
  }

  var last = 0;
  function frame(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    if (frozen) dt = 0;
    update(dt);
    render(dt);
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- Input */
  function onCardClick(it, e) {
    if (dragged) { e.preventDefault(); return; }
    takeOver();
    if (it.target === 0) {
      setFocus(!focus.on);
    } else {
      step(Math.round(it.target), true);
    }
  }

  // Click on the backdrop closes an open card
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.ui-gallery__card')) return;
    if (focus.on) { takeOver(); setFocus(false); }
  });

  // Arrow keys work from inside the gallery, or from the page itself when
  // nothing else has focus (the gallery fills the screen)
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target !== document.body && !root.contains(e.target)) return;
    var onCard = !!e.target.closest('.ui-gallery__card');
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      takeOver();
      step(e.key === 'ArrowRight' ? 1 : -1, true);
      if (onCard) { var a = activeItem(); if (a) a.card.focus({ preventScroll: true }); }
    } else if (e.key === 'Escape' && focus.on) {
      takeOver();
      setFocus(false);
    }
  });

  prevBtn.addEventListener('click', function () { takeOver(); step(-1, true); });
  nextBtn.addEventListener('click', function () { takeOver(); step(1, true); });
  playBtn.addEventListener('click', function () {
    var on = !playing;
    frozen = false;
    setPlaying(on, true);
    if (on && focus.on) setFocus(false);
  });

  // Rotation waits while keyboard focus is on a card (WAI-ARIA carousel pattern)
  track.addEventListener('focusin', function (e) {
    if (e.target.matches(':focus-visible')) holdForFocus = true;
  });
  track.addEventListener('focusout', function () { holdForFocus = false; });

  // Swipe and drag
  var dragged = false;
  var drag = null;
  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    dragged = false;
    pointer.down = true;
  });
  window.addEventListener('pointerup', function (e) {
    pointer.down = false;
    if (!drag || drag.id !== e.pointerId) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dragged = true;
      takeOver();
      step(dx < 0 ? 1 : -1, true);
      setTimeout(function () { dragged = false; }, 0);
    }
  });
  window.addEventListener('pointercancel', function () { drag = null; pointer.down = false; });

  // Mouse wheel / trackpad: one notch, one step
  var wheelSum = 0, wheelLock = 0;
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (performance.now() < wheelLock) return;
    wheelSum += d;
    if (Math.abs(wheelSum) > 40) {
      takeOver();
      step(wheelSum > 0 ? 1 : -1, true);
      wheelSum = 0;
      wheelLock = performance.now() + 650;
    }
  }, { passive: false });

  // The real pointer takes over the dot
  stage.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var r = stage.getBoundingClientRect();
    if (!realPointer) {
      realPointer = true;
      dotState.x = e.clientX - r.left; dotState.y = e.clientY - r.top;
    }
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
    var card = e.target.closest('.ui-gallery__card');
    pointer.overCard = !!card;
    pointer.overActive = !!card && card.closest('.ui-gallery__item').classList.contains('is-active');
  });
  stage.addEventListener('pointerleave', function () { pointer.inside = false; });

  /* ---------------------------------------------------------------- Modes */
  function onMotionPref() {
    root.classList.toggle('has-dot', dotAllowed());
    if (reduceMQ.matches) {
      if (playing && !userPaused) setPlaying(false, false);
      items.forEach(function (it) {
        if (it.move) { it.pos = it.move.to; it.move = null; }
        if (it.spin) { it.theta = it.spin.to; it.spin = null; }
      });
    } else if (!userPaused && !playing) {
      setPlaying(true, false);
    }
  }
  [reduceMQ, fineMQ, forcedMQ].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener('change', onMotionPref);
    else mq.addListener(onMotionPref);
  });

  document.addEventListener('visibilitychange', function () { last = 0; });

  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
  else window.addEventListener('resize', measure);

  /* ---------------------------------------------------------------- Start */
  measure();
  syncRoles();
  setPlaying(playing, false);

  // ?t=2.4 seeks the tour and freezes there (design review, screenshots)
  var seek = parseFloat(params.get('t'));
  if (!isNaN(seek)) {
    playing = true; tourTime = 0;
    var dt = 1 / 120;
    for (var t = 0; t < seek - 1e-9; t += dt) { update(dt); render(dt); }
    setPlaying(false, true);
    frozen = true;
  }

  render(0);
  requestAnimationFrame(frame);
})();
