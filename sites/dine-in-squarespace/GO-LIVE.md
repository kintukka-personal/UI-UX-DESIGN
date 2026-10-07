# Dine In go-live: putting v2 into Squarespace

This kit puts the v2 rebuild (`../dine-in-v2`) into Brooke's existing Squarespace 7.1 site. Squarespace keeps:

- the domain, header, navigation and footer
- the shop, cart, gift cards, orders and customers
- the sitemap and robots file

Each Dine In page goes in as one Code Block. The design and the behaviour go in through Code Injection.

**Every live address stays the same** (`/menu`, `/faq`, `/book`, …). The only redirect is for the voucher, whose product address is renamed from `/shop/p/test`.

The plan needs Code Injection, which Squarespace includes on Core and above (the older Business and Commerce plans). The site already sells products, so it is on one of those.

## What's in the kit

| File | Where it goes |
| --- | --- |
| `sitewide/header-injection.html` | Settings → Developer Tools → Code Injection → **Header** (older menus: Settings → Advanced → Code Injection) |
| `sitewide/footer-injection.html` | Same screen → **Footer**. It holds the form settings and the reviews data, so this is where Brooke edits those |
| `sitewide/footer-links.html` | A Code Block in the site footer, above the policy links |
| `pages/<page>/code-block.html` | A Code Block filling one blank section on that page |
| `pages/<page>/page-header.html` | That page's ⚙ Page settings → Advanced → **Page Header Code Injection** |
| `pages/<page>/seo.txt` | That page's ⚙ Page settings → SEO (title and description) and Social Image |
| `url-mappings.txt` | Settings → Developer Tools → **URL Mappings** |
| `shop/egift-card-description.txt` | Commerce → Products → eGift Card → description |
| `uploads/` | Optional speed upgrades (step 7) |

Copy each file's whole contents. The first line of each file is a comment saying where it goes, and it can be pasted along with the rest.

## 0. Before you start

1. **Formspree:** create the two form inboxes at [formspree.io](https://formspree.io) with `dineinbybrooke@gmail.com`. Name them "Booking enquiry" and "Website question", and keep the two endpoints (`https://formspree.io/f/…`). The free plan covers 50 submissions a month. Confirm the email Formspree sends you.
2. **Renaming test:** pick a quiet hour. Each page swap takes a minute or two and nothing breaks in between.

## 1. Rehearse on a copy (recommended)

Squarespace dashboard → the site's **⋯** menu → **Duplicate**. The copy is a free, unpublished trial. Do steps 2–6 there first and click through everything.

Never move the domain to the copy: orders, customers and gift card balances live on the original site. The copy is only a practice run.

## 2. Sitewide code

1. Open `sitewide/footer-injection.html` and find `window.DINE_IN_FORMS`. Paste the two Formspree endpoints between the quotes:
   ```js
   window.DINE_IN_FORMS = {
     booking: 'https://formspree.io/f/xxxxxxx',
     ask: 'https://formspree.io/f/yyyyyyy'
   };
   ```
   Until they are filled in, both forms open the visitor's email app with everything written out. No enquiry is ever lost and no fake "sent" screen ever shows.
2. Paste the header file into **Header** and the footer file into **Footer**. Save.
3. Nothing changes on the live pages yet. The CSS only touches elements inside a `.dinein` block, and the scripts only act on Dine In markup.

## 3. Build each page next to the live one

For each page in `pages/`, starting with the new ones because they replace nothing:

1. Pages panel → **Not Linked** → **+** → Blank page. Use the slug from `seo.txt`, plus `-new` for pages that already exist (e.g. `/menu-new`).
2. Delete the placeholder content, add one section, add a **Code Block**, and stretch it across the full width.
   - Settings: HTML, "Display source code" off.
   - Paste `code-block.html`.
3. ⚙ Page settings → Advanced → paste `page-header.html` (the page's structured data for Google).
4. ⚙ Page settings → SEO: paste the title and description from `seo.txt`. Social Image: use the image address in `seo.txt`.
5. While you work, set a page password (⚙ → General → Page password) so the half-built page isn't public.

| Kit folder | Final address | Replaces |
| --- | --- | --- |
| `home` | `/` | the Home page |
| `menu` | `/menu` | Menu |
| `experiences` | `/experiences` | Our Experiences |
| `faq` | `/faq` | FAQ |
| `testimonials` | `/testimonials` | Reviews & Press |
| `contact` | `/contact` | Contact Us |
| `book` | `/book` | Book Now |
| `weddings`, `corporate-events`, `cooking-classes` | same | new pages, keep in Not Linked |
| `wollongong`, `south-coast`, `southern-highlands`, `sydney` | same | new pages, keep in Not Linked |

The footer and the pages themselves link to the new pages, so they don't need to be in the top navigation. Not Linked pages still go in the sitemap. Just don't tick "Hide from search engines".

## 4. Footer links

Edit the site footer, add a Code Block above the policy links, and paste `sitewide/footer-links.html`. This adds the occasions line (Weddings · Corporate events · Cooking classes · Gift cards) and the areas line (Wollongong · South Coast · Southern Highlands · Sydney) to every page, the shop included.

## 5. Shop

1. Commerce → Products → **5-course Degustation voucher** → change its URL from `test` to `degustation-voucher`.
2. Settings → Developer Tools → URL Mappings: paste `url-mappings.txt`. Old links and Google results for `/shop/p/test` then land on the new address.
3. Commerce → Products → **eGift Card**: add the copy from `shop/egift-card-description.txt` (validity, transferable, non-refundable, how to redeem).

## 6. Swap the pages over

For each replaced page, one at a time:

1. Old page ⚙ → change its slug to `…-old` (e.g. `/menu-old`), then disable it.
2. New page ⚙ → change `/menu-new` to `/menu` and remove the password.
3. Drag the new page into the old one's place in the navigation, and the old one into Not Linked.

The homepage: set the new home page as the homepage (⚙ → Set as Homepage), then disable the old one.

Last, open Marketing → SEO → Search Appearance. Set the page title format to `%p`, because each SEO title in the kit already ends with "Dine In".

## 7. Optional speed upgrades

Two files aren't on Brooke's Squarespace yet. The kit works without them:

- **Chef card portrait** (`uploads/brooke-silk.webp`): the homepage carries a compact inline copy, so it shows from day one.
- **"How it works" loop** (`uploads/how-it-works.mp4` / `.webm` / `-poster.jpg`): until it's uploaded, the homepage shows the same animated GIF the live site shows today (about 4 MB). The video is 71 KB.

To switch them on:

1. Upload the portrait and the poster in Design → Custom CSS → Custom files, and copy each address. If it won't take the `.webp`, upload `brooke-silk.png` instead.
2. Upload the two videos as files: add a link in any text block, choose File, upload, and copy the `/s/…` address. Then remove the link.
3. Put the four addresses in `uploads.json` (the portrait under `brooke-silk.webp`, whichever file you uploaded), run `python3 build.py`, and repaste `pages/home/code-block.html`.

## 8. Check it, then tell Google

On a phone and on a computer:

- [ ] Every page in the table opens at its old address, with no "-new" or "-old" left in the navigation
- [ ] Booking: send a real test enquiry from `/book?exp=private-dining&guests=8`. It arrives in Gmail from Formspree, with your email as the reply-to
- [ ] Contact: send a test question. You get the "Thanks, … your question is with Brooke" screen and the email
- [ ] Menu: add two dishes, open "Check your date", and the dishes are in the message box
- [ ] FAQ: `/faq#where-do-we-cater` opens that answer
- [ ] An area page: "Check your drive time" opens Google Maps from Figtree
- [ ] Shop: the eGift Card and the voucher add to the Squarespace cart, and `/shop/p/test` lands on the voucher
- [ ] The "As Featured In" video plays (homepage) and the Google reviews widget loads (Reviews & Press)
- [ ] On a phone, the Call / Check your date bar sits at the bottom and doesn't cover the footer

Then:

- **Google Search Console:** Sitemaps → submit `https://dine-in.com.au/sitemap.xml`. URL Inspection → request indexing for `/`, `/weddings`, `/corporate-events`, `/cooking-classes` and the four area pages.
- **Google Business Profile:** set the website link to `https://dine-in.com.au/`, and the booking link to `https://dine-in.com.au/book?src=google`.

## Rollback

Any page, any time: swap the slugs back (`/menu` ↔ `/menu-old`) and re-enable the old page. To take everything back out, empty the Header and Footer code injection. The old pages never relied on it.

## Afterwards

- **Reviews:** curated quotes go in `window.DINE_IN_REVIEWS` in the Footer code injection. The format is described in the comment there. Until reviews are added, the review blocks stay hidden.
- **Changing a page:** edit v2, run `python3 build.py`, and repaste the page's `code-block.html`. A CSS or JS change means repasting the header or footer injection. Keep your Formspree endpoints and reviews when you do, or put them in `../dine-in-v2/assets/js/forms-config.js` and `reviews-data.js` first, so the build carries them.
- **The "Confirm with Brooke" list** in `../dine-in-v2/README.md` still applies.
