/* ==========================================================================
   Blur List
   Twelve words stand on the spokes of a wheel whose hub is far off the left
   of the screen. One clock drives the demo, so Pause stops it exactly, and
   ?t= shows any moment of it for review.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-ui-blur-list]');
  if (!root) return;

  /* ---------------------------------------------------------------- Timing
     Taken from the source video (1280 x 720, 30 fps, 12 words in 9.0s). */
  var PERIOD = 0.75;                  // one word every 0.75s
  var STEP_AT = 0;                    // a tick starts on the loop's first frame
  var STEP_DUR = 0.53;                // 16 frames per tick
  var STEP_EASE = bezier(0.4, 0, 0, 0.9); // fitted to the tracked word: a quick lift, a long glide in
  var RESUME_HOLD = 0.6;              // after Play, rest on the current word first
  var PITCH = 6.6;                    // degrees between words at 16:9 (fitted to the slant of each line)
  var PITCH_MAX = 10;                 // tall screens spread the fan to fill the height
  var REACH = 1088;                   // pivot to the words' left edge, in source px
  var VISIBLE = 5.5;                  // words further than this from the arrow are hidden
  var NUDGE = 28;                     // the arrow and the list push right this far per tick, in source px
  var SHUTTER = 1 / 240;              // motion-blur exposure, in seconds: a light smear, as in the source
  var BLUR_MAX = 5;                   // cap on the motion blur, in source px
  var START = 0;                      // Motion is at the arrow in the first frame

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- Helpers */
  function mod(a, n) { return ((a % n) + n) % n; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  // cubic-bezier(x1, y1, x2, y2) as a function of x
  function bezier(x1, y1, x2, y2) {
    function at(t, p1, p2) { return 3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 24; i++) {
        t = (lo + hi) / 2;
        if (at(t, x1, x2) < x) lo = t; else hi = t;
      }
      return at(t, y1, y2);
    };
  }

  /* ---------------------------------------------------------------- Elements */
  var stage = root.querySelector('[data-stage]');
  var wheel = root.querySelector('[data-wheel]');
  var items = Array.prototype.slice.call(root.querySelectorAll('[data-words] li'));
  var words = items.map(function (li) { return li.querySelector('button'); });
  var arrow = root.querySelector('[data-arrow]');
  var blurNode = root.querySelector('[data-motion-blur]');
  var toggle = root.querySelector('[data-toggle]');
  var live = root.querySelector('[data-live]');
  var COUNT = words.length;

  words.forEach(function (b, i) {
    b.setAttribute('aria-label', b.textContent + ', ' + (i + 1) + ' of ' + COUNT);
  });

  /* ---------------------------------------------------------------- State */
  var params = new URLSearchParams(location.search);
  var frozenAt = params.has('t') ? parseFloat(params.get('t')) : NaN;
  var frozen = !isNaN(frozenAt);

  var motion = !reduceMQ.matches && params.get('autoplay') !== '0' && !frozen; // the demo ticks
  var base = START;         // the word the demo started from
  var demoTime = frozen ? frozenAt : 0;
  var pos = START;          // continuous: 3.5 means half-way from Jitter to Versatile
  var anim = null;          // a move the visitor asked for: { from, to, t0 }
  var drag = null;
  var now = 0;
  var current = -1;
  var u = 1, pitch = PITCH, spacing = 125;
  var dragVel = 0;
  var optIn = false;        // Play overrides reduced motion
  var lastVel = 0, lastNudge = 0;

  /* ---------------------------------------------------------------- Geometry
     Matches the --u formula in style.css. */
  function measure() {
    var w = root.clientWidth, h = root.clientHeight;
    u = Math.min(h / 720, (w - 32) / 830);
    var reach = REACH * u;
    var fill = Math.asin(Math.min(1, (h / 2) / (4.6 * reach))) * 180 / Math.PI;
    pitch = clamp(fill, PITCH, PITCH_MAX);
    spacing = reach * Math.sin(pitch * Math.PI / 180); // px between words at the arrow
  }

  /* ---------------------------------------------------------------- The demo
     A hold, then a 0.57s tick, every 0.75s. Returns the position and the
     time since the latest tick began (for the nudge). */
  function demoAt(t) {
    var n = Math.floor((t - STEP_AT) / PERIOD);
    var since = t - STEP_AT - n * PERIOD;
    if (t < STEP_AT) return { pos: 0, since: Infinity };
    return { pos: n + STEP_EASE(since / STEP_DUR), since: since };
  }

  function animAt(t) {
    var p = (t - anim.t0) / animDur();
    return mix(anim.from, anim.to, STEP_EASE(p));
  }

  function still() { return reduceMQ.matches && !optIn; }
  function animDur() { return still() ? 0.0001 : STEP_DUR; }

  // As the next word comes up, the arrow and the list push right, hold for
  // a frame, then settle back (tracked: 0 to 28px in frames 3 to 7, home by 15)
  var nudgeBack = bezier(0.2, 0, 0.3, 1);
  function nudgeAt(since) {
    if (!(since >= 0)) return 0;
    if (since < 0.255) return smooth((since - 0.085) / 0.135);
    return 1 - nudgeBack((since - 0.255) / 0.24);
  }

  /* ---------------------------------------------------------------- Render */
  function render(velocity, nudge) {
    for (var i = 0; i < COUNT; i++) {
      var k = mod(i - pos + COUNT / 2, COUNT) - COUNT / 2; // signed distance from the arrow
      var d = Math.abs(k);
      var li = items[i];
      if (d > VISIBLE + 0.5) {
        li.style.visibility = 'hidden';
        continue;
      }
      li.style.visibility = '';
      li.style.transform = 'rotate(' + (k * pitch).toFixed(3) + 'deg)';
      // Depth of field: soft one word away, lost by the edges
      var blur = d < 0.02 ? 0 : (1.6 * d + 0.45 * d * d) * u;
      li.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
      li.style.opacity = (1 - smooth((d - (VISIBLE - 1)) / 1)).toFixed(3);
      var lit = 1 - smooth(d);
      var c = Math.round(mix(130, 255, lit));
      words[i].style.color = 'rgb(' + c + ',' + c + ',' + c + ')';
    }

    lastVel = velocity;
    lastNudge = nudge;
    var mb = still() ? 0 : Math.min(BLUR_MAX * u, Math.abs(velocity) * spacing * SHUTTER);
    if (mb > 0.3) {
      blurNode.setAttribute('stdDeviation', '0 ' + mb.toFixed(2));
      wheel.classList.add('is-moving');
    } else {
      wheel.classList.remove('is-moving');
    }

    var shift = nudge > 0.001 ? 'translateX(' + (NUDGE * u * nudge).toFixed(2) + 'px)' : '';
    arrow.style.transform = shift;
    wheel.style.transform = shift;

    var c2 = mod(Math.round(pos), COUNT);
    if (c2 !== current) setCurrent(c2);
  }

  function setCurrent(i) {
    var hadFocus = words.indexOf(document.activeElement) !== -1;
    current = i;
    words.forEach(function (b, j) {
      b.tabIndex = j === i ? 0 : -1;
      if (j === i) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    if (hadFocus && document.activeElement !== words[i]) words[i].focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------- Clock */
  var raf = 0, last = 0;

  function frame(ts) {
    raf = 0;
    var dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
    last = ts;
    now += dt;

    var velocity = 0, nudge = 0, busy = false;

    if (drag) {
      velocity = dragVel;
      nudge = clamp(Math.abs(dragVel) / 6, 0, 1);
      busy = true;
    } else if (anim) {
      var prev = pos;
      pos = animAt(now);
      velocity = dt ? (pos - prev) / dt : 0;
      nudge = still() ? 0 : nudgeAt(now - anim.t0);
      if (now - anim.t0 >= animDur() && nudge <= 0) { pos = anim.to; anim = null; }
      busy = true;
    } else if (motion && !holding()) {
      demoTime += dt;
      var a = demoAt(demoTime), b = demoAt(demoTime + 0.004);
      pos = base + a.pos;
      velocity = (b.pos - a.pos) / 0.004;
      nudge = nudgeAt(a.since);
      busy = true;
    }

    render(velocity, nudge);
    if (busy) kick(); else last = 0;
  }

  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  // The demo waits while a word holds keyboard focus (WCAG 2.2.2)
  function holding() {
    var el = document.activeElement;
    return words.indexOf(el) !== -1 && el.matches(':focus-visible');
  }

  /* ---------------------------------------------------------------- Moves */
  function stopDemo() {
    if (motion) setMotion(false);
  }

  function goTo(target, announce) {
    stopDemo();
    anim = { from: pos, to: target, t0: now };
    kick();
    if (announce) {
      var i = mod(Math.round(target), COUNT);
      live.textContent = words[i].textContent + ', ' + (i + 1) + ' of ' + COUNT;
    }
  }

  function targetBase() { return anim ? anim.to : Math.round(pos); }
  function step(dir) { goTo(targetBase() + dir, true); }
  function goToIndex(i) {
    var from = targetBase();
    var delta = mod(i - from + COUNT / 2, COUNT) - COUNT / 2; // the short way round
    goTo(from + delta, true);
  }

  function setMotion(on) {
    motion = on;
    toggle.textContent = on ? 'Pause' : 'Play';
    if (on) {
      anim = null;
      base = Math.round(pos);
      pos = base;
      demoTime = -RESUME_HOLD;
      kick();
    }
  }

  /* ---------------------------------------------------------------- Input */
  toggle.addEventListener('click', function () {
    if (!motion) optIn = true;
    setMotion(!motion);
  });
  root.querySelector('[data-prev]').addEventListener('click', function () { step(-1); });
  root.querySelector('[data-next]').addEventListener('click', function () { step(1); });

  words.forEach(function (b, i) {
    b.addEventListener('click', function () {
      if (dragMoved) return;
      if (i !== current || anim) goToIndex(i);
    });
    b.addEventListener('focus', kick);
    b.addEventListener('blur', kick);
  });

  root.addEventListener('keydown', function (e) {
    if (words.indexOf(e.target) === -1) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowRight') step(1);
    else if (k === 'ArrowUp' || k === 'ArrowLeft') step(-1);
    else if (k === 'Home') goToIndex(0);
    else if (k === 'End') goToIndex(COUNT - 1);
    else return;
    e.preventDefault();
  });

  // Wheel and trackpad: a step per notch, a short rest between steps
  var wheelAcc = 0, wheelLast = 0;
  stage.addEventListener('wheel', function (e) {
    var dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
    if (Math.abs(dy) < Math.abs(e.deltaX)) return;
    e.preventDefault();
    var t = performance.now();
    if (t - wheelLast > 250) wheelAcc = 0;
    wheelLast = t;
    wheelAcc += dy;
    if (Math.abs(wheelAcc) >= 50) {
      step(wheelAcc > 0 ? 1 : -1);
      wheelAcc = 0;
      wheelLast = t + 120;
    }
  }, { passive: false });

  // Drag or swipe: the wheel follows the pointer, a flick carries it on
  var dragMoved = false;
  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    measure();
    drag = { id: e.pointerId, y: e.clientY, pos: pos, t: performance.now(), lastY: e.clientY };
    dragMoved = false;
    dragVel = 0;
  });

  stage.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = e.clientY - drag.y;
    if (!dragMoved && Math.abs(dy) < 6) return;
    if (!dragMoved) {
      dragMoved = true;
      stopDemo();
      anim = null;
      stage.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
    }
    var t = performance.now();
    var dtm = Math.max(1, t - drag.t) / 1000;
    var v = -(e.clientY - drag.lastY) / spacing / dtm;
    dragVel = mix(dragVel, v, 0.4);
    drag.t = t;
    drag.lastY = e.clientY;
    pos = drag.pos - dy / spacing;
    kick();
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var moved = dragMoved;
    var fling = performance.now() - drag.t > 80 ? 0 : dragVel;
    drag = null;
    stage.classList.remove('is-dragging');
    if (moved) {
      goTo(Math.round(pos + clamp(fling * 0.18, -3, 3)), true);
      // Let the click that follows a drag fall through harmlessly
      setTimeout(function () { dragMoved = false; }, 0);
    }
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  /* ---------------------------------------------------------------- Start */
  function onReduce() { if (reduceMQ.matches) { optIn = false; setMotion(false); } }
  if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduce);
  else if (reduceMQ.addListener) reduceMQ.addListener(onReduce);

  window.addEventListener('resize', function () { measure(); render(lastVel, lastNudge); });

  measure();
  toggle.textContent = motion ? 'Pause' : 'Play';
  if (frozen) {
    var f = demoAt(frozenAt), g = demoAt(frozenAt + 0.004);
    pos = START + f.pos;
    render((g.pos - f.pos) / 0.004, nudgeAt(f.since));
  } else {
    render(0, 0);
    if (motion) kick();
  }

  // Webfonts change nothing in the geometry, but redraw once they land
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); render(lastVel, lastNudge); });
})();
