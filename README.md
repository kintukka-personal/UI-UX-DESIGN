# UI-Design

Reusable UI components in plain HTML, CSS and vanilla JS, ready to drop into any website or Shopify theme.

## Components

| Component | Description |
| --- | --- |
| [Search bar](components/search-bar/) | A magnifier that expands into a minimal pill search field |
| [Header search](components/header-search/) | A full-width search bar that sweeps down over the header, with a quick-links panel |
| [Full-page slideshow](components/fullpage-slideshow/) | Editorial homepage: one-scroll-per-slide, shrinking logo, header colours that follow each slide |
| [Snap scroll](components/snap-scroll/) | One scroll, swipe or arrow key moves exactly one full-screen section |
| [Discount button](components/discount-button/) | Apply button with a shimmering hover, a bounce and confetti on success, and a shake on error |
| [Product turntable](components/product-turntable/) | Drag or swipe to rotate a product; a WebGL morph between a few photos |
| [Numeric text](components/numeric-text/) | Numbers that change roll only the digits that changed, up or down, in about 200ms |
| [Number roll](components/number-roll/) | Odometer-style digit strips that roll through every number in between, with per-column stagger and selectable easing |
| [Numeric text (React)](components/numeric-text-react/) | React component: changed digits roll as an odometer, with an optional motion blur that follows the digit's speed |
| [Product card](components/product-card/) | Editorial product hero: giant wordmark, a floating cut-out over a two-tone stage, colourway swatches that retint the card, and an animated Add to bag. Includes a Shopify section |
| [Product card (watch)](components/product-card-watch/) | The product card set up for a watch, in golden hour on dark stone: a champagne "ACIER" lit from the upper left, the FOSLN quartz watch standing in front, Chrome and Onyx dial swatches, a $97 sale price, a gold "Add to cart" button, and the same build-in and fly-to-cart. Includes a Shopify section |
| [Profile card](components/profile-card/) | Editorial coach profile: a giant two-line name behind a cut-out portrait, a bracketed stat on the shirt, and a split "Book a session" button |
| [Chef card](components/chef-card/) | The profile card rebranded for Dine In's Brooke Silk: gold on Dine In green, with her four awards on the jacket, her Google rating and a "Book an experience" button |
| [Animated theme toggler](components/theme-toggler/) | Light/dark switch where the new theme grows out of the button as a circle, using the View Transitions API. A plain-JS rebuild of Magic UI's React component |
| [App rating screen](components/rate-screen/) | Full-screen "How is Cloey doing?" onboarding step: five gold stars in laurels, a cheering panda, and a "Rate Cloey" button that fires the native review prompt, then becomes "I rated" with a "Not now" link |
| [Spot Me rating screen](components/spot-me-rate/) | The app rating screen rebranded for Spot Me: "Hey, bestie!!", stars in laurels, the avatar inside the crush ring, and a "Rate Spot Me" button. After the tap the heart completes the ring and pink confetti bursts out |
| [MacBook scroll](components/macbook-scroll/) | React + Motion + Tailwind: on scroll the screen ejects from a laptop and lands full-size in the viewport, the laptop drops out of focus, and the landing hits with an overshoot, a ring pulse and a sheen |
| [Product reveal](components/product-reveal/) | Product-launch hero rebuilt from Jitter's "Logo reveal" template: a running track and logo mark build, a hard cut to the CO2 shoe over red Martian ground with tracking readouts and a smeared zoom, then a white sign-off card. Pause, replay and reduced-motion support, plus a product section |

## Sites

| Site | Description |
| --- | --- |
| [Dine In (baseline)](sites/dine-in-baseline/) | The untouched baseline: a plain HTML/CSS/JS rebuild of dine-in.com.au, with every page, menu, form and the shop, kept as the reference to compare component experiments against before upgrading the real site |
| [Dine In (v2)](sites/dine-in-v2/) | The working copy of the baseline, where components get added. First change: the Chef card in the homepage "Meet Chef Brooke Silk" panel |
