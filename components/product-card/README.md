# Product Card

An editorial product card where the product is the hero. A deep coloured stage holds a giant wordmark ("AURA"), and a cut-out product photo floats over the seam between the stage and a cream footer. The footer carries the price, colour swatches and a full-width "Add to bag" button.

- **Layout:**
  - Top row: back button, plus a bag button with a count badge.
  - Spec line: "Over-ear · Wireless" on the left, "40 h · −32 dB" on the right.
  - Wordmark: edge to edge, sitting behind the product.
  - Product: overlaps the bottom of the wordmark and crosses from the stage into the footer, over a soft contact shadow.
  - Footer: price on the left, swatches on the right, CTA underneath.
- **Colours:** picking Sage, Onyx or Oat crossfades the product photo and retints the stage, wordmark and button to match.
- **Add to bag:** the product lifts off the stage, shrinks and arcs into the bag icon in about 0.76s. When it lands:
  - the bag icon gives a little wobble
  - the badge counts up with a bump
  - the label flips to "✓ Added"
  - a screen-reader status announces it
  - the card fires a `ui-pcard:add` event

  0.23s after landing, the product regrows in place from a soft blur. Clicks during the flight are ignored. With reduced motion turned on, the item is counted straight away and nothing flies.
- **Motion:**
  - On first view, everything builds left to right with one move: each piece shoots out from behind the one before it, staying hidden until it clears it, then overshoots a touch, squashes and locks in. Each lock sets off the next piece, one every 95ms (tune it with `--ui-pcard-beat`).
  - The order is: the AURA letters, with the spec line alongside; then price, Sage, Onyx, Oat and Add to bag; and finally the product drops in. The word gives a small recoil on each letter's hit.
  - The product then floats gently, with its shadow breathing.
  - With a mouse, the product drifts slightly as the pointer moves while the wordmark stays still.
- **Reduced motion:** colour changes still happen, but nothing moves.
- **Scaling:** every size is derived from the card's width (390 design units through container query units), so the whole composition scales as one piece from a 320px phone up to the 430px max width.

Plain HTML, CSS and vanilla JS, no dependencies. Classes are prefixed `ui-pcard`. Open `index.html` for the demo, shown inside a phone frame.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Demo page: the card inside a phone frame with a status bar |
| `style.css` | Component styles and the three colourway themes |
| `script.js` | Swatches, add to bag, entrance and pointer parallax |
| `images/aura-*.webp` | Transparent product cut-outs, one per colourway (684 × 888) |
| `shopify/ui-pcard.liquid` | Shopify section: the card for a real product, with one block per colourway |
| `shopify/ui-pcard-shopify.js` | Shopify connection: variants, real add to cart, header cart count |

## Markup

```html
<article class="ui-pcard" data-ui-pcard data-colorway="sage">
  <div class="ui-pcard__inner">
    <div class="ui-pcard__stage" aria-hidden="true"></div>

    <header class="ui-pcard__bar">
      <button class="ui-pcard__icon" type="button" aria-label="Back">…</button>
      <button class="ui-pcard__icon" type="button" aria-label="Bag, 1 item" data-ui-pcard-bag>
        …<span class="ui-pcard__badge" aria-hidden="true">1</span>
      </button>
    </header>

    <p class="ui-pcard__specs"><span>Over-ear · Wireless</span><span>40 h · −32 dB</span></p>

    <h2 class="ui-pcard__title">
      <span aria-hidden="true">AURA</span>
      <span class="ui-pcard__sr">Aura Studio wireless headphones</span>
    </h2>

    <figure class="ui-pcard__media">
      <span class="ui-pcard__shadow" aria-hidden="true"></span>
      <span class="ui-pcard__float">
        <img class="ui-pcard__img is-active" data-colorway="sage" src="images/aura-sage.webp" alt="…">
        <img class="ui-pcard__img" data-colorway="onyx" src="images/aura-onyx.webp" alt="…" aria-hidden="true">
      </span>
    </figure>

    <div class="ui-pcard__body">
      <div class="ui-pcard__row">
        <p class="ui-pcard__price-label">Price <strong class="ui-pcard__price">$249</strong></p>
        <fieldset class="ui-pcard__swatches">
          <legend class="ui-pcard__sr">Colour</legend>
          <label class="ui-pcard__swatch" style="--swatch: #8DB28F">
            <input type="radio" name="aura-colour" value="sage" checked>
            <span class="ui-pcard__dot" aria-hidden="true"></span>
            <span class="ui-pcard__swatch-name">Sage</span>
          </label>
          …
        </fieldset>
      </div>
      <button class="ui-pcard__cta" type="button">
        <span class="ui-pcard__cta-labels">
          <span class="ui-pcard__cta-add">Add to bag</span>
          <span class="ui-pcard__cta-done" aria-hidden="true"><svg>…</svg>Added</span>
        </span>
        <span class="ui-pcard__cta-note">Free returns</span>
      </button>
      <p class="ui-pcard__sr" role="status" aria-live="polite" data-ui-pcard-status></p>
    </div>
  </div>
</article>
```

The swatches are real radio inputs, so arrow keys, focus and screen readers work without extra code. Each radio's `value` must match an image's `data-colorway`.

## Theming

Colours live in custom properties on `.ui-pcard`. Each colourway overrides the stage, wordmark, spec line and button colours:

```css
.ui-pcard[data-colorway="onyx"] {
  --ui-pcard-stage-1: #4A4C4D;   /* centre of the stage glow */
  --ui-pcard-stage-2: #262829;   /* stage edges */
  --ui-pcard-stage-top: #121313; /* ombré: the top third darkens to this */
  --ui-pcard-title: #E9E7E2;     /* wordmark, icons, badge */
  --ui-pcard-specs: #A3A5A3;     /* spec line */
  --ui-pcard-cta-bg: #171818;    /* Add to bag */
  --ui-pcard-ring: #262626;      /* selected swatch ring */
}
```

These properties are registered with `@property`, so switching colourways blends the gradient smoothly rather than snapping. Other settings:

| Property | Default | What it does |
| --- | --- | --- |
| `--ui-pcard-font` | Manrope | Typeface for everything |
| `--ui-pcard-body-bg` | `#EFEBE1` | Cream footer |
| `--ui-pcard-ink` | `#1C2A21` | Price and swatch labels |
| `--ui-pcard-radius` | `28` | Corner radius in design units |
| `--ui-pcard-inset-top` | `0px` | Extra top padding when the card sits under a status bar |

The demo loads Manrope from Google Fonts.

## Events

```js
document.addEventListener("ui-pcard:add", function (e) {
  // e.detail = { colorway: "sage", count: 2 }
});
```

## Connecting a cart

Set `window.uiPcardAdd` to add the item for real. It's called on click, while the product flies, and should return a Promise:

```js
window.uiPcardAdd = function ({ card, colorway }) {
  return fetch("/my-cart/add", { method: "POST" /* … */ })
    .then(function (res) { return res.json(); })
    .then(function (cart) { return { count: cart.count }; });  // the badge shows this
};
```

- **The badge waits for it.** If the request is still running when the product reaches the bag, the count goes up when it resolves.
- **On failure,** reject with an `Error`. Its message replaces the button note for a few seconds, the button gives a short shake, the product comes back and nothing is counted.
- **Without the hook,** the count simply goes up by one.

A disabled button (`disabled` attribute) ignores clicks, and the card dims it.

## Shopify

The `shopify/` folder turns the card into a theme section for a real product.

1. **Assets.** Upload three files to the theme's `assets/` folder:
   - this folder's `style.css` as `ui-pcard.css`
   - this folder's `script.js` as `ui-pcard.js`
   - `shopify/ui-pcard-shopify.js` as is
2. **Section.** Add `shopify/ui-pcard.liquid` to `sections/`.
3. **Product page.** In the theme editor, open a product template and add the **UI product card** section. It uses that page's product. You can hide the theme's own product section, or keep it below for the full description. On any other page, pick a product in the section settings.
4. **Colourways.** The section reads the product's colour option ("Color" or "Colour" by default; change it in the settings). It adds one swatch per value. Each **Colourway** block matches one value by name and sets:
   - its swatch colour
   - a **cut-out image**: a transparent PNG or WebP, portrait, with the product filling the frame
   - its card colours: stage, ombré, wordmark, spec line, button and ring

   The preset comes with Sage, Onyx and Oat. Values without a block use the theme's swatch colour, the variant image and the Sage card colours. Products without a colour option show one image and no swatches.
5. **Text.** The settings cover the wordmark, spec line, price label, button label, "Added", "Sold out" and the button note. The wordmark defaults to the first word of the product title. Short words of 3–5 letters fill the card best.

**What the connection does:**
- Picking a swatch selects that colour's variant, updates the price, and shows "Sold out" (and disables the button) when it's unavailable.
- Add to bag posts to Shopify's Cart AJAX API (`/cart/add.js`) while the product flies. The badge then shows the real cart count.
- Shopify's errors, such as "All 1 Aura Studio - Onyx are in your cart.", show on the button.
- It refreshes a Dawn-style `#cart-icon-bubble` in the theme header and fires `ui-pcard:cart` on `document` with `{ cart }`, for themes that refresh their cart drawer some other way.
- Without JavaScript, the button is a normal product form submit.

**Limits:**
- The swatches handle one option. On products with more options, such as size, each colour adds its first available variant.
- The bag icon links to `/cart`.
- The back button goes back if the visitor came from the store, otherwise to the product's first collection.

## Product images

The cut-outs are transparent WebP files with the product filling the frame. To use another product, export a transparent PNG/WebP per colourway with a similar portrait aspect. If the aspect is different, update `aspect-ratio` on `.ui-pcard__media`. The Onyx and Oat images in this first pass are recolours of the Sage photo. Swap in real product shots when you have them.
