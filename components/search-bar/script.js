/* UI Search — expanding search bar behaviour.
   Initialises every [data-ui-search] form on the page.
   Open: click the magnifier. Close: click the magnifier again, click
   anywhere outside, or press Escape. Enter submits. */
(function () {
  function init(root) {
    var toggle = root.querySelector(".ui-search__toggle");
    var input = root.querySelector(".ui-search__input");
    if (!toggle || !input) return;

    function isOpen() { return root.classList.contains("is-open"); }

    function open() {
      root.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close search");
      input.focus({ preventScroll: true });
    }

    function shut(returnFocus) {
      root.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open search");
      if (returnFocus) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener("click", function () {
      if (isOpen()) shut(true);
      else open();
    });

    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { e.preventDefault(); shut(true); }
    });

    // Collapse when the user clicks or tabs away.
    document.addEventListener("pointerdown", function (e) {
      if (isOpen() && !root.contains(e.target)) shut(false);
    });
    root.addEventListener("focusout", function (e) {
      if (isOpen() && e.relatedTarget && !root.contains(e.relatedTarget)) shut(false);
    });
  }

  function initAll() {
    document.querySelectorAll("[data-ui-search]").forEach(init);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
