# Discount Apply Button

A discount code field with an Apply button that feels rewarding to use:

- **Hover:** a gold shimmer travels around the border while a soft glow breathes in and out, a quiet "something's about to happen" cue. The button also lifts 1px.
- **Click:** the label gives way to a small spinner while the code is checked.
- **Success:**
  - The button squashes and springs back, turns green and draws a ✓ with "Applied".
  - A sweep of light crosses it, and confetti and twinkling sparkles burst from the button.
  - A message confirms the discount.
- **Invalid code:** the button gives a short shake, and the field outline and message turn red.
- **Price interaction:** as the confetti goes off, a stream of glowing gold sparks arcs from the button to the Estimated total. When the first spark lands:
  - the total pops and glows
  - the old price slides up and a line is drawn through it
  - the new price counts down to the discounted amount in green
  - "You saved $457.00 AUD with WELCOME10" fades in
- **Changing codes:** applying a second code recalculates from the original price.
- **Editing:** changing the code afterwards resets the button to "Apply".
- **Reduced motion:** with it turned on, the states still change but nothing moves.

Plain HTML, CSS and vanilla JS. The confetti is drawn on a temporary canvas that removes itself when it finishes. Classes are prefixed `ui-discount`.

Open `index.html` for the demo. It uses a cart drawer footer. Try `WELCOME10` or `VIP20`; any other code shows the error.

## Markup

```html
<form class="ui-discount" data-ui-discount novalidate>
  <label class="ui-discount__sr" for="ui-discount-code">Discount code</label>
  <div class="ui-discount__row">
    <input class="ui-discount__input" id="ui-discount-code" name="discount" type="text" placeholder="Discount code" autocomplete="off" autocapitalize="characters" spellcheck="false">
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
```

## Estimated total

```html
<div class="ui-discount-total" data-ui-discount-total data-amount="4570.00" data-currency="AUD" data-locale="en-AU" aria-live="polite">
  <s class="ui-discount-total__was" aria-hidden="true"></s>
  <strong class="ui-discount-total__now">$4,570.00 AUD</strong>
</div>
<p class="ui-discount-total__saved" data-ui-discount-savings></p>
```

- `data-amount` is the undiscounted total as a plain number.
- `data-currency` and `data-locale` control the formatting. Add `data-show-code="false"` to drop the "AUD" suffix.
- The script finds `[data-ui-discount-total]` on the page. To point it elsewhere, add `data-ui-discount-total="#your-selector"` to the form.
- The savings line is optional.

## Checking codes for real

By default a demo checker accepts `WELCOME10` and `VIP20`. To plug in your own, define this before or after loading `script.js`:

```js
window.uiDiscountValidate = function (code) {
  // Return a Promise of { ok: true|false, message: "...", percent: 10 } or { ..., amount: 50 }
  return fetch(...).then(...);
};
```

On success the form fires a bubbling `ui-discount:applied` event with `detail = { code, result }`. The upcoming price animation will listen for it.

`window.uiDiscountBurst(element)` fires the confetti from any element, if you want it elsewhere.

## Tokens

Set these on `.ui-discount`.

| Token | Default | Purpose |
| --- | --- | --- |
| `--ui-discount-font` | `"Work Sans", …` | Font family |
| `--ui-discount-btn-bg` / `--ui-discount-btn-fg` | `#2A2622` / `#F7F3EC` | Button colours |
| `--ui-discount-field-border` | `#C9AE92` | Field outline |
| `--ui-discount-glow` / `--ui-discount-glow-light` | `#D9B77A` / `#FFF1CF` | Hover shimmer and glow |
| `--ui-discount-success` | `#4F6B45` | Applied state |
| `--ui-discount-error` | `#A5432F` | Error state |
| `--ui-discount-radius` | `8px` | Corner radius |
| `--ui-discount-height` | `44px` | Field and button height |
