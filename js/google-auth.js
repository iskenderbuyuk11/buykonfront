(function () {
  "use strict";

  function getRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return document.body.getAttribute("data-root") || "";
  }

  function clientId() {
    var meta = document.querySelector('meta[name="google-client-id"]');
    var id = meta ? (meta.getAttribute("content") || "").trim() : "";
    return id;
  }

  function message(text, type) {
    var el = document.getElementById("auth-message");
    if (!el) {
      if (text) alert(text);
      return;
    }
    el.textContent = text;
    el.className = "auth-message" + (type ? " auth-message--" + type : "");
    el.hidden = !text;
  }

  function onCredential(response) {
    if (!response || !response.credential) {
      message("Google girişi alınmadı.", "error");
      return;
    }
    if (typeof BizdevarAPI === "undefined") {
      message("API yüklənməyib.", "error");
      return;
    }
    message("", "");
    BizdevarAPI.googleLogin(response.credential)
      .then(function () {
        var dest =
          window.BizdevarAuthGuard && typeof BizdevarAuthGuard.getReturnUrl === "function"
            ? BizdevarAuthGuard.getReturnUrl()
            : getRoot() + "index.html";
        window.location.href = dest;
      })
      .catch(function (err) {
        message(err.message || "Google ilə giriş alınmadı.", "error");
      });
  }

  function initWhenReady(id, attempts) {
    attempts = attempts || 0;
    if (window.google && window.google.accounts && window.google.accounts.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: id,
          callback: onCredential,
        });
        var container = document.getElementById("googleBtn");
        var fallback = document.getElementById("googleFallback");
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            width: 360,
            text: "continue_with",
            shape: "pill",
            logo_alignment: "center",
          });
          if (fallback) fallback.style.display = "none";
        }
      } catch (e) {
        /* susqun: fallback düymə qalır */
      }
      return;
    }
    if (attempts < 40) {
      setTimeout(function () {
        initWhenReady(id, attempts + 1);
      }, 150);
    }
  }

  function init() {
    var fallback = document.getElementById("googleFallback");
    var id = clientId();

    if (!id) {
      // Client ID təyin olunmayıb — düymə məlumat versin.
      if (fallback) {
        fallback.addEventListener("click", function () {
          message(
            "Google girişi hələ konfiqurasiya olunmayıb. Səhifədəki <meta name=\"google-client-id\"> və backend application.yml dəyərlərini doldur.",
            "error"
          );
        });
      }
      return;
    }

    initWhenReady(id, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
