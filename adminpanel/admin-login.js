(function () {
  "use strict";

  var email = "";

  function $(id) { return document.getElementById(id); }
  function showError(message) {
    var error = $("adminError");
    error.textContent = message || "";
    error.hidden = !message;
  }
  function showPanel(id) {
    ["emailPanel", "loginPanel", "setupPanel"].forEach(function (panel) {
      $(panel).hidden = panel !== id;
    });
  }
  function setLoading(button, on) {
    button.disabled = on;
    if (on) {
      button.dataset.label = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    } else if (button.dataset.label) {
      button.innerHTML = button.dataset.label;
    }
  }
  function goDashboard() { window.location.href = "index.html"; }

  function continueWithEmail() {
    showError("");
    email = $("email").value.trim().toLowerCase();
    if (!email) { showError("Email daxil edin"); return; }
    setLoading($("btnEmail"), true);
    BizdeAdminAPI.checkEmail(email)
      .then(function (data) {
        showPanel(data.needs_password ? "setupPanel" : "loginPanel");
      })
      .catch(function (err) { showError(err.message || "Admin tapılmadı"); })
      .finally(function () { setLoading($("btnEmail"), false); });
  }

  function login() {
    var password = $("password").value;
    if (!password) { showError("Şifrə daxil edin"); return; }
    showError(""); setLoading($("btnLogin"), true);
    BizdeAdminAPI.login(email, password).then(goDashboard)
      .catch(function (err) { showError(err.message || "Giriş mümkün olmadı"); })
      .finally(function () { setLoading($("btnLogin"), false); });
  }

  function setupPassword() {
    var password = $("newPassword").value;
    var confirmation = $("newPassword2").value;
    if (password.length < 8) { showError("Şifrə ən azı 8 simvol olmalıdır"); return; }
    if (password !== confirmation) { showError("Şifrələr uyğun gəlmir"); return; }
    showError(""); setLoading($("btnSetup"), true);
    BizdeAdminAPI.setupPassword(email, password, confirmation).then(goDashboard)
      .catch(function (err) { showError(err.message || "Şifrə təyin edilmədi"); })
      .finally(function () { setLoading($("btnSetup"), false); });
  }

  function bindForm(id, action) {
    $(id).addEventListener("submit", function (event) { event.preventDefault(); action(); });
  }
  function init() {
    bindForm("emailPanel", continueWithEmail);
    bindForm("loginPanel", login);
    bindForm("setupPanel", setupPassword);
    document.querySelectorAll(".btnBack").forEach(function (button) {
      button.addEventListener("click", function () { showError(""); showPanel("emailPanel"); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
