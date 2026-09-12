// Wires up .schedule-filter chip rows (see _includes/schedule-filter.html):
// clicking a chip shows only the .schedule-group rows whose data-<attr>
// (pipe-separated, since e.g. a game's data-school holds both teams)
// contains that chip's value, and hides a whole group if none of its rows
// match. Single-select per filter, like a segmented control - "All" always
// resets it, and clicking the already-active chip again re-selects "All"
// too, rather than just sitting there selected with no way to click back
// out of it.
//
// A page can have more than one .schedule-filter (e.g. a sport's schedule
// page filters by both school and level) - every active filter is ANDed
// together against each row, not just whichever one was clicked most
// recently.
(function () {
  var filterEls = Array.prototype.slice.call(document.querySelectorAll(".schedule-filter"));
  if (filterEls.length === 0) return;

  var groups = document.querySelectorAll(".schedule-group");

  function activeValue(filterEl) {
    var active = filterEl.querySelector(".schedule-filter-chip.is-active");
    return active ? active.getAttribute("data-filter-value") : "";
  }

  function apply() {
    groups.forEach(function (group) {
      var visible = 0;
      group.querySelectorAll("tbody tr").forEach(function (row) {
        var match = filterEls.every(function (filterEl) {
          var value = activeValue(filterEl);
          if (value === "") return true;
          var attr = filterEl.getAttribute("data-filter-attr");
          var values = (row.getAttribute("data-" + attr) || "").split("|");
          return values.indexOf(value) !== -1;
        });
        row.hidden = !match;
        if (match) visible += 1;
      });
      group.hidden = visible === 0;
    });
  }

  filterEls.forEach(function (filterEl) {
    var chips = filterEl.querySelectorAll(".schedule-filter-chip");

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var target = chip.classList.contains("is-active")
          ? filterEl.querySelector('.schedule-filter-chip[data-filter-value=""]')
          : chip;

        chips.forEach(function (c) {
          c.classList.remove("is-active");
          c.setAttribute("aria-pressed", "false");
        });
        target.classList.add("is-active");
        target.setAttribute("aria-pressed", "true");
        apply();
      });
    });
  });
})();
