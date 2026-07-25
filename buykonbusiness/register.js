/**
 * Buykon — sadə satıcı qeydiyyatı (login UI)
 * VÖEN-li / VÖEN-siz + e-poçt OTP + ixtiyari bank hesabı
 */
(function () {
  "use strict";

  var state = {
    type: "",
    emailVerified: false,
    otpTimer: 0,
  };

  var errEl = document.getElementById("err");
  var subtitle = document.getElementById("regSubtitle");
  var steps = {
    type: document.getElementById("stepType"),
    details: document.getElementById("stepDetails"),
    otp: document.getElementById("stepOtp"),
    success: document.getElementById("stepSuccess"),
  };

  function api() {
    return window.BuykonSellerAPI || window.BizdeSellerAPI || null;
  }

  function showErr(msg) {
    if (errEl) errEl.textContent = msg || "";
  }

  function showStep(name) {
    Object.keys(steps).forEach(function (k) {
      if (steps[k]) steps[k].hidden = k !== name;
    });
    showErr("");
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function normalizePhone(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.indexOf("994") === 0) d = d.slice(3);
    if (d.charAt(0) === "0") d = d.slice(1);
    if (d.length === 9) return "+994" + d;
    if (String(raw).indexOf("+994") === 0 && d.length >= 12) return "+994" + d.slice(-9);
    return String(raw || "").trim();
  }

  function maskEmail(e) {
    var parts = String(e).split("@");
    if (parts.length !== 2) return e;
    var u = parts[0];
    var show = u.slice(0, Math.min(2, u.length));
    return show + "***@" + parts[1];
  }

  function syncVoenField() {
    var field = document.getElementById("voenField");
    var input = document.getElementById("regVoen");
    var need = state.type === "voenli";
    if (field) field.hidden = !need;
    if (input) {
      input.required = need;
      if (!need) input.value = "";
    }
  }

  function startOtpTimer(seconds) {
    state.otpTimer = seconds || 60;
    var btn = document.getElementById("btnResendOtp");
    var timerEl = document.getElementById("otpTimer");
    if (btn) btn.disabled = true;

    function tick() {
      if (state.otpTimer <= 0) {
        if (btn) btn.disabled = false;
        if (timerEl) timerEl.textContent = "";
        return;
      }
      if (timerEl) timerEl.textContent = "(" + state.otpTimer + "s)";
      state.otpTimer -= 1;
      setTimeout(tick, 1000);
    }
    tick();
  }

  function showOtpTip(data) {
    var tip = document.getElementById("otpTip");
    if (!tip) return;
    tip.hidden = false;
    tip.innerHTML =
      data && data.dev_code
        ? 'Test kodu: <strong>' + String(data.dev_code) + "</strong>"
        : "Kod e-poçtunuza göndərildi. Spam qovluğunu da yoxlayın.";
  }

  function validateDetails() {
    if (!state.type) return "Hesab növünü seçin.";
    if (!val("regName") || !val("regSurname")) return "Ad və soyadı daxil edin.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("regEmail"))) return "E-poçt düzgün deyil.";
    var phone = normalizePhone(val("regPhone"));
    if (!/^\+994\d{9}$/.test(phone)) return "Telefon +994XXXXXXXXX formatında olmalıdır.";
    if (!val("regStore")) return "Mağaza adını daxil edin.";
    if (state.type === "voenli" && !/^\d{10}$/.test(val("regVoen"))) {
      return "VÖEN 10 rəqəm olmalıdır.";
    }
    if (val("regPass").length < 6) return "Şifrə ən azı 6 simvol olmalıdır.";
    if (val("regPass") !== val("regPass2")) return "Şifrələr uyğun gəlmir.";
    if (!document.getElementById("regContract").checked) {
      return "Müqavilə şərtlərini qəbul edin.";
    }
    return "";
  }

  function sendOtp() {
    var sellerApi = api();
    if (!sellerApi || typeof sellerApi.requestRegisterOtp !== "function") {
      return Promise.reject(new Error("OTP servisi yüklənmədi — səhifəni yeniləyin."));
    }
    return sellerApi.requestRegisterOtp(val("regEmail").toLowerCase());
  }

  function verifyAndRegister() {
    var sellerApi = api();
    if (!sellerApi) {
      return Promise.reject(new Error("API yüklənmədi — səhifəni yeniləyin."));
    }
    var code = val("regOtp").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      return Promise.reject(new Error("6 rəqəmli kodu daxil edin."));
    }

    var payload = {
      email: val("regEmail").toLowerCase(),
      password: val("regPass"),
      password_confirm: val("regPass2"),
      phone: normalizePhone(val("regPhone")),
      store_name: val("regStore"),
      owner_name: val("regName"),
      owner_surname: val("regSurname"),
      category: "Digər",
      store_type: state.type,
      voen: state.type === "voenli" ? val("regVoen") : "",
      bank_account: val("regBank"),
    };

    return sellerApi.verifyRegisterOtp(payload.email, code).then(function () {
      state.emailVerified = true;
      return sellerApi.register(payload);
    });
  }

  function bindType() {
    document.querySelectorAll(".reg-type").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.type = btn.getAttribute("data-type") || "";
        document.querySelectorAll(".reg-type").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        var next = document.getElementById("btnTypeNext");
        if (next) next.disabled = !state.type;
        syncVoenField();
        showErr("");
      });
    });
  }

  function init() {
    bindType();
    syncVoenField();

    var voenInput = document.getElementById("regVoen");
    if (voenInput) {
      voenInput.addEventListener("input", function () {
        voenInput.value = voenInput.value.replace(/\D/g, "").slice(0, 10);
      });
    }

    var otpInput = document.getElementById("regOtp");
    if (otpInput) {
      otpInput.addEventListener("input", function () {
        otpInput.value = otpInput.value.replace(/\D/g, "").slice(0, 6);
      });
    }

    document.getElementById("btnTypeNext").addEventListener("click", function () {
      if (!state.type) {
        showErr("Hesab növünü seçin.");
        return;
      }
      subtitle.textContent =
        state.type === "voenli" ? "VÖEN-li satıcı — məlumatları doldurun" : "VÖEN-siz satıcı — məlumatları doldurun";
      syncVoenField();
      showStep("details");
    });

    document.getElementById("btnBackType").addEventListener("click", function () {
      subtitle.textContent = "Hesab növünü seçin";
      showStep("type");
    });

    document.getElementById("btnDetailsNext").addEventListener("click", function () {
      var vErr = validateDetails();
      if (vErr) {
        showErr(vErr);
        return;
      }
      var btn = document.getElementById("btnDetailsNext");
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Kod göndərilir...';
      sendOtp()
        .then(function (data) {
          document.getElementById("otpEmailMask").textContent = maskEmail(val("regEmail"));
          subtitle.textContent = "E-poçt təsdiqi";
          showStep("otp");
          showOtpTip(data);
          startOtpTimer((data && data.retry_after) || 60);
        })
        .catch(function (e) {
          showErr(e.message || "OTP göndərilmədi");
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-envelope"></i> E-poçt kodu göndər';
        });
    });

    document.getElementById("btnBackDetails").addEventListener("click", function () {
      subtitle.textContent =
        state.type === "voenli" ? "VÖEN-li satıcı — məlumatları doldurun" : "VÖEN-siz satıcı — məlumatları doldurun";
      showStep("details");
    });

    document.getElementById("btnResendOtp").addEventListener("click", function () {
      sendOtp()
        .then(function (data) {
          showOtpTip(data);
          startOtpTimer((data && data.retry_after) || 60);
          showErr("");
        })
        .catch(function (e) {
          showErr(e.message || "OTP göndərilmədi");
        });
    });

    document.getElementById("btnVerifyOtp").addEventListener("click", function () {
      var btn = document.getElementById("btnVerifyOtp");
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Yoxlanılır...';
      verifyAndRegister()
        .then(function () {
          subtitle.textContent = "Qeydiyyat tamamlandı";
          showStep("success");
        })
        .catch(function (e) {
          showErr(e.message || "Qeydiyyat alınmadı");
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Təsdiqlə və qeydiyyatdan keç';
        });
    });

    document.getElementById("regForm").addEventListener("submit", function (e) {
      e.preventDefault();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
