(function () {
  "use strict";

  function getRoot() {
    return document.body.getAttribute("data-root") || "";
  }

  function ensureAzFont() {
    if (document.querySelector('link[data-buykon-font="nunito"]')) return;
    var pre1 = document.createElement("link");
    pre1.rel = "preconnect";
    pre1.href = "https://fonts.googleapis.com";
    var pre2 = document.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "anonymous";
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-buykon-font", "nunito");
    link.href =
      "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,400..800;1,6..12,400..800&display=swap";
    document.head.appendChild(pre1);
    document.head.appendChild(pre2);
    document.head.appendChild(link);
  }

  function applyRoot(html, root) {
    return html.replace(/\{\{ROOT\}\}/g, root);
  }

  function loadPartial(path, root) {
    return fetch(root + path).then(function (res) {
      if (!res.ok) {
        throw new Error("Partial yüklənmədi: " + path);
      }
      return res.text();
    });
  }

  function injectHtml(targetId, html) {
    var target = document.getElementById(targetId);
    if (target) {
      target.innerHTML = html;
    }
  }

  window.BizdevarLayoutReady = Promise.all([
    loadPartial("partials/header.html", getRoot()),
    loadPartial("partials/footer.html", getRoot()),
    loadPartial("partials/bottom-nav.html", getRoot()),
  ])
    .then(function (parts) {
      ensureAzFont();
      var root = getRoot();
      injectHtml("site-header", applyRoot(parts[0], root));
      injectHtml("site-footer", applyRoot(parts[1], root));
      injectHtml("site-bottom-nav", applyRoot(parts[2], root));
      document.dispatchEvent(new CustomEvent("BizdevarLayoutLoaded"));
      if (!window.__buykonTawkLoaded && !document.querySelector('script[src*="tawk.js"]')) {
        var s = document.createElement("script");
        s.src = root + "js/tawk.js";
        s.async = true;
        document.body.appendChild(s);
      }
      if (!window.BuykonOnboarding && !document.querySelector('script[src*="onboarding.js"]')) {
        var ob = document.createElement("script");
        ob.src = root + "js/onboarding.js?v=2";
        ob.async = true;
        document.body.appendChild(ob);
      }
    })
    .catch(function (err) {
      console.error(err);
    });

  window.BizdevarLayout = {
    getRoot: getRoot,
  };
})();
