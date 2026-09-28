# Header Search Takeover

A header search inspired by fashion-house storefronts.

- **At rest:** a magnifier and the word "Search" sit in the header, and a hairline draws in underneath on hover.
- **On click:** a white search bar sweeps down over the whole header, a quick-links panel follows, and the page behind dims.
- **Closing:** there's no × and no "Close" text. Click the magnifier in the bar, click anywhere outside, or press Escape.

Built with plain HTML, CSS and about 60 lines of vanilla JS. All classes are prefixed with `ui-hsearch`, and the motion respects `prefers-reduced-motion`.

Open `index.html` for the full demo. It includes a transparent header that turns solid on hover.

## Use it on any site

1. Load Work Sans, or set `--ui-hsearch-font` to your own font:
   ```html
   <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500&display=swap">
   ```
2. Include `style.css` in the `<head>` and `script.js` before `</body>`.
3. Make sure your header has `position: relative` (or `absolute`/`fixed`/`sticky`). The takeover layer covers that element.
4. Paste the block below where the Search link should sit in your header.

```html
<div class="ui-hsearch" data-ui-hsearch>
  <button class="ui-hsearch__trigger" type="button" aria-expanded="false" aria-controls="ui-hsearch-layer">
    <svg class="ui-hsearch__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>
    <span class="ui-hsearch__trigger-label">Search</span>
  </button>

  <div class="ui-hsearch__layer" id="ui-hsearch-layer">
    <form class="ui-hsearch__form" role="search" action="/search" method="get">
      <button class="ui-hsearch__close" type="button" aria-label="Close search">
        <svg class="ui-hsearch__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>
      </button>
      <label class="ui-hsearch__sr" for="ui-hsearch-input">Search</label>
      <input class="ui-hsearch__input" id="ui-hsearch-input" type="search" name="q" placeholder="Search" autocomplete="off">
    </form>
    <nav class="ui-hsearch__links" aria-label="Quick links">
      <div class="ui-hsearch__group">
        <p class="ui-hsearch__heading">Highlights</p>
        <ul class="ui-hsearch__list">
          <li><a href="/collections/new">New in</a></li>
          <li><a href="/collections/bags">Bags</a></li>
        </ul>
      </div>
      <!-- add up to three groups -->
    </nav>
  </div>
  <div class="ui-hsearch__scrim" aria-hidden="true"></div>
</div>
```

`.ui-hsearch` uses `display: contents`, so only the trigger takes part in your header's layout.

### Optional overlay header

To get the transparent-over-image header that turns white on hover, add `class="ui-header ui-header--overlay"` to your `<header>`. Leave out `--overlay` to keep the header in the normal page flow. Adjust it with `--ui-header-fg`, `--ui-header-fg-solid` and `--ui-header-bg-solid`.

## Shopify

1. Upload `style.css` as `assets/ui-hsearch.css` and `script.js` as `assets/ui-hsearch.js`.
2. Create `snippets/ui-hsearch.liquid`. The quick links come from two menus you manage in **Online Store → Navigation**:
   ```liquid
   {{ 'ui-hsearch.css' | asset_url | stylesheet_tag }}
   <div class="ui-hsearch" data-ui-hsearch>
     <button class="ui-hsearch__trigger" type="button" aria-expanded="false" aria-controls="ui-hsearch-layer">
       <svg class="ui-hsearch__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>
       <span class="ui-hsearch__trigger-label">Search</span>
     </button>
     <div class="ui-hsearch__layer" id="ui-hsearch-layer">
       <form class="ui-hsearch__form" role="search" action="{{ routes.search_url }}" method="get">
         <button class="ui-hsearch__close" type="button" aria-label="Close search">
           <svg class="ui-hsearch__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/></svg>
         </button>
         <label class="ui-hsearch__sr" for="ui-hsearch-input">Search</label>
         <input class="ui-hsearch__input" id="ui-hsearch-input" type="search" name="q" value="{{ search.terms | escape }}" placeholder="Search" autocomplete="off">
         <input type="hidden" name="options[prefix]" value="last">
       </form>
       <nav class="ui-hsearch__links" aria-label="Quick links">
         {%- for handle in 'search-highlights,search-trending' | split: ',' -%}
           {%- assign menu = linklists[handle] -%}
           {%- if menu.links.size > 0 -%}
             <div class="ui-hsearch__group">
               <p class="ui-hsearch__heading">{{ menu.title }}</p>
               <ul class="ui-hsearch__list">
                 {%- for link in menu.links -%}
                   <li><a href="{{ link.url }}">{{ link.title }}</a></li>
                 {%- endfor -%}
               </ul>
             </div>
           {%- endif -%}
         {%- endfor -%}
       </nav>
     </div>
     <div class="ui-hsearch__scrim" aria-hidden="true"></div>
   </div>
   <script src="{{ 'ui-hsearch.js' | asset_url }}" defer></script>
   ```
3. Create two menus with the handles `search-highlights` and `search-trending`. Each menu's title becomes its column heading.
4. In `sections/header.liquid`, replace the theme's search icon with `{% render 'ui-hsearch' %}`. Also check that the header wrapper has `position: relative`.

## Behaviour

| Action | Result |
| --- | --- |
| Hover the trigger | A hairline draws in under the icon and label |
| Click the trigger | Opens the bar and focuses the input (clicking it again closes) |
| Click the magnifier in the bar | Closes |
| Click the dimmed page | Closes |
| Escape | Closes and returns focus to the trigger |
| Enter | Submits the search |

## Tokens

Set these on `.ui-hsearch` or on any ancestor element.

| Token | Default | Purpose |
| --- | --- | --- |
| `--ui-hsearch-font` | `"Work Sans", …` | Font family |
| `--ui-hsearch-fg` | `#111111` | Text and icons in the bar and panel |
| `--ui-hsearch-muted` | `#767676` | Placeholder |
| `--ui-hsearch-bg` | `#FFFFFF` | Bar and panel background |
| `--ui-hsearch-line` | `rgba(17,17,17,.14)` | Divider under the bar |
| `--ui-hsearch-scrim` | `rgba(12,10,8,.32)` | Page dimming |
| `--ui-hsearch-bar-height` | `72px` (`64px` on mobile) | Height of the search bar |
| `--ui-hsearch-gutter` | `24px` (`16px` on mobile) | Side padding |
| `--ui-hsearch-stroke` | `1.25` | Icon line weight |
| `--ui-hsearch-duration` | `600ms` | Length of the sweep |
| `--ui-hsearch-ease` | `cubic-bezier(.22,1,.36,1)` | Easing curve |
