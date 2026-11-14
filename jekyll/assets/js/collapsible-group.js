// Wires up every .collapsible-group on the page (see
// _includes/collapsible-group.html): its heading's eye-icon button
// hides/shows the .collapsible-group-body below it. Shared by rankings
// pages - which layer their own division filter on top of these same
// groups, see assets/js/rankings-filter.js - and qualifying-standards
// pages, which have nothing further to wire up.
//
// The eye icon always starts as "visibility" (section shown) since
// collapsible-group.html never pre-hides a group server-side - so this
// only ever needs to move it into the hidden state, never restore it from
// one.
(function () {
  var groups = Array.prototype.slice.call(document.querySelectorAll(".collapsible-group"));
  if (groups.length === 0) return;

  groups.forEach(function (group) {
    var button = group.querySelector(".collapsible-group-toggle");
    var body = group.querySelector(".collapsible-group-body");
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
