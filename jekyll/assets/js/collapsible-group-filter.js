// Wires up each .collapsible-group that has its own .schedule-filter (see
// _includes/rankings-summary-table.html, _includes/all-stars-table.html):
// shows only that group's rows whose data-<filter-attr> matches the active
// chip's value. Include assets/js/collapsible-group.js alongside this for
// the heading/eye-icon toggle itself.
//
// Reuses .schedule-filter/.schedule-filter-chip's markup and CSS, but not
// schedule-filter.js - that script ANDs every filter on the page against
// every schedule-group, which is wrong here since each table has its own
// independent, one-off set of filter values. This scopes each filter to its
// own nearest .collapsible-group instead.
//
// Filter chips are single-select per group - "All" resets it, and clicking
// the active chip again also resets to "All".
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
