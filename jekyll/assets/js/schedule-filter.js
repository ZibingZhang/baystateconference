// Wires up .schedule-filter chip rows (see _includes/schedule-filter.html):
// clicking a chip shows only the .schedule-group rows whose data-<attr>
// (pipe-separated, since e.g. a game's data-school holds both teams)
// contains that chip's value, and hides a whole group if none of its rows
// match. Single-select, like a segmented control - "All" always resets it.
// Clicking the already-active chip again re-selects "All" instead of just
// sitting there selected with nothing left to click to get back out of it.
(function () {
  document.querySelectorAll(".schedule-filter").forEach(function (filterEl) {
    var attr = filterEl.getAttribute("data-filter-attr");
    var chips = filterEl.querySelectorAll(".schedule-filter-chip");
    var groups = document.querySelectorAll(".schedule-group");

    function apply(value) {
      groups.forEach(function (group) {
        var visible = 0;
        group.querySelectorAll("tbody tr").forEach(function (row) {
          var values = (row.getAttribute("data-" + attr) || "").split("|");
          var match = value === "" || values.indexOf(value) !== -1;
          row.hidden = !match;
          if (match) visible += 1;
        });
        group.hidden = visible === 0;
      });
    }

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
        apply(target.getAttribute("data-filter-value"));
      });
    });
  });
})();
