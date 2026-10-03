# Numeric text transition: research notes

Question: how does SwiftUI's `.contentTransition(.numericText(...))` animate numbers, and how should we
recreate it on the web in vanilla JS/CSS? Researched 2026-10-03. Bracketed numbers point to the Sources list.

## Native behaviour (SwiftUI)

- **API.** `numericText(countsDown: Bool = false)` (iOS 16 / macOS 13). Apple describes it as a transition
  for `Text` showing numbers that "in certain environments … will enable a nonstandard transition tailored
  to numeric characters that count up or down." `countsDown` means "True if the numbers represented by the
  text are counting downwards." [1]
- **`numericText(value: Double)`** (iOS 17 / macOS 14): "The difference between the old and new values when
  the text changes will be used to determine the animation direction." So direction is worked out from the
  change in value, not fixed by the caller. [2]
- **Trigger.** The transition only runs when the change happens inside an animation transaction
  (`withAnimation(.spring) { count += 1 }`). Without one, the text just swaps. [3] Timing comes from that
  animation (spring or `.linear(duration: 0.3)` and so on). The transition has no duration of its own. [3][9]
- **What moves.** Digits "roll up or down to their new value" [3]. Only the digits that changed animate and
  the unchanged ones stay still ("changes only the needed part of the Text view") [9].
- **Blur/scale:** not documented. Apple's docs describe no blur, scale or opacity values [1][2]. On
  devices, outgoing and incoming glyphs visibly slide vertically while fading with a slight blur, but this
  is **observed, not sourced**. Treat it as a design choice to tune by eye.
- `"In certain environments"` [1] means the system can fall back to a plain crossfade, for example when
  the text isn't numeric. Apple does not say whether Reduce Motion affects it.

## Web techniques compared

| Technique | How | Tradeoff |
|---|---|---|
| **Per-digit roll** (recommended) | Each digit is a clipped slot holding a 0–9 column (or an old/new pair) moved with `translateY`; NumberFlow does this [5][6] | Closest to native, and only changed digits move. Needs per-place DOM, width handling and a11y work. |
| **Count-up tween** | rAF/WAAPI tweens a number and rewrites `textContent` each frame | Simple, but every frame shows a new value (layout churn, screen reader noise) and it doesn't look like the native roll. |
| **CSS `@property` counter** | Register `--n` with `syntax: '<integer>'`, animate it, show via `counter-reset` + `content: counter()` | No JS and the property can be animated [10]. But it's integers only, has no locale grouping or decimals, `content` text is weak for a11y, and it's still a count-up rather than a roll. |

Not fetchable (egress-blocked): designcode.io [4], levelup.gitconnected.com, aicssanimations.com,
flourish.studio, number-flow.barvian.me, sarunw.com, createwithswift.com. The rows above on count-up and
`@property` rely on MDN [10] and general knowledge, not those pages. NumberFlow's docs were read from the
repo source (`site/`) instead [5].

## How NumberFlow does it (from source [6])

- **Parts:** it uses `Intl.NumberFormat#formatToParts` and splits `integer`/`fraction` into single
  digits. It merges `minusSign`/`plusSign` into `sign` and buckets parts into `pre`/`integer`/`fraction`/`post`
  (`formatter.ts`). Part types are listed in [7].
- **Place-value keys:** integer digits are keyed **right to left** (`integer:0` = ones place) and
  fraction digits left to right with negative `pos`. A digit's identity is therefore its place value, not
  its index in the string, so going from 99 to 100 keeps the ones and tens slots and adds a hundreds slot on the left.
- **Direction:** `trend` defaults to `Math.sign(new - old)`. With trend 0, "each digit goes up if it
  increases and down if it decreases" [5]. `getDelta()` wraps around (9 to 0 going up) when a digit's own
  delta is against the overall trend. The `continuous` plugin spins every lower place a full loop.
- **Timing defaults:** `transformTiming` 900 ms with a `linear(...)` spring-like ease, `opacityTiming`
  450 ms `ease-out`. `spinTiming` falls back to transform timing.
- **Interruption:** every WAAPI effect uses `composite: 'accumulate'`. Deltas are animated toward 0 on top of
  the current value, so a new update mid-flight adds on smoothly without snapping. Width is also animated as a
  px delta for this reason ("to better handle interruptions"). `composite` semantics: [8].
- **Width:** it measures `offsetWidth` before and after, then animates a width-delta var with `scaleX`.
  Sections are `justify` left or right (integer section is anchored right), and an edge mask
  (`mask-image` gradients, `--number-flow-mask-height: .25em`) fades digits at the top/bottom of the slot.
- **A11y:** host has `role="img"` and `ariaLabel = valueAsString` through ElementInternals. Visual digits
  live in shadow DOM and leaving elements are `inert`.
- **Skips animation when** `prefers-reduced-motion: reduce` (`respectMotionPreference`, default true), when the
  element isn't visible, or when `document.visibilityState !== 'visible'`.
- **Docs recommend** `font-variant-numeric: tabular-nums` so digits don't shift [5][11]. **Limitations:** no
  scientific/engineering notation, no non-Latin digits, no RTL locales [5].

## Implementation notes for our component

1. **Format:** `new Intl.NumberFormat(locale, opts).formatToParts(v)` [7]. Render symbols (`group`,
   `decimal`, `currency`, `percentSign`, `literal`) as static/crossfading spans, and digits as slots.
2. **Place-value diff:** key integer digits from the right (`i0, i1…`) and fraction digits from the left
   (`f0, f1…`). Same key and same digit means don't touch it. Same key with a new digit means roll. A new key
   means enter (fade and slide in, start at 0), and a missing key means exit. This matches native "only
   changed digits move" [9].
3. **Direction:** default `sign(new - old)`, applied to all changed digits like `numericText(value:)` [2].
   Allow a `countsDown` override [1]. Optional `trend: 0` mode for per-digit direction [5].
4. **Motion:** outgoing digit goes `translateY(0 → -100%*dir)` and `opacity → 0`, incoming goes
   `translateY(100%*dir → 0)`, inside `overflow: clip` (or a mask) with `line-height: 1`. Use about 200 ms
   with an ease-out/spring `linear()` curve (our spec; NumberFlow uses 900 ms [6]). An optional small
   `filter: blur()` on the moving glyphs imitates the observed iOS look (unsourced, see above).
5. **Width:** `tabular-nums` [11] keeps each slot's width fixed. When the digit count changes, FLIP the
   container width (measure, then animate the delta), anchored on the side of the integer part.
6. **Interruption:** WAAPI with `composite: 'accumulate'` and animate deltas toward 0 [8]. The simpler
   alternative is to `finish()` in-flight animations before starting new ones, which NumberFlow does when
   toggling `animated` [6]. Don't queue animations, because the latest value wins.
7. **A11y:** put the full formatted string on the wrapper (`aria-label` or a visually hidden span) and
   mark the digit stack `aria-hidden="true"`, so screen readers hear "1,234" once and not every glyph.
   Leave `aria-live` up to the caller (`polite`), because auto-announcing a ticker gets noisy.
8. **Reduced motion:** when `matchMedia('(prefers-reduced-motion: reduce)')` matches [12], swap the text
   instantly or with a short opacity-only crossfade. Also skip animation when the element is hidden or the tab is backgrounded [6].
9. **Scope v1:** Latin digits, LTR, standard/compact/currency/percent. Reject scientific notation like NumberFlow does [5].

## Sources

1. Apple, `numericText(countsDown:)`: https://developer.apple.com/documentation/swiftui/contenttransition/numerictext(countsdown:)
   (read via the DocC JSON at developer.apple.com/tutorials/data/documentation/swiftui/contenttransition/numerictext(countsdown:).json)
2. Apple, `numericText(value:)`: https://developer.apple.com/documentation/swiftui/contenttransition/numerictext(value:) (same JSON route)
3. onmyway133 blog #993: https://github.com/onmyway133/blog/issues/993
4. DesignCode handbook: https://designcode.io/tutorials/swiftui-handbook/swiftui-handbook-numeric-text-animation-using-contenttransition (**not fetched, blocked**)
5. NumberFlow docs (source of number-flow.barvian.me), `site/src/pages/[...framework]/index.mdx`: https://github.com/barvian/number-flow
6. NumberFlow source `packages/number-flow/src/{formatter,lite,styles,plugins/continuous}.ts`: https://github.com/barvian/number-flow/tree/main/packages/number-flow/src
7. MDN `Intl.NumberFormat.prototype.formatToParts`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/formatToParts (read via github.com/mdn/content)
8. MDN `KeyframeEffect.composite`: https://developer.mozilla.org/en-US/docs/Web/API/KeyframeEffect/composite (via mdn/content)
9. Web search summaries of Swift with Majid / sarunw (pages themselves blocked): https://swiftwithmajid.com/2022/08/02/content-transition-in-swiftui/ , https://sarunw.com/posts/animating-number-changes-in-swiftui/
10. MDN `@property` (animating a registered custom property): https://developer.mozilla.org/en-US/docs/Web/CSS/@property (via mdn/content)
11. MDN `font-variant-numeric`: https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric (via mdn/content)
12. MDN `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion (via mdn/content)
13. Not fetched (blocked): levelup.gitconnected.com article, aicssanimations.com count-up, flourish.studio ticker blog, number-flow.barvian.me.
