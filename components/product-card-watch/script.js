/* UI Product Card (watch) — behaviour for every [data-ui-wcard].

   Colours: each swatch is a radio input whose value names a colourway. Picking
   one sets data-colorway on the card (the CSS retints the stage, wordmark and
   button) and crossfades to the <img data-colorway="..."> with the same name.

   Add to bag: the product shrinks and arcs into the bag icon. When it lands,
   the badge counts up with a bump, the button flips to "Added" and the card
   dispatches "ui-wcard:add" (bubbles) with detail = { colorway, count }.
   230ms later the product regrows in place. Clicks during the flight are
   ignored. With reduced motion the item is counted straight away and nothing
   flies.

   Real carts: set window.uiWcardAdd = function ({ card, colorway }) { ... }
   returning a Promise. It is called on click, while the product flies. The
   badge waits for it: resolve with { count } to show the real cart count, or
   reject with an Error whose message is shown on the button. On failure the
   product comes back and nothing is counted. shopify/ui-wcard-shopify.js is
   one. window.uiWcard.init(card) sets up a card added after page load.

   Entrance: the first time the card scrolls into view the wordmark letters
   rise, the product drops in and the footer fades up. On devices with a fine
   pointer the product drifts slightly with the pointer; the wordmark stays put.
   With reduced motion turned on, neither happens. */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  function splitLetters(title) {
    var visual = title.querySelector("[aria-hidden]");
    if (!visual || visual.dataset.split) return;
    var text = visual.textContent;
    visual.textContent = "";
    for (var i = 0; i < text.length; i++) {
      // The outer span is a fixed window the size of the letter's own slot;
      // the glyph inside slides into it from behind the previous letter.
      var slot = document.createElement("span");
      slot.className = "ui-wcard__letter";
      slot.style.setProperty("--i", i);
      var glyph = document.createElement("span");
      glyph.className = "ui-wcard__glyph";
      glyph.textContent = text[i];
      slot.appendChild(glyph);
      visual.appendChild(slot);
    }
    visual.dataset.split = "true";
  }

  function init(card) {
    if (card.dataset.uiWcardReady) return;
    card.dataset.uiWcardReady = "true";
    var images = card.querySelectorAll(".ui-wcard__img");
    var radios = card.querySelectorAll(".ui-wcard__swatch input");
    var cta = card.querySelector(".ui-wcard__cta");
    var bag = card.querySelector("[data-ui-wcard-bag]");
    var badge = card.querySelector(".ui-wcard__badge");
    var title = card.querySelector(".ui-wcard__title");
    var status = card.querySelector("[data-ui-wcard-status]");
    var count = badge ? parseInt(badge.textContent, 10) || 0 : 0;
    var addedTimer;

    function setColorway(name) {
      card.dataset.colorway = name;
      images.forEach(function (img) {
        var on = img.dataset.colorway === name;
        img.classList.toggle("is-active", on);
        if (on) img.removeAttribute("aria-hidden");
        else img.setAttribute("aria-hidden", "true");
      });
    }

    radios.forEach(function (radio) {
      radio.addEventListener("change", function () {
        if (radio.checked) setColorway(radio.value);
      });
      if (radio.checked) setColorway(radio.value);
    });

    function updateBag() {
      if (badge) badge.textContent = count > 0 ? count : "";
      if (bag) bag.setAttribute("aria-label", "Bag, " + count + (count === 1 ? " item" : " items"));
    }

    var media = card.querySelector(".ui-wcard__media");
    var inner = card.querySelector(".ui-wcard__inner");
    var flying = false;

    var note = card.querySelector(".ui-wcard__cta-note");
    var noteText = note ? note.textContent : "";
    var noteTimer;

    // Count the item, bump the badge, flip the button. Runs when the product lands.
    function commitAdd(newCount) {
      count = newCount;
      updateBag();
      if (!reduceMotion.matches) {
        if (badge) {
          badge.classList.remove("is-bump");
          void badge.offsetWidth;
          badge.classList.add("is-bump");
        }
        if (bag) {
          bag.animate([
            { transform: "scale(1)" },
            { transform: "scale(1.22) rotate(-8deg)", offset: 0.35 },
            { transform: "scale(0.94) rotate(4deg)", offset: 0.7 },
            { transform: "scale(1)" }
          ], { duration: 460, easing: "ease-out" });
        }
      }
      if (status) status.textContent = "Added to bag. " + count + (count === 1 ? " item" : " items") + " in your bag.";
      cta.classList.add("is-added");
      clearTimeout(addedTimer);
      addedTimer = setTimeout(function () { cta.classList.remove("is-added"); }, 1800);
      card.dispatchEvent(new CustomEvent("ui-wcard:add", {
        bubbles: true,
        detail: { colorway: card.dataset.colorway, count: count }
      }));
    }

    // The add failed (sold out, network): say why on the button and shake it.
    function failAdd(message) {
      message = message || "Couldn't add to bag. Please try again.";
      if (status) status.textContent = message;
      if (note) {
        note.textContent = message;
        clearTimeout(noteTimer);
        noteTimer = setTimeout(function () { note.textContent = noteText; }, 2800);
      }
      if (!reduceMotion.matches && cta.animate) {
        cta.animate([
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)", offset: 0.2 },
          { transform: "translateX(5px)", offset: 0.45 },
          { transform: "translateX(-3px)", offset: 0.7 },
          { transform: "translateX(0)" }
        ], { duration: 380, easing: "ease-out" });
      }
    }

    // Waits for the cart (if one is hooked up), then counts or reports the failure.
    function settleAdd(pending) {
      if (!pending) { commitAdd(count + 1); return; }
      return pending.then(function (result) {
        commitAdd(result && typeof result.count === "number" ? result.count : count + 1);
      }, function (err) {
        failAdd(err && err.message);
      });
    }

    // The hero shrinks and arcs into the bag icon, then grows back in place.
    // onLand runs as it reaches the bag; the regrow waits for what it returns.
    function flyToBag(onLand) {
      var img = card.querySelector(".ui-wcard__img.is-active");
      if (!img || !bag || !media || !inner || !inner.animate) {
        Promise.resolve(onLand()).then(function () { flying = false; });
        return;
      }

      var box = inner.getBoundingClientRect();
      var from = img.getBoundingClientRect();
      var to = bag.getBoundingClientRect();
      var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      // Sized from the longer side, so a tall product (the watch) shrinks early enough to stay inside the card.
      var endScale = (to.width * 0.7) / Math.max(from.width, from.height);

      // Two layers so X and Y can ease differently: the path bows out into an arc.
      var flyer = document.createElement("div");
      flyer.className = "ui-wcard__flyer";
      flyer.setAttribute("aria-hidden", "true");
      flyer.style.left = (from.left - box.left) + "px";
      flyer.style.top = (from.top - box.top) + "px";
      flyer.style.width = from.width + "px";
      flyer.style.height = from.height + "px";
      var lift = document.createElement("div");
      lift.className = "ui-wcard__flyer-lift";
      var ghost = img.cloneNode(false);
      ghost.removeAttribute("alt");
      ghost.className = "ui-wcard__flyer-img";
      lift.appendChild(ghost);
      flyer.appendChild(lift);
      inner.appendChild(flyer);
      media.classList.add("is-away");

      // Three layers, three easings: Y lifts early, X follows late and the
      // product shrinks as it goes, so it rises off the stage and arcs into the bag.
      var duration = 760;
      flyer.animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(" + dx + "px)" }],
        { duration: duration, easing: "cubic-bezier(0.55, 0, 0.45, 1)", fill: "forwards" }
      );
      lift.animate(
        [{ transform: "translateY(0)" }, { transform: "translateY(" + dy + "px)" }],
        { duration: duration, easing: "cubic-bezier(0.2, 0.7, 0.35, 1)", fill: "forwards" }
      );
      var trip = ghost.animate([
        { transform: "scale(1) rotate(0deg)", opacity: 1 },
        { transform: "scale(0.94) rotate(0deg)", opacity: 1, offset: 0.08 },
        { transform: "scale(" + Math.max(endScale * 3, 0.22) + ") rotate(-8deg)", opacity: 1, offset: 0.5 },
        { transform: "scale(" + endScale + ") rotate(-16deg)", opacity: 1, offset: 0.94 },
        { transform: "scale(" + (endScale * 0.5) + ") rotate(-18deg)", opacity: 0 }
      ], { duration: duration, easing: "ease-in-out", fill: "forwards" });

      trip.onfinish = function () {
        flyer.remove();
        Promise.resolve(onLand()).then(regrowSoon, regrowSoon);
      };

      // A short beat after the count goes up, the product regrows where it was.
      function regrowSoon() {
        setTimeout(function () {
          media.classList.remove("is-away");
          media.animate([
            { opacity: 0, scale: "0.55", filter: "blur(10px)" },
            { opacity: 1, scale: "1.04", filter: "blur(0)", offset: 0.7 },
            { opacity: 1, scale: "1", filter: "blur(0)" }
          ], { duration: 620, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }).onfinish = function () {
            flying = false;
          };
        }, 230);
      }
    }

    if (cta) {
      cta.addEventListener("click", function () {
        if (flying || cta.disabled) return;
        flying = true;
        var pending = typeof window.uiWcardAdd === "function"
          ? new Promise(function (resolve) { resolve(window.uiWcardAdd({ card: card, colorway: card.dataset.colorway })); })
          : null;
        // Handled when the product lands; this stops an early failure being reported as unhandled.
        if (pending) pending.catch(function () {});
        if (reduceMotion.matches) {
          Promise.resolve(settleAdd(pending)).then(function () { flying = false; });
          return;
        }
        flyToBag(function () { return settleAdd(pending); });
      });
    }

    if (title) splitLetters(title);

    // Entrance order: the wordmark letters first (the spec line alongside the
    // first and last letter), then price, each swatch and the button. The
    // product drops in once the last piece has locked.
    var letters = card.querySelectorAll(".ui-wcard__letter").length || 1;
    var specs = card.querySelectorAll(".ui-wcard__specs > span");
    var shots = [];
    if (specs[0]) shots.push([specs[0], 0]);
    if (specs[1]) shots.push([specs[1], letters - 1]);
    var seq = [card.querySelector(".ui-wcard__price-label")]
      .concat(Array.prototype.slice.call(card.querySelectorAll(".ui-wcard__swatch")))
      .concat([cta]);
    seq.forEach(function (el, k) { if (el) shots.push([el, letters + k]); });
    card.style.setProperty("--ui-wcard-letters", letters);
    card.style.setProperty("--ui-wcard-steps", letters + seq.length);
    shots.forEach(function (s) {
      s[0].classList.add("ui-wcard__shoot");
      s[0].style.setProperty("--i", s[1]);
    });

    // Entrance, once, when the card first comes into view.
    if (!reduceMotion.matches && "IntersectionObserver" in window) {
      card.classList.add("is-pending");
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        card.classList.remove("is-pending");
        card.classList.add("is-in");
        io.disconnect();
      }, { threshold: 0.25 });
      io.observe(card);
    }

    // Pointer parallax: the product drifts with the pointer; the wordmark stays still.
    var frame = 0;
    var target = { x: 0, y: 0 };
    function paint() {
      frame = 0;
      card.style.setProperty("--ui-wcard-px", target.x.toFixed(3));
      card.style.setProperty("--ui-wcard-py", target.y.toFixed(3));
    }
    function queue() { if (!frame) frame = requestAnimationFrame(paint); }

    card.addEventListener("pointermove", function (e) {
      if (!finePointer.matches || reduceMotion.matches || e.pointerType !== "mouse") return;
      var r = card.getBoundingClientRect();
      target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      queue();
    });
    card.addEventListener("pointerleave", function () {
      target.x = 0;
      target.y = 0;
      queue();
    });
  }

  function boot() {
    document.querySelectorAll("[data-ui-wcard]").forEach(init);
  }

  window.uiWcard = { init: init };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
