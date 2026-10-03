# Number Roll

A content transition for text views that display numeric text. When the value changes, the digits that actually moved roll — upward when the number climbs, downward when it falls — while everything else holds its place. Where motion is switched off, the text simply updates.

Close cousin of SwiftUI's `.contentTransition(.numericText(countsDown:))`. The web has no built-in equivalent, so this builds the column mask by hand.

No dependencies. Roughly 5 KB of JavaScript, 400 bytes of CSS.

## Files

| File | What it is |
| --- | --- |
| `script.js` | The component. A plain script that defines `window.NumberRoll`. |
| `style.css` | Component styles. Four rules, no theming opinions. |
| `index.html` | Demo page with live examples and tunable settings. Open it in a browser. |

## Quick start

```html
<link rel="stylesheet" href="style.css">
<span id="views"></span>

<script src="script.js"></script>
<script>
  const counter = new NumberRoll(document.querySelector('#views'), {
    format: v => v.toLocaleString('en-AU')
  });

  counter.set(1024);   // first call paints, no animation
  counter.set(1025);   // the ones column rolls up one notch
  counter.set(998);    // everything rolls down, thousands column retires
</script>
```

## Options

```js
new NumberRoll(element, {
  duration: 900,                      // ms for one column's roll
  stagger: 45,                        // ms between adjacent columns
  easing: 'smooth',                   // smooth | overshoot | mechanical | linear
  lead: 'right',                      // 'right' = ones digit moves first
  reduced: null,                      // null follows the OS; true forces instant
  format: v => String(v)              // number in, display string out
});
```

Everything is live. `counter.options.duration = 400` takes effect on the next change.

## Methods and properties

| | |
| --- | --- |
| `.set(value)` | Updates the display. Direction is inferred from the previous value. |
| `.set(value, { direction: 1 })` | Forces an upward roll. `-1` forces downward. |
| `.value` | The current numeric value. `null` before the first `set`. |
| `.options` | The live settings object. |

## Formatting

`format` receives the raw number and returns the string to display. Anything `Intl` produces works:

```js
// Currency
format: v => '$' + v.toLocaleString('en-AU', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
})

// Clock
format: v => `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`

// Signed temperature
format: v => (v > 0 ? '+' : v < 0 ? '−' : ' ') + Math.abs(v).toFixed(1) + '°'
```

## How it behaves

- **Direction follows the value.** A digit takes the short way round: 9 to 1 while climbing passes through 0 rather than reversing.
- **Columns are matched from the right.** 99 to 100 keeps the two nines where they are and grows a new column on the left, instead of re-rolling the whole number.
- **Widths animate on entry and exit.** A digit appearing or retiring expands and collapses its own column, so surrounding text never jumps sideways.
- **Overshoot renders one extra digit** past the target in the direction of travel, so a springy easing reveals the next number rather than empty space.
- **Separators cross-fade.** Commas, colons and signs don't roll, because rolling a comma means nothing.
- **Interrupted rolls settle first.** A rapid second update finishes the previous column instantly before starting again, so the strip never drifts out of alignment.
- **Reduced motion is honoured on load** via `prefers-reduced-motion`, and can be forced either way with the `reduced` option.

## Requirements and limits

- Needs the Web Animations API (`Element.animate`). Available everywhere current; there is no fallback path, so on an ancient engine nothing animates and the numbers still read correctly.
- **Use a font with tabular figures.** The CSS asks for `tabular-nums`, but a face without them will shift width as digits change. A monospace face is the safe choice for large readouts.
- **Alignment is from the right.** A format whose decimal places vary between updates (`4.5` → `4.55`) will misalign the fractional part. Pad to a fixed number of decimals, or anchor the diff on the decimal separator instead.
- Styling is yours. The component sets no colour, size or family — it inherits from the element you attach it to.

## Licence

Do what you like with it.
