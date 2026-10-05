/* Animated testimonial card stack-5.0 — one clock drives the whole thing.
   The numbers are seconds read off the 30fps source video, frame by frame. */
(function () {
  'use strict';

  var root = document.querySelector('[data-ui-testimonial]');
  if (!root) return;

  /* ------------------------------------------------------------------ timing */

  var CYCLE      = 5.167;   // the source loop, 155 frames at 30fps
  var ENTER_DUR  = 1.35;    // the stack collapses, and the camera settles, over this
  var OUT_DUR    = .52;     // and a card leaves over this
  var CAM_FROM   = 1.5;     // the camera starts here and lands on 1
  var PANE_FROM  = 1.53;    // each sheet of glass starts this big
  var PANE_REST  = .907;    // and lands here before the squeeze
  var LIKE_AT    = 2.33;    // the quote likes itself here
  var LIKE_IN    = .30;
  var LIKE_OUT   = .18;

  // the pane scale after the stack has collapsed: hold, squeeze, pop, settle
  var SETTLE = [
    [ENTER_DUR, PANE_REST, null],
    [1.60, PANE_REST, 'io'],
    [2.17, .822, 'io'],
    [2.57, 1.035, 'out'],
    [3.20, 1.000, 'io']
  ];

  /* ------------------------------------------------------------------ easing */

  function bezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function fx(t) { return ((ax * t + bx) * t + cx) * t; }
    function fy(t) { return ((ay * t + by) * t + cy) * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x, i;
      for (i = 0; i < 24; i++) { t = (lo + hi) / 2; if (fx(t) < x) lo = t; else hi = t; }
      return fy((lo + hi) / 2);
    };
  }

  // the source's own curve: a long anticipation, then a hard glide in. The camera push-out
  // and the stack collapse share it exactly.
  var EASE_IN  = bezier(.55, 0, .03, .92);
  var EASE_IO  = bezier(.45, 0, .25, 1);
  var EASE_OUT = bezier(.18, .74, .34, 1);
  var EASES    = { io: EASE_IO, out: EASE_OUT };

  function lerp(a, b, p) { return a + (b - a) * p; }

  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i];
        var p = (t - a[0]) / (b[0] - a[0]);
        var e = EASES[b[2]];
        return lerp(a[1], b[1], e ? e(p) : p);
      }
    }
    return keys[keys.length - 1][1];
  }

  function paneScale(t) {
    if (t < ENTER_DUR) return lerp(PANE_FROM, PANE_REST, EASE_IN(t / ENTER_DUR));
    return track(SETTLE, t);
  }

  function fanAmount(t) {
    return t >= ENTER_DUR ? 0 : 1 - EASE_IN(t / ENTER_DUR);
  }

  /* ------------------------------------------------------------------ the deck */

  var stage  = root.querySelector('[data-stage]');
  var plate  = root.querySelector('[data-plate]');
  var dotBox = root.querySelector('[data-dots]');
  var live   = root.querySelector('[data-live]');
  var playBt = root.querySelector('[data-play]');
  var playLb = root.querySelector('[data-play-label]');

  var slides = [].map.call(root.querySelectorAll('[data-item]'), function (el, i) {
    var card = el.querySelector('[data-card]');
    var name = el.querySelector('.ui-testimonial__name');
    var who = name ? [].map.call(name.childNodes, function (n) {
      return n.nodeName === 'BR' ? ' ' : n.textContent;
    }).join('').replace(/\s+/g, ' ').trim() : '';
    [].forEach.call(el.querySelectorAll('[data-words]'), splitWords);
    return {
      index: i,
      el: el,
      card: card,
      like: el.querySelector('[data-like]'),
      who: who,
      t: 0,
      liked: false,
      likedByHand: false,
      likeV: 0,
      out: 0,
      written: {}
    };
  });

  // each word gets its own span and its place in the queue; <br> and anything else
  // in the paragraph is carried over untouched
  function splitWords(p) {
    var frag = document.createDocumentFragment();
    var n = 0;
    [].slice.call(p.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) { frag.appendChild(node.cloneNode(true)); return; }
      node.textContent.split(/(\s+)/).forEach(function (chunk) {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(' ')); return; }
        var s = document.createElement('span');
        s.className = 'ui-testimonial__w';
        s.style.setProperty('--i', n++);
        s.textContent = chunk;
        frag.appendChild(s);
      });
    });
    p.textContent = '';
    p.appendChild(frag);
    p.style.setProperty('--n', Math.max(n - 1, 0));
  }

  // writing a custom property every frame is wasted work if the value has not moved
  function put(slide, el, name, value) {
    var key = name + (el === slide.card ? '' : '#');
    var v = Math.round(value * 1000) / 1000;
    if (slide.written[key] === v) return;
    slide.written[key] = v;
    el.style.setProperty(name, v);
  }

  /* ------------------------------------------------------------------ state */

  var params  = new URLSearchParams(location.search);
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var cur = 0, prev = -1, prevOut = 0;
  var intro = 0, introDone = false;
  var playing = params.get('autoplay') !== '0';
  var visible = true, focusHeld = false;
  var scrub = parseFloat(params.get('t'));

  if (reduced.matches) playing = false;

  var dots = slides.map(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ui-testimonial__dot';
    b.setAttribute('aria-label', 'Quote ' + (i + 1) + ' of ' + slides.length);
    b.addEventListener('click', function () { go(i, true); });
    dotBox.appendChild(b);
    return b;
  });

  function activate(i, replay) {
    slides.forEach(function (s, k) {
      if (k === i) s.el.setAttribute('data-active', '');
      else if (k !== prev) s.el.removeAttribute('data-active');
      s.el.classList.toggle('is-leaving', k === prev);
    });
    dots.forEach(function (d, k) {
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    if (replay) slides[i].t = 0;
    if (reduced.matches) slides[i].t = 99;
  }

  function go(i, announce) {
    var next = (i + slides.length) % slides.length;
    if (next === cur && prev < 0) { slides[cur].t = reduced.matches ? 99 : 0; return; }
    prev = cur;
    prevOut = 0;
    cur = next;
    slides[cur].t = reduced.matches ? 99 : 0;
    slides[cur].out = 0;
    activate(cur, true);
    if (announce && live) live.textContent = (cur + 1) + ' of ' + slides.length + '. ' + slides[cur].who;
  }

  /* ------------------------------------------------------------------ the clock */

  var last = 0, lastCam = -1;

  function render(slide, t) {
    var card = slide.card;
    put(slide, card, '--t', t);
    put(slide, card, '--s', paneScale(t));
    var f = reduced.matches ? 0 : fanAmount(t);
    put(slide, card, '--f', f);
    card.classList.toggle('is-fanned', f > .004);
    put(slide, card, '--like', slide.likeV);
    put(slide, card, '--out', slide.out);
  }

  function step(now) {
    var dt = last ? Math.min((now - last) / 1000, .06) : 0;
    last = now;
    var running = playing && visible && !focusHeld && !reduced.matches && isNaN(scrub);

    if (running) {
      if (!introDone) {
        intro += dt;
        if (intro >= ENTER_DUR) { intro = ENTER_DUR; introDone = true; }
      }
      slides[cur].t += dt;
      if (prev >= 0) {
        prevOut += dt;
        slides[prev].out = EASE_IO(Math.min(prevOut / OUT_DUR, 1));
        if (prevOut >= OUT_DUR) {
          slides[prev].el.classList.remove('is-leaving');
          slides[prev].el.removeAttribute('data-active');
          slides[prev].out = 0;
          render(slides[prev], slides[prev].t);
          prev = -1;
        }
      }
      if (slides[cur].t >= CYCLE) go(cur + 1, false);
    }

    // the camera only pushes out once, on the first card
    var cam = reduced.matches ? 1 : lerp(CAM_FROM, 1, EASE_IN(Math.min(intro / ENTER_DUR, 1)));
    cam = Math.round(cam * 1000) / 1000;
    if (cam !== lastCam) { stage.style.setProperty('--cam', cam); lastCam = cam; }

    slides.forEach(function (s) {
      var isLive = s.index === cur || s.index === prev;
      if (!isLive) return;
      if (s.index === cur && !s.likedByHand && s.t >= LIKE_AT) s.liked = true;
      var target = s.liked ? 1 : 0;
      var rate = dt / (target > s.likeV ? LIKE_IN : LIKE_OUT);
      if (s.likeV < target) s.likeV = Math.min(target, s.likeV + rate);
      else if (s.likeV > target) s.likeV = Math.max(target, s.likeV - rate);
      if (s.like) s.like.setAttribute('aria-pressed', s.liked ? 'true' : 'false');
      render(s, s.t);
    });

    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------ input */

  slides.forEach(function (s) {
    if (!s.like) return;
    s.like.addEventListener('click', function () {
      s.liked = !s.liked;
      s.likedByHand = true;
      if (live) live.textContent = (s.liked ? 'Liked' : 'Unliked') + ': ' + s.who;
    });
  });

  playBt.addEventListener('click', function () {
    playing = !playing;
    root.toggleAttribute('data-paused', !playing);
    playLb.textContent = playing ? 'Pause' : 'Play';
  });

  root.querySelector('[data-prev]').addEventListener('click', function () { go(cur - 1, true); });
  root.querySelector('[data-next]').addEventListener('click', function () { go(cur + 1, true); });

  root.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(cur - 1, true); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { go(cur + 1, true); e.preventDefault(); }
  });

  // the reveal waits while a keyboard is inside the card, so nothing moves under it
  root.addEventListener('focusin', function (e) {
    focusHeld = !!(e.target.closest && e.target.closest('[data-card], [data-stage]'));
  });
  root.addEventListener('focusout', function () { focusHeld = false; });

  var swipe = null;
  stage.addEventListener('pointerdown', function (e) { swipe = { x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointerup', function (e) {
    if (!swipe) return;
    var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1), true);
  });
  stage.addEventListener('pointercancel', function () { swipe = null; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: .15 })
      .observe(stage);
  }

  reduced.addEventListener('change', function () {
    if (reduced.matches) { slides[cur].t = 99; intro = ENTER_DUR; introDone = true; }
  });

  /* ------------------------------------------------------------------ start */

  if (!isNaN(scrub)) {               // ?t=2.4 freezes the reveal for a screenshot
    slides[cur].t = scrub;
    intro = Math.min(scrub, ENTER_DUR);
    introDone = true;
    playing = false;
  }
  if (reduced.matches) { intro = ENTER_DUR; introDone = true; }
  root.setAttribute('data-ready', '');
  root.toggleAttribute('data-paused', !playing);
  playLb.textContent = playing ? 'Pause' : 'Play';
  activate(cur, !reduced.matches && isNaN(scrub));
  requestAnimationFrame(step);
})();
