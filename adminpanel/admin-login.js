(function () {
  "use strict";

  var state = {
    email: "",
    needsPassword: true,
    step: 1,
  };

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function showError(msg) {
    els.error.textContent = msg || "";
    els.error.hidden = !msg;
  }

  function setStep(n) {
    state.step = n;
    [1, 2, 3, 4].forEach(function (i) {
      var panel = $("step" + i);
      var icon = $("stepIcon" + i);
      if (panel) panel.hidden = i !== n;
      if (icon) {
        icon.classList.toggle("is-active", i === n);
        icon.classList.toggle("is-done", i < n);
      }
    });
    [1, 2, 3].forEach(function (i) {
      var line = $("line" + i);
      if (line) line.classList.toggle("is-done", i < n);
    });
  }

  function setLoading(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    if (on) {
      btn.dataset.label = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
    } else if (btn.dataset.label) {
      btn.innerHTML = btn.dataset.label;
    }
  }

  function goDashboard() {
    window.location.href = "index.html";
  }

  function onEmailContinue() {
    showError("");
    var email = els.email.value.trim().toLowerCase();
    if (!email) {
      showError("Email daxil edin");
      return;
    }
    setLoading(els.btnEmail, true);
    BizdeAdminAPI.checkEmail(email)
      .then(function (data) {
        state.email = email;
        state.needsPassword = !data.needs_password;
        els.passwordGroup.hidden = !state.needsPassword;
        els.password.required = state.needsPassword;
        if (!state.needsPassword) {
          return onRequestOtp(els.btnEmail);
        }
        setStep(2);
      })
      .catch(function (err) {
        showError(err.message || "Bu email admin siyahısında deyil");
      })
      .finally(function () {
        setLoading(els.btnEmail, false);
      });
  }

  function onRequestOtp(loadingBtn) {
    showError("");
    var btn = loadingBtn || els.btnOtp;
    var pass = state.needsPassword ? els.password.value : "";
    if (state.needsPassword && !pass) {
      showError("Şifrə daxil edin");
      return Promise.resolve();
    }
    setLoading(btn, true);
    return BizdeAdminAPI.requestOtp(state.email, pass || undefined)
      .then(function () {
        els.otp.value = "";
        setStep(3);
      })
      .catch(function (err) {
        showError(err.message || "OTP göndərilmədi");
      })
      .finally(function () {
        setLoading(btn, false);
      });
  }

  function onVerifyOtp() {
    showError("");
    var code = els.otp.value.trim();
    if (code.length < 6) {
      showError("6 rəqəmli kod daxil edin");
      return;
    }
    setLoading(els.btnVerify, true);
    BizdeAdminAPI.verifyOtp(state.email, code)
      .then(function (data) {
        if (data.needs_password_setup) {
          setStep(4);
        } else if (data.logged_in) {
          goDashboard();
        }
      })
      .catch(function (err) {
        showError(err.message || "Kod yanlışdır");
      })
      .finally(function () {
        setLoading(els.btnVerify, false);
      });
  }

  function onSetPassword() {
    showError("");
    var pass = els.newPassword.value;
    var pass2 = els.newPassword2.value;
    var code = els.otp.value.trim();
    if (pass.length < 8) {
      showError("Şifrə ən azı 8 simvol olmalıdır");
      return;
    }
    if (pass !== pass2) {
      showError("Şifrələr uyğun gəlmir");
      return;
    }
    setLoading(els.btnSetPass, true);
    BizdeAdminAPI.setPassword(state.email, code, pass, pass2)
      .then(goDashboard)
      .catch(function (err) {
        showError(err.message || "Şifrə təyin edilmədi");
      })
      .finally(function () {
        setLoading(els.btnSetPass, false);
      });
  }

  function init() {
    els = {
      error: $("adminError"),
      email: $("email"),
      password: $("password"),
      passwordGroup: $("passwordGroup"),
      otp: $("otp"),
      newPassword: $("newPassword"),
      newPassword2: $("newPassword2"),
      btnEmail: $("btnEmail"),
      btnOtp: $("btnOtp"),
      btnVerify: $("btnVerify"),
      btnSetPass: $("btnSetPass"),
      btnResend: $("btnResend"),
    };

    $("btnEmail").addEventListener("click", onEmailContinue);
    $("btnOtp").addEventListener("click", function () { onRequestOtp(); });
    $("btnVerify").addEventListener("click", onVerifyOtp);
    $("btnSetPass").addEventListener("click", onSetPassword);
    $("btnBack2").addEventListener("click", function () {
      showError("");
      setStep(1);
    });
    $("btnBack3").addEventListener("click", function () {
      showError("");
      setStep(state.needsPassword ? 2 : 1);
    });
    $("btnResend").addEventListener("click", function () { onRequestOtp(els.btnResend); });

    els.email.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        onEmailContinue();
      }
    });

    BizdeAdminAPI.session().catch(function () {});

    setStep(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
