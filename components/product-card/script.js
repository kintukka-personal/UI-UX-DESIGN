/* UI Product Card — behaviour for every [data-ui-pcard].

   Colours: each swatch is a radio input whose value names a colourway. Picking
   one sets data-colorway on the card (the CSS retints the stage, wordmark and
   button) and crossfades to the <img data-colorway="..."> with the same name.

   Add to bag: the product shrinks and arcs into the bag icon. When it lands,
   the badge counts up with a bump, the button flips to "Added" and the card
   dispatches "ui-pcard:add" (bubbles) with detail = { colorway, count }; hook
   a real cart up to that event. 230ms later the product regrows in place.
   Clicks during the flight are ignored. With reduced motion the item is
   counted straight away and nothing flies.

   Entrance: the first time the card scrolls into view the wordmark letters
   rise, the product drops in and the footer fades up. On devices with a fine
   pointer the product and wordmark drift apart slightly as the pointer moves.
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
      slot.className = "ui-pcard__letter";
      slot.style.setProperty("--i", i);
      var glyph = document.createElement("span");
      glyph.className = "ui-pcard__glyph";
      glyph.textContent = text[i];
      slot.appendChild(glyph);
      visual.appendChild(slot);
    }
    visual.dataset.split = "true";
  }

  function init(card) {
    var images = card.querySelectorAll(".ui-pcard__img");
    var radios = card.querySelectorAll(".ui-pcard__swatch input");
    var cta = card.querySelector(".ui-pcard__cta");
    var bag = card.querySelector("[data-ui-pcard-bag]");
    var badge = card.querySelector(".ui-pcard__badge");
    var title = card.querySelector(".ui-pcard__title");
    var status = card.querySelector("[data-ui-pcard-status]");
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

    var media = card.querySelector(".ui-pcard__media");
    var inner = card.querySelector(".ui-pcard__inner");
    var flying = false;

    // Count the item, bump the badge, flip the button. Runs when the product lands.
    function commitAdd() {
      count += 1;
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
      card.dispatchEvent(new CustomEvent("ui-pcard:add", {
        bubbles: true,
        detail: { colorway: card.dataset.colorway, count: count }
      }));
    }

    // The hero shrinks and arcs into the bag icon, then grows back in place.
    function flyToBag(done) {
      var img = card.querySelector(".ui-pcard__img.is-active");
      if (!img || !bag || !media || !inner || !inner.animate) { done(); return; }

      var box = inner.getBoundingClientRect();
      var from = img.getBoundingClientRect();
      var to = bag.getBoundingClientRect();
      var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      var endScale = (to.width * 0.7) / from.width;

      // Two layers so X and Y can ease differently: the path bows out into an arc.
      var flyer = document.createElement("div");
      flyer.className = "ui-pcard__flyer";
      flyer.setAttribute("aria-hidden", "true");
      flyer.style.left = (from.left - box.left) + "px";
      flyer.style.top = (from.top - box.top) + "px";
      flyer.style.width = from.width + "px";
      flyer.style.height = from.height + "px";
      var lift = document.createElement("div");
      lift.className = "ui-pcard__flyer-lift";
      var ghost = img.cloneNode(false);
      ghost.removeAttribute("alt");
      ghost.className = "ui-pcard__flyer-img";
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
        { transform: "scale(" + Math.max(endScale * 3.5, 0.3) + ") rotate(-8deg)", opacity: 1, offset: 0.5 },
        { transform: "scale(" + endScale + ") rotate(-16deg)", opacity: 1, offset: 0.94 },
        { transform: "scale(" + (endScale * 0.5) + ") rotate(-18deg)", opacity: 0 }
      ], { duration: duration, easing: "ease-in-out", fill: "forwards" });

      trip.onfinish = function () {
        flyer.remove();
        done();
        // A short beat after the count goes up, the product regrows where it was.
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
      };
    }

    if (cta) {
      cta.addEventListener("click", function () {
        if (flying) return;
        if (reduceMotion.matches) { commitAdd(); return; }
        flying = true;
        flyToBag(commitAdd);
      });
    }

    if (title) splitLetters(title);

    // Entrance order for the pieces that shoot out after (or alongside) the name.
    var specs = card.querySelectorAll(".ui-pcard__specs > span");
    var shots = [];
    if (specs[0]) shots.push([specs[0], 0]);
    if (specs[1]) shots.push([specs[1], 3]);
    var seq = [card.querySelector(".ui-pcard__price-label")]
      .concat(Array.prototype.slice.call(card.querySelectorAll(".ui-pcard__swatch")))
      .concat([cta]);
    seq.forEach(function (el, k) { if (el) shots.push([el, 4 + k]); });
    shots.forEach(function (s) {
      s[0].classList.add("ui-pcard__shoot");
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

    // Pointer parallax: product and wordmark drift in opposite directions.
    var frame = 0;
    var target = { x: 0, y: 0 };
    function paint() {
      frame = 0;
      card.style.setProperty("--ui-pcard-px", target.x.toFixed(3));
      card.style.setProperty("--ui-pcard-py", target.y.toFixed(3));
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
    document.querySelectorAll("[data-ui-pcard]").forEach(init);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
