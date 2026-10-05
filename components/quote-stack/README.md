# Quote Stack

An animated testimonial, rebuilt from Jitter's free animated testimonial template (the *Mango* one). A stack of three sheets of frosted glass sits over a photograph. The camera pulls back, the stack collapses into one card, the quote lands word by word, the author arrives, and the card likes itself with a pop. Then the front card drops away and the next quote comes up out of the stack.

Plain HTML, CSS and vanilla JS, with no dependencies. Classes are prefixed `ui-quotes`.

## What it does

The source video is a 5.167s loop (155 frames at 30fps). Every beat below was tracked frame by frame and is reproduced at the same second:

1. **Collapse (0 → 1.35s).** Three panes of glass, fanned 75px apart vertically and 8px horizontally, slide together into one card while the camera pulls back from 1.5× to 1×. Both move on `cubic-bezier(.55, 0, .03, .92)` — a long anticipation and then a hard glide in. The card itself comes down from 1.53× to 0.91× over the same beat.
2. **The quote (0.70 → 1.75s).** Each word rises half a line, unblurs and fades in, 45ms behind the one before it. The opening quote mark hangs out of the measure and rides in with the first word.
3. **The author (1.44 → 2.26s).** The avatar grows from nothing, then the name and role land word by word.
4. **The like (2.17 → 3.20s).** The outline heart has already faded in. The card tightens to 0.82×, the heart fills blush from its centre, and the card pops to 1.04× before settling back to 1×. The squeeze is the anticipation; the like is the beat it lands on.
5. **Hold, then hand over.** At 5.167s the front card blurs and lifts away while the next one fans out of the stack and starts its own reveal.

The camera pull-back only plays once, on the first quote. Everything after that starts from the stack.

### Visitor controls

| Input | Action |
| --- | --- |
| Click the heart, or Enter / Space on it | Like or unlike the quote |
| ← / → | Previous / next quote |
| Click a dot | Jump to that quote |
| Swipe sideways | Previous / next quote |
| Pause / Play | Stop or restart the reveal |

The reveal pauses while keyboard focus is inside the card, so nothing moves under someone reading it, and while the frame is scrolled off screen.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Five quotes, the Mango chrome and the controls |
| `style.css` | The frame, the glass, the type and the reveal, all in source pixels |
| `script.js` | One clock, the tweens, the hand-off, input and accessibility state |
| `images/scene.webp` | The photograph, rebuilt from the video (1728 × 1080) |
| `images/avatar.webp` | John Doe's portrait, cut from the video (160 × 160) |
| `preview.png` | The resting card at 1440 × 900 |

### How the photograph was recovered

The card never leaves the frame in the source, so the photo behind it had to be rebuilt:

- The plate starts from **frame 65**, the moment the card is at its smallest (0.826×) and the most of the photo is on show.
- Inside that panel the glass is taken back off — an 11% white veil over a 6% desaturation, fitted pixel by pixel against the source rather than guessed — and the bright rim and drop shadow are painted out.
- The quote, the avatar and the heart are inpainted away, and what is left stands in for the photo the card covers for the whole animation. It is already a blur of the real background, which is all the card will ever show of it.
- The source burns its own wordmark, site label and Jitter badge into the frame. Each is patched over with clean texture lifted from beside it and Poisson-blended, so the rebuild can draw its own.
- The plate is then upscaled 1.5× for the camera push-in.

Re-glassed by the browser, the rebuilt card lands within about 5/255 of the source across its interior.

## How it is built

- **One clock.** Every motion is a tween on one clock, so pausing is exact. Add `?t=2.4` to the URL to freeze the reveal at any second, which is how the frames above were checked against the video. `?autoplay=0` starts paused.
- **Sized in source pixels.** `--cu` is one pixel of the 1152px-wide source frame, `--tu` the same for type, `--su` for the chrome. Every length in the stylesheet is the number measured off the video multiplied by one of them, so the card is 444.5 units wide with 69 units of padding and a 17.4/20.75 quote, exactly as in the source.
- **The glass scales, the words do not.** In the source the card squeezes and pops while the text stays put, so the panes are their own layer behind a body that never transforms.
- **Words reveal in CSS.** The script writes one number, `--t`, onto the card each frame. Each word carries its place in the queue as `--i` and works out its own progress with `clamp()` and `calc()`, so the cost of a reveal does not grow with the word count.
- **Three panes, two of them part-time.** The pair behind the front card are hidden whenever the stack is closed, so only one backdrop filter is running at rest.

## Accessibility

- The frame is a labelled carousel (`aria-roledescription="carousel"`) with one slide group per quote, labelled "1 of 5" and so on, and each quote is a `blockquote` with a `figcaption`.
- The heart is a real toggle button reporting `aria-pressed`. Its glyph keeps the source's 21px but its target is never smaller than 44 × 44.
- Moves the visitor makes are announced through a polite live region ("2 of 5. Priya Raman, Growth lead at Fathom"). The reveal itself stays quiet.
- The reveal runs longer than 5 seconds, so there is a **Pause/Play** button (WCAG 2.2.2) with a visible focus ring. **Previous** and **Next** appear when they take keyboard focus.
- **Contrast.** Measured off the rendered page with the text hidden, against the brightest pixel behind each run of type: the quote is 4.7:1 and the name 4.8:1 on a wide frame, 4.7:1 and 5.5:1 in portrait; the site label 5.7:1, the wordmark 4.7:1, the heart 4.1:1. Two things pay for that, and neither is in the source: a 18% warm-black veil on the glass, and a soft scrim in the top-right corner under the site label. The source itself sits at about 3.5:1. The name is also at full strength here; the source dims it to 66%, which `--ui-quotes-ink-soft` will give you back.
- **Reduced motion:** nothing plays on its own. The camera stays at 1×, the stack never fans, and each quote is simply there, complete. The arrow keys and the dots still move between quotes.
- In forced-colours mode the glass becomes a plain system panel with a system border, and the heart an outline until it is liked.
- Without JavaScript the first quote sits there fully revealed.

## Responsive

The frame is 8:5 on a wide screen, as in the source. Below 720px, or in portrait, it becomes 4:5 and re-crops the photograph; the card grows to 88% of the frame and the type scale parts company from the card scale so the quote never drops under 16px. The portrait crop puts the card on sunlit plywood instead of the shaded wall, so the plate is dusked down behind it to hold the contrast — see the `.ui-quotes__scrim` band in the portrait block.

## Customise

- **Quotes:** each `<li data-item>` in `index.html`. The text is plain in the markup; the script splits it into words. A `<br>` is kept, which is how the name sits on two lines. Use `.ui-quotes__avatar--mono` with two letters for anyone without a portrait.
- **Colours:** the `--ui-quotes-*` tokens at the top of `style.css`.
- **Glass:** `--ui-quotes-veil`, `--ui-quotes-shade`, `--ui-quotes-desat` and `--ui-quotes-frost`.
- **Pace:** `CYCLE`, `ENTER_DUR`, `SETTLE` and the word timings at the top of `script.js`, plus `--w0` / `--ws` / `--wd` on the quote and the name in `style.css`.

## Credit

Rebuilt from a free [Jitter](https://jitter.video) template. The Mango brand, the photograph and the quote text are the template's.
