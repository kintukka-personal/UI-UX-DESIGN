/* UI Product Card — behaviour for every [data-ui-pcard].

   Colours: each swatch is a radio input whose value names a colourway. Picking
   one sets data-colorway on the card (the CSS retints the stage, wordmark and
   button) and crossfades to the <img data-colorway="..."> with the same name.

   Add to bag: the button flips to "Added", the bag badge counts up with a
   small bump, and the card dispatches "ui-pcard:add" (bubbles) with
   detail = { colorway, count }. Hook a real cart up to that event.

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
      var span = document.createElement("span");
      span.className = "ui-pcard__letter";
      span.style.setProperty("--i", i);
      span.textContent = text[i];
      visual.appendChild(span);
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

    if (cta) {
      cta.addEventListener("click", function () {
        count += 1;
        updateBag();
        if (badge && !reduceMotion.matches) {
          badge.classList.remove("is-bump");
          void badge.offsetWidth;
          badge.classList.add("is-bump");
        }
        if (status) status.textContent = "Added to bag. " + count + (count === 1 ? " item" : " items") + " in your bag.";
        cta.classList.add("is-added");
        clearTimeout(addedTimer);
        addedTimer = setTimeout(function () { cta.classList.remove("is-added"); }, 1800);
        card.dispatchEvent(new CustomEvent("ui-pcard:add", {
          bubbles: true,
          detail: { colorway: card.dataset.colorway, count: count }
        }));
      });
    }

    if (title) splitLetters(title);

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
