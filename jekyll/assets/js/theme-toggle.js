(function () {
  var button = document.getElementById("theme-toggle");
  if (!button) return;

  function currentTheme() {
    var explicit = document.documentElement.getAttribute("data-theme");
    if (explicit === "light" || explicit === "dark") return explicit;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  button.setAttribute("aria-pressed", currentTheme() === "dark");

  button.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
    button.setAttribute("aria-pressed", next === "dark");
  });
})();
