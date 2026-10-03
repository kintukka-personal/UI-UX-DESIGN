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
    parts.forEach(function (p) { if (p.type === "integer") place += p.value.length; });
    parts.forEach(function (p) {
      var j, k;
      if (p.type === "integer") {
        for (j = 0; j < p.value.length; j++) out.push({ key: "i" + --place, ch: p.value[j], digit: true });
        side = "post";
      } else if (p.type === "fraction") {
        for (j = 0; j < p.value.length; j++) out.push({ key: "f" + frac++, ch: p.value[j], digit: true });
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
    v = String(v).trim();
    var n = parseFloat(v);
    if (isNaN(n)) return fallback;
    return /[^m]s$/.test(v) ? n * 1000 : n;
  }

  function tokens(el) {
    var cs = getComputedStyle(el);
    var get = function (name, fallback) { return cs.getPropertyValue(name).trim() || fallback; };
    return {
      enter: ms(get("--ui-numtext-duration", "200ms"), 200),
      exit: ms(get("--ui-numtext-exit", "150ms"), 150),
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

  function slot(item) {
    var s = document.createElement("span");
    s.className = "ui-numtext__slot";
    s.appendChild(glyph(item.ch));
    s._key = item.key;
    s._ch = item.ch;
    s._digit = item.digit;
    return s;
  }

  function stop(node) {
    node.getAnimations().forEach(function (a) { a.cancel(); });
  }

  // Where a glyph is right now, mid-animation or not, so a new change can
  // carry on from there instead of snapping.
  function snapshot(g) {
    var cs = getComputedStyle(g);
    return { transform: cs.transform, opacity: cs.opacity, filter: cs.filter };
  }

  function rollIn(g, t, from) {
    if (t.reduced) return g.animate({ opacity: [0, 1] }, { duration: 120, easing: "linear" });
    g.animate([
      from ? { transform: "translateY(" + from + ")", opacity: 0, filter: "blur(" + t.blur + ")" }
           : { opacity: 0, filter: "blur(" + t.blur + ")" },
      { transform: "none", opacity: 1, filter: "blur(0)" }
    ], { duration: t.enter, easing: t.easeIn });
  }

  function rollOut(g, t, to, start) {
    var end = { opacity: 0 };
    if (!t.reduced) {
      end.filter = "blur(" + t.blur + ")";
      end.transform = to ? "translateY(" + to + ")" : start.transform;
    }
    // Fade out within the first half so old and new never read as a smudge
    var a = g.animate([start, { opacity: 0, offset: 0.5 }, end], { duration: t.reduced ? 120 : t.exit, easing: t.easeOut, fill: "forwards" });
    a.onfinish = function () { g.remove(); };
  }

  /* ---- Rendering a change ---------------------------------------------- */

  function render(st, value, animate) {
    var items = keyed(st.fmt, value);
    var from = st.value;
    var up = st.el.dataset.countsDown === "true" ? false
      : st.el.dataset.countsDown === "false" ? true
      : !(value < from);
    var t = animate && from !== undefined && !document.hidden ? tokens(st.el) : null;
    var outShift = t && (up ? "-" : "") + t.shift;
    var inShift = t && (up ? "" : "-") + t.shift;

    st.value = value;

    // Clear what an interrupted change left behind
    st.box.querySelectorAll(".is-leaving").forEach(function (n) { n.remove(); });
    var old = Array.prototype.slice.call(st.box.children);
    var keys = new Set(items.map(function (it) { return it.key; }));

    // Read everything first (before any writes) to avoid layout thrash
    var before = new Map();
    if (t) old.forEach(function (s) {
      var g = s.lastElementChild;
      before.set(s, { width: s.getBoundingClientRect().width, glyph: g && snapshot(g) });
    });
    old.forEach(function (s) {
      stop(s);
      s.style.width = "";
      s.querySelectorAll(".is-out").forEach(function (n) { n.remove(); });
    });

    // Merge old and new in reading order; slots that are going away keep
    // their place so they can close up where they stand.
    var merged = [], changed = [], added = [], i = 0;
    items.forEach(function (it) {
      while (i < old.length && !keys.has(old[i]._key)) merged.push(old[i++]);
      var s = st.slots.get(it.key);
      if (s) {
        if (old[i] === s) i++;
        if (s._ch !== it.ch) {
          var prev = s.lastElementChild;
          prev.classList.add("is-out");
          s.appendChild(glyph(it.ch));
          s._ch = it.ch;
          s._digit = it.digit;
          changed.push({ s: s, prev: prev });
        }
      } else {
        s = slot(it);
        added.push(s);
      }
      merged.push(s);
    });
    while (i < old.length) merged.push(old[i++]);

    var slots = new Map();
    merged.forEach(function (s, idx) {
      if (keys.has(s._key)) slots.set(s._key, s);
      else s.classList.add("is-leaving");
      if (st.box.children[idx] !== s) st.box.insertBefore(s, st.box.children[idx] || null);
    });
    st.slots = slots;

    if (!t) {
      changed.forEach(function (c) { c.prev.remove(); });
      merged.forEach(function (s) { if (s.classList.contains("is-leaving")) s.remove(); });
      return;
    }

    // Natural widths of the new layout, then animate from the old ones
    var after = new Map();
    merged.forEach(function (s) {
      if (!s.classList.contains("is-leaving")) after.set(s, s.getBoundingClientRect().width);
    });

    function width(s, a, b, onDone) {
      if (t.reduced || Math.abs(a - b) < 0.5) { if (onDone) onDone(); return; }
      var anim = s.animate({ width: [a + "px", b + "px"] }, { duration: b ? t.enter : t.exit, easing: b ? t.easeIn : t.easeOut });
      if (onDone) anim.onfinish = onDone;
    }

    changed.forEach(function (c) {
      var b = before.get(c.s);
      rollOut(c.prev, t, c.s._digit && outShift, b.glyph);
      rollIn(c.s.lastElementChild, t, c.s._digit && inShift);
      width(c.s, b.width, after.get(c.s));
    });
    added.forEach(function (s) {
      rollIn(s.lastElementChild, t, s._digit && inShift);
      width(s, 0, after.get(s));
    });
    merged.forEach(function (s) {
      if (!s.classList.contains("is-leaving")) return;
      var b = before.get(s);
      var g = s.lastElementChild;
      if (!b || !g) { s.remove(); return; }
      var a = g.animate([b.glyph, { opacity: 0, offset: 0.5 }, { opacity: 0 }], { duration: t.exit, easing: t.easeOut, fill: "forwards" });
      if (t.reduced) a.onfinish = function () { s.remove(); };
      else width(s, b.width, 0, function () { s.remove(); });
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

  function set(el, value) {
    var st = states.get(el) || init(el);
    value = Number(value);
    if (!st || isNaN(value)) return;
    var reformatted = refreshFormat(st);
    if (value === st.target && !reformatted) return;
    var from = st.target;
    st.target = value;
    cancelAnimationFrame(st.raf);
    st.sr.textContent = st.fmt.format(value);
    if (String(el.dataset.value) !== String(value)) el.dataset.value = value;

    if (el.dataset.mode === "count" && !reduceMotion.matches && !document.hidden) {
      // Count mode: tween through the in-between values, no roll
      var dur = tokens(el).enter, t0 = performance.now(), start = st.value;
      st.raf = requestAnimationFrame(function tick(now) {
        var p = Math.min(1, (now - t0) / dur);
        render(st, p < 1 ? start + (value - start) * (1 - Math.pow(1 - p, 3)) : value, false);
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
    var value = Number(el.dataset.value);
    if (el.dataset.value === undefined || isNaN(value)) return null;

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

    // Attribute changes made by other code (or by set itself) land here
    new MutationObserver(function () { set(el, el.dataset.value); })
      .observe(el, { attributes: true, attributeFilter: ["data-value", "data-format", "data-locale"] });

    return st;
  }

  function initAll(root) {
    (root || document).querySelectorAll("[data-ui-numtext]").forEach(init);
  }

  window.uiNumText = { set: set, init: init, initAll: initAll };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { initAll(); });
  else initAll();
})();
