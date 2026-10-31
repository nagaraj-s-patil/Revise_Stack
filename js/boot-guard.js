// A plain (non-module) script, so it still runs when the page is opened straight from a file.
// It only explains what is wrong if the app does not start.
(function () {
  var app = document.getElementById('app');
  function explain(text) {
    if (app && app.hasAttribute('data-loading')) app.textContent = text;
  }
  if (location.protocol === 'file:') {
    explain('Revise Stack cannot start from a file. Open it from its web address, or run "npm start" and open http://localhost:8080. See the README.');
    return;
  }
  setTimeout(function () {
    explain('Revise Stack did not start. Refresh the page. If it still fails, your browser may be too old (it needs ES modules).');
  }, 6000);
})();
