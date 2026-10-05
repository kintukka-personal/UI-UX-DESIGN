/* ==========================================================================
   UI Acier Reveal: timeline
   One clock drives the sequence (pause, replay, ?t=4.2 to freeze a moment).
   A second, real clock drives the watch hands: they show the visitor's
   local time and step once a second, like a quartz movement.
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // Beats
  var T_POSTER = 2.5;   // match cut: tick ring -> watch dial
  var T_END = 6.0;      // match cut: black dial -> sign-off
  var T_TOTAL = 8.0;
  var T_STILL = 5.1;    // the settled poster, for stills and reduced motion

  // Quartz ring (design units on the 720 x 900 frame)
  var RING_R = 250, RING_C = { x: 360, y: 450 };
  // Where the watch dial sits on the poster, and its radius
  var DIAL = { x: 360, y: 360, r: 118 };

  // The watch photo (532 x 878 px) and its dial centre, for the hands
  var HANDS_C = { x: 257, y: 422.5 };

  // ACIER, drawn on a 100-unit cap height
  var LETTERS = [
    { w: 110, d: "M0 100L40 0H70L110 100H86L77 76H33L24 100ZM41 56H69L55 20Z" },
    { w: 110, d: "M110 0H36A36 36 0 0 0 0 36V64A36 36 0 0 0 36 100H110V78H40A18 18 0 0 1 22 60V40A18 18 0 0 1 40 22H110Z" },
    { w: 22, d: "M0 0H22V100H0Z" },
    { w: 100, d: "M0 0H100V22H22V39H88V61H22V78H100V100H0Z" },
    { w: 106, d: "M0 0H72A32 32 0 0 1 72 64H68L106 100H76L40 64H22V100H0ZM22 22V42H72A10 10 0 0 0 72 22Z" }
  ];
  var LETTER_GAP = 14, ROWS = 5, ROW_H = 20;

  // Callouts on the poster: anchor on the watch, label height, side
  var CALLOUTS = [
    { a: [296, 299], y: 236, side: "left", text: "BLACK\nDIAL" },
    { a: [220, 368], y: 430, side: "left", text: "STEEL\nCASE" },
    { a: [454, 140], y: 146, side: "right", text: "LINK\nBRACELET" },
    { a: [532, 357], y: 318, side: "right", text: "LOCAL TIME\n", time: true },
    { a: [377, 526], y: 560, side: "right", text: "QUARTZ\nMOVEMENT" }
  ];

  // ---------- Easing ----------
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function seg(t, a, b) { return clamp01((t - a) / (b - a)); }
  function lerp(a, b, p) { return a + (b - a) * p; }
  function outCubic(x) { return 1 - Math.pow(1 - x, 3); }
  function inCubic(x) { return x * x * x; }
  function inQuart(x) { return x * x * x * x; }
  function outQuart(x) { return 1 - Math.pow(1 - x, 4); }
  function inOutCubic(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function inOutSine(x) { return -(Math.cos(Math.PI * x) - 1) / 2; }
  function outExpo(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  function outBack(x, c) { c = c == null ? 1.7 : c; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }
  function n(v) { return Math.round(v * 100) / 100; }
  function pad(v) { return (v < 10 ? "0" : "") + v; }

  function el(name, attrs, parent) {
    var node = document.createElementNS(NS, name);
    for (var key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  var uid = 0;

  // Brushed steel: a gradient with hard highlights, shifted to make light travel
  function steelGradient(defs, id, x2, y2) {
    var g = el("linearGradient", { id: id, gradientUnits: "userSpaceOnUse", x1: 0, y1: 0, x2: x2, y2: y2, spreadMethod: "reflect" }, defs);
    [[0, "#6F757C"], [0.16, "#E8EBEE"], [0.3, "#9AA0A7"], [0.47, "#FAFBFB"], [0.6, "#868C93"], [0.8, "#D7DADE"], [1, "#6B7178"]]
      .forEach(function (s) { el("stop", { offset: s[0], "stop-color": s[1] }, g); });
    return g;
  }

  // "ACIER" in steel bands: each letter is a clip, each band slides in on its own
  function buildWord(svg, id) {
    var defs = el("defs", {}, svg);
    var grad = steelGradient(defs, id + "-steel", 504, 90);
    var bands = [];
    var x = 0;
    LETTERS.forEach(function (L, li) {
      var clip = el("clipPath", { id: id + "-l" + li }, defs);
      el("path", { d: L.d, transform: "translate(" + x + " 0)", "clip-rule": "evenodd" }, clip);
      var g = el("g", { "clip-path": "url(#" + id + "-l" + li + ")" }, svg);
      for (var r = 0; r < ROWS; r++) {
        var band = el("g", {}, g);
        el("rect", { x: x - 4, y: r * ROW_H - 0.2, width: L.w + 8, height: ROW_H + 0.4, fill: "url(#" + id + "-steel)" }, band);
        // the groove between links
        if (r < ROWS - 1) el("rect", { x: x - 4, y: r * ROW_H + ROW_H - 1.3, width: L.w + 8, height: 1.3, fill: "#25282C" }, band);
        bands.push({ node: band, letter: li, row: r });
      }
      x += L.w + LETTER_GAP;
    });
    return { grad: grad, bands: bands };
  }

  // Hands drawn on the photo's own pixel grid
  function buildHands(svg, id) {
    var defs = el("defs", {}, svg);
    var hg = el("linearGradient", { id: id + "-hand", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    [[0, "#7E848A"], [0.42, "#F3F5F6"], [0.58, "#A7ADB3"], [1, "#666C72"]]
      .forEach(function (s) { el("stop", { offset: s[0], "stop-color": s[1] }, hg); });
    var f = el("filter", { id: id + "-shadow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    el("feDropShadow", { dx: 2.5, dy: 3.5, stdDeviation: 2, "flood-color": "#000", "flood-opacity": 0.7 }, f);

    var root = el("g", { transform: "translate(" + HANDS_C.x + " " + HANDS_C.y + ")", filter: "url(#" + id + "-shadow)" }, svg);
    function sword(len) {
      var g = el("g", {}, root);
      el("path", { d: "M-4.8 -15L-3.4 " + -len + "Q0 " + -(len + 5) + " 3.4 " + -len + "L4.8 -15Z", fill: "url(#" + id + "-hand)", stroke: "#3B3F44", "stroke-width": 0.7 }, g);
      el("path", { d: "M-1.45 -27H1.45V" + -(len - 6) + "H-1.45Z", fill: "#EEF1EA" }, g);
      return g;
    }
    var hour = sword(96), minute = sword(138);
    var second = el("g", {}, root);
    el("line", { x1: 0, y1: 40, x2: 0, y2: -154, stroke: "#C3C7CB", "stroke-width": 1.7, "stroke-linecap": "round" }, second);
    el("circle", { r: 8, fill: "url(#" + id + "-hand)", stroke: "#3B3F44", "stroke-width": 0.7 }, root);
    el("circle", { r: 3, fill: "#1A1B1D" }, root);
    return { root: root, hour: hour, minute: minute, second: second };
  }

  // ---------- One stage ----------
  function Stage(root) {
    var self = this;
    var q = function (sel) { return root.querySelector(sel); };
    var qa = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
    var id = "ui-acier-" + (++uid);

    this.root = root;
    this.frame = q(".ui-acier__frame");

    // Quartz: 60 ticks and a seconds hand
    var ring = q("[data-ring]");
    this.ring = ring;
    this.ticks = [];
    for (var i = 0; i < 60; i++) {
      var hour = i % 5 === 0, len = hour ? 30 : 14;
      var line = el("line", { x1: 0, x2: 0, y1: -RING_R, y2: -RING_R, "stroke-width": hour ? 4 : 1.6, transform: "rotate(" + i * 6 + ")" }, ring);
      this.ticks.push({ node: line, len: len, at: 0.42 + 0.9 * Math.pow(i / 60, 0.6) });
    }
    this.sweep = el("path", { "class": "ui-acier__sweep" }, ring);
    this.shand = el("g", {}, ring);
    el("line", { "class": "ui-acier__hand-s", x1: 0, y1: 28, x2: 0, y2: -RING_R + 22 }, this.shand);
    el("circle", { "class": "ui-acier__hub", r: 5 }, this.shand);
    this.fork = q("[data-fork]");
    this.tines = q("[data-tines]");
    this.buzz = q("[data-buzz]");
    this.hz = q("[data-hz]");

    // Poster
    this.camera = q("[data-camera]");
    this.watch = q("[data-watch]");
    this.watchImg = q(".ui-acier__watch-img");
    this.sheen = q("[data-sheen]");
    this.word = buildWord(q("[data-word]"), id + "-w");
    this.hands = buildHands(q("[data-hands]"), id + "-h");
    this.handsK = 1;

    var leaders = q("[data-leaders]");
    var labels = q("[data-labels]");
    this.callouts = CALLOUTS.map(function (c, k) {
      var ex = c.a[0] + (c.side === "left" ? -34 : 34);
      var end = c.side === "left" ? 128 : 592;
      var path = el("path", { d: "M" + c.a[0] + " " + c.a[1] + "L" + ex + " " + c.y + "H" + end, pathLength: 1 }, leaders);
      path.style.strokeDasharray = "1";
      var dot = el("circle", { cx: c.a[0], cy: c.a[1], r: 3 }, leaders);
      var label = document.createElement("p");
      label.className = "ui-acier__label ui-acier__label--" + c.side;
      label.style.top = n(c.y / 9) + "%";
      labels.appendChild(label);
      return { path: path, dot: dot, label: label, text: c.text, time: !!c.time, at: 3.95 + k * 0.12, shown: "" };
    });

    this.brand = q("[data-brand]");
    this.types = qa("[data-type]").map(function (node) {
      return { node: node, text: node.getAttribute("data-type"), shown: -1 };
    });

    // Sign-off
    this.plate = q("[data-plate]");
    this.endWord = buildWord(q("[data-end-word]"), id + "-e");
    this.endCopy = this.types[1].node;

    this.markers = qa("[data-markers] i");
    this.progress = q("[data-progress]");
    this.phase = "";
    this.now = new Date();
    this.measure();
  }

  Stage.prototype.measure = function () {
    this.unit = (this.frame.getBoundingClientRect().width || 720) / 720;
  };

  Stage.prototype.setPhase = function (phase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.root.setAttribute("data-phase", phase);
  };

  Stage.prototype.setType = function (item, p) {
    var count = Math.round(item.text.length * clamp01(p));
    if (count === item.shown) return;
    item.shown = count;
    item.node.textContent = item.text.slice(0, count);
  };

  Stage.prototype.reveal = function (node, p) {
    node.style.clipPath = p >= 1 ? "" : "inset(-20% " + n((1 - p) * 100) + "% -20% 0)";
    node.style.visibility = p <= 0 ? "hidden" : "";
  };

  // Bands slide in from alternating sides, letter by letter, and lock with a small overshoot
  Stage.prototype.assemble = function (word, t, start, letterGap, rowGap, dur) {
    for (var i = 0; i < word.bands.length; i++) {
      var b = word.bands[i];
      var p = seg(t, start + b.letter * letterGap + b.row * rowGap, start + b.letter * letterGap + b.row * rowGap + dur);
      var dx = (b.row % 2 ? 1 : -1) * 560 * (1 - outBack(p, 1.1));
      b.node.setAttribute("transform", p >= 1 ? "" : "translate(" + n(dx) + " 0)");
      b.node.style.opacity = p > 0 ? 1 : 0;
    }
  };

  Stage.prototype.timeText = function () {
    var d = this.now;
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  };

  // Hands: local time, quartz steps with a tiny overshoot on each second
  Stage.prototype.setHands = function (date, ms, showSeconds) {
    this.now = date;
    var s = date.getSeconds(), m = date.getMinutes(), h = date.getHours() % 12;
    var step = showSeconds ? s - 1 + outBack(clamp01(ms / 90), 2.2) : s;
    var k = this.handsK;
    this.hands.hour.setAttribute("transform", "rotate(" + n(30 * (h + m / 60 + s / 3600) * k) + ")");
    this.hands.minute.setAttribute("transform", "rotate(" + n(6 * (m + s / 60) * k) + ")");
    this.hands.second.setAttribute("transform", "rotate(" + n(6 * step * k) + ")");
    this.hands.second.style.display = showSeconds ? "" : "none";
    var c = this.callouts[3];
    if (c.typed) this.setLabel(c, c.text + this.timeText());
  };

  Stage.prototype.setLabel = function (c, text) {
    if (text === c.shown) return;
    c.shown = text;
    c.label.textContent = text;
  };

  Stage.prototype.render = function (t) {
    var i, p;
    this.progress.style.transform = "scaleX(" + n(clamp01(t / T_TOTAL) * 1000) / 1000 + ")";

    // ================= 1. Quartz =================
    if (t < T_POSTER) {
      this.setPhase("quartz");

      // The crystal pops in and buzzes harder as the count climbs
      var forkIn = outBack(seg(t, 0.05, 0.32));
      var count = seg(t, 0.25, 1.3);
      var fade = 1 - seg(t, 1.5, 1.7);
      var buzzing = count > 0 && count < 1;
      var jitter = buzzing ? (Math.floor(t * 60) % 2 ? 1 : -1) * (0.03 + 0.1 * count) : 0;
      this.fork.setAttribute("transform", "translate(360 450) scale(" + n(Math.max(0, forkIn)) + ")");
      this.fork.style.opacity = fade;
      this.tines.setAttribute("transform", "scale(" + n(1 + jitter) + " 1)");
      this.buzz.style.opacity = buzzing ? n(0.25 + 0.6 * count * (Math.floor(t * 30) % 2)) : 0;

      var hz = Math.floor(32768 * count * count);
      this.hz.textContent = t < 1.32 ? pad(Math.floor(hz / 1000)) + " " + ("00" + (hz % 1000)).slice(-3) + " Hz" : "= 1 SECOND";
      this.hz.style.opacity = t < 0.22 ? 0 : fade;

      // Ticks count in around the crystal, faster and faster
      for (i = 0; i < 60; i++) {
        var tk = this.ticks[i];
        p = outCubic(seg(t, tk.at, tk.at + 0.08));
        tk.node.setAttribute("y2", n(-RING_R + tk.len * p));
        tk.node.style.opacity = p > 0 ? 1 : 0;
      }

      // One second: the hand ticks, then sweeps a full minute in 60 quartz steps
      var steps = Math.floor(60 * inOutSine(seg(t, 1.45, 2.0)));
      var angle = t < 1.45 ? (t >= 1.36 ? 0 : -6) : steps * 6;
      this.shand.setAttribute("transform", "rotate(" + angle + ")");
      this.shand.style.opacity = t < 1.34 ? 0 : 1 - seg(t, 1.98, 2.12);
      var sr = RING_R - 22, a = angle * Math.PI / 180;
      this.sweep.setAttribute("d", angle <= 0 ? "" : angle >= 360
        ? "M0 " + -sr + "A" + sr + " " + sr + " 0 1 1 0 " + sr + "A" + sr + " " + sr + " 0 1 1 0 " + -sr + "Z"
        : "M0 0L0 " + -sr + "A" + sr + " " + sr + " 0 " + (angle > 180 ? 1 : 0) + " 1 " + n(sr * Math.sin(a)) + " " + n(-sr * Math.cos(a)) + "Z");
      this.sweep.style.opacity = n(0.06 * (1 - seg(t, 1.98, 2.2)));

      // The ring shrinks onto the exact size and place of the watch dial
      var k = inOutCubic(seg(t, 1.95, 2.45));
      var scale = lerp(1, DIAL.r / RING_R, k);
      this.ring.setAttribute("transform", "translate(" + RING_C.x + " " + n(lerp(RING_C.y, DIAL.y, k)) + ") scale(" + n(scale * 1000) / 1000 + ")");
      return;
    }

    // ================= 2. Poster =================
    if (t < T_END) {
      this.setPhase("poster");

      // Camera: settles after the cut, then dives into the black dial
      var settle = outCubic(seg(t, T_POSTER, T_POSTER + 0.3));
      var dive = inQuart(seg(t, 5.35, T_END));
      var cam = lerp(1.04, 1, settle) * (1 + 11 * dive);
      this.camera.style.transform = cam === 1 ? "" : "scale(" + n(cam * 1000) / 1000 + ")";
      this.watchImg.style.filter = dive > 0.35 ? "blur(" + n(5 * seg(dive, 0.35, 1) * this.unit) + "px)" : "";
      this.hands.root.style.opacity = n(1 - seg(dive, 0.15, 0.5));

      // The bracelet extends out of the case
      this.watch.style.setProperty("--ui-acier-fade", n(lerp(50, 9, outCubic(seg(t, T_POSTER, 2.95)))) + "%");
      this.handsK = outCubic(seg(t, 2.55, 3.2));

      for (i = 0; i < this.markers.length; i++) {
        p = seg(t, T_POSTER + i * 0.018, T_POSTER + 0.2 + i * 0.018);
        this.markers[i].style.transform = p >= 1 ? "none" : "scale(" + n(Math.max(0, outBack(p, 1.9))) + ")";
      }

      var top = 1 - seg(t, 5.3, 5.45);
      this.reveal(this.brand, outExpo(seg(t, 2.6, 2.9)));
      this.brand.style.opacity = top;
      this.types[0].node.style.opacity = top;
      this.setType(this.types[0], seg(t, 2.65, 3.2));

      // ACIER, link by link
      this.assemble(this.word, t, 2.75, 0.06, 0.035, 0.38);

      // A light passes over the steel
      var sweepP = inOutCubic(seg(t, 3.55, 4.3));
      this.word.grad.setAttribute("gradientTransform", "translate(" + n(lerp(-420, 420, sweepP)) + " 0)");
      this.sheen.style.opacity = sweepP > 0 && sweepP < 1 ? 1 : 0;
      this.sheen.style.setProperty("--x", n(lerp(-75, 75, sweepP)) + "%");

      // Callouts draw in, then clear before the dive
      var out = 1 - seg(t, 5.2, 5.35);
      for (i = 0; i < this.callouts.length; i++) {
        var c = this.callouts[i];
        var draw = outCubic(seg(t, c.at, c.at + 0.32));
        c.path.style.strokeDashoffset = 1 - draw;
        c.path.style.opacity = out;
        c.dot.setAttribute("r", n(3 * outBack(seg(t, c.at - 0.04, c.at + 0.12), 2)));
        c.dot.style.opacity = out;
        var full = c.text + (c.time ? this.timeText() : "");
        var typeP = seg(t, c.at + 0.18, c.at + 0.48);
        c.typed = typeP >= 1;
        this.setLabel(c, full.slice(0, Math.round(full.length * typeP)));
        c.label.style.opacity = out;
      }
      return;
    }

    // ================= 3. Sign-off =================
    this.setPhase("end");
    this.reveal(this.plate, outExpo(seg(t, T_END, T_END + 0.32)));
    this.assemble(this.endWord, t, T_END + 0.06, 0.05, 0.03, 0.34);
    this.setType(this.types[1], seg(t, T_END + 0.15, T_END + 0.9));
    for (i = 0; i < this.markers.length; i++) this.markers[i].style.transform = "none";
  };

  // ---------- Player ----------
  function Player(stage, opts) {
    var self = this;
    this.stage = stage;
    this.t = 0;
    this.playing = false;
    this.userPaused = false;
    this.last = 0;
    this.toggleBtn = opts.toggle;
    this.replayBtn = opts.replay;
    this.tick = function (now) { self.frame(now); };
    if (this.toggleBtn) this.toggleBtn.addEventListener("click", function () {
      if (self.playing) { self.userPaused = true; self.pause(); } else self.play();
    });
    if (this.replayBtn) this.replayBtn.addEventListener("click", function () { self.t = 0; self.play(); });
  }

  Player.prototype.play = function () {
    if (this.t >= T_TOTAL || this.still) { this.t = 0; this.still = false; }
    this.playing = true;
    this.userPaused = false;
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
  var player = null;
  function calm() { return !!(reduceMotion && reduceMotion.matches); }

  // Product section: a still of the poster, built from a copy of the hero stage
  var hero = document.querySelector("[data-ui-acier]");
  var posterHost = document.querySelector("[data-ui-acier-poster]");
  if (hero && posterHost) {
    var wrap = document.createElement("div");
    wrap.className = "ui-acier ui-acier--poster";
    wrap.setAttribute("aria-hidden", "true");
    wrap.appendChild(hero.querySelector("[data-ui-acier-stage]").cloneNode(true));
    var fallback = posterHost.querySelector(".ui-acier-product__fallback");
    if (fallback) fallback.remove();
    posterHost.insertBefore(wrap, posterHost.firstChild);
    var still = new Stage(wrap);
    stages.push(still);
    still.render(T_STILL);
  }

  if (hero) {
    player = new Player(new Stage(hero), {
      toggle: hero.querySelector("[data-ui-acier-toggle]"),
      replay: hero.querySelector("[data-ui-acier-replay]")
    });
    stages.push(player.stage);

    if (!isNaN(frozen)) {
      player.seek(Math.max(0, Math.min(T_TOTAL, frozen)), true);
      hero.setAttribute("data-paused", "");
      player.label();
    } else if (calm()) {
      // No autoplay: show the settled poster; Play still runs the full reveal on request
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
      stages.forEach(function (s) { s.render(s === player.stage ? player.t : T_STILL); });
    });

    initDrain(hero, player);
  }

  // The real clock: every stage's hands, plus the time readout in the product copy
  var nowEl = document.querySelector("[data-ui-acier-now]");
  var lastSecond = -1;
  function clock() {
    var d = new Date(), ms = d.getMilliseconds(), seconds = !calm();
    stages.forEach(function (s) {
      if (player && s === player.stage && player.userPaused) return;   // Pause also stops the watch
      s.setHands(d, ms, seconds);
    });
    if (nowEl && d.getSeconds() !== lastSecond) {
      lastSecond = d.getSeconds();
      var text = pad(d.getHours()) + ":" + pad(d.getMinutes()) + (seconds ? ":" + pad(d.getSeconds()) : "");
      nowEl.textContent = text;
      nowEl.setAttribute("datetime", text);
    }
    if (seconds) requestAnimationFrame(clock);
    else setTimeout(clock, 1000);
  }
  clock();

  // ---------- "Discover" exit: down the drain, then scroll ----------
  // The three sign-off pieces are dragged along curves into the button,
  // speeding up, shrinking and blurring as they bunch together. The moment
  // they hit it the button gives a press and the page snaps on to the product.
  // Scrolling down from the finished sign-off card does the same.
  function initDrain(hero, player) {
    var cue = hero.querySelector(".ui-acier__cue");
    var target = document.querySelector(cue && cue.getAttribute("href"));
    var controls = hero.querySelector(".ui-acier__controls");
    if (!cue || !target) return;

    var stage = player.stage;
    var pieces = [stage.plate, stage.endCopy, stage.endWord.grad.ownerSVGElement];
    var busy = false;
    var TRAVEL = 900, SCROLL = 460;

    function bezier(p0, p1, p2, p3, u) {
      var v = 1 - u;
      return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
    }

    function finish() {
      target.focus({ preventScroll: true });
      pieces.forEach(function (node) {
        node.style.translate = node.style.scale = node.style.filter = node.style.opacity = node.style.transformOrigin = "";
      });
      cue.style.scale = cue.style.pointerEvents = "";
      if (controls) controls.inert = false;
      busy = false;
    }

    function scrollToTarget() {
      var from = window.scrollY;
      var to = from + target.getBoundingClientRect().top;
      var t0 = 0;
      function step(now) {
        if (!t0) t0 = now;
        var t = now - t0;
        var p = outQuart(seg(t, 0, SCROLL));
        window.scrollTo(0, lerp(from, to, p));
        cue.style.scale = n(lerp(0.9, 1, outCubic(seg(t, 0, 220))));
        if (p < 1) requestAnimationFrame(step); else finish();
      }
      requestAnimationFrame(step);
    }

    function jump() {
      target.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });
      target.focus({ preventScroll: true });
    }

    function atSignOff() {
      return !calm() && stage.phase === "end" && !player.playing && hero.hasAttribute("data-done") &&
        hero.getBoundingClientRect().top > -8 && window.scrollY < hero.offsetTop + 8;
    }

    function catchScroll(e) {
      if (busy) { e.preventDefault(); return true; }
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
      var el = e.target;
      if (!busy && el && el.closest && el.closest("button, a, input, select, textarea, [contenteditable]")) return;
      catchScroll(e);
    });

    cue.addEventListener("click", function (e) {
      e.preventDefault();
      if (busy) return;
      if (calm() || stage.phase !== "end" || player.playing) { jump(); return; }
      drain();
    });

    function drain() {
      busy = true;
      if (controls) controls.inert = true;
      cue.style.pointerEvents = "none";

      var cueBox = cue.getBoundingClientRect();
      var T = { x: cueBox.left + cueBox.width / 2, y: cueBox.top + cueBox.height * 0.45 };
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
          var u = Math.pow(x, 1.8);
          var px = bezier(p.A.x, p.c1.x, p.c2.x, T.x, u);
          var py = bezier(p.A.y, p.c1.y, p.c2.y, T.y, u);
          p.node.style.translate = n(px - p.A.x) + "px " + n(py - p.A.y) + "px";
          p.node.style.scale = n(lerp(1, 0.28, u));
          p.node.style.filter = "blur(" + n(6 * seg(u, 0.3, 1)) + "px)";
          p.node.style.opacity = n(1 - seg(u, 0.85, 1));
        });
        cue.style.scale = n(1 - 0.1 * seg(t, TRAVEL - 120, TRAVEL));
        if (t < TRAVEL) requestAnimationFrame(frame);
        else scrollToTarget();
      }
      requestAnimationFrame(frame);
    }
  }

  // Add to bag (demo): announced to screen readers
  var cta = document.querySelector("[data-ui-acier-add]");
  var status = document.querySelector("[data-ui-acier-status]");
  if (cta) {
    cta.addEventListener("click", function () {
      var on = !cta.hasAttribute("data-added");
      cta.toggleAttribute("data-added", on);
      cta.querySelector("[data-label]").textContent = on ? "Added" : "Add to bag";
      if (status) status.textContent = on ? "Acier added to your bag." : "Acier removed from your bag.";
      cta.dispatchEvent(new CustomEvent("ui-acier:add", { bubbles: true, detail: { added: on } }));
    });
  }
})();
