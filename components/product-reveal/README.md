# Product Reveal

A product-launch hero that rebuilds Jitter's free "Logo reveal" template as a web page. It plays in three fast beats separated by hard cuts. The palette comes from the CO2 poster: a white shoe over red Martian ground.

1. **Intro (0 to 2.1s), on warm white**
   - A dot grows into a thick grey ring, and two small black squares appear on either side of it.
   - The ring splits into eight lanes and widens into a circle. Each square grows into one half of the logo mark, revealed in a circle from its stems, and the two halves slide together.
   - The circle stretches into a running track, and start lines draw across the lower straights.
   - The mark's feet then shoot outward, the halves pull apart, and the track speeds up and fills the frame.
2. **Poster (2.1 to 4.57s), hard cut to red**
   - The shoe floats above the terrain with the track behind it. Eight edge markers pop in.
   - **CO2** builds piece by piece: C, then O, then the top of the 2, then its base. *acme* wipes in and "DESIGNED & CRAFTED / IN ITALY" types out.
   - The shoe pushes in slowly. Then tracking readouts (`× x: 196 y: 323`) flicker on, pinned to points on the shoe, and follow them as it zooms in fast with a motion smear.
   - Just before the cut, the wordmark stretches past the edges of the frame.
3. **Sign-off (4.57 to 6.8s), hard cut to white**
   - The track flies outward and fades.
   - The mark and *acme* wipe in, and "RACING SHOES DESIGNED / & ENGINEERED IN ITALY" types out between them. The three sit on one row, centred in the screen on the line of the mid-edge markers.

When the reveal ends, a **Discover CO2** button appears. Clicking it runs the exit, and so does scrolling down from the sign-off card (mouse wheel, trackpad, swipe, or Page Down, Down arrow, Space or End):
- The mark, the mono line and *acme* are pulled along curves into the button, as if down a drain (0.9s). They speed up, shrink and blur as they bunch together, so they never overlap awkwardly. The rest of the card stays still.
- The page holds still while they move, so the exit and a scroll gesture never fight.
- The moment they hit, the button gives a small press and the page snaps down to the product section in under half a second, starting at full speed and braking hard. Focus moves to the section, and off screen the hero resets to the sign-off card.

Below the hero, the page has a product section. It shows a still of the poster next to the copy, specs, a price and a demo "Pre-order" button, then a footer.

Plain HTML, CSS and vanilla JS, with no dependencies. Classes are prefixed `ui-reveal`.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The landing page: the reveal hero, the product section and the footer |
| `style.css` | Stage layout, phase styles, controls and the landing page around them |
| `script.js` | The timeline: geometry for the track, logo and wordmark; the player; the poster still |
| `images/co2-shoe.webp` | Transparent shoe cut-out (1272 × 972) |
| `images/co2-terrain.webp` | Terrain strip with a transparent sky (1491 × 396) |
| `preview.png` | The poster beat |

The two images come from the supplied poster. The baked-in wordmark, small type and track lines were masked out and the gaps filled. The shoe was cut out of the background, and both images were upscaled 3× with EDSR.

## How it is built

- **One clock.** `Stage.render(t)` works out every element's state from a single time in seconds. That makes pausing, replaying and seeking exact. Add `?t=3.8` to the URL to freeze any moment, which helps with design review and screenshots.
- **One frame.** The composition is laid out on a 720 × 900 frame, the size of the source video, centred in the hero at `min(100cqw, 80cqh)`. Inside it, `1 design px = 100cqw / 720`. Everything else, such as the background, terrain, markers, grain and the far ends of the track, fills the whole viewport. So it holds up at phone width, on a desktop and on an ultrawide screen.
- **Drawn as vectors.** The JS generates the track lanes, the logo mark and the CO2 wordmark as SVG paths, so they can change shape and stay sharp:
  - each lane is a stadium that starts as a circle and stretches into a track
  - the mark's horizontal feet grow longer
  - each letter's straight runs stretch while its curves keep their radius
- **Hard cuts.** `data-phase="intro|poster|end"` on the hero switches the backgrounds and which elements show, so each cut lands on an exact frame.

## Accessibility

- The animated stage is `aria-hidden`. A visually hidden `<h1>` gives its meaning: "CO2 by acme. Racing shoes designed and engineered in Italy."
- It runs for 6.8s, so there are **Pause/Play** and **Replay** buttons (WCAG 2.2.2). They are 44px targets with labels that update ("Pause animation", "Play animation", "Play animation from the start") and a visible focus ring.
- **Reduced motion:** nothing plays on its own. The hero shows the settled poster, the grain stops, and the Play button runs the full reveal only on request. If the setting turns on while the reveal is playing, it stops on the poster. With reduced motion, Discover skips the exit and jumps straight to the product section, and scrolling is never taken over.
- A skip link jumps to the product details. The product section uses a real heading, a `<dl>` for the specs and a native button, and the "Pre-order" result is announced through a polite live region.
- Text contrast is 7:1 or higher on the dark sections. The tiny mono labels never go below 7.5px, even when the frame is phone-sized.
- In forced-colours mode, the controls get system borders.

## Customise

- **Copy:** the text in `index.html` (`data-type` holds the text that types out).
- **Colours:** the `--ui-reveal-*` tokens at the top of `style.css`.
- **Pace:** `T_POSTER`, `T_END` and `T_TOTAL` at the top of `script.js`. The other times sit with the step they control in `Stage.prototype.render`.
- **Readouts:** `HUD` in `script.js` lists the pinned points, in 720 × 900 frame units.
- **Events:** the Pre-order button fires `ui-reveal:preorder` with `{ reserved: true | false }`.
