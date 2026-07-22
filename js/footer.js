(function () {
  "use strict";

  function initFooter() {
    var yearEl = document.querySelector("[data-footer-year]");
    if (yearEl) {
      yearEl.textContent = String(new Date().getFullYear());
    }
  }

  function loadTawk() {
    if (window.__buykonTawkLoaded) return;
    var root = "";
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      root = BizdevarLayout.getRoot();
    } else if (document.body) {
      root = document.body.getAttribute("data-root") || "";
    }
    var s = document.createElement("script");
    s.src = root + "js/tawk.js";
    s.async = true;
    document.body.appendChild(s);
  }

  function boot() {
    var ready = window.BizdevarLayoutReady;
    if (ready && typeof ready.then === "function") {
      ready.finally(function () {
        initFooter();
        loadTawk();
      });
      return;
    }
    initFooter();
    loadTawk();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.BizdevarFooter = {
    init: initFooter,
  };
})();
