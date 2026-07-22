(function () {
  "use strict";

  var consent = document.getElementById("kycConsent");
  var startBtn = document.getElementById("kycStartBtn");
  var errEl = document.getElementById("kycError");
  var badge = document.getElementById("kycStatusBadge");
  var badgeText = document.getElementById("kycStatusText");
  var badgeIcon = document.getElementById("kycStatusIcon");

  function setError(msg) {
    if (errEl) errEl.textContent = msg || "";
  }

  function statusClass(status) {
    if (status === "approved") return "kyc-status--approved";
    if (status === "declined" || status === "kyc_expired") return "kyc-status--declined";
    if (
      status === "pending_review" ||
      status === "in_progress" ||
      status === "awaiting_user" ||
      status === "resubmitted"
    ) {
      return "kyc-status--pending";
    }
    return "kyc-status--default";
  }

  function statusLabel(status) {
    var map = {
      approved: "Təsdiqlənib",
      declined: "Rədd edilib",
      pending_review: "Yoxlanılır",
      in_progress: "Davam edir",
      awaiting_user: "Sizdən addım gözlənilir",
      resubmitted: "Yenidən göndərilib",
      abandoned: "Yarımçıq qalıb",
      expired: "Vaxtı bitib",
      kyc_expired: "KYC vaxtı bitib",
      not_started: "Başlanmayıb",
    };
    return map[status] || status || "Naməlum";
  }

  function renderStatus(kyc) {
    if (!badge || !badgeText) return;
    var status = (kyc && kyc.status) || "not_started";
    badge.hidden = false;
    badge.className = "kyc-status " + statusClass(status);
    badgeText.textContent = statusLabel(status);
    if (badgeIcon) {
      if (status === "approved") badgeIcon.className = "fa-solid fa-circle-check";
      else if (status === "declined") badgeIcon.className = "fa-solid fa-circle-xmark";
      else if (status === "not_started") badgeIcon.className = "fa-solid fa-id-card";
      else badgeIcon.className = "fa-solid fa-clock";
    }
    if (startBtn) {
      var locked = status === "approved" || status === "pending_review";
      startBtn.disabled = !consent.checked || locked;
      if (status === "approved") {
        startBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Artıq təsdiqlənib';
      } else if (status === "pending_review") {
        startBtn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> Yoxlanılır';
      } else {
        startBtn.innerHTML = '<i class="fa-solid fa-id-card"></i> Təsdiqləməyə başla';
      }
    }
  }

  function guardLogin() {
    if (!window.BizdevarAuthGuard || !window.BizdevarAuthGuard.requireAuth) return Promise.resolve();
    return window.BizdevarAuthGuard.requireAuth();
  }

  function loadStatus() {
    if (!window.BizdevarAPI || !BizdevarAPI.kycStatus) return Promise.resolve();
    return BizdevarAPI.kycStatus()
      .then(function (data) {
        renderStatus(data && data.kyc);
      })
      .catch(function (err) {
        if (err && err.status === 404) {
          setError("KYC API tapılmadı — backend yenilənməyib.");
        } else if (err && err.status === 401) {
          setError("Giriş tələb olunur.");
        }
        renderStatus({ status: "not_started" });
      });
  }

  if (consent && startBtn) {
    consent.addEventListener("change", function () {
      if (startBtn) startBtn.disabled = !consent.checked;
      loadStatus();
    });
  }

  if (startBtn) {
    startBtn.addEventListener("click", function () {
      if (!consent || !consent.checked) {
        setError("Davam etmək üçün razılığı təsdiqləyin.");
        return;
      }
      setError("");
      startBtn.disabled = true;
      startBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Hazırlanır...';

      BizdevarAPI.kycCreateSession()
        .then(function (session) {
          if (!session || !session.url) throw new Error("Sessiya URL-i alınmadı");
          window.location.href = session.url;
        })
        .catch(function (err) {
          var msg = (err && err.message) || "Təsdiq sessiyası başladılmadı";
          if (err && err.status === 401) {
            msg = "Giriş tələb olunur — əvvəlcə hesabınıza daxil olun.";
          } else if (err && err.status === 404) {
            msg = "KYC API tapılmadı — backend deploy edilməyib.";
          } else if (err && err.status === 500) {
            msg = "Server xətası — DIDIT_API_KEY serverdə düzgün deyil.";
          }
          setError(msg);
        })
        .finally(function () {
          loadStatus();
        });
    });
  }

  guardLogin().then(loadStatus);
})();
