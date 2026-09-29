# Discount Apply Button: Shopify package

Hand this whole file to ChatGPT (upload it, or paste it) together with the instructions below.

## Instructions for ChatGPT

Please install this custom discount field and animated estimated total into my Shopify theme's cart (cart drawer and cart page).

1. Create these 5 files with the exact code below:
   - `assets/ui-discount.css`
   - `assets/ui-discount.js`
   - `assets/ui-discount-shopify.js`
   - `snippets/ui-discount.liquid`
   - `snippets/ui-discount-total.liquid`
2. In the cart drawer (usually `snippets/cart-drawer.liquid`) and on the cart page (usually `sections/main-cart-footer.liquid`), make these changes:
   - Replace the theme's existing discount code field and button (if there is one) with `{% render 'ui-discount' %}`. It needs to sit inside the cart footer, not inside the theme's own checkout `<form>`.
   - Replace the theme's "Estimated total" amount with `{% render 'ui-discount-total' %}`. Keep the "Estimated total" label to its left, in a flex row with `justify-content: space-between; align-items: flex-end`.
   - Move the "Duties and taxes included. Shipping is calculated at checkout." text so it sits directly under the Checkout button, centred.
3. Discounts are applied through Shopify's Cart AJAX API (`POST /cart/update.js` with `{"discount": "CODE"}`). If the theme's own cart JavaScript re-renders the drawer after a discount change, that's fine: the script re-initialises automatically. After each change, it also fires a `ui-discount:cart` event on `document` with the updated cart JSON, which the theme can use to refresh anything else (for example a cart page subtotal).
4. Do not change the code inside the five files except where these instructions say so.

---

## 1. `assets/ui-discount.css`

```css
/* ==========================================================================
   UI Discount — code field + celebratory Apply button
   Hover:   a gold shimmer travels around the border and a soft glow breathes.
   Loading: the label gives way to a small spinner.
   Success: the button squashes and springs, a check draws in, confetti bursts.
   Error:   a short shake and a message under the field.
   ========================================================================== */

@property --ui-discount-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

.ui-discount {
  --ui-discount-font: "Work Sans", "Helvetica Neue", Arial, sans-serif;
  --ui-discount-btn-bg: #2A2622;
  --ui-discount-btn-fg: #F7F3EC;
  --ui-discount-field-bg: transparent;
  --ui-discount-field-fg: #2A2622;
  --ui-discount-field-border: #C9AE92;
  --ui-discount-muted: #9A8E80;
  --ui-discount-glow: #D9B77A;
  --ui-discount-glow-light: #FFF1CF;
  --ui-discount-success: #4F6B45;
  --ui-discount-error: #A5432F;
  --ui-discount-radius: 8px;
  --ui-discount-height: 44px;

  margin: 0;
  font-family: var(--ui-discount-font);
}

.ui-discount__row {
  display: flex;
  gap: 12px;
}

.ui-discount__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ---- Field ------------------------------------------------------------- */

.ui-discount__input {
  flex: 1;
  min-width: 0;
  height: var(--ui-discount-height);
  margin: 0;
  padding: 0 14px;
  box-sizing: border-box;
  border: 1px solid var(--ui-discount-field-border);
  border-radius: var(--ui-discount-radius);
  box-shadow: none;
  background: var(--ui-discount-field-bg);
  color: var(--ui-discount-field-fg);
  font: 400 15px/1 var(--ui-discount-font);
  letter-spacing: 0.02em;
  transition: border-color 250ms ease, box-shadow 250ms ease;
  -webkit-appearance: none;
  appearance: none;
}

.ui-discount__input::placeholder { color: var(--ui-discount-muted); opacity: 1; }
.ui-discount__input:not(:placeholder-shown) { text-transform: uppercase; letter-spacing: 0.06em; }

.ui-discount__input:focus {
  outline: none;
  border-color: var(--ui-discount-field-fg);
  box-shadow: 0 0 0 3px rgba(217, 183, 122, 0.25);
}

.ui-discount.is-error .ui-discount__input {
  border-color: var(--ui-discount-error);
  box-shadow: 0 0 0 3px rgba(165, 67, 47, 0.12);
}

.ui-discount.is-success .ui-discount__input { border-color: var(--ui-discount-success); }

/* ---- Button ------------------------------------------------------------ */

.ui-discount__btn {
  position: relative;
  isolation: isolate;
  display: inline-grid;
  place-items: center;
  flex: none;
  min-width: 92px;
  height: var(--ui-discount-height);
  margin: 0;
  padding: 0 24px;
  border: 0;
  border-radius: var(--ui-discount-radius);
  box-shadow: none;
  background: var(--ui-discount-btn-bg);
  color: var(--ui-discount-btn-fg);
  font: 500 16px/1 var(--ui-discount-font);
  letter-spacing: 0.01em;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1), background-color 400ms ease;
}

.ui-discount__btn > * { grid-area: 1 / 1; }

/* Travelling shimmer on the border */
.ui-discount__btn::before {
  content: "";
  position: absolute;
  inset: -2px;
  z-index: 1;
  padding: 2px;
  border-radius: calc(var(--ui-discount-radius) + 2px);
  background: conic-gradient(
    from var(--ui-discount-angle),
    transparent 0deg,
    transparent 200deg,
    var(--ui-discount-glow) 280deg,
    var(--ui-discount-glow-light) 320deg,
    var(--ui-discount-glow) 345deg,
    transparent 360deg
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  opacity: 0;
  pointer-events: none;
  transition: opacity 400ms ease;
  animation: ui-discount-orbit 2.6s linear infinite;
  animation-play-state: paused;
}

/* Soft breathing glow */
.ui-discount__btn::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  box-shadow: 0 0 0 0 rgba(217, 183, 122, 0);
  pointer-events: none;
}

@media (hover: hover) {
  .ui-discount__btn:hover:not(:disabled) { transform: translateY(-1px); }
  .ui-discount__btn:hover:not(:disabled)::before { opacity: 1; animation-play-state: running; }
  .ui-discount__btn:hover:not(:disabled)::after { animation: ui-discount-breathe 1.8s ease-in-out infinite; }
}

.ui-discount__btn:focus { outline: none; }
.ui-discount__btn:focus-visible::before { opacity: 1; animation-play-state: running; }
.ui-discount__btn:focus-visible { box-shadow: 0 0 0 3px rgba(217, 183, 122, 0.35); }

.ui-discount__btn:active:not(:disabled) { transform: scale(0.96); transition-duration: 80ms; }

@keyframes ui-discount-orbit {
  to { --ui-discount-angle: 360deg; }
}

@keyframes ui-discount-breathe {
  0%, 100% { box-shadow: 0 0 0 0 rgba(217, 183, 122, 0.0), 0 4px 14px -6px rgba(217, 183, 122, 0.35); }
  50%      { box-shadow: 0 0 0 4px rgba(217, 183, 122, 0.14), 0 6px 22px -4px rgba(217, 183, 122, 0.55); }
}

/* Label, spinner and check share the same spot */
.ui-discount__label,
.ui-discount__spinner,
.ui-discount__done {
  transition: opacity 250ms ease, transform 350ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ui-discount__spinner {
  width: 18px;
  height: 18px;
  border: 1.5px solid rgba(247, 243, 236, 0.25);
  border-top-color: currentColor;
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.6);
  animation: ui-discount-spin 700ms linear infinite;
}

.ui-discount__done {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  opacity: 0;
  transform: translateY(6px);
  white-space: nowrap;
}

.ui-discount__done svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ui-discount__done path {
  stroke-dasharray: 22;
  stroke-dashoffset: 22;
}

@keyframes ui-discount-spin { to { rotate: 360deg; } }

/* Loading */
.ui-discount.is-loading .ui-discount__btn { cursor: progress; }
.ui-discount.is-loading .ui-discount__label { opacity: 0; transform: translateY(-6px); }
.ui-discount.is-loading .ui-discount__spinner { opacity: 1; transform: scale(1); }

/* Success */
.ui-discount.is-success .ui-discount__btn {
  background: var(--ui-discount-success);
  animation: ui-discount-bounce 750ms cubic-bezier(0.3, 1.4, 0.5, 1) both;
}
.ui-discount.is-success .ui-discount__label { opacity: 0; transform: translateY(-6px); }
.ui-discount.is-success .ui-discount__done { opacity: 1; transform: none; }
.ui-discount.is-success .ui-discount__done path {
  transition: stroke-dashoffset 450ms cubic-bezier(0.65, 0, 0.35, 1) 180ms;
  stroke-dashoffset: 0;
}

/* A sweep of light across the button on success */
.ui-discount__shine {
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
}
.ui-discount__shine::before {
  content: "";
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: -40%;
  width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255, 244, 214, 0.55), transparent);
  transform: translateX(0) skewX(-18deg);
  opacity: 0;
}
.ui-discount.is-success .ui-discount__shine::before {
  animation: ui-discount-shine 900ms ease 120ms both;
}

@keyframes ui-discount-bounce {
  0%   { transform: scale(1, 1); }
  18%  { transform: scale(1.12, 0.86); }
  38%  { transform: scale(0.92, 1.1); }
  56%  { transform: scale(1.05, 0.96); }
  74%  { transform: scale(0.98, 1.02); }
  100% { transform: scale(1, 1); }
}

@keyframes ui-discount-shine {
  0%   { opacity: 0; transform: translateX(0) skewX(-18deg); }
  20%  { opacity: 1; }
  100% { opacity: 0; transform: translateX(380%) skewX(-18deg); }
}

/* Error */
.ui-discount.is-error .ui-discount__btn { animation: ui-discount-shake 360ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }

@keyframes ui-discount-shake {
  20%, 80% { transform: translateX(-1px); }
  40%      { transform: translateX(2px); }
  60%      { transform: translateX(-2px); }
}

/* ---- Message ----------------------------------------------------------- */

.ui-discount__msg {
  min-height: 1.4em;
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: 0.01em;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 300ms ease, transform 300ms ease;
}

.ui-discount__msg.is-shown { opacity: 1; transform: none; }
.ui-discount.is-error .ui-discount__msg { color: var(--ui-discount-error); }
.ui-discount.is-success .ui-discount__msg { color: var(--ui-discount-success); }

/* Success text is announced to screen readers; the tag shows it visually */
.ui-discount.is-success .ui-discount__msg,
.ui-discount__msg.is-quiet {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* ---- Applied-code tag -------------------------------------------------- */

.ui-discount__applied {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 4px 4px 4px 10px;
  border-radius: 999px;
  background: rgba(79, 107, 69, 0.1);
  color: var(--ui-discount-success);
  font: 500 12px/1 var(--ui-discount-font);
  letter-spacing: 0.06em;
  opacity: 0;
  transform: scale(0.85);
  transform-origin: 0 50%;
  transition: opacity 250ms ease, transform 300ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ui-discount__applied.is-shown {
  opacity: 1;
  transform: none;
  transition:
    opacity 400ms ease 350ms,
    transform 600ms cubic-bezier(0.3, 1.5, 0.5, 1) 350ms;
}

.ui-discount__applied[hidden] { display: none; }
.ui-discount__applied:not([hidden]) + .ui-discount__msg:empty { min-height: 0; margin: 0; }

.ui-discount__applied-icon svg {
  display: block;
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.3;
  stroke-linejoin: round;
}

.ui-discount__applied-note {
  font-weight: 400;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.ui-discount__remove {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  min-width: 0;
  min-height: 0;
  margin: 0 0 0 2px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  box-shadow: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 200ms ease, transform 250ms ease;
}

.ui-discount__remove svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.ui-discount__remove:hover { background: rgba(79, 107, 69, 0.18); transform: rotate(90deg); }
.ui-discount__remove:focus { outline: none; }
.ui-discount__remove:focus-visible { outline: 1px solid currentColor; outline-offset: 1px; }
.ui-discount__remove:disabled { opacity: 0.5; cursor: progress; }

/* ---- Estimated total ---------------------------------------------------- */

.ui-discount-total {
  display: grid;
  justify-items: end;
  font-variant-numeric: tabular-nums;
}

.ui-discount-total__was {
  display: block;
  max-height: 0;
  overflow: hidden;
  color: var(--ui-discount-muted, #9A8E80);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.4;
  text-decoration: none;
  opacity: 0;
  /* the strike line is drawn in once the new price lands */
  background: linear-gradient(currentColor, currentColor) left 55% / 0 1px no-repeat;
  transition: max-height 400ms ease, opacity 400ms ease, background-size 500ms cubic-bezier(0.65, 0, 0.35, 1) 250ms;
}

.ui-discount-total.is-discounted .ui-discount-total__was {
  max-height: 1.6em;
  opacity: 1;
  background-size: 100% 1px;
}

.ui-discount-total__now {
  display: inline-block;
  transform-origin: 100% 50%;
  transition: color 500ms ease;
}

.ui-discount-total.is-discounted .ui-discount-total__now { color: var(--ui-discount-success, #4F6B45); }

.ui-discount-total.is-hit .ui-discount-total__now {
  animation: ui-discount-pop 650ms cubic-bezier(0.3, 1.5, 0.5, 1) both;
}

@keyframes ui-discount-pop {
  0%   { transform: scale(1); text-shadow: 0 0 0 rgba(217, 183, 122, 0); }
  30%  { transform: scale(1.12); text-shadow: 0 0 14px rgba(217, 183, 122, 0.9); }
  100% { transform: scale(1); text-shadow: 0 0 0 rgba(217, 183, 122, 0); }
}

.ui-discount-total__saved {
  margin: 0;
  color: var(--ui-discount-success, #4F6B45);
  font-size: 13px;
  text-align: right;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity 400ms ease 300ms, transform 400ms ease 300ms;
}

.ui-discount-total__saved.is-shown { opacity: 1; transform: none; }

/* ---- Reduced motion ---------------------------------------------------- */

@media (prefers-reduced-motion: reduce) {
  .ui-discount-total *,
  .ui-discount *,
  .ui-discount *::before,
  .ui-discount *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0s !important;
  }
}

/* Once applied, the button rests: no shimmer or glow */
.ui-discount.is-success .ui-discount__btn::before,
.ui-discount.is-loading .ui-discount__btn::before { opacity: 0 !important; }
.ui-discount.is-success .ui-discount__btn::after,
.ui-discount.is-loading .ui-discount__btn::after { animation: none !important; }
```

## 2. `assets/ui-discount.js`

```js
/* UI Discount — behaviour for every [data-ui-discount] form.

   Checking a code: set window.uiDiscountValidate = function (code) { ... }
   returning a Promise of { ok: true|false, message: "..." }. Without it, a demo
   validator accepts WELCOME10 and VIP20.

   A result can carry { percent: 10 } or { amount: 50 } (money off).

   Price interaction: mark the total with data-ui-discount-total and
   data-amount="4570.00" (plus optional data-currency / data-locale). On
   success, gold sparks fly from the button to the total; when they land,
   the old price is struck through and the new one counts down into place.

   The applied code appears as a small tag under the field with a remove
   (x) button. Removing it counts the total back up. For a real store, set
   window.uiDiscountRemove = function (code) { ... } returning a Promise.

   Events (bubble from the form): "ui-discount:applied" with
   detail = { code, result }, and "ui-discount:removed" with detail = { code }. */
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

  function formatter(el, noCode) {
    var currency = el.dataset.currency || "AUD";
    var locale = el.dataset.locale || "en-AU";
    var nf;
    try { nf = new Intl.NumberFormat(locale, { style: "currency", currency: currency, currencyDisplay: "narrowSymbol" }); }
    catch (err) { nf = new Intl.NumberFormat(locale, { style: "currency", currency: currency }); }
    var suffix = noCode || el.dataset.showCode === "false" ? "" : " " + currency;
    return function (v) { return nf.format(v) + suffix; };
  }

  function discounted(base, result) {
    if (typeof result.total === "number") return Math.max(0, result.total);
    if (result.percent) return Math.max(0, Math.round(base * (100 - result.percent)) / 100);
    if (result.amount) return Math.max(0, Math.round((base - result.amount) * 100) / 100);
    return base;
  }

  function updateTotal(totalEl, code, result) {
    if (typeof result.original === "number") totalEl.dataset.amount = result.original;
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


  function resetTotal(totalEl, result) {
    if (result && typeof result.total === "number") totalEl.dataset.amount = result.total;
    var base = parseFloat(totalEl.dataset.amount);
    if (isNaN(base)) return;
    var fmt = formatter(totalEl);
    var nowEl = totalEl.querySelector(".ui-discount-total__now") || totalEl;
    var savedEl = document.querySelector("[data-ui-discount-savings]");
    var from = parseFloat(totalEl.dataset.current || base);
    delete totalEl.dataset.current;
    totalEl.classList.remove("is-discounted", "is-hit");
    if (savedEl) savedEl.classList.remove("is-shown");

    // Count back up to the full price
    var dur = reduceMotion.matches ? 1 : 600;
    var t0 = performance.now();
    function tick(now) {
      var t = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      nowEl.textContent = fmt(from + (base - from) * e);
      if (t < 1) requestAnimationFrame(tick);
      else {
        nowEl.textContent = fmt(base);
        if (savedEl && !savedEl.classList.contains("is-shown")) savedEl.textContent = "";
      }
    }
    requestAnimationFrame(tick);
  }

  function chipLabel(result, totalEl) {
    if (result.label) return result.label;
    if (result.percent) return result.percent + "% off";
    var fmt = totalEl ? formatter(totalEl, true) : null;
    if (result.amount) return (fmt ? fmt(result.amount) : result.amount) + " off";
    if (typeof result.total === "number" && totalEl) {
      var base = typeof result.original === "number" ? result.original : parseFloat(totalEl.dataset.amount);
      if (!isNaN(base) && base > result.total) return fmt(base - result.total) + " off";
    }
    return "";
  }

  var TAG_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8.6 1.8H13a1.2 1.2 0 0 1 1.2 1.2v4.4a1.2 1.2 0 0 1-.35.85l-5.8 5.8a1.2 1.2 0 0 1-1.7 0l-4.4-4.4a1.2 1.2 0 0 1 0-1.7l5.8-5.8a1.2 1.2 0 0 1 .85-.35z"/><circle cx="11" cy="5" r="1"/></svg>';
  var X_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';

  /* ---- Form behaviour ------------------------------------------------ */

  function init(form) {
    if (form.dataset.uiDiscountReady) return;
    form.dataset.uiDiscountReady = "true";

    var input = form.querySelector(".ui-discount__input");
    var btn = form.querySelector(".ui-discount__btn");
    var msg = form.querySelector(".ui-discount__msg");
    if (!input || !btn) return;

    function findTotal() {
      return form.dataset.uiDiscountTotal
        ? document.querySelector(form.dataset.uiDiscountTotal)
        : document.querySelector("[data-ui-discount-total]");
    }

    // Applied-code tag with a remove button, created once
    var chip = form.querySelector(".ui-discount__applied");
    if (!chip) {
      chip = document.createElement("div");
      chip.className = "ui-discount__applied";
      chip.hidden = true;
      chip.innerHTML = '<span class="ui-discount__applied-icon">' + TAG_ICON + '</span>' +
        '<span class="ui-discount__applied-code"></span>' +
        '<span class="ui-discount__applied-note"></span>' +
        '<button class="ui-discount__remove" type="button">' + X_ICON + '</button>';
      var row = form.querySelector(".ui-discount__row");
      (row || input).insertAdjacentElement("afterend", chip);
    }
    var chipCode = chip.querySelector(".ui-discount__applied-code");
    var chipNote = chip.querySelector(".ui-discount__applied-note");
    var removeBtn = chip.querySelector(".ui-discount__remove");

    function showChip(code, result) {
      chipCode.textContent = code;
      var note = chipLabel(result, findTotal());
      chipNote.textContent = note ? "\u00B7 " + note : "";
      removeBtn.setAttribute("aria-label", "Remove discount " + code);
      chip.hidden = false;
      chip.classList.remove("is-shown");
      void chip.offsetWidth;
      chip.classList.add("is-shown");
    }

    function hideChip() {
      chip.classList.remove("is-shown");
      setTimeout(function () { if (!chip.classList.contains("is-shown")) chip.hidden = true; }, reduceMotion.matches ? 0 : 300);
    }

    if (form.dataset.appliedCode) {
      chipCode.textContent = form.dataset.appliedCode;
      chipNote.textContent = form.dataset.appliedLabel ? "\u00B7 " + form.dataset.appliedLabel : "";
      removeBtn.setAttribute("aria-label", "Remove discount " + form.dataset.appliedCode);
      chip.hidden = false;
      chip.classList.add("is-shown");
    }

    function setState(state, text) {
      form.classList.remove("is-loading", "is-success", "is-error");
      if (state) form.classList.add("is-" + state);
      btn.setAttribute("aria-busy", state === "loading" ? "true" : "false");
      if (msg) {
        msg.textContent = text || "";
        msg.classList.toggle("is-shown", !!text);
        msg.classList.remove("is-quiet");
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
          showChip(code, result);
          burst(btn);
          var totalEl = findTotal();
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

    // Remove the applied discount
    removeBtn.addEventListener("click", function () {
      var code = form.dataset.appliedCode;
      if (!code || removeBtn.disabled) return;
      removeBtn.disabled = true;
      var remove = window.uiDiscountRemove || function () { return true; };
      Promise.resolve(remove(code)).then(function (removed) {
        removeBtn.disabled = false;
        delete form.dataset.appliedCode;
        hideChip();
        setState(null);
        if (msg) { msg.textContent = code + " removed"; msg.classList.add("is-shown", "is-quiet"); }
        var totalEl = findTotal();
        if (totalEl) resetTotal(totalEl, removed);
        input.value = "";
        input.focus({ preventScroll: true });
        form.dispatchEvent(new CustomEvent("ui-discount:removed", { bubbles: true, detail: { code: code } }));
      }, function () {
        removeBtn.disabled = false;
        setState("error", "The discount couldn\u2019t be removed. Please try again.");
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

  // Themes often re-render the cart drawer; pick up any new forms automatically.
  function watch() {
    if (!window.MutationObserver) return;
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; initAll(); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.uiDiscountBurst = burst;

  function start() { initAll(); watch(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
```

## 3. `assets/ui-discount-shopify.js`

```js
/* UI Discount — Shopify connection.
   Load after ui-discount.js. Applies and removes codes on the real cart
   through Shopify's Cart AJAX API (/cart/update.js with "discount"), and
   hands the real totals Shopify calculates back to the button. */
(function () {
  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";

  function post(discount) {
    return fetch(root + "cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ discount: discount })
    }).then(function (res) {
      if (!res.ok) throw new Error("Cart update failed: " + res.status);
      return res.json();
    });
  }

  function appliedNow() {
    var form = document.querySelector("[data-ui-discount][data-applied-code]");
    return form ? form.getAttribute("data-applied-code") : "";
  }

  window.uiDiscountValidate = function (code) {
    var previous = appliedNow();
    return post(code).then(function (cart) {
      var match = (cart.discount_codes || []).filter(function (d) {
        return String(d.code).toUpperCase() === code;
      })[0];

      if (match && match.applicable) {
        document.dispatchEvent(new CustomEvent("ui-discount:cart", { detail: cart }));
        return {
          ok: true,
          message: code + " applied",
          total: cart.total_price / 100,
          original: cart.original_total_price / 100
        };
      }

      // Not valid (or not applicable to this cart): put the previous code back.
      return post(previous || "").then(function () {
        return { ok: false, message: "“" + code + "” isn’t a valid code. Please try again." };
      });
    });
  };

  window.uiDiscountRemove = function () {
    return post("").then(function (cart) {
      document.dispatchEvent(new CustomEvent("ui-discount:cart", { detail: cart }));
      return { total: cart.total_price / 100 };
    });
  };
})();
```

## 4. `snippets/ui-discount.liquid`

```liquid
{%- comment -%}
  UI Discount — discount code field + Apply button.
  Render where the discount field should appear: {% render 'ui-discount' %}
  Needs assets: ui-discount.css, ui-discount.js, ui-discount-shopify.js
{%- endcomment -%}

{%- assign applied = cart.discount_codes.first -%}

{{ 'ui-discount.css' | asset_url | stylesheet_tag }}

<form
  class="ui-discount"
  data-ui-discount
  novalidate
  {% if applied %}
    data-applied-code="{{ applied.code | upcase | escape }}"
    data-applied-label="{{ applied.amount | money }} off"
  {% endif %}
>
  <label class="ui-discount__sr" for="ui-discount-code-{{ section.id | default: 'cart' }}">Discount code</label>
  <div class="ui-discount__row">
    <input class="ui-discount__input" id="ui-discount-code-{{ section.id | default: 'cart' }}" name="discount" type="text" placeholder="Discount code" autocomplete="off" autocapitalize="characters" spellcheck="false">
    <button class="ui-discount__btn" type="submit">
      <span class="ui-discount__label">Apply</span>
      <span class="ui-discount__spinner" aria-hidden="true"></span>
      <span class="ui-discount__done" aria-hidden="true">
        <svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3.2L13 5"/></svg>Applied
      </span>
      <span class="ui-discount__shine" aria-hidden="true"></span>
    </button>
  </div>
  <p class="ui-discount__msg" role="status" aria-live="polite"></p>
</form>

<script src="{{ 'ui-discount.js' | asset_url }}" defer></script>
<script src="{{ 'ui-discount-shopify.js' | asset_url }}" defer></script>
```

## 5. `snippets/ui-discount-total.liquid`

```liquid
{%- comment -%}
  UI Discount — estimated total that the sparks fly to.
  Render in place of the theme's estimated total: {% render 'ui-discount-total' %}
{%- endcomment -%}

{%- liquid
  assign original = cart.original_total_price
  assign now = cart.total_price
  assign has_discount = false
  if cart.discount_codes.size > 0 and original > now
    assign has_discount = true
  endif
-%}

<div
  class="ui-discount-total{% if has_discount %} is-discounted{% endif %}"
  data-ui-discount-total
  data-amount="{{ original | divided_by: 100.0 }}"
  {% if has_discount %}data-current="{{ now | divided_by: 100.0 }}"{% endif %}
  data-currency="{{ cart.currency.iso_code }}"
  data-locale="{{ request.locale.iso_code }}"
  aria-live="polite"
>
  <s class="ui-discount-total__was" aria-hidden="true">{% if has_discount %}{{ original | money_with_currency }}{% endif %}</s>
  <strong class="ui-discount-total__now">{{ now | money_with_currency }}</strong>
</div>
<p class="ui-discount-total__saved{% if has_discount %} is-shown{% endif %}" data-ui-discount-savings>
  {%- if has_discount -%}You saved {{ original | minus: now | money_with_currency }} with {{ cart.discount_codes.first.code | upcase }}{%- endif -%}
</p>
```
