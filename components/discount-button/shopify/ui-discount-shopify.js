/* UI Discount — Shopify connection.
   Load after ui-discount.js. Applies and removes codes on the real cart
   through Shopify's Cart AJAX API (/cart/update.js with "discount"), and
   hands the real totals Shopify calculates back to the button. */
(function () {
  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";

  function post(discount) {
    return fetch(root + "cart/update.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ discount: discount })
    }).then(function (res) {
      if (!res.ok) throw new Error("Cart update failed: " + res.status);
      return res.json();
    });
  }

  function appliedNow() {
    var form = document.querySelector("[data-ui-discount][data-applied-code]");
    return form ? form.getAttribute("data-applied-code") : "";
  }

  window.uiDiscountValidate = function (code) {
    var previous = appliedNow();
    return post(code).then(function (cart) {
      var match = (cart.discount_codes || []).filter(function (d) {
        return String(d.code).toUpperCase() === code;
      })[0];

      if (match && match.applicable) {
        document.dispatchEvent(new CustomEvent("ui-discount:cart", { detail: cart }));
        return {
          ok: true,
          message: code + " applied",
          total: cart.total_price / 100,
          original: cart.original_total_price / 100
        };
      }

      // Not valid (or not applicable to this cart): put the previous code back.
      return post(previous || "").then(function () {
        return { ok: false, message: "“" + code + "” isn’t a valid code. Please try again." };
      });
    });
  };

  window.uiDiscountRemove = function () {
    return post("").then(function (cart) {
      document.dispatchEvent(new CustomEvent("ui-discount:cart", { detail: cart }));
      return { total: cart.total_price / 100 };
    });
  };
})();
