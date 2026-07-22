document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");

  if (!form) {
    console.error("loginForm tapılmadı!");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault(); // ÇOX VACİBDİR

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    // sadə loading
    alert("Yoxlanılır...");

    setTimeout(() => {
      const random = Math.random();

      if (random < 0.4) {
        alert("Server xətası!");
        return;
      }

      if (random < 0.8) {
        alert("Email və ya şifrə yanlışdır!");
        return;
      }

      alert("Uğurla daxil oldunuz!");
      window.location.href = "/";
    }, 1500);
  });
});