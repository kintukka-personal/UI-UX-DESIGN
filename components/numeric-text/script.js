/* UI Numeric Text — a content transition for numbers, after SwiftUI's
   .contentTransition(.numericText(countsDown:)).

   Mark any element with data-ui-numtext and data-value="1240". When the value
   changes, only the digits that changed move: the old digit rolls out and the
   new one rolls in (up when the number goes up, down when it goes down), with
   a touch of blur. Unchanged digits stay still. Digits that appear or vanish
   (9 → 10, 999 → 1,000) open or close their space so the text around them
   slides rather than jumps. Every change settles in about 200ms.

   Options (attributes):
     data-format='{"style":"currency","currency":"AUD"}'  Intl.NumberFormat options
     data-locale="en-AU"                                  defaults to the page language
     data-counts-down="true|false"                        force the direction (default: follows the value)
     data-mode="count"                                     tween through the values instead of rolling
     data-live="polite"                                    announce changes to screen readers

   Changing the value: set el.dataset.value, or call uiNumText.set(el, 42).
   Elements added later: uiNumText.init(el).
   Event (bubbles): "ui-numtext:change" with detail = { from, to, direction }.
   Timing lives in CSS: --ui-numtext-duration, --ui-numtext-exit, --ui-numtext-shift,
   --ui-numtext-blur, --ui-numtext-ease-in, --ui-numtext-ease-out. */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var states = new WeakMap();

  /* ---- Formatting: split a number into keyed characters ---------------- */

  // Each character gets a key by place value, so 99 → 100 lines up the ones,
  // tens and hundreds rather than the first, second and third characters.
  function keyed(fmt, value) {
    var parts = fmt.formatToParts(value);
    var place = 0, frac = 0, side = "pre", seen = {}, out = [];
    // Array.from splits by code point, so digits outside the BMP
    // (e.g. numberingSystem "mathsans") stay whole.
    parts.forEach(function (p) { if (p.type === "integer") place += Array.from(p.value).length; });
    parts.forEach(function (p) {
      var k;
      if (p.type === "integer") {
        Array.from(p.value).forEach(function (ch) { out.push({ key: "i" + --place, ch: ch }); });
        side = "post";
      } else if (p.type === "fraction") {
        Array.from(p.value).forEach(function (ch) { out.push({ key: "f" + frac++, ch: ch }); });
      } else if (p.type === "group") {
        out.push({ key: "g" + place, ch: p.value });
      } else {
        k = p.type + side;
        seen[k] = (seen[k] || 0) + 1;
        out.push({ key: k + seen[k], ch: p.value });
      }
    });
    return out;
  }

  function formatter(el) {
    var opts = {};
    try { opts = JSON.parse(el.dataset.format || "{}"); } catch (err) {}
    var locale = el.dataset.locale || document.documentElement.lang || undefined;
    try { return new Intl.NumberFormat(locale, opts); }
    catch (err) { return new Intl.NumberFormat(undefined, opts); }
  }

  /* ---- Motion tokens, read from CSS so themes can tune them ------------ */

  function ms(v, fallback) {
    var n = parseFloat(v);
    if (isNaN(n)) return fallback;
    return /[^m]s$/.test(v) ? n * 1000 : n;
  }

  // ponytail: one getComputedStyle per change; cache on the state if a page
  // drives hundreds of these at 60fps.
  function tokens(el) {
    var cs = getComputedStyle(el);
    var get = function (name, fallback) { return cs.getPropertyValue(name).trim() || fallback; };
    return {
      enter: ms(get("--ui-numtext-duration"), 200),
      exit: ms(get("--ui-numtext-exit"), 150),
      shift: get("--ui-numtext-shift", "0.8em"),
      blur: get("--ui-numtext-blur", "2px"),
      easeIn: get("--ui-numtext-ease-in", "cubic-bezier(0.22, 1, 0.36, 1)"),
      easeOut: get("--ui-numtext-ease-out", "cubic-bezier(0.4, 0, 1, 1)"),
      reduced: reduceMotion.matches
    };
  }

  /* ---- DOM ------------------------------------------------------------- */

  function glyph(ch) {
    var g = document.createElement("span");
    g.className = "ui-numtext__g";
    g.textContent = ch;
    return g;
  }

  function stop(node) {
    node.getAnimations().forEach(function (a) { a.cancel(); });
  }

  function isDigit(s) {
    return s._key[0] === "i" || s._key[0] === "f";
  }

  // Where a glyph is right now, mid-animation or not, so a new change can
  // carry on from there instead of snapping.
  function snapshot(g) {
    var cs = getComputedStyle(g);
    return { transform: cs.transform, opacity: cs.opacity, filter: cs.filter };
  }

  function rollIn(g, t, from) {
    if (t.reduced) { g.animate({ opacity: [0, 1] }, { duration: 120, easing: "linear" }); return; }
    var first = { opacity: 0, filter: "blur(" + t.blur + ")" };
    if (from) first.transform = "translateY(" + from + ")";
    g.animate([first, { transform: "none", opacity: 1, filter: "blur(0)" }], { duration: t.enter, easing: t.easeIn });
  }

  // The outgoing glyph lifts out of the flow, leaves, and removes itself.
  function rollOut(g, t, to, start) {
    stop(g);
    g.classList.add("is-out");
    var end = { opacity: 0 };
    if (!t.reduced) {
      end.filter = "blur(" + t.blur + ")";
      if (to) end.transform = "translateY(" + to + ")";
    }
    // Fade out within the first half so old and new never read as a smudge
    var a = g.animate([start, { opacity: 0, offset: 0.5 }, end], { duration: t.reduced ? 120 : t.exit, easing: t.easeOut, fill: "forwards" });
    a.addEventListener("finish", function () { g.remove(); });
    return a;
  }

  /* ---- Rendering a change ---------------------------------------------- */

  // A slot that has finished leaving. Until then it stays in st.slots, so
  // the same place coming back mid-exit revives it instead of doubling up.
  function retire(st, s) {
    s.remove();
    if (st.slots.get(s._key) === s) st.slots.delete(s._key);
  }

  function render(st, value, animate) {
    var parts = keyed(st.fmt, value);
    var text = parts.map(function (p) { return p.ch; }).join("");
    var from = st.value;
    st.value = value;
    if (text === st.text) return;
    st.text = text;

    var cd = st.el.dataset.countsDown;
    var up = cd ? cd !== "true" : !(value < from);
    var t = animate && from !== undefined && !document.hidden ? tokens(st.el) : null;
    var outShift = t && (up ? "-" : "") + t.shift;
    var inShift = t && (up ? "" : "-") + t.shift;

    var want = new Map(parts.map(function (p) { return [p.key, p.ch]; }));
    var old = Array.prototype.slice.call(st.box.children);

    // Which existing slots change: a new character, coming back while
    // leaving, or starting to leave. Everything else is left alone, mid-motion
    // or not.
    var touched = old.filter(function (s) {
      return want.has(s._key) ? s._leaving || want.get(s._key) !== s._ch : !s._leaving;
    });

    // Reads first, then writes, so this costs one layout, not one per slot
    var before = new Map();
    if (t) touched.forEach(function (s) {
      before.set(s, { width: s.getBoundingClientRect().width, glyph: s._g && snapshot(s._g) });
    });

    // Merge old and new in reading order. Slots that are going away keep
    // their place so they close up where they stand.
    var merged = [], entering = [], i = 0;
    function drain(stopAt) {
      while (i < old.length && old[i] !== stopAt) {
        if (!want.has(old[i]._key)) merged.push(old[i]);
        i++;
      }
    }
    parts.forEach(function (p) {
      var s = st.slots.get(p.key);
      // A key that moved earlier (e.g. a locale puts the minus sign after the
      // currency) must not sweep the leaving slots ahead of it out of place.
      if (s) { if (old.indexOf(s, i) !== -1) drain(s); }
      else {
        s = document.createElement("span");
        s.className = "ui-numtext__slot";
        s._key = p.key;
        st.slots.set(p.key, s);
        entering.push(s);
      }
      if (old[i] === s) i++;
      merged.push(s);
    });
    drain(null);

    merged.forEach(function (s, idx) {
      if (st.box.children[idx] !== s) st.box.insertBefore(s, st.box.children[idx] || null);
    });

    var leaving = [];
    touched.concat(entering).forEach(function (s) {
      stop(s);
      var ch = want.get(s._key);
      if (ch === undefined) {
        s._leaving = true;
        s.classList.add("is-leaving");
        leaving.push(s);
        if (!t) retire(st, s);
        return;
      }
      s._leaving = false;
      s._exit = null;
      s.classList.remove("is-leaving");
      var prev = s._g;
      s._ch = ch;
      s._g = s.appendChild(glyph(ch));
      if (prev) {
        if (t) rollOut(prev, t, isDigit(s) && outShift, before.get(s).glyph);
        else prev.remove();
      }
    });
    if (!t) return;

    // Natural widths of the new layout (the one forced layout), then motion
    var grow = touched.concat(entering).filter(function (s) { return !s._leaving; });
    var after = grow.map(function (s) { return s.getBoundingClientRect().width; });

    function width(s, a, b) {
      if (t.reduced || Math.abs(a - b) < 0.5) return null;
      return s.animate({ width: [a + "px", b + "px"] }, { duration: b ? t.enter : t.exit, easing: b ? t.easeIn : t.easeOut });
    }

    grow.forEach(function (s, k) {
      rollIn(s._g, t, isDigit(s) && inShift);
      width(s, before.has(s) ? before.get(s).width : 0, after[k]);
    });
    leaving.forEach(function (s) {
      var b = before.get(s);
      var out = rollOut(s._g, t, isDigit(s) && outShift, b.glyph);
      s._g = null;
      // Only this exit may retire the slot: an older exit's glyph fade can
      // still finish after the slot was revived and started leaving again.
      var done = s._exit = width(s, b.width, 0) || out;
      done.addEventListener("finish", function () { if (s._leaving && s._exit === done) retire(st, s); });
    });
  }

  /* ---- Public API ------------------------------------------------------ */

  // Rebuild the formatter if data-format or data-locale changed
  function refreshFormat(st) {
    var src = (st.el.dataset.format || "") + "|" + (st.el.dataset.locale || "");
    if (src === st.fmtSrc) return false;
    st.fmt = formatter(st.el);
    st.fmtSrc = src;
    return true;
  }

  // Number("") and Number(null) are 0; an empty value is not a number
  function num(v) {
    return v == null || String(v).trim() === "" ? NaN : Number(v);
  }

  // Decimal places a value is written with, so count mode can tween
  // integers through integers instead of flashing "9.432".
  function places(n) {
    var m = /(?:\.(\d+))?(?:e-(\d+))?$/.exec(String(n));
    return (m[1] ? m[1].length : 0) + (m[2] ? Number(m[2]) : 0);
  }

  function set(el, value) {
    value = num(value);
    if (isNaN(value)) return;
    if (!states.has(el) && el.dataset.value === undefined) el.dataset.value = value;
    var st = states.get(el) || init(el);
    if (!st) return;
    var reformatted = refreshFormat(st);
    if (value === st.target && !reformatted) return;
    var from = st.target;
    st.target = value;
    cancelAnimationFrame(st.raf);
    st.sr.textContent = st.fmt.format(value);
    if (String(el.dataset.value) !== String(value)) { el.dataset.value = value; st.observer.takeRecords(); }

    if (el.dataset.mode === "count" && !reduceMotion.matches && !document.hidden) {
      // Count mode: tween through the in-between values, no roll
      var dur = tokens(el).enter, t0 = performance.now(), start = st.value;
      var f = Math.pow(10, Math.max(places(start), places(value)));
      st.raf = requestAnimationFrame(function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        // "|| 0" keeps a rounded -0 from showing as "-0"
        render(st, p < 1 ? Math.round((start + (value - start) * (1 - Math.pow(1 - p, 3))) * f) / f || 0 : value, false);
        if (p < 1) st.raf = requestAnimationFrame(tick);
      });
    } else {
      render(st, value, true);
    }

    if (from !== value) el.dispatchEvent(new CustomEvent("ui-numtext:change", {
      bubbles: true,
      detail: { from: from, to: value, direction: value > from ? "up" : "down" }
    }));
  }

  function init(el) {
    if (states.has(el)) return states.get(el);
    var value = num(el.dataset.value);
    if (isNaN(value)) return null;

    var sr = document.createElement("span");
    sr.className = "ui-numtext__sr";
    if (el.dataset.live) { sr.setAttribute("aria-live", el.dataset.live); sr.setAttribute("aria-atomic", "true"); }
    var box = document.createElement("span");
    box.className = "ui-numtext__box";
    box.setAttribute("aria-hidden", "true");
    el.textContent = "";
    el.append(sr, box);

    var st = { el: el, sr: sr, box: box, slots: new Map(), raf: 0, target: value };
    states.set(el, st);
    refreshFormat(st);
    sr.textContent = st.fmt.format(value);
    render(st, value, false);

    // Attribute changes made by other code land here
    st.observer = new MutationObserver(function () { set(el, el.dataset.value); });
    st.observer.observe(el, { attributes: true, attributeFilter: ["data-value", "data-format", "data-locale"] });

    return st;
  }

  function initAll(root) {
    (root || document).querySelectorAll("[data-ui-numtext]").forEach(init);
  }

  window.uiNumText = { set: set, init: init, initAll: initAll };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { initAll(); });
  else initAll();
})();
