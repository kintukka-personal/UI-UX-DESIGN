# Full-page Slideshow Homepage

An editorial homepage in the style of a fashion house:

- **Full-screen slides.** One scroll, swipe or arrow key moves exactly one slide, with a smooth one-second glide. Trackpad momentum doesn't skip slides.
- **Shrinking logo.** A large logo sits under the header at the top of the page and shrinks into the header bar on the first scroll. Scrolling back to the top makes it large again.
- **Automatic contrast.** The header, logo and icons switch between white and black to suit the slide behind them. They switch as the incoming slide passes under the header. The bottom indicator ("Scroll to explore", then "2 / 6") does the same.
- **Solid on hover.** Hovering the header turns it white with black text.
- **Menu and search.** The menu drawer slides in from the left and closes with Close, a click outside or Escape. The Search takeover comes from [`../header-search`](../header-search/).
- **Normal page below.** Anything after the last slide (a footer, more sections) scrolls normally.

Built with plain HTML, CSS and vanilla JS, with no libraries. Class names are prefixed `ui-fp`. With reduced motion turned on, slides still step one at a time but jump instantly.

Open `index.html` for the demo. The slide backgrounds are CSS placeholders standing in for campaign photos.

## Files

| File | What it is |
| --- | --- |
| `style.css` | Header, logo, slides, indicator and menu drawer |
| `script.js` | Slide stepping, logo shrink, colour switching, menu drawer |
| `shopify/ui-fp-header.liquid` | Shopify header section (logo, menu, search, icons) |
| `shopify/ui-fp-slideshow.liquid` | Shopify homepage section: one block per slide |

It also needs `../header-search/style.css` and `../header-search/script.js`.

## Marking backgrounds

Give every slide `data-ui-fp-bg="dark"` (white text) or `data-ui-fp-bg="light"` (black text). Any other element can carry the attribute too, such as a footer, and the header will follow it as it scrolls underneath.

## Shopify

1. **Assets.** Upload these four files to the theme's `assets/` folder:
   - this folder's `style.css` as `ui-fp.css`
   - this folder's `script.js` as `ui-fp.js`
   - `../header-search/style.css` as `ui-hsearch.css`
   - `../header-search/script.js` as `ui-hsearch.js`
2. **Sections.** Add `shopify/ui-fp-header.liquid` and `shopify/ui-fp-slideshow.liquid` to `sections/`.
3. **Header.** In `sections/header-group.json`, or in `layout/theme.liquid` for older themes, replace the theme's header section with `ui-fp-header`.
4. **Homepage.** In the theme editor, add **UI full-page slideshow** as the first section on the homepage. Add one slide block per image, and set "Image is mostly" to dark or light for each slide.
5. **Menus.** In **Online Store → Navigation**:
   - The menu drawer uses `main-menu` by default.
   - Create two more menus for the search panel columns, such as "Highlights" and "What's trending", and pick them in the header section settings.
6. **Font.** Load Work Sans in `layout/theme.liquid`, or set `--ui-fp-font` and `--ui-hsearch-font` to the theme's font:
   ```html
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600&display=swap">
   ```

On every page except the homepage, the header renders solid white with the compact logo, and a spacer keeps content from sliding underneath it.

**Logo:** upload a white version (for dark slides) and a black version (for light slides). They cross-fade as the colours switch. With no logo uploaded, the store name is shown as a text logo.

## Tokens

Set these on `:root`.

| Token | Default | Purpose |
| --- | --- | --- |
| `--ui-fp-font` | `"Work Sans", …` | Font family |
| `--ui-fp-fg-on-dark` | `#FFFFFF` | Header, caption and counter colour over dark slides |
| `--ui-fp-fg-on-light` | `#111111` | The same over light slides, and on hover |
| `--ui-fp-solid-bg` | `#FFFFFF` | Header background on hover, and the menu drawer |
| `--ui-fp-duration` | `1000ms` | Length of a slide move and of the logo shrink |
| `--ui-fp-ease` | `cubic-bezier(.65,0,.35,1)` | Easing for the logo and header |

Set these on `.ui-fp-header` (smaller values apply automatically under 640px):

| Token | Default | Purpose |
| --- | --- | --- |
| `--ui-fp-bar-h` | `96px` | Header bar height |
| `--ui-fp-logo-h` | `110px` | Large logo height |
| `--ui-fp-logo-top` | `22px` | Large logo distance from the top |
| `--ui-fp-logo-scale` | `0.3` | Compact logo size, as a fraction of the large size |
| `--ui-fp-gutter` | `24px` | Side padding |
