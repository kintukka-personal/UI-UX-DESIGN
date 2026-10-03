# NumericText

A content transition for text views displaying numeric text. When the value changes, each digit column performs an odometer roll in the direction of travel — counting up, the new digit rises from below and pushes the old one out the top; counting down, it descends from above. Digits that did not change do not move, and non-digit glyphs (currency symbols, grouping separators, decimal points, signs) are held static.

This is the web equivalent of SwiftUI's `ContentTransition.numericText(countsDown:)`, written as a single React component with no dependencies beyond React itself.

## What's in here

`NumericText.jsx` is the component, for React projects. It ships no class names and no stylesheet: every structural and motion rule is inline, so it drops into Tailwind, CSS modules, vanilla CSS, or anything else. Pass `className` and `style` to control type, color and size. That's also why this folder has no `style.css`.

`script.js` is the same component compiled to plain JavaScript for pages without a build step. It's generated from `NumericText.jsx` (edit the JSX, then regenerate), needs React and ReactDOM loaded first, and defines `window.NumericText`.

`index.html` is the demo page. Open it directly in a browser. It loads React 18 and Babel standalone from cdnjs (Babel only compiles the demo's own JSX), then `script.js`. It has live controls for duration, stagger, easing, direction and variant, a side-by-side comparison of the two variants, and worked examples in USD, EUR, JPY and compact notation.

## Usage

```jsx
import NumericText from "./NumericText";

<NumericText value={revenue} format={{ style: "currency", currency: "USD" }} />
<NumericText value={count} direction="down" className="text-6xl font-semibold" />
<NumericText value={views} variant="blur" blurAmount={0.1} />
```

Without a build step:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script src="script.js"></script>
<script>
  ReactDOM.createRoot(document.getElementById("revenue")).render(
    React.createElement(NumericText, { value: 1284990.5, format: { style: "currency", currency: "USD" } })
  );
</script>
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `value` | number | — | the value to display |
| `locale` | string | `'en-US'` | BCP 47 tag for `Intl.NumberFormat` |
| `format` | object | `undefined` | `Intl.NumberFormatOptions` |
| `direction` | string | `'auto'` | `'auto' \| 'up' \| 'down'`; `'auto'` reads the sign of the delta |
| `variant` | string | `'odometer'` | `'odometer' \| 'blur'` |
| `blurAmount` | number | `0.08` | peak blur radius in `em`. Only read when `variant='blur'` |
| `duration` | number | `420` | roll duration in ms |
| `easing` | string | `cubic-bezier(0.22, 1, 0.36, 1)` | any CSS timing function |
| `stagger` | number | `28` | ms of delay per place value, so the ones column leads |
| `as` | element | `'span'` | element type for the root |
| `label` | string | — | overrides the text announced to assistive tech |
| `className` | string | — | |
| `style` | object | — | merged over the component's own root styles |

`tokenize` is also exported, if you want to test the column-keying logic directly.

## The two variants

**odometer** is the roll alone: a clean mechanical flip.

**blur** adds a motion blur whose strength tracks the strip's actual vertical velocity. The curve you pass as `easing` is sampled, central-differenced, and normalised against its own peak, so the smear builds as the digit accelerates, peaks where it is genuinely moving fastest, and resolves to zero before it lands. A soft ease-out peaks early and trails off; an ease-in-out peaks mid-roll. Easing functions with no useful derivative — `steps()`, `linear()` with stops, a custom ident — fall back to a symmetric arc rather than guessing.

`blurAmount` is in `em` so the smear scales with font-size. Keep it under about `0.15em`: each column clips to its own advance width, and past that point the smear squares off against the column edge instead of feathering.

## How it works

**Two cells, not ten.** A digit column renders exactly two cells — the outgoing digit and the incoming one — and animates the strip's `transform`. A change never spins through the intervening digits, so 7 → 2 is a single roll rather than five. Cell order is a function of direction, which lets one transform cover both cases and sidesteps the 9 → 0 wrap entirely: counting up the strip is `[old, new]` and translates `0% → -50%`, counting down it is `[new, old]` and translates `-50% → 0%`. At rest the strip holds the same digit twice and sits at `0%`, so settling after a transition is glyph-identical to the animated end state and there is no flash.

**Three-zone tokenization.** The formatted string is cut into prefix, core and suffix, because they anchor differently. The prefix (`$`, `-`, `€ `) is anchored left — it is not a place value, and keying it from the right would make it collapse and re-expand every time the number gained a digit. The core runs from the first digit to the last, separators included, and is keyed right-anchored from the last digit so place value is preserved: the ones column is `d0` in `999` and still `d0` in `1,000`; the decimal point is `s2` in `$999.99` and still `s2` in `$1,000.00`. React reuses those nodes and their roll state, so only genuinely new columns mount. The suffix (`%`, ` kg`, ` M`) is anchored right from the end of the string. Columns that drop out are kept in the list one beat longer so they can collapse rather than vanish.

**Tabular figures.** The root sets `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum" 1`, so every digit occupies exactly one `ch` and nothing shifts sideways mid-roll.

**Width changes.** Columns animate `max-width` between `0ch` and `3ch` alongside opacity. `max-width` caps a box without stretching it, so the column still sizes to its content and `3ch` is simply a value wider than the widest glyph — it exists purely as an animatable end state.

## Why transform and blur are two separate WAAPI animations

This is the one piece of the implementation that is not obvious, so it is worth stating plainly.

In the Web Animations API, the effect-level `easing` remaps **iteration progress before keyframes are looked up**. Keyframe offsets are therefore read in warped-progress space, not in time. Fold the blur ramp into the roll's keyframe list and its offsets get eased a second time: under the default `cubic-bezier(0.22, 1, 0.36, 1)` the keyframe at offset `0.50` fires at 13.1% of the duration, and 76.5% of the ramp is consumed before the quarter mark. The smear would be over before the digit had visibly moved.

The transform is unharmed by that remap — warping progress is exactly what the curve is for, and piecewise-linear interpolation between two keyframes reconstructs it losslessly. The blur ramp is the opposite case: its offsets *already* encode the velocity profile of that same curve, so it must be read on a linear clock. Hence two animations on one element, the roller carrying the caller's easing and the ramp carrying `easing: "linear"`.

There is a second, independent reason to keep them apart: compositor eligibility is decided per *animation*, not per property. A `filter` the compositor declines to accelerate would demote the whole `KeyframeEffect` — transform included — to the main thread.

## Accessibility

The rolling glyphs are `aria-hidden`, and the formatted value is carried in a visually-hidden span that assistive tech reads instead, so a screen reader hears `$1,000.00` rather than a stream of individual digits. Pass `label` to override that text.

`prefers-reduced-motion: reduce` is honoured: the component skips the roll, the enter/exit width animation and the blur entirely, and simply commits the new value. The same path runs on any engine without `Element.animate`. A fallback timer backs up `onfinish`, because that event does not fire for an animation cancelled by a detached or `display: none` element — so a column can never strand mid-roll.

## Running the demo

Open `index.html` in any modern browser. It needs network access for the three cdnjs scripts (React 18.2.0, ReactDOM 18.2.0, Babel standalone 7.23.5) and loads `script.js` from the same folder.
