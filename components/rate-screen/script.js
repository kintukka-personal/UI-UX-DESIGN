/* UI Rate Screen — full-screen app rating step.
   Initialises every [data-ui-rate] on the page and fires bubbling events:
     ui-rate:request  first tap on "Rate Cloey". Open the native review prompt
                      here. If data-store-url is set, that page opens in a new
                      tab unless you call event.preventDefault().
     ui-rate:done     tap on "I rated"
     ui-rate:skip     tap on "Not now"
     ui-rate:back     tap on the back arrow
   window.uiRate.reset(screen) puts the button back to "Rate Cloey". */
(function () {
  function init(root) {
    if (root.uiRateReady) return;
    root.uiRateReady = true;

    var cta = root.querySelector("[data-ui-rate-cta]");
    var label = root.querySelector(".ui-rate__cta-label") || cta;
    var skip = root.querySelector("[data-ui-rate-skip]");
    var back = root.querySelector("[data-ui-rate-back]");
    var rateLabel = label.textContent;
    var doneLabel = root.getAttribute("data-done-label") || "I rated";

    function emit(name) {
      return root.dispatchEvent(new CustomEvent("ui-rate:" + name, {
        bubbles: true,
        cancelable: true,
        detail: { storeUrl: root.getAttribute("data-store-url") || null }
      }));
    }

    root.uiRateSetAsked = function (asked) {
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
      root.uiRateSetAsked(true);
    });

    if (skip) skip.addEventListener("click", function () { emit("skip"); });
    if (back) back.addEventListener("click", function () { emit("back"); });
  }

  function initAll() {
    document.querySelectorAll("[data-ui-rate]").forEach(init);
  }

  window.uiRate = {
    init: init,
    reset: function (root) { if (root.uiRateSetAsked) root.uiRateSetAsked(false); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
