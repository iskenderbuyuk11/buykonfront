(function () {
  "use strict";

  function getRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return document.body.getAttribute("data-root") || "";
  }

  function homePath() {
    return getRoot() + "index.html";
  }

  function loginPath() {
    return getRoot() + "pages/login/";
  }

  function safeNextUrl(next) {
    if (!next || typeof next !== "string") return "";
    var value = next.trim();
    if (!value || value.indexOf("://") !== -1 || value.indexOf("//") === 0) return "";
    if (value.charAt(0) !== "/") {
      try {
        value = new URL(value, window.location.href).pathname;
      } catch (e) {
        return "";
      }
    }
    return value;
  }

  function getReturnUrl() {
    try {
      var next = safeNextUrl(new URLSearchParams(window.location.search).get("next"));
      if (next) return next;
    } catch (e) {
      /* ignore */
    }
    return homePath();
  }

  function loginUrlFor(targetPath) {
    var next = safeNextUrl(targetPath);
    if (!next) {
      try {
        next = new URL(targetPath, window.location.href).pathname;
      } catch (e) {
        next = "";
      }
    }
    if (!next) return loginPath();
    return loginPath() + "?next=" + encodeURIComponent(next);
  }

  function requireAuth() {
    return new Promise(function (resolve, reject) {
      if (!window.BizdevarAPI || typeof BizdevarAPI.session !== "function") {
        window.location.replace(loginUrlFor(window.location.pathname));
        reject(new Error("auth_required"));
        return;
      }
      BizdevarAPI.session()
        .then(function (data) {
          if (data && data.logged_in) {
            resolve(data);
            return;
          }
          window.location.replace(loginUrlFor(window.location.pathname));
          reject(new Error("auth_required"));
        })
        .catch(function () {
          window.location.replace(loginUrlFor(window.location.pathname));
          reject(new Error("auth_required"));
        });
    });
  }

  function redirectIfLoggedIn(redirectTo) {
    if (!window.BizdevarAPI || typeof BizdevarAPI.session !== "function") {
      return Promise.resolve(false);
    }
    return BizdevarAPI.session()
      .then(function (data) {
        if (data && data.logged_in) {
          window.location.replace(redirectTo || getReturnUrl());
          return true;
        }
        return false;
      })
      .catch(function () {
        return false;
      });
  }

  window.BizdevarAuthGuard = {
    getRoot: getRoot,
    homePath: homePath,
    loginPath: loginPath,
    loginUrlFor: loginUrlFor,
    getReturnUrl: getReturnUrl,
    requireAuth: requireAuth,
    redirectIfLoggedIn: redirectIfLoggedIn,
  };
})();
