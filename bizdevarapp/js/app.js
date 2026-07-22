(function () {
  "use strict";

  function setCartBadge(totalQty) {
    var v = String(totalQty || 0);
    document.querySelectorAll(".cart-btn__badge").forEach(function (el) {
      el.textContent = v;
    });
  }

  function setFavoritesBadge(count) {
    var n = Number(count) || 0;
    document.querySelectorAll("[data-favorites-badge]").forEach(function (el) {
      el.textContent = String(n);
      if (n > 0) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  }

  function refreshFavoritesBadge() {
    if (typeof BizdevarFavorites === "undefined") {
      setFavoritesBadge(0);
      return;
    }
    setFavoritesBadge(BizdevarFavorites.count());
  }

  function refreshCartBadge() {
    if (typeof BizdevarAPI !== "undefined" && BizdevarAPI.cartGet) {
      BizdevarAPI.cartGet()
        .then(function (d) { setCartBadge(d.total_qty); })
        .catch(function () { setCartBadge(0); });
      return;
    }
    if (typeof BizdevarCart !== "undefined") {
      setCartBadge(BizdevarCart.getTotalQty());
    }
  }

  function initThemeToggle() {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle || toggle.dataset.bound) return;
    toggle.dataset.bound = "1";

    var storageKey = "bizdevar-theme";

    function applyTheme(mode) {
      var isDark = mode === "dark";
      document.body.classList.toggle("dark-mode", isDark);
      toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        isDark ? "İşıqlı rejimi aktiv et" : "Tünd rejimi aktiv et"
      );
    }

    var saved = "";
    try { saved = localStorage.getItem(storageKey) || ""; } catch (e) { saved = ""; }
    applyTheme(saved === "dark" ? "dark" : "light");

    toggle.addEventListener("click", function () {
      var isDark = document.body.classList.contains("dark-mode");
      var next = isDark ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(storageKey, next); } catch (e) { /* ignore */ }
    });
  }

  function initBottomNav() {
    function sync() {
      var path = location.pathname.toLowerCase();

      document.querySelectorAll("[data-bottom-nav]").forEach(function (el) {
        el.classList.remove("is-active");
        var key = el.getAttribute("data-bottom-nav");
        if (key === "home" && /\/bizdevarapp\/?(index\.html)?$/.test(path))
          el.classList.add("is-active");
        if (key === "cart" && path.indexOf("/sebet/") !== -1)
          el.classList.add("is-active");
        if (key === "categories" && path.indexOf("/categories/") !== -1)
          el.classList.add("is-active");
        if (key === "favorites" && path.indexOf("/sevimliler/") !== -1)
          el.classList.add("is-active");
        if (
          key === "profile" &&
          (path.indexOf("/profile/") !== -1 || path.indexOf("/login/") !== -1)
        )
          el.classList.add("is-active");
      });
    }

    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
  }

  function getLayoutRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return document.body.getAttribute("data-root") || "";
  }

  function initAppUi() {
    initThemeToggle();
    initBottomNav();
    refreshCartBadge();
    refreshFavoritesBadge();
    document.addEventListener("BizdevarFavoritesChanged", refreshFavoritesBadge);
    document.addEventListener("BizdevarCartChanged", refreshCartBadge);
    document.addEventListener("BizdevarLayoutLoaded", initThemeToggle);
  }

  function boot() {
    var ready = window.BizdevarLayoutReady;
    if (ready && typeof ready.then === "function") {
      ready.finally(initAppUi);
      return;
    }
    initAppUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.BizdevarApp = {
    refreshCartBadge: refreshCartBadge,
    refreshFavoritesBadge: refreshFavoritesBadge,
    setCartBadge: setCartBadge,
    getLayoutRoot: getLayoutRoot,
  };
})();
