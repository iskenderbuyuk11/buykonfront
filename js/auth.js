(function () {
  "use strict";

  function getRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return document.body.getAttribute("data-root") || "";
  }

  function showMessage(el, text, type) {
    if (!el) {
      if (text) alert(text);
      return;
    }
    el.textContent = text;
    el.className = "auth-message" + (type ? " auth-message--" + type : "");
    el.hidden = !text;
  }

  function btnLabel(btn) {
    return btn ? btn.querySelector("span") : null;
  }

  function setLoading(btn, loading, defaultText) {
    if (!btn) return;
    btn.disabled = loading;
    var span = btnLabel(btn);
    if (span) {
      span.textContent = loading ? "Yoxlanılır..." : defaultText;
    } else {
      btn.textContent = loading ? "Yoxlanılır..." : defaultText;
    }
  }

  function getDefaultText(btn, fallback) {
    var span = btnLabel(btn);
    var text = span ? span.textContent : (btn ? btn.textContent : "");
    return (text || "").trim() || fallback;
  }

  function initPasswordToggles() {
    document.querySelectorAll("[data-pw-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var input = document.getElementById(btn.getAttribute("data-pw-toggle"));
        if (!input) return;
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.setAttribute("aria-label", show ? "Şifrəni gizlət" : "Şifrəni göstər");
        btn.classList.toggle("is-visible", show);
      });
    });
  }

  function initLoginForm() {
    var form = document.getElementById("loginForm");
    if (!form) return;

    var msg = document.getElementById("auth-message");
    var btn = form.querySelector('button[type="submit"]');
    var defaultText = getDefaultText(btn, "Giriş et");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (typeof BizdevarAPI === "undefined") {
        showMessage(msg, "API yüklənməyib.", "error");
        return;
      }

      var email = (document.getElementById("login-email") || {}).value || "";
      var password = (document.getElementById("login-password") || {}).value || "";

      showMessage(msg, "", "");
      setLoading(btn, true, defaultText);

      BizdevarAPI.login(email.trim(), password)
        .then(function () {
          var dest =
            window.BizdevarAuthGuard && typeof BizdevarAuthGuard.getReturnUrl === "function"
              ? BizdevarAuthGuard.getReturnUrl()
              : getRoot() + "index.html";
          window.location.href = dest;
        })
        .catch(function (err) {
          showMessage(msg, err.message || "Giriş alınmadı.", "error");
        })
        .finally(function () {
          setLoading(btn, false, defaultText);
        });
    });
  }

  function initRegisterForm() {
    var form = document.getElementById("registerForm");
    if (!form) return;

    var msg = document.getElementById("auth-message");
    var btn = form.querySelector('button[type="submit"]');
    var defaultText = getDefaultText(btn, "Qeydiyyatdan keç");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (typeof BizdevarAPI === "undefined") {
        showMessage(msg, "API yüklənməyib.", "error");
        return;
      }

      var name = (document.getElementById("fullname") || document.getElementById("reg-name") || {}).value || "";
      var email = (document.getElementById("email") || document.getElementById("reg-email") || {}).value || "";
      var phoneInput = document.getElementById("phone") || document.getElementById("reg-phone");
      var phone = phoneInput ? phoneInput.value : "";
      var password = (document.getElementById("password") || document.getElementById("reg-password") || {}).value || "";
      var confirm =
        (document.getElementById("confirm-password") || document.getElementById("reg-password-confirm") || {}).value ||
        "";

      phone = String(phone).trim();
      if (phone && phone.indexOf("+994") !== 0) {
        phone = "+994" + phone.replace(/\D/g, "").replace(/^994/, "");
      }

      showMessage(msg, "", "");
      setLoading(btn, true, defaultText);

      BizdevarAPI.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone,
        password: password,
        password_confirm: confirm,
      })
        .then(function () {
          var dest =
            window.BizdevarAuthGuard && typeof BizdevarAuthGuard.getReturnUrl === "function"
              ? BizdevarAuthGuard.getReturnUrl()
              : getRoot() + "index.html";
          window.location.href = dest;
        })
        .catch(function (err) {
          showMessage(msg, err.message || "Qeydiyyat alınmadı.", "error");
        })
        .finally(function () {
          setLoading(btn, false, defaultText);
        });
    });
  }

  function boot() {
    var start = function () {
      initPasswordToggles();
      initLoginForm();
      initRegisterForm();
    };

    if (window.BizdevarAuthGuard && (document.getElementById("loginForm") || document.getElementById("registerForm"))) {
      BizdevarAuthGuard.redirectIfLoggedIn().then(function (redirected) {
        if (!redirected) start();
      });
      return;
    }
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
