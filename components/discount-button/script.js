/* UI Discount — behaviour for every [data-ui-discount] form.

   Checking a code: set window.uiDiscountValidate = function (code) { ... }
   returning a Promise of { ok: true|false, message: "..." }. Without it, a demo
   validator accepts WELCOME10 and VIP20.

   A result can carry { percent: 10 } or { amount: 50 } (money off).

   Price interaction: mark the total with data-ui-discount-total and
   data-amount="4570.00" (plus optional data-currency / data-locale). On
   success, gold sparks fly from the button to the total; when they land,
   the old price is struck through and the new one counts down into place.

   On success the form fires "ui-discount:applied" (bubbles) with
   detail = { code, result }. */
(function () {
  var DEMO_CODES = {
    WELCOME10: { ok: true, percent: 10, message: "WELCOME10 applied: 10% off your order" },
    VIP20: { ok: true, percent: 20, message: "VIP20 applied: 20% off your order" }
  };

  function demoValidate(code) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(DEMO_CODES[code] || { ok: false, message: "“" + code + "” isn’t a valid code. Please try again." });
      }, 900);
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- Confetti + sparkles ------------------------------------------- */

  var COLORS = ["#D9B77A", "#F1DDB0", "#FFF8EA", "#C98B6B", "#2A2622", "#E9C98F"];

  function burst(fromEl) {
    if (reduceMotion.matches) return;
    var rect = fromEl.getBoundingClientRect();
    var ox = rect.left + rect.width / 2;
    var oy = rect.top + rect.height / 2;

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000";
    document.body.appendChild(canvas);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    var parts = [];
    var i, a, v;
    // Confetti: a fan shooting up and out of the button
    for (i = 0; i < 70; i++) {
      a = (-90 + (Math.random() - 0.5) * 150) * Math.PI / 180;
      v = 5 + Math.random() * 8;
      parts.push({
        kind: "paper",
        x: ox + (Math.random() - 0.5) * rect.width * 0.6,
        y: oy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 2,
        w: 4 + Math.random() * 5,
        h: 7 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        tilt: Math.random() * Math.PI,
        vt: 0.08 + Math.random() * 0.12,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 0,
        max: 90 + Math.random() * 50
      });
    }
    // Sparkles: four-point stars that twinkle close to the button
    for (i = 0; i < 16; i++) {
      a = Math.random() * Math.PI * 2;
      v = 1.5 + Math.random() * 3.5;
      parts.push({
        kind: "spark",
        x: ox + Math.cos(a) * rect.width * 0.3,
        y: oy + Math.sin(a) * rect.height * 0.3,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 1,
        r: 4 + Math.random() * 6,
        color: Math.random() < 0.5 ? "#FFF1CF" : "#D9B77A",
        life: 0,
        max: 45 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2
      });
    }

    function star(x, y, r) {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.quadraticCurveTo(x, y, x, y + r);
      ctx.quadraticCurveTo(x, y, x - r, y);
      ctx.quadraticCurveTo(x, y, x, y - r);
      ctx.fill();
    }

    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = 0;
      for (var k = 0; k < parts.length; k++) {
        var p = parts[k];
        p.life++;
        if (p.life > p.max) continue;
        alive++;
        var fade = Math.min(1, (p.max - p.life) / 25);
        if (p.kind === "paper") {
          p.vy += 0.22;
          p.vx *= 0.985;
          p.vy *= 0.985;
          p.x += p.vx + Math.sin(p.tilt) * 0.6;
          p.y += p.vy;
          p.rot += p.vr;
          p.tilt += p.vt;
          ctx.save();
          ctx.globalAlpha = fade;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.cos(p.tilt));
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        } else {
          p.vx *= 0.94;
          p.vy = p.vy * 0.94 + 0.03;
          p.x += p.vx;
          p.y += p.vy;
          var tw = 0.55 + 0.45 * Math.sin(p.life * 0.35 + p.phase);
          ctx.globalAlpha = fade * tw;
          ctx.fillStyle = p.color;
          star(p.x, p.y, p.r * (0.6 + 0.4 * tw));
          ctx.globalAlpha = 1;
        }
      }
      if (alive) requestAnimationFrame(frame);
      else canvas.remove();
    }
    requestAnimationFrame(frame);
  }


  /* ---- Sparks that fly from the button to the total ------------------- */

  function stream(fromEl, toEl, onHit) {
    var from = fromEl.getBoundingClientRect();
    var to = toEl.getBoundingClientRect();

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483001";
    document.body.appendChild(canvas);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    var sparks = [];
    var bits = [];
    var hit = false;
    var start = performance.now();
    var i;

    for (i = 0; i < 18; i++) {
      var x0 = from.left + from.width * (0.2 + Math.random() * 0.6);
      var y0 = from.top + from.height * (0.2 + Math.random() * 0.6);
      var x2 = to.left + to.width * (0.15 + Math.random() * 0.7);
      var y2 = to.top + to.height * (0.3 + Math.random() * 0.4);
      var mx = (x0 + x2) / 2, my = (y0 + y2) / 2;
      var dx = x2 - x0, dy = y2 - y0;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var bend = (Math.random() - 0.5) * 2 * Math.min(160, len * 0.6);
      sparks.push({
        x0: x0, y0: y0, x2: x2, y2: y2,
        // control point: bowed sideways and lifted, so each spark arcs
        cx: mx + (-dy / len) * bend,
        cy: my + (dx / len) * bend - 40 - Math.random() * 60,
        delay: i === 0 ? 0 : Math.random() * 260,
        dur: 720 + Math.random() * 260,
        r: 2 + Math.random() * 2,
        color: Math.random() < 0.6 ? "#E9C98F" : "#FFF1CF",
        trail: [],
        done: false
      });
    }
    sparks[0].dur = 720;

    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

    function frame(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = 0;

      for (var k = 0; k < sparks.length; k++) {
        var sp = sparks[k];
        var t = (now - start - sp.delay) / sp.dur;
        if (t < 0) { alive++; continue; }
        if (sp.done && !sp.trail.length) continue;
        alive++;

        if (!sp.done) {
          var e = ease(Math.min(1, t));
          var u = 1 - e;
          var x = u * u * sp.x0 + 2 * u * e * sp.cx + e * e * sp.x2;
          var y = u * u * sp.y0 + 2 * u * e * sp.cy + e * e * sp.y2;
          sp.trail.push([x, y]);
          if (sp.trail.length > 10) sp.trail.shift();
          if (t >= 1) {
            sp.done = true;
            if (!hit) { hit = true; onHit(); }
            for (var b = 0; b < 4; b++) {
              var a = Math.random() * Math.PI * 2;
              bits.push({ x: sp.x2, y: sp.y2, vx: Math.cos(a) * (1 + Math.random() * 2), vy: Math.sin(a) * (1 + Math.random() * 2) - 0.5, life: 0, max: 22 + Math.random() * 14, r: 3 + Math.random() * 3 });
            }
          }
        } else {
          sp.trail.shift();
        }

        // trail
        for (var j = 1; j < sp.trail.length; j++) {
          ctx.globalAlpha = (j / sp.trail.length) * 0.55;
          ctx.strokeStyle = sp.color;
          ctx.lineWidth = sp.r * (j / sp.trail.length) * 1.4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(sp.trail[j - 1][0], sp.trail[j - 1][1]);
          ctx.lineTo(sp.trail[j][0], sp.trail[j][1]);
          ctx.stroke();
        }
        // glowing head
        if (!sp.done && sp.trail.length) {
          var h = sp.trail[sp.trail.length - 1];
          ctx.globalAlpha = 1;
          ctx.shadowColor = "#D9B77A";
          ctx.shadowBlur = 12;
          ctx.fillStyle = sp.color;
          ctx.beginPath();
          ctx.arc(h[0], h[1], sp.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // little twinkles where sparks land
      for (var q = 0; q < bits.length; q++) {
        var p = bits[q];
        if (p.life++ > p.max) continue;
        alive++;
        p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92;
        var f = 1 - p.life / p.max;
        ctx.globalAlpha = f;
        ctx.fillStyle = "#FFF1CF";
        var r = p.r * f;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r);
        ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r);
        ctx.quadraticCurveTo(p.x, p.y, p.x - r, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (alive) requestAnimationFrame(frame);
      else canvas.remove();
    }
    requestAnimationFrame(frame);
  }

  /* ---- Updating the total -------------------------------------------- */

  function formatter(el) {
    var currency = el.dataset.currency || "AUD";
    var locale = el.dataset.locale || "en-AU";
    var nf;
    try { nf = new Intl.NumberFormat(locale, { style: "currency", currency: currency, currencyDisplay: "narrowSymbol" }); }
    catch (err) { nf = new Intl.NumberFormat(locale, { style: "currency", currency: currency }); }
    var suffix = el.dataset.showCode === "false" ? "" : " " + currency;
    return function (v) { return nf.format(v) + suffix; };
  }

  function discounted(base, result) {
    if (result.percent) return Math.max(0, Math.round(base * (100 - result.percent)) / 100);
    if (result.amount) return Math.max(0, Math.round((base - result.amount) * 100) / 100);
    return base;
  }

  function updateTotal(totalEl, code, result) {
    var base = parseFloat(totalEl.dataset.amount);
    if (isNaN(base)) return;
    var fmt = formatter(totalEl);
    var nowEl = totalEl.querySelector(".ui-discount-total__now") || totalEl;
    var wasEl = totalEl.querySelector(".ui-discount-total__was");
    var savedEl = document.querySelector("[data-ui-discount-savings]");
    var from = parseFloat(totalEl.dataset.current || base);
    var to = discounted(base, result);
    totalEl.dataset.current = to;

    if (wasEl) wasEl.textContent = fmt(base);
    totalEl.classList.add("is-discounted");
    totalEl.classList.remove("is-hit");
    void totalEl.offsetWidth;
    totalEl.classList.add("is-hit");

    if (savedEl) {
      savedEl.textContent = "You saved " + fmt(base - to) + " with " + code;
      savedEl.classList.add("is-shown");
    }

    // Count down to the new total
    var dur = reduceMotion.matches ? 1 : 700;
    var t0 = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      nowEl.textContent = fmt(from + (to - from) * e);
      if (t < 1) requestAnimationFrame(tick);
      else nowEl.textContent = fmt(to);
    }
    requestAnimationFrame(tick);
  }

  /* ---- Form behaviour ------------------------------------------------ */

  function init(form) {
    if (form.dataset.uiDiscountReady) return;
    form.dataset.uiDiscountReady = "true";

    var input = form.querySelector(".ui-discount__input");
    var btn = form.querySelector(".ui-discount__btn");
    var msg = form.querySelector(".ui-discount__msg");
    if (!input || !btn) return;

    function setState(state, text) {
      form.classList.remove("is-loading", "is-success", "is-error");
      if (state) form.classList.add("is-" + state);
      btn.setAttribute("aria-busy", state === "loading" ? "true" : "false");
      if (msg) {
        msg.textContent = text || "";
        msg.classList.toggle("is-shown", !!text);
      }
    }

    function restartAnimation() {
      // Lets the shake/bounce replay when the same state repeats
      btn.style.animation = "none";
      void btn.offsetWidth;
      btn.style.animation = "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.classList.contains("is-loading")) return;
      if (form.classList.contains("is-success") && input.value.trim().toUpperCase() === form.dataset.appliedCode) return;

      var code = input.value.trim().toUpperCase();
      if (!code) {
        restartAnimation();
        setState("error", "Enter a discount code first.");
        input.focus();
        return;
      }

      setState("loading");
      var validate = window.uiDiscountValidate || demoValidate;
      Promise.resolve(validate(code)).then(function (result) {
        result = result || { ok: false };
        restartAnimation();
        if (result.ok) {
          form.dataset.appliedCode = code;
          setState("success", result.message || code + " applied");
          burst(btn);
          var totalEl = form.dataset.uiDiscountTotal
            ? document.querySelector(form.dataset.uiDiscountTotal)
            : document.querySelector("[data-ui-discount-total]");
          if (totalEl) {
            var target = totalEl.querySelector(".ui-discount-total__now") || totalEl;
            if (reduceMotion.matches) updateTotal(totalEl, code, result);
            else setTimeout(function () { stream(btn, target, function () { updateTotal(totalEl, code, result); }); }, 160);
          }
          form.dispatchEvent(new CustomEvent("ui-discount:applied", { bubbles: true, detail: { code: code, result: result } }));
        } else {
          setState("error", result.message || "That code couldn’t be applied.");
        }
      }, function () {
        restartAnimation();
        setState("error", "Something went wrong. Please try again.");
      });
    });

    // Editing the field after a result puts the button back to "Apply"
    input.addEventListener("input", function () {
      if (form.classList.contains("is-error") || (form.classList.contains("is-success") && input.value.trim().toUpperCase() !== form.dataset.appliedCode)) {
        setState(null);
      }
    });
  }

  function initAll() { document.querySelectorAll("[data-ui-discount]").forEach(init); }

  window.uiDiscountBurst = burst;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
