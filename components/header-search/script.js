/* UI Header Search — full-width search takeover behaviour.
   Initialises every [data-ui-hsearch] on the page.
   Open: click the trigger. Close: click the magnifier in the bar, click the
   trigger again, click anywhere outside, or press Escape. Enter submits. */
(function () {
  function init(root) {
    var trigger = root.querySelector(".ui-hsearch__trigger");
    var layer = root.querySelector(".ui-hsearch__layer");
    var input = root.querySelector(".ui-hsearch__input");
    var close = root.querySelector(".ui-hsearch__close");
    var scrim = root.querySelector(".ui-hsearch__scrim");
    if (!trigger || !layer || !input) return;

    layer.inert = true;

    function isOpen() { return root.classList.contains("is-open"); }

    function open() {
      root.classList.add("is-open");
      layer.inert = false;
      trigger.setAttribute("aria-expanded", "true");
      input.focus({ preventScroll: true });
    }

    function shut(returnFocus) {
      if (!isOpen()) return;
      root.classList.remove("is-open");
      layer.inert = true;
      trigger.setAttribute("aria-expanded", "false");
      if (returnFocus) trigger.focus({ preventScroll: true });
    }

    trigger.addEventListener("click", function () {
      if (isOpen()) shut(true);
      else open();
    });

    if (close) close.addEventListener("click", function () { shut(true); });
    if (scrim) scrim.addEventListener("click", function () { shut(false); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { e.preventDefault(); shut(true); }
    });

    // Click anywhere outside the layer and trigger closes it.
    document.addEventListener("pointerdown", function (e) {
      if (isOpen() && !layer.contains(e.target) && !trigger.contains(e.target)) shut(false);
    });

    // Tabbing out of the layer closes it.
    layer.addEventListener("focusout", function (e) {
      if (isOpen() && e.relatedTarget && !layer.contains(e.relatedTarget) && e.relatedTarget !== trigger) shut(false);
    });
  }

  function initAll() {
    document.querySelectorAll("[data-ui-hsearch]").forEach(init);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
