/* UI Spot Me Rate — full-screen app rating step for Spot Me.
   Initialises every [data-ui-spot-rate] on the page and fires bubbling events:
     ui-spot-rate:request  first tap on "Rate Spot Me". Open the native review
                           prompt here. If data-store-url is set, that page opens
                           in a new tab unless you call event.preventDefault().
     ui-spot-rate:done     tap on "I rated!"
     ui-spot-rate:skip     tap on "Not now"
     ui-spot-rate:back     tap on the back arrow
   window.uiSpotRate.reset(screen) puts the button back to "Rate Spot Me".

   After the first tap, CSS moves the heart round the ring until it's full.
   When that finishes the screen gets .is-complete, and pink confetti bursts
   out of the ring (skipped for reduced motion). */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var CONFETTI_COLOURS = ["#FF8FB1", "#FF6F96", "#E31E4A", "#FFC2D1", "#F9A8BC", "#FF4F7B"];

  // Shoot `count` pieces of confetti out from the ring, then let them fall.
  function burst(root, ring, count, spread) {
    var layer = root.querySelector(".ui-spot-rate__confetti");
    if (!layer) {
      layer = document.createElement("div");
      layer.className = "ui-spot-rate__confetti";
      layer.setAttribute("aria-hidden", "true");
      root.appendChild(layer);
    }

    var box = root.getBoundingClientRect();
    var rect = ring.getBoundingClientRect();
    var k = root.offsetWidth / box.width || 1; // screen px to the screen's own CSS px (CSS zoom, transforms)
    var scale = Math.min(rect.width, rect.height) * k / 400; // the ring's viewBox is 400 wide
    var cx = (rect.left + rect.width / 2 - box.left) * k;
    var cy = (rect.top + rect.height / 2 - box.top) * k;
    var radius = 168 * scale;

    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dot = Math.random() < 0.25;
      var w = dot ? 8 : 6 + Math.random() * 5;
      var h = dot ? 8 : 11 + Math.random() * 6;
      var x0 = cx + Math.cos(angle) * radius - w / 2;
      var y0 = cy + Math.sin(angle) * radius - h / 2;
      var dist = spread * (0.45 + Math.random() * 0.75);
      var x1 = x0 + Math.cos(angle) * dist;
      var y1 = y0 + Math.sin(angle) * dist - 50;
      var x2 = x1 + (Math.random() - 0.5) * 80;
      var y2 = y1 + 260 + Math.random() * 220;
      var spin = (Math.random() - 0.5) * 1080;

      var piece = document.createElement("i");
      piece.style.width = w + "px";
      piece.style.height = h + "px";
      piece.style.borderRadius = dot ? "50%" : "2px";
      piece.style.background = CONFETTI_COLOURS[Math.floor(Math.random() * CONFETTI_COLOURS.length)];
      layer.appendChild(piece);

      piece.animate([
        { transform: "translate(" + x0 + "px," + y0 + "px) rotate(0deg) scale(0.4)", opacity: 1, easing: "cubic-bezier(.1,.8,.3,1)" },
        { transform: "translate(" + x1 + "px," + y1 + "px) rotate(" + spin * 0.4 + "deg) scale(1)", opacity: 1, offset: 0.3, easing: "cubic-bezier(.45,0,.8,.6)" },
        { transform: "translate(" + x2 + "px," + y2 + "px) rotate(" + spin + "deg) scale(1)", opacity: 0 }
      ], { duration: 1700 + Math.random() * 900, fill: "both" }).onfinish = function () {
        this.effect.target.remove();
      };
    }
  }

  function celebrate(root, ring) {
    root.classList.add("is-complete");
    if (reduceMotion.matches || !Element.prototype.animate) return;
    burst(root, ring, 60, 190);
    setTimeout(function () {
      if (root.classList.contains("is-complete")) burst(root, ring, 30, 140);
    }, 180);
  }

  function init(root) {
    if (root.uiSpotRateReady) return;
    root.uiSpotRateReady = true;

    var cta = root.querySelector("[data-ui-spot-rate-cta]");
    var label = root.querySelector(".ui-spot-rate__cta-label") || cta;
    var skip = root.querySelector("[data-ui-spot-rate-skip]");
    var back = root.querySelector("[data-ui-spot-rate-back]");
    var rateLabel = label.textContent;
    var doneLabel = root.getAttribute("data-done-label") || "I rated!";
    var ring = root.querySelector("[data-ui-spot-rate-ring]");
    var orbit = root.querySelector(".ui-spot-rate__orbit");

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
      if (!asked) {
        root.classList.remove("is-complete");
        var layer = root.querySelector(".ui-spot-rate__confetti");
        if (layer) layer.textContent = "";
      }
    };

    // The heart has ridden round and the ring is full: celebrate.
    if (orbit && ring) {
      orbit.addEventListener("animationend", function (event) {
        if (event.animationName === "ui-spot-rate-orbit" && root.classList.contains("is-asked")) {
          celebrate(root, ring);
        }
      });
    }

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
