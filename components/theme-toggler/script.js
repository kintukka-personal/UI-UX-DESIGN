/* UI Theme Toggler — light/dark switch with a circular reveal.
   Initialises every [data-ui-theme-toggle] on the page. The theme lives as a
   `dark` class on <html> and is saved to localStorage under "theme".
   Set data-duration="600" on a button to change the reveal length (ms). */
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function isDark() { return root.classList.contains("dark"); }

  function setTheme(dark) {
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
  }

  function sync() {
    var dark = isDark();
    document.querySelectorAll("[data-ui-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-pressed", dark ? "true" : "false");
    });
  }

  function toggle(button) {
    var dark = !isDark();
    var duration = parseInt(button.getAttribute("data-duration"), 10) || 400;

    if (!document.startViewTransition || reduceMotion.matches) {
      setTheme(dark);
      return;
    }

    // Grow a circle from the centre of the button to the farthest corner.
    var rect = button.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    var radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    root.classList.add("ui-theme-transition");
    var transition = document.startViewTransition(function () { setTheme(dark); });

    transition.ready.then(function () {
      root.animate(
        { clipPath: [
          "circle(0px at " + x + "px " + y + "px)",
          "circle(" + radius + "px at " + x + "px " + y + "px)"
        ] },
        { duration: duration, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(function () {});

    transition.finished.finally(function () {
      root.classList.remove("ui-theme-transition");
    });
  }

  function initAll() {
    document.querySelectorAll("[data-ui-theme-toggle]").forEach(function (button) {
      button.addEventListener("click", function () { toggle(button); });
    });
    sync();
  }

  // Keep every button in step, even if something else changes the class.
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ["class"] });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
