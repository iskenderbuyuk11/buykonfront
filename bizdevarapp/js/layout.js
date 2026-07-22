(function () {
  "use strict";

  function getRoot() {
    return document.body.getAttribute("data-root") || "";
  }

  function getAssets() {
    return document.body.getAttribute("data-assets") || "../";
  }

  function applyTokens(html, root, assets) {
    return html.replace(/\{\{ROOT\}\}/g, root).replace(/\{\{ASSETS\}\}/g, assets);
  }

  function loadPartial(path, root) {
    return fetch(root + path).then(function (res) {
      if (!res.ok) throw new Error("Partial yüklənmədi: " + path);
      return res.text();
    });
  }

  function injectHtml(targetId, html) {
    var target = document.getElementById(targetId);
    if (target) target.innerHTML = html;
  }

  var root = getRoot();
  var assets = getAssets();

  window.BizdevarLayoutReady = Promise.all([
    loadPartial("partials/header.html", root),
    loadPartial("partials/bottom-nav.html", root),
  ])
    .then(function (parts) {
      injectHtml("site-header", applyTokens(parts[0], root, assets));
      injectHtml("site-bottom-nav", applyTokens(parts[1], root, assets));
      document.dispatchEvent(new CustomEvent("BizdevarLayoutLoaded"));
    })
    .catch(function (err) {
      console.error(err);
    });

  window.BizdevarLayout = {
    getRoot: getRoot,
    getAssets: getAssets,
  };
})();
