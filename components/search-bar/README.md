# Expanding Search Bar

A minimal search control. At rest it's a hairline circle with a magnifier. Click it and the circle stretches into a pill and the text field fades in. Click the magnifier again, click anywhere outside, or press Escape to close it. There's no × button.

- Plain HTML, CSS and about 40 lines of vanilla JS. No dependencies.
- All classes are prefixed with `ui-search`, so the styles won't clash with a theme.
- Themed through CSS custom properties.
- Keyboard accessible, and respects `prefers-reduced-motion`.

Open `index.html` to see both demo variants.

## Use it on any site

1. Load the font (or swap `--ui-search-font` for your own):
   ```html
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500&display=swap">
   ```
2. Include `style.css` in the `<head>` and `script.js` before `</body>`.
3. Paste the markup. Give each instance its own `id` / `for` / `aria-controls` value.

```html
<form class="ui-search" data-ui-search role="search" action="/search" method="get">
  <label class="ui-search__label" for="ui-search-1">Search</label>
  <button class="ui-search__toggle" type="button" aria-label="Open search" aria-expanded="false" aria-controls="ui-search-1">
    <svg class="ui-search__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>
  </button>
  <input class="ui-search__input" id="ui-search-1" type="search" name="q" placeholder="Search the collection" autocomplete="off">
</form>
```

**Right-aligned (in a header):** put the form inside a wrapper with `display:flex; justify-content:flex-end; flex:1; min-width:0`. The pill then grows leftward and never overflows its space.

## Shopify

1. Upload `style.css` as `assets/ui-search.css` and `script.js` as `assets/ui-search.js`.
2. Create `snippets/ui-search.liquid` containing:
   ```liquid
   {%- assign sid = 'ui-search-' | append: section.id -%}
   {{ 'ui-search.css' | asset_url | stylesheet_tag }}
   <form class="ui-search" data-ui-search role="search" action="{{ routes.search_url }}" method="get">
     <label class="ui-search__label" for="{{ sid }}">Search</label>
     <button class="ui-search__toggle" type="button" aria-label="Open search" aria-expanded="false" aria-controls="{{ sid }}">
       <svg class="ui-search__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>
     </button>
     <input class="ui-search__input" id="{{ sid }}" type="search" name="q" value="{{ search.terms | escape }}" placeholder="Search the collection" autocomplete="off">
     <input type="hidden" name="options[prefix]" value="last">
   </form>
   <script src="{{ 'ui-search.js' | asset_url }}" defer></script>
   ```
   Keep `name="q"` on the input. Shopify's search page reads that field.
3. Render it wherever you want it, for example in `sections/header.liquid`: `{% render 'ui-search' %}`.

## Behaviour

| Action | Result |
| --- | --- |
| Click the magnifier (closed) | Opens and focuses the input |
| Click the magnifier (open) | Closes |
| Enter | Submits the form |
| Escape | Closes and returns focus to the magnifier |
| Click or tab away | Closes (typed text is kept) |

## Tokens

Set any of these on `.ui-search` or on any ancestor element.

| Token | Default | Purpose |
| --- | --- | --- |
| `--ui-search-size` | `48px` | Circle diameter and bar height |
| `--ui-search-width` | `360px` | Width when open (capped at 100% of the container) |
| `--ui-search-font` | `"Work Sans", …` | Font family |
| `--ui-search-font-size` | `16px` | Input text size (16px or more avoids iOS zoom) |
| `--ui-search-font-weight` | `300` | Input weight |
| `--ui-search-tracking` | `0.03em` | Letter spacing |
| `--ui-search-fg` | `#161616` | Icon and text colour |
| `--ui-search-muted` | `rgba(22,22,22,.45)` | Placeholder colour |
| `--ui-search-bg` | `transparent` | Background when closed |
| `--ui-search-bg-open` | `rgba(255,255,255,.55)` | Background when open |
| `--ui-search-border` | `rgba(22,22,22,.22)` | Border at rest |
| `--ui-search-border-open` | `#161616` | Border on hover and when open |
| `--ui-search-focus` | `#161616` | Keyboard focus ring |
| `--ui-search-stroke` | `1.25` | Icon line weight |
| `--ui-search-duration` | `600ms` | Length of the expansion |
| `--ui-search-ease` | `cubic-bezier(.22,1,.36,1)` | Easing curve |

Dark example:

```css
.site-header .ui-search {
  --ui-search-fg: #F2EEE6;
  --ui-search-muted: rgba(242,238,230,.42);
  --ui-search-border: rgba(242,238,230,.2);
  --ui-search-border-open: #B89B6A;
  --ui-search-bg-open: rgba(242,238,230,.04);
}
```
