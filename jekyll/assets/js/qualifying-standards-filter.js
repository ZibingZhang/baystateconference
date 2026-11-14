// Wires up each .qualifying-standards-group (see
// _includes/qualifying-standards-table.html): its heading's eye-icon
// button hides/shows the .qualifying-standards-group-body (the table)
// below it. Same idea as assets/js/rankings-filter.js's visibility toggle,
// just without that script's division filter - a qualifying-standards
// page has nothing to filter, only several same-shaped tables to collapse.
(function () {
  var groups = Array.prototype.slice.call(document.querySelectorAll(".qualifying-standards-group"));
  if (groups.length === 0) return;

  groups.forEach(function (group) {
    var button = group.querySelector(".qualifying-standards-visibility-toggle");
    var body = group.querySelector(".qualifying-standards-group-body");
    if (!button || !body) return;

    button.addEventListener("click", function () {
      var hidden = body.hidden = !body.hidden;
      var icon = button.querySelector(".material-symbols-outlined");
      var label = hidden ? "Show section" : "Hide section";

      icon.textContent = hidden ? "visibility_off" : "visibility";
      button.setAttribute("aria-label", label);
      button.title = label;
      button.setAttribute("aria-pressed", String(hidden));
    });
  });
})();
