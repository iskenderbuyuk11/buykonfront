(function () {
  var STORAGE_KEY = "bizdevar-profile";
  var BAKU = [40.4093, 49.8672];

  var defaultData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addresses: [],
    notifPrefs: { emailNotif: true, smsNotif: true, whatsappNotif: false },
    paymentCards: [],
  };

  var emptyHtml =
    '<div class="profil-empty"><i class="fa-solid fa-inbox"></i><span>Məlumat yoxdur</span></div>';

  var faqItems = [
    { q: "Sifarişimi necə izləyə bilərəm?", a: "Profil → Sifarişlərim bölməsindən bütün sifarişlərin statusunu görə bilərsiniz." },
    { q: "Ödəniş kartımı necə əlavə edim?", a: "Hesabım → Ödəniş bölməsində «Yeni kart əlavə et» düyməsinə basın." },
    { q: "Çatdırılma ünvanını dəyişə bilərəmmi?", a: "Bəli, Ünvanım bölməsində xəritədən yeni ünvan seçib saxlaya bilərsiniz." },
    { q: "Promokod harada istifadə olunur?", a: "Səbət səhifəsində ödənişdən əvvəl promokod sahəsinə daxil edin." },
  ];

  var panelTitles = {
    unvan: "Ünvanım",
    sifarisler: "Sifarişlər",
    bildirisler: "Bildirişlər",
    reyler: "Rəylər",
    promokod: "Promokodlarım",
    devet: "Dostunu dəvət et",
    magazalar: "Mağazalar",
    kuponlar: "Kuponlarım",
    melumat: "Məlumatlarım",
    odenis: "Ödəniş",
    tehlukesizlik: "Təhlükəsizlik",
    "bildiris-tercih": "Bildiriş tənzimləri",
    faq: "FAQ",
    asistant: "Asistant Var",
  };

  var map;
  var marker;
  var state = loadState();

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign({}, defaultData, JSON.parse(raw));
    } catch (e) {}
    return Object.assign({}, defaultData);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function showToast(msg) {
    var el = document.getElementById("profil-toast");
    if (!el) return;
    el.textContent = msg;
    el.removeAttribute("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      el.setAttribute("hidden", "");
    }, 2800);
  }

  function getInitial() {
    var a = (state.firstName || "").charAt(0);
    var b = (state.lastName || "").charAt(0);
    return (a + b).toUpperCase() || "?";
  }

  function syncHead() {
    var av = document.getElementById("profil-avatar");
    var em = document.getElementById("profil-head-email");
    var nm = document.getElementById("profil-head-name");
    var fullName = ((state.firstName || "") + " " + (state.lastName || "")).trim();
    if (av) av.textContent = getInitial();
    if (em) em.textContent = state.email || "—";
    if (nm) nm.textContent = fullName || "Hesabım";
    var code = document.getElementById("profil-invite-code");
    if (code) {
      var slug = (state.firstName || "user").replace(/\s+/g, "").toUpperCase().slice(0, 6);
      code.value = "BIZDEVAR-" + slug;
    }
  }

  function syncUserForm() {
    var fn = document.getElementById("profil-first-name");
    var ln = document.getElementById("profil-last-name");
    var em = document.getElementById("profil-email");
    var ph = document.getElementById("profil-phone");
    if (fn) fn.value = state.firstName || "";
    if (ln) ln.value = state.lastName || "";
    if (em) em.value = state.email || "";
    if (ph) ph.value = state.phone || "";
  }

  function syncNotifPrefs() {
    var root = document.getElementById("profil-notif-prefs");
    if (!root || !state.notifPrefs) return;
    ["emailNotif", "smsNotif", "whatsappNotif"].forEach(function (key) {
      var input = root.querySelector('[name="' + key + '"]');
      if (input) input.checked = !!state.notifPrefs[key];
    });
  }

  function updateMobileTitle(id) {
    var title = document.getElementById("profil-mobile-title");
    if (title) title.textContent = panelTitles[id] || "Hesabım";
  }

  function setMobileMenuOpen(open) {
    var nav = document.getElementById("profil-nav");
    var backdrop = document.getElementById("profil-nav-backdrop");
    var openBtn = document.getElementById("profil-menu-open");
    var closeBtn = document.getElementById("profil-menu-close");
    if (!nav) return;

    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("profil-menu-open", open);

    if (backdrop) {
      if (open) backdrop.removeAttribute("hidden");
      else backdrop.setAttribute("hidden", "");
      backdrop.classList.toggle("is-visible", open);
      backdrop.setAttribute("aria-hidden", open ? "false" : "true");
    }

    if (openBtn) {
      openBtn.hidden = open;
      openBtn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (closeBtn) closeBtn.hidden = !open;
  }

  function showPanel(id) {
    document.querySelectorAll(".profil-panel").forEach(function (p) {
      var match = p.getAttribute("data-panel-id") === id;
      if (match) {
        p.classList.add("is-active");
        p.removeAttribute("hidden");
      } else {
        p.classList.remove("is-active");
        p.setAttribute("hidden", "");
      }
    });
    document.querySelectorAll(".profil-nav__item[data-panel]").forEach(function (btn) {
      var active = btn.getAttribute("data-panel") === id;
      btn.classList.toggle("is-active", active);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    updateMobileTitle(id);
    setMobileMenuOpen(false);
    if (id === "unvan" && map) {
      setTimeout(function () {
        map.invalidateSize();
      }, 120);
    }
  }

  function initMobileNav() {
    var openBtn = document.getElementById("profil-menu-open");
    var closeBtn = document.getElementById("profil-menu-close");
    var backdrop = document.getElementById("profil-nav-backdrop");

    if (openBtn) {
      openBtn.addEventListener("click", function () {
        setMobileMenuOpen(true);
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        setMobileMenuOpen(false);
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setMobileMenuOpen(false);
      });
    }
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) setMobileMenuOpen(false);
    });
  }

  function initNav() {
    document.querySelectorAll(".profil-nav__item[data-panel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showPanel(btn.getAttribute("data-panel"));
      });
    });
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash) showPanel(hash);
    else updateMobileTitle("unvan");
  }

  function renderAddresses() {
    var list = document.getElementById("profil-address-list");
    if (!list) return;
    if (!state.addresses || !state.addresses.length) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = state.addresses
      .map(function (a, i) {
        return (
          '<li class="profil-address-item">' +
          '<div><div class="profil-address-item__label">' +
          escapeHtml(a.label || "Ünvan") +
          "</div>" +
          '<p class="profil-address-item__text">' +
          escapeHtml(a.address) +
          "</p></div>" +
          '<button type="button" class="profil-address-item__del" data-del-addr="' +
          i +
          '">Sil</button></li>'
        );
      })
      .join("");
    list.querySelectorAll("[data-del-addr]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-del-addr"), 10);
        state.addresses.splice(idx, 1);
        saveState();
        renderAddresses();
        showToast("Ünvan silindi");
      });
    });
  }

  function initMap() {
    var el = document.getElementById("profil-map");
    if (!el || typeof L === "undefined") return;

    map = L.map("profil-map", { scrollWheelZoom: true }).setView(BAKU, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    marker = L.marker(BAKU, { draggable: true }).addTo(map);

    function setCoords(lat, lng) {
      document.getElementById("profil-lat").value = lat;
      document.getElementById("profil-lng").value = lng;
      reverseGeocode(lat, lng);
    }

    function onMapClick(e) {
      marker.setLatLng(e.latlng);
      setCoords(e.latlng.lat, e.latlng.lng);
    }

    map.on("click", onMapClick);
    marker.on("dragend", function () {
      var ll = marker.getLatLng();
      setCoords(ll.lat, ll.lng);
    });

    setCoords(BAKU[0], BAKU[1]);
  }

  function reverseGeocode(lat, lng) {
    var input = document.getElementById("profil-address-input");
    if (!input) return;
    fetch(
      "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
        lat +
        "&lon=" +
        lng +
        "&accept-language=az"
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.display_name) input.value = d.display_name;
      })
      .catch(function () {});
  }

  function initAddressForm() {
    var form = document.getElementById("form-unvan");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var entry = {
        label: (fd.get("label") || "Ünvan").toString().trim() || "Ünvan",
        address: (fd.get("address") || "").toString().trim(),
        lat: fd.get("lat"),
        lng: fd.get("lng"),
      };
      if (!entry.address) {
        showToast("Ünvan daxil edin");
        return;
      }
      if (!state.addresses) state.addresses = [];
      state.addresses.push(entry);
      saveState();
      renderAddresses();
      form.reset();
      if (marker) marker.setLatLng(BAKU);
      showToast("Ünvan saxlanıldı");
    });
  }

  function initUserForm() {
    var form = document.getElementById("form-melumat");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      state.firstName = document.getElementById("profil-first-name").value.trim();
      state.lastName = document.getElementById("profil-last-name").value.trim();
      state.email = document.getElementById("profil-email").value.trim();
      state.phone = document.getElementById("profil-phone").value.trim();

      function done() {
        saveState();
        syncHead();
        showToast("Məlumatlar yeniləndi");
        document.dispatchEvent(new CustomEvent("BizdevarProfileUpdated"));
      }

      if (typeof BizdevarAPI !== "undefined") {
        BizdevarAPI.profileUpdate({
          first_name: state.firstName,
          last_name: state.lastName,
          notif_prefs: state.notifPrefs || {},
        })
          .then(done)
          .catch(function () {
            done();
          });
        return;
      }
      done();
    });
  }

  function initPasswordForm() {
    var form = document.getElementById("form-password");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var np = fd.get("newPassword");
      var cp = fd.get("confirmPassword");
      if (np !== cp) {
        showToast("Yeni şifrələr uyğun gəlmir");
        return;
      }
      if ((np || "").toString().length < 8) {
        showToast("Şifrə ən azı 8 simvol olmalıdır");
        return;
      }
      form.reset();
      showToast("Şifrə uğurla yeniləndi");
    });
  }

  function initNotifPrefs() {
    var root = document.getElementById("profil-notif-prefs");
    if (!root) return;
    root.querySelectorAll("input[type=checkbox]").forEach(function (input) {
      input.addEventListener("change", function () {
        if (!state.notifPrefs) state.notifPrefs = {};
        state.notifPrefs[input.name] = input.checked;
        saveState();
        if (typeof BizdevarAPI !== "undefined") {
          BizdevarAPI.profileUpdate({
            first_name: state.firstName,
            last_name: state.lastName,
            notif_prefs: state.notifPrefs,
          }).catch(function () {});
        }
        showToast("Bildiriş tənzimləmələri saxlanıldı");
      });
    });
  }

  function renderList(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function orderRowHtml(o) {
    var title =
      (o.items && o.items[0] && o.items[0].name) ||
      o.productName ||
      o.seller ||
      "Sifariş";
    var status = o.status || "pending";
    var tone = window.BizdevarOrders ? BizdevarOrders.getStatusTone(status) : "wait";
    var label = window.BizdevarOrders ? BizdevarOrders.getStatusLabel(status) : status;
    var total = window.BizdevarOrders
      ? BizdevarOrders.formatMoney(o.total)
      : Number(o.total || 0).toLocaleString("az-AZ") + " ₼";
    return (
      '<article class="profil-list-item">' +
      '<div class="profil-list-item__head">' +
      '<h3 class="profil-list-item__title">' +
      escapeHtml(title) +
      "</h3>" +
      '<span class="profil-badge profil-badge--' +
      (tone === "ok" ? "ok" : tone === "bad" ? "info" : "wait") +
      '">' +
      escapeHtml(label) +
      "</span></div>" +
      '<p class="profil-list-item__meta">№ ' +
      escapeHtml(o.id || o.order_number || "—") +
      " · " +
      escapeHtml(o.date || o.createdAt || "—") +
      " · " +
      escapeHtml(total) +
      '</p><a class="profil-list-item__link" href="../sifarislerim/detail.html?id=' +
      encodeURIComponent(o.id || o.order_number || "") +
      '">Ətraflı bax</a></article>'
    );
  }

  function renderOrders() {
    function showOrders(orders) {
      if (!orders.length) {
        renderList("profil-orders-list", emptyHtml);
        return;
      }
      renderList(
        "profil-orders-list",
        orders.slice(0, 5).map(orderRowHtml).join("")
      );
    }

    if (typeof BizdevarAPI !== "undefined") {
      BizdevarAPI.ordersList()
        .then(function (res) {
          showOrders(res.orders || []);
        })
        .catch(function () {
          if (window.BizdevarOrders) {
            showOrders(BizdevarOrders.getAll());
          } else {
            renderList("profil-orders-list", emptyHtml);
          }
        });
      return;
    }

    if (window.BizdevarOrders) {
      showOrders(BizdevarOrders.getAll());
      return;
    }
    renderList("profil-orders-list", emptyHtml);
  }

  function renderNotifs() {
    renderList("profil-notif-list", emptyHtml);
  }

  function renderReviews() {
    renderList("profil-reviews-list", emptyHtml);
  }

  function renderCampaigns() {
    renderList("profil-promo-list", emptyHtml);
    renderList("profil-coupon-list", emptyHtml);
    renderList("profil-shops-list", emptyHtml);
  }

  function renderPaymentCards() {
    var root = document.getElementById("profil-payment-cards");
    if (!root) return;
    var cards = state.paymentCards || [];
    if (!cards.length) {
      root.innerHTML =
        '<div class="profil-empty"><i class="fa-solid fa-credit-card"></i><span>Saxlanılmış kart yoxdur</span></div>';
      return;
    }
    root.innerHTML = cards
      .map(function (c) {
        var cls = c.brand === "MASTER" ? "master" : "visa";
        return (
          '<div class="profil-pay-card profil-pay-card--' +
          cls +
          '">' +
          '<span class="profil-pay-card__brand">' +
          escapeHtml(c.brand) +
          "</span>" +
          '<span class="profil-pay-card__num">•••• •••• •••• ' +
          escapeHtml(c.last4) +
          "</span>" +
          '<div class="profil-pay-card__foot"><span>' +
          escapeHtml(c.holder) +
          "</span><span>" +
          escapeHtml(c.exp) +
          "</span></div></div>"
        );
      })
      .join("");
  }

  function initAddCard() {
    var btn = document.getElementById("profil-add-card");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!state.paymentCards) state.paymentCards = [];
      var n = state.paymentCards.length + 1;
      state.paymentCards.push({
        id: String(Date.now()),
        brand: n % 2 ? "VISA" : "MASTER",
        last4: String(1000 + Math.floor(Math.random() * 9000)),
        exp: "01/28",
        holder: ((state.firstName || "") + " " + (state.lastName || "")).trim().toUpperCase() || "KART SAHİBİ",
      });
      saveState();
      renderPaymentCards();
      showToast("Kart əlavə edildi");
    });
  }

  function initInviteCopy() {
    var btn = document.getElementById("profil-invite-copy");
    var input = document.getElementById("profil-invite-code");
    if (!btn || !input) return;
    btn.addEventListener("click", function () {
      input.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(function () {
          showToast("Dəvət kodu kopyalandı");
        });
      } else {
        showToast("Kod: " + input.value);
      }
    });
  }

  function renderFaq() {
    var root = document.getElementById("profil-faq-list");
    if (!root) return;
    root.innerHTML = faqItems
      .map(function (item, i) {
        return (
          '<div class="profil-faq__item" id="faq-' +
          i +
          '">' +
          '<button type="button" class="profil-faq__q" aria-expanded="false">' +
          escapeHtml(item.q) +
          '</button><p class="profil-faq__a">' +
          escapeHtml(item.a) +
          "</p></div>"
        );
      })
      .join("");
    root.querySelectorAll(".profil-faq__q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".profil-faq__item");
        var open = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  function initAssistant() {
    var form = document.getElementById("asistant-form");
    var input = document.getElementById("asistant-input");
    var chat = document.getElementById("asistant-chat");
    if (!form || !input || !chat) return;

    var replies = [
      "Sifariş statusunu «Sifarişlərim» bölməsindən izləyə bilərsiniz.",
      "Ödəniş kartları «Hesabım → Ödəniş» bölməsindədir.",
      "Çatdırılma ünvanı üçün xəritədən seçim edin.",
      "Promokodlar «Kampaniyalar» bölməsində görünür.",
    ];

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (!text) return;
      appendMsg(chat, text, "user");
      input.value = "";
      setTimeout(function () {
        var reply = replies[Math.floor(Math.random() * replies.length)];
        appendMsg(chat, reply, "bot");
        chat.scrollTop = chat.scrollHeight;
      }, 600);
      chat.scrollTop = chat.scrollHeight;
    });
  }

  function appendMsg(chat, text, type) {
    var div = document.createElement("div");
    div.className = "asistant-var__msg asistant-var__msg--" + (type === "user" ? "user" : "bot");
    div.textContent = text;
    chat.appendChild(div);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function applyProfile(p) {
    if (!p) return;
    if (p.first_name || p.firstName) state.firstName = p.first_name || p.firstName;
    if (p.last_name || p.lastName) state.lastName = p.last_name || p.lastName;
    if (p.email) state.email = p.email;
    if (p.phone) state.phone = p.phone;
    if (p.notif_prefs) state.notifPrefs = p.notif_prefs;
    if (Array.isArray(p.addresses)) state.addresses = p.addresses;
    saveState();
    syncHead();
    syncUserForm();
    syncNotifPrefs();
    renderAddresses();
  }

  function syncKycStatus(kyc) {
    var badge = document.getElementById("profil-kyc-badge");
    var desc = document.getElementById("profil-kyc-desc");
    var link = document.getElementById("profil-kyc-link");
    if (!badge) return;
    var status = (kyc && kyc.status) || "not_started";
    var labels = {
      approved: ["Təsdiqlənib", "#ecfdf5", "#047857", "fa-circle-check"],
      declined: ["Rədd edilib", "#fef2f2", "#b91c1c", "fa-circle-xmark"],
      pending_review: ["Yoxlanılır", "#fff7ed", "#c2410c", "fa-clock"],
      in_progress: ["Davam edir", "#fff7ed", "#c2410c", "fa-clock"],
      not_started: ["Başlanmayıb", "#f1f5f9", "#475569", "fa-id-card"],
    };
    var item = labels[status] || labels.not_started;
    badge.style.background = item[1];
    badge.style.color = item[2];
    badge.innerHTML = '<i class="fa-solid ' + item[3] + '"></i> ' + item[0];
    if (desc && status === "approved") {
      desc.textContent = "Şəxsiyyət təsdiqiniz uğurla tamamlanıb.";
    }
    if (link && status === "approved") {
      link.textContent = "Təsdiq məlumatları";
      link.style.opacity = "0.85";
    }
  }

  function loadProfileFromAPI() {
    if (typeof BizdevarAPI === "undefined") return Promise.resolve();
    return BizdevarAPI.session()
      .then(function (data) {
        if (!data || !data.logged_in) return null;
        if (data.user) {
          if (data.user.kyc) syncKycStatus(data.user.kyc);
          if (data.user.name) {
            var parts = data.user.name.trim().split(/\s+/);
            state.firstName = parts[0] || state.firstName;
            state.lastName = parts.slice(1).join(" ") || state.lastName;
          }
          if (data.user.email) state.email = data.user.email;
          if (data.user.phone) state.phone = data.user.phone;
        }
        return BizdevarAPI.profileGet();
      })
      .then(function (p) {
        if (p) applyProfile(p);
        if (typeof BizdevarAPI.kycStatus === "function") {
          return BizdevarAPI.kycStatus().then(function (d) {
            if (d && d.kyc) syncKycStatus(d.kyc);
          });
        }
      })
      .catch(function () {});
  }

  function init() {
    syncHead();
    syncUserForm();
    syncNotifPrefs();
    renderAddresses();
    renderNotifs();
    renderReviews();
    renderCampaigns();
    renderPaymentCards();
    renderFaq();
    initNav();
    initMobileNav();
    initMap();
    initAddressForm();
    initUserForm();
    initPasswordForm();
    initNotifPrefs();
    initAddCard();
    initInviteCopy();
    initAssistant();
    loadProfileFromAPI().then(function () {
      renderOrders();
    });
  }

  function boot() {
    if (window.BizdevarAuthGuard) {
      BizdevarAuthGuard.requireAuth().then(init).catch(function () {});
      return;
    }
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
