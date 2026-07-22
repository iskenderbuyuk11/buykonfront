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

  function getRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    var body = document.body;
    var attr = body && body.getAttribute("data-root");
    if (attr != null) return attr;
    // pages/verify/ → ../../
    return "../../";
  }

  function kycSessionUrl() {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveKycSessionUrl === "function") {
      return cfg.resolveKycSessionUrl();
    }
    return getRoot() + "api/kyc-session.php";
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
      startBtn.disabled = !consent || !consent.checked || locked;
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
    if (!window.BizdevarAuthGuard || !window.BizdevarAuthGuard.requireAuth) {
      return Promise.resolve();
    }
    return window.BizdevarAuthGuard.requireAuth();
  }

  function vendorDataFromSession() {
    try {
      var s = window.BizdevarAPI && BizdevarAPI.session;
      if (s && s.user && (s.user.id || s.user.email)) {
        return String(s.user.id || s.user.email);
      }
    } catch (e) {}
    return "";
  }

  function createDiditSession() {
    var host = (location.hostname || "").toLowerCase();
    var isLocal = host === "localhost" || host === "127.0.0.1";

    function fromPhp() {
      return fetch(kycSessionUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_data: vendorDataFromSession() }),
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || !data.ok) {
            var err = new Error((data && data.error) || "Sessiya açılmadı");
            err.code = data && data.error;
            err.status = res.status;
            throw err;
          }
          return data;
        });
      });
    }

    // Lokal XAMPP → PHP .env proxy; production → Java API
    if (!isLocal && window.BizdevarAPI && typeof BizdevarAPI.kycCreateSession === "function") {
      return BizdevarAPI.kycCreateSession()
        .then(function (session) {
          if (!session || !session.url) throw new Error("Sessiya URL-i alınmadı");
          return { ok: true, url: session.url, session_id: session.session_id };
        })
        .catch(function () {
          return fromPhp();
        });
    }
    return fromPhp();
  }

  function loadStatus() {
    if (!window.BizdevarAPI || !BizdevarAPI.kycStatus) {
      renderStatus({ status: "not_started" });
      return Promise.resolve();
    }
    return BizdevarAPI.kycStatus()
      .then(function (data) {
        renderStatus(data && data.kyc);
      })
      .catch(function (err) {
        if (err && err.status === 401) {
          setError("Giriş tələb olunur.");
        }
        // Lokal Didit proxy ilə işləyə bilərik — status API olmasa belə
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
      startBtn.innerHTML =
        '<i class="fa-solid fa-circle-notch fa-spin"></i> Hazırlanır...';

      createDiditSession()
        .then(function (session) {
          if (!session || !session.url) throw new Error("Sessiya URL-i alınmadı");
          window.location.href = session.url;
        })
        .catch(function (err) {
          var code = (err && err.code) || "";
          var msg = (err && err.message) || "Təsdiq sessiyası başladılmadı";
          if (code === "NO_DIDIT_KEY" || msg === "NO_DIDIT_KEY") {
            msg =
              "DIDIT_API_KEY .env faylında yoxdur və ya səhvdir.";
          } else if (
            msg.indexOf("Failed to fetch") !== -1 ||
            msg.indexOf("NetworkError") !== -1
          ) {
            msg =
              "KYC serverə çatılmadı. XAMPP Apache işləyirmi və api/kyc-session.php mövcuddurmu?";
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
