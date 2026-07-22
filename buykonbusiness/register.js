(function () {
  "use strict";

  var storeType = "";
  var stepType = document.getElementById("stepType");
  var stepForm = document.getElementById("stepForm");
  var stepSuccess = document.getElementById("stepSuccess");
  var typeLabel = document.getElementById("typeLabel");
  var voenField = document.getElementById("voenField");
  var voenInput = document.getElementById("voen");
  var formError = document.getElementById("formError");
  var regForm = document.getElementById("regForm");

  document.querySelectorAll(".type-card").forEach(function (btn) {
    btn.addEventListener("click", function () {
      storeType = btn.getAttribute("data-type");
      document.querySelectorAll(".type-card").forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      typeLabel.textContent = storeType === "voenli" ? "VOEN-li qeydiyyat" : "VOEN-siz qeydiyyat";
      voenField.hidden = storeType !== "voenli";
      voenInput.required = storeType === "voenli";
      stepType.hidden = true;
      stepForm.hidden = false;
    });
  });

  document.getElementById("backBtn").addEventListener("click", function () {
    stepForm.hidden = true;
    stepType.hidden = false;
    formError.hidden = true;
  });

  regForm.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.hidden = true;
    var pass = document.getElementById("password").value;
    var pass2 = document.getElementById("password2").value;
    if (pass !== pass2) {
      formError.textContent = "Şifrələr uyğun gəlmir.";
      formError.hidden = false;
      return;
    }
    if (!storeType) {
      formError.textContent = "Satıcı növünü seçin.";
      formError.hidden = false;
      return;
    }
    var submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Göndərilir...';

    BuykonSellerAPI.register({
      email: document.getElementById("email").value.trim(),
      password: pass,
      password_confirm: pass2,
      phone: document.getElementById("phone").value.trim(),
      store_name: document.getElementById("storeName").value.trim(),
      owner_name: document.getElementById("ownerName").value.trim(),
      owner_surname: document.getElementById("ownerSurname").value.trim(),
      category: document.getElementById("category").value,
      store_type: storeType,
      voen: storeType === "voenli" ? document.getElementById("voen").value.trim() : "",
    })
      .then(function (res) {
        stepForm.hidden = true;
        stepSuccess.hidden = false;
        var loginBtn = document.getElementById("goLoginBtn");
        loginBtn.href = "/sellerpanel/login.html";
      })
      .catch(function (err) {
        formError.textContent = err.message || "Qeydiyyat alınmadı";
        formError.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Qeydiyyatı tamamla';
      });
  });
})();
