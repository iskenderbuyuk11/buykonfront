/**
 * Buykon — Satıcı Ol 10-addımlı wizard
 */
(function () {
  "use strict";

  var STEP_LABELS = [
    "Hesab növü",
    "Şəxsi məlumatlar",
    "Telefon təsdiqi",
    "E-poçt təsdiqi",
    "Şəxsiyyət (KYC)",
    "Vergi / şirkət",
    "Mağaza",
    "Müqavilə",
    "Bank hesabı",
    "Admin təsdiqi",
  ];

  var state = {
    step: 1,
    account: "",
    phoneVerified: false,
    emailVerified: false,
    contractRead: false,
    bankClicked: false,
    files: {},
    timers: { phone: 0, email: 0 },
  };

  var alertEl = document.getElementById("swAlert");
  var nextBtn = document.getElementById("swNext");
  var backBtn = document.getElementById("swBack");

  function root() {
    var b = document.body.getAttribute("data-root");
    if (b) return b.endsWith("/") ? b : b + "/";
    return "../";
  }

  function otpUrl() {
    return root() + "api/seller-otp.php";
  }

  function onboardUrl() {
    return root() + "api/seller-onboard.php";
  }

  function showAlert(msg) {
    if (!alertEl) return;
    if (!msg) {
      alertEl.hidden = true;
      alertEl.textContent = "";
      return;
    }
    alertEl.hidden = false;
    alertEl.textContent = msg;
    alertEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function buildStepList() {
    var ol = document.getElementById("swStepList");
    if (!ol) return;
    ol.innerHTML = STEP_LABELS.map(function (label, i) {
      var n = i + 1;
      return (
        '<li data-n="' +
        n +
        '"><span class="sw-steps__num">' +
        n +
        "</span><span>" +
        label +
        "</span></li>"
      );
    }).join("");
  }

  function updateChrome() {
    document.querySelectorAll(".sw-panel").forEach(function (p) {
      var n = Number(p.getAttribute("data-step"));
      var on = n === state.step;
      p.hidden = !on;
      p.classList.toggle("is-active", on);
    });

    document.querySelectorAll("#swStepList li").forEach(function (li) {
      var n = Number(li.getAttribute("data-n"));
      li.classList.toggle("is-active", n === state.step);
      li.classList.toggle("is-done", n < state.step);
      var num = li.querySelector(".sw-steps__num");
      if (num) num.textContent = n < state.step ? "✓" : String(n);
    });

    var meta = document.getElementById("swStepMeta");
    if (meta) meta.textContent = "Addım " + state.step + " / 10";

    var bar = document.getElementById("swProgressBar");
    if (bar) bar.style.width = state.step * 10 + "%";

    if (backBtn) {
      backBtn.hidden = state.step <= 1 || state.step >= 10;
    }
    if (nextBtn) {
      nextBtn.hidden = state.step >= 10;
      nextBtn.textContent = state.step === 9 ? "Müraciəti göndər" : "Davam et";
      nextBtn.disabled = false;
    }

    var nav = document.getElementById("swNav");
    if (nav) nav.hidden = state.step >= 10;

    showAlert("");
    syncTaxPanels();
  }

  function syncTaxPanels() {
    var fiz = document.getElementById("taxFiziki");
    var fer = document.getElementById("taxFerdi");
    var mmc = document.getElementById("taxMmc");
    if (fiz) fiz.hidden = state.account !== "fiziki";
    if (fer) fer.hidden = state.account !== "ferdi";
    if (mmc) mmc.hidden = state.account !== "mmc";
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

  function maskPhone(p) {
    var s = normalizePhone(p);
    if (s.length < 8) return s;
    return s.slice(0, 7) + " *** " + s.slice(-2);
  }

  function maskEmail(e) {
    var parts = String(e).split("@");
    if (parts.length !== 2) return e;
    var u = parts[0];
    var show = u.slice(0, Math.min(2, u.length));
    return show + "***@" + parts[1];
  }

  function buildOtpInputs(container) {
    if (!container || container.dataset.ready) return;
    container.innerHTML = "";
    for (var i = 0; i < 6; i++) {
      var inp = document.createElement("input");
      inp.type = "text";
      inp.inputMode = "numeric";
      inp.maxLength = 1;
      inp.autocomplete = i === 0 ? "one-time-code" : "off";
      inp.setAttribute("aria-label", "OTP " + (i + 1));
      container.appendChild(inp);
    }
    container.dataset.ready = "1";

    var inputs = container.querySelectorAll("input");
    inputs.forEach(function (inp, idx) {
      inp.addEventListener("input", function () {
        inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
        if (inp.value && idx < 5) inputs[idx + 1].focus();
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !inp.value && idx > 0) {
          inputs[idx - 1].focus();
        }
      });
      inp.addEventListener("paste", function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData("text") || "";
        var digits = text.replace(/\D/g, "").slice(0, 6).split("");
        digits.forEach(function (d, i) {
          if (inputs[i]) inputs[i].value = d;
        });
        if (inputs[Math.min(digits.length, 5)]) {
          inputs[Math.min(digits.length, 5)].focus();
        }
      });
    });
  }

  function readOtp(container) {
    if (!container) return "";
    return Array.prototype.map
      .call(container.querySelectorAll("input"), function (i) {
        return i.value;
      })
      .join("");
  }

  function startTimer(channel, seconds) {
    state.timers[channel] = seconds;
    var btn = document.getElementById(channel === "phone" ? "resendPhone" : "resendEmail");
    var timerEl = document.getElementById(channel === "phone" ? "phoneTimer" : "emailTimer");
    if (btn) btn.disabled = true;

    function tick() {
      if (state.timers[channel] <= 0) {
        if (btn) {
          btn.disabled = false;
          if (timerEl) timerEl.textContent = "";
        }
        return;
      }
      if (timerEl) timerEl.textContent = "(" + state.timers[channel] + "s)";
      state.timers[channel] -= 1;
      setTimeout(tick, 1000);
    }
    tick();
  }

  function sendOtp(channel) {
    var destination =
      channel === "phone" ? normalizePhone(val("f_phone")) : val("f_email").toLowerCase();
    return fetch(otpUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ action: "send", channel: channel, destination: destination }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data.ok) {
            throw new Error((data && data.error) || "OTP göndərilmədi");
          }
          return data;
        });
      })
      .then(function (data) {
        startTimer(channel, data.retry_after || 60);
        if (data.dev_code) {
          console.info("[Buykon OTP " + channel + "]", data.dev_code);
        }
        return data;
      });
  }

  function verifyOtp(channel) {
    var container = document.getElementById(channel === "phone" ? "otpPhone" : "otpEmail");
    var code = readOtp(container);
    if (!/^\d{6}$/.test(code)) {
      return Promise.reject(new Error("6 rəqəmli kodu daxil edin."));
    }
    var destination =
      channel === "phone" ? normalizePhone(val("f_phone")) : val("f_email").toLowerCase();
    return fetch(otpUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        action: "verify",
        channel: channel,
        destination: destination,
        code: code,
      }),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data.ok) {
          throw new Error((data && data.error) || "Kod səhvdir");
        }
        return data;
      });
    });
  }

  function bindFile(inputId, previewId, key) {
    var input = document.getElementById(inputId);
    var prev = document.getElementById(previewId);
    if (!input || !prev) return;
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showAlert("Fayl 5 MB-dan böyük ola bilməz.");
        input.value = "";
        return;
      }
      state.files[key] = file;
      var url = URL.createObjectURL(file);
      prev.style.backgroundImage = "url(" + url + ")";
      prev.classList.add("has-file");
    });
  }

  function validateStep(step) {
    if (step === 1) {
      if (!state.account) return "Hesab növünü seçin.";
      return "";
    }
    if (step === 2) {
      if (val("f_honeypot")) return "Şübhəli fəaliyyət aşkarlandı.";
      if (!document.getElementById("f_captcha").checked) {
        return "CAPTCHA təsdiqini tamamlayın.";
      }
      var required = ["f_name", "f_surname", "f_patronymic", "f_birth", "f_phone", "f_email", "f_pass", "f_pass2"];
      for (var i = 0; i < required.length; i++) {
        if (!val(required[i])) return "Bütün məcburi sahələri doldurun.";
      }
      var phone = normalizePhone(val("f_phone"));
      if (!/^\+994\d{9}$/.test(phone)) return "Telefon +994XXXXXXXXX formatında olmalıdır.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("f_email"))) return "E-poçt düzgün deyil.";
      if (val("f_pass").length < 8) return "Şifrə ən azı 8 simvol olmalıdır.";
      if (val("f_pass") !== val("f_pass2")) return "Şifrələr uyğun gəlmir.";
      var birth = new Date(val("f_birth"));
      var age = (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (!(age >= 18)) return "Satıcı olmaq üçün 18 yaşdan yuxarı olmalısınız.";
      return "";
    }
    if (step === 3) {
      var c3 = readOtp(document.getElementById("otpPhone"));
      if (!/^\d{6}$/.test(c3)) return "6 rəqəmli telefon kodunu daxil edin.";
      return "";
    }
    if (step === 4) {
      var c4 = readOtp(document.getElementById("otpEmail"));
      if (!/^\d{6}$/.test(c4)) return "6 rəqəmli e-poçt kodunu daxil edin.";
      return "";
    }
    if (step === 5) {
      if (!state.files.kycFront || !state.files.kycBack || !state.files.kycSelfie) {
        return "Ön, arxa və selfie şəkillərini yükləyin.";
      }
      return "";
    }
    if (step === 6) {
      if (state.account === "ferdi") {
        if (!/^\d{10}$/.test(val("f_voen"))) return "VÖEN 10 rəqəm olmalıdır.";
      }
      if (state.account === "mmc") {
        if (!val("f_company")) return "Şirkət adını daxil edin.";
        if (!/^\d{10}$/.test(val("f_voen_mmc"))) return "VÖEN 10 rəqəm olmalıdır.";
        if (!val("f_company_email")) return "Şirkət e-poçtunu daxil edin.";
        if (!val("f_company_phone")) return "Şirkət telefonunu daxil edin.";
      }
      return "";
    }
    if (step === 7) {
      if (!val("f_store") || !val("f_about") || !val("f_city") || !val("f_hours") || !val("f_address")) {
        return "Mağaza məlumatlarını tamamlayın.";
      }
      if (!state.files.logo || !state.files.banner) return "Logo və banner yükləyin.";
      return "";
    }
    if (step === 8) {
      var cb = document.getElementById("f_contract");
      if (!state.contractRead) return "Müqaviləni sonuna qədər oxuyun.";
      if (!cb || !cb.checked) return "Müqaviləni qəbul edin.";
      return "";
    }
    return "";
  }

  function goNext() {
    var err = validateStep(state.step);
    if (err) {
      showAlert(err);
      return;
    }

    if (state.step === 2) {
      nextBtn.disabled = true;
      nextBtn.textContent = "Kod göndərilir...";
      sendOtp("phone")
        .then(function (data) {
          document.getElementById("otpPhoneMask").textContent = maskPhone(val("f_phone"));
          buildOtpInputs(document.getElementById("otpPhone"));
          state.step = 3;
          updateChrome();
          if (data && data.dev_code) {
            showAlert("Test rejimi — telefon kodu: " + data.dev_code);
          }
        })
        .catch(function (e) {
          showAlert(e.message || "OTP göndərilmədi");
          nextBtn.disabled = false;
          nextBtn.textContent = "Davam et";
        });
      return;
    }

    if (state.step === 3) {
      nextBtn.disabled = true;
      verifyOtp("phone")
        .then(function () {
          state.phoneVerified = true;
          return sendOtp("email");
        })
        .then(function (data) {
          document.getElementById("otpEmailMask").textContent = maskEmail(val("f_email"));
          buildOtpInputs(document.getElementById("otpEmail"));
          state.step = 4;
          updateChrome();
          if (data && data.dev_code) {
            showAlert("Test rejimi — e-poçt kodu: " + data.dev_code);
          }
        })
        .catch(function (e) {
          showAlert(e.message || "Təsdiq alınmadı");
          nextBtn.disabled = false;
          nextBtn.textContent = "Davam et";
        });
      return;
    }

    if (state.step === 4) {
      nextBtn.disabled = true;
      verifyOtp("email")
        .then(function () {
          state.emailVerified = true;
          state.step = 5;
          updateChrome();
        })
        .catch(function (e) {
          showAlert(e.message || "Kod səhvdir");
          nextBtn.disabled = false;
          nextBtn.textContent = "Davam et";
        });
      return;
    }

    if (state.step === 9) {
      submitApplication();
      return;
    }

    state.step += 1;
    updateChrome();
  }

  function goBack() {
    if (state.step <= 1 || state.step >= 10) return;
    state.step -= 1;
    updateChrome();
  }

  function mapStoreType() {
    if (state.account === "fiziki") return "voensiz";
    return "voenli";
  }

  function submitApplication() {
    nextBtn.disabled = true;
    nextBtn.textContent = "Göndərilir...";

    var fd = new FormData();
    fd.append("account_type", state.account);
    fd.append("store_type", mapStoreType());
    fd.append("name", val("f_name"));
    fd.append("surname", val("f_surname"));
    fd.append("patronymic", val("f_patronymic"));
    fd.append("birth_date", val("f_birth"));
    fd.append("phone", normalizePhone(val("f_phone")));
    fd.append("email", val("f_email").toLowerCase());
    fd.append("password", val("f_pass"));
    fd.append("password_confirm", val("f_pass2"));
    fd.append("store_name", val("f_store"));
    fd.append("about", val("f_about"));
    fd.append("city", val("f_city"));
    fd.append("hours", val("f_hours"));
    fd.append("address", val("f_address"));
    fd.append("contract_accepted", "1");
    fd.append("bank_placeholder", state.bankClicked ? "1" : "0");
    fd.append("phone_verified", state.phoneVerified ? "1" : "0");
    fd.append("email_verified", state.emailVerified ? "1" : "0");

    if (state.account === "ferdi") fd.append("voen", val("f_voen"));
    if (state.account === "mmc") {
      fd.append("voen", val("f_voen_mmc"));
      fd.append("company_name", val("f_company"));
      fd.append("company_email", val("f_company_email"));
      fd.append("company_phone", val("f_company_phone"));
    }

    ["kycFront", "kycBack", "kycSelfie", "logo", "banner"].forEach(function (k) {
      if (state.files[k]) fd.append(k, state.files[k]);
    });

    var apiPayload = {
      email: val("f_email").toLowerCase(),
      password: val("f_pass"),
      password_confirm: val("f_pass2"),
      phone: normalizePhone(val("f_phone")),
      store_name: val("f_store"),
      owner_name: val("f_name"),
      owner_surname: val("f_surname"),
      category: "Digər",
      store_type: mapStoreType(),
      voen: state.account === "ferdi" ? val("f_voen") : state.account === "mmc" ? val("f_voen_mmc") : "",
      account_type: state.account,
      about: val("f_about"),
      city: val("f_city"),
      address: val("f_address"),
      hours: val("f_hours"),
      company_name: val("f_company"),
      company_email: val("f_company_email"),
      company_phone: val("f_company_phone"),
      patronymic: val("f_patronymic"),
      birth_date: val("f_birth"),
    };

    var localSave = fetch(onboardUrl(), {
      method: "POST",
      credentials: "same-origin",
      body: fd,
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data.ok) {
          throw new Error((data && data.error) || "Müraciət saxlanılmadı");
        }
        return data;
      });
    });

    var remote =
      window.BuykonSellerAPI && typeof window.BuykonSellerAPI.register === "function"
        ? window.BuykonSellerAPI.register(apiPayload).catch(function () {
            return null;
          })
        : Promise.resolve(null);

    Promise.all([localSave, remote])
      .then(function () {
        state.step = 10;
        updateChrome();
      })
      .catch(function (e) {
        showAlert(e.message || "Göndərmə alınmadı");
        nextBtn.disabled = false;
        nextBtn.textContent = "Müraciəti göndər";
      });
  }

  function bindContract() {
    var box = document.getElementById("swContract");
    var cb = document.getElementById("f_contract");
    if (!box || !cb) return;

    function checkScroll() {
      var atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 12;
      if (atEnd) {
        state.contractRead = true;
        cb.disabled = false;
      }
    }

    box.addEventListener("scroll", checkScroll, { passive: true });
    // Qısa məzmun / böyük ekran
    setTimeout(checkScroll, 200);
  }

  function init() {
    buildStepList();
    buildOtpInputs(document.getElementById("otpPhone"));
    buildOtpInputs(document.getElementById("otpEmail"));
    bindContract();

    document.querySelectorAll(".sw-type").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.account = btn.getAttribute("data-account") || "";
        document.querySelectorAll(".sw-type").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        showAlert("");
      });
    });

    bindFile("kycFront", "kycFrontPrev", "kycFront");
    bindFile("kycBack", "kycBackPrev", "kycBack");
    bindFile("kycSelfie", "kycSelfiePrev", "kycSelfie");
    bindFile("storeLogo", "logoPrev", "logo");
    bindFile("storeBanner", "bannerPrev", "banner");

    var bankBtn = document.getElementById("bankLinkBtn");
    if (bankBtn) {
      bankBtn.addEventListener("click", function () {
        state.bankClicked = true;
        bankBtn.classList.add("is-linked");
        bankBtn.textContent = "Əlaqələndirmə gözlənilir";
        var hint = document.getElementById("bankHint");
        if (hint) {
          hint.textContent =
            "Xarici ödəniş inteqrasiyası tezliklə aktiv olacaq. Kart/IBAN Buykon-da saxlanılmır.";
        }
      });
    }

    document.getElementById("resendPhone").addEventListener("click", function () {
      sendOtp("phone").catch(function (e) {
        showAlert(e.message);
      });
    });
    document.getElementById("resendEmail").addEventListener("click", function () {
      sendOtp("email").catch(function (e) {
        showAlert(e.message);
      });
    });

    nextBtn.addEventListener("click", goNext);
    backBtn.addEventListener("click", goBack);

    updateChrome();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
