(function () {
  "use strict";

  function $(id) {
    return document.getElementById(id);
  }

  function showError(message) {
    var error = $("adminError");
    error.textContent = message || "";
    error.hidden = !message;
  }

  function setLoading(on) {
    var button = $("btnLogin");
    button.disabled = on;
    if (on) {
      button.dataset.label = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    } else if (button.dataset.label) {
      button.innerHTML = button.dataset.label;
    }
  }

  function login() {
    showError("");
    var email = $("email").value.trim().toLowerCase();
    var password = $("password").value;
    if (!email || !password) {
      showError("Email və şifrə daxil edin");
      return;
    }

    setLoading(true);
    BizdeAdminAPI.login(email, password)
      .then(function () {
        window.location.href = "index.html";
      })
      .catch(function (err) {
        showError(err.message || "Giriş mümkün olmadı");
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function init() {
    $("loginForm").addEventListener("submit", function (event) {
      event.preventDefault();
      login();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
