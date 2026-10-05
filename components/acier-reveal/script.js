/* ==========================================================================
   UI Acier Reveal: timeline
   One clock drives the sequence (pause, replay, ?t=4.2 to freeze a moment).
   A second, real clock drives the watch hands: they show the visitor's
   local time and step once a second, like a quartz movement.
   ========================================================================== */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  // Intro: FOSLN holds on the finished dial (the ring completes at ~1.84s),
  // squashes into a line at MORPH_AT and stretches out into the seconds hand
  // at 3 o'clock by HAND_AT. Everything after it is timed from HAND_AT.
  var MORPH_AT = 1.84;              // the moment the last tick lands
  var HAND_AT = MORPH_AT + 0.65;    // an unhurried, overlapping squash and stretch

  // Beats. Everything after the quartz beat is timed from T_POSTER.
  var T_POSTER = HAND_AT + 2.2;     // dissolve: ring + ink hands -> the watch
  var T_JOIN = T_POSTER + 0.45;     // the paper layer has gone
  var CALL_START = T_POSTER + 2.8;  // after a hold on the watch and ACIER, callouts start on the next tick
  var CALL_END = CALL_START + 6.5;  // up to 1s to the first tick, 4 more ticks, then a short hold
  var T_END = CALL_END + 0.8;       // dive into the dial -> sign-off
  var T_TOTAL = T_END + 2.0;
  var T_STILL = CALL_START + 5.2;   // the settled poster, all callouts in, for stills and reduced motion

  // Quartz ring (design units on the 720 x 900 frame)
  var RING_R = 250, RING_C = { x: 360, y: 450 };
  // Where the watch dial sits on the poster, and its radius
  var DIAL = { x: 360, y: 360, r: 118 };

  // The watch photo (532 x 878 px), its width on the frame, and its dial centre
  var HANDS_C = { x: 257, y: 422.5 };
  var WATCH_W = 720 * 0.4844;

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
  // In the order they appear, one per tick of the seconds hand
  var CALLOUTS = [
    { a: [441, 292], y: 146, side: "right", text: "LOCAL TIME\n", time: true },   // into the dial, by the hands
    { a: [532, 357], y: 318, side: "right", text: "QUARTZ\nMOVEMENT" },          // the crown
    { a: [408, 571], y: 560, side: "right", text: "LINK\nBRACELET" },           // the lower bracelet
    { a: [220, 368], y: 430, side: "left", text: "STEEL\nCASE" },
    { a: [296, 299], y: 236, side: "left", text: "ONYX\nDIAL" }
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

  // Hands drawn on the photo's own pixel grid. The same geometry comes in
  // steel (on the watch) and in ink (inside the quartz ring, scaled so it
  // lands exactly on the watch's hands when the ring lands on the dial).
  function buildHands(svg, id, ink, cx, cy) {
    var defs = el("defs", {}, svg);
    var hg = el("linearGradient", { id: id + "-hand", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    [[0, "#7E848A"], [0.42, "#F3F5F6"], [0.58, "#A7ADB3"], [1, "#666C72"]]
      .forEach(function (s) { el("stop", { offset: s[0], "stop-color": s[1] }, hg); });
    var f = el("filter", { id: id + "-shadow", x: "-50%", y: "-50%", width: "200%", height: "200%" }, defs);
    el("feDropShadow", { dx: 2.5, dy: 3.5, stdDeviation: 2, "flood-color": "#000", "flood-opacity": 0.7 }, f);

    var body = ink ? "#121314" : "url(#" + id + "-hand)";
    var edge = ink ? "none" : "#3B3F44";
    var lume = ink ? "#ECECE9" : "#EEF1EA";
    var attrs = { transform: "translate(" + cx + " " + cy + ")" };
    if (!ink) attrs.filter = "url(#" + id + "-shadow)";
    var root = el("g", attrs, svg);
    function sword(len) {
      var g = el("g", {}, root);
      el("path", { d: "M-4.8 -15L-3.4 " + -len + "Q0 " + -(len + 5) + " 3.4 " + -len + "L4.8 -15Z", fill: body, stroke: edge, "stroke-width": 0.7 }, g);
      el("path", { d: "M-1.45 -27H1.45V" + -(len - 6) + "H-1.45Z", fill: lume }, g);
      return g;
    }
    var hour = sword(96), minute = sword(138);
    var second = el("g", {}, root);
    el("line", { x1: 0, y1: 40, x2: 0, y2: -154, stroke: ink ? "#121314" : "#C3C7CB", "stroke-width": 1.7, "stroke-linecap": "round" }, second);
    var hub = el("g", {}, root);
    el("circle", { r: 8, fill: body, stroke: edge, "stroke-width": 0.7 }, hub);
    el("circle", { r: 3, fill: ink ? "#ECECE9" : "#1A1B1D" }, hub);
    return { root: root, hour: hour, minute: minute, second: second, hub: hub };
  }

  // Letters cycle until each one locks into the brand, left to right
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  function decode(word, t, start, end) {
    var out = "", frame = Math.floor(t * 30);
    for (var j = 0; j < word.length; j++) {
      var lock = start + (end - start) * (j + 1) / word.length;
      out += t >= lock ? word[j] : GLYPHS[(frame * 7 + j * 13 + frame * j * 3) % GLYPHS.length];
    }
    return out;
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
      this.ticks.push({ node: line, len: len, at: 1.14 + 0.62 * Math.pow(i / 60, 0.6) });   // 0.4s after FOSLN has locked
    }
    // The intro's hands are the watch's hands, in ink, drawn in ring units:
    // photo px x (frame px per photo px) / (ring scale on the dial)
    var inkScale = (WATCH_W / 532) / (DIAL.r / RING_R);
    this.inkHands = buildHands(el("g", { transform: "scale(" + inkScale + ")" }, ring), id + "-i", true, 0, 0);
    // The line FOSLN squashes into, which stretches out into the seconds hand
    this.inkScale = inkScale;
    this.morph = el("line", { x1: 0, y1: 0, x2: 0, y2: 0, stroke: "#121314", "stroke-linecap": "round" }, ring);
    this.qt = 0;
    this.hz = q("[data-hz]");

    // Poster
    this.camera = q("[data-camera]");
    this.watch = q("[data-watch]");
    this.watchImg = q(".ui-acier__watch-img");
    this.sheen = q("[data-sheen]");
    this.word = buildWord(q("[data-word]"), id + "-w");
    this.hands = buildHands(q("[data-hands]"), id + "-h", false, HANDS_C.x, HANDS_C.y);
    this.intro = q("[data-intro]");

    var leaders = q("[data-leaders]");
    var labels = q("[data-labels]");
    this.callouts = CALLOUTS.map(function (c, k) {
      var ex = c.a[0] + (c.side === "left" ? -34 : 34);
      var end = c.side === "left" ? 128 : 592;
      var path = el("path", { d: "M" + c.a[0] + " " + c.a[1] + "L" + ex + " " + c.y + "H" + end, pathLength: 1 }, leaders);
      path.style.strokeDasharray = "1 2";   // a gap longer than the path, so nothing shows before it draws
      var dot = el("circle", { cx: c.a[0], cy: c.a[1], r: 3 }, leaders);
      var label = document.createElement("p");
      label.className = "ui-acier__label ui-acier__label--" + c.side;
      label.style.top = n(c.y / 9) + "%";
      labels.appendChild(label);
      return { path: path, dot: dot, label: label, text: c.text, time: !!c.time, typeP: 0, shown: "" };
    });
    this.timeCallout = this.callouts.filter(function (c) { return c.time; })[0];
    this.firstTick = null;
    this.liveTicks = false;

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
    this.measure();
    this.setHands(new Date(), 999, true);   // start on the real time, before the clock loop takes over
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
    this.live = { h: 30 * (h + m / 60 + s / 3600), m: 6 * (m + s / 60), s: 6 * step, sWhole: 6 * s, show: showSeconds };
    this.hands.hour.setAttribute("transform", "rotate(" + n(this.live.h) + ")");
    this.hands.minute.setAttribute("transform", "rotate(" + n(this.live.m) + ")");
    this.hands.second.setAttribute("transform", "rotate(" + n(this.live.s) + ")");
    this.hands.second.style.display = showSeconds ? "" : "none";
    if (this.qt < T_JOIN) this.updateInk();
    var c = this.timeCallout;
    if (c && c.typeP > 0) this.setLabel(c, this.typed(c));
  };

  // The callout's text as typed so far (the time one includes the live time)
  Stage.prototype.typed = function (c) {
    var full = c.text + (c.time ? this.timeText() : "");
    return full.slice(0, Math.round(full.length * c.typeP));
  };

  // Timeline time of the first callout: the first tick of the real seconds
  // hand at or after CALL_START, so every callout lands on a tick.
  // Stills and frozen frames use CALL_START itself.
  Stage.prototype.callFirst = function (t) {
    if (!this.liveTicks) return CALL_START;
    if (t < CALL_START - 1) { this.firstTick = null; return CALL_START; }
    if (this.firstTick === null) {
      var anchor = t - new Date().getMilliseconds() / 1000;   // when the current second began
      this.firstTick = anchor + Math.ceil(CALL_START - anchor - 1e-6);
    }
    return this.firstTick;
  };

  Stage.prototype.setLabel = function (c, text) {
    if (text === c.shown) return;
    c.shown = text;
    c.label.textContent = text;
  };

  // The intro's hands, as one continuous move into the watch's time:
  // the seconds hand ticks in and sweeps a full turn on into its live second,
  // the minute hand joins and turns on into its minute, then the hour hand
  // joins and turns to its hour. All three land just as the ring lands.
  Stage.prototype.updateInk = function () {
    var t = this.qt, L = this.live, ink = this.inkHands;

    // Seconds: formed from FOSLN at 3 o'clock (see renderQuartz), then quartz
    // steps through a full turn and on into the live second
    var sp = inOutSine(seg(t, HAND_AT + 0.05, HAND_AT + 1.95));
    var turn = 360 + (((L.sWhole - 90) % 360) + 360) % 360;
    var sec = sp >= 1 ? L.s : 90 + 6 * Math.floor(turn * sp / 6);
    ink.second.setAttribute("transform", "rotate(" + n(sec) + ")");
    ink.second.style.display = t >= HAND_AT && (L.show || sp < 1) ? "" : "none";
    var hubIn = outBack(seg(t, HAND_AT - 0.28, HAND_AT), 1.4);
    ink.hub.setAttribute("transform", "scale(" + n(Math.max(0, hubIn)) + ")");

    // Minute: grows out of the hub and turns a full revolution into place
    var mIn = outCubic(seg(t, HAND_AT + 0.8, HAND_AT + 1.1));
    var min = lerp(0, 360 + L.m, inOutCubic(seg(t, HAND_AT + 0.8, HAND_AT + 2.0)));
    ink.minute.setAttribute("transform", "rotate(" + n(min) + ") scale(" + n(lerp(0.4, 1, mIn)) + ")");
    ink.minute.style.opacity = n(mIn);

    // Hour: last in, straight to its hour
    var hIn = outCubic(seg(t, HAND_AT + 1.3, HAND_AT + 1.55));
    var hr = lerp(0, L.h, outCubic(seg(t, HAND_AT + 1.3, HAND_AT + 2.05)));
    ink.hour.setAttribute("transform", "rotate(" + n(hr) + ") scale(" + n(lerp(0.4, 1, hIn)) + ")");
    ink.hour.style.opacity = n(hIn);
  };

  // The quartz beat, on its paper layer
  Stage.prototype.renderQuartz = function (t) {
    var i, p;

    // The brand decodes at the centre, one letter locking at a time, and
    // holds on the finished dial. Then the letters squash into a line...
    this.hz.textContent = decode("FOSLN", t, 0.06, 0.7);   // locked just before the first tick
    // The phases overlap so there is no visible hand-off: the line fades in
    // while the letters are still squashing, and starts stretching before
    // they have finished.
    var squash = inOutCubic(seg(t, MORPH_AT, MORPH_AT + 0.32));
    var swap = inOutSine(seg(t, MORPH_AT + 0.18, MORPH_AT + 0.34));
    this.hz.setAttribute("transform", squash > 0 ? "translate(0 450) scale(1 " + n(lerp(1, 0.08, squash) * 1000) / 1000 + ") translate(0 -450)" : "");
    this.hz.style.opacity = t < 0.04 ? 0 : n(1 - swap);

    // ...which stretches out to the right into the seconds hand at 3 o'clock:
    // from the width of the word to the hand's exact tail and tip
    var box = { x: -46, w: 92 };
    if (t >= MORPH_AT && t < HAND_AT + 0.05) {
      var b = this.hz.getBBox();
      if (b.width > 0) box = { x: b.x - RING_C.x, w: b.width };
    }
    var stretch = seg(t, MORPH_AT + 0.2, HAND_AT);
    var k1 = this.inkScale;
    this.morph.setAttribute("x1", n(lerp(box.x, -40 * k1, inOutCubic(seg(stretch, 0.12, 1)))));   // the tail follows a beat behind
    this.morph.setAttribute("x2", n(lerp(box.x + box.w, 154 * k1, inOutCubic(stretch))));
    this.morph.setAttribute("stroke-width", n(lerp(1.4, 1.7 * k1, inOutSine(stretch))));
    this.morph.style.opacity = t < HAND_AT ? n(swap) : 0;

    // Ticks count in around it, faster and faster
    for (i = 0; i < 60; i++) {
      var tk = this.ticks[i];
      p = outCubic(seg(t, tk.at, tk.at + 0.08));
      tk.node.setAttribute("y2", n(-RING_R + tk.len * p));
      tk.node.style.opacity = p > 0 ? 1 : 0;
    }

    // The hands (see updateInk)
    this.qt = t;
    this.updateInk();

    // The ring, hands and all, shrinks onto the exact size and place of the watch dial
    var k = inOutCubic(seg(t, HAND_AT + 1.4, HAND_AT + 2.05));
    var scale = lerp(1, DIAL.r / RING_R, k);
    this.ring.setAttribute("transform", "translate(" + RING_C.x + " " + n(lerp(RING_C.y, DIAL.y, k)) + ") scale(" + n(scale * 1000) / 1000 + ")");
  };

  Stage.prototype.render = function (t) {
    var i, p;
    this.progress.style.transform = "scaleX(" + n(clamp01(t / T_TOTAL) * 1000) / 1000 + ")";

    // ================= 1. Quartz =================
    // The paper layer stays on top until it has dissolved into the watch
    var paper = t < T_JOIN ? (t < T_POSTER ? 1 : 1 - inOutCubic(seg(t, T_POSTER, T_JOIN))) : 0;
    this.intro.style.display = paper > 0 ? "" : "none";
    this.intro.style.opacity = n(paper);
    if (paper > 0) this.renderQuartz(t);
    else this.qt = t;
    if (t < T_POSTER) {
      this.setPhase("quartz");
      return;
    }

    // ================= 2. Poster =================
    if (t < T_END) {
      this.setPhase("poster");

      // Camera: holds still under the dissolve, then dives into the black dial
      var dive = inQuart(seg(t, CALL_END + 0.15, T_END));
      var cam = 1 + 11 * dive;
      this.camera.style.transform = cam === 1 ? "" : "scale(" + n(cam * 1000) / 1000 + ")";
      this.watchImg.style.filter = dive > 0.35 ? "blur(" + n(5 * seg(dive, 0.35, 1) * this.unit) + "px)" : "";
      this.hands.root.style.opacity = n(1 - seg(dive, 0.15, 0.5));

      // The bracelet extends out of the case
      this.watch.style.setProperty("--ui-acier-fade", n(lerp(50, 9, outCubic(seg(t, T_POSTER, T_POSTER + 0.5)))) + "%");

      for (i = 0; i < this.markers.length; i++) {
        p = seg(t, T_POSTER + i * 0.018, T_POSTER + 0.2 + i * 0.018);
        this.markers[i].style.transform = p >= 1 ? "none" : "scale(" + n(Math.max(0, outBack(p, 1.9))) + ")";
      }

      var top = 1 - seg(t, CALL_END + 0.1, CALL_END + 0.25);
      this.reveal(this.brand, outExpo(seg(t, T_POSTER + 0.15, T_POSTER + 0.45)));
      this.brand.style.opacity = top;
      this.types[0].node.style.opacity = top;
      this.setType(this.types[0], seg(t, T_POSTER + 0.2, T_POSTER + 0.75));

      // ACIER, link by link
      this.assemble(this.word, t, T_POSTER + 0.3, 0.06, 0.035, 0.38);

      // A light passes over the steel
      var sweepP = inOutCubic(seg(t, T_POSTER + 1.0, T_POSTER + 1.75));
      this.word.grad.setAttribute("gradientTransform", "translate(" + n(lerp(-420, 420, sweepP)) + " 0)");
      this.sheen.style.opacity = sweepP > 0 && sweepP < 1 ? 1 : 0;
      this.sheen.style.setProperty("--x", n(lerp(-75, 75, sweepP)) + "%");

      // Callouts: one on each tick of the seconds hand, then they clear before the dive
      var first = this.callFirst(t);
      var out = 1 - seg(t, CALL_END, CALL_END + 0.15);
      for (i = 0; i < this.callouts.length; i++) {
        var c = this.callouts[i];
        var at = first + i;
        c.path.style.strokeDashoffset = 1 - outCubic(seg(t, at, at + 0.3));
        c.path.style.opacity = out;
        c.dot.setAttribute("r", n(3 * Math.max(0, outBack(seg(t, at, at + 0.14), 2))));
        c.dot.style.opacity = out;
        c.typeP = seg(t, at + 0.12, at + 0.42);
        this.setLabel(c, this.typed(c));
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
    this.stage.liveTicks = true;
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
    if (still) this.stage.liveTicks = false;
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

  // The real clock: every stage's hands
  function clock() {
    var d = new Date(), ms = d.getMilliseconds(), seconds = !calm();
    stages.forEach(function (s) {
      if (player && s === player.stage && player.userPaused) return;   // Pause also stops the watch
      s.setHands(d, ms, seconds);
    });
    if (seconds) requestAnimationFrame(clock);
    else setTimeout(clock, 1000);
  }
  clock();

  // ---------- Crown exit: down the drain, then scroll ----------
  // The three sign-off pieces are dragged along curves into the crown,
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
    var beams = hero.querySelector("[data-beams]");
    var crown = hero.querySelector("[data-crown]") || cue;
    var TRAVEL = 900, SCROLL = 460;

    function bezier(p0, p1, p2, p3, u) {
      var v = 1 - u;
      return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
    }

    // Beams: one curve per piece, the same curve its drain will follow,
    // from just under the piece to the top of the button
    function curve(A, T) {
      var dx = T.x - A.x, dy = T.y - A.y;
      return { c1: { x: A.x + dx * 0.32, y: A.y + dy * 0.12 }, c2: { x: T.x, y: A.y + dy * 0.58 } };
    }

    function layoutBeams() {
      if (!beams || busy) return;
      var H = hero.getBoundingClientRect();
      var c = crown.getBoundingClientRect();
      var m = new DOMMatrixReadOnly(getComputedStyle(cue).transform);   // ignore the cue's slide-in offset
      var T = { x: c.left + c.width / 2 - H.left, y: c.top - m.m42 - H.top - 1 };   // the top of the crown
      var html = "";
      pieces.forEach(function (node, i) {
        var b = node.getBoundingClientRect();
        var A = { x: b.left + b.width / 2 - H.left, y: b.bottom - H.top + 12 };
        var k = curve(A, T);
        var d = "M" + n(A.x) + " " + n(A.y) + "C" + n(k.c1.x) + " " + n(k.c1.y) + " " + n(k.c2.x) + " " + n(k.c2.y) + " " + n(T.x) + " " + n(T.y);
        var delay = "--d:" + (i === 1 ? 0 : 0.12) + "s";
        html += '<path class="ui-acier__beam-track" d="' + d + '"/>' +
          '<path class="ui-acier__beam-tail" pathLength="1" style="' + delay + '" d="' + d + '"/>' +
          '<path class="ui-acier__beam-head" pathLength="1" style="' + delay + '" d="' + d + '"/>';
      });
      beams.innerHTML = html;
    }

    // Lay the beams out whenever the sign-off is reached, and on resize
    new MutationObserver(function () {
      if (hero.hasAttribute("data-done")) requestAnimationFrame(layoutBeams);
    }).observe(hero, { attributes: true, attributeFilter: ["data-done"] });
    window.addEventListener("resize", function () { if (hero.hasAttribute("data-done")) layoutBeams(); });

    function finish() {
      target.focus({ preventScroll: true });
      pieces.forEach(function (node) {
        node.style.translate = node.style.scale = node.style.filter = node.style.opacity = node.style.transformOrigin = "";
      });
      crown.style.scale = cue.style.pointerEvents = "";
      if (controls) controls.inert = false;
      busy = false;
      hero.removeAttribute("data-draining");
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
        crown.style.scale = n(lerp(0.86, 1, outCubic(seg(t, 0, 220))));
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
      hero.setAttribute("data-draining", "");
      if (controls) controls.inert = true;
      cue.style.pointerEvents = "none";

      var cueBox = crown.getBoundingClientRect();
      var T = { x: cueBox.left + cueBox.width / 2, y: cueBox.top + cueBox.height * 0.5 };   // into the crown
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
        crown.style.scale = n(1 - 0.14 * seg(t, TRAVEL - 120, TRAVEL));   // pressed in as they arrive
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
