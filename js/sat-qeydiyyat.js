(function () {
  "use strict";

  var API =
    (window.BizdevarSiteConfig && window.BizdevarSiteConfig.resolveApiBase()) ||
    (document.querySelector('meta[name="bizdevar-api"]') &&
      document.querySelector('meta[name="bizdevar-api"]').getAttribute("content")) ||
    "http://localhost:8080/api";
  API = String(API).replace(/\/+$/, "");

  var state = { type: "" };

  var TYPE_LABELS = { voenli: "VÖEN-li satıcı", voensiz: "VÖEN-siz satıcı" };

  var views = {
    choice: document.getElementById("choiceView"),
    otp: document.getElementById("otpView"),
    details: document.getElementById("detailsView"),
    loading: document.getElementById("loadingView"),
    success: document.getElementById("successView"),
  };

  var progressFill = document.getElementById("progressFill");
  var wizardTitle = document.getElementById("wizardTitle");
  var wizardDesc = document.getElementById("wizardDesc");
  var detailsForm = document.getElementById("detailsForm");

  function showView(name) {
    Object.keys(views).forEach(function (k) {
      if (views[k]) views[k].classList.toggle("is-active", k === name);
    });
    var progress = { choice: 15, details: 55, loading: 85, success: 100 }[name] || 0;
    if (progressFill) progressFill.style.width = progress + "%";
    var titles = {
      choice: ["Qeydiyyat növünü seçin", "Anbar və ya online satış modelini seçin."],
      details: ["Hesab və mağaza məlumatları", "OTP yoxdur — birbaşa backend-ə göndərilir."],
      loading: ["Qeydiyyat göndərilir", "Zəhmət olmasa gözləyin..."],
      success: ["Qeydiyyat tamamlandı", "Admin yoxlamasından sonra panel açılacaq."],
    };
    if (wizardTitle && titles[name]) wizardTitle.textContent = titles[name][0];
    if (wizardDesc && titles[name]) wizardDesc.textContent = titles[name][1];
  }

  function renderForm() {
    detailsForm.innerHTML =
      '<div class="form-grid">' +
      '<div class="field"><label>Email *</label><input type="email" id="regEmail" required placeholder="satıcı@example.com"></div>' +
      '<div class="field"><label>Şifrə *</label><input type="password" id="regPass" required minlength="6"></div>' +
      '<div class="field"><label>Şifrə təkrar *</label><input type="password" id="regPass2" required></div>' +
      '<div class="field"><label>Telefon</label><input type="tel" id="regPhone" placeholder="+994 50 000 00 00"></div>' +
      '<div class="field field--full"><label>Mağaza adı <small>(boş buraxsanız avtomatik verilir)</small></label><input type="text" id="regStore" placeholder="Məs: TechShop"></div>' +
      '<div class="field"><label>Sahib adı</label><input type="text" id="regOwnerName" placeholder="Ad"></div>' +
      '<div class="field"><label>Sahib soyadı</label><input type="text" id="regOwnerSurname" placeholder="Soyad"></div>' +
      (state.type === "voenli"
        ? '<div class="field"><label>VÖEN *</label><input type="text" id="regVoen" inputmode="numeric" required></div>' +
          '<div class="field"><label>Kateqoriya</label><select id="regCategory"><option>Elektronika</option><option>Geyim</option><option>Market</option><option>Digər</option></select></div>'
        : '<div class="field field--full"><label>Kateqoriya</label><select id="regCategory"><option>Elektronika</option><option>Geyim</option><option>Online satış</option><option>Digər</option></select></div>') +
      "</div>";
  }

  function submitRegistration() {
    var email = document.getElementById("regEmail").value.trim();
    var pass = document.getElementById("regPass").value;
    var pass2 = document.getElementById("regPass2").value;
    if (pass !== pass2) {
      alert("Şifrələr uyğun gəlmir");
      return;
    }
    showView("loading");
    fetch(API.replace(/\/+$/, "") + "/auth/seller-register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: email,
        password: pass,
        password_confirm: pass2,
        phone: document.getElementById("regPhone").value.trim(),
        store_name: document.getElementById("regStore").value.trim(),
        owner_name: document.getElementById("regOwnerName").value.trim(),
        owner_surname: document.getElementById("regOwnerSurname").value.trim(),
        category: document.getElementById("regCategory").value,
        store_type: state.type || "voensiz",
        voen: state.type === "voenli" ? document.getElementById("regVoen").value.trim() : "",
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.error || "Qeydiyyat alınmadı");
          return d;
        });
      })
      .then(function () {
        showView("success");
        var resultNo = document.getElementById("resultNo");
        if (resultNo) resultNo.textContent = "BK-SELLER";
        var now = new Date();
        var rd = document.getElementById("resultDate");
        var rt = document.getElementById("resultTime");
        if (rd) rd.textContent = now.toLocaleDateString("az-AZ");
        if (rt) rt.textContent = now.toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" });
        setTimeout(function () {
          window.location.href = "../../sellerpanel/login.html";
        }, 2500);
      })
      .catch(function (err) {
        alert(err.message || "Xəta");
        showView("details");
      });
  }

  document.querySelectorAll(".choice-card").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.type = btn.getAttribute("data-type");
      renderForm();
      showView("details");
    });
  });

  var backBtn = document.getElementById("backToOtp") || document.getElementById("backToChoice");
  if (backBtn) {
    backBtn.addEventListener("click", function () {
      showView("choice");
    });
  }

  var submitBtn = document.getElementById("submitDetails");
  if (submitBtn) {
    submitBtn.addEventListener("click", submitRegistration);
  }

  if (views.otp) views.otp.style.display = "none";

  var intro = document.querySelector(".intro p");
  if (intro) {
    intro.textContent =
      "Buykon-da satıcı ol — VÖEN-li və ya VÖEN-siz qeydiyyat. Admin təsdiqindən sonra panel açılır.";
  }
  document.querySelectorAll(".trust-list .trust-item").forEach(function (el, i) {
    if (i === 0) el.innerHTML = '<i class="fa-solid fa-store"></i> Mağaza adı vitrində görünür';
    if (i === 1) el.innerHTML = '<i class="fa-solid fa-user-shield"></i> Admin təsdiqi ilə mağaza aktiv olur';
    if (i === 2) el.innerHTML = '<i class="fa-solid fa-box"></i> Məhsullar moderasiyadan keçir';
  });

  showView("choice");
})();
