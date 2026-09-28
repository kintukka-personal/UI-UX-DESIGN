/* UI Snap Scroll — one scroll, swipe or key press moves exactly one panel.
   Mark any full-screen elements with data-ui-snap-panel. They don't need to
   share a parent, so separate Shopify sections work. Everything above, below
   or between groups of panels scrolls normally.

   Controls: mouse wheel / trackpad, touch swipe, ArrowUp/ArrowDown,
   PageUp/PageDown, Space / Shift+Space.
   Adds .is-active to the panel in view and fires a "ui-snap:change" event on
   window with { index, panel }. window.uiSnap exposes next(), prev(), goTo(i). */
(function () {
  var SELECTOR = "[data-ui-snap-panel]";  // which elements are panels
  var DURATION = 1000;                     // ms per move
  var SWIPE_MIN = 40;                      // px a swipe must travel

  function init() {
    if (window.uiSnap) return;
    var panels = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
    if (!panels.length) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var animating = false;
    var animEnd = 0;
    var current = -1;

    function tops() {
      return panels.map(function (p) { return p.getBoundingClientRect().top + window.scrollY; });
    }

    function ease(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function scrollToY(y) {
      var start = window.scrollY;
      var dist = y - start;
      if (Math.abs(dist) < 1) return;
      var dur = reduceMotion.matches ? 1 : DURATION;
      var html = document.documentElement;
      var prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      animating = true;
      var t0 = performance.now();
      function step(now) {
        var t = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, start + dist * ease(t));
        if (t < 1) requestAnimationFrame(step);
        else {
          animating = false;
          animEnd = performance.now();
          html.style.scrollBehavior = prevBehavior;
        }
      }
      requestAnimationFrame(step);
    }

    function nearest(t, y) {
      var i = 0;
      for (var k = 1; k < t.length; k++) if (Math.abs(t[k] - y) < Math.abs(t[i] - y)) i = k;
      return i;
    }

    // Where one step in `dir` should land, or null to scroll natively.
    function target(dir) {
      var t = tops();
      var y = window.scrollY;
      var vh = window.innerHeight;
      var i = nearest(t, y);
      var off = y - t[i];

      // Only take over when a panel fills (or nearly fills) the screen.
      if (Math.abs(off) > vh * 0.5) {
        // Partly scrolled into a panel from normal content: finish the move into it.
        for (var k = 0; k < t.length; k++) {
          if (dir > 0 && t[k] > y && t[k] - y < vh * 0.5) return t[k];
          if (dir < 0 && t[k] < y && y - t[k] < panels[k].offsetHeight - vh * 0.5 && y - t[k] > 2) return t[k];
        }
        return null;
      }

      var j;
      if (dir > 0) j = t[i] > y + 2 ? i : i + 1;
      else j = t[i] < y - 2 ? i : i - 1;
      if (j < 0 || j >= t.length) return null;

      // Only step to a neighbouring panel that follows on directly (small
      // gaps such as theme section spacing are fine; real content is not).
      var edge = dir > 0 ? t[i] + panels[i].offsetHeight : t[i];
      var next = dir > 0 ? t[j] : t[j] + panels[j].offsetHeight;
      if (j !== i && Math.abs(edge - next) > vh * 0.25) return null;
      return t[j];
    }

    // Leave the page alone while the theme has locked scrolling (drawers, modals).
    function locked() {
      var h = getComputedStyle(document.documentElement).overflowY;
      var b = getComputedStyle(document.body).overflowY;
      return h === "hidden" || b === "hidden" || document.documentElement.classList.contains("ui-snap-paused");
    }

    // Let inner scrollable areas (a long list inside a panel) scroll first.
    function innerScroller(el, dir) {
      while (el && el !== document.body && el.nodeType === 1) {
        var s = getComputedStyle(el);
        if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) {
          if (dir > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
          if (dir < 0 && el.scrollTop > 0) return true;
        }
        el = el.parentElement;
      }
      return false;
    }

    // ---- Wheel: one gesture = one panel (ignores trackpad momentum tails)
    var lastWheel = 0;
    var lastMag = 0;
    window.addEventListener("wheel", function (e) {
      if (e.ctrlKey || locked()) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      var dir = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
      if (!dir || innerScroller(e.target, dir)) return;

      var now = performance.now();
      var mag = Math.abs(e.deltaY);
      var fresh = now - lastWheel > 220 || mag > lastMag * 1.5 + 4;
      lastWheel = now;
      lastMag = mag;

      if (animating) { e.preventDefault(); return; }
      var y = target(dir);
      if (y === null) return;
      e.preventDefault();
      if (!fresh && now - animEnd < 1200) return;
      scrollToY(y);
    }, { passive: false });

    // ---- Touch: one swipe = one panel
    var touchY = null;
    var touchTarget = null;
    window.addEventListener("touchstart", function (e) {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
      touchTarget = e.target;
    }, { passive: true });

    window.addEventListener("touchmove", function (e) {
      if (touchY === null || locked()) return;
      var dy = touchY - e.touches[0].clientY;
      if (Math.abs(dy) < 2) return;
      var dir = dy > 0 ? 1 : -1;
      if (innerScroller(touchTarget, dir)) { touchY = null; return; }
      if (animating || target(dir) !== null) e.preventDefault();
    }, { passive: false });

    window.addEventListener("touchend", function (e) {
      if (touchY === null) return;
      var dy = touchY - e.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) < SWIPE_MIN || animating || locked()) return;
      var y = target(dy > 0 ? 1 : -1);
      if (y !== null) scrollToY(y);
    });

    // ---- Keyboard
    window.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || locked()) return;
      var el = e.target;
      if (el.closest && el.closest("input, textarea, select, [contenteditable]")) return;
      var dir = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown") dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp") dir = -1;
      else if (e.key === " " && !(el.closest && el.closest("button, a, summary"))) dir = e.shiftKey ? -1 : 1;
      if (!dir) return;
      if (animating) { e.preventDefault(); return; }
      var y = target(dir);
      if (y === null) return;
      e.preventDefault();
      scrollToY(y);
    });

    // ---- Active panel tracking
    var ticking = false;
    function sync() {
      ticking = false;
      var t = tops();
      var y = window.scrollY;
      var vh = window.innerHeight;
      var active = -1;
      for (var k = 0; k < t.length; k++) if (Math.abs(t[k] - y) < vh * 0.5) active = k;
      panels.forEach(function (p, k) { p.classList.toggle("is-active", k === active); });
      if (active !== current) {
        current = active;
        window.dispatchEvent(new CustomEvent("ui-snap:change", {
          detail: { index: active, panel: active >= 0 ? panels[active] : null, total: panels.length }
        }));
      }
    }
    function requestSync() { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }

    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", function () {
      requestSync();
      if (animating) return;
      var t = tops();
      var y = window.scrollY;
      var i = nearest(t, y);
      if (Math.abs(t[i] - y) < window.innerHeight * 0.5) window.scrollTo(0, t[i]);
    });

    window.uiSnap = {
      next: function () { var y = target(1); if (y !== null && !animating) scrollToY(y); },
      prev: function () { var y = target(-1); if (y !== null && !animating) scrollToY(y); },
      goTo: function (i) { var t = tops(); if (t[i] !== undefined && !animating) scrollToY(t[i]); },
      panels: panels
    };

    document.documentElement.classList.add("ui-snap-ready");
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
