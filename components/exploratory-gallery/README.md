# Exploratory Gallery

An animated gallery for portfolio sites and project showcases, rebuilt from Jitter's free "Interactive" gallery template (the *rico.* one). Square glass cards slide past a lit slot in the middle of the screen. Click the centre card and it opens: it grows, and everything behind it goes soft and dark. One card holds a glass coin that turns over a ticker, and each half-turn wipes in the next word.

Plain HTML, CSS and vanilla JS, with no dependencies. Classes are prefixed `ui-gallery`.

## What it does

The page plays the source video's loop as a demo tour (7.63s), then hands control to the visitor:

1. **Slide (0.02s).** The row moves one card left. Each card trails the one ahead of it by 50ms, so the gaps open up as the row lifts off and close again as it lands. The glass cards pass over the lit slot, which stays put, and it shows faintly through them.
2. **Open (1.23s).** A cursor dot drifts up to the product card and clicks. The card grows 25%, leans a little off the slot and overshoots slightly. The neighbours swell and blur into soft shapes, and the whole scene dims.
3. **Close and slide (1.92s).** The card settles back as the row moves on to the coin.
4. **Coin.** On every step the coin turns 720°. Each half-turn swaps the word, USD → XRP → BTC → ETH → USD. The swap is a wipe that follows the near rim of the glass, so the word is half-changed when the coin is edge-on.
5. **Slide (3.85s, 5.76s)** to the portrait, then back to the mark, and the loop repeats.

The lower half of the scene falls off to half brightness, over the cards as well as the backdrop, as in the source.

### Visitor controls

| Input | Action |
| --- | --- |
| Click a side card | Bring it to the centre |
| Click the centre card, or Enter / Space | Open it in the focused view, or close it |
| Click the backdrop, or Escape | Close the focused view |
| ← / → | Previous / next project |
| Swipe or drag sideways | Previous / next project |
| Mouse wheel or trackpad | One step per gesture |
| Pause / Play button | Stop or restart the tour |

As soon as the visitor clicks, swipes, scrolls or uses the keys, the tour stops so it never fights them. **Play** starts it again. With a mouse, the dot becomes the cursor over the stage. It grows over a card and grows more over an open one.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The gallery: four projects, the footer bar and the controls |
| `style.css` | Layout, card styles, the coin, the overlays and the footer |
| `script.js` | The clock, tweens, the tour, input and accessibility state |
| `images/product.webp` | The product render (808 × 808) |
| `images/portrait.webp` | The portrait (648 × 648) |
| `preview.png` | The coin card at rest, at 1440 × 900 |

Both images were cut from frames of the source video and upscaled 2× with EDSR. For the product, the cursor dot was painted out and the levels matched to the card at rest. The black mark was traced from a frame into one SVG path, using its four-way symmetry to clean up compression noise. The coin, its reeded rim and the *rico.* wordmark are drawn in CSS and SVG.

## How it is built

- **One clock.** Every motion is a tween on one clock: the card positions, the focus amount, the coin angle and the tour. So pausing is exact. Add `?t=1.6` to the URL to freeze the tour at any moment, which helps with design review and screenshots. `?autoplay=0` starts paused.
- **Timing taken from the video.** The card positions were tracked frame by frame. The slide is `cubic-bezier(.45, 0, .05, 1)` over 1.55s, a slow lift-off and a long glide in, with a 50ms stagger. The coin's 720° turn is `cubic-bezier(.25, 0, .3, 1)` over 1.9s.
- **Sized from one variable.** `--card` is 45% of the height or 33.75% of the width, whichever is smaller. That matches the 324px card in the 960 × 720 source frame. Everything else scales from it: the gap (`--pitch`), the corner radius, the coin and the type. On tall screens the card grows to 66% of the width and the neighbours move closer, so they peek in at the edges.
- **Eight cards for four projects.** Each project is in the DOM twice, so the row stays full on an ultrawide screen. The card that leaves one end comes back in at the other end, off screen.
- **Focus in CSS, driven by one number.** The script sets `--f` from 0 to 1, and CSS turns it into the scale, the blur, the dim and the slot growing.
- **Coin in CSS 3D.** Two glass faces and 64 rim facets with a striped gradient form a reeded edge, which reads as fine lines when the coin is edge-on. The word sits behind the glass. Two copies of it are clipped at the rim's projected position.

## Accessibility

- The gallery is a labelled carousel (`aria-roledescription="carousel"`) with one slide group per project, labelled "1 of 4" and so on. Each card is a real `<button>` with a name such as "Dial, industrial design". The open card reports `aria-pressed="true"`.
- **Roving tabindex.** Only the centre card is in the tab order. The arrow keys move between projects and keep focus on the new centre card. The hidden copy of each project is `aria-hidden`.
- Moves made by the visitor are announced through a polite live region ("Ledger, 3 of 4"). The tour itself stays quiet.
- The tour lasts longer than 5 seconds, so there is a **Pause/Play** button (WCAG 2.2.2). It is a 44px target with a visible focus ring. The tour also waits while keyboard focus is on a card. **Previous** and **Next** buttons appear when they receive keyboard focus.
- **Reduced motion:** nothing plays on its own. Steps and the focused view change instantly, the coin doesn't spin, the cursor dot is off and the normal pointer stays.
- The cursor dot is only used with a mouse or trackpad. On touch screens and in forced-colours mode, the normal pointer stays. In forced-colours mode, cards and buttons get system borders.
- The footer text is at least 11px, in near-white on the darkened floor.

## Customise

- **Projects:** each `<li data-item>` in `index.html`. Set `data-title` for announcements and `aria-label` on the button. Photo cards use `.ui-gallery__card--photo` with an `<img>` inside `[data-inner]`.
- **Tickers:** `TICKERS` in `script.js`.
- **Colours:** the `--ui-gallery-*` tokens at the top of `style.css`.
- **Pace:** `SLIDE_DUR`, `STAGGER`, `SPIN_DUR` and the `TOUR` list at the top of `script.js`.
- **Size:** `--card` and `--pitch` in `style.css`.
