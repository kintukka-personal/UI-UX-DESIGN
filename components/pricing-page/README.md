# Pricing page (SimStudio)

The SimStudio pricing page, with three plans (Solo, Team and Enterprise), a Monthly/Yearly toggle and a FAQ where only one answer is open at a time. It follows the SimStudio brand guidelines v3.

![Pricing page preview](preview.png)

- Plain HTML, CSS and vanilla JS. Classes are prefixed with `ui-`. Open `index.html` for the demo.
- The fonts are self-hosted from `fonts/`, so the page also works offline and from `file://`: Poppins ExtraBold for display and Inter (variable, 400 to 700) for everything else. Their SIL Open Font Licences are next to them.
- Reduced motion turns transitions and animation off rather than shortening them. Without JS the page is fully visible, showing monthly prices.

## How the brand is applied

| Guideline | On this page |
| --- | --- |
| Marketing page: primary lockup on white or Surface | Light page on Surface `#F8FAFC`, with the primary lockup at its 180px minimum and one orange-dot diameter of clear space |
| Navy for dark surfaces | The featured Team card is navy and uses the dark palette. Accent text on it is cyan, never blue |
| Primary action: Electric Blue, white text, Deep Blue on hover | The Team button. Solo and Enterprise use the secondary button: transparent with a 3:1 edge |
| Orange is scarce: focus, active controls, key accents | Used only for the two-tone focus ring (2px orange inside, 1px navy or white outside) |
| Cyan is never text on light | Cyan only fills things: the "Save" and "Most popular" chips (navy text, 6.51:1) and added seats |
| Two approved gradients, sparingly | Blue to violet for Capture, Build and Publish in the headline, "Custom" and "questions". Blue to cyan for the Team icon and seats |
| Violet: advanced features | The AI agent integration add-on |
| Type scale | Display 48px, page heading 32px, section heading 24px in Poppins. Body 16px, labels 14px, captions 12px in Inter. Display is set with normal tracking |
| Corners 6 / 10 / 16 / 999px | Chips / buttons and controls / cards / pills |
| 2px rounded line icons, 20px | Every icon |
| Sentence case, no centred body copy | Left-aligned header like the reference. Only the short "Includes" label is in capitals |
| Motion 160 to 240ms, ease-out arriving, ease-in-out moving | Hover 160ms, toggle and FAQ 240ms. The price roll is 300ms: a value you are meant to watch change, the guidelines' own exception |
| No widows | `text-wrap: pretty` everywhere, plus a non-breaking space binding the last two words of each longer phrase |

## What's on it

| Part | Behaviour |
| --- | --- |
| Headline | "Capture it once. / We Build it for you. / Then, Publish it however you need." Three sentences at the Display size, one per line, with the three steps capitalised in the blue-to-violet gradient |
| Billing toggle | Real radio buttons with a sliding navy thumb. The "Save 17%" chip on Yearly is worked out from the prices |
| Prices | Digits roll like an odometer, rightmost first. Yearly shows "Billed yearly as $X" and a "Save $X/yr" chip |
| Solo | 1 seat |
| Team | The navy featured card, with a slow brand-gradient border. 5 seats included, and a stepper adds more (hold to repeat, getting faster). Each added seat appears as a cyan avatar and the price and button text update |
| Enterprise | "Custom" instead of a price, unlimited seats, and an "Inquire for pricing" button. The optional **AI agent integration** add-on has a switch that adds it to the inquiry email |
| Cards | A spotlight follows the pointer, and borders light up near it, including on neighbouring cards |
| FAQ | Opening a question closes the open one. Height, chevron and text all animate. Closed answers are `inert`, and Up, Down, Home and End move between questions |

## Editing prices

Prices live on each card in `index.html`. The script reads them, so nothing else needs to change:

```html
<article class="ui-plan" data-plan="solo" data-monthly="29" data-yearly="24">
<article class="ui-plan ui-plan--featured" data-plan="team"
         data-monthly="79" data-yearly="66"
         data-seats-included="5" data-seat-monthly="19" data-seat-yearly="16">
```

`data-yearly` is the **per-month** price on yearly billing. The save percentage, yearly totals, seat prices in the Team card and the FAQ, and the "Save $X/yr" chips are all calculated from these values.

The Team stepper's limit is `MAX_SEATS` (500) in `script.js`. The Enterprise inquiry address is the `mailto:` on the button marked `data-inquire`.

## Placeholder content to confirm

- All prices ($29 / $24 Solo, $79 / $66 Team, $19 / $16 per extra seat)
- `sales@example.com` for the inquiry and "Talk to us" links
- The logo links to `#`
- The tagline copy, the AI add-on description and the FAQ answers (plan changes and payment methods especially)
- Currency and the "Prices shown exclude tax" note

## Tokens

Set on `:root` in `style.css`. No rule below the tokens carries a colour of its own.

| Token | Value | Purpose |
| --- | --- | --- |
| `--ss-navy` / `--ss-blue` / `--ss-cyan` / `--ss-violet` / `--ss-orange` / `--ss-surface` | `#011D4A` / `#0056FC` / `#01ACFC` / `#5926FC` / `#F59E0B` / `#F8FAFC` | The brand palette |
| `--ss-blue-deep` | `#0047D1` | Primary hover, and accent text on light |
| `--ui-fg` / `--ui-dim` / `--ui-faint` | navy / `#44546F` / `#5B6980` | Text. The faint step is 5.07:1 at worst |
| `--ui-edge` | `#828D9F` | A control's own boundary, 3:1 |
| `--ui-nav-*` | navy, white, `#B4C0D6`, `#93A2BE`, `#5C6E8B` | The dark palette on the featured card |
| `--ui-r-sm` / `--ui-r-md` / `--ui-r-lg` | `6px` / `10px` / `16px` | Corners |
| `--ui-m-fast` / `--ui-m-base` / `--ui-m-slow` / `--ui-m-demo` | `160ms` / `200ms` / `240ms` / `300ms` | Motion |
