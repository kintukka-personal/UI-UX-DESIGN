/* ==========================================================================
   Animated testimonial card stack-5.5
   One clock drives everything: the camera, the frosted box, the word masks
   and the stack. Every timing below was measured frame by frame from the
   source video (1152 x 720, 30 fps). Add ?t=2.1 to the URL to freeze any
   moment for review, and ?autoplay=0 to start paused.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-st]');
  if (!root) return;

  var world = root.querySelector('[data-world]');
  var photo = root.querySelector('[data-photo]');
  var stack = root.querySelector('[data-stack]');
  var stage = root.querySelector('[data-stage]');
  var playBtn = root.querySelector('[data-play]');
  var prevBtn = root.querySelector('[data-prev]');
  var nextBtn = root.querySelector('[data-next]');
  var countEl = root.querySelector('[data-count]');
  var liveEl = root.querySelector('[data-live]');

  var reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  var params = new URLSearchParams(location.search);
  var freezeAt = params.has('t') ? parseFloat(params.get('t')) : NaN;

  /* ---------------------------------------------------------------- Scene
     Units are pixels of the source frame. The photo covers 1152 x 712 of it. */
  var PHOTO_W = 1152, PHOTO_H = 712;
  var CARD_X = 576, CARD_Y = 359;   // card centre at rest
  var CAM_X = 576.6, CAM_Y = 334;   // the point the camera zooms out from
  var CAM_FROM = 1.502;             // first frame: 1.5x (less on phones)
  var CARD_W = 446;

  /* Box size as a fraction of the card at rest. The box starts as a tall
     empty pane, settles a little small, squeezes, then pops a touch past its
     rest size while the heart fills. The text never moves. */
  var BOX_OPEN = [1.029, 1.407];
  var BOX_HOLD = [0.930, 0.915];
  var BOX_SQUEEZE = [0.825, 0.829];
  var BOX_POP = [1.045, 1.047];
  var BOX_REST = [1, 1];

  /* Seconds from the start of a card's reveal. Everything after the quote is
     timed from its last word (1.43s in the video), so longer quotes stretch. */
  var CAM_DUR = 1.5;        // camera, first card only
  var ENTER_DUR = 0.9;      // later cards rise into place instead
  var WORDS_AT = 0.63;      // first word of the quote
  var WORD_STEP = 0.0615;   // 14 words over 0.8s
  var WORD_DUR = 0.34;
  var LAST_WORD = 1.43;
  var MARK_AT = 0.78, MARK_DUR = 0.22;
  var GHOST_AT = 1.3, GHOST_DUR = 0.2;      // heart appears, half lit
  var AVATAR_AT = 1.4, AVATAR_DUR = 0.2;    // grows from a dot
  var WHO_AT = 1.62, WHO_STEP = 0.0667;     // name and role, word by word
  var SQUEEZE_AT = 1.75, SQUEEZE_DUR = 0.45;
  var POP_AT = 2.2, POP_DUR = 0.3;
  var SETTLE_AT = 2.5, SETTLE_DUR = 0.9;
  var FILL_AT = 2.3, FILL_DUR = 0.22;       // heart lights up...
  var BEAT_AT = 2.25, BEAT_DUR = 0.42;      // ...with one beat
  var CYCLE = 5.2;                          // the video's length: then the next card
  var STACK_DUR = 0.9;

  /* ---------------------------------------------------------------- Easing */
  function bezier(x1, y1, x2, y2) {
    function sx(t) { return ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t; }
    function sy(t) { return ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t; }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 28; i++) {
        var v = sx(t);
        if (Math.abs(v - x) < 1e-6) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sy(t);
    };
  }
  var EASE_CAM = bezier(0.5, 0, 0, 1);       // fitted to the zoom, max error 0.01
  var EASE_WORD = bezier(0.2, 0.7, 0.2, 1);
  var EASE_STACK = bezier(0.5, 0, 0.1, 1);
  var EASE_AVATAR = bezier(0.45, 0, 0.25, 1.2);
  function easeOutCubic(u) { return 1 - Math.pow(1 - u, 3); }
  function easeInOutSine(u) { return -(Math.cos(Math.PI * u) - 1) / 2; }
  function clamp01(u) { return u < 0 ? 0 : u > 1 ? 1 : u; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function mix(a, b, u) { return a + (b - a) * u; }
  function phase(t, at, dur) { return clamp01((t - at) / dur); }

  /* ---------------------------------------------------------------- Build */
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function wordsHTML(text, suffix) {
    var words = text.trim().split(/\s+/);
    return words.map(function (w, i) {
      var end = (suffix && i === words.length - 1) ? suffix : '';
      return '<span class="st__w"><span class="st__wi">' + esc(w) + end + '</span></span>';
    }).join(' ');
  }

  var cards = Array.prototype.slice.call(root.querySelectorAll('[data-card]')).map(function (el, i) {
    var p = el.querySelector('[data-quote] p');
    var quote = p.textContent.trim();
    // The visible copy is split into words; screen readers get the plain text
    p.innerHTML = '<span class="st__sr">' + esc(quote) + '</span>' +
      '<span aria-hidden="true"><span class="st__open">“</span>' + wordsHTML(quote, '”') + '</span>';

    var who = el.querySelector('[data-who]');
    var name = who.querySelector('.st__name').textContent.trim();
    var role = who.querySelector('.st__role').textContent.trim();
    who.innerHTML = '<span class="st__sr">' + esc(name) + ' ' + esc(role) + '</span>' +
      '<span aria-hidden="true"><span class="st__name">' + wordsHTML(name) + '</span>' +
      '<span class="st__role">' + wordsHTML(role) + '</span></span>';

    var qWords = Array.prototype.slice.call(p.querySelectorAll('.st__wi'));
    var shift = Math.max(0, WORDS_AT + (qWords.length - 1) * WORD_STEP - LAST_WORD);
    return {
      el: el,
      glass: el.querySelector('[data-glass]'),
      body: el.querySelector('[data-body]'),
      mark: p.querySelector('.st__open'),
      words: qWords,
      who: Array.prototype.slice.call(who.querySelectorAll('.st__wi')),
      avatar: el.querySelector('[data-avatar]'),
      heart: el.querySelector('[data-heart]'),
      label: name.replace(/,$/, '') + ', ' + role,
      shift: shift,             // later events wait for long quotes
      revealAt: -1e9,
      intro: false,
      shown: false,
      depthFrom: 0, depthTo: 0, depthAt: -1e9,
      restW: 0, restH: 0,
      settledFor: null,
      index: i
    };
  });
  var COUNT = cards.length;

  /* ---------------------------------------------------------------- State */
  var clock = 0;
  var order = [];            // card indices, top of the stack first
  var current = 0;
  var playing = params.get('autoplay') !== '0';
  var hold = false;          // pointer over the cards or focus inside
  var tour = 0;              // seconds the top card has been up, while playing
  var reduce = reduceMQ.matches;

  var L = { vw: 0, vh: 0, k: 1, u: 1, offX: 0, offY: 0, cx: 0, cy: 0, ox: 0, oy: 0, compact: false, camFrom: CAM_FROM };

  /* ---------------------------------------------------------------- Layout
     The photo behaves like object-fit: cover around a focal point. On wide
     screens the card stays pinned to the photo, as in the source; on phones
     it keeps a readable size and sits under the face. */
  function layout() {
    var vw = root.clientWidth, vh = root.clientHeight;
    var k = Math.max(vw / PHOTO_W, vh / PHOTO_H);
    var aspect = vw / vh;
    var fx = aspect >= 1.2 ? 0.5 : aspect <= 0.75 ? 0.66 : mix(0.66, 0.5, (aspect - 0.75) / 0.45);
    var pw = PHOTO_W * k, ph = PHOTO_H * k;
    // On very wide screens the crop keeps the face in view
    var offX = (vw - pw) * fx, offY = (vh - ph) * 0.2;

    photo.style.width = pw + 'px';
    photo.style.height = ph + 'px';
    photo.style.transform = 'translate(' + offX + 'px,' + offY + 'px)';

    var hu = clamp(Math.min(vw / 1152, vh / 720), 0.78, 1.6);

    // Pinned to the photo when the card fits on screen there...
    var u = k;
    var pinX = offX + CARD_X * k;
    var anchored = pinX - CARD_W * k / 2 >= 16 && pinX + CARD_W * k / 2 <= vw - 16;
    // ...otherwise free, at a size that fits (and stays readable on phones)
    if (!anchored) u = Math.min(k, (vw - 32) / CARD_W, 1.2);
    var compact = u * 17.8 < 15;
    root.classList.toggle('is-compact', compact);
    if (compact) u = Math.min(vw - 32, 420) / CARD_W;
    root.style.setProperty('--u', u + 'px');
    root.style.setProperty('--hu', hu + 'px');

    cards.forEach(function (c) {
      c.restW = c.body.offsetWidth;
      c.restH = c.body.offsetHeight;
    });
    var w = cards[current] ? cards[current].restW : CARD_W * u;
    var h = cards[current] ? cards[current].restH : 258 * u;

    var cx, cy, ox, oy;
    if (anchored) {
      cx = pinX; cy = offY + CARD_Y * k;
      ox = offX + CAM_X * k; oy = offY + CAM_Y * k;
    } else {
      // Below the face, clear of the logo and the controls
      cx = vw / 2;
      var top = 76 * hu + h / 2 + 24, bottom = vh - 72 - h / 2;
      cy = clamp(offY + 420 * k, Math.min(top, bottom), bottom);
      ox = cx; oy = cy - 25 * u;
    }
    // The opening pane should fit the screen at the first frame
    var camFrom = clamp((vw - 16) / (w * BOX_OPEN[0]), 1.2, CAM_FROM);
    stack.style.left = cx + 'px';
    stack.style.top = cy + 'px';
    L = { vw: vw, vh: vh, k: k, u: u, offX: offX, offY: offY, cx: cx, cy: cy, ox: ox, oy: oy, compact: compact, camFrom: camFrom };
  }

  /* ---------------------------------------------------------------- Stack */
  function depthOf(c) {
    return mix(c.depthFrom, c.depthTo, EASE_STACK(phase(clock, c.depthAt, STACK_DUR)));
  }

  function show(i, user) {
    i = ((i % COUNT) + COUNT) % COUNT;
    if (order[0] === i && cards[i].shown) return;
    order = [i].concat(order.filter(function (j) { return j !== i; }));
    order.forEach(function (j, d) {
      var c = cards[j];
      if (d === 0) {
        c.depthFrom = c.depthTo = 0;
        c.depthAt = -1e9;
      } else {
        c.depthFrom = depthOf(c);
        c.depthTo = d;
        c.depthAt = clock;
      }
    });
    var c = cards[i];
    c.revealAt = clock;
    c.intro = !c.shown && i === 0 && clock === 0;
    c.shown = true;
    current = i;
    tour = 0;

    cards.forEach(function (card, j) {
      var top = j === i;
      card.el.toggleAttribute('inert', !top);
      if (top) card.el.removeAttribute('aria-hidden'); else card.el.setAttribute('aria-hidden', 'true');
      card.el.style.zIndex = String(COUNT - order.indexOf(j));
    });
    countEl.textContent = (i + 1) + ' / ' + COUNT;
    if (user) liveEl.textContent = 'Testimonial ' + (i + 1) + ' of ' + COUNT + ': ' + c.label;
    layout();
  }

  /* ---------------------------------------------------------------- Render */
  function boxAt(c, t) {
    var a, b, u;
    var s = c.shift;
    if (t < SQUEEZE_AT + s) {
      u = c.intro ? EASE_CAM(phase(t, 0, CAM_DUR)) : EASE_CAM(phase(t, 0, ENTER_DUR));
      a = BOX_OPEN; b = BOX_HOLD;
    } else if (t < POP_AT + s) {
      u = easeInOutSine(phase(t, SQUEEZE_AT + s, SQUEEZE_DUR)); a = BOX_HOLD; b = BOX_SQUEEZE;
    } else if (t < SETTLE_AT + s) {
      u = easeOutCubic(phase(t, POP_AT + s, POP_DUR)); a = BOX_SQUEEZE; b = BOX_POP;
    } else {
      u = easeInOutSine(phase(t, SETTLE_AT + s, SETTLE_DUR)); a = BOX_POP; b = BOX_REST;
    }
    return [mix(a[0], b[0], u), mix(a[1], b[1], u)];
  }

  function renderCard(c) {
    var el = c.el;
    if (!c.shown) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = '';

    var t = clock - c.revealAt;
    var s = c.shift;
    var d = order[0] === c.index ? 0 : depthOf(c);
    var u = L.u;

    if (reduce) {
      // No travel: the new card fades in over the old one
      var fade = order[0] === c.index ? clamp01(t / 0.4) : (d < 1 ? 1 : 0);
      c.glass.style.opacity = c.body.style.opacity = String(fade);
      el.style.transform = 'translate(-50%, -50%)';
      setGlass(c, 1, 1);
      setContent(c, 1e9);
      return;
    }

    // Top card: rises in (unless the camera brings it in)
    var rise = 0, alpha = 1;
    if (d === 0 && !c.intro) {
      var e = phase(t, 0, ENTER_DUR);
      rise = (1 - EASE_CAM(e)) * 70 * u;
      alpha = clamp01(t / 0.35);
    }

    // Older cards step back and up, so their top edges peek out behind
    var lift = -30 * u * d;
    var scale = 1 - 0.07 * d;
    var glassAlpha = d <= 1 ? 1 : d <= 2 ? mix(1, 0.55, d - 1) : mix(0.55, 0, clamp01(d - 2));
    var contentAlpha = 1 - clamp01(d / 0.6);

    el.style.transform = 'translate(-50%, calc(-50% + ' + (rise + lift) + 'px)) scale(' + scale + ')';
    c.glass.style.opacity = String(alpha * glassAlpha);
    c.body.style.opacity = String(alpha * contentAlpha);

    var box = d === 0 ? boxAt(c, t) : BOX_REST;
    setGlass(c, box[0], box[1]);
    if (d < 1) setContent(c, t);
  }

  function setGlass(c, fw, fh) {
    c.glass.style.width = (c.restW * fw) + 'px';
    c.glass.style.height = (c.restH * fh) + 'px';
  }

  function setContent(c, t) {
    var s = c.shift, i, v;
    // Once everything has landed, leave the styles alone
    var settled = t > SETTLE_AT + s + SETTLE_DUR;
    if (settled && c.settledFor === c.revealAt) return;
    c.settledFor = settled ? c.revealAt : null;
    for (i = 0; i < c.words.length; i++) {
      v = EASE_WORD(phase(t, WORDS_AT + i * WORD_STEP, WORD_DUR));
      c.words[i].style.transform = v >= 1 ? '' : 'translateY(' + ((1 - v) * 112) + '%)';
    }
    for (i = 0; i < c.who.length; i++) {
      v = EASE_WORD(phase(t, WHO_AT + s + i * WHO_STEP, WORD_DUR));
      c.who[i].style.transform = v >= 1 ? '' : 'translateY(' + ((1 - v) * 112) + '%)';
    }
    c.mark.style.opacity = String(phase(t, MARK_AT, MARK_DUR));

    var a = phase(t, AVATAR_AT + s, AVATAR_DUR);
    c.avatar.style.transform = a >= 1 ? '' : 'scale(' + Math.max(0, EASE_AVATAR(a)) + ')';
    c.avatar.style.opacity = a > 0 ? '1' : '0';

    var g = easeOutCubic(phase(t, GHOST_AT + s, GHOST_DUR));
    var f = phase(t, FILL_AT + s, FILL_DUR);
    var beat = Math.sin(Math.PI * phase(t, BEAT_AT + s, BEAT_DUR));
    c.heart.style.opacity = String(g * mix(0.5, 1, f));
    c.heart.style.transform = 'scale(' + (mix(0.6, 1, g) * (1 + 0.2 * beat)) + ')';
  }

  function render() {
    var z = 1;
    var top = cards[order[0]];
    if (top && top.intro && !reduce) {
      z = mix(L.camFrom, 1, EASE_CAM(phase(clock - top.revealAt, 0, CAM_DUR)));
    }
    world.style.transform = z === 1 ? '' :
      'translate(' + (L.ox * (1 - z)) + 'px,' + (L.oy * (1 - z)) + 'px) scale(' + z + ')';
    cards.forEach(renderCard);
  }

  /* ---------------------------------------------------------------- Clock */
  function cycleOf(c) { return CYCLE + c.shift; }

  function step(dt) {
    clock += dt;
    if (playing && !hold) {
      tour += dt;
      if (tour >= cycleOf(cards[current])) show(current + 1, false);
    }
  }

  var last = 0, raf = 0;
  function frame(now) {
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    step(dt);
    render();
    raf = requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------- Input */
  function setPlaying(on) {
    playing = on;
    root.classList.toggle('is-paused', !on);
    playBtn.setAttribute('aria-label', on ? 'Pause testimonials' : 'Play testimonials');
  }

  function go(dir) {
    show(current + dir, true);
  }

  playBtn.addEventListener('click', function () { setPlaying(!playing); });
  prevBtn.addEventListener('click', function () { go(-1); });
  nextBtn.addEventListener('click', function () { go(1); });

  root.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
  });

  // Hold the tour while someone is reading or using the controls
  stack.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hold = true; });
  stack.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') hold = false; });
  root.addEventListener('focusin', function () { hold = true; });
  root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) hold = false; });

  // Swipe sideways (or up) for the next card
  var down = null;
  stage.addEventListener('pointerdown', function (e) {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  stage.addEventListener('pointerup', function (e) {
    if (!down) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    var quick = performance.now() - down.t < 700;
    down = null;
    if (!quick) return;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    else if (dy < -50 && Math.abs(dy) > Math.abs(dx)) go(1);
  });
  stage.addEventListener('pointercancel', function () { down = null; });

  reduceMQ.addEventListener('change', function (e) { reduce = e.matches; });
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  /* ---------------------------------------------------------------- Start */
  root.classList.add('is-ready');
  setPlaying(playing);
  layout();
  show(0, false);

  if (!isNaN(freezeAt)) {
    // Step the timeline to the requested moment and hold it there
    var n = Math.round(freezeAt * 120);
    for (var i = 0; i < n; i++) step(1 / 120);
    render();
    window.addEventListener('resize', render);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
  } else {
    render();
    raf = requestAnimationFrame(frame);
  }
})();
