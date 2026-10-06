/* Dine In: hand-picked Google reviews, curated by Brooke.
 *
 * This file feeds the Reviews page (featured stories and the occasion filter)
 * and the small review quotes on Experiences, Menu, the gift card page and the
 * landing pages. While `reviews` is empty, all of those stay hidden.
 *
 * Adding a review:
 *   1. Copy it word for word from Dine In's own Google Business Profile.
 *   2. Ask the reviewer if it's OK to feature it. Use first name + last initial.
 *   3. Tag it:
 *        occasion:   dinner | celebration | wedding | corporate | class | catering
 *        experience: private-dining | grazing-boards | cooking-classes |
 *                    party-packs | canapes | degustation
 *   4. Set featured: true on up to three to show them as large stories.
 *   5. url (optional): the review's link on Google, starting with https://
 *
 * Example entry (copy, then replace every value with the real review):
 *   { name: 'First L.', date: '2026-03', rating: 5, occasion: 'celebration',
 *     experience: 'private-dining', featured: true,
 *     text: 'The review text, exactly as written on Google.', url: '' },
 */
window.DINE_IN_REVIEWS = {
  rating: 5.0,          // average shown on the site
  count: 60,            // number of Google reviews shown on the site
  googleUrl: '',        // "Read all reviews on Google" link (https://...); hidden while empty
  leaveReviewUrl: '',   // "Leave a review" link from the Google Business Profile; hidden while empty
  reviews: []
};
