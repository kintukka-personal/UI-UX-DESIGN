/* UI Profile Card — entrance for every [data-ui-prof].

   The first time the card scrolls into view:
   1. The name types out one letter at a time, line by line, behind a blinking
      caret. The letters are already laid out (the SVG text keeps its full
      textLength), so each one appears in its final place.
   2. The portrait opens out from the centre of the face.
   3. The stat and footer rise in, and every [data-ui-prof-count] counts up
      from zero to the number written in it (decimals are kept, so 4.9 counts
      0.0 → 4.9).

   The card is armed (hidden) before first paint, so nothing flashes. Without
   this script, or with reduced motion turned on, the card shows at rest.
   window.uiProf.play(card) replays the intro; window.uiProf.init(card) sets up
   a card added after page load. */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  var TYPE_START = 250;   // ms before the first letter
  var TYPE_STEP = 115;    // ms per letter
  var LINE_PAUSE = 240;   // extra pause before the second line
  var CARET_HOLD = 450;   // caret blinks this long after the last letter
  var COUNT_TIME = 1100;  // ms for each number to count up

  function splitLetters(text) {
    if (text.dataset.split) return;
    var letters = text.textContent.trim();
    text.textContent = "";
    for (var i = 0; i < letters.length; i++) {
      var span = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      span.textContent = letters[i];
      text.appendChild(span);
    }
    text.dataset.split = "true";
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function countUp(el, timers) {
    var target = el.dataset.uiProfTarget;
    var decimals = (target.split(".")[1] || "").length;
    var end = parseFloat(target);
    var start = performance.now();
    function frame(now) {
      if (timers.stopped) return;
      var t = Math.min(1, (now - start) / COUNT_TIME);
      el.textContent = (end * easeOut(t)).toFixed(decimals);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function fontsReady(card) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var family = getComputedStyle(card).getPropertyValue("--ui-prof-display") || "Anton";
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 1500); });
    return Promise.race([document.fonts.load("100px " + family), timeout]).catch(function () {});
  }

  function init(card) {
    if (card.dataset.uiProfReady) return;
    card.dataset.uiProfReady = "true";

    var lines = card.querySelectorAll(".ui-prof__name text");
    var counts = card.querySelectorAll("[data-ui-prof-count]");
    lines.forEach(splitLetters);
    counts.forEach(function (el) { el.dataset.uiProfTarget = el.textContent.trim(); });

    if (reduceMotion.matches) return;
    reset(card);

    if (!("IntersectionObserver" in window)) return play(card);
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      play(card);
    }, { threshold: 0.35 });
    io.observe(card);
  }

  function reset(card) {
    var timers = card._uiProfTimers;
    if (timers) {
      timers.list.forEach(clearTimeout);
      timers.stopped = true;
    }
    card._uiProfTimers = { list: [], stopped: false };
    card.classList.remove("is-revealed", "is-typing", "is-caret-idle", "is-caret-out");
    card.classList.add("is-armed");
    card.querySelectorAll(".ui-prof__name tspan").forEach(function (t) { t.classList.remove("is-on"); });
    card.querySelectorAll("[data-ui-prof-count]").forEach(function (el) {
      el.textContent = (0).toFixed((el.dataset.uiProfTarget.split(".")[1] || "").length);
    });
  }

  function play(card) {
    init(card);
    if (reduceMotion.matches) return;
    reset(card);
    var timers = card._uiProfTimers;
    var caret = card.querySelector(".ui-prof__caret");
    var lines = Array.prototype.slice.call(card.querySelectorAll(".ui-prof__name text"));

    function later(ms, fn) { timers.list.push(setTimeout(fn, ms)); }

    // Moves the caret just past the last visible letter of a line (or to the
    // line's start when none is visible yet).
    function placeCaret(text, letter) {
      if (!caret) return;
      var y = parseFloat(text.getAttribute("y"));
      var x = parseFloat(text.getAttribute("x"));
      if (letter) {
        var box = letter.getBBox();
        x = box.x + box.width + 6;
      }
      caret.setAttribute("x", x);
      caret.setAttribute("y", y - parseFloat(caret.getAttribute("height")));
    }

    fontsReady(card).then(function () {
      var t = TYPE_START;
      card.classList.add("is-typing", "is-caret-idle");
      placeCaret(lines[0], null);

      lines.forEach(function (text, li) {
        if (li > 0) {
          t += LINE_PAUSE;
          later(t - TYPE_STEP, function () { placeCaret(text, null); });
        }
        Array.prototype.forEach.call(text.children, function (letter) {
          later(t, function () {
            card.classList.remove("is-caret-idle");
            letter.classList.add("is-on");
            placeCaret(text, letter);
          });
          t += TYPE_STEP;
        });
      });

      later(t, function () { card.classList.add("is-caret-idle"); });
      t += CARET_HOLD;
      later(t, function () {
        card.classList.add("is-caret-out", "is-revealed");
        card.classList.remove("is-caret-idle");
      });
      // Numbers start as their rows rise in (see --ui-prof-delay in style.css).
      card.querySelectorAll("[data-ui-prof-count]").forEach(function (el) {
        var row = el.closest(".ui-prof__stat, .ui-prof__body > *");
        var delay = row ? parseFloat(getComputedStyle(row).getPropertyValue("--ui-prof-delay")) * 1000 || 0 : 0;
        later(t + delay + 100, function () { countUp(el, timers); });
      });
    });
  }

  window.uiProf = { init: init, play: play };
  document.querySelectorAll("[data-ui-prof]").forEach(init);
})();
