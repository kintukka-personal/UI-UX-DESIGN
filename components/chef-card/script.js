/* UI Profile Card — entrance for every [data-ui-chef].

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
      settle. Each award on the jacket is a row. data-ui-chef-pause="300" on a
      row adds that many ms before it loads. data-ui-chef-join makes a row
      load with the row before it instead of after, offset by its parent's
      data-ui-chef-stagger (ms). The lead award lands alone, then after a
      pause the other three come in together, 100ms apart.

   Counting: every [data-ui-chef-count] runs from data-ui-chef-count-from
   (default 0) to the number written in it, so it can count up (0 → 120) or
   down (100 → 60). Decimals are kept, so 4.9 counts 0.0 → 4.9. A number
   that counts up keeps its final width while it runs, so nothing next to it
   shifts.

   Rating star: once the numbers in a row with a .ui-chef__star have finished
   counting, gold sparkles fly in from around the star. As they arrive it
   jumps, turns gold (.is-gold) and stays gold.

   The card is armed (hidden) before first paint, so nothing flashes. Without
   this script, or with reduced motion turned on, the card shows at rest.
   window.uiChef.play(card) replays the intro; window.uiChef.init(card) sets up
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
  var SPARKLES = 9;       // sparkles that fly into the rating star
  var SPARKLE_TIME = 560; // ms for each sparkle's flight
  var SPARKLE_SPREAD = 220; // ms over which the sparkles set off

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
    return (el.dataset.uiChefTarget.split(".")[1] || "").length;
  }

  function countFrom(el) {
    return parseFloat(el.dataset.uiChefCountFrom) || 0;
  }

  function count(el, timers) {
    var decimals = decimalsOf(el);
    var from = countFrom(el);
    var end = parseFloat(el.dataset.uiChefTarget);
    var start = performance.now();
    function frame(now) {
      if (timers.stopped) return;
      var t = Math.min(1, (now - start) / COUNT_TIME);
      el.textContent = (from + (end - from) * easeOut(t)).toFixed(decimals);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Gold sparkles appear around the star, then curve into it. The star turns
  // gold as the last one arrives.
  function sparkle(card, star, timers) {
    var inner = card.querySelector(".ui-chef__inner");
    var box = inner.getBoundingClientRect();
    var r = star.getBoundingClientRect();
    var u = box.width / 390;
    var cx = r.left + r.width / 2 - box.left;
    var cy = r.top + r.height / 2 - box.top;
    var last = 0;
    for (var i = 0; i < SPARKLES; i++) {
      var angle = (i / SPARKLES) * Math.PI * 2 + Math.random() * 0.5;
      var dist = (34 + Math.random() * 34) * u;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist * 0.8;
      if (dy > 0) dy *= 0.35; // mostly above and beside, clear of the tagline below
      var delay = Math.random() * SPARKLE_SPREAD;
      last = Math.max(last, delay);
      var el = document.createElement("span");
      el.className = "ui-chef__sparkle";
      el.setAttribute("aria-hidden", "true");
      el.style.setProperty("--s", ((6 + Math.random() * 6) * u).toFixed(1) + "px");
      el.style.left = cx + "px";
      el.style.top = cy + "px";
      inner.appendChild(el);
      // Twinkle in where it starts, then accelerate into the star, spinning
      // and shrinking. The side-step at the midpoint curves the path.
      el.animate([
        { transform: "translate(" + dx + "px," + dy + "px) scale(0) rotate(0deg)", opacity: 0, easing: "ease-out" },
        { offset: 0.3, transform: "translate(" + dx + "px," + dy + "px) scale(1.1) rotate(45deg)", opacity: 1, easing: "cubic-bezier(0.55, 0, 0.8, 0.4)" },
        { offset: 0.65, transform: "translate(" + (dx * 0.45 - dy * 0.25) + "px," + (dy * 0.45 + dx * 0.25) + "px) scale(0.8) rotate(140deg)", opacity: 1, easing: "cubic-bezier(0.4, 0, 1, 1)" },
        { transform: "translate(0,0) scale(0.25) rotate(220deg)", opacity: 0.6 }
      ], { duration: SPARKLE_TIME, delay: delay, fill: "both" }).onfinish = (function (node) {
        return function () { node.remove(); };
      })(el);
    }
    timers.list.push(setTimeout(function () {
      if (!timers.stopped) star.classList.add("is-gold");
    }, last + SPARKLE_TIME - 40));
  }

  function fontsReady(card) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var family = getComputedStyle(card).getPropertyValue("--ui-chef-display") || "Anton";
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 1500); });
    return Promise.race([document.fonts.load("100px " + family), timeout]).catch(function () {});
  }

  function init(card) {
    if (card.dataset.uiChefReady) return;
    card.dataset.uiChefReady = "true";

    var lines = card.querySelectorAll(".ui-chef__name text");
    var counts = card.querySelectorAll("[data-ui-chef-count]");
    lines.forEach(splitLetters);
    counts.forEach(function (el) { el.dataset.uiChefTarget = el.textContent.trim(); });

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
    var timers = card._uiChefTimers;
    if (timers) {
      timers.list.forEach(clearTimeout);
      timers.stopped = true;
    }
    card._uiChefTimers = { list: [], stopped: false };
    card.classList.remove("is-revealed", "is-typing", "is-caret-idle", "is-caret-out");
    card.classList.add("is-armed");
    card.querySelectorAll(".ui-chef__name tspan").forEach(function (t) { t.classList.remove("is-on"); });
    rowsOf(card).forEach(function (row) { row.classList.remove("is-in"); });
    card.querySelectorAll(".ui-chef__star").forEach(function (star) { star.classList.remove("is-gold"); });
    card.querySelectorAll(".ui-chef__sparkle").forEach(function (el) { el.remove(); });
    card.querySelectorAll("[data-ui-chef-count]").forEach(function (el) {
      el.textContent = el.dataset.uiChefTarget;
    });
  }

  function rowsOf(card) {
    return Array.prototype.slice.call(card.querySelectorAll(".ui-chef__stat, .ui-chef__body > *"));
  }

  // Groups rows into steps: a row with data-ui-chef-join loads in the same
  // step as the row before it.
  function stepsOf(card) {
    var steps = [];
    rowsOf(card).forEach(function (row) {
      if (row.hasAttribute("data-ui-chef-join") && steps.length) steps[steps.length - 1].push(row);
      else steps.push([row]);
    });
    return steps;
  }

  // Pins each number that counts up to the width of its final value, in em so
  // it still scales with the card. Measured after the fonts load. A number
  // that counts down only narrows once (100 → 99), so it is left free rather
  // than leaving a gap beside its final value.
  function holdWidths(card) {
    card.querySelectorAll("[data-ui-chef-count]").forEach(function (el) {
      if (countFrom(el) > parseFloat(el.dataset.uiChefTarget)) return;
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
    var timers = card._uiChefTimers;
    var caret = card.querySelector(".ui-chef__caret");
    var lines = Array.prototype.slice.call(card.querySelectorAll(".ui-chef__name text"));

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
        card.querySelectorAll("[data-ui-chef-count]").forEach(function (el) {
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
      stepsOf(card).forEach(function (rows) {
        // A step can ask for a short extra pause before it loads
        t += parseFloat(rows[0].dataset.uiChefPause) || 0;
        // Rows joined into one step come in this many ms apart
        var stagger = parseFloat(rows[0].parentNode.dataset.uiChefStagger) || 0;
        var lastCount = -1;
        rows.forEach(function (row, k) {
          var at = t + k * stagger;
          later(at, function () { row.classList.add("is-in"); });
          var numbers = row.querySelectorAll("[data-ui-chef-count]");
          if (!numbers.length) return;
          // Count only once the row has fully filled in, so the start ($100)
          // is readable before it moves
          var countAt = at + ROW_FILL + COUNT_HOLD;
          later(countAt, function () {
            numbers.forEach(function (el) { count(el, timers); });
          });
          var star = row.querySelector(".ui-chef__star");
          if (star) later(countAt + COUNT_TIME + 60, function () { sparkle(card, star, timers); });
          lastCount = countAt;
        });
        t = lastCount >= 0
          ? lastCount + COUNT_TIME * COUNT_HANDOFF
          : t + (rows.length - 1) * stagger + TEXT_HANDOFF;
      });
    });
  }

  window.uiChef = { init: init, play: play };
  document.querySelectorAll("[data-ui-chef]").forEach(init);
})();
