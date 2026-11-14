// Wires up each .rankings-group (see _includes/rankings-summary-table.html):
// its heading's eye-icon button hides/shows the .rankings-group-body below
// it, and - within whichever groups have one - its .schedule-filter chip
// row shows only that group's table rows whose data-division exactly
// matches the chip's value.
//
// The filter chips reuse .schedule-filter/.schedule-filter-chip's pill
// markup and CSS (same look as assets/js/schedule-filter.js's chips), but
// not that script itself - schedule-filter.js applies every .schedule-filter
// on the page to every .schedule-group on the page (ANDed together), which
// is right for a single schedule filtered by several orthogonal attributes
// (school AND level) but wrong here, where each rankings table is its own
// independent list with its own one-off set of division values. This
// instead scopes each filter strictly to its own nearest .rankings-group,
// so a chip clicked under one heading (e.g. "Girls Fall") never touches
// another heading's table (e.g. "Boys Fall").
//
// Filter chips are single-select per group, like a segmented control -
// "All" always resets it, and clicking the already-active chip again
// re-selects "All" too.
(function () {
  var groups = Array.prototype.slice.call(document.querySelectorAll(".rankings-group"));
  if (groups.length === 0) return;

  groups.forEach(function (group) {
    initVisibilityToggle(group);
    initDivisionFilter(group);
  });

  // The eye icon always starts as "visibility" (section shown) since
  // rankings-summary-table.html never pre-hides a group server-side - so
  // this only ever needs to move it into the hidden state, never restore it
  // from one.
  function initVisibilityToggle(group) {
    var button = group.querySelector(".rankings-visibility-toggle");
    var body = group.querySelector(".rankings-group-body");
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
  }

  function initDivisionFilter(group) {
    var filterEl = group.querySelector(".schedule-filter");
    if (!filterEl) return;

    var rows = group.querySelectorAll("tbody tr");

    function activeValue() {
      var active = filterEl.querySelector(".schedule-filter-chip.is-active");
      return active ? active.getAttribute("data-filter-value") : "";
    }

    function apply() {
      var value = activeValue();
      rows.forEach(function (row) {
        row.hidden = value !== "" && row.getAttribute("data-division") !== value;
      });
    }

    function activateChip(chip) {
      filterEl.querySelectorAll(".schedule-filter-chip").forEach(function (c) {
        c.classList.remove("is-active");
        c.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("is-active");
      chip.setAttribute("aria-pressed", "true");
    }

    filterEl.querySelectorAll(".schedule-filter-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var target = chip.classList.contains("is-active")
          ? filterEl.querySelector('.schedule-filter-chip[data-filter-value=""]')
          : chip;

        activateChip(target);
        apply();
      });
    });
  }
})();
