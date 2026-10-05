# Acier Reveal

A launch hero for the **FOSLN Acier** quartz watch, built on the [Product reveal](../product-reveal/) engine. It keeps that component's single timeline, frame scaling, controls, Discover exit and product section. The story and the motion are new: the page is about how a quartz watch keeps time, and the watch on it actually runs, on the visitor's own clock.

Three beats, joined by match cuts and a dissolve:

1. **Quartz (0 to 5.2s), on pale steel paper**
   - At the centre, letters cycle and lock one by one, left to right, until they spell **FOSLN**.
   - The letters come first and lock by 0.7s. After a 0.4s pause the 60 minute ticks appear around them, faster and faster, with heavier ticks at the hours.
   - The moment the last tick lands, over an unhurried 0.65s with overlapping phases, the letters squash into a thin line, which stretches out to the right into the seconds hand, pointing at 3 o'clock. The hub grows in at the centre as it lands.
   - **The hands, as one continuous move:** from 3 o'clock the seconds hand sweeps a full turn in quartz steps and carries on into the visitor's current second. The minute hand grows out of the hub and turns a full revolution into the current minute. The hour hand joins last and turns to the current hour.
   - Meanwhile the ring, with the hands on it, shrinks and moves until it is exactly the size and position of the watch dial. All three hands land on the watch's live time just as the ring lands.
2. **Poster (5.2 to about 15.4s), dissolving to graphite**
   - The paper layer dissolves into the watch. The ink hands sit exactly on top of the watch's own hands, so the time carries straight through. The bracelet extends out of the case as it appears.
   - **Live hands:** the photo's printed hands were painted out and replaced with drawn ones. They show the visitor's local time and step once a second with a small quartz overshoot.
   - **ACIER** assembles in brushed steel, link by link. Each letter is cut into five bands, like the bracelet's links, and every band slides in from alternating sides and locks with a slight overshoot.
   - A band of light passes over the letters and the watch. On the watch it lands only on the steel, because it is masked by the photo itself.
   - The poster holds on just the watch and ACIER for a moment.
   - **Callouts on the tick:** each callout appears on a tick of the watch's real seconds hand, one per second: **Local time** (with the live time, pointing into the dial by the hands), Quartz movement (at the crown), Link bracelet (at the lower bracelet), Steel case, Onyx dial. The first waits for the next real tick, so all five stay in step with the hand. A short hold follows.
   - The callouts clear and the camera dives into the black dial while the hands fade.
3. **Sign-off (about 15.4 to 17.4s), out of the black**
   - The FOSLN plate from the watch, redrawn, wipes in. "STAINLESS STEEL / QUARTZ MOVEMENT" types out and a small steel ACIER assembles beside it, all on one centred row.

When it ends, the watch's **crown** appears at the bottom: the knurled winder from the side of the case, seen tread-on like a scroll wheel, with a small "WIND DOWN" label: what you do to a crown, the direction you scroll, and an invitation to slow down. A glint of light runs across the letters each time the beams arrive. Scrolling down from the sign-off, or clicking or tapping the crown, pulls the three pieces down the drain into it. The crown presses in as they arrive, and the page snaps to the product section. Hovering winds the crown continuously.

**Light beams** guide the eye to the crown. A faint track runs from under each sign-off piece to the top of the crown, along the same curve that piece will drain down. White pulses of light, each a bright glowing head with a soft tail, run along them in a loop: the outer two slightly after the middle one, speeding up as they go, like water finding the drain. Each time they arrive, the crown's grooves turn one notch and a ring of light breathes out from it. The beams fade out the moment the exit starts. With reduced motion only the faint tracks show and the crown stays still.

The **product section** is a watchmaker's bench:
- **The watch, large and live**, on its own: no name or callouts, since the hero already showed them. Its hands keep local time. It tilts a few degrees in 3D towards the pointer, and a light follows the pointer across the steel, masked by the photo so it only lands on metal. With no pointer over it, the light drifts and the watch sways gently.
- **A giant dial behind it:** the intro's 60-tick ring, faint, centred on the watch's own dial, with a touch of parallax. The tick for the current second glows, with a trail that fades over six seconds, so the section keeps the real time.
- **Copy:** the description is a large serif statement, ending in italics on "nothing on it but the hands", with the quartz line as a small mono note.
- **Price and Add to bag:** the sale price, $97, is set in brushed steel, with the retail price of $225 struck through beside it and a "SAVE 57%" tag. Screen readers hear "Sale price $97, was $225". Add to bag is a full-width dark bar with a fine steel edge. On hover a band of white steel fills it from the left and the text turns dark. Adding locks the fill in, runs a glint across it, rolls the label up to "In your bag" and sends a lap of light round the giant dial. Clicking again removes it. The result is announced to screen readers only, with no message left on screen.
- **Arrival:** when the drain lands here, or the section is scrolled into view, the dial turns in, the watch rises out of a blur, and the copy follows, each in turn. It resets once the section is off screen, ready for the next visit.

Plain HTML, CSS and vanilla JS, with no dependencies. Classes are prefixed `ui-acier`.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The landing page: the reveal hero, the product section and the footer |
| `style.css` | Stage layout, phase styles, controls and the landing page around them |
| `script.js` | The timeline, the steel letters, the hands and real clock, callouts, the player, the beams and the crown exit |
| `images/acier-watch.webp` | The watch cut out of the supplied photo, printed hands removed, upscaled 2× (1064 × 1756). Used by the hero and the bench |
| `preview.png` | The poster beat |

## How it is built

- **Two clocks.** `Stage.render(t)` draws every moment of the sequence from one time in seconds, so pause, replay and `?t=4.2` seeking are exact. A second loop reads the real time and moves the hands on every stage, the hero and the product-section still. During playback, the callouts are pinned to that real clock: `callFirst()` finds the timeline time of the first real tick after `CALL_START`. Stills and frozen frames use `CALL_START` itself.
- **One frame.** As in Product reveal, the composition sits on a 720 × 900 frame centred at `min(100cqw, 80cqh)`, and backgrounds and markers fill the viewport.
- **Steel as SVG.** ACIER is five custom letter paths, each used as a clip. Inside, five steel bands slide in, with a dark groove between links. The steel is one gradient across the word, and its `gradientTransform` is shifted to move the light.
- **Hands on the photo's own grid.** The hands SVG uses the photo's pixel coordinates (532 × 878), so the hands stay pinned to the dial centre however the watch is scaled. That holds through the 12× dive too.
- **Match cuts.** The ring ends at the dial's radius (118 design px) and centre (360, 360). The intro's hands are the watch's own hand shapes, drawn inside the ring at photo px × (frame px per photo px) ÷ (the ring's scale on the dial). They are about twice the watch's size while the ring is full size and exactly its size when the ring lands, so the dissolve lines them up with nothing swapped. The quartz beat sits on its own paper layer above the poster so it can fade out over it. The dive scales the whole poster around the same point.

## Accessibility

- The animated stage is `aria-hidden`, and a visually hidden `<h1>` says what it shows. The still poster has a caption.
- **Pause/Play** and **Replay** (WCAG 2.2.2). Pause also stops the hero watch.
- **Reduced motion:** nothing plays on its own and the hero shows the poster. The seconds hand is hidden and the hour and minute hands update once a second, without movement you would notice. the crown jumps straight to the product section, and scrolling is never taken over.
- A skip link, a visually hidden `<h2>` naming the product section, a native button with a polite status message, focus rings, and 44px targets.

## Customise

- **Copy:** the text in `index.html`. Text that types out lives in `data-type`. Callout text is in `CALLOUTS` in `script.js`.
- **Colours:** the `--ui-acier-*` tokens at the top of `style.css`. The steel stops are in `steelGradient()`.
- **Pace:** the beats are at the top of `script.js`. Everything after the quartz beat is timed from `T_POSTER`, so moving it shifts the rest. The quartz times, including the hand choreography in `updateInk()`, sit with the step they control.
- **Another watch:** replace the photo, then set `HANDS_C` (dial centre in photo pixels), the box in `.ui-acier__watch` and `DIAL` so the ring still lands on the dial.
- **Events:** Add to bag fires `ui-acier:add` with `{ added: true | false }`.
