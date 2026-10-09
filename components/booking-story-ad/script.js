/* ==========================================================================
   Booking Story Ad
   One clock drives the whole 33-second ad, so Pause stops everything
   exactly and ?t= shows any moment of it for review. Every position, size
   and time below was measured from the source video (720 x 400, 25 fps);
   coordinates are source pixels and --u turns them into screen pixels.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-ui-bsa]');
  if (!root) return;

  /* ---------------------------------------------------------------- Config
     The words the ad tells its story with. Change them here; the transcript
     and the booking UI read the same values. */
  var CONFIG = {
    brand: 'tomaru',
    destination: 'Kyoto, Japan',
    country: 'Japan',
    year: 2025,
    month: 9,              // 0-based: October
    checkIn: 6,
    checkOut: 10,
    guests: 2,
    listingTitle: 'Room in Shimogyo Ward, Japan',
    listingFacts: '2 guests · 1 bedroom · 2 beds · 1 private bath',
    legal: '©2025 - tomaru - All Rights Reserved.'
  };

  var PHOTOS = {
    onsen:   'images/01-onsen-street-night.webp',
    garden:  'images/02-garden-room-dusk.webp',
    shoji:   'images/03-tatami-shoji.webp',
    hills:   'images/04-ryokan-hillside.webp',
    lantern: 'images/05-lantern-entrance.webp',
    sunlit:  'images/06-sunlit-tatami.webp',
    window:  'images/07-garden-window.webp',
    gion:    'images/08-gion-rain.webp',
    machiya: 'images/09-machiya.webp',
    futon:   'images/10-futon-room.webp',
    bath:    'images/11-cedar-bath.webp'
  };

  var DUR = 33.12;                     // the source cuts to black at 33.12s
  var TRACKS = window.UI_BSA_TRACKS || {};
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------- Colours */
  var C = {
    coral: '#fd575e', coralText: '#e8474f', cream: '#eee9e6', ballCream: '#efeae7',
    teal: '#008186', grey: '#757575', ink: '#201307', inkSoft: '#403329',
    band: '#9a908a', white: '#ffffff', cta: '#d43a43', ctaHover: '#c8353e', ctaPress: '#b9313a'
  };

  /* ---------------------------------------------------------------- Helpers */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function prog(t, t0, t1) { return clamp((t - t0) / (t1 - t0), 0, 1); }

  var E = {
    lin: function (p) { return p; },
    inQ: function (p) { return p * p; },
    outQ: function (p) { return 1 - (1 - p) * (1 - p); },
    io: function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; },
    inC: function (p) { return p * p * p; },
    outC: function (p) { return 1 - Math.pow(1 - p, 3); },
    ioC: function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    outX: function (p) { return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); },
    outB: function (p) { var c = 1.9, d = c + 1; return 1 + d * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  };

  // Piecewise keyframes: [[time, value, ease-into-this-key], ...]
  function kf(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i];
        var p = (t - a[0]) / (b[0] - a[0] || 1);
        return mix(a[1], b[1], (b[2] || E.io)(p));
      }
    }
    return keys[keys.length - 1][1];
  }
  // The same, linear between every key (for curves sampled frame by frame)
  function lin(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i];
        return mix(a[1], b[1], (t - a[0]) / (b[0] - a[0] || 1));
      }
    }
    return keys[keys.length - 1][1];
  }

  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function mixColor(a, b, p) {
    var x = hexRgb(a), y = hexRgb(b); p = clamp(p, 0, 1);
    return 'rgb(' + Math.round(mix(x[0], y[0], p)) + ',' + Math.round(mix(x[1], y[1], p)) + ',' + Math.round(mix(x[2], y[2], p)) + ')';
  }

  /* ---------------------------------------------------------------- Units and layout
     Landscape: the 720 x 400 source frame fits the space above the controls.
     Portrait (phones): a 405 x 720 frame, and each scene scales its
     composition by its own factor (pk) so the type stays large. */
  var frame = root.querySelector('[data-frame]');
  var canvas = root.querySelector('[data-canvas]');
  var U = 1, PORTRAIT = false;

  function layout() {
    var w = frame.clientWidth, h = frame.clientHeight;
    if (!w || !h) return;
    PORTRAIT = w / h < 0.9;
    U = PORTRAIT ? Math.min(w / 405, h / 720) : Math.min(w / 720, h / 400);
    root.style.setProperty('--u', U + 'px');
    root.classList.toggle('is-portrait', PORTRAIT);
    measure();
    render(T);
  }

  // Place an element so its centre (or the anchor ax/ay, in % of its own size)
  // lands at source point (x, y) of its layer.
  function put(el, x, y, o) {
    if (!el) return;
    o = o || {};
    var s = o.s == null ? 1 : o.s;
    var sx = (o.sx == null ? 1 : o.sx) * s, sy = (o.sy == null ? 1 : o.sy) * s;
    var tr = 'translate(' + ((x - 360) * U).toFixed(2) + 'px,' + ((y - 200) * U).toFixed(2) + 'px) translate(' +
      (o.ax == null ? -50 : o.ax) + '%,' + (o.ay == null ? -50 : o.ay) + '%)';
    if (o.r) tr += ' rotate(' + o.r.toFixed(2) + 'deg)';
    if (sx !== 1 || sy !== 1) tr += ' scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
    el.style.transform = tr;
    var op = o.o == null ? 1 : clamp(o.o, 0, 1);
    el.style.opacity = op >= 1 ? '' : op.toFixed(3);
    el.style.filter = o.blur > 0.05 ? 'blur(' + (o.blur * U).toFixed(2) + 'px)' : '';
    el.style.visibility = op <= 0 || o.hide ? 'hidden' : 'visible';
  }
  function hide(el) { if (el) el.style.visibility = 'hidden'; }
  function size(el, w, h) {
    el.style.width = (w * U).toFixed(2) + 'px';
    if (h != null) el.style.height = (h * U).toFixed(2) + 'px';
  }

  // A tracked ball: position, stretch and angle come straight from the source,
  // one sample per frame, interpolated in between.
  function ball(el, name, t, color, o) {
    var tr = TRACKS[name];
    if (!el) return;
    if (!tr) { hide(el); return; }
    var f = (t - tr.t0) * 25, i = Math.floor(f), p = f - i;
    var a = tr.f[i], b = tr.f[i + 1];
    if (i < 0 || i >= tr.f.length || !a) { hide(el); return; }
    if (!b) b = a;
    var L = mix(a[2], b[2], p), W = mix(a[3], b[3], p);
    var da = b[4] - a[4];
    if (da > 90) da -= 180; else if (da < -90) da += 180;
    if (L / W > 1.6) L *= 0.94;
    size(el, Math.max(L, 2), Math.max(W, 2));
    if (color) el.style.background = color;
    o = o || {};
    put(el, mix(a[0], b[0], p) + (o.dx || 0), mix(a[1], b[1], p) + (o.dy || 0), { r: a[4] + da * p, o: o.o });
  }
  // A capsule from (ax, ay) to (bx, by): the ball still joined to the button it drips from
  function capsule(el, ax, ay, bx, by, wd, color) {
    var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy) + wd;
    size(el, len, wd);
    if (color) el.style.background = color;
    put(el, (ax + bx) / 2, (ay + by) / 2, { r: Math.atan2(dy, dx) * 180 / Math.PI });
  }
  function trackAt(name, t) {
    var tr = TRACKS[name];
    if (!tr) return null;
    var f = (t - tr.t0) * 25, i = Math.floor(f), p = f - i;
    var a = tr.f[i], b = tr.f[i + 1] || a;
    if (!a) return null;
    return { x: mix(a[0], b[0], p), y: mix(a[1], b[1], p), L: mix(a[2], b[2], p), W: mix(a[3], b[3], p) };
  }

  /* ---------------------------------------------------------------- Scenes */
  function scene(key) {
    var el = canvas.querySelector('[data-scene="' + key + '"]');
    var refs = {};
    Array.prototype.forEach.call(el.querySelectorAll('[data-k]'), function (n) { refs[n.getAttribute('data-k')] = n; });
    return { key: key, el: el, k: refs, world: el.querySelector('.ui-bsa__world'), screen: el.querySelector('.ui-bsa__screen') };
  }

  var SCENES = [
    { key: 'words',     t0: 0.00,  pk: 1.00 },
    { key: 'brand',     t0: 3.96,  pk: 0.92 },
    { key: 'giant',     t0: 6.28,  pk: 1.00 },
    { key: 'simple',    t0: 7.00,  pk: 1.00 },
    { key: 'bar',       t0: 7.76,  pk: 0.74 },
    { key: 'tilt',      t0: 9.28,  pk: 0.74 },
    { key: 'dest',      t0: 10.00, pk: 0.68 },
    { key: 'where',     t0: 10.70, pk: 0.62 },
    { key: 'bigtime',   t0: 12.20, pk: 1.00 },
    { key: 'time',      t0: 12.60, pk: 1.00 },
    { key: 'cal',       t0: 13.80, pk: 0.70 },
    { key: 'wall',      t0: 18.24, pk: 0.66 },
    { key: 'listing',   t0: 20.32, pk: 0.62 },
    { key: 'request',   t0: 24.30, pk: 0.92 },
    { key: 'wait',      t0: 25.76, pk: 0.72 },
    { key: 'dots',      t0: 27.20, pk: 1.00 },
    { key: 'confirmed', t0: 28.80, pk: 1.00 },
    { key: 'logo',      t0: 30.24, pk: 1.00 },
    { key: 'end',       t0: 31.68, pk: 1.00 }
  ];
  SCENES.forEach(function (s, i) {
    var dom = scene(s.key);
    s.el = dom.el; s.k = dom.k; s.world = dom.world; s.screen = dom.screen;
    s.t1 = i < SCENES.length - 1 ? SCENES[i + 1].t0 : DUR + 1;
  });
  var BY = {};
  SCENES.forEach(function (s) { BY[s.key] = s; });

  // Layer transforms: the screen layer takes the portrait scale, the world
  // layer also the camera (centre x/y in source px, zoom z, roll r).
  function layers(s, cam) {
    var k = PORTRAIT ? s.pk : 1;
    if (s.screen) s.screen.style.transform = k === 1 ? '' : 'scale(' + k + ')';
    if (s.world) {
      cam = cam || { x: 360, y: 200, z: 1, r: 0 };
      s.world.style.transform = 'scale(' + (k * cam.z).toFixed(4) + ')' + (cam.r ? ' rotate(' + cam.r.toFixed(2) + 'deg)' : '') +
        ' translate(' + (-(cam.x - 360) * U).toFixed(2) + 'px,' + (-(cam.y - 200) * U).toFixed(2) + 'px)';
    }
  }

  /* ---------------------------------------------------------------- Measured text layout
     Word and letter positions depend on the font, so they are measured from
     the DOM (in source px) and re-measured on resize and when fonts load. */
  var M = {};
  function w(el) { return el ? el.offsetWidth / U : 0; }
  function measure() {
    canvas.classList.add('is-measuring');
    var s1 = BY.words.k, s2 = BY.brand.k;
    var wT = w(s1['w-thats']), wE = w(s1['w-every']), wH = w(s1['w-hotel']);
    var wAll = w(s2['b-old']);
    var sp = Math.max(4, (wAll - wT - wE - wH) / 2);
    var left = 359.5 - wAll / 2;
    M.thats = left + wT / 2;
    M.every = left + wT + sp + wE / 2;
    M.hotel = left + wT + sp + wE + sp + wH / 2;

    // The brand line: the centre of each part, relative to the line's centre
    var line = s2['b-line'], lw = w(line);
    M.lineW = lw;
    ['b-mark', 'b-name', 'b-changed', 'b-that'].forEach(function (k) {
      var el = s2[k];
      M[k] = { c: (el.offsetLeft + el.offsetWidth / 2) / U - lw / 2, r: (el.offsetLeft + el.offsetWidth) / U };
    });

    // simple: letter centres when the word is set tight
    var sw = BY.simple.k['s-word'];
    sw.style.letterSpacing = '0px';
    var full = w(sw), probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit;letter-spacing:0';
    sw.appendChild(probe);
    M.simpleW = full;
    M.letters = [];
    var word = 'simple', acc = 0;
    for (var i = 0; i < word.length; i++) {
      probe.textContent = word.slice(0, i + 1);
      var wi = probe.offsetWidth / U;
      M.letters.push(359.5 - full / 2 + (acc + wi) / 2);
      acc = wi;
    }
    sw.removeChild(probe);

    // Where the baseline sits inside a line box, as a fraction of the font size
    M.giantBase = baseline(BY.giant.k['g-word-top']);
    M.timeBase = baseline(BY.time.k['t-word']);

    // Destination pieces
    var d = BY.dest.k, w0 = w(d.d0), w1 = w(d.d1), w2 = w(d.d2), dw = w0 + w1 + w2;
    M.dest = [360.5 - dw / 2 + w0 / 2, 360.5 - dw / 2 + w0 + w1 / 2, 360.5 - dw / 2 + w0 + w1 + w2 / 2];

    // time: each letter's centre relative to the word's centre
    var tw = BY.time.k['t-word'], tww = w(tw);
    M.timeW = tww;
    M.time = ['t-t', 't-i', 't-m', 't-e'].map(function (k) {
      var el = BY.time.k[k];
      return (el.offsetLeft + el.offsetWidth / 2) / U - tww / 2;
    });
    canvas.classList.remove('is-measuring');
  }

  function baseline(el) {
    var p = document.createElement('i');
    p.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.appendChild(p);
    var fs = parseFloat(getComputedStyle(el).fontSize) || 1;
    var r = (p.getBoundingClientRect().top - el.getBoundingClientRect().top) / fs;
    el.removeChild(p);
    // undo any transform scale on the element itself
    return r;
  }

  /* ---------------------------------------------------------------- Static content */
  function fillContent() {
    Array.prototype.forEach.call(canvas.querySelectorAll('[data-brand]'), function (n) { n.textContent = CONFIG.brand; });
    canvas.querySelector('[data-legal] text').textContent = CONFIG.legal;
    canvas.querySelector('[data-listing-title]').textContent = CONFIG.listingTitle;
    canvas.querySelector('[data-listing-facts]').textContent = CONFIG.listingFacts.replace(/ · /g, ' - ');
    canvas.querySelector('[data-going]').textContent = 'You’re going to ' + CONFIG.country + '.';
    var monthName = new Date(CONFIG.year, CONFIG.month, 1).toLocaleString('en-US', { month: 'long' });
    canvas.querySelector('[data-month]').textContent = monthName + ' ' + CONFIG.year;
    BY.cal.k['sel-a-n'].textContent = CONFIG.checkIn;
    BY.cal.k['sel-b-n'].textContent = CONFIG.checkOut;

    // The giant word is set letter by letter so each can drop in on its own
    Array.prototype.forEach.call(canvas.querySelectorAll('[data-letters]'), function (el) {
      var txt = el.textContent; el.textContent = '';
      txt.split('').forEach(function (ch) { var sp = document.createElement('span'); sp.textContent = ch; el.appendChild(sp); });
    });

    // Calendar grid: weekday letters and the month's days
    var grid = BY.cal.k.grid, frag = document.createDocumentFragment();
    var wd = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    CAL.cells = {};
    wd.forEach(function (l, i) {
      var s = document.createElement('span'); s.className = 'is-wd'; s.textContent = l;
      s.dataset.x = CAL.col(i); s.dataset.y = CAL.wdY; frag.appendChild(s);
    });
    var first = new Date(CONFIG.year, CONFIG.month, 1).getDay();
    var days = new Date(CONFIG.year, CONFIG.month + 1, 0).getDate();
    for (var d = 1; d <= days; d++) {
      var idx = first + d - 1, s = document.createElement('span');
      s.textContent = d;
      if (d < CONFIG.checkIn - 2) s.className = 'is-off';
      s.dataset.x = CAL.col(idx % 7); s.dataset.y = CAL.row(Math.floor(idx / 7));
      CAL.cells[d] = s;
      frag.appendChild(s);
    }
    grid.appendChild(frag);
    CAL.first = first;

    // The wall of stays: 5 columns x 4 rows
    var tiles = BY.wall.k.tiles, layoutW = [
      ['bath', 'garden', 'gion', 'window', 'sunlit'],
      ['window', 'sunlit', 'machiya', 'lantern', 'garden'],
      ['futon', 'onsen', 'shoji', 'hills', 'gion'],
      ['lantern', 'machiya', 'sunlit', 'bath', 'shoji']
    ];
    WALL.tiles = [];
    layoutW.forEach(function (row, r) {
      row.forEach(function (p, c) {
        var d = document.createElement('div');
        d.style.backgroundImage = 'url("' + PHOTOS[p] + '")';
        tiles.appendChild(d);
        WALL.tiles.push({ el: d, r: r, c: c });
      });
    });
    WALL.flyer = document.createElement('div');
    WALL.flyer.style.backgroundImage = 'url("' + PHOTOS.onsen + '")';
    WALL.flyer.className = 'ui-bsa__flyer';
    BY.wall.screen.insertBefore(WALL.flyer, BY.wall.screen.firstChild);

    var L = BY.listing.k;
    L.hero.style.backgroundImage = 'url("' + PHOTOS.onsen + '")';
    L['side-a'].style.backgroundImage = 'url("' + PHOTOS.futon + '")';
    L['side-b'].style.backgroundImage = 'url("' + PHOTOS.bath + '")';

    // End mark: a barcode, as in the source's sign-off
    var bars = [3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 1, 3, 2, 1, 1, 2, 3, 1, 1, 2, 1, 1, 3, 1];
    var shades = ['#201307', '#7d7470', '#201307', '#a8a09b', '#3b302a', '#201307', '#8d8580'];
    var x = 0, svg = BY.end.k.barcode, out = '';
    bars.forEach(function (b, i) {
      if (i % 2 === 0) out += '<rect x="' + x + '" y="0" width="' + b + '" height="34" fill="' + shades[(i / 2) % shades.length] + '"/>';
      x += b;
    });
    svg.setAttribute('viewBox', '0 0 ' + x + ' 34');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = out;
  }

  /* ---------------------------------------------------------------- 01 · words (0.00 – 3.96) */
  var WORD_BG = [[0, 'coral'], [0.6, 'cream'], [1.0, 'coral'], [1.72, 'cream'], [1.92, 'coral'], [2.32, 'cream'], [2.64, 'coral']];
  function bgAt(list, t) { var c = list[0][1]; for (var i = 0; i < list.length; i++) if (t >= list[i][0]) c = list[i][1]; return c; }

  function uWords(s, t) {
    var k = s.k, bg = bgAt(WORD_BG, t), onCoral = bg === 'coral';
    setBg(C[bg]);
    ['w-limited', 'w-costly', 'w-generic', 'w-thats', 'w-every', 'w-hotel'].forEach(function (n) {
      k[n].classList.toggle('is-white', onCoral);
      k[n].classList.toggle('is-coral', !onCoral);
    });

    // Each word lands, is knocked down by the ball, and springs back (measured frame by frame)
    var dy = 1;   // Figtree's caps sit 1px higher in their box than the source face
    if (t < 0.6) put(k['w-limited'], 358.5, dy + lin(t, [[0.04, 262], [0.08, 248], [0.12, 233], [0.16, 218.5], [0.2, 200], [0.24, 188], [0.28, 186], [0.32, 187], [0.36, 190], [0.4, 193], [0.44, 195], [0.48, 196.5], [0.56, 197]]),
      { o: kf(t, [[0.02, 0.1], [0.2, 1, E.outQ]]), blur: kf(t, [[0.02, 6], [0.22, 0, E.outQ]]) });
    else hide(k['w-limited']);
    if (t >= 0.6 && t < 1.0) put(k['w-costly'], 360, dy + 191 + lin(t, [[0.6, 0], [0.64, 18], [0.68, 24], [0.72, 28], [0.76, 30], [0.84, 30], [0.88, 28], [0.92, 24], [0.96, 18], [1.0, 12]]));
    else hide(k['w-costly']);
    if (t >= 1.0 && t < 1.72) put(k['w-generic'], 359, dy + 196 + lin(t, [[1.0, 0], [1.04, 18], [1.08, 24], [1.12, 28], [1.16, 29], [1.2, 30], [1.24, 29], [1.28, 28], [1.32, 25], [1.36, 20], [1.4, 15], [1.44, 10], [1.48, 6], [1.52, 2], [1.56, 0]]));
    else hide(k['w-generic']);

    // That's / every / hotel. each land on the line, dip ~22px, and rise back
    var base = 193;
    if (t >= 1.92) put(k['w-thats'], M.thats, base + lin(t, [[1.92, 0], [1.96, 14], [2.0, 19], [2.04, 22], [2.08, 23], [2.12, 23], [2.16, 22], [2.2, 21], [2.24, 18], [2.28, 15], [2.32, 12], [2.36, 8], [2.4, 5], [2.44, 2], [2.48, 0]]));
    else hide(k['w-thats']);
    if (t >= 2.32) put(k['w-every'], M.every, base + lin(t, [[2.32, 0], [2.36, 13], [2.4, 17], [2.44, 19], [2.48, 21], [2.56, 21], [2.6, 19], [2.64, 17], [2.68, 14], [2.72, 11], [2.76, 7], [2.8, 5], [2.84, 2], [2.88, 0]]));
    else hide(k['w-every']);
    if (t >= 2.64) put(k['w-hotel'], M.hotel, base + lin(t, [[2.64, 3], [2.68, 14], [2.72, 18], [2.76, 21], [2.8, 22], [2.84, 22], [2.88, 21], [2.92, 20], [2.96, 17], [3.0, 14], [3.04, 11], [3.08, 7], [3.12, 5], [3.16, 2], [3.2, 0]]));
    else hide(k['w-hotel']);

    var tr = t < 0.6 ? 'A' : t < 1.0 ? 'B' : t < 1.72 ? 'C' : t < 1.92 ? 'D' : t < 2.32 ? 'E' : t < 2.64 ? 'F' : 'G';
    ball(k.ball, tr, t, onCoral ? C.ballCream : C.coral);
    legal(true, onCoral);
  }

  /* ---------------------------------------------------------------- 02 · brand (3.96 – 6.28) */
  function uBrand(s, t) {
    var k = s.k;
    setBg(t < 5.08 ? C.cream : C.coral);
    // the old line fades out
    if (t < 4.14) {
      k['b-old'].classList.add('is-coral');
      put(k['b-old'], 359.5, 193 + lin(t, [[3.96, 8], [4.0, 17], [4.04, 20], [4.08, 22], [4.13, 24]]), { o: lin(t, [[3.96, 0.85], [4.0, 0.62], [4.04, 0.42], [4.08, 0.2], [4.13, 0]]) });
    } else hide(k['b-old']);

    // the coral ball drops to the centre and swells into a circle
    if (t < 4.58) ball(k.ball, 'H', t, C.coral);
    else if (t >= 5.08 && t < 6.26) ball(k.ball, 'I', t, C.ballCream);
    else hide(k.ball);
    if (t >= 4.56 && t < 5.1) {
      var d = lin(t, [[4.56, 18], [4.6, 117], [4.64, 230], [4.68, 335], [4.72, 420], [4.76, 490], [4.8, 552], [4.84, 605], [4.88, 652], [4.92, 695], [4.96, 740], [5.0, 790], [5.04, 845], [5.08, 920]]);
      size(k['b-disc'], d, d);
      put(k['b-disc'], 360, lin(t, [[4.56, 222], [4.6, 196], [4.66, 182], [5.1, 182]]));
    } else hide(k['b-disc']);

    // [mark] tomaru changed that: each part drops in, the line re-centres as it grows
    if (t >= 4.6) {
      var line = k['b-line'];
      var shift = lin(t, [[4.6, (M.lineW - M['b-name'].r) / 2 + 4], [4.72, (M.lineW - M['b-name'].r) / 2 - 18], [4.8, (M.lineW - M['b-changed'].r) / 2 + 20],
        [4.92, (M.lineW - M['b-changed'].r) / 2 - 4], [5.0, 39], [5.12, 30], [5.3, 14], [5.5, 4], [5.7, 0]]);
      var exitY = kf(t, [[6.13, 0], [6.25, -78, E.inQ]]);
      put(line, 362 + shift, 194 + exitY);
      part(k['b-mark'], t, 4.6, 0.45, 0.16);
      part(k['b-name'], t, 4.62, 0.5, 0.16);
      part(k['b-changed'], t, 4.78, 1, 0.18);
      part(k['b-that'], t, 4.92, 1, 0.18);
    } else hide(k['b-line']);
    legal(true, t >= 5.08);
  }
  function part(el, t, at, s0, dur) {
    var p = prog(t, at, at + dur);
    el.style.opacity = t < at ? 0 : clamp(p * 1.4, 0, 1);
    el.style.transform = 'translateY(' + ((1 - E.outQ(p)) * 20 * U).toFixed(2) + 'px) scale(' + mix(s0, 1, E.outC(p)).toFixed(3) + ')';
  }

  /* ---------------------------------------------------------------- 03 · giant split "simple" (6.28 – 7.00)
     Measured on the m's stems: the zoom holds the left edge of its right
     stem at x = 350 while the em shrinks from 865 to 440 px. The m drops
     in from above and the p rises from below until they share a baseline;
     a split line rises with teal type on cream above it, cream on teal below. */
  var GIANT = {
    stem: 1.655,                                   // the m's right stem, in em from the word's left (Montserrat 600)
    em: [[6.28, 865], [6.36, 782], [6.48, 735], [6.6, 709], [6.8, 662], [6.92, 569], [6.96, 488], [7.0, 440]],
    base: [[6.28, 128], [6.36, 262], [6.48, 320], [6.6, 355], [6.8, 380], [6.92, 363], [7.0, 352]],
    split: [[6.28, 420], [6.32, 312], [6.36, 275], [6.4, 252], [6.48, 222], [6.6, 200], [6.72, 186], [6.8, 172], [6.88, 140], [6.92, 118], [6.96, 78], [7.0, 40]],
    // per letter, offset from the shared baseline in em: s i m p l e
    drop: [
      [[6.28, -0.6], [6.6, -0.15], [6.92, 0]],
      [[6.28, 0.6], [6.6, 0.12], [6.92, 0]],
      [[6.28, 0], [7.0, 0]],
      [[6.28, 0.70], [6.36, 0.39], [6.48, 0.23], [6.6, 0.13], [6.8, 0.03], [6.92, 0]],
      [[6.28, -0.5], [6.6, -0.1], [6.92, 0]],
      [[6.28, 0.55], [6.6, 0.1], [6.92, 0]]
    ]
  };
  function uGiant(s, t) {
    var k = s.k;
    setBg(C.teal);   // the frame's top half is the cream box; the strip below the frame continues the teal
    var em = lin(t, GIANT.em), base = lin(t, GIANT.base), split = lin(t, GIANT.split);
    var left = 350 - GIANT.stem * em;
    [['g-top', 'g-word-top', -3000, split], ['g-bottom', 'g-word-bottom', split, 3000]].forEach(function (L) {
      var box = k[L[0]], word = k[L[1]], top = L[2], bottom = L[3];
      box.style.top = ((top - 200) * U).toFixed(2) + 'px';
      box.style.height = (Math.max(0, bottom - top) * U).toFixed(2) + 'px';
      box.style.visibility = 'visible';
      word.style.fontSize = (em * U).toFixed(2) + 'px';
      // the box's left edge is 2000 source px left of the centre
      var ox = left - (360 - 2000), oy = base - top - M.giantBase * em;
      word.style.transform = 'translate(' + (ox * U).toFixed(2) + 'px,' + (oy * U).toFixed(2) + 'px)';
      for (var i = 0; i < word.children.length; i++) {
        word.children[i].style.transform = 'translateY(' + (lin(t, GIANT.drop[i]) * em * U).toFixed(2) + 'px)';
      }
    });
  }

  /* ---------------------------------------------------------------- 04 · simple (7.00 – 7.76) */
  function uSimple(s, t) {
    var k = s.k;
    setBg(C.teal);
    // it lands large and loosely tracked, then shrinks and closes up
    var sc = lin(t, [[7.0, 1.42], [7.04, 1.38], [7.12, 1.25], [7.2, 1.12], [7.28, 1.07], [7.36, 1.04], [7.44, 1.02], [7.52, 1.01], [7.6, 1]]);
    var ls = lin(t, [[7.0, 18], [7.04, 16.6], [7.12, 7.7], [7.2, 5.5], [7.28, 4.9], [7.36, 2.7], [7.44, 1.2], [7.52, 0.6], [7.6, 0]]);
    k['s-word'].style.letterSpacing = (ls * U).toFixed(2) + 'px';
    put(k['s-word'], 359.5 + ls * sc / 2, 196, { s: sc });
    ball(k.ball, 'J', t, C.ballCream);
  }

  /* ---------------------------------------------------------------- 05 · scatter and the search pill (7.76 – 9.28) */
  var SCATTER = [
    // [x0, y0, r0, x1, y1, r1] at 7.76 and 8.36
    [357, 140, 90, 405, 92, 112],
    [232, 237, -60, 140, 280, -84],
    [350, 220, 150, 370, 244, 165],
    [405, 280, 160, 421, 362, 172],
    [427, 165, -12, 476, 116, -28],
    [445, 290, -20, 458, 372, -8]
  ];
  function barGeom(t) {
    var w = lin(t, [[8.34, 10], [8.36, 60], [8.4, 133], [8.44, 235], [8.48, 375], [8.52, 485], [8.56, 570], [8.6, 588], [8.64, 575], [8.68, 552], [8.72, 527], [8.76, 507], [8.8, 500], [8.88, 500], [9.0, 504]]);
    var h = lin(t, [[8.34, 4], [8.36, 6], [8.4, 12], [8.44, 30], [8.48, 42], [8.52, 54], [8.56, 61], [8.6, 64], [8.7, 65]]);
    return { w: w, h: h, x: 360, y: 196 };
  }
  function uBar(s, t) {
    var k = s.k;
    setBg(C.cream);
    for (var i = 0; i < 6; i++) {
      var L = SCATTER[i], p = E.outC(prog(t, 7.76, 8.4));
      put(k['l' + i], mix(L[0], L[3], p), mix(L[1], L[4], p), { r: mix(L[2], L[5], p), s: mix(1, 0.86, p), o: kf(t, [[7.86, 1], [8.34, 0, E.lin]]) });
    }
    if (t < 8.36) ball(k.ball, 'Kt', t, C.teal); else hide(k.ball);
    var kc = trackAt('Kc', t);
    if (t >= 9.22 && t < 9.27 && kc) capsule(k.ball2, 578, 204, kc.x, kc.y, Math.max(12, kc.W), C.coral);
    else if (t < 9.25) ball(k.ball2, 'Kc', t, C.coral); else hide(k.ball2);

    var bar = k.bar;
    if (t >= 8.34) {
      var g = barGeom(t);
      size(bar, g.w, g.h);
      put(bar, g.x, g.y);
      var white = t >= 8.42;
      bar.classList.toggle('is-solid', t >= 8.56);
      bar.style.background = white ? '#fff' : 'transparent';
      k['bar-fill'].style.opacity = kf(t, [[8.4, 1], [8.44, 0.42, E.lin], [8.52, 0.32, E.lin], [8.56, 0, E.lin]]);
      var rs = Math.pow(g.w / 504, g.w < 504 ? 0.6 : 0.4) * Math.min(1, Math.pow(g.h / 65, 0.5));
      k['bar-row'].style.opacity = kf(t, [[8.42, 0], [8.46, 0.45], [8.56, 1]]);
      k['bar-row'].style.transform = 'scale(' + Math.max(rs, 0.01).toFixed(3) + ')';
      k['bar-row'].style.width = (504 * U) + 'px';
      k['bar-row'].style.height = (65 * U) + 'px';
      k['bar-row'].style.left = ((g.w - 504) / 2 * U) + 'px';
      k['bar-row'].style.top = ((g.h - 65) / 2 * U) + 'px';
      // the coral button blooms at the right end; the coral ball dives into it at 9.24
      if (t >= 8.5) {
        var d = lin(t, [[8.5, 6], [8.56, 22], [8.6, 37], [8.64, 44], [8.68, 47], [8.72, 45]]);
        var hit = kf(t, [[9.22, 0], [9.26, 1, E.outQ], [9.28, 1]]);
        size(k.go, d, d);
        put(k.go, 578 + (g.w - 504) * 0.15, g.y, { o: kf(t, [[8.5, 0.3], [8.6, 0.65], [8.68, 1]]), sx: 1 + 0.12 * hit, sy: 1 - 0.1 * hit });
      } else hide(k.go);
    } else { hide(bar); hide(k.go); }
  }

  /* ---------------------------------------------------------------- 06 · tilt over grey (9.28 – 10.00) */
  function uTilt(s, t) {
    var k = s.k;
    setBg(C.grey);
    size(k.bar, 504, 65);
    put(k.bar, 361, lin(t, [[9.28, 199], [9.36, 193], [9.6, 190], [10.0, 191]]), { r: kf(t, [[9.28, -2], [9.4, -3.2, E.outQ], [9.8, -5.3], [10.0, -6]]) });
    k['bar-row'].style.opacity = kf(t, [[9.8, 1], [9.96, 0, E.lin]]);
    // the search button jumps off the bar and spins its glass
    var g = trackAt('L', t) || { x: 580, y: 150, W: 44 };
    size(k.go, 44, 44);
    put(k.go, g.x, g.y);
    k['go-icon'].style.transform = 'rotate(' + (-lin(t, [[9.28, 0], [10.0, 380]])).toFixed(1) + 'deg)';
    // two cream orbs float up from below and drift back down
    size(k['orb-a'], 340, 340); size(k['orb-b'], 110, 110);
    put(k['orb-a'], 77, lin(t, [[9.28, 490], [9.32, 445], [9.36, 425], [9.4, 395], [9.6, 388], [9.8, 386], [9.96, 410], [10.0, 420]]));
    put(k['orb-b'], 608, lin(t, [[9.28, 400], [9.32, 375], [9.4, 334], [9.48, 307], [9.56, 295], [9.64, 287], [9.72, 293], [9.8, 302], [9.88, 330], [9.96, 362], [10.0, 380]]));
  }

  /* ---------------------------------------------------------------- 07 · Dest·in·ation (10.00 – 10.70) */
  function uDest(s, t) {
    var k = s.k;
    setBg(C.cream);
    layers(s, { x: lin(t, [[10.64, 360], [10.7, 80]]), y: 200, z: 1 });
    var sw = kf(t, [[10.0, 508], [10.22, 554, E.io]]), sh = kf(t, [[10.0, 52], [10.16, 46, E.outC]]);
    size(k.search, sw, sh);
    put(k.search, 360, lin(t, [[10.0, 205], [10.08, 206], [10.14, 207], [10.24, 200], [10.36, 195]]), { r: kf(t, [[10.0, 1.8], [10.12, 1.9], [10.22, 1.0], [10.38, 0, E.outQ]]) });
    var gd = kf(t, [[10.0, 45], [10.2, 36]]);
    size(k['go-in'], gd, gd);
    k['go-in'].style.marginTop = (-gd / 2 * U).toFixed(2) + 'px';
    k['go-in'].style.left = ((sw - 23 - gd / 2) * U).toFixed(2) + 'px';
    Array.prototype.forEach.call(k.search.querySelectorAll('.ui-bsa__field'), function (f, i) {
      f.style.opacity = i === 0 || i === 3 ? kf(t, [[10.12, 0], [10.3, 1]]) : kf(t, [[10.0, 0.25], [10.16, 1]]);
    });
    for (var i = 0; i < 3; i++) {
      var s0 = 9.96 + i * 0.04;
      var y = t < s0 ? -60 : lin(t, [[s0, -30], [s0 + 0.04, 45], [s0 + 0.08, 88], [s0 + 0.12, 129], [s0 + 0.16, 142], [s0 + 0.24, 138], [s0 + 0.32, 130], [s0 + 0.4, 126], [s0 + 0.6, 124.5]]);
      put(k['d' + i], M.dest[i], y, { o: t < s0 ? 0 : 1 });
    }
    ball(k.ball, 'M', t, C.coral);
  }

  /* ---------------------------------------------------------------- 08 · Where (10.70 – 12.20) */
  function uWhere(s, t) {
    var k = s.k;
    setBg(C.cream);
    layers(s, {
      x: kf(t, [[10.7, 482], [10.72, 470, E.lin], [10.84, 272, E.outQ], [11.0, 220, E.outQ], [11.2, 190, E.outQ], [11.6, 165, E.outQ], [11.92, 158, E.outQ], [12.2, 156, E.lin]]),
      y: kf(t, [[10.7, 194.6], [11.92, 194.6], [12.04, 197, E.inQ], [12.12, 206, E.inQ], [12.2, 216, E.lin]]),
      z: 3.43
    });
    size(k.search, 554, 46);
    put(k.search, 360, 195);
    var typed = t >= 11.66;
    var val = k['where-val'];
    if (val.textContent !== (typed ? CONFIG.destination : 'Search destinations')) val.textContent = typed ? CONFIG.destination : 'Search destinations';
    val.classList.toggle('is-typed', typed);
    // the teal panel slides in from the right, then sweeps the screen
    var x = lin(t, [[10.7, 712], [10.72, 706], [10.76, 650], [10.84, 585], [10.92, 566], [11.0, 555], [11.2, 537], [11.6, 520], [11.92, 505], [12.04, 480], [12.12, 430], [12.16, 365], [12.2, -10]]);
    put(k.wipe, x + 1500, 200);
  }

  /* ---------------------------------------------------------------- 09 · giant time (12.20 – 12.60) */
  function teal(el, t) {
    var right = lin(t, [[12.2, 724], [12.24, 420], [12.32, 250], [12.4, 172], [12.48, 120], [12.6, 58], [12.7, 26], [12.8, 8], [12.84, -6]]);
    if (right <= -4) hide(el); else put(el, right - 1500, 200);
  }
  function uBigTime(s, t) {
    var k = s.k;
    setBg(C.cream);
    teal(k.wipe, t);
    // the word at 504px, sliding left along its i (stem centre 0.5675em from the left)
    var em = 504, ix = lin(t, [[12.2, 520], [12.24, 266], [12.32, 183], [12.4, 146], [12.48, 117], [12.6, 98]]);
    var el = k['t-giant'];
    el.style.fontSize = (em * U).toFixed(2) + 'px';
    // x-height top at y = 116, so the baseline is 116 + 0.54em
    put(el, ix - 0.5675 * em, 116 + 0.54 * em - M.timeBase * em, { ax: 0, ay: 0 });
    if (t >= 12.44) {
      size(k['t-shard'], 30, 30);
      put(k['t-shard'], lin(t, [[12.44, 562], [12.6, 512]]), lin(t, [[12.44, 104], [12.6, 80]]), { r: 14 });
    } else hide(k['t-shard']);
  }

  /* ---------------------------------------------------------------- 10 · time (12.60 – 13.80) */
  function uTime(s, t) {
    var k = s.k;
    setBg(C.cream);
    teal(k.wipe, t);
    // measured per letter: the word drifts left, sinks 37px, and springs apart
    var left = lin(t, [[12.6, 322], [12.64, 316], [12.72, 305], [12.8, 297], [12.88, 290], [12.92, 287], [12.96, 284], [13.0, 282], [13.08, 278], [13.2, 274], [13.32, 271], [13.48, 269]]);
    var sink = lin(t, [[12.92, 0], [13.0, 20], [13.08, 27], [13.2, 34], [13.32, 37], [13.48, 37], [13.6, 34], [13.68, 27], [13.72, 19], [13.76, 5]]);
    // the ink starts 0.1em right of the box; baseline at y = 225 before the sink
    put(k['t-word'], left - 0.1 * 80, 225 + sink - M.timeBase * 80, { ax: 0, ay: 0 });
    k['t-dot'].style.visibility = t < 12.94 ? 'visible' : 'hidden';
    var er = kf(t, [[12.92, 0], [13.0, 120, E.outQ], [13.2, 180, E.outQ]]);
    var mUp = lin(t, [[13.68, 0], [13.72, -14], [13.76, -69]]);
    var eUp = lin(t, [[13.68, 0], [13.72, -5], [13.76, -39]]);
    k['t-t'].style.transform = '';
    k['t-i'].style.transform = '';
    k['t-m'].style.transform = 'translateY(' + (mUp * U).toFixed(2) + 'px)';
    k['t-e'].style.transform = 'translateY(' + ((14 * er / 180 + eUp) * U).toFixed(2) + 'px) rotate(' + er.toFixed(1) + 'deg)';
    // the diamond and the popped i-dot
    var d = trackAt('Oa', t);
    if (d && t < 13.76) {
      var sz = Math.min(d.L, d.W) * 0.9;
      size(k['t-shard'], sz, sz);
      put(k['t-shard'], d.x, d.y, { r: kf(t, [[12.6, 28], [13.0, 45], [13.4, 18], [13.72, 40]]) });
    } else hide(k['t-shard']);
    ball(k.ball, 'Ob', t, C.ink);
  }

  /* ---------------------------------------------------------------- 11 · calendar (13.80 – 18.24) */
  var CAL = {
    col: function (i) { return 144 + 71.8 * i; },
    row: function (r) { return [195, 267, 342, 416, 490, 564][r]; },
    wdY: 131
  };
  function cellX(d) { return CAL.col((CAL.first + d - 1) % 7); }
  function cellY(d) { return CAL.row(Math.floor((CAL.first + d - 1) / 7)); }
  function calCam(t) {
    return {
      x: kf(t, [[14.16, 360], [14.28, 216.7, E.outQ], [15.2, 216.7], [15.28, 405, E.io], [15.6, 490, E.outQ], [15.96, 501, E.outQ], [18.24, 502]]),
      y: kf(t, [[14.16, 200], [14.28, 230, E.outQ], [14.4, 242, E.outQ], [15.2, 269, E.io], [17.2, 268], [17.5, 264, E.inQ], [17.8, 251, E.inQ], [18.1, 182, E.inQ], [18.16, 160, E.lin], [18.24, 135, E.lin]]),
      z: t < 16.4 ? kf(t, [[14.16, 1], [14.28, 1.497, E.outQ], [15.6, 1.5], [15.96, 1.77, E.io], [16.04, 1.94, E.lin], [16.12, 2.04, E.outQ], [16.4, 2.21, E.outQ]])
        : lin(t, [[16.4, 2.21], [16.6, 2.15], [16.8, 1.99], [16.9, 1.8], [17.0, 1.59], [17.1, 1.48], [17.2, 1.40], [17.35, 1.3], [17.5, 1.23], [17.65, 1.19], [17.8, 1.163], [18.0, 1.14], [18.16, 1.128], [18.24, 1.125]])
    };
  }
  function uCal(s, t) {
    var k = s.k;
    setBg(C.cream);
    var cam = calCam(t);
    // On a narrow portrait frame, keep both ends of the date range in view
    if (PORTRAIT) cam.x = mix(cam.x, 360, kf(t, [[15.2, 0], [15.4, 0.75], [15.7, 0.75], [15.96, 0]]));
    layers(s, cam);
    var off = kf(t, [[13.8, 125], [13.84, 110, E.lin], [13.96, 50, E.outQ], [14.16, 0, E.outQ]]);
    var fade = kf(t, [[13.8, 0], [13.84, 0.35, E.lin], [13.96, 0.85], [14.04, 1]]);
    size(k.tabs, 450, 51);
    put(k.tabs, 360, -3 + off * 0.92);
    put(k.month, 360, 75 + off * 1.18, { o: fade });

    var start = CONFIG.checkIn, end = CONFIG.checkOut;
    var ax = cellX(start), ay = cellY(start), bxEnd = cellX(end);
    var landed = t >= 14.4, settled = t >= 15.2;
    var bx = kf(t, [[15.2, ax], [15.28, ax + (bxEnd - ax) * 0.67, E.lin], [15.44, ax + (bxEnd - ax) * 0.9, E.outQ], [15.6, ax + (bxEnd - ax) * 0.95, E.outQ], [15.72, bxEnd, E.outQ]]);
    var grid = k.grid.children;
    for (var i = 0; i < grid.length; i++) {
      var c = grid[i], wd = c.classList.contains('is-wd'), x = +c.dataset.x, y = +c.dataset.y + off * (wd ? 1 : 1.04), n = wd ? 0 : +c.textContent;
      var o = { o: fade };
      if (n === start) {
        // the 6 is knocked out of its cell by the ball, then drops back in
        y += kf(t, [[14.28, 0], [14.4, -67, E.outQ], [14.9, -62], [15.12, -40, E.inQ], [15.2, 0, E.inQ]]);
        if (settled) o.o = 0;
      }
      if (n === end && t >= 15.56) o.o = 0;
      if (!wd) c.classList.toggle('is-in', settled && n > start && n < end);
      put(c, x, y, o);
    }
    // the dark ball falls in and becomes the check-in circle
    if (t < 14.4) ball(k.ball, 'P', t, C.inkSoft); else hide(k.ball);
    var selA = k['sel-a'], selB = k['sel-b'];
    if (landed) {
      var sq = kf(t, [[14.4, 1], [14.5, 0, E.outQ]]);
      put(selA, ax, ay, { sx: 1 + 0.05 * sq, sy: 1 - 0.05 * sq });
      selA.style.background = mixColor(C.inkSoft, C.ink, prog(t, 15.1, 15.22));
      k['sel-a-n'].style.opacity = settled ? 1 : 0;
    } else hide(selA);
    // the end circle rolls to the 10th; the range fills behind it
    if (settled && t < 15.98) {
      put(selB, bx, ay);
      selB.style.background = t < 15.86 ? mixColor(C.inkSoft, C.ink, prog(t, 15.5, 15.62)) : mixColor(C.ink, '#8a817c', prog(t, 15.86, 15.96));
      k['sel-b-n'].style.opacity = t >= 15.56 ? 1 : 0;
    } else hide(selB);
    if (settled) {
      var bandR = t < 15.98 ? bx : bxEnd;
      size(k.band, Math.max(0, bandR - ax), 50);
      put(k.band, ax, ay, { ax: 0 });
    } else hide(k.band);

    // the end circle stretches into the "Who" field; Search blooms inside it
    var who = k.who;
    if (t >= 15.96) {
      var pw = kf(t, [[15.96, 51], [16.04, 216, E.outQ], [16.12, 283, E.outQ], [16.32, 240, E.io]]);
      var ph = kf(t, [[15.96, 51], [16.04, 55, E.outQ], [16.12, 61, E.outQ], [16.32, 54, E.io]]);
      size(who, pw, ph);
      put(who, kf(t, [[15.96, bxEnd], [16.04, 501, E.outQ]]), 266);
      who.style.background = 'rgba(255,255,255,' + kf(t, [[15.96, 0.35], [16.04, 0.6], [16.08, 1]]).toFixed(3) + ')';
      var lab = who.querySelector('.ui-bsa__field');
      lab.style.opacity = kf(t, [[16.08, 0], [16.18, 0.55], [16.3, 1]]);
      k['who-val'].textContent = t >= 16.78 ? CONFIG.guests + ' guests' : 'Add guests';
      var go = k['who-go'];
      var gw = lin(t, [[16.04, 25], [16.12, 70], [16.24, 80], [16.32, 85], [16.4, 87], [16.5, 87], [16.56, 84], [16.64, 78], [16.72, 67], [16.8, 67], [16.9, 80], [17.0, 85]]);
      var gh = lin(t, [[16.04, 9], [16.12, 33], [16.24, 38], [16.32, 40], [16.4, 42], [16.5, 42], [16.56, 40], [16.64, 37], [16.72, 32], [16.8, 32], [16.9, 38], [17.0, 40]]);
      var gx = kf(t, [[16.04, 580], [16.12, 576], [16.4, 571]]);
      size(go, gw, gh);
      // go is positioned inside the pill (pill's left/top are its origin)
      var pillL = kf(t, [[15.96, bxEnd], [16.04, 501, E.outQ]]) - pw / 2;
      go.style.transform = 'translate(' + ((gx - pillL - gw / 2) * U).toFixed(2) + 'px,' + ((ph / 2 - gh / 2 + 0.5) * U).toFixed(2) + 'px)';
      go.style.background = t >= 16.48 && t < 16.7 ? C.ctaPress : (t >= 16.32 && t < 16.48 ? C.ctaHover : C.cta);
      k['who-go-label'].style.opacity = kf(t, [[16.14, 0], [16.24, 1]]);
      k['who-go-label'].style.display = gw > 44 ? '' : 'none';
    } else hide(who);

    // the cursor comes in, hovers, clicks
    var cur = k.cursor;
    if (t >= 15.94 && t < 16.7) {
      var cx = lin(t, [[15.94, 726], [15.96, 712], [16.04, 628], [16.12, 572], [16.24, 540], [16.32, 527], [16.4, 520], [16.48, 522], [16.64, 524]]);
      var cy = lin(t, [[15.94, 333], [15.96, 328], [16.04, 324], [16.12, 302], [16.24, 254], [16.32, 232], [16.4, 218], [16.48, 220], [16.64, 222]]);
      put(cur, cx, cy, { ax: -12, ay: -6, s: t >= 16.48 && t < 16.62 ? 0.9 : 1, o: kf(t, [[16.6, 1], [16.7, 0, E.lin]]) });
    } else hide(cur);
    // a coral drop falls out of Search after the click
    if (t >= 16.74 && t < 16.88) capsule(k.ball2, 490, 226, 490, lin(t, [[16.74, 232], [16.8, 262], [16.88, 270]]), 15, C.coral);
    else if (t >= 16.88) ball(k.ball2, 'Q', t, C.coral); else hide(k.ball2);
  }

  /* ---------------------------------------------------------------- 12 · the wall (18.24 – 20.32) */
  var WALL = { colX: function (c) { return -279.5 + 315 * c; }, rowY: function (r) { return -349 + 354 * r; } };
  function uWall(s, t) {
    var k = s.k;
    setBg(C.cream);
    var cam = {
      x: kf(t, [[18.24, 388], [18.6, 376, E.outQ], [19.0, 360, E.outQ], [19.76, 360], [19.78, 31, E.lin], [20.0, 24, E.outQ], [20.32, 22]]),
      y: kf(t, [[18.24, 290], [18.6, 217, E.outQ], [19.0, 200, E.outQ], [19.4, 197], [19.76, 186], [19.78, 185, E.lin], [20.0, 187, E.outQ], [20.32, 189]]),
      z: kf(t, [[18.24, 1], [19.0, 1], [19.4, 0.82, E.io], [19.76, 0.68, E.lin], [19.78, 1.187, E.lin], [20.0, 1.187], [20.32, 1.2]])
    };
    layers(s, cam);
    var dive = t >= 19.78;
    WALL.tiles.forEach(function (o) {
      var r = 0;
      if (o.r === 1 && o.c === 3) r = kf(t, [[18.4, 0], [18.9, -8, E.io]]);
      if (o.r === 2 && o.c === 3) r = kf(t, [[19.05, 0], [19.5, 9, E.io], [19.76, 10.5]]);
      if (o.r === 2 && o.c === 1 && dive) { hide(o.el); return; }
      put(o.el, WALL.colX(o.c), WALL.rowY(o.r), { r: r });
    });
    put(k.choose, 83 + (dive ? lin(t, [[19.78, -33], [20.0, -36]]) : 0), 194 + lin(t, [[18.24, -6], [18.9, 0]]) + (dive ? lin(t, [[19.78, -45], [20.0, -50]]) : 0), { ax: 0, o: dive ? lin(t, [[19.78, 0.82], [19.92, 0.55], [20.04, 0]]) : 1 });
    k.c1.style.opacity = t < 18.6 ? 0 : 1;
    k.c1.style.transform = 'translateY(' + (lin(t, [[18.6, 26], [18.64, 18], [18.72, 8], [18.8, 2], [18.9, 0]]) * U).toFixed(2) + 'px)';
    // the onsen street pops out of the wall and swings down out of frame
    var fl = WALL.flyer;
    if (dive) {
      size(fl, 225, 212);
      fl.style.borderRadius = 14 * U + 'px';
      put(fl, lin(t, [[19.78, 370], [19.84, 377], [19.92, 383], [20.08, 397], [20.2, 400], [20.32, 402]]), lin(t, [[19.78, 302], [19.84, 310], [19.92, 318], [20.0, 305], [20.08, 290], [20.2, 340], [20.32, 380]]),
        { r: lin(t, [[19.78, 2], [19.84, 4], [19.92, 8], [20.0, 11], [20.08, 14], [20.2, 20], [20.32, 24]]), s: 1.19 });
    } else hide(fl);
    if (t < 19.8) ball(k.ball, 'R', t, C.coral); else hide(k.ball);
  }

  /* ---------------------------------------------------------------- 13 · the listing (20.32 – 24.30) */
  function uListing(s, t) {
    var k = s.k;
    setBg(C.cream);
    var cam = {
      x: kf(t, [[21.0, 360], [21.3, 364, E.outQ]]),
      y: kf(t, [[21.0, 200], [21.3, 247, E.outQ], [21.8, 319, E.io], [22.2, 326, E.outQ], [23.0, 327], [23.6, 323], [23.8, 318], [24.0, 304], [24.12, 285.5, E.inQ], [24.24, 111, E.inQ], [24.3, 60, E.lin]]),
      z: kf(t, [[21.0, 1], [21.3, 1.39, E.outQ], [21.8, 1.4], [22.2, 1.59, E.io], [23.0, 1.47, E.io], [23.6, 1.347, E.io], [24.2, 1.32]])
    };
    layers(s, cam);
    put(k.kanji, 535, 240);
    var hx = kf(t, [[20.32, 350], [20.36, 355, E.lin], [20.56, 357], [20.8, 314, E.io], [21.0, 302.5, E.outQ]]);
    var hy = kf(t, [[20.32, 92], [20.36, 128, E.lin], [20.56, 180, E.outQ], [20.8, 194.5, E.outQ]]);
    put(k.hero, hx, hy, { r: kf(t, [[20.32, 17], [20.36, 12, E.lin], [20.56, -1, E.outQ], [20.72, 0]]) });
    var sp = kf(t, [[20.64, 0], [20.8, 1, E.outB]]);
    var sideO = { s: mix(0.6, 1, sp), o: kf(t, [[20.64, 0], [20.72, 1]]) };
    put(k['side-a'], 497 + (hx - 302.5), 135 + (hy - 194.5), sideO);
    put(k['side-b'], 497 + (hx - 302.5), 254.5 + (hy - 194.5), sideO);
    put(k.info, 180, 315 + kf(t, [[21.16, 12], [21.36, 0, E.outQ]]), { ax: 0, ay: 0, o: kf(t, [[21.16, 0], [21.3, 1]]) });

    // the teal ball turns into Reserve; the cursor presses it; a coral drop rolls away
    if (t < 22.12) ball(k.ball, 'S', t, C.teal); else hide(k.ball);
    var rv = k.reserve;
    if (t >= 22.08) {
      var press = kf(t, [[22.62, 0], [22.68, 0.55, E.outQ], [22.74, 1, E.outQ], [22.8, 1], [22.96, 0, E.outB]]);
      size(rv, kf(t, [[22.08, 46], [22.16, 200, E.outQ], [22.24, 245, E.outQ]]), kf(t, [[22.08, 14], [22.16, 34], [22.24, 38]]));
      put(rv, 363.6, 398, { s: 1 - 0.17 * press });
      var col = t < 22.24 ? mixColor(C.teal, C.cta, prog(t, 22.08, 22.24)) : (t >= 22.62 && t < 22.8 ? mixColor(C.cta, C.ctaPress, press) : C.cta);
      rv.style.background = col;
      k['reserve-label'].style.opacity = kf(t, [[22.14, 0], [22.24, 0.6], [22.32, 1]]);
    } else hide(rv);
    var cur = k.cursor;
    if (t >= 22.22 && t < 22.8) {
      put(cur, lin(t, [[22.22, 382], [22.32, 377], [22.4, 372], [22.48, 366], [22.56, 366], [22.64, 364], [22.72, 362]]),
        lin(t, [[22.22, 410], [22.32, 392], [22.4, 377], [22.48, 360], [22.56, 352], [22.64, 349], [22.72, 346]]),
        { ax: -12, ay: -6, s: t >= 22.64 && t < 22.74 ? 0.9 : 1, o: kf(t, [[22.72, 1], [22.8, 0, E.lin]]) });
    } else hide(cur);
    if (t >= 22.84) ball(k.ball2, 'T', t, C.coral); else hide(k.ball2);
  }

  /* ---------------------------------------------------------------- 14 · Request sent (24.30 – 25.76) */
  function uRequest(s, t) {
    var k = s.k;
    setBg(C.cream);
    // measured on the title's cap line and width
    var x = lin(t, [[24.3, 361.5], [25.36, 358.5], [25.44, 355], [25.52, 349], [25.6, 337], [25.64, 326], [25.68, 307.5], [25.72, 272.5], [25.76, 230]]);
    var cap = lin(t, [[24.28, 298], [24.32, 258], [24.36, 240], [24.4, 227], [24.44, 219], [24.48, 212], [24.52, 207], [24.56, 203], [24.6, 200], [24.64, 198], [24.9, 196], [25.0, 191], [25.2, 188], [25.36, 187], [25.72, 186]]);
    var sc = lin(t, [[25.0, 1], [25.04, 0.887], [25.08, 0.864], [25.12, 0.844], [25.16, 0.833], [25.2, 0.821], [25.36, 0.805], [25.76, 0.8]]);
    put(k.note, x, cap - 8 * sc, { ay: 0, s: sc });
    k.note.style.transformOrigin = '50% 0';
    put(k.peek, lin(t, [[24.3, 722], [24.32, 687], [24.4, 675], [24.48, 662], [24.56, 655], [24.64, 650], [24.8, 647], [24.96, 642], [25.04, 670], [25.12, 697], [25.2, 724]]) + 450, 200);
    ball(k.ball, 'U', t, C.teal);
  }

  /* ---------------------------------------------------------------- 15 · and you just wait… (25.76 – 27.20) */
  var CLOUD = [
    // [x, y, depth (parallax), blur] at 26.30
    [130, 52, 1.0, 0],      // braille
    [62, 132, 1.25, 1.2],   // attendre
    [368, 102, 0.92, 0.5],  // 기다리다
    [545, 92, 1.08, 0],     // 待って
    [361, 195, 1.0, 0],     // and you just wait…
    [619, 186, 0.95, 0.6],  // czekać
    [632, 252, 1.15, 0],    // espera
    [66, 290, 1.05, 0.8],   // 等待
    [268, 268, 0.94, 0.5],  // vänta
    [372, 345, 1.08, 0],    // periméno
    [602, 326, 0.96, 0.3],  // انتظر
    [115, 378, 1.0, 0.3]    // chờ
  ];
  function uWait(s, t) {
    var k = s.k;
    setBg(C.cream);
    var dx = lin(t, [[25.72, 700], [25.76, 355], [25.84, 105], [25.92, 52], [26.0, 28], [26.08, 15], [26.16, -2], [26.32, 0], [26.4, -7], [26.48, -15], [26.56, -20], [26.64, -25], [26.8, -30], [26.96, -32], [27.2, -33]]);
    var dy = lin(t, [[25.76, -3], [26.0, -3], [26.3, 0], [26.48, 2], [26.8, 5], [26.96, 14], [27.04, 25], [27.12, 45], [27.2, 147]]);
    var cloud = k.cloud;
    put(cloud, 360, 200);
    cloud.style.transform = 'translate(0,0)';
    var kids = cloud.children;
    var ghost = kids[0];
    put(ghost, 300 + dx * 0.7, 250 + dy * 0.7, { blur: 6 });
    for (var i = 1; i < kids.length; i++) {
      var c = CLOUD[i - 1];
      put(kids[i], c[0] + dx * c[2], c[1] + dy * (0.9 + c[2] * 0.1), { blur: c[3] });
    }
    ball(k.ball, 'V', t, C.teal);
  }

  /* ---------------------------------------------------------------- 16 · dots (27.20 – 28.80) */
  function uDots(s, t) {
    var k = s.k;
    setBg(C.cream);
    ball(k.dot0, 'Xd1', t, '#725d47');
    ball(k.dot1, 'Xd2', t, '#553b26');
    ball(k.dot2, 'Xd3', t, C.ink);
    if (t < 28.66) { ball(k.ball, 'W1', t, C.teal); ball(k.ball2, 'W2', t, C.teal); } else { hide(k.ball); hide(k.ball2); }
    if (t >= 28.68) put(k.tick, 360, 162, { ay: 0, s: kf(t, [[28.68, 0.7], [28.74, 1]]) }); else hide(k.tick);
  }

  /* ---------------------------------------------------------------- 17 · confirmed (28.80 – 30.24) */
  function uConfirmed(s, t) {
    var k = s.k;
    setBg(C.cream);
    var sc = lin(t, [[28.8, 1.25], [29.4, 1.2], [29.44, 1.19], [29.52, 1.06], [29.6, 1.025], [29.68, 1.01], [29.84, 1.0]]);
    var b = k.note.querySelector('b');
    b.style.transform = 'scale(' + sc.toFixed(3) + ')';
    put(k.note, 362.5, 193 - 12.85, { ay: 0 });
    k.sub.style.opacity = kf(t, [[29.48, 0], [29.6, 1]]);
    ball(k.ball, 'Y', t, '#553b26', { o: kf(t, [[29.5, 1], [29.84, 0, E.lin]]) });
  }

  /* ---------------------------------------------------------------- 18 / 19 · sign-off */
  function uLogo(s, t) { setBg(C.coral); put(s.k.mark, 359.5, 195.5); }
  function uEnd(s, t) { setBg(C.cream); put(s.k.barcode, 360.5, 195.5); }

  var UPDATE = {
    words: uWords, brand: uBrand, giant: uGiant, simple: uSimple, bar: uBar, tilt: uTilt,
    dest: uDest, where: uWhere, bigtime: uBigTime, time: uTime, cal: uCal, wall: uWall,
    listing: uListing, request: uRequest, wait: uWait, dots: uDots, confirmed: uConfirmed, logo: uLogo, end: uEnd
  };

  /* ---------------------------------------------------------------- Frame */
  var legalEl = canvas.querySelector('[data-legal]');
  var legalOn = false;
  function legal(on, onCoral) {
    legalOn = on;
    if (!on) { hide(legalEl); return; }
    legalEl.classList.toggle('is-cream', !onCoral);
    legalEl.style.transform = 'translate(-50%,-50%) translate(0px,' + ((PORTRAIT ? 330 : 179.5) * U).toFixed(2) + 'px)';
    legalEl.style.visibility = 'visible';
  }
  var lastBg = '';
  function setBg(c) {
    if (c === lastBg) return;
    lastBg = c;
    root.style.setProperty('--bsa-bg', c);
  }

  var CAMS = ['dest', 'where', 'cal', 'wall', 'listing'];
  var current = null;
  function sceneAt(t) {
    for (var i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].t0) return SCENES[i];
    return SCENES[0];
  }
  function render(t) {
    var s = sceneAt(t);
    if (s !== current) {
      if (current) current.el.classList.remove('is-on');
      s.el.classList.add('is-on');
      current = s;
    }
    legalOn = false;
    if (CAMS.indexOf(s.key) < 0) layers(s);
    UPDATE[s.key](s, t);
    if (!legalOn) hide(legalEl);
  }

  /* ---------------------------------------------------------------- Clock and controls */
  var T = 0, playing = false, last = 0, raf = 0, holdOff = false, visible = true;
  var playBtn = root.querySelector('[data-play]');
  var range = root.querySelector('[data-range]');
  var clock = root.querySelector('[data-clock]');
  var live = root.querySelector('[data-live]');
  var replay = root.querySelector('[data-replay]');
  var ticks = root.querySelector('[data-ticks]');

  var BEATS = [
    [0.00, 'Limited. Costly. Generic. That’s every hotel.', 'Each word flashes on coral or cream as a ball strikes it.'],
    [3.96, CONFIG.brand + ' changed that.', 'A coral circle grows out of the ball and fills the screen.'],
    [6.28, 'simple', 'Giant letters, then the word on teal as its letters close up.'],
    [7.76, 'A search bar: Anywhere · Anytime · Add guests.', 'The letters scatter and a teal pill grows into the search bar.'],
    [10.00, 'Destination', 'The full search bar: Where, Check-in, Check-out, Who.'],
    [10.70, 'Where: ' + CONFIG.destination + '.', 'The camera dives into the Where field.'],
    [12.20, 'time', 'The dot of the i flies off and the e flips over.'],
    [13.80, 'Dates · Months · Flexible. October ' + CONFIG.year + ': the ' + CONFIG.checkIn + 'th to the ' + CONFIG.checkOut + 'th.', 'A ball drops onto the 6th, then rolls along to the 10th.'],
    [15.96, 'Who: ' + CONFIG.guests + ' guests. Search.', 'A cursor presses Search.'],
    [18.24, 'Choose from countless designs.', 'A wall of photos of Japanese inns, rooms and streets.'],
    [20.32, CONFIG.listingTitle + '. ' + CONFIG.listingFacts.replace(/ · /g, ', ') + '. Reserve.', 'An onsen street at night, a futon room and a cedar bath, over a faint 京都 (Kyoto).'],
    [24.30, 'Request sent. This is not a confirmed booking - at least not yet. You’ll get a response within 24 hours.'],
    [25.76, 'And you just wait…', '“Wait” in Braille, French, Korean, Japanese, Polish, Spanish, Chinese, Swedish, Greek, Arabic and Vietnamese.'],
    [27.20, 'Three dots, waiting for a reply.'],
    [28.80, 'Your reservation is confirmed. You’re going to ' + CONFIG.country + '.'],
    [30.24, 'The ' + CONFIG.brand + ' mark on coral.'],
    [31.68, 'End card.']
  ];
  function beatAt(t) { var b = BEATS[0]; for (var i = 0; i < BEATS.length; i++) if (t >= BEATS[i][0] - 1e-6) b = BEATS[i]; return b; }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }

  function syncUI() {
    range.value = T.toFixed(2);
    range.style.setProperty('--p', (T / DUR * 100).toFixed(2) + '%');
    var b = beatAt(T);
    range.setAttribute('aria-valuetext', fmt(T) + ' of ' + fmt(DUR) + ', ' + b[1]);
    clock.textContent = fmt(T) + ' / ' + fmt(DUR);
    var items = transcript.children, idx = BEATS.indexOf(b);
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('is-now', i === idx);
  }
  function setPlaying(on) {
    playing = on;
    root.classList.toggle('is-paused', !on);
    playBtn.setAttribute('aria-label', on ? 'Pause the ad' : 'Play the ad');
    if (on) {
      replay.hidden = true;
      if (T >= DUR) T = 0;
      last = performance.now();
      loop();
    } else cancelAnimationFrame(raf);
  }
  function loop() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function step(now) {
      if (!playing) return;
      if (!holdOff && visible) T += Math.min(0.1, (now - last) / 1000);
      last = now;
      if (T >= DUR) {
        T = DUR;
        render(T); syncUI();
        setPlaying(false);
        replay.hidden = false;
        return;
      }
      render(T); syncUI();
      raf = requestAnimationFrame(step);
    });
  }
  function seek(t, announce) {
    T = clamp(t, 0, DUR);
    replay.hidden = T < DUR;
    render(T); syncUI();
    if (announce) {
      clearTimeout(seek.timer);
      seek.timer = setTimeout(function () { live.textContent = fmt(T) + ': ' + beatAt(T)[1]; }, 250);
    }
  }

  playBtn.addEventListener('click', function () { setPlaying(!playing); });
  replay.addEventListener('click', function () { seek(0); setPlaying(true); playBtn.focus(); });
  range.addEventListener('input', function () { seek(parseFloat(range.value), true); });
  range.addEventListener('pointerdown', function () { holdOff = true; });
  window.addEventListener('pointerup', function () { if (holdOff) { holdOff = false; last = performance.now(); } });
  range.addEventListener('keydown', function (e) {
    var to = null, b = BEATS.indexOf(beatAt(T));
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') to = T + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') to = T - 1;
    else if (e.key === 'PageDown') to = b < BEATS.length - 1 ? BEATS[b + 1][0] : DUR;
    else if (e.key === 'PageUp') to = T - BEATS[b][0] > 0.6 ? BEATS[b][0] : BEATS[Math.max(0, b - 1)][0];
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = DUR;
    else if (e.key === ' ' || e.key === 'k' || e.key === 'K') { e.preventDefault(); setPlaying(!playing); return; }
    if (to == null) return;
    e.preventDefault();
    seek(to, true);
  });

  // Chapter ticks and the transcript
  var transcript = document.querySelector('[data-transcript]');
  BEATS.forEach(function (b) {
    var i = document.createElement('i');
    i.style.left = (b[0] / DUR * 100).toFixed(2) + '%';
    ticks.appendChild(i);
    var li = document.createElement('li');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = fmt(b[0]);
    btn.setAttribute('aria-label', 'Play from ' + fmt(b[0]));
    btn.addEventListener('click', function () {
      seek(b[0] + 0.001);
      if (!reduceMQ.matches) setPlaying(true);
      root.scrollIntoView({ behavior: reduceMQ.matches ? 'auto' : 'smooth', block: 'start' });
      playBtn.focus({ preventScroll: true });
    });
    var text = document.createElement('span');
    text.textContent = b[1];
    if (b[2]) { var sm = document.createElement('small'); sm.textContent = b[2]; text.appendChild(sm); }
    li.appendChild(btn); li.appendChild(text);
    transcript.appendChild(li);
  });

  // Credits for the photos
  var CREDITS = [
    ['Onsen street at night (Ginzan Onsen)', 'Eiji Kikuta', 'CC0 1.0', 'https://commons.wikimedia.org/w/index.php?curid=61323268', PHOTOS.onsen],
    ['Traditional Room', 'nishimuraya.kinosakionsen', 'CC BY 2.0', 'https://www.flickr.com/photos/136749227@N06/22239451949', PHOTOS.garden],
    ['Tea Setting', 'objectfox', 'CC BY 2.0', 'https://www.flickr.com/photos/44124372247@N01/743117938', PHOTOS.shoji],
    ['Otani Sanso ryokan', 'Raita Futo', 'CC BY 2.0', 'https://commons.wikimedia.org/w/index.php?curid=59586147', PHOTOS.hills],
    ['A Modern Twist on Traditional Japanese Architecture in Kanazawa', 'dalecruse', 'CC BY 2.0', 'https://www.flickr.com/photos/91873384@N04/54381298293', PHOTOS.lantern],
    ['Day 6: Tsuwano', 'decade_null', 'CC BY 2.0', 'https://www.flickr.com/photos/39952962@N00/3129263060', PHOTOS.sunlit],
    ['View from my room, Aoi-so Inn, Kyoto', 'espenore', 'CC BY 2.0', 'https://www.flickr.com/photos/91625368@N00/9847310034', PHOTOS.window],
    ['gion district', 'David Offf', 'CC BY 2.0', 'https://www.flickr.com/photos/67162482@N07/6122839290', PHOTOS.gion],
    ['Aburanokoji-dori Hata-ke House', 'gintacat', 'CC BY 2.0', 'https://www.flickr.com/photos/64855052@N00/3892329400', PHOTOS.machiya],
    ['Homeikan Honkan Ryokan', 'Deborah Austin', 'CC BY 2.0', 'https://commons.wikimedia.org/w/index.php?curid=14526106', PHOTOS.futon],
    ['Private Onsen Bath in our suite', 'City Foodsters', 'CC BY 2.0', 'https://www.flickr.com/photos/89060048@N03/11652130443', PHOTOS.bath]
  ];
  var credits = document.querySelector('[data-credits]');
  if (credits) CREDITS.forEach(function (c) {
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = c[3]; a.textContent = '“' + c[0] + '”'; a.rel = 'noopener';
    var lic = document.createElement('a');
    lic.href = c[2] === 'CC0 1.0' ? 'https://creativecommons.org/publicdomain/zero/1.0/' : 'https://creativecommons.org/licenses/by/2.0/';
    lic.textContent = c[2]; lic.rel = 'license noopener';
    li.appendChild(a);
    li.appendChild(document.createTextNode(' by ' + c[1] + ', '));
    li.appendChild(lic);
    li.appendChild(document.createTextNode('. Resized and re-encoded as WebP.'));
    credits.appendChild(li);
  });

  /* ---------------------------------------------------------------- Start */
  var params = new URLSearchParams(location.search);
  var frozen = params.has('t');
  if (params.get('bare') === '1') { root.classList.add('is-bare'); document.body.classList.add('is-bare-page'); }

  // Pause while scrolled away or in a background tab; the visitor's own
  // Pause is separate and is never overridden.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; last = performance.now(); }, { threshold: 0.15 }).observe(frame);
  }
  document.addEventListener('visibilitychange', function () { last = performance.now(); if (document.hidden) visible = false; else visible = true; });

  fillContent();
  layout();
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  if (frozen) { seek(parseFloat(params.get('t')) || 0); setPlaying(false); }
  else if (reduceMQ.matches || params.get('autoplay') === '0') {
    // Nothing moves on its own: show the brand beat, and let Play opt in.
    seek(reduceMQ.matches ? 5.6 : 0);
    setPlaying(false);
  } else { seek(0); setPlaying(true); }

  window.UI_BSA = { seek: seek, play: function () { setPlaying(true); }, pause: function () { setPlaying(false); }, get time() { return T; }, config: CONFIG };
})();
