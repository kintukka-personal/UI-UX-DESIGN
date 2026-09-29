/* UI Discount — behaviour for every [data-ui-discount] form.

   Checking a code: set window.uiDiscountValidate = function (code) { ... }
   returning a Promise of { ok: true|false, message: "..." }. Without it, a demo
   validator accepts WELCOME10 and VIP20.

   On success the form fires "ui-discount:applied" (bubbles) with
   detail = { code, result }, so a cart total can react to it. */
(function () {
  var DEMO_CODES = {
    WELCOME10: { ok: true, percent: 10, message: "WELCOME10 applied: 10% off your order" },
    VIP20: { ok: true, percent: 20, message: "VIP20 applied: 20% off your order" }
  };

  function demoValidate(code) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(DEMO_CODES[code] || { ok: false, message: "“" + code + "” isn’t a valid code. Check the spelling and try again." });
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
