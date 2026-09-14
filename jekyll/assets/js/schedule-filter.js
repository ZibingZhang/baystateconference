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
//
// Each filter's active value is mirrored to a query param named after its
// data-filter-attr (e.g. ?school=Natick), via replaceState so filtering
// doesn't spam browser history. On load, params already in the URL (a
// bookmarked or shared link) are used to pre-select chips before the first
// apply() - an unrecognized value is just ignored, leaving "All".
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

  function activateChip(filterEl, chip) {
    filterEl.querySelectorAll(".schedule-filter-chip").forEach(function (c) {
      c.classList.remove("is-active");
      c.setAttribute("aria-pressed", "false");
    });
    chip.classList.add("is-active");
    chip.setAttribute("aria-pressed", "true");
  }

  function syncUrl() {
    var params = new URLSearchParams(window.location.search);
    filterEls.forEach(function (filterEl) {
      var attr = filterEl.getAttribute("data-filter-attr");
      var value = activeValue(filterEl);
      if (value === "") {
        params.delete(attr);
      } else {
        params.set(attr, value);
      }
    });
    var query = params.toString();
    var url = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
    window.history.replaceState(null, "", url);
  }

  var initialParams = new URLSearchParams(window.location.search);
  filterEls.forEach(function (filterEl) {
    var value = initialParams.get(filterEl.getAttribute("data-filter-attr"));
    if (!value) return;
    var chips = Array.prototype.slice.call(filterEl.querySelectorAll(".schedule-filter-chip"));
    var chip = chips.filter(function (c) {
      return c.getAttribute("data-filter-value") === value;
    })[0];
    if (chip) activateChip(filterEl, chip);
  });
  apply();

  filterEls.forEach(function (filterEl) {
    var chips = filterEl.querySelectorAll(".schedule-filter-chip");

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var target = chip.classList.contains("is-active")
          ? filterEl.querySelector('.schedule-filter-chip[data-filter-value=""]')
          : chip;

        activateChip(filterEl, target);
        apply();
        syncUrl();
      });
    });
  });
})();
