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
- **Motion:** on load, the name lines rise in, then the portrait, the stat and the footer, staggered. Hovering the monogram tilts it, hovering the menu shortens its bottom line, and hovering the button nudges the arrow out to the top right. With reduced motion turned on, nothing moves.
- **Scaling:** every size comes from the card's width (390 design units, using container query units), so the whole layout scales as one piece from a 320px phone up to the 430px max width.

Plain HTML and CSS, no JavaScript. Classes are prefixed `ui-prof`. Open `index.html` for the demo, which shows the card in a phone frame.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Demo page: the card inside a phone frame with a status bar |
| `style.css` | Component styles |
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
      </svg>
      <span class="ui-prof__sr">Maya Ross</span>
    </h2>

    <figure class="ui-prof__media">
      <img class="ui-prof__img" src="images/maya-ross.webp" width="818" height="1118" alt="…">
    </figure>

    <p class="ui-prof__stat">
      <span class="ui-prof__stat-num">8<sup>+</sup></span>
      <span class="ui-prof__stat-label">Years<br>coaching</span>
    </p>

    <div class="ui-prof__body">
      <p class="ui-prof__meta">
        <span class="ui-prof__role">Strength &amp; running coach</span>
        <span class="ui-prof__proof"><b>★ 4.9</b> · <b>120</b> clients</span>
      </p>
      <p class="ui-prof__tagline">Train for the life you want to keep living.</p>
      <a class="ui-prof__cta" href="#book">
        <span class="ui-prof__cta-label">Book a session <span class="ui-prof__cta-note">from $60</span></span>
        <span class="ui-prof__cta-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg></span>
      </a>
    </div>
  </div>
</article>
```

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
