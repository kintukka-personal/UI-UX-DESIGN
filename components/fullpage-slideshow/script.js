/* UI Full-page Slideshow — behaviour.
   - One wheel gesture, swipe, or arrow/Page key moves exactly one slide.
   - The header gets .is-compact once the page leaves the very top.
   - The header and indicator take data-ui-fp-bg from whatever sits behind
     them. Any element with data-ui-fp-bg="light|dark" counts, so sections
     below the slideshow (a footer, for example) can set it too.
   Scrolling is only taken over inside the slideshow. Above or below it, the
   page scrolls normally. */
(function () {
  var root = document.querySelector("[data-ui-fp]");
  if (!root) return;

  var slides = Array.prototype.slice.call(root.querySelectorAll("[data-ui-fp-slide]"));
  if (!slides.length) return;

  var header = document.querySelector("[data-ui-fp-header]");
  var indicator = document.querySelector("[data-ui-fp-indicator]");
  var indicatorLabel = indicator && indicator.querySelector("[data-ui-fp-indicator-label]");
  var introText = indicatorLabel ? indicatorLabel.textContent : "";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var duration = parseFloat(getComputedStyle(root).getPropertyValue("--ui-fp-duration")) || 1000;

  var animating = false;
  var animEnd = 0;

  function tops() {
    return slides.map(function (s) { return s.getBoundingClientRect().top + window.scrollY; });
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function scrollToY(y) {
    var start = window.scrollY;
    var dist = y - start;
    if (Math.abs(dist) < 1) return;
    var dur = reduceMotion.matches ? 1 : duration;
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

  // Where one step in `dir` should land, or null to let the page scroll natively.
  function target(dir) {
    var t = tops();
    var y = window.scrollY;
    var last = t.length - 1;
    var lastBottom = t[last] + slides[last].offsetHeight;

    if (y < t[0] - 2) return null;                    // above the slideshow
    if (y > t[last] + 2) {                            // below the last slide's top
      if (dir < 0 && y < lastBottom - 2) return t[last];
      return null;
    }

    var i = 0;
    for (var k = 1; k < t.length; k++) {
      if (Math.abs(t[k] - y) < Math.abs(t[i] - y)) i = k;
    }
    var j;
    if (dir > 0) j = t[i] > y + 2 ? i : i + 1;
    else j = t[i] < y - 2 ? i : i - 1;
    if (j < 0 || j > last) return null;
    return t[j];
  }

  // While the search or menu is open, the page underneath stays put.
  function overlayOpen() {
    return !!document.querySelector(".ui-hsearch.is-open, .ui-fp-menu.is-open");
  }
  function insideOverlay(el) {
    return !!(el && el.closest && el.closest(".ui-hsearch__layer, .ui-fp-menu__panel"));
  }

  // ---- Wheel: one gesture = one slide (ignores trackpad momentum tails)
  var lastWheel = 0;
  var lastMag = 0;
  window.addEventListener("wheel", function (e) {
    if (e.ctrlKey) return;
    if (overlayOpen()) { if (!insideOverlay(e.target)) e.preventDefault(); return; }
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    var dir = e.deltaY > 0 ? 1 : e.deltaY < 0 ? -1 : 0;
    if (!dir) return;

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

  // ---- Touch: one swipe = one slide
  var touchY = null;
  window.addEventListener("touchstart", function (e) {
    touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
  }, { passive: true });

  window.addEventListener("touchmove", function (e) {
    if (touchY === null) return;
    if (overlayOpen()) { if (!insideOverlay(e.target)) e.preventDefault(); return; }
    var dy = touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 2) return;
    if (animating || target(dy > 0 ? 1 : -1) !== null) e.preventDefault();
  }, { passive: false });

  window.addEventListener("touchend", function (e) {
    if (touchY === null) return;
    var dy = touchY - e.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) < 40 || animating || overlayOpen()) return;
    var y = target(dy > 0 ? 1 : -1);
    if (y !== null) scrollToY(y);
  });

  // ---- Keyboard
  window.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || overlayOpen()) return;
    var el = e.target;
    if (el.closest && el.closest("input, textarea, select, [contenteditable]")) return;
    var dir = 0;
    if (e.key === "ArrowDown" || e.key === "PageDown") dir = 1;
    else if (e.key === "ArrowUp" || e.key === "PageUp") dir = -1;
    else if (e.key === " " && !(el.closest && el.closest("button, a"))) dir = e.shiftKey ? -1 : 1;
    if (!dir) return;
    if (animating) { e.preventDefault(); return; }
    var y = target(dir);
    if (y === null) return;
    e.preventDefault();
    scrollToY(y);
  });

  // ---- Keep header, indicator and active slide in sync with the scroll
  function bgAt(pageY) {
    var els = document.querySelectorAll("[data-ui-fp-bg]");
    for (var k = 0; k < els.length; k++) {
      var el = els[k];
      if (el === header || el === indicator) continue;
      var r = el.getBoundingClientRect();
      var top = r.top + window.scrollY;
      if (pageY >= top && pageY < top + r.height) return el.getAttribute("data-ui-fp-bg");
    }
    return null;
  }

  var ticking = false;
  function sync() {
    ticking = false;
    var y = window.scrollY;
    var vh = window.innerHeight;
    var t = tops();

    if (header) {
      header.classList.toggle("is-compact", y > 4);
      var hb = bgAt(y + 40);
      if (hb) header.setAttribute("data-ui-fp-bg", hb);
    }

    var active = -1;
    for (var k = 0; k < t.length; k++) {
      if (Math.abs(t[k] - y) < vh * 0.5) active = k;
    }
    slides.forEach(function (s, k) { s.classList.toggle("is-active", k === active); });

    if (indicator) {
      var ib = bgAt(y + vh - 30);
      var inSlides = y < t[t.length - 1] + 40 && y > t[0] - vh * 0.5;
      indicator.classList.toggle("is-hidden", !inSlides);
      if (ib) indicator.setAttribute("data-ui-fp-bg", ib);
      if (indicatorLabel && active >= 0) {
        indicatorLabel.textContent = active === 0 ? introText : (active + 1) + " / " + slides.length;
      }
    }
  }

  function requestSync() {
    if (!ticking) { ticking = true; requestAnimationFrame(sync); }
  }

  window.addEventListener("scroll", requestSync, { passive: true });
  window.addEventListener("resize", function () {
    requestSync();
    if (animating) return;
    // Re-align to the nearest slide after a resize
    var t = tops();
    var y = window.scrollY;
    if (y < t[0] || y > t[t.length - 1]) return;
    var i = 0;
    for (var k = 1; k < t.length; k++) if (Math.abs(t[k] - y) < Math.abs(t[i] - y)) i = k;
    window.scrollTo(0, t[i]);
  });

  root.classList.add("is-ready");
  sync();
})();

/* Menu drawer: [data-ui-fp-menu-toggle] opens [data-ui-fp-menu].
   Close: the Close button, clicking outside, or Escape. */
(function () {
  var menu = document.querySelector("[data-ui-fp-menu]");
  if (!menu) return;
  var panel = menu.querySelector(".ui-fp-menu__panel");
  var scrim = menu.querySelector(".ui-fp-menu__scrim");
  var toggles = document.querySelectorAll("[data-ui-fp-menu-toggle]");
  var lastTrigger = null;

  panel.inert = true;

  function isOpen() { return menu.classList.contains("is-open"); }

  function open(trigger) {
    lastTrigger = trigger || null;
    menu.classList.add("is-open");
    panel.inert = false;
    toggles.forEach(function (t) { t.setAttribute("aria-expanded", "true"); });
    var first = panel.querySelector("a, button");
    if (first) first.focus({ preventScroll: true });
  }

  function shut() {
    if (!isOpen()) return;
    menu.classList.remove("is-open");
    panel.inert = true;
    toggles.forEach(function (t) { t.setAttribute("aria-expanded", "false"); });
    if (lastTrigger && document.body.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  }

  toggles.forEach(function (t) {
    t.addEventListener("click", function () { if (isOpen()) shut(); else open(t); });
  });
  if (scrim) scrim.addEventListener("click", shut);
  panel.querySelectorAll("[data-ui-fp-menu-close]").forEach(function (b) { b.addEventListener("click", shut); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) { e.preventDefault(); shut(); }
  });
})();
