// Wires up each .collapsible-group that has its own .schedule-filter (see
// _includes/rankings-summary-table.html, _includes/all-stars-table.html):
// shows only that group's table rows whose data-<filter-attr> (read off the
// .schedule-filter's own data-filter-attr, e.g. "division" or "town")
// exactly matches the active chip's value. The group's heading/eye-icon
// visibility toggle is generic and lives in assets/js/collapsible-group.js
// instead - include that alongside this script wherever either include is
// used.
//
// The filter chips reuse .schedule-filter/.schedule-filter-chip's pill
// markup and CSS (same look as assets/js/schedule-filter.js's chips), but
// not that script itself - schedule-filter.js applies every .schedule-filter
// on the page to every .schedule-group on the page (ANDed together), which
// is right for a single schedule filtered by several orthogonal attributes
// (school AND level) but wrong here, where each table is its own
// independent list with its own one-off set of filter values. This instead
// scopes each filter strictly to its own nearest .collapsible-group, so a
// chip clicked under one heading (e.g. "Girls Fall") never touches another
// heading's table (e.g. "Boys Fall"), and - for all-stars - a group's main
// table and its Honorable Mention table share one filter since they list
// the same towns.
//
// Filter chips are single-select per group, like a segmented control -
// "All" always resets it, and clicking the already-active chip again
// re-selects "All" too.
(function () {
  var groups = Array.prototype.slice.call(document.querySelectorAll(".collapsible-group"));
  if (groups.length === 0) return;

  groups.forEach(initGroupFilter);

  function initGroupFilter(group) {
    var filterEl = group.querySelector(".schedule-filter");
    if (!filterEl) return;

    var attr = filterEl.getAttribute("data-filter-attr");
    var rows = group.querySelectorAll("tbody tr");

    function activeValue() {
      var active = filterEl.querySelector(".schedule-filter-chip.is-active");
      return active ? active.getAttribute("data-filter-value") : "";
    }

    function apply() {
      var value = activeValue();
      rows.forEach(function (row) {
        row.hidden = value !== "" && row.getAttribute("data-" + attr) !== value;
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
