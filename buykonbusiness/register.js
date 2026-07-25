/**
 * Buykon — satıcı qeydiyyatı
 * type → details → email OTP → Didit KYC → submit → success
 */
(function () {
  "use strict";

  var DRAFT_KEY = "buykon_seller_reg_draft";
  var KYC_TOKEN_KEY = "buykon_seller_kyc_token";
  var OTP_PROOF_KEY = "buykon_seller_otp_proof";
  var POLL_INTERVAL_MS = 3000;
  var POLL_MAX_ATTEMPTS = 40;

  var state = {
    type: "",
    emailVerified: false,
    otpTimer: 0,
    kycToken: "",
    otpProof: "",
    kycStatus: "",
    pollTimer: null,
    pollAttempts: 0,
  };

  var errEl = document.getElementById("err");
  var subtitle = document.getElementById("regSubtitle");
  var steps = {
    type: document.getElementById("stepType"),
    details: document.getElementById("stepDetails"),
    otp: document.getElementById("stepOtp"),
    kyc: document.getElementById("stepKyc"),
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
    if (name !== "kyc") stopPolling();
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function setVal(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value == null ? "" : String(value);
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

  function resolvePasswords() {
    var pass = val("regPass");
    var pass2 = val("regPass2");
    if (!pass || !pass2) {
      var draft = loadDraft();
      if (draft) {
        if (!pass) pass = String(draft.password || "");
        if (!pass2) pass2 = String(draft.passwordConfirm || draft.password || "");
      }
    }
    return { password: pass, passwordConfirm: pass2 };
  }

  function validatePasswordsForSubmit() {
    var p = resolvePasswords();
    if (p.password.length < 6) return "Şifrə tapılmadı — əvvəlki addıma qayıdıb şifrəni yenidən daxil edin.";
    if (p.password !== p.passwordConfirm) return "Şifrələr uyğun gəlmir.";
    return "";
  }

  function sendOtp() {
    var sellerApi = api();
    if (!sellerApi || typeof sellerApi.requestRegisterOtp !== "function") {
      return Promise.reject(new Error("OTP servisi yüklənmədi — səhifəni yeniləyin."));
    }
    return sellerApi.requestRegisterOtp(val("regEmail").toLowerCase());
  }

  function saveDraft() {
    var draft = {
      type: state.type,
      emailVerified: state.emailVerified,
      name: val("regName"),
      surname: val("regSurname"),
      email: val("regEmail").toLowerCase(),
      phone: val("regPhone"),
      store: val("regStore"),
      voen: val("regVoen"),
      bank: val("regBank"),
      password: val("regPass"),
      passwordConfirm: val("regPass2"),
      contract: !!(document.getElementById("regContract") && document.getElementById("regContract").checked),
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      /* ignore quota */
    }
  }

  function loadDraft() {
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(KYC_TOKEN_KEY);
      sessionStorage.removeItem(OTP_PROOF_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function saveKycToken(token) {
    state.kycToken = String(token || "");
    try {
      if (state.kycToken) sessionStorage.setItem(KYC_TOKEN_KEY, state.kycToken);
      else sessionStorage.removeItem(KYC_TOKEN_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function saveOtpProof(proof) {
    state.otpProof = String(proof || "");
    try {
      if (state.otpProof) sessionStorage.setItem(OTP_PROOF_KEY, state.otpProof);
      else sessionStorage.removeItem(OTP_PROOF_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function loadKycToken() {
    try {
      return sessionStorage.getItem(KYC_TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function loadOtpProof() {
    try {
      return sessionStorage.getItem(OTP_PROOF_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function restoreDraft(draft) {
    if (!draft) return;
    state.type = draft.type || "";
    state.emailVerified = !!draft.emailVerified;
    setVal("regName", draft.name || "");
    setVal("regSurname", draft.surname || "");
    setVal("regEmail", draft.email || "");
    setVal("regPhone", draft.phone || "");
    setVal("regStore", draft.store || "");
    setVal("regVoen", draft.voen || "");
    setVal("regBank", draft.bank || "");
    var contract = document.getElementById("regContract");
    if (contract) contract.checked = !!draft.contract;
    setVal("regPass", draft.password || "");
    setVal("regPass2", draft.passwordConfirm || draft.password || "");
    document.querySelectorAll(".reg-type").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-type") === state.type ? "true" : "false");
    });
    var next = document.getElementById("btnTypeNext");
    if (next) next.disabled = !state.type;
    syncVoenField();
  }

  function extractKycSession(data) {
    var token =
      (data && (data.kyc_token || data.token || data.application_token || data.applicationToken)) || "";
    var url =
      (data && (data.url || data.verification_url || data.session_url || data.verificationUrl)) || "";
    return { token: String(token), url: String(url) };
  }

  function normalizeKycStatus(raw) {
    var s = String(raw || "")
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_");
    if (s === "approved" || s === "verified" || s === "complete" || s === "completed") return "approved";
    if (s === "declined" || s === "rejected" || s === "failed" || s === "abandoned") return "declined";
    if (s === "expired" || s === "kyc_expired") return "expired";
    if (
      s === "in_review" ||
      s === "pending_review" ||
      s === "review" ||
      s === "manual_review" ||
      s === "inreview"
    ) {
      return "review";
    }
    if (
      s === "pending" ||
      s === "not_started" ||
      s === "in_progress" ||
      s === "processing" ||
      s === "started" ||
      s === ""
    ) {
      return "pending";
    }
    return s;
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearTimeout(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function schedulePoll() {
    stopPolling();
    if (state.pollAttempts >= POLL_MAX_ATTEMPTS) return;
    if (state.kycStatus === "approved" || state.kycStatus === "declined" || state.kycStatus === "expired") {
      return;
    }
    state.pollTimer = setTimeout(function () {
      refreshKycStatus(true);
    }, POLL_INTERVAL_MS);
  }

  function renderKycUi(status, data) {
    state.kycStatus = status;
    var card = document.getElementById("kycCard");
    var title = document.getElementById("kycStatusTitle");
    var text = document.getElementById("kycStatusText");
    var icon = document.getElementById("kycStatusIcon");
    var reasonEl = document.getElementById("kycReason");
    var submitBtn = document.getElementById("btnSubmitApp");
    var retryBtn = document.getElementById("btnKycRetry");
    var refreshBtn = document.getElementById("btnKycRefresh");

    if (card) card.setAttribute("data-status", status || "pending");

    var reason =
      (data && (data.reason || data.decline_reason || data.message || data.status_reason)) || "";

    if (status === "approved") {
      if (title) title.textContent = "Şəxsiyyət təsdiqləndi";
      if (text) text.textContent = "KYC Approved — indi müraciəti göndərə bilərsiniz.";
      if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      if (reasonEl) {
        reasonEl.hidden = true;
        reasonEl.textContent = "";
      }
      if (submitBtn) submitBtn.disabled = false;
      if (retryBtn) retryBtn.hidden = true;
      if (refreshBtn) refreshBtn.hidden = true;
    } else if (status === "review") {
      if (title) title.textContent = "Əlavə yoxlama";
      if (text) text.textContent = "Müraciətiniz nəzərdən keçirilir. Bir az sonra statusu yeniləyin.";
      if (icon) icon.innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
      if (reasonEl) {
        reasonEl.hidden = !reason;
        reasonEl.textContent = reason || "";
      }
      if (submitBtn) submitBtn.disabled = true;
      if (retryBtn) retryBtn.hidden = true;
      if (refreshBtn) refreshBtn.hidden = false;
    } else if (status === "declined" || status === "expired") {
      if (title) title.textContent = status === "expired" ? "KYC vaxtı bitib" : "KYC rədd edildi";
      if (text) {
        text.textContent =
          status === "expired"
            ? "Şəxsiyyət yoxlamasının vaxtı bitib. Yenidən cəhd edin."
            : "Şəxsiyyət yoxlaması uğursuz oldu. Yenidən cəhd edə bilərsiniz.";
      }
      if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
      if (reasonEl) {
        reasonEl.hidden = !reason;
        reasonEl.textContent = reason || "";
      }
      if (submitBtn) submitBtn.disabled = true;
      if (retryBtn) retryBtn.hidden = false;
      if (refreshBtn) refreshBtn.hidden = false;
    } else {
      if (title) title.textContent = "Şəxsiyyət təsdiqi gözlənilir";
      if (text) text.textContent = "Didit yoxlaması davam edir və ya nəticə hələ gəlməyib.";
      if (icon) icon.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      if (reasonEl) {
        reasonEl.hidden = true;
        reasonEl.textContent = "";
      }
      if (submitBtn) submitBtn.disabled = true;
      if (retryBtn) retryBtn.hidden = true;
      if (refreshBtn) refreshBtn.hidden = false;
    }
  }

  function refreshKycStatus(fromPoll) {
    var sellerApi = api();
    if (!sellerApi || typeof sellerApi.sellerKycStatus !== "function") {
      showErr("KYC status servisi yüklənmədi — səhifəni yeniləyin.");
      return Promise.resolve();
    }
    if (!state.kycToken) {
      showErr("KYC token tapılmadı. OTP addımından yenidən başlayın.");
      return Promise.resolve();
    }

    if (fromPoll) state.pollAttempts += 1;

    return sellerApi
      .sellerKycStatus(state.kycToken)
      .then(function (data) {
        var raw =
          (data && (data.status || data.kyc_status || (data.kyc && data.kyc.status))) || "pending";
        var status = normalizeKycStatus(raw);
        renderKycUi(status, data);
        if (!fromPoll) showErr("");
        schedulePoll();
      })
      .catch(function (e) {
        if (!fromPoll) showErr(e.message || "KYC statusu alınmadı");
        schedulePoll();
      });
  }

  function enterKycStep(opts) {
    opts = opts || {};
    subtitle.textContent = "Şəxsiyyət təsdiqi (KYC)";
    showStep("kyc");
    state.pollAttempts = 0;
    renderKycUi(opts.status || state.kycStatus || "pending", opts.data || null);
    refreshKycStatus(false);
  }

  function startDiditSession() {
    var sellerApi = api();
    if (!sellerApi || typeof sellerApi.createSellerKycSession !== "function") {
      return Promise.reject(new Error("KYC servisi yüklənmədi — səhifəni yeniləyin."));
    }
    var email = val("regEmail").toLowerCase();
    if (!email) return Promise.reject(new Error("E-poçt tapılmadı."));

    return sellerApi.createSellerKycSession(email, state.otpProof).then(function (data) {
      var session = extractKycSession(data);
      if (!session.token) {
        throw new Error("KYC token alınmadı. Yenidən cəhd edin.");
      }
      if (!session.url) {
        throw new Error("Didit URL alınmadı. Yenidən cəhd edin.");
      }
      saveDraft();
      saveKycToken(session.token);
      window.location.href = session.url;
    });
  }

  function verifyOtpThenKyc() {
    var sellerApi = api();
    if (!sellerApi) {
      return Promise.reject(new Error("API yüklənmədi — səhifəni yeniləyin."));
    }
    var code = val("regOtp").replace(/\D/g, "");
    if (!/^\d{6}$/.test(code)) {
      return Promise.reject(new Error("6 rəqəmli kodu daxil edin."));
    }

    var email = val("regEmail").toLowerCase();
    return sellerApi.verifyRegisterOtp(email, code).then(function (data) {
      state.emailVerified = true;
      if (data && data.otp_proof) saveOtpProof(data.otp_proof);
      saveDraft();
      return startDiditSession();
    });
  }

  function buildRegisterPayload() {
    var p = resolvePasswords();
    var draft = loadDraft() || {};
    var type = state.type || draft.type || "";
    var voen = type === "voenli"
      ? String(val("regVoen") || draft.voen || "").replace(/\D/g, "").slice(0, 10)
      : "";
    return {
      email: (val("regEmail") || draft.email || "").toLowerCase(),
      password: p.password,
      password_confirm: p.passwordConfirm,
      phone: normalizePhone(val("regPhone") || draft.phone || ""),
      store_name: val("regStore") || draft.store || "",
      owner_name: val("regName") || draft.name || "",
      owner_surname: val("regSurname") || draft.surname || "",
      category: "Digər",
      store_type: type,
      voen: voen,
      bank_account: val("regBank") || draft.bank || "",
      kyc_token: state.kycToken,
      otp_proof: state.otpProof || undefined,
    };
  }

  function submitApplication() {
    var sellerApi = api();
    if (!sellerApi || typeof sellerApi.register !== "function") {
      return Promise.reject(new Error("API yüklənmədi — səhifəni yeniləyin."));
    }
    if (!state.kycToken) {
      return Promise.reject(new Error("KYC token yoxdur — şəxsiyyət yoxlamasını tamamlayın."));
    }
    if (state.kycStatus !== "approved") {
      return Promise.reject(new Error("Yalnız təsdiqlənmiş KYC ilə müraciət göndərilə bilər."));
    }
    var passErr = validatePasswordsForSubmit();
    if (passErr) return Promise.reject(new Error(passErr));
    var payload = buildRegisterPayload();
    if (payload.store_type === "voenli" && !/^\d{10}$/.test(payload.voen || "")) {
      return Promise.reject(new Error("VÖEN 10 rəqəm olmalıdır — əvvəlki addıma qayıdıb düzəldin."));
    }
    if (!payload.owner_name || !payload.owner_surname || !payload.store_name) {
      return Promise.reject(new Error("Məlumatlar natamamdır — formu yenidən doldurun."));
    }

    return sellerApi.register(payload).then(function (data) {
      clearDraft();
      state.kycToken = "";
      return data;
    });
  }

  function isKycReturn() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      return params.get("kyc_return") === "1";
    } catch (e) {
      return /[?&]kyc_return=1(?:&|$)/.test(window.location.search || "");
    }
  }

  function cleanKycReturnParam() {
    try {
      var url = new URL(window.location.href);
      if (!url.searchParams.has("kyc_return")) return;
      url.searchParams.delete("kyc_return");
      var next = url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") + url.hash;
      window.history.replaceState({}, "", next);
    } catch (e) {
      /* ignore */
    }
  }

  function detailsSubtitle() {
    return state.type === "voenli"
      ? "VÖEN-li satıcı — məlumatları doldurun"
      : "VÖEN-siz satıcı — məlumatları doldurun";
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
      subtitle.textContent = detailsSubtitle();
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
          saveDraft();
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
      subtitle.textContent = detailsSubtitle();
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
      verifyOtpThenKyc()
        .catch(function (e) {
          showErr(e.message || "OTP və ya KYC sessiyası alınmadı");
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML =
            '<i class="fa-solid fa-fingerprint"></i> Təsdiqlə və şəxsiyyət yoxlamasına keç';
        });
    });

    document.getElementById("btnKycRefresh").addEventListener("click", function () {
      var btn = document.getElementById("btnKycRefresh");
      btn.disabled = true;
      refreshKycStatus(false).finally(function () {
        btn.disabled = false;
      });
    });

    document.getElementById("btnKycRetry").addEventListener("click", function () {
      var btn = document.getElementById("btnKycRetry");
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Açılır...';
      startDiditSession()
        .catch(function (e) {
          showErr(e.message || "KYC sessiyası açıla bilmədi");
        })
        .finally(function () {
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-fingerprint"></i> Yenidən yoxla';
        });
    });

    document.getElementById("btnSubmitApp").addEventListener("click", function () {
      var btn = document.getElementById("btnSubmitApp");
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Göndərilir...';
      submitApplication()
        .then(function () {
          subtitle.textContent = "Qeydiyyat tamamlandı";
          showStep("success");
        })
        .catch(function (e) {
          showErr(e.message || "Müraciət göndərilmədi");
          btn.disabled = state.kycStatus !== "approved";
        })
        .finally(function () {
          btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Müraciəti göndər';
          if (state.kycStatus === "approved" && steps.success && steps.success.hidden) {
            btn.disabled = false;
          }
        });
    });

    document.getElementById("btnBackFromKyc").addEventListener("click", function () {
      stopPolling();
      subtitle.textContent = detailsSubtitle();
      showStep("details");
    });

    document.getElementById("regForm").addEventListener("submit", function (e) {
      e.preventDefault();
    });

    var draft = loadDraft();
    var token = loadKycToken();
    var proof = loadOtpProof();
    if (proof) saveOtpProof(proof);
    if (isKycReturn() || (token && draft)) {
      if (draft) restoreDraft(draft);
      if (token) saveKycToken(token);
      cleanKycReturnParam();
      if (state.kycToken) {
        enterKycStep();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
