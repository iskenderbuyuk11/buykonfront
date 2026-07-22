(function () {
  function setCartBadge(totalQty) {
    var v = String(totalQty || 0);
    document.querySelectorAll(".cart-btn__badge").forEach(function (el) {
      el.textContent = v;
    });
    document.querySelectorAll(".bottom-nav__badge").forEach(function (el) {
      el.textContent = v;
    });
  }

  function setFavoritesBadge(count) {
    var n = Number(count) || 0;
    document.querySelectorAll("[data-favorites-badge]").forEach(function (el) {
      el.textContent = String(n);
      if (n > 0) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  }

  function refreshFavoritesBadge() {
    if (typeof BizdevarFavorites === "undefined") {
      setFavoritesBadge(0);
      return;
    }
    setFavoritesBadge(BizdevarFavorites.count());
  }

  function applyAuthUI(data) {
    var guests = document.querySelectorAll('[data-nav="guest"]');
    var auths = document.querySelectorAll('[data-nav="auth"]');
    var nameEls = document.querySelectorAll("[data-user-name]");
    var adminLinks = document.querySelectorAll("[data-admin-link]");

    if (!guests.length || !auths.length) return;

    if (data && data.logged_in && data.user) {
      guests.forEach(function (el) {
        el.setAttribute("hidden", "");
      });
      auths.forEach(function (el) {
        el.removeAttribute("hidden");
      });
      var name = data.user.name || data.user.email || "";
      nameEls.forEach(function (el) {
        el.textContent = name;
      });
      var isAdmin = !!data.user.is_admin;
      adminLinks.forEach(function (link) {
        if (isAdmin) link.removeAttribute("hidden");
        else link.setAttribute("hidden", "");
      });
    } else {
      guests.forEach(function (el) {
        el.removeAttribute("hidden");
      });
      auths.forEach(function (el) {
        el.setAttribute("hidden", "");
      });
      nameEls.forEach(function (el) {
        el.textContent = "";
      });
      adminLinks.forEach(function (link) {
        link.setAttribute("hidden", "");
      });
    }

    updateMobileProfileButton(data);
    updateMobileMenuAuth(data);

    document.dispatchEvent(new CustomEvent("BizdevarAuthUpdate"));
    if (window.BizdevarSearchUI && window.BizdevarSearchUI.refreshAuthHint) {
      window.BizdevarSearchUI.refreshAuthHint();
    }
  }

  function refreshCartBadge() {
    if (typeof BizdevarAPI !== "undefined" && BizdevarAPI.cartGet) {
      BizdevarAPI.cartGet()
        .then(function (d) {
          setCartBadge(d.total_qty);
        })
        .catch(function () {
          setCartBadge(0);
        });
      return;
    }
    if (typeof BizdevarCart !== "undefined") {
      setCartBadge(BizdevarCart.getTotalQty());
    }
  }

  function refreshAuth() {
    if (typeof BizdevarAPI === "undefined") return;
    BizdevarAPI.session()
      .then(applyAuthUI)
      .catch(function () {
        applyAuthUI({ logged_in: false });
      });
  }

  function isCompactNav() {
    return window.matchMedia("(max-width: 900px)").matches;
  }

  function initUserMenuMobile() {
    var menu = document.querySelector(".header__user-menu");
    var trigger = document.getElementById("nav-user-trigger");
    if (!menu || !trigger) return;

    function closeMenu() {
      menu.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", function (e) {
      if (!isCompactNav()) return;
      e.preventDefault();
      e.stopPropagation();
      var open = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    document.addEventListener("click", function () {
      if (isCompactNav() && menu.classList.contains("is-open")) closeMenu();
    });

    menu.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    window.addEventListener(
      "resize",
      function () {
        if (!isCompactNav()) closeMenu();
      },
      { passive: true }
    );
  }

  function initBottomNav() {
    function sync() {
      var pathName = (location.pathname || "").toLowerCase().replace(/\\/g, "/");
      var path = (pathName.split("/").pop() || "").toLowerCase();
      if (!path) path = "index.html";
      var hash = (location.hash || "").replace(/^#/, "").split("&")[0];

      document.querySelectorAll("[data-bottom-nav]").forEach(function (el) {
        el.classList.remove("is-active");
        var key = el.getAttribute("data-bottom-nav");
        if (
          key === "home" &&
          (path === "index.html" || path === "" || pathName.endsWith("/bizde/") || pathName.endsWith("/bizde")) &&
          hash !== "kateqoriyalar" &&
          hash !== "elaqe"
        )
          el.classList.add("is-active");
        if (
          key === "cart" &&
          (path === "sebet.html" || pathName.indexOf("/sebet") !== -1)
        )
          el.classList.add("is-active");
        if (key === "categories" && path === "index.html" && hash === "kateqoriyalar")
          el.classList.add("is-active");
        if (
          key === "profile" &&
          (path === "profil.html" ||
            pathName.indexOf("/profil/") !== -1 ||
            pathName.indexOf("/profile/") !== -1)
        ) {
          el.classList.add("is-active");
        }
        if (key === "contact" && path === "index.html" && hash === "elaqe")
          el.classList.add("is-active");
        if (
          key === "favorites" &&
          pathName.indexOf("sevimliler") !== -1
        )
          el.classList.add("is-active");
      });
    }

    sync();
    window.addEventListener("hashchange", sync);
  }

  function initThemeToggle() {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;
    var storageKey = "bizdevar-theme";

    function applyTheme(mode) {
      var isDark = mode === "dark";
      document.body.classList.toggle("dark-mode", isDark);
      toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        isDark ? "İşıqlı rejimi aktiv et" : "Tünd rejimi aktiv et"
      );
    }

    var saved = "";
    try {
      saved = localStorage.getItem(storageKey) || "";
    } catch (e) {
      saved = "";
    }
    applyTheme(saved === "dark" ? "dark" : "light");

    if (!toggle.dataset.bound) {
      toggle.dataset.bound = "1";
      toggle.addEventListener("click", function () {
        var isDark = document.body.classList.contains("dark-mode");
        var next = isDark ? "light" : "dark";
        applyTheme(next);
        try {
          localStorage.setItem(storageKey, next);
        } catch (e) {
          /* storage unavailable */
        }
      });
    }
  }

  function mobileMenuSvg(type) {
    var icons = {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>',
      grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
      cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 11-1 9"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="M4.5 15.5h15"/><path d="m5 11 4-7"/><path d="m9 11 1 9"/></svg>',
      heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/></svg>',
      store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 9 5 3h14l2 6"/><path d="M3 9h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9Z"/><path d="M9 21V9"/><path d="M15 21V9"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6"/><path d="M12 7h.01"/></svg>',
      truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h1"/><path d="M15 18h2"/><path d="M19 18h2v-3.3a1 1 0 0 0-.3-.7l-2.4-2.4a1 1 0 0 0-.7-.3H15"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
      return: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7v6h6"/><path d="M21 17a8 8 0 0 0-14-5.3L3 13"/></svg>',
      phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6.4 6.4l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2z"/></svg>',
      mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
      chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.7-.9L3 21l1.7-5.1a8.4 8.4 0 1 1 16.3-4.4z"/></svg>',
      user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      login: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
      file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>',
      moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
    };
    return icons[type] || icons.info;
  }

  function buildMobileMenuHtml(root) {
    function item(href, icon, label, sub) {
      return (
        '<a class="mobile-menu__item" href="' + href + '">' +
        '<span class="mobile-menu__item-icon mobile-menu__item-icon--' + icon + '">' +
        mobileMenuSvg(icon) +
        "</span>" +
        '<span class="mobile-menu__item-body">' +
        "<strong>" + label + "</strong>" +
        (sub ? "<small>" + sub + "</small>" : "") +
        "</span>" +
        '<span class="mobile-menu__item-arrow" aria-hidden="true">›</span>' +
        "</a>"
      );
    }

    function quick(href, icon, label, extra) {
      return (
        '<a class="mobile-menu__quick" href="' + href + '"' + (extra || "") + ">" +
        '<span class="mobile-menu__quick-icon">' + mobileMenuSvg(icon) + "</span>" +
        "<span>" + label + "</span>" +
        "</a>"
      );
    }

    return (
      '<button type="button" class="header__sheet-backdrop" data-mobile-sheet-close aria-label="Menyunu bağla"></button>' +
      '<aside class="header__sheet-panel mobile-menu" aria-label="Mobil menyu">' +
      '<div class="mobile-menu__hero">' +
      '<div class="mobile-menu__brand">' +
      '<img src="' + root + 'images/logo.png" alt="BizdeVar" class="mobile-menu__logo" />' +
      "<div><strong>BizdeVar</strong><span>Alış-veriş &amp; dəstək</span></div>" +
      "</div>" +
      '<button type="button" class="mobile-menu__close" data-mobile-sheet-close aria-label="Bağla">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      "</button>" +
      "</div>" +
      '<div class="mobile-menu__scroll">' +
      '<div class="mobile-menu__auth" data-mobile-menu-guest>' +
      '<div class="mobile-menu__auth-card mobile-menu__auth-card--guest">' +
      '<span class="mobile-menu__auth-icon">' + mobileMenuSvg("user") + "</span>" +
      "<div><strong>Hesabınıza daxil olun</strong><p>Sifarişlərinizi izləyin və sürətli alış-veriş edin.</p></div>" +
      '<div class="mobile-menu__auth-actions">' +
      '<a href="' + root + 'pages/login/" class="mobile-menu__btn mobile-menu__btn--primary">' + mobileMenuSvg("login") + " Giriş</a>" +
      '<a href="' + root + 'pages/register/" class="mobile-menu__btn mobile-menu__btn--ghost">Qeydiyyat</a>' +
      "</div></div></div>" +
      '<div class="mobile-menu__auth" data-mobile-menu-auth hidden>' +
      '<a class="mobile-menu__auth-card mobile-menu__auth-card--user" href="' + root + 'pages/profile/">' +
      '<span class="mobile-menu__auth-avatar" data-mobile-menu-avatar></span>' +
      "<div><strong data-mobile-menu-user-name></strong><small>Profil və sifarişlər</small></div>" +
      '<span class="mobile-menu__item-arrow" aria-hidden="true">›</span>' +
      "</a></div>" +
      '<div class="mobile-menu__quick-grid">' +
      quick(root + "index.html", "home", "Ana səhifə") +
      quick(root + "pages/sebet/", "cart", "Səbət") +
      quick(root + "pages/sevimliler/", "heart", "Sevimlilər") +
      quick("#", "search", "Axtarış", ' data-nav-search data-mobile-sheet-close') +
      "</div>" +
      '<div class="mobile-menu__section">' +
      '<h4 class="mobile-menu__section-title">Alış-veriş</h4>' +
      '<nav class="mobile-menu__nav">' +
      item(root + "index.html#catalog", "grid", "Məhsullar", "Bütün kataloq") +
      item(root + "index.html#kateqoriyalar", "grid", "Kateqoriyalar", "Seçilmiş bölmələr") +
      item(root + "pages/sat/", "store", "Bizdə Sat", "Mağazanı aç") +
      "</nav></div>" +
      '<div class="mobile-menu__section">' +
      '<h4 class="mobile-menu__section-title">Dəstək &amp; məlumat</h4>' +
      '<nav class="mobile-menu__nav">' +
      item(root + "pages/haqqimizda/", "info", "Haqqımızda", "Biz kimik") +
      item(root + "pages/catdirilma/", "truck", "Çatdırılma", "Çatdırılma qaydaları") +
      item(root + "pages/qaytarilma/", "return", "Qaytarılma", "Geri qaytarma") +
      item(root + "pages/elaqe/", "chat", "Əlaqə", "Bizimlə yazın") +
      item(root + "pages/istifade-sertleri/", "file", "İstifadə şərtləri", "Qaydalar") +
      "</nav></div>" +
      '<div class="mobile-menu__support">' +
      '<div class="mobile-menu__support-head">' +
      '<span class="mobile-menu__support-badge">' + mobileMenuSvg("chat") + "</span>" +
      "<div><strong>Müştəri dəstəyi</strong><span>7/24 sizinlə birlikdəyik</span></div>" +
      "</div>" +
      '<div class="mobile-menu__support-links">' +
      '<a href="tel:+994000000000" class="mobile-menu__support-link">' +
      '<span class="mobile-menu__support-icon">' + mobileMenuSvg("phone") + "</span>" +
      "<span><small>Telefon</small><strong>+994 00 000 00 00</strong></span></a>" +
      '<a href="https://wa.me/994000000000" class="mobile-menu__support-link" target="_blank" rel="noopener">' +
      '<span class="mobile-menu__support-icon mobile-menu__support-icon--wa">' + mobileMenuSvg("chat") + "</span>" +
      "<span><small>WhatsApp</small><strong>Dəstək xətti</strong></span></a>" +
      '<a href="mailto:info@bizdevar.shop" class="mobile-menu__support-link">' +
      '<span class="mobile-menu__support-icon mobile-menu__support-icon--mail">' + mobileMenuSvg("mail") + "</span>" +
      "<span><small>E-poçt</small><strong>info@bizdevar.shop</strong></span></a>" +
      "</div></div>" +
      '<div class="mobile-menu__footer">' +
      '<button type="button" class="mobile-menu__theme" id="mobile-menu-theme">' +
      '<span class="mobile-menu__theme-icon">' + mobileMenuSvg("moon") + "</span>" +
      "<span><strong>Tema rejimi</strong><small data-mobile-menu-theme-label>İşıqlı rejim</small></span>" +
      "</button>" +
      "</div>" +
      "</div></aside>"
    );
  }

  function updateMobileMenuAuth(data) {
    var guest = document.querySelector("[data-mobile-menu-guest]");
    var auth = document.querySelector("[data-mobile-menu-auth]");
    var nameEl = document.querySelector("[data-mobile-menu-user-name]");
    var avatarEl = document.querySelector("[data-mobile-menu-avatar]");
    if (!guest || !auth) return;

    var isLoggedIn = !!(data && data.logged_in && data.user);
    var fullName = isLoggedIn ? (data.user.name || data.user.email || "Hesab") : "";

    if (isLoggedIn) {
      guest.setAttribute("hidden", "");
      auth.removeAttribute("hidden");
      if (nameEl) nameEl.textContent = fullName;
      if (avatarEl) avatarEl.textContent = getInitial(fullName) || "B";
    } else {
      auth.setAttribute("hidden", "");
      guest.removeAttribute("hidden");
      if (nameEl) nameEl.textContent = "";
      if (avatarEl) avatarEl.textContent = "";
    }
  }

  function initMobileMenuTheme() {
    var btn = document.getElementById("mobile-menu-theme");
    var label = document.querySelector("[data-mobile-menu-theme-label]");
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = "1";

    function syncLabel() {
      var isDark = document.body.classList.contains("dark-mode");
      if (label) label.textContent = isDark ? "Tünd rejim aktivdir" : "İşıqlı rejim aktivdir";
      btn.setAttribute("aria-pressed", isDark ? "true" : "false");
    }

    syncLabel();
    btn.addEventListener("click", function () {
      var toggle = document.getElementById("theme-toggle");
      if (toggle) {
        toggle.click();
      } else {
        var isDark = document.body.classList.contains("dark-mode");
        var next = isDark ? "light" : "dark";
        document.body.classList.toggle("dark-mode", next === "dark");
        try {
          localStorage.setItem("bizdevar-theme", next);
        } catch (e) {
          /* ignore */
        }
      }
      syncLabel();
    });
  }

  function getLayoutRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return document.body.getAttribute("data-root") || "";
  }

  function initMobileHeaderActions() {
    var headerInner = document.querySelector(".header__inner");
    if (!headerInner) return;

    var toolbar = headerInner.querySelector(".header__toolbar");
    if (!toolbar) return;

    var mobileActions = headerInner.querySelector(".header__mobile-actions");
    if (!mobileActions && !document.getElementById("mobile-menu-open")) {
      mobileActions = document.createElement("div");
      mobileActions.className = "header__mobile-actions";
      mobileActions.innerHTML =
        '<a href="/login" class="header__icon-btn header__icon-btn--mobile" id="mobile-profile-link" aria-label="Profil">' +
        '<span class="header__mobile-initial" id="mobile-profile-initial" hidden aria-hidden="true"></span>' +
        '<svg class="header__icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
        "</a>" +
        '<button type="button" class="header__icon-btn header__icon-btn--mobile" id="mobile-search-open" aria-label="Axtarış">' +
        '<svg class="header__icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
        "</button>" +
        '<button type="button" class="header__icon-btn header__icon-btn--mobile" id="mobile-menu-open" aria-label="Menyu" aria-expanded="false">' +
        '<svg class="header__icon-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
        "</button>";
      toolbar.appendChild(mobileActions);
    }

    var menuSheet = document.getElementById("mobile-menu-sheet");
    if (!menuSheet) {
      var root = getLayoutRoot();
      menuSheet = document.createElement("div");
      menuSheet.id = "mobile-menu-sheet";
      menuSheet.className = "header__sheet";
      menuSheet.setAttribute("hidden", "");
      menuSheet.innerHTML = buildMobileMenuHtml(root);
      document.body.appendChild(menuSheet);
      initMobileMenuTheme();
    }

    var menuOpenBtn = document.getElementById("mobile-menu-open");
    var searchOpenBtn = document.getElementById("mobile-search-open");
    var profileLink = document.getElementById("mobile-profile-link");

    function openSheet() {
      if (!menuSheet || !menuOpenBtn) return;
      menuSheet.removeAttribute("hidden");
      menuOpenBtn.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }

    function closeSheet() {
      if (!menuSheet || !menuOpenBtn) return;
      menuSheet.setAttribute("hidden", "");
      menuOpenBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    if (searchOpenBtn) {
      searchOpenBtn.setAttribute("data-nav-search", "");
    }

    if (menuOpenBtn && !menuOpenBtn.dataset.bound) {
      menuOpenBtn.dataset.bound = "1";
      menuOpenBtn.addEventListener("click", function () {
        if (menuSheet.hasAttribute("hidden")) openSheet();
        else closeSheet();
      });
    }

    if (!menuSheet.dataset.bound) {
      menuSheet.dataset.bound = "1";
      menuSheet.querySelectorAll("[data-mobile-sheet-close]").forEach(function (el) {
        el.addEventListener("click", closeSheet);
      });
      menuSheet.addEventListener("click", function (e) {
        if (e.target.closest("a[href]") && !e.target.closest("[data-nav-search]")) closeSheet();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !menuSheet.hasAttribute("hidden")) closeSheet();
      });
      window.addEventListener("resize", function () {
        if (!isCompactNav() && !menuSheet.hasAttribute("hidden")) closeSheet();
      });
    }

    updateMobileProfileButton();

    if (window.BizdevarSearchUI && typeof BizdevarSearchUI.bindTriggers === "function") {
      BizdevarSearchUI.bindTriggers();
    }
  }

  function initMobileHeaderCollapse() {
    var header = document.querySelector(".header");
    if (!header || header.dataset.collapseBound) return;
    header.dataset.collapseBound = "1";

    var ticking = false;
    var THRESHOLD = 24;

    function update() {
      ticking = false;
      if (!window.matchMedia("(max-width: 900px)").matches) {
        header.classList.remove("is-header-collapsed");
        return;
      }
      var y = window.scrollY || 0;
      if (y > THRESHOLD) {
        header.classList.add("is-header-collapsed");
      } else {
        header.classList.remove("is-header-collapsed");
      }
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    update();
  }

  function getInitial(name) {
    var value = String(name || "").trim();
    return value ? value.charAt(0).toUpperCase() : "";
  }

  function updateMobileProfileButton(data) {
    var profileLink = document.getElementById("mobile-profile-link");
    var bottomProfile = document.getElementById("bottom-nav-profile");
    var isLoggedIn = !!(data && data.logged_in && data.user);
    var fullName = isLoggedIn ? (data.user.name || data.user.email || "") : "";
    var initial = getInitial(fullName);
    var profileHref = isLoggedIn
      ? getLayoutRoot() + "pages/profile/"
      : getLayoutRoot() + "pages/login/";

    if (bottomProfile) {
      bottomProfile.href = profileHref;
      bottomProfile.setAttribute(
        "aria-label",
        isLoggedIn ? "Profil: " + fullName : "Profil / Giriş"
      );
    }

    if (!profileLink) return;
    var icon = profileLink.querySelector(".header__icon-svg");
    var initialEl = document.getElementById("mobile-profile-initial");

    profileLink.href = profileHref;
    if (isLoggedIn && initial && initialEl) {
      initialEl.textContent = initial;
      initialEl.removeAttribute("hidden");
      if (icon) icon.setAttribute("hidden", "");
      profileLink.setAttribute("aria-label", "Profil: " + fullName);
    } else {
      if (initialEl) {
        initialEl.textContent = "";
        initialEl.setAttribute("hidden", "");
      }
      if (icon) icon.removeAttribute("hidden");
      profileLink.setAttribute("aria-label", "Profil");
    }
  }

  function initHomeMegaHover() {
    var trigger = document.getElementById("homeCatMegaTrigger");
    var section = document.getElementById("kateqoriyalar");
    var panel = document.getElementById("homeMegaPanel");
    if (!trigger || !section || !panel) return;

    var mq = window.matchMedia("(hover: hover) and (min-width: 961px)");
    var closeTimer = null;

    function setOpen(open) {
      section.classList.toggle("is-mega-open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      panel.setAttribute("aria-hidden", open ? "false" : "true");
    }

    function openMega() {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
      setOpen(true);
    }

    function scheduleClose() {
      if (closeTimer) window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(function () {
        setOpen(false);
        closeTimer = null;
      }, 150);
    }

    function isInHoverZone(node) {
      if (!node || !(node instanceof Node)) return false;
      return trigger.contains(node) || section.contains(node);
    }

    function onLeaveHoverZone(e) {
      if (isInHoverZone(e.relatedTarget)) return;
      scheduleClose();
    }

    if (trigger.dataset.megaBound) return;
    trigger.dataset.megaBound = "1";

    trigger.addEventListener("mouseenter", function () {
      if (!mq.matches) return;
      openMega();
    });
    trigger.addEventListener("mouseleave", function (e) {
      if (!mq.matches) return;
      onLeaveHoverZone(e);
    });

    section.addEventListener("mouseenter", function () {
      if (!mq.matches || !section.classList.contains("is-mega-open")) return;
      openMega();
    });
    section.addEventListener("mouseleave", function (e) {
      if (!mq.matches) return;
      onLeaveHoverZone(e);
    });

    trigger.addEventListener("focus", openMega);
    trigger.addEventListener("blur", function (e) {
      if (!isInHoverZone(e.relatedTarget)) scheduleClose();
    });
    panel.addEventListener("focusin", openMega);
    panel.addEventListener("focusout", function (e) {
      if (!isInHoverZone(e.relatedTarget)) scheduleClose();
    });

    mq.addEventListener("change", function () {
      if (!mq.matches) setOpen(false);
    });

    trigger.addEventListener("click", function () {
      if (mq.matches) return;
      setOpen(!section.classList.contains("is-mega-open"));
    });
  }

  function initLogoutButtons() {
    document.querySelectorAll("[data-action='logout']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (typeof BizdevarAPI === "undefined") return;
        BizdevarAPI.logout()
          .then(function () {
            applyAuthUI({ logged_in: false });
            window.location.href = getLayoutRoot() + "index.html";
          })
          .catch(function () {
            applyAuthUI({ logged_in: false });
          });
      });
    });
  }

  function initMobileAppBanner() {
    var banner = document.getElementById("mobile-app-banner");
    var close = document.getElementById("mobile-app-banner-close");
    if (!banner || !close) return;
    var storageKey = "bizdevar-mobile-app-banner-closed";
    try {
      if (localStorage.getItem(storageKey) === "1") {
        banner.classList.add("is-hidden");
      }
    } catch (e) {
      /* localStorage unavailable */
    }
    if (close.dataset.bound) return;
    close.dataset.bound = "1";
    close.addEventListener("click", function () {
      banner.classList.add("is-hidden");
      try {
        localStorage.setItem(storageKey, "1");
      } catch (e) {
        /* localStorage unavailable */
      }
    });
  }

  function initHeaderUi() {
    initThemeToggle();
    initUserMenuMobile();
    initBottomNav();
    initMobileHeaderActions();
    initMobileHeaderCollapse();
    initHomeMegaHover();
    initLogoutButtons();
    initMobileAppBanner();
    refreshAuth();
    refreshCartBadge();
    refreshFavoritesBadge();
    document.addEventListener("BizdevarFavoritesChanged", refreshFavoritesBadge);
    document.addEventListener("BizdevarCartChanged", refreshCartBadge);
  }

  function ensureSearchUiScript(done) {
    if (window.BizdevarSearchUI) {
      if (done) done();
      return;
    }
    var existing = document.querySelector('script[src*="search-ui.js"]');
    if (existing) {
      existing.addEventListener("load", function onLoad() {
        existing.removeEventListener("load", onLoad);
        if (done) done();
      });
      return;
    }
    var s = document.createElement("script");
    s.src = getLayoutRoot() + "js/search-ui.js?v=7";
    s.onload = function () {
      if (done) done();
    };
    document.body.appendChild(s);
  }

  function boot() {
    var ready = window.BizdevarLayoutReady;
    function start() {
      ensureSearchUiScript(initHeaderUi);
    }
    if (ready && typeof ready.then === "function") {
      ready.finally(start);
      return;
    }
    start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.BizdevarHeader = {
    refreshCartBadge: refreshCartBadge,
    refreshAuth: refreshAuth,
    setCartBadge: setCartBadge,
    setFavoritesBadge: setFavoritesBadge,
    refreshFavoritesBadge: refreshFavoritesBadge,
  };
})();
