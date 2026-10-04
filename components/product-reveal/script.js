/* ==========================================================================
   UI Product Reveal: timeline
   One clock drives every element, so the sequence can be paused, replayed,
   or frozen on any moment (add ?t=3.2 to the URL to inspect a frame).
   Times are in seconds and follow the source video's beats (30 fps).
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // Beats
  var T_POSTER = 2.1;   // hard cut: intro -> poster
  var T_END = 4.57;     // hard cut: poster -> sign-off card
  var T_TOTAL = 6.8;
  var T_STILL = 2.9;    // the settled poster, used for stills and reduced motion

  // Track geometry (design units on the 720 x 900 frame)
  var CX = 360, CY = 450;
  var LANES = 8, LANE_OUTER = 185, LANE_STEP = 13.36, LANE_STRAIGHT = 115, LANE_SQUASH = 1.138;

  // Shoe box on the frame and the point it zooms around
  var SHOE = { x: 48.5, y: 211, w: 604.5, h: 462 };
  var SHOE_O = { x: SHOE.x + SHOE.w / 2, y: SHOE.y + SHOE.h / 2 };

  // Tracking readouts, pinned to points on the shoe (design units)
  var HUD = [
    [86, 170], [60, 197], [98, 211], [131, 252], [442, 165], [402, 289], [414, 304],
    [104, 354], [126, 368], [126, 386], [206, 541], [302, 536], [234, 573], [252, 590],
    [341, 586], [419, 600], [282, 624], [416, 626], [306, 666]
  ];

  // ---------- Easing ----------
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(t, a, b) { return clamp01((t - a) / (b - a)); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function outCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function inCubic(x) { return x * x * x; }
  function outQuart(x) { return 1 - Math.pow(1 - x, 4); }
  function inOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function outExpo(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function outBack(x) { var c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function n(v) { return Math.round(v * 100) / 100; }

  // ---------- Geometry ----------
  function lanePath(hw, ry, L) {
    var x0 = n(CX - hw), x1 = n(CX + hw), yt = n(CY - L), yb = n(CY + L);
    hw = n(hw); ry = n(ry);
    return "M" + x0 + " " + yt + "V" + yb +
      "A" + hw + " " + ry + " 0 0 0 " + x1 + " " + yb +
      "V" + yt + "A" + hw + " " + ry + " 0 0 0 " + x0 + " " + yt + "Z";
  }

  function laneHalfWidth(i) { return LANE_OUTER - LANE_STEP * i; }

  // One half of the logo mark: two concentric bands that drop and turn outward.
  // `ext` lengthens the horizontal feet.
  function logoBands(ext) {
    var end = n(247 - ext);
    return [
      "M292 396H317V432A35 35 0 0 1 282 467H" + end + "V442H282A10 10 0 0 0 292 432Z",
      "M328 396H353V432A71 71 0 0 1 282 503H" + end + "V478H282A46 46 0 0 0 328 432Z"
    ];
  }

  // The CO2 wordmark. `k` stretches every letter's straight runs.
  function co2Glyphs(k) {
    var wC = 178 + k, wO = 186 + k, w2 = 181 + k, gap = 8;
    var a2 = n(w2 - 34);
    return {
      width: wC + wO + w2 + gap * 2,
      c: { x: 0, d: "M" + n(wC) + " 0H50A50 50 0 0 0 50 100H" + n(wC) + "V76H50A26 26 0 0 1 50 24H" + n(wC) + "Z" },
      o: { x: n(wC + gap), d: "M50 0H" + n(wO - 50) + "A50 50 0 0 1 " + n(wO - 50) + " 100H50A50 50 0 0 1 50 0Z" +
        "M50 24A26 26 0 0 0 50 76H" + n(wO - 50) + "A26 26 0 0 0 " + n(wO - 50) + " 24Z" },
      "2a": { x: n(wC + wO + gap * 2), d: "M0 0H" + a2 + "A34 34 0 0 1 " + a2 + " 68H28V44H" + a2 + "A10 10 0 0 0 " + a2 + " 24H0Z" },
      "2b": { x: n(wC + wO + gap * 2), d: "M28 44A28 28 0 0 0 0 72V100H" + n(w2) + "V72H28Z" }
    };
  }

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  var uid = 0;

  // ---------- One stage ----------
  function Stage(root) {
    var self = this;
    var q = function (sel) { return root.querySelector(sel); };
    var qa = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
    var id = "ui-reveal-" + (++uid);

    this.root = root;
    this.frame = q(".ui-reveal__frame");

    // Track lanes and start lines
    var track = q("[data-track]");
    this.track = track;
    this.lanes = [];
    for (var i = 0; i < LANES; i++) this.lanes.push(el("path", {}, track));
    var inner = laneHalfWidth(LANES - 1);
    this.starts = [];
    [CY + 118, CY + 130].forEach(function (y) {
      self.starts.push(el("path", { "data-start": "", pathLength: 1, d: "M" + (CX - LANE_OUTER) + " " + y + "H" + n(CX - inner) }, track));
      self.starts.push(el("path", { "data-start": "", pathLength: 1, d: "M" + (CX + LANE_OUTER) + " " + y + "H" + n(CX + inner) }, track));
    });
    this.starts.forEach(function (p) { p.style.strokeDasharray = "1"; });
    this.ring = q("[data-ring]");

    // Logo: two halves, the right one mirrored. Each half sits in a clip that grows from its stems.
    var logo = q("[data-logo]");
    var defs = el("defs", {}, logo);
    this.halves = [0, 1].map(function (side) {
      var outer = el("g", side ? { transform: "matrix(-1 0 0 1 716 0)" } : {}, logo);
      var shift = el("g", {}, outer);
      var clip = el("clipPath", { id: id + "-clip-" + side, clipPathUnits: "userSpaceOnUse" }, defs);
      var circle = el("circle", { cx: 340.5, cy: 396, r: 0 }, clip);
      var body = el("g", { "clip-path": "url(#" + id + "-clip-" + side + ")" }, shift);
      var bands = [el("path", {}, body), el("path", {}, body)];
      // The seed: a small square that the mark grows out of
      var seed = el("rect", { x: 334.5, y: 396, width: 12, height: 12, "class": "ui-reveal__seed" }, shift);
      return { shift: shift, circle: circle, bands: bands, seed: seed };
    });

    // Shoe
    this.shoe = q("[data-shoe]");
    this.ghosts = qa("[data-ghost]");

    // Wordmark
    this.co2 = q("[data-co2]");
    this.co2Group = q("[data-co2-group]");
    this.parts = {};
    qa("[data-part]").forEach(function (p) { self.parts[p.getAttribute("data-part")] = p; });
    this.lastK = -1;

    this.acme = q("[data-acme]");
    this.meta = q("[data-meta]");
    this.types = qa("[data-type]").map(function (node) {
      return { node: node, text: node.getAttribute("data-type"), shown: -1 };
    });

    // Readouts
    var hud = q("[data-hud]");
    this.points = HUD.map(function (p, idx) {
      var node = document.createElement("span");
      node.className = "ui-reveal__pt";
      hud.appendChild(node);
      // A fixed pseudo-random order for appearing and leaving
      var r1 = ((idx * 7919) % 19) / 19, r2 = ((idx * 104729) % 23) / 23;
      return { node: node, x: p[0], y: p[1], inAt: 3.45 + r1 * 0.42, outAt: 4.02 + r2 * 0.22, text: "" };
    });

    this.end = q("[data-end]");
    this.endMark = q("[data-end-mark]");
    this.endAcme = q("[data-end-acme]");
    this.markers = qa("[data-markers] i");
    this.progress = q("[data-progress]");

    this.phase = "";
    this.measure();
  }

  Stage.prototype.measure = function () {
    this.unit = (this.frame.getBoundingClientRect().width || 720) / 720;
  };

  Stage.prototype.setPhase = function (phase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.root.setAttribute("data-phase", phase);
    if (phase !== "intro") this.setLanes(1, 1, 1);
  };

  // a: circle growth (0..1), b: elongation (0..1), per-lane stagger handled by caller when a is a function
  Stage.prototype.setLanes = function (a, b, opacity) {
    for (var i = 0; i < LANES; i++) {
      var ai = typeof a === "function" ? a(i) : a;
      var hw = lerp(12, laneHalfWidth(i), ai);
      var ry = hw * lerp(1, LANE_SQUASH, b);
      this.lanes[i].setAttribute("d", lanePath(hw, ry, LANE_STRAIGHT * b));
      this.lanes[i].style.opacity = typeof a === "function" ? Math.min(1, ai * 5) : opacity;
    }
  };

  Stage.prototype.setTrack = function (scale, dy, opacity) {
    this.track.setAttribute("transform",
      "translate(" + CX + " " + n(CY + (dy || 0)) + ") scale(" + n(scale * 1000) / 1000 + ") translate(" + -CX + " " + -CY + ")");
    this.track.style.opacity = opacity == null ? 1 : opacity;
  };

  Stage.prototype.setType = function (item, p) {
    var count = Math.round(item.text.length * clamp01(p));
    if (count === item.shown) return;
    item.shown = count;
    item.node.textContent = item.text.slice(0, count);
  };

  Stage.prototype.setCo2 = function (k) {
    k = Math.round(k * 10) / 10;
    if (k === this.lastK) return;
    this.lastK = k;
    var g = co2Glyphs(k);
    for (var key in this.parts) {
      this.parts[key].setAttribute("d", g[key].d);
      this.parts[key].setAttribute("transform", "translate(" + g[key].x + " 0)");
    }
    this.co2Group.setAttribute("transform", "translate(" + n(-(g.width - 561) / 2) + " 0)");
  };

  Stage.prototype.reveal = function (node, p) {
    node.style.clipPath = p >= 1 ? "" : "inset(-20% " + n((1 - p) * 100) + "% -20% 0)";
    node.style.visibility = p <= 0 ? "hidden" : "";
  };

  Stage.prototype.render = function (t) {
    var i, p;
    this.progress.style.transform = "scaleX(" + n(clamp01(t / T_TOTAL) * 1000) / 1000 + ")";

    // ================= 1. Intro =================
    if (t < T_POSTER) {
      this.setPhase("intro");

      // Dot -> thick ring
      var r = lerp(0.6, 13, outCubic(seg(t, 0.07, 0.4)));
      this.ring.setAttribute("r", n(r));
      this.ring.style.strokeWidth = n(Math.min(r, 6.5));
      this.ring.style.opacity = t < 0.07 ? 0 : 1 - seg(t, 0.36, 0.48);

      // Ring splits into lanes, the circle grows, then stretches into a track
      var b = inOutCubic(seg(t, 0.58, 1.05));
      this.setLanes(function (lane) { return outCubic(seg(t, 0.34 + lane * 0.012, 0.64 + lane * 0.006)); }, b);

      var trackScale = t < 1.6 ? 1 + 0.02 * seg(t, 1.05, 1.6) : 1.02 + 0.45 * inCubic(seg(t, 1.6, T_POSTER));
      this.setTrack(trackScale, 0, 1);

      // Start lines
      for (i = 0; i < this.starts.length; i++) {
        this.starts[i].style.strokeDashoffset = 1 - outCubic(seg(t, 1.0 + (i >> 1) * 0.06, 1.3 + (i >> 1) * 0.06));
      }

      // Logo halves: a small square on each side, then the mark grows out of it
      // (a circular reveal from the stems) while sliding in; near the cut the
      // feet shoot outward and the halves part
      var reveal = outCubic(seg(t, 0.3, 0.86));
      var seed = outBack(seg(t, 0.25, 0.33));
      var slide = -70 * (1 - outCubic(seg(t, 0.35, 1.05)));
      var burst = inCubic(seg(t, 1.6, T_POSTER));
      var ext = 270 * burst;
      var part = -34 * burst;
      var bands = logoBands(ext);
      for (i = 0; i < 2; i++) {
        var h = this.halves[i];
        h.shift.setAttribute("transform", "translate(" + n(slide + part) + " 0)");
        h.bands[0].setAttribute("d", bands[0]);
        h.bands[1].setAttribute("d", bands[1]);
        h.circle.setAttribute("r", reveal >= 1 ? 2000 : n(150 * reveal));
        h.seed.setAttribute("transform", "translate(340.5 402) scale(" + n(t < 0.25 ? 0 : seed) + ") translate(-340.5 -402)");
        h.seed.style.opacity = 1 - seg(t, 0.38, 0.44);
      }
      return;
    }

    // ================= 2. Poster =================
    if (t < T_END) {
      this.setPhase("poster");
      this.setTrack(1 + 0.06 * seg(t, T_POSTER, T_END), 10, 1);

      // Shoe: a slow push, then a fast zoom with a smear
      var settle = outCubic(seg(t, T_POSTER, T_POSTER + 0.25));
      var zoom = inCubic(seg(t, 3.55, T_END));
      var s = lerp(1.03, 1, settle) + 0.16 * seg(t, T_POSTER, 3.55) + 0.6 * zoom;
      var tx = -14 * zoom, ty = -26 * zoom;
      var blur = (0.5 * seg(t, 2.6, 3.5) + 3.6 * zoom + 2.5 * (1 - settle)) * this.unit;
      this.shoe.style.transform = "translate(" + n(tx * this.unit) + "px," + n(ty * this.unit) + "px) scale(" + n(s * 1000) / 1000 + ")";
      this.shoe.style.filter = blur > 0.15 ? "blur(" + n(blur) + "px)" : "";
      var smear = seg(t, 3.3, 4.3);
      for (i = 0; i < this.ghosts.length; i++) {
        this.ghosts[i].style.opacity = n(smear * (i ? 0.22 : 0.38));
        this.ghosts[i].style.transform = "scale(" + n(1 + (i + 1) * 0.035 * smear) + ")";
      }

      // Wordmark builds in pieces, then stretches past the frame before the cut
      var starts = { c: 2.1, o: 2.16, "2a": 2.22, "2b": 2.31 };
      for (var key in starts) this.reveal(this.parts[key], outExpo(seg(t, starts[key], starts[key] + 0.24)));
      this.setCo2(175 * inCubic(seg(t, 4.3, T_END)));

      this.reveal(this.acme, outExpo(seg(t, 2.12, 2.4)));
      this.meta.style.visibility = t < 2.22 ? "hidden" : "";
      this.setType(this.types[0], seg(t, 2.24, 2.84));

      // Markers pop in around the edge
      for (i = 0; i < this.markers.length; i++) {
        p = seg(t, T_POSTER + i * 0.018, T_POSTER + 0.2 + i * 0.018);
        this.markers[i].style.transform = p >= 1 ? "none" : "scale(" + n(Math.max(0, outBack(p))) + ")";
      }

      // Tracking readouts follow their points on the zooming shoe
      for (i = 0; i < this.points.length; i++) {
        var pt = this.points[i];
        var on = t >= pt.inAt && t < pt.outAt;
        if (!on) { if (pt.node.style.opacity !== "0") pt.node.style.opacity = "0"; continue; }
        var sx = SHOE_O.x + (pt.x - SHOE_O.x) * s + tx;
        var sy = SHOE_O.y + (pt.y - SHOE_O.y) * s + ty;
        var label = "× x: " + Math.round(sx * 1.5) + "  y: " + Math.round(sy * 1.5);
        var typed = Math.round(label.length * seg(t, pt.inAt, pt.inAt + 0.1));
        var flicker = (t - pt.inAt) < 0.06 && Math.floor(t * 60) % 2;
        var text = label.slice(0, typed);
        if (text !== pt.text) { pt.text = text; pt.node.textContent = text; }
        pt.node.style.opacity = flicker ? "0.35" : "1";
        pt.node.style.transform = "translate(" + n(sx * this.unit) + "px," + n(sy * this.unit) + "px)";
      }
      return;
    }

    // ================= 3. Sign-off =================
    this.setPhase("end");
    this.setTrack(1.3 + 3.9 * outQuart(seg(t, T_END, 5.9)), 0, 1 - seg(t, 5.2, 5.9));
    this.reveal(this.endMark, outExpo(seg(t, T_END, T_END + 0.26)));
    this.reveal(this.endAcme, outExpo(seg(t, T_END + 0.03, T_END + 0.3)));
    this.setType(this.types[1], seg(t, 4.62, 5.45));
    for (i = 0; i < this.markers.length; i++) this.markers[i].style.transform = "none";
  };

  // ---------- Player ----------
  function Player(stage, opts) {
    var self = this;
    this.stage = stage;
    this.t = 0;
    this.playing = false;
    this.last = 0;
    this.toggleBtn = opts.toggle;
    this.replayBtn = opts.replay;
    this.tick = function (now) { self.frame(now); };
    if (this.toggleBtn) this.toggleBtn.addEventListener("click", function () { self.playing ? self.pause() : self.play(); });
    if (this.replayBtn) this.replayBtn.addEventListener("click", function () { self.t = 0; self.play(); });
  }

  Player.prototype.play = function () {
    if (this.t >= T_TOTAL || this.still) { this.t = 0; this.still = false; }
    this.playing = true;
    this.last = 0;
    this.stage.root.removeAttribute("data-paused");
    this.stage.root.removeAttribute("data-done");
    this.label();
    requestAnimationFrame(this.tick);
  };

  Player.prototype.pause = function () {
    this.playing = false;
    this.stage.root.setAttribute("data-paused", "");
    this.label();
  };

  Player.prototype.seek = function (t, still) {
    this.t = t;
    this.still = !!still;
    this.stage.render(t);
  };

  Player.prototype.frame = function (now) {
    if (!this.playing) return;
    if (this.last) this.t += Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (this.t >= T_TOTAL) {
      this.t = T_TOTAL;
      this.stage.render(this.t);
      this.playing = false;
      this.stage.root.setAttribute("data-paused", "");
      this.stage.root.setAttribute("data-done", "");
      this.label();
      return;
    }
    this.stage.render(this.t);
    requestAnimationFrame(this.tick);
  };

  Player.prototype.label = function () {
    if (!this.toggleBtn) return;
    var done = this.t >= T_TOTAL || this.still;
    this.toggleBtn.setAttribute("aria-label", this.playing ? "Pause animation" : done ? "Play animation from the start" : "Play animation");
  };

  // ---------- Boot ----------
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var frozen = parseFloat(new URLSearchParams(window.location.search).get("t"));
  var stages = [];

  function init(root) {
    var stage = new Stage(root);
    stages.push(stage);
    return stage;
  }

  // Product section: a still of the poster, built from a copy of the hero stage
  var hero = document.querySelector("[data-ui-reveal]");
  var posterHost = document.querySelector("[data-ui-reveal-poster]");
  if (hero && posterHost) {
    var wrap = document.createElement("div");
    wrap.className = "ui-reveal ui-reveal--poster";
    wrap.setAttribute("aria-hidden", "true");
    wrap.appendChild(hero.querySelector("[data-ui-reveal-stage]").cloneNode(true));
    var fallback = posterHost.querySelector(".ui-reveal-product__fallback");
    if (fallback) fallback.remove();
    posterHost.insertBefore(wrap, posterHost.firstChild);
    init(wrap).render(T_STILL);
  }

  if (hero) {
    var player = new Player(init(hero), {
      toggle: hero.querySelector("[data-ui-reveal-toggle]"),
      replay: hero.querySelector("[data-ui-reveal-replay]")
    });

    if (!isNaN(frozen)) {
      player.seek(Math.max(0, Math.min(T_TOTAL, frozen)), true);
      hero.setAttribute("data-paused", "");
      player.label();
    } else if (reduceMotion && reduceMotion.matches) {
      // No autoplay: show the settled poster; the play button still runs the full reveal on request
      player.seek(T_STILL, true);
      hero.setAttribute("data-paused", "");
      player.label();
    } else {
      player.seek(0);
      player.play();
    }

    if (reduceMotion && reduceMotion.addEventListener) {
      reduceMotion.addEventListener("change", function (e) {
        if (e.matches && player.playing) { player.pause(); player.seek(T_STILL, true); player.label(); }
      });
    }

    window.addEventListener("resize", function () {
      stages.forEach(function (s) { s.measure(); });
      stages.forEach(function (s) { if (s !== player.stage) s.render(T_STILL); });
      player.stage.render(player.t);
    });

    initDrain(hero, player);
  }

  // ---------- "Discover" exit: down the drain, then scroll ----------
  // The three sign-off pieces are dragged along curves into the button,
  // speeding up, shrinking and blurring as they bunch together. The moment
  // they hit it the button gives a press and the page snaps on to the product.
  function initDrain(hero, player) {
    var cue = hero.querySelector(".ui-reveal__cue");
    var target = document.querySelector(cue && cue.getAttribute("href"));
    var controls = hero.querySelector(".ui-reveal__controls");
    if (!cue || !target) return;

    var stage = player.stage;
    var pieces = [stage.endMark, stage.types[1].node, stage.endAcme];
    var busy = false;

    var TRAVEL = 900, SCROLL = 460;

    function bezier(p0, p1, p2, p3, u) {
      var v = 1 - u;
      return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
    }

    function finish() {
      target.focus({ preventScroll: true });
      // Put the hero back the way it was, ready for the next visit (it is off screen now)
      pieces.forEach(function (node) {
        node.style.translate = node.style.scale = node.style.filter = node.style.opacity = node.style.transformOrigin = "";
      });
      cue.style.scale = cue.style.pointerEvents = "";
      if (controls) controls.inert = false;
      busy = false;
    }

    // Starts at full speed and brakes hard: sharp, not floaty
    function scrollToTarget() {
      var from = window.scrollY;
      var to = from + target.getBoundingClientRect().top;
      var t0 = 0;
      function step(now) {
        if (!t0) t0 = now;
        var t = now - t0;
        var p = outQuart(seg(t, 0, SCROLL));
        window.scrollTo(0, lerp(from, to, p));
        // The button springs back from its press on the way out
        cue.style.scale = n(lerp(0.9, 1, outCubic(seg(t, 0, 220))));
        if (p < 1) requestAnimationFrame(step); else finish();
      }
      requestAnimationFrame(step);
    }

    function calm() { return !!(reduceMotion && reduceMotion.matches); }

    function jump() {
      target.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
      target.focus({ preventScroll: true });
    }

    // Scrolling down from the sign-off card does the same as clicking Discover
    function atSignOff() {
      return !calm() && stage.phase === "end" && !player.playing && hero.hasAttribute("data-done") &&
        hero.getBoundingClientRect().top > -8 && window.scrollY < hero.offsetTop + 8;
    }

    function catchScroll(e) {
      if (busy) { e.preventDefault(); return true; }   // hold the page still while the pieces drain
      if (!atSignOff()) return false;
      e.preventDefault();
      drain();
      return true;
    }

    window.addEventListener("wheel", function (e) {
      if (busy || e.deltaY > 0) catchScroll(e);
    }, { passive: false });

    var touchY = null;
    window.addEventListener("touchstart", function (e) { touchY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      if (busy) { e.preventDefault(); return; }
      if (touchY !== null && touchY - e.touches[0].clientY > 10 && catchScroll(e)) touchY = null;
    }, { passive: false });

    window.addEventListener("keydown", function (e) {
      var down = e.key === "PageDown" || e.key === "ArrowDown" || e.key === "End" || (e.key === " " && !e.shiftKey);
      if (!down) return;
      // Space and arrows belong to the focused control, if there is one
      var el = e.target;
      if (!busy && el && el.closest && el.closest("button, a, input, select, textarea, [contenteditable]")) return;
      catchScroll(e);
    });

    cue.addEventListener("click", function (e) {
      e.preventDefault();
      if (busy) return;
      // Only the sign-off card drains; anywhere else (or with reduced motion) go straight there
      if (calm() || stage.phase !== "end" || player.playing) { jump(); return; }
      drain();
    });

    function drain() {
      busy = true;
      if (controls) controls.inert = true;
      cue.style.pointerEvents = "none";

      var cueBox = cue.getBoundingClientRect();
      var T = { x: cueBox.left + cueBox.width / 2, y: cueBox.top + cueBox.height * 0.45 };

      // Each piece is anchored at its bottom centre and follows a curve into the button
      var paths = pieces.map(function (node, i) {
        var b = node.getBoundingClientRect();
        var A = { x: b.left + b.width / 2, y: b.bottom };
        var dx = T.x - A.x, dy = T.y - A.y;
        node.style.transformOrigin = "50% 100%";
        return {
          node: node, A: A,
          c1: { x: A.x + dx * 0.32, y: A.y + dy * 0.12 },
          c2: { x: T.x, y: A.y + dy * 0.58 },
          delay: i === 1 ? 0 : 60
        };
      });

      var t0 = 0;
      function frame(now) {
        if (!t0) t0 = now;
        var t = now - t0;
        paths.forEach(function (p) {
          var x = clamp01((t - p.delay) / (TRAVEL - p.delay));
          var u = Math.pow(x, 1.8);                       // accelerating, like water finding the drain
          var px = bezier(p.A.x, p.c1.x, p.c2.x, T.x, u);
          var py = bezier(p.A.y, p.c1.y, p.c2.y, T.y, u);
          p.node.style.translate = n(px - p.A.x) + "px " + n(py - p.A.y) + "px";
          p.node.style.scale = n(lerp(1, 0.28, u));
          p.node.style.filter = "blur(" + n(6 * seg(u, 0.3, 1)) + "px)";
          p.node.style.opacity = n(1 - seg(u, 0.85, 1));
        });
        cue.style.scale = n(1 - 0.1 * seg(t, TRAVEL - 120, TRAVEL));
        if (t < TRAVEL) requestAnimationFrame(frame);
        else scrollToTarget();                            // no pause: the hit sends the page down
      }
      requestAnimationFrame(frame);
    }
  }

  // Pre-order (demo): a toggled state announced to screen readers
  var cta = document.querySelector("[data-ui-reveal-preorder]");
  var status = document.querySelector("[data-ui-reveal-status]");
  if (cta) {
    cta.addEventListener("click", function () {
      var on = !cta.hasAttribute("data-reserved");
      cta.toggleAttribute("data-reserved", on);
      cta.querySelector("[data-label]").textContent = on ? "Reserved" : "Pre-order";
      if (status) status.textContent = on ? "CO2 reserved. We will email you when your size ships." : "Reservation removed.";
      cta.dispatchEvent(new CustomEvent("ui-reveal:preorder", { bubbles: true, detail: { reserved: on } }));
    });
  }
})();
