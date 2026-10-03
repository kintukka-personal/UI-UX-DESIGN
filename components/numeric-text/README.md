# Numeric Text

A transition for numbers that change, modelled on SwiftUI's `.contentTransition(.numericText(countsDown:))`.

- **Only the changed digits move.** Going from 1,284 to 1,291, the "1,2" stays put while the last two digits roll.
- **Direction follows the value.** When the number goes up, the old digit leaves upward and the new one rises from below. When it goes down, the roll reverses. `data-counts-down` can force either direction, which suits a countdown.
- **Digits are matched by place value.** 99 → 100 rolls the ones, tens and hundreds into the right places. A new leading digit (or thousands separator) opens its space and the rest of the number slides over instead of jumping.
- **Fast.** New digits take 200ms with an ease-out. Old digits leave in 150ms, accelerating and fading out in the first half so the two never smudge together.
- **Interruptible.** A new value mid-roll picks up from where the glyphs are right now. Nothing queues or stacks, so a 1-second countdown or a burst of + taps stays crisp.
- **Any format.** Formatting is done by `Intl.NumberFormat`, so currency, percent, compact ("1.2K"), grouping and locales all work. Symbols and separators fade, and digits roll.
- **Count mode.** `data-mode="count"` tweens through the in-between values instead, in the same 200ms.
- **Accessible.** Screen readers get the real formatted value from a visually hidden copy, and the moving glyphs are hidden from them. Add `data-live="polite"` to announce changes; leave it off for ticking timers.
- **Reduced motion.** With it turned on, changed digits cross-fade in place (120ms) without moving or blurring. Animations are skipped while the tab is hidden.

Plain HTML, CSS and vanilla JS with no dependencies. Classes are prefixed `ui-numtext`.

Open `index.html` for the demo: a drop countdown, a cart stepper with a currency subtotal, a low-stock badge, a live viewer count, and a playground with formats and modes.

## Markup

```html
<link rel="stylesheet" href="style.css">

<span class="ui-numtext" data-ui-numtext data-value="1240"></span>

<script src="script.js"></script>
```

The script fills the element on load. Any `[data-ui-numtext]` element added later can be set up with `uiNumText.init(el)`.

| Attribute | Example | Purpose |
| --- | --- | --- |
| `data-value` | `1240` | The number. Changing it animates. |
| `data-format` | `'{"style":"currency","currency":"AUD"}'` | [`Intl.NumberFormat` options](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options) as JSON |
| `data-locale` | `en-AU` | Locale; defaults to the page's `lang` |
| `data-counts-down` | `true` / `false` | Force the roll direction. Leave it off to follow the value. |
| `data-mode` | `count` | Tween through the values instead of rolling |
| `data-live` | `polite` | Announce changes to screen readers |

A countdown clock is one element per unit with `'{"minimumIntegerDigits":2}'`, so 9 shows as 09.

## Changing the value

```js
uiNumText.set(el, 42);   // or: el.dataset.value = 42
```

Both work, and changing `data-format` or `data-locale` morphs the number into its new format. Each change fires a bubbling `ui-numtext:change` event with `detail = { from, to, direction }` (`"up"` or `"down"`).

## Tokens

Set these on `.ui-numtext` (or any ancestor via a more specific selector).

| Token | Default | Purpose |
| --- | --- | --- |
| `--ui-numtext-duration` | `200ms` | Incoming digits and opening space |
| `--ui-numtext-exit` | `150ms` | Outgoing digits and closing space |
| `--ui-numtext-shift` | `0.8em` | How far a digit travels |
| `--ui-numtext-blur` | `2px` | Blur at the start and end of the roll |
| `--ui-numtext-ease-in` | `cubic-bezier(0.22, 1, 0.36, 1)` | Easing for arrivals |
| `--ui-numtext-ease-out` | `cubic-bezier(0.4, 0, 1, 1)` | Easing for departures |

The number inherits font, size and colour from its surroundings. Tabular figures are switched on so digits don't shift sideways as they change; this needs a font that has them (Work Sans, Inter, SF and most UI fonts do).

## How it works

Each value is split with `Intl.NumberFormat.formatToParts()` and every character is given a key by place value: integer digits counted from the right (`i0` is the ones), fraction digits from the left, separators by the place they sit before. Old and new keys are merged in reading order. Matching keys keep their element. A changed character gets a second glyph: the old one is lifted out of the flow and rolls away, and the new one rolls in. Keys that appear or disappear animate their width open or closed. All movement uses the Web Animations API on `transform`, `opacity` and `filter`, with width only on slots that are opening or closing.

Research notes and sources (Apple's documentation, NumberFlow, MDN) are in [RESEARCH.md](RESEARCH.md).

Limits: no scientific or engineering notation, and right-to-left locales haven't been tuned.
