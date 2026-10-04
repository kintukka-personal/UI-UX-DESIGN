/* UI Profile Card — entrance for every [data-ui-prof].

   The first time the card scrolls into view:
   1. The name types out one letter at a time, line by line, behind a blinking
      caret. The letters are already laid out (the SVG text keeps its full
      textLength), so each one appears in its final place.
   2. As the last letter lands, the portrait opens out from the centre of
      the face.
   3. Until then the stat and footer rows show as skeleton bars (style.css).
      As the portrait lands they load one at a time: the stat, then the meta
      row, the tagline and the button. A row's numbers start counting once
      the row has finished filling in, and the next row starts as they
      settle.

   Counting: every [data-ui-prof-count] runs from data-ui-prof-count-from
   (default 0) to the number written in it, so it can count up (0 → 120) or
   down (100 → 60). Decimals are kept, so 4.9 counts 0.0 → 4.9. A number
   that counts up keeps its final width while it runs, so nothing next to it
   shifts.

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
  var COUNT_TIME = 800;   // ms for each number to count
  var LAND_DELAY = 700;   // ms after the caret fades that the first row loads
  var ROW_FILL = 450;     // ms a row takes to fill in from its skeleton (matches style.css)
  var COUNT_HOLD = 150;   // ms the starting number shows, fully in, before it counts
  var COUNT_HANDOFF = 0.7; // the next row starts this far into a count (it has all but settled by then)
  var TEXT_HANDOFF = 250; // ms into a row with no numbers that the next row starts

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

  function decimalsOf(el) {
    return (el.dataset.uiProfTarget.split(".")[1] || "").length;
  }

  function countFrom(el) {
    return parseFloat(el.dataset.uiProfCountFrom) || 0;
  }

  function count(el, timers) {
    var decimals = decimalsOf(el);
    var from = countFrom(el);
    var end = parseFloat(el.dataset.uiProfTarget);
    var start = performance.now();
    function frame(now) {
      if (timers.stopped) return;
      var t = Math.min(1, (now - start) / COUNT_TIME);
      el.textContent = (from + (end - from) * easeOut(t)).toFixed(decimals);
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
    rowsOf(card).forEach(function (row) { row.classList.remove("is-in"); });
    card.querySelectorAll("[data-ui-prof-count]").forEach(function (el) {
      el.textContent = el.dataset.uiProfTarget;
    });
  }

  function rowsOf(card) {
    return Array.prototype.slice.call(card.querySelectorAll(".ui-prof__stat, .ui-prof__body > *"));
  }

  // Pins each number that counts up to the width of its final value, in em so
  // it still scales with the card. Measured after the fonts load. A number
  // that counts down only narrows once (100 → 99), so it is left free rather
  // than leaving a gap beside its final value.
  function holdWidths(card) {
    card.querySelectorAll("[data-ui-prof-count]").forEach(function (el) {
      if (countFrom(el) > parseFloat(el.dataset.uiProfTarget)) return;
      el.style.display = "inline-block";
      el.style.minWidth = "";
      el.style.textAlign = "right";
      var em = el.getBoundingClientRect().width / parseFloat(getComputedStyle(el).fontSize);
      el.style.minWidth = em.toFixed(3) + "em";
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
      holdWidths(card);
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

      // The portrait starts opening as the last letter lands, while the caret
      // blinks a moment longer before it fades.
      later(t, function () {
        // Still hidden in their skeletons, so jumping to the start isn't seen
        card.querySelectorAll("[data-ui-prof-count]").forEach(function (el) {
          el.textContent = countFrom(el).toFixed(decimalsOf(el));
        });
        card.classList.add("is-caret-idle", "is-revealed");
      });
      t += CARET_HOLD;
      later(t, function () {
        card.classList.add("is-caret-out");
        card.classList.remove("is-caret-idle");
      });

      // Rows load one after another as the portrait lands. A row with
      // numbers counts them once it has filled in. The next row starts as that
      // count settles (an ease-out count is ~97% there at 70% of its time), or
      // part-way through a row with no numbers, so there are no dead pauses.
      t += LAND_DELAY;
      rowsOf(card).forEach(function (row) {
        var numbers = row.querySelectorAll("[data-ui-prof-count]");
        later(t, function () { row.classList.add("is-in"); });
        if (!numbers.length) {
          t += TEXT_HANDOFF;
          return;
        }
        // Count only once the row has fully filled in, so the start ($100)
        // is readable before it moves
        t += ROW_FILL + COUNT_HOLD;
        later(t, function () {
          numbers.forEach(function (el) { count(el, timers); });
        });
        t += COUNT_TIME * COUNT_HANDOFF;
      });
    });
  }

  window.uiProf = { init: init, play: play };
  document.querySelectorAll("[data-ui-prof]").forEach(init);
})();
