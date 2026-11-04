/*
 * Tern: tiny keyboard helper (no dependencies, no network requests).
 * "/" focuses the search bar when you are not already typing somewhere.
 * Autocomplete arrow keys, Enter and Escape are handled by SearXNG itself.
 */
(function () {
  "use strict";

  function isTyping(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTyping(event.target)) return;

    var q = document.getElementById("q");
    if (!q) return;

    event.preventDefault();
    q.focus();
    var end = q.value.length;
    q.setSelectionRange(end, end);
  });
})();
