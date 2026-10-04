/* UI Spot Me Rate — full-screen app rating step for Spot Me.
   Initialises every [data-ui-spot-rate] on the page and fires bubbling events:
     ui-spot-rate:request  first tap on "Rate Spot Me". Open the native review
                           prompt here. If data-store-url is set, that page opens
                           in a new tab unless you call event.preventDefault().
     ui-spot-rate:done     tap on "I rated!"
     ui-spot-rate:skip     tap on "Not now"
     ui-spot-rate:back     tap on the back arrow
   window.uiSpotRate.reset(screen) puts the button back to "Rate Spot Me". */
(function () {
  function init(root) {
    if (root.uiSpotRateReady) return;
    root.uiSpotRateReady = true;

    var cta = root.querySelector("[data-ui-spot-rate-cta]");
    var label = root.querySelector(".ui-spot-rate__cta-label") || cta;
    var skip = root.querySelector("[data-ui-spot-rate-skip]");
    var back = root.querySelector("[data-ui-spot-rate-back]");
    var rateLabel = label.textContent;
    var doneLabel = root.getAttribute("data-done-label") || "I rated!";

    function emit(name) {
      return root.dispatchEvent(new CustomEvent("ui-spot-rate:" + name, {
        bubbles: true,
        cancelable: true,
        detail: { storeUrl: root.getAttribute("data-store-url") || null }
      }));
    }

    root.uiSpotRateSetAsked = function (asked) {
      root.classList.toggle("is-asked", asked);
      label.textContent = asked ? doneLabel : rateLabel;
      if (skip) skip.hidden = !asked;
    };

    cta.addEventListener("click", function () {
      if (root.classList.contains("is-asked")) {
        emit("done");
        return;
      }
      var storeUrl = root.getAttribute("data-store-url");
      if (emit("request") && storeUrl) window.open(storeUrl, "_blank", "noopener");
      root.uiSpotRateSetAsked(true);
    });

    if (skip) skip.addEventListener("click", function () { emit("skip"); });
    if (back) back.addEventListener("click", function () { emit("back"); });
  }

  function initAll() {
    document.querySelectorAll("[data-ui-spot-rate]").forEach(init);
  }

  window.uiSpotRate = {
    init: init,
    reset: function (root) { if (root.uiSpotRateSetAsked) root.uiSpotRateSetAsked(false); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
