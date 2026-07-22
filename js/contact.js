(function () {
  "use strict";

  var form = document.getElementById("elaqe-formasi");
  var status = document.getElementById("contact-status");

  if (!form || !status) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    status.textContent = "Müraciətiniz qeydə alındı. Komandamız sizinlə əlaqə saxlayacaq.";
    form.reset();
  });
})();
