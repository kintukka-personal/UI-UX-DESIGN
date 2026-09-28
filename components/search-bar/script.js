/* UI Search — expanding search bar behaviour.
   Initialises every [data-ui-search] form on the page. */
(function () {
  function init(root) {
    var toggle = root.querySelector(".ui-search__toggle");
    var input = root.querySelector(".ui-search__input");
    var close = root.querySelector(".ui-search__close");
    if (!toggle || !input) return;

    function isOpen() { return root.classList.contains("is-open"); }

    function open() {
      root.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Submit search");
      input.focus({ preventScroll: true });
    }

    function shut(returnFocus) {
      root.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open search");
      if (returnFocus) toggle.focus({ preventScroll: true });
    }

    // Closed: open. Open and empty: refocus. Open with text: submit.
    toggle.addEventListener("click", function (e) {
      if (!isOpen()) { e.preventDefault(); open(); }
      else if (!input.value.trim()) { e.preventDefault(); input.focus(); }
    });

    if (close) {
      close.addEventListener("click", function () {
        input.value = "";
        shut(true);
      });
    }

    root.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { e.preventDefault(); shut(true); }
    });

    // Collapse when the user clicks or tabs away, unless they typed something.
    document.addEventListener("pointerdown", function (e) {
      if (isOpen() && !root.contains(e.target) && !input.value.trim()) shut(false);
    });
    root.addEventListener("focusout", function (e) {
      if (isOpen() && e.relatedTarget && !root.contains(e.relatedTarget) && !input.value.trim()) shut(false);
    });
  }

  function initAll() {
    document.querySelectorAll("[data-ui-search]").forEach(init);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
