/* UI Product Card — Shopify connection. Upload as assets/ui-pcard-shopify.js.

   - Swatches pick the variant: each swatch input carries data-variant-id,
     data-price and data-available. Picking one updates the hidden variant
     id, the price and the button (it reads "Sold out" and disables when the
     variant is unavailable).
   - Add to bag adds the selected variant to the real cart through Shopify's
     Cart AJAX API (POST /cart/add.js), while the product flies. The badge
     then shows the real cart count. Errors (sold out, quantity limits) show
     on the button and nothing is counted.
   - After each add it fires "ui-pcard:cart" on document with { cart }, and
     refreshes a Dawn-style #cart-icon-bubble in the theme header if there
     is one.
   - The back button goes back in history, or to the product's collection.
   - Cards re-rendered in the theme editor are set up again. */
(function () {
  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";

  function getJSON(url, options) {
    return fetch(url, options).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.description || data.message || "Couldn't add to bag. Please try again.");
        return data;
      });
    });
  }

  // Dawn and many themes render the header cart count as a section.
  function refreshThemeBubble() {
    var bubble = document.getElementById("cart-icon-bubble");
    if (!bubble) return;
    fetch(root + "?sections=cart-icon-bubble")
      .then(function (res) { return res.json(); })
      .then(function (sections) {
        var html = sections && sections["cart-icon-bubble"];
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, "text/html");
        var fresh = doc.querySelector(".shopify-section") || doc.body;
        bubble.innerHTML = fresh.innerHTML;
      })
      .catch(function () {});
  }

  window.uiPcardAdd = function (detail) {
    var input = detail.card.querySelector("[data-ui-pcard-variant]");
    var id = input ? Number(input.value) : 0;
    if (!id) return Promise.reject(new Error("Pick a colour first."));
    return getJSON(root + "cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ items: [{ id: id, quantity: 1 }] })
    })
      .then(function () { return getJSON(root + "cart.js", { headers: { "Accept": "application/json" } }); })
      .then(function (cart) {
        document.dispatchEvent(new CustomEvent("ui-pcard:cart", { detail: { cart: cart } }));
        refreshThemeBubble();
        return { count: cart.item_count };
      });
  };

  function setup(card) {
    if (card.dataset.uiPcardShopify) return;
    card.dataset.uiPcardShopify = "true";

    var input = card.querySelector("[data-ui-pcard-variant]");
    var price = card.querySelector(".ui-pcard__price");
    var cta = card.querySelector(".ui-pcard__cta");
    var label = card.querySelector(".ui-pcard__cta-add");
    var addText = label ? label.textContent : "";
    var soldOutText = card.getAttribute("data-sold-out-label") || "Sold out";
    var form = card.querySelector("[data-ui-pcard-form]");

    function apply(radio) {
      if (!radio || !radio.dataset.variantId) return;
      if (input) input.value = radio.dataset.variantId;
      if (price && radio.dataset.price) price.textContent = radio.dataset.price;
      var available = radio.dataset.available !== "false";
      if (cta) cta.disabled = !available;
      if (label) label.textContent = available ? addText : soldOutText;
    }

    card.querySelectorAll(".ui-pcard__swatch input").forEach(function (radio) {
      radio.addEventListener("change", function () { if (radio.checked) apply(radio); });
      if (radio.checked) apply(radio);
    });

    // The form works without JavaScript; with it, the card handles the add.
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); });

    var back = card.querySelector("[data-ui-pcard-back]");
    if (back) {
      back.addEventListener("click", function () {
        var sameSite = document.referrer && document.referrer.indexOf(location.origin) === 0;
        if (sameSite && history.length > 1) history.back();
        else location.href = back.getAttribute("data-fallback") || root;
      });
    }
  }

  function boot(scope) {
    (scope || document).querySelectorAll("[data-ui-pcard]").forEach(function (card) {
      setup(card);
      if (window.uiPcard) window.uiPcard.init(card);
    });
  }

  document.addEventListener("shopify:section:load", function (e) { boot(e.target); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { boot(); });
  else boot();
})();
