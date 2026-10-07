/* ==========================================================================
   Pricing page
   - Billing toggle with a sliding thumb; prices roll like an odometer
   - Team seat stepper (5 included, extra seats added to the price)
   - Pointer spotlight across the cards
   - FAQ accordion: opening one answer closes the other
   Prices live in the data-* attributes on each .ui-plan in index.html.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var money = function (n) { return n.toLocaleString("en-US"); };

  /* ------------------------------------------------------------------------
     Reveal on load and scroll
     ------------------------------------------------------------------------ */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ------------------------------------------------------------------------
     Rolling digits
     ------------------------------------------------------------------------ */
  function Roll(el) {
    var current = el.textContent.trim();
    el.classList.add("ui-roll");

    function makeCol(ch, startDigit) {
      if (!/\d/.test(ch)) {
        var sep = document.createElement("span");
        sep.className = "ui-roll__sep";
        sep.textContent = ch;
        return sep;
      }
      var col = document.createElement("span");
      col.className = "ui-roll__col";
      // An invisible copy of the digit sets the column's width, so a
      // proportional font keeps its natural spacing.
      var size = document.createElement("span");
      size.className = "ui-roll__size";
      size.textContent = startDigit;
      col.appendChild(size);
      var strip = document.createElement("span");
      strip.className = "ui-roll__strip";
      for (var d = 0; d <= 9; d++) {
        var cell = document.createElement("span");
        cell.textContent = d;
        strip.appendChild(cell);
      }
      strip.style.setProperty("--d", startDigit);
      col.appendChild(strip);
      return col;
    }

    function build(str, from) {
      el.textContent = "";
      el.classList.add("no-anim");
      var offset = str.length - from.length;
      for (var i = 0; i < str.length; i++) {
        var prev = from[i - offset];
        var start = prev && /\d/.test(prev) ? prev : (/\d/.test(str[i]) ? str[i] : 0);
        var node = makeCol(str[i], start);
        if (i < offset && node.classList.contains("ui-roll__col")) node.classList.add("is-entering");
        el.appendChild(node);
      }
      void el.offsetWidth;
      el.classList.remove("no-anim");
    }

    function set(str, animate) {
      if (str === current && el.querySelector(".ui-roll__strip")) return;
      var from = current;
      var shapeChanged = !el.querySelector(".ui-roll__strip") || from.length !== str.length ||
        from.replace(/\d/g, "0") !== str.replace(/\d/g, "0");
      if (shapeChanged) build(str, animate ? from : str);

      var strips = el.querySelectorAll(".ui-roll__strip");
      var digits = str.replace(/\D/g, "");
      strips.forEach(function (strip, i) {
        strip.previousSibling.textContent = digits[i];
        // The rightmost digit moves first, like a real odometer.
        strip.style.setProperty("--stagger", (strips.length - 1 - i) * 40 + "ms");
        strip.style.setProperty("--d", digits[i]);
      });

      if (animate && from !== str) {
        el.classList.remove("is-rolling");
        void el.offsetWidth;
        el.classList.add("is-rolling");
      }
      current = str;
    }

    set(current, false);
    return { set: set };
  }

  /* ------------------------------------------------------------------------
     Pricing
     ------------------------------------------------------------------------ */
  var pricing = document.querySelector("[data-ui-pricing]");
  if (pricing) {
    var billing = pricing.querySelector("[data-ui-billing]");
    var thumb = billing.querySelector(".ui-billing__thumb");
    var saveTag = pricing.querySelector("[data-ui-save]");
    var period = billing.querySelector("input:checked").value;

    var plans = Array.prototype.map.call(pricing.querySelectorAll(".ui-plan[data-monthly]"), function (card) {
      var amount = card.querySelector("[data-price]");
      return {
        card: card,
        id: card.dataset.plan,
        monthly: +card.dataset.monthly,
        yearly: +card.dataset.yearly,
        included: +card.dataset.seatsIncluded || 0,
        seatMonthly: +card.dataset.seatMonthly || 0,
        seatYearly: +card.dataset.seatYearly || 0,
        seats: +card.dataset.seatsIncluded || 1,
        roll: Roll(amount),
        sr: card.querySelector("[data-price-sr]"),
        note: card.querySelector("[data-billing-note]"),
        saving: card.querySelector("[data-saving]")
      };
    });

    var team = plans.filter(function (p) { return p.id === "team"; })[0];

    // Headline saving, worked out from the plan prices so it never drifts.
    var savePercent = Math.max.apply(null, plans.map(function (p) {
      return Math.round((1 - p.yearly / p.monthly) * 100);
    }));
    document.querySelectorAll('[data-bind="save-percent"]').forEach(function (el) { el.textContent = savePercent + "%"; });
    if (team) {
      document.querySelectorAll('[data-bind="included"]').forEach(function (el) { el.textContent = team.included; });
      document.querySelectorAll('[data-bind="seat-monthly"]').forEach(function (el) { el.textContent = "$" + team.seatMonthly; });
      document.querySelectorAll('[data-bind="seat-yearly"]').forEach(function (el) { el.textContent = "$" + team.seatYearly; });
    }

    function perMonth(p) {
      var base = period === "yearly" ? p.yearly : p.monthly;
      var seat = period === "yearly" ? p.seatYearly : p.seatMonthly;
      return base + Math.max(0, p.seats - p.included) * seat;
    }

    function monthlyEquivalent(p) {
      return p.monthly + Math.max(0, p.seats - p.included) * p.seatMonthly;
    }

    function render(animate) {
      plans.forEach(function (p) {
        var price = perMonth(p);
        p.roll.set(money(price), animate && !reduceMotion.matches);
        p.sr.textContent = "$" + money(price) + " per month, billed " + period;

        if (period === "yearly") {
          p.note.textContent = "Billed yearly as $" + money(price * 12);
          var saved = (monthlyEquivalent(p) - price) * 12;
          p.saving.textContent = saved > 0 ? "Save $" + money(saved) + "/yr" : "";
          requestAnimationFrame(function () { p.saving.classList.add("is-on"); });
        } else {
          p.note.textContent = "Billed monthly";
          p.saving.classList.remove("is-on");
        }
      });

      if (team) {
        document.querySelectorAll('[data-bind="seat-price"]').forEach(function (el) {
          el.textContent = "$" + (period === "yearly" ? team.seatYearly : team.seatMonthly);
        });
      }
      saveTag.classList.toggle("is-active", period === "yearly");
    }

    // Toggle thumb
    function placeThumb() {
      var label = billing.querySelector("input:checked + label");
      thumb.style.setProperty("--x", label.offsetLeft + "px");
      thumb.style.setProperty("--w", label.offsetWidth + "px");
    }

    billing.addEventListener("change", function (e) {
      period = e.target.value;
      billing.classList.remove("is-moving");
      void billing.offsetWidth;
      billing.classList.add("is-moving");
      placeThumb();
      render(true);
    });

    placeThumb();
    window.addEventListener("resize", placeThumb);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);

    /* ---------------------- Team seat stepper ---------------------- */
    if (team) {
      var MAX_SEATS = 500;
      var MAX_DOTS = 10;
      var stepper = team.card.querySelector("[data-ui-stepper]");
      var dec = stepper.querySelector('[data-step="-1"]');
      var inc = stepper.querySelector('[data-step="1"]');
      var output = team.card.querySelector("[data-seat-output]");
      var countEl = team.card.querySelector("[data-seat-count]");
      var dotsEl = team.card.querySelector("[data-seat-dots]");
      var cta = team.card.querySelector("[data-team-cta]");
      var shownDots = 0;

      var drawDots = function () {
        var extra = team.seats - team.included;
        var total = Math.min(team.seats, MAX_DOTS);
        var overflow = team.seats - MAX_DOTS;
        var html = "";
        for (var i = 0; i < total; i++) {
          var isOverflowSlot = overflow > 0 && i === MAX_DOTS - 1;
          if (isOverflowSlot) {
            html += '<span class="ui-seats__dot is-more">+' + (overflow + 1) + "</span>";
          } else {
            var cls = "ui-seats__dot is-on" + (i >= team.included ? " is-extra" : "") + (i >= shownDots ? " is-pop" : "");
            html += '<span class="' + cls + '" style="animation-delay:' + Math.max(0, i - shownDots) * 30 + 'ms"></span>';
          }
        }
        dotsEl.innerHTML = html;
        shownDots = total;
        return extra;
      };

      var setSeats = function (n) {
        n = Math.max(team.included, Math.min(MAX_SEATS, n));
        if (n === team.seats && dotsEl.childElementCount) return;
        team.seats = n;
        output.textContent = n;
        countEl.textContent = n;
        cta.textContent = "Start with " + n + " seats";
        dec.disabled = n <= team.included;
        inc.disabled = n >= MAX_SEATS;
        drawDots();
        render(true);
      };

      // Hold a button to keep stepping, getting faster the longer it's held.
      var holdTimer = null;
      var stopHold = function () { clearTimeout(holdTimer); holdTimer = null; };
      var startHold = function (step) {
        var delay = 380;
        var tick = function () {
          setSeats(team.seats + step);
          delay = Math.max(45, delay * 0.78);
          holdTimer = setTimeout(tick, delay);
        };
        holdTimer = setTimeout(tick, delay);
      };

      [dec, inc].forEach(function (btn) {
        var step = +btn.dataset.step;
        btn.addEventListener("pointerdown", function (e) {
          if (e.button !== 0) return;
          setSeats(team.seats + step);
          startHold(step);
          btn.setPointerCapture && btn.setPointerCapture(e.pointerId);
        });
        btn.addEventListener("pointerup", stopHold);
        btn.addEventListener("pointercancel", stopHold);
        btn.addEventListener("lostpointercapture", stopHold);
        // Keyboard (Enter / Space) still fires click, with no pointerdown.
        btn.addEventListener("click", function (e) {
          if (e.detail === 0) setSeats(team.seats + step);
        });
      });

      team.seats = team.included;
      drawDots();
      dec.disabled = true;
    }

    render(false);

    /* ---------------------- Spotlight ---------------------- */
    var grid = pricing.querySelector("[data-ui-plans]");
    var cards = grid.querySelectorAll(".ui-plan");
    var raf = 0;
    var pointer = { x: 0, y: 0 };

    var paint = function () {
      raf = 0;
      cards.forEach(function (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", pointer.x - r.left + "px");
        card.style.setProperty("--my", pointer.y - r.top + "px");
      });
    };

    grid.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      grid.classList.add("is-pointing");
      if (!raf) raf = requestAnimationFrame(paint);
    });
    grid.addEventListener("pointerleave", function () { grid.classList.remove("is-pointing"); });

    /* ---------------------- Enterprise inquiry ---------------------- */
    var inquire = pricing.querySelector("[data-inquire]");
    var addon = pricing.querySelector("[data-ui-addon]");
    var addonToggle = pricing.querySelector("[data-addon-toggle]");
    if (inquire && addonToggle) {
      var baseHref = inquire.getAttribute("href").split("&body=")[0];
      var updateInquiry = function () {
        var on = addonToggle.checked;
        addon.classList.toggle("is-on", on);
        var body = "Hi, we'd like a quote for the Enterprise plan." +
          (on ? "\n\nPlease include the AI agent integration add-on." : "") +
          "\n\nOrganisation:\nApproximate number of users:\n";
        inquire.setAttribute("href", baseHref + "&body=" + encodeURIComponent(body));
      };
      addonToggle.addEventListener("change", updateInquiry);
      updateInquiry();
    }
  }

  /* ------------------------------------------------------------------------
     FAQ: only one panel open at a time
     ------------------------------------------------------------------------ */
  document.querySelectorAll("[data-ui-accordion]").forEach(function (list) {
    var items = Array.prototype.slice.call(list.querySelectorAll(".ui-faq__item"));
    var triggers = items.map(function (item) { return item.querySelector(".ui-faq__trigger"); });

    function setOpen(item, open) {
      var btn = item.querySelector(".ui-faq__trigger");
      var panel = item.querySelector(".ui-faq__panel");
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      panel.inert = !open;
    }

    items.forEach(function (item) { setOpen(item, item.classList.contains("is-open")); });

    triggers.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        var willOpen = !items[i].classList.contains("is-open");
        items.forEach(function (item, j) { setOpen(item, j === i && willOpen); });
      });

      // Arrow keys, Home and End move between questions.
      btn.addEventListener("keydown", function (e) {
        var to = null;
        if (e.key === "ArrowDown") to = (i + 1) % triggers.length;
        else if (e.key === "ArrowUp") to = (i - 1 + triggers.length) % triggers.length;
        else if (e.key === "Home") to = 0;
        else if (e.key === "End") to = triggers.length - 1;
        if (to === null) return;
        e.preventDefault();
        triggers[to].focus();
      });
    });
  });
})();
