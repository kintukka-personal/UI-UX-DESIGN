# Snap Scroll

One scroll, one screen. Mark any set of full-screen sections, and each wheel flick, trackpad swipe, touch swipe or key press moves exactly one of them into view, with a smooth one-second glide.

- **Works on any sections.** Panels don't need a shared wrapper, so separate Shopify sections work.
- **Leaves the rest alone.** Content above, below or between groups of panels scrolls normally, and scrolling into a panel finishes the move for you.
- **No double jumps.** Trackpad momentum is ignored, so one swipe never skips two panels.
- **Keyboard:** ↑/↓, Page Up/Page Down, Space and Shift+Space.
- **Stays out of the way.** It pauses while the theme locks scrolling (drawers, modals), and lets scrollable areas inside a panel scroll first.
- **Reduced motion:** with it turned on, panels still step one at a time, but jump instantly.
- Plain JS, no libraries, about 200 lines.

Open `index.html` for the demo.

## Use it

```html
<link rel="stylesheet" href="style.css">

<section data-ui-snap-panel>…</section>
<section data-ui-snap-panel>…</section>
<section data-ui-snap-panel>…</section>

<script src="script.js"></script>
```

`style.css` makes each panel exactly one screen tall (`100svh`). Skip it if your sections already are.

## Settings

These are at the top of `script.js`:

| Setting | Default | Purpose |
| --- | --- | --- |
| `SELECTOR` | `"[data-ui-snap-panel]"` | Which elements count as panels. Any CSS selector works. |
| `DURATION` | `1000` | Milliseconds per move |
| `SWIPE_MIN` | `40` | Pixels a touch swipe must travel |

## Hooks

- Each panel gets `.is-active` while it's in view, which is useful for fade-in captions.
- `html` gets `.ui-snap-ready` once the script is running.
- The `ui-snap:change` event fires on `window` with `detail = { index, panel, total }`. The index is `-1` when no panel is in view.
- `window.uiSnap.next()`, `.prev()` and `.goTo(index)` let you build your own dots or arrows.
- Add the class `ui-snap-paused` to `<html>` to switch stepping off temporarily.

## Shopify

1. Create `snippets/ui-snap-scroll.liquid` from `shopify/ui-snap-scroll.liquid`. It contains the CSS and JS in a single file.
2. In `layout/theme.liquid`, add `{% render 'ui-snap-scroll' %}` just before `</body>`.
3. In each section that should snap, add `data-ui-snap-panel` to the section's outermost element. For example, in `sections/image-banner.liquid`: `<div class="banner …" data-ui-snap-panel>`.
4. Remove the vertical spacing between those sections, so each one fills the screen edge to edge. Small gaps still work, but look untidy.
