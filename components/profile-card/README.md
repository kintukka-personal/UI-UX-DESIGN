# Profile Card

An editorial profile card for a coach or trainer, with the person as the hero. Their name is set huge in two lines ("MAYA / ROSS") and their cut-out portrait stands in front of it. A bracketed stat sits on their shirt, and a tagline and a split "Book a session" button finish the card.

![Profile card preview](preview.png)

- **Layout** (top to bottom):
  - Top bar: a round monogram in the accent colour on the left, a two-line menu button on the right.
  - Name: two lines, each stretched to the same width edge to edge. The lines touch, and the portrait covers their middle.
  - Portrait: head and shoulders over the name. It fades into the page around the folded arms.
  - Stat: `[8⁺] YEARS COACHING` in white on the shirt.
  - Meta row: role ("Strength & running coach") in the accent colour on the left, rating and client count on the right.
  - Tagline: tracked uppercase, two lines.
  - Button: a black bar with "Book a session" and "from $60", plus a blue square with an arrow.
- **Grid:** two faint hairlines divide the card into thirds, behind everything.
- **Intro:** the first time the card scrolls into view, it plays in three beats. From the first frame, the stat, meta row, tagline and button show as skeleton placeholders: bars in the exact shape of their text, in a faint tint of the ink, with a slow shine. That way the layout is already there, but nothing competes with the name.
  1. The name types out letter by letter (MAYA, a short pause, then ROSS) behind a blinking blue caret. Each letter appears in its final place, because the stretched layout is already set.
  2. As the last letter lands, the portrait opens out from the centre of the face (the caret blinks a moment longer, then fades) as a soft-edged circle. It fades in and settles from a slight zoom as it grows.
  3. As the portrait lands, the information loads one row at a time. Each row fills in from its skeleton with a small settle. Its numbers wait until it has fully filled in, show their starting value for a moment, then count. The next row starts as soon as that count has all but settled, so there are no dead pauses:
     - the stat, with the years counting 0 → 8
     - after a short pause, the meta row: role, ★ 0.0 → 4.9 and 0 → 120 clients
     - the tagline
     - the button, which turns from a pale block to black and blue while the price counts down from $100 to $60

     Decimals are kept, and a number that counts up holds its final width, so nothing beside it shifts.
  The whole intro takes about 6.5 seconds, and `window.uiProf.play(card)` replays it. The demo has a "Replay intro" button.
- **Hover:** hovering the monogram tilts it, hovering the menu shortens its bottom line, and hovering the button nudges the arrow out to the top right.
- **Reduced motion, or no JavaScript:** the card shows at rest with the final numbers.
- **Scaling:** every size comes from the card's width (390 design units, using container query units), so the whole layout scales as one piece from a 320px phone up to the 430px max width.

Plain HTML, CSS and vanilla JS, no dependencies. Classes are prefixed `ui-prof`. Open `index.html` for the demo, which shows the card in a phone frame.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Demo page: the card inside a phone frame with a status bar |
| `style.css` | Component styles, including the intro states |
| `script.js` | The intro: typewriter name, portrait reveal and count-ups |
| `images/maya-ross.webp` | Transparent portrait cut-out that fades out at the bottom (818 × 1118) |
| `preview.png` | Screenshot of the demo |

## Markup

```html
<article class="ui-prof" data-ui-prof>
  <div class="ui-prof__inner">
    <span class="ui-prof__grid" aria-hidden="true"></span>

    <header class="ui-prof__bar">
      <a class="ui-prof__mark" href="#">Maya<br>Ross</a>
      <button class="ui-prof__menu" type="button" aria-label="Menu"><span></span><span></span></button>
    </header>

    <h2 class="ui-prof__name">
      <svg viewBox="0 0 390 296" aria-hidden="true" focusable="false">
        <text x="18" y="149" textLength="354" lengthAdjust="spacingAndGlyphs">MAYA</text>
        <text x="18" y="292" textLength="354" lengthAdjust="spacingAndGlyphs">ROSS</text>
        <rect class="ui-prof__caret" x="18" y="0" width="7" height="149"/>
      </svg>
      <span class="ui-prof__sr">Maya Ross</span>
    </h2>

    <figure class="ui-prof__media">
      <img class="ui-prof__img" src="images/maya-ross.webp" width="818" height="1118" alt="…">
    </figure>

    <p class="ui-prof__stat">
      <span class="ui-prof__stat-num"><span data-ui-prof-count>8</span><sup>+</sup></span>
      <span class="ui-prof__stat-label"><span>Years<br>coaching</span></span>
    </p>

    <div class="ui-prof__body">
      <p class="ui-prof__meta" data-ui-prof-pause="300">
        <span class="ui-prof__role">Strength &amp; running coach</span>
        <span class="ui-prof__proof"><b>★ <span data-ui-prof-count>4.9</span></b> · <b data-ui-prof-count>120</b> clients</span>
      </p>
      <p class="ui-prof__tagline"><span>Train for the life you want to keep living.</span></p>
      <a class="ui-prof__cta" href="#book">
        <span class="ui-prof__cta-label">Book a session <span class="ui-prof__cta-note">from $<span data-ui-prof-count data-ui-prof-count-from="100">60</span></span></span>
        <span class="ui-prof__cta-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg></span>
      </a>
    </div>
  </div>
</article>
<script src="script.js"></script>
```

The caret is the `ui-prof__caret` rect inside the name's SVG. Mark any number that should count with `data-ui-prof-count`, as in `<span data-ui-prof-count>8</span><sup>+</sup>`. The number written in the HTML is the one it ends on, and the one shown without the script. It counts up from 0 unless `data-ui-prof-count-from` gives another start. A start above the final number makes it count down, as in `from $<span data-ui-prof-count data-ui-prof-count-from="100">60</span>`. To add a short pause before a row loads, put `data-ui-prof-pause` on it with a time in milliseconds. The meta row uses `data-ui-prof-pause="300"`, so it waits until the 8 has finished counting.

**Changing the name:** edit the two `<text>` lines and the hidden `ui-prof__sr` text. `textLength` stretches each line to the full width, whatever its length, so a short name gets wide letters and a long one gets narrow letters. Names of 4–6 letters per line look best.

## Theming

Colours and fonts are custom properties on `.ui-prof`:

| Property | Default | What it does |
| --- | --- | --- |
| `--ui-prof-accent` | `#2640E0` | Name, monogram, role and arrow tile |
| `--ui-prof-bg` | `#F3F1EA` | Cream page |
| `--ui-prof-grid` | `#E4E1D9` | The two column hairlines |
| `--ui-prof-ink` | `#141416` | Tagline, menu and button |
| `--ui-prof-muted` | `#6F6D68` | "clients" in the meta row |
| `--ui-prof-cta-note` | `#8C8C90` | "from $60" |
| `--ui-prof-skel` | ink at 7% | Skeleton bars during the intro |
| `--ui-prof-skel-shine` | page at 75% | The shine that sweeps across them |
| `--ui-prof-display` | Anton | Typeface for the name |
| `--ui-prof-font` | Inter | Typeface for everything else |
| `--ui-prof-radius` | `0` | Corner radius in design units |
| `--ui-prof-inset-top` | `0px` | Extra top padding when the card sits under a status bar |

The demo loads Anton and Inter from Google Fonts.

## Portrait

The portrait was cut out of the reference mock-up as a placeholder. The baked-in "8+ years" text was painted out, and the bottom ~30% fades to transparent. It came from a screenshot, so it's slightly soft at 2x. To use a real photo:

- export a transparent PNG/WebP, about 820 × 1120 or larger
- frame it from the top of the head to just below folded arms
- fade the bottom ~30% to transparent

If the aspect ratio is different, update `aspect-ratio` on `.ui-prof__media`. Then nudge its `top` so the head starts about a fifth of the way down the first line of the name.
