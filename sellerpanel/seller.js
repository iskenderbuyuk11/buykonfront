(function () {
  "use strict";

  var API = window.BuykonSellerAPI || window.BizdeSellerAPI;
  var workspace = document.getElementById("workspace");
  var sideNav = document.getElementById("sideNav");
  var breadcrumb = document.getElementById("breadcrumb");
  var modalBackdrop = document.getElementById("modalBackdrop");
  var modalTitle = document.getElementById("modalTitle");
  var modalBody = document.getElementById("modalBody");
  var toastStack = document.getElementById("toastStack");
  var storeHead = document.getElementById("storeHead");
  var memberNameEl = document.getElementById("memberName");
  var memberRoleEl = document.getElementById("memberRole");
  var adminShell = document.getElementById("adminShell");
  var sidebarOverlay = document.getElementById("sidebarOverlay");

  var navItems = [
    ["dashboard", "Dashboard", "fa-chart-pie", "dashboard"],
    ["products", "Məhsullar", "fa-box", "products"],
    ["questions", "Suallar", "fa-circle-question", "questions"],
    ["feedback", "Rəy və şikayət", "fa-comments", "feedback"],
    ["notifications", "Bildirişlər", "fa-bell", "notifications"],
    ["staff", "İdarə heyəti", "fa-users", "staff"],
    ["settings", "Tənzimləmələr", "fa-gear", "settings"],
  ];

  var metricColors = ["blue", "cyan", "green", "violet", "amber", "rose", "blue"];
  var metricIcons = ["fa-shopping-bag", "fa-truck-fast", "fa-circle-check", "fa-coins", "fa-boxes-stacked", "fa-box-open", "fa-hourglass-half"];

  var state = { route: "dashboard", categories: [], data: {}, store: null, feedbackTab: "reviews", productDraft: null, productSubmitId: null, permissions: null, isOwner: true };

  var CATEGORY_META = {
    elektronika: { icon: "fa-mobile-screen", color: "blue" },
    geyim: { icon: "fa-shirt", color: "violet" },
    aksesuarlar: { icon: "fa-gem", color: "amber" },
    "ev-yasam": { icon: "fa-couch", color: "green" },
    kosmetika: { icon: "fa-spa", color: "rose" },
  };

  function categoryMeta(slug, name) {
    var m = CATEGORY_META[slug] || { icon: "fa-box", color: "cyan" };
    return { icon: m.icon, color: m.color, name: name || slug };
  }

  function productImgSrc(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (String(url).indexOf("uploads/") === 0) {
      var base = (API && API.baseUrl) || "";
      var origin = base.replace(/\/api\/?$/, "");
      return origin + "/" + String(url).replace(/^\/+/, "");
    }
    return "../../" + String(url).replace(/^\/+/, "");
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function toast(title, text, isError) {
    var item = document.createElement("div");
    item.className = "toast" + (isError ? " toast--error" : "");
    item.innerHTML = "<strong>" + esc(title) + "</strong><span>" + esc(text) + "</span>";
    toastStack.appendChild(item);
    setTimeout(function () { item.remove(); }, 4000);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  function statusChip(status, action) {
    var cls = "status-chip--pending";
    var label = "Gözləyir";
    if (action === "delete" || status === "deletion_pending") {
      cls = "status-chip--delete";
      label = "Silinmə sorğusu";
    } else if (action === "update" || status === "moderation") {
      cls = "status-chip--moderation";
      label = "Dəyişiklik gözləyir";
    } else if (status === "active") {
      cls = "status-chip--active";
      label = "Aktiv";
    } else if (status === "rejected") {
      cls = "status-chip--rejected";
      label = "Rədd edilib";
    }
    return '<span class="status-chip ' + cls + '"><i class="fa-solid fa-circle" style="font-size:7px"></i> ' + esc(label) + "</span>";
  }

  function storeStatusBadge(status) {
    var cls = "seller-status--pending";
    var label = "Gözləyir";
    if (status === "active") { cls = "seller-status--active"; label = "Aktiv mağaza"; }
    else if (status === "frozen") { cls = "seller-status--pending"; label = "Dondurulub"; }
    else if (status === "rejected" || status === "restricted") { cls = "seller-status--rejected"; label = "Ləğv / dayandırılıb"; }
    return '<span class="seller-status ' + cls + '"><i class="fa-solid fa-circle" style="font-size:7px"></i> ' + esc(label) + "</span>";
  }

  function isStoreActive(store) {
    return store && store.status === "active";
  }

  function isStoreFrozen(store) {
    return store && store.status === "frozen";
  }

  function isStorePending(store) {
    return store && (store.status === "pending" || store.status === "rejected" || store.status === "restricted");
  }

  var PERM_OPTIONS = [
    ["dashboard", "Dashboard"],
    ["products", "Məhsullar"],
    ["questions", "Suallar"],
    ["feedback", "Rəy və şikayət"],
    ["notifications", "Bildirişlər"],
    ["staff", "İdarə heyəti"],
    ["settings", "Tənzimləmələr"],
  ];

  var ROLE_DEFAULT_PERMS = {
    staff: ["dashboard", "products", "feedback", "notifications", "questions"],
    manager: ["dashboard", "products", "feedback", "notifications", "questions", "settings", "staff"],
  };

  function roleLabel(role) {
    if (role === "manager") return "Müdir müavini";
    if (role === "owner") return "Mağaza rəhbəri";
    return "İşçi";
  }

  function updateBrandHead(sess) {
    var store = (sess && sess.seller) || state.store || {};
    var name = (sess && sess.member_name) || store.owner_name || store.store_name || "Satıcı";
    var role = (sess && sess.member_role) || (state.isOwner ? "Mağaza rəhbəri" : "İşçi");
    var storeName = store.store_name || store.name || "Mağaza";
    if (memberNameEl) memberNameEl.textContent = name;
    if (memberRoleEl) memberRoleEl.textContent = role;
    if (storeHead) storeHead.textContent = storeName;
  }

  function updateStoreHead(store) {
    updateBrandHead({ seller: store, member_name: memberNameEl && memberNameEl.textContent, member_role: memberRoleEl && memberRoleEl.textContent });
  }

  function canManageStaff() {
    return state.isOwner || canAccess("staff");
  }

  function permissionsFieldHtml(selected, idPrefix) {
    var set = {};
    (selected || []).forEach(function (p) { set[p] = true; });
    var boxes = PERM_OPTIONS.map(function (pair) {
      var key = pair[0];
      var label = pair[1];
      var checked = set[key] ? " checked" : "";
      return (
        '<label class="perm-check"><input type="checkbox" name="perm" value="' + key + '"' + checked +
        ' id="' + idPrefix + key + '"><span>' + esc(label) + "</span></label>"
      );
    }).join("");
    return '<div class="perm-grid" id="' + idPrefix + 'Grid">' + boxes + "</div>";
  }

  function readPermissionsFromForm(form) {
    var perms = [];
    form.querySelectorAll('input[name="perm"]:checked').forEach(function (cb) {
      perms.push(cb.value);
    });
    return perms;
  }

  function applyRoleDefaults(form, role) {
    var defaults = ROLE_DEFAULT_PERMS[role === "manager" ? "manager" : "staff"] || ROLE_DEFAULT_PERMS.staff;
    form.querySelectorAll('input[name="perm"]').forEach(function (cb) {
      cb.checked = defaults.indexOf(cb.value) >= 0;
    });
  }

  function renderPendingScreen(store) {
    var msg = "Sizin mağazanız təsdiq üçün gözləmədədir";
    var sub = "Admin komandamız müraciətinizi yoxlayır. Təsdiqlədikdən sonra panelin bütün funksiyaları açılacaq.";
    if (store.status === "rejected") {
      msg = "Mağaza müraciətiniz rədd edilib";
      sub = store.rejection_reason || "Yeni müraciət üçün dəstək ilə əlaqə saxlayın.";
    } else if (store.status === "restricted") {
      msg = "Mağazanız müvəqqəti dayandırılıb";
      sub = store.rejection_reason || "Ətraflı məlumat üçün dəstək komandası ilə əlaqə saxlayın.";
    }
    return (
      '<div class="pending-store">' +
      '<div class="pending-store__card">' +
      '<div class="pending-store__icon"><i class="fa-solid fa-hourglass-half"></i></div>' +
      "<h1>" + esc(msg) + "</h1>" +
      "<p>" + esc(sub) + "</p>" +
      '<div class="pending-store__meta"><strong>' + esc(store.store_name || "Mağaza") + "</strong>" +
      (store.email ? "<span>" + esc(store.email) + "</span>" : "") +
      "</div>" +
      '<div class="pending-store__actions">' +
      '<a class="btn btn--ghost" href="../buykonbusiness/index.html"><i class="fa-solid fa-arrow-left"></i> Buykon Business</a>' +
      '<button class="btn btn--primary" type="button" id="pendingLogout"><i class="fa-solid fa-right-from-bracket"></i> Çıxış</button>' +
      "</div></div></div>"
    );
  }

  function showPendingMode(store) {
    state.pendingOnly = true;
    if (sideNav) sideNav.innerHTML = "";
    var sidebarCard = document.querySelector(".sidebar-card");
    if (sidebarCard) sidebarCard.style.display = "none";
    workspace.innerHTML = renderPendingScreen(store);
    var logoutPending = document.getElementById("pendingLogout");
    if (logoutPending) {
      logoutPending.addEventListener("click", function () {
        API.logout().finally(function () {
          var slug = state.session && state.session.store_slug;
          window.location.href = API.loginUrl(slug);
        });
      });
    }
  }

  function canAccess(perm) {
    if (state.isOwner || !state.permissions) return true;
    return state.permissions.indexOf(perm) >= 0;
  }

  function renderNav() {
    sideNav.innerHTML = navItems
      .filter(function (item) { return canAccess(item[3] || item[0]); })
      .map(function (item) {
        return (
          '<button class="nav-item" type="button" data-route="' + item[0] + '">' +
          '<i class="fa-solid ' + item[2] + '"></i><span class="nav-label">' + esc(item[1]) + "</span></button>"
        );
      })
      .join("");
  }

  function pageHead(title, desc, actions) {
    return (
      '<section class="page-head"><div class="page-title"><span class="panel-eyebrow"><i class="fa-solid fa-store"></i> Buykon Satıcı</span><h1>' +
      esc(title) + '</h1><p>' + esc(desc) + '</p></div><div class="page-actions">' + (actions || "") + "</div></section>"
    );
  }

  function loadingHtml() {
    return '<div class="sp-loading"><i class="fa-solid fa-circle-notch fa-spin"></i><span>Yüklənir...</span></div>';
  }

  function renderDashboard(d) {
    var store = d.store || state.store || {};
    var metrics = d.metrics || [];
    return (
      pageHead("Dashboard", "Mağazanızın satış statistikası və sifariş göstəriciləri", '<button class="btn btn--primary" data-action="reload"><i class="fa-solid fa-rotate"></i> Yenilə</button>') +
      '<div class="store-banner">' +
      '<span class="store-banner__icon"><i class="fa-solid fa-store"></i></span>' +
      '<div class="store-banner__body">' +
      '<strong class="store-banner__title">' + esc(store.store_name || store.name || "Mağaza") + "</strong>" +
      '<div class="store-banner__meta">' + storeStatusBadge(store.status) +
      (store.rejection_reason ? '<span style="color:var(--danger)">' + esc(store.rejection_reason) + "</span>" : "") +
      "</div></div></div>" +
      '<section class="metrics-grid">' +
      metrics.map(function (m, i) {
        var color = metricColors[i % metricColors.length];
        return (
          '<article class="metric"><div class="metric__top">' +
          '<span class="icon-stat icon-stat--' + color + '"><i class="fa-solid ' + (metricIcons[i] || "fa-chart-line") + '"></i></span>' +
          '<span class="metric__label">' + esc(m.label) + "</span></div>" +
          '<div class="metric__value">' + esc(m.value) + "</div></article>"
        );
      }).join("") +
      "</section>" +
      (store.status !== "active"
        ? '<div class="panel-note" style="margin-top:20px"><i class="fa-solid fa-circle-info"></i><span>Mağazanız admin təsdiqini gözləyir. Təsdiqdən sonra məhsul əlavə edə biləcəksiniz.</span></div>'
        : isStoreFrozen(store)
          ? '<div class="panel-note panel-note--warn" style="margin-top:20px"><i class="fa-solid fa-snowflake"></i><span>Mağaza dondurulub. <a href="#settings" data-route="settings">Tənzimləmələr</a> bölməsindən aktiv edə bilərsiniz.</span></div>'
          : '<div class="panel-note" style="margin-top:20px"><i class="fa-solid fa-shield-halved"></i><span>Məhsul əlavə, dəyişiklik və silmə əməliyyatları admin təsdiqindən sonra aktiv olur.</span></div>')
    );
  }

  function renderProducts(d) {
    var rows = (d.products || []).map(function (p) {
      var img = p.image_url
        ? '<img class="product-thumb" src="' + esc(productImgSrc(p.image_url)) + '" alt="">'
        : '<span class="product-thumb product-thumb--empty"><i class="fa-solid fa-image"></i></span>';
      return [
        '<div class="product-cell">' + img + "<span>" + esc(p.name) + "</span></div>",
        esc(p.category_slug),
        "₼ " + Number(p.price).toFixed(0),
        esc(String(p.stock)),
        statusChip(p.status, p.moderation_action),
        '<div class="table-actions">' +
        '<button class="btn btn--sm" data-action="edit-product" data-id="' + p.id + '" title="Redaktə"><i class="fa-solid fa-pen"></i></button>' +
        '<button class="btn btn--sm btn--danger" data-action="delete-product" data-id="' + p.id + '" title="Sil"><i class="fa-solid fa-trash"></i></button></div>',
      ];
    });
    var addBtn = state.store && state.store.status === "active"
      ? '<button class="btn btn--primary" data-action="add-product"><i class="fa-solid fa-plus"></i> Məhsul əlavə et</button>'
      : '<span class="seller-status seller-status--pending"><i class="fa-solid fa-lock"></i> Təsdiq gözləyir</span>';
    return pageHead("Məhsullar", "Məhsul siyahınızı idarə edin — dəyişikliklər admin təsdiqi ilə tətbiq olunur", addBtn) +
      table("Məhsul siyahısı", ["Məhsul", "Kateqoriya", "Qiymət", "Stok", "Status", "Əməliyyat"], rows);
  }

  function renderFeedback(d) {
    var reviews = d.reviews || [];
    var complaints = d.complaints || [];
    var tab = state.feedbackTab;
    var list =
      tab === "reviews"
        ? reviews.length
          ? reviews.map(function (r) {
              var st = r.admin_status || "pending";
              var replyBtn = st === "approved" && !r.seller_reply
                ? '<button class="btn btn--sm" data-action="reply-review" data-id="' + r.id + '"><i class="fa-solid fa-reply"></i> Cavab ver</button>'
                : "";
              return (
                '<article class="review-item"><div class="stars">' + "★".repeat(r.stars || 0) + "☆".repeat(5 - (r.stars || 0)) +
                '</div><p style="margin:10px 0 0;line-height:1.6">' + esc(r.text) + "</p>" +
                (r.seller_reply ? '<p style="margin:10px 0 0;padding:12px;background:var(--surface-2);border-radius:10px"><strong>Mağaza cavabı:</strong> ' + esc(r.seller_reply) + "</p>" : "") +
                '<div class="review-item__meta">' + esc(r.product_name) + " · Admin: " + esc(st) + " · " + esc(r.created_at || "") +
                "</div>" + replyBtn + "</article>"
              );
            }).join("")
          : '<div class="empty-state"><i class="fa-solid fa-star"></i><p>Hələ rəy yoxdur</p></div>'
        : complaints.length
          ? complaints.map(function (c) {
              return (
                '<article class="feed-item"><strong>' + esc(c.subject) + '</strong><p style="margin:10px 0 0;color:var(--muted);line-height:1.6">' +
                esc(c.body) + '</p><div class="feed-item__meta">' + esc(c.status) + " · " + esc(c.created_at || "") + "</div></article>"
              );
            }).join("")
          : '<div class="empty-state"><i class="fa-solid fa-flag"></i><p>Şikayət yoxdur</p></div>';

    return (
      pageHead("Rəy və şikayət", "Admin təsdiqlənmiş rəylərə cavab yaza bilərsiniz", "") +
      '<div class="tabs">' +
      '<button type="button" class="tab-btn' + (tab === "reviews" ? " is-active" : "") + '" data-action="tab-reviews"><i class="fa-solid fa-star"></i> Rəylər (' + reviews.length + ")</button>" +
      '<button type="button" class="tab-btn' + (tab === "complaints" ? " is-active" : "") + '" data-action="tab-complaints"><i class="fa-solid fa-flag"></i> Şikayətlər (' + complaints.length + ")</button>" +
      "</div>" + list
    );
  }

  function renderQuestions(d) {
    var items = d.questions || [];
    var list = items.length
      ? items.map(function (q) {
          var actions = "";
          if (q.status === "pending" || q.status === "answered") {
            actions += '<button class="btn btn--sm" data-action="answer-question" data-id="' + q.id + '"><i class="fa-solid fa-pen"></i> Cavabla</button> ';
          }
          if (q.answer && q.status !== "published") {
            actions += '<button class="btn btn--sm btn--primary" data-action="publish-question" data-id="' + q.id + '"><i class="fa-solid fa-globe"></i> Hamıya aç</button>';
          }
          return (
            '<article class="feed-item"><strong>' + esc(q.product_name) + "</strong>" +
            '<p style="margin:10px 0 0;line-height:1.6">' + esc(q.question) + "</p>" +
            (q.answer ? '<p style="margin:10px 0 0;color:var(--muted)"><strong>Cavab:</strong> ' + esc(q.answer) + "</p>" : "") +
            '<div class="feed-item__meta">' + esc(q.status) + " · " + esc(q.customer_name || "Müştəri") + " · " + esc(q.created_at || "") + "</div>" +
            '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">' + actions + "</div></article>"
          );
        }).join("")
      : '<div class="empty-state"><i class="fa-solid fa-circle-question"></i><p>Sual yoxdur</p></div>';
    return pageHead("Suallar", "Sualları oxuyun, cavab verin və uyğun olarsa hamıya açın", "") + list;
  }

  function renderStaff(d) {
    var staff = d.staff || [];
    var invite = canManageStaff() && state.store && state.store.status === "active"
      ? '<button class="btn btn--primary" data-action="invite-staff"><i class="fa-solid fa-user-plus"></i> İşçi dəvət et</button>'
      : "";
    var list = staff.length
      ? staff.map(function (s) {
          var roleLbl = roleLabel(s.role);
          var perms = s.permissions || [];
          var permText = perms.length
            ? perms.map(function (p) {
                var found = PERM_OPTIONS.find(function (x) { return x[0] === p; });
                return found ? found[1] : p;
              }).join(", ")
            : "—";
          var actions = canManageStaff() && s.status === "active"
            ? '<button class="btn btn--sm" data-action="edit-staff" data-id="' + s.id + '"><i class="fa-solid fa-pen"></i></button>' +
              '<button class="btn btn--sm btn--danger" data-action="remove-staff" data-id="' + s.id + '"><i class="fa-solid fa-trash"></i></button>'
            : "";
          var inviteUrl = s.invite_url && API.normalizeExternalStoreUrl
            ? API.normalizeExternalStoreUrl(s.invite_url)
            : s.invite_url;
          var inviteLink = s.status === "invited" && inviteUrl
            ? '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
              '<code style="font-size:11px;word-break:break-all;flex:1;min-width:180px;background:var(--surface-2,#f1f5f9);padding:8px 10px;border-radius:8px">' + esc(inviteUrl) + "</code>" +
              '<button class="btn btn--sm" type="button" data-action="copy-invite" data-url="' + esc(inviteUrl) + '"><i class="fa-solid fa-copy"></i> Linki kopyala</button></div>'
            : "";
          return (
            '<article class="staff-item"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">' +
            "<div><strong>" + esc(s.name || s.email) + "</strong>" +
            '<div style="color:var(--muted);font-size:13px;margin-top:4px">' + esc(s.email) + " · " + esc(roleLbl) + "</div>" +
            '<div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5"><strong>İcazələr:</strong> ' + esc(permText) + "</div>" +
            '<div class="feed-item__meta">' + esc(s.status) + " · " + esc(s.invited_at || "") + "</div>" +
            inviteLink + "</div>" +
            '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">' + statusChip(s.status === "active" ? "active" : "pending") + actions + "</div></div></article>"
          );
        }).join("")
      : '<div class="empty-state"><i class="fa-solid fa-users"></i><p>Hələ işçi yoxdur</p></div>';

    return (
      pageHead("İdarə heyəti", "Vəzifə və icazələri ayrıca idarə edin", invite) +
      '<div class="panel-note" style="margin-bottom:16px"><i class="fa-solid fa-shield-halved"></i><span>Vəzifə (Müdir müavini / İşçi) və icazələr ayrıdır. Rəhbər və müdir müavini icazələri dəyişə bilər.</span></div>' +
      list
    );
  }

  function renderNotifications(d) {
    var items = d.notifications || [];
    if (!items.length) {
      return pageHead("Bildirişlər", "Sistem mesajları və vacib xəbərdarlıqlar", "") +
        '<div class="empty-state"><i class="fa-solid fa-bell"></i><p>Bildiriş yoxdur</p></div>';
    }
    return (
      pageHead("Bildirişlər", "Sistem mesajları və vacib xəbərdarlıqlar", "") +
      items.map(function (n) {
        return (
          '<article class="feed-item' + (n.is_read ? "" : " feed-item--unread") + '">' +
          '<div style="display:flex;justify-content:space-between;gap:12px;align-items:start">' +
          "<div><strong>" + esc(n.title) + "</strong><p style=\"margin:10px 0 0;color:var(--muted);line-height:1.6\">" + esc(n.body) + "</p>" +
          '<div class="feed-item__meta">' + esc(n.created_at || "") + "</div></div>" +
          (!n.is_read ? '<button class="btn btn--sm" data-action="read-notif" data-id="' + n.id + '"><i class="fa-solid fa-check"></i> Oxundu</button>' : "") +
          "</div></article>"
        );
      }).join("")
    );
  }

  function renderSettings(d) {
    var store = d.store || state.store || {};
    var logo = store.logo_url ? productImgSrc(store.logo_url) : "";
    var frozen = isStoreFrozen(store);
    var active = isStoreActive(store);

    return (
      pageHead("Tənzimləmələr", "Mağaza məlumatlarını və statusunu idarə edin", "") +
      (frozen
        ? '<div class="panel-note panel-note--warn" style="margin-bottom:20px"><i class="fa-solid fa-snowflake"></i><span>Mağazanız dondurulub. Məhsullar saytda görünmür. Aşağıdan yenidən aktiv edə bilərsiniz.</span></div>'
        : "") +
      '<div class="settings-grid">' +
      '<section class="settings-card">' +
      '<h2 class="settings-card__title"><i class="fa-solid fa-store"></i> Mağaza məlumatları</h2>' +
      '<form class="settings-form" id="settingsForm">' +
      '<div class="settings-logo">' +
      '<div class="settings-logo__preview" id="settingsLogoPreview">' +
      (logo
        ? '<img src="' + esc(logo) + '" alt="">'
        : '<span class="settings-logo__placeholder"><i class="fa-solid fa-store"></i></span>') +
      "</div>" +
      '<div class="settings-logo__actions">' +
      '<label class="btn btn--sm"><i class="fa-solid fa-camera"></i> Şəkil seç<input type="file" id="settingsLogoInput" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>' +
      (logo ? '<button type="button" class="btn btn--sm btn--ghost" data-action="remove-logo"><i class="fa-solid fa-trash"></i> Sil</button>' : "") +
      '<p class="settings-hint">Profil şəkli məhsul səhifəsində satıcı blokunda görünəcək.</p>' +
      "</div></div>" +
      '<label class="field"><span>Mağaza adı</span><input type="text" name="store_name" value="' + esc(store.store_name || "") + '" required minlength="2" maxlength="120"></label>' +
      '<label class="field"><span>Telefon</span><input type="tel" name="phone" value="' + esc(store.phone || "") + '" required minlength="7" maxlength="20" placeholder="+994 XX XXX XX XX"></label>' +
      '<label class="field"><span>Email</span><input type="email" value="' + esc(store.email || "") + '" disabled></label>' +
      '<div class="settings-form__actions"><button type="submit" class="btn btn--primary" id="settingsSaveBtn"><i class="fa-solid fa-floppy-disk"></i> Yadda saxla</button></div>' +
      "</form></section>" +
      '<section class="settings-card settings-card--danger">' +
      '<h2 class="settings-card__title"><i class="fa-solid fa-triangle-exclamation"></i> Mağaza statusu</h2>' +
      '<p class="settings-card__desc">Mağazanı müvəqqəti dondurmaq məhsullarınızı saytdan gizlədir. Silmə əməliyyatı geri qaytarıla bilməz.</p>' +
      '<div class="settings-danger-actions">' +
      (active
        ? '<button type="button" class="btn btn--ghost" data-action="freeze-store"><i class="fa-solid fa-pause"></i> Mağazanı dondur</button>'
        : frozen
          ? '<button type="button" class="btn btn--primary" data-action="unfreeze-store"><i class="fa-solid fa-play"></i> Mağazanı aktiv et</button>'
          : "") +
      '<button type="button" class="btn btn--danger" data-action="delete-store"><i class="fa-solid fa-trash"></i> Mağazanı sil</button>' +
      "</div></section></div>"
    );
  }

  function bindSettingsForm() {
    var form = document.getElementById("settingsForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var btn = document.getElementById("settingsSaveBtn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saxlanılır...';
      }
      API.updateSettings({ store_name: fd.get("store_name"), phone: fd.get("phone") })
        .then(function (res) {
          if (res.store) state.store = res.store;
          updateStoreHead(state.store);
          toast("Uğurlu", res.message || "Yadda saxlanıldı");
        })
        .catch(function (err) {
          toast("Xəta", err.message, true);
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Yadda saxla';
          }
        });
    });

    var logoInput = document.getElementById("settingsLogoInput");
    if (logoInput) {
      logoInput.addEventListener("change", function () {
        if (!logoInput.files || !logoInput.files[0]) return;
        var file = logoInput.files[0];
        API.uploadLogo(file)
          .then(function (res) {
            if (res.store) state.store = res.store;
            updateStoreHead(state.store);
            toast("Uğurlu", "Profil şəkli yeniləndi");
            loadRoute("settings");
          })
          .catch(function (err) {
            toast("Xəta", err.message, true);
          })
          .finally(function () {
            logoInput.value = "";
          });
      });
    }
  }

  function deleteStoreModal() {
    openModal(
      "Mağazanı sil",
      '<form id="deleteStoreForm" class="settings-delete-form">' +
      '<p class="settings-delete-warn">Bu əməliyyat geri qaytarıla bilməz. Bütün məhsullar silinəcək və mağazaya giriş bağlanacaq.</p>' +
      '<label class="field"><span>Təsdiq üçün şifrənizi yazın</span><input type="password" name="password" required autocomplete="current-password"></label>' +
      '<div class="modal-actions"><button type="button" class="btn btn--ghost" data-action="close-modal">Ləğv et</button>' +
      '<button type="submit" class="btn btn--danger"><i class="fa-solid fa-trash"></i> Mağazanı sil</button></div></form>'
    );
    var form = document.getElementById("deleteStoreForm");
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var pass = new FormData(form).get("password");
      API.deleteStore(String(pass || ""))
        .then(function (res) {
          toast("Silindi", res.message || "Mağaza silindi");
          closeModal();
          API.logout().finally(function () {
            var slug = state.session && state.session.store_slug;
            window.location.href = API.loginUrl(slug);
          });
        })
        .catch(function (err) {
          toast("Xəta", err.message, true);
        });
    }, { once: true });
  }

  function table(title, cols, rows) {
    return (
      '<section class="data-table"><div class="data-table__head"><h2>' + esc(title) + '</h2></div><div class="table-wrap"><table><thead><tr>' +
      cols.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") +
      '</tr></thead><tbody>' +
      (rows.length
        ? rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("")
        : '<tr><td colspan="' + cols.length + '"><div class="empty-state" style="border:none;box-shadow:none"><i class="fa-solid fa-box-open"></i><p>Məlumat yoxdur</p></div></td></tr>') +
      "</tbody></table></div></section>"
    );
  }

  function openModal(title, html, wide) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    var modalEl = modalBackdrop.querySelector(".modal");
    if (modalEl) modalEl.classList.toggle("modal--lg", !!wide);
    modalBackdrop.removeAttribute("hidden");
  }

  function closeModal() {
    modalBackdrop.setAttribute("hidden", "");
    state.productDraft = null;
    state.productSubmitId = null;
    modalBody.removeEventListener("click", handleAction);
  }

  function closeSidebar() {
    if (adminShell) adminShell.classList.remove("is-sidebar-open");
    if (sidebarOverlay) sidebarOverlay.setAttribute("hidden", "");
  }

  function openSidebar() {
    if (adminShell) adminShell.classList.add("is-sidebar-open");
    if (sidebarOverlay) sidebarOverlay.removeAttribute("hidden");
  }

  function productForm(p, isEdit) {
    p = p || {};
    isEdit = !!isEdit;
    var images = Array.isArray(p.images) && p.images.length ? p.images.slice() : (p.image_url ? [p.image_url] : []);
    var basePrice = p.base_price != null ? p.base_price : p.price || "";
    var discount = p.discount_percent != null ? p.discount_percent : 0;
    var cat = categoryMeta(p.category_slug, (state.categories.find(function (c) { return c.slug === p.category_slug; }) || {}).name);

    state.productDraft = {
      images: images.map(function (url) { return { url: url, remote: true }; }),
      coverIndex: 0,
      pendingFiles: [],
      categorySlug: p.category_slug || "",
      categoryName: cat.name || "",
    };

    return (
      '<form class="modal-form product-form" id="productForm" data-edit="' + (isEdit ? "1" : "0") + '" method="post" action="#" onsubmit="return false;">' +
      '<section class="pf-section">' +
      '<div class="pf-section__head"><span class="pf-step">1</span><div><strong>Məhsul şəkilləri</strong><p>Minimum 3, maksimum 12 şəkil · əsas şəkil qapaq olacaq</p></div></div>' +
      '<div class="img-upload-zone" id="imgUploadZone">' +
      '<input type="file" id="imgFileInput" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>' +
      '<div class="img-upload-zone__inner">' +
      '<span class="img-upload-zone__ico"><i class="fa-solid fa-cloud-arrow-up"></i></span>' +
      '<p>Şəkilləri buraya sürüşdürün və ya <button type="button" class="link-btn" data-action="pick-images">fayl seçin</button></p>' +
      '<span class="field-hint">JPG, PNG, WEBP · hər biri max 5MB</span>' +
      "</div></div>" +
      '<div class="img-grid" id="imgGrid"></div>' +
      '<p class="field-hint img-grid-hint"><i class="fa-solid fa-star"></i> Qapaq şəkli seçmək üçün şəklin üzərinə klik edin</p>' +
      "</section>" +
      '<section class="pf-section">' +
      '<div class="pf-section__head"><span class="pf-step">2</span><div><strong>Əsas məlumatlar</strong><p>Ad, təsvir və kateqoriya</p></div></div>' +
      '<div class="field"><label>Məhsul adı *</label><input name="name" required maxlength="255" placeholder="Məs: Smartfon BizPhone 13 Pro" value="' + esc(p.name || "") + '"></div>' +
      '<div class="field"><label>Təsvir *</label><textarea name="description" required rows="4" placeholder="Məhsul haqqında ətraflı məlumatı əl ilə daxil edin...">' + esc(p.description || "") + "</textarea></div>" +
      '<div class="field"><label>Kateqoriya *</label>' +
      '<button type="button" class="cat-select-btn" id="catSelectBtn" data-action="open-category-picker">' +
      '<span class="cat-select-btn__icon cat-select-btn__icon--' + esc(cat.color) + '"><i class="fa-solid ' + esc(cat.icon) + '"></i></span>' +
      '<span class="cat-select-btn__text" id="catSelectLabel">' + esc(state.productDraft.categoryName || "Kateqoriya seçin") + "</span>" +
      '<i class="fa-solid fa-chevron-right cat-select-btn__chev"></i></button>' +
      '<input type="hidden" name="category_slug" id="categorySlugInput" value="' + esc(p.category_slug || "") + '">' +
      "</div></section>" +
      '<section class="pf-section">' +
      '<div class="pf-section__head"><span class="pf-step">3</span><div><strong>Satış parametrləri</strong><p>Stok, qiymət və endirim</p></div></div>' +
      '<div class="field"><label>Stok sayı *</label><input name="stock" type="number" min="1" step="1" required placeholder="Məs: 25" value="' + esc(p.stock != null ? p.stock : "") + '">' +
      '<span class="field-hint">Bu satış üçün ayrılan məhsul sayını yazın</span></div>' +
      '<div class="form-row">' +
      '<div class="field"><label>Qiymət (₼) *</label><input name="base_price" type="number" min="0.01" step="0.01" required placeholder="0.00" value="' + esc(basePrice) + '"></div>' +
      '<div class="field"><label>Endirim (%)</label><input name="discount_percent" type="number" min="0" max="90" step="1" value="' + esc(discount) + '"></div>' +
      "</div>" +
      '<div class="price-preview" id="pricePreview"><i class="fa-solid fa-tags"></i><span>Satış qiyməti: <strong>₼ 0</strong></span></div>' +
      "</section>" +
      (isEdit
        ? ""
        : '<section class="pf-section pf-section--terms">' +
          '<label class="terms-check">' +
          '<input type="checkbox" name="accept_terms" required>' +
          '<span class="terms-check__box"></span>' +
          '<span class="terms-check__text"><a href="../pages/istifade-sertleri/index.html" target="_blank" rel="noopener">Satıcı şərtləri</a> və ' +
          '<a href="../pages/gizlilik-siyaseti/index.html" target="_blank" rel="noopener">Məxfilik siyasəti</a>ni oxudum və qəbul edirəm *</span>' +
          "</label></section>") +
      '<div class="page-actions product-form__actions">' +
      '<button type="button" class="btn" data-action="close-modal">Ləğv</button>' +
      '<button type="button" class="btn btn--primary" id="productSubmitBtn" data-action="submit-product"><i class="fa-solid fa-paper-plane"></i> Adminə göndər</button>' +
      "</div></form>" +
      '<div class="cat-picker-backdrop" id="catPickerBackdrop" hidden>' +
      '<div class="cat-picker" role="dialog" aria-modal="true" aria-label="Kateqoriya seçimi">' +
      '<div class="cat-picker__head"><h3>Kateqoriya seçin</h3><button type="button" class="modal__close" data-action="close-category-picker" aria-label="Bağla"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="cat-picker__search-wrap"><i class="fa-solid fa-magnifying-glass"></i><input type="search" id="catSearchInput" placeholder="Kateqoriya axtar..." autocomplete="off"></div>' +
      '<div class="cat-picker__grid" id="catPickerGrid"></div></div></div>'
    );
  }

  function renderImageGrid() {
    var grid = document.getElementById("imgGrid");
    var draft = state.productDraft;
    if (!grid || !draft) return;
    var total = draft.images.length + draft.pendingFiles.length;
    grid.innerHTML = draft.images
      .map(function (img, i) {
        var isCover = draft.coverIndex === i;
        return (
          '<div class="img-thumb' + (isCover ? " img-thumb--cover" : "") + '" data-index="' + i + '" data-action="set-cover">' +
          '<img src="' + esc(productImgSrc(img.url)) + '" alt="">' +
          (isCover ? '<span class="img-thumb__badge"><i class="fa-solid fa-star"></i> Qapaq</span>' : "") +
          '<button type="button" class="img-thumb__remove" data-action="remove-image" data-index="' + i + '" aria-label="Sil"><i class="fa-solid fa-xmark"></i></button></div>'
        );
      })
      .join("");
    draft.pendingFiles.forEach(function (file, j) {
      var idx = draft.images.length + j;
      var wrap = document.createElement("div");
      wrap.className = "img-thumb img-thumb--loading";
      wrap.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i><span>Yüklənir...</span>';
      grid.appendChild(wrap);
    });
    var zone = document.getElementById("imgUploadZone");
    if (zone) zone.classList.toggle("is-full", total >= 12);
  }

  function renderCategoryPicker(filter) {
    var grid = document.getElementById("catPickerGrid");
    if (!grid) return;
    var q = (filter || "").trim().toLowerCase();
    var items = state.categories.filter(function (c) {
      return !q || c.name.toLowerCase().indexOf(q) >= 0 || c.slug.toLowerCase().indexOf(q) >= 0;
    });
    grid.innerHTML = items.length
      ? items
          .map(function (c) {
            var m = categoryMeta(c.slug, c.name);
            var active = state.productDraft && state.productDraft.categorySlug === c.slug;
            return (
              '<button type="button" class="cat-picker__item' + (active ? " is-active" : "") + '" data-action="pick-category" data-slug="' +
              esc(c.slug) + '" data-name="' + esc(c.name) + '">' +
              '<span class="cat-picker__icon cat-picker__icon--' + esc(m.color) + '"><i class="fa-solid ' + esc(m.icon) + '"></i></span>' +
              '<span class="cat-picker__name">' + esc(c.name) + "</span></button>"
            );
          })
          .join("")
      : '<div class="cat-picker__empty"><i class="fa-solid fa-folder-open"></i><p>Kateqoriya tapılmadı</p></div>';
  }

  function updateCategoryButton() {
    var draft = state.productDraft;
    if (!draft) return;
    var label = document.getElementById("catSelectLabel");
    var input = document.getElementById("categorySlugInput");
    var btn = document.getElementById("catSelectBtn");
    var m = categoryMeta(draft.categorySlug, draft.categoryName);
    if (label) label.textContent = draft.categoryName || "Kateqoriya seçin";
    if (input) input.value = draft.categorySlug || "";
    if (btn) {
      var icon = btn.querySelector(".cat-select-btn__icon");
      if (icon) {
        icon.className = "cat-select-btn__icon cat-select-btn__icon--" + m.color;
        icon.innerHTML = '<i class="fa-solid ' + m.icon + '"></i>';
      }
    }
  }

  function updatePricePreview() {
    var form = document.getElementById("productForm");
    var preview = document.getElementById("pricePreview");
    if (!form || !preview) return;
    var base = Number(form.querySelector('[name="base_price"]').value) || 0;
    var discount = Math.min(90, Math.max(0, Number(form.querySelector('[name="discount_percent"]').value) || 0));
    var sale = discount > 0 ? Math.round(base * (100 - discount)) / 100 : base;
    preview.innerHTML =
      '<i class="fa-solid fa-tags"></i><span>Satış qiyməti: <strong>₼ ' +
      (sale > 0 ? sale.toFixed(2) : "0.00") +
      "</strong>" +
      (discount > 0 ? ' <em class="price-preview__old">₼ ' + base.toFixed(2) + " · -" + discount + "%</em>" : "") +
      "</span>";
  }

  function addImageFiles(files) {
    var draft = state.productDraft;
    if (!draft || !files || !files.length) return;
    var total = draft.images.length + draft.pendingFiles.length;
    var allowed = 12 - total;
    if (allowed <= 0) {
      toast("Limit", "Maksimum 12 şəkil yükləyə bilərsiniz", true);
      return;
    }
    var batch = Array.prototype.slice.call(files, 0, allowed);
    if (files.length > allowed) toast("Diqqət", "Yalnız " + allowed + " şəkil əlavə edildi (max 12)", true);
    draft.pendingFiles = draft.pendingFiles.concat(batch);
    renderImageGrid();
    API.uploadImages(batch)
      .then(function (res) {
        var urls = res.urls || [];
        urls.forEach(function (url) {
          draft.images.push({ url: url, remote: true });
        });
        draft.pendingFiles = draft.pendingFiles.filter(function (f) {
          return batch.indexOf(f) < 0;
        });
        if (draft.coverIndex >= draft.images.length) draft.coverIndex = 0;
        renderImageGrid();
      })
      .catch(function (err) {
        draft.pendingFiles = draft.pendingFiles.filter(function (f) {
          return batch.indexOf(f) < 0;
        });
        renderImageGrid();
        toast("Xəta", err.message, true);
      });
  }

  function staffEditForm(member) {
    var role = member.role === "manager" ? "manager" : "staff";
    var perms = member.permissions || ROLE_DEFAULT_PERMS[role];
    return (
      '<form class="modal-form" id="staffEditForm">' +
      '<div class="field"><label>Ad</label><input type="text" disabled value="' + esc(member.name || member.email || "") + '"></div>' +
      '<div class="field"><label>Vəzifə</label><select name="role" id="staffEditRole">' +
      '<option value="staff"' + (role === "staff" ? " selected" : "") + '>İşçi</option>' +
      '<option value="manager"' + (role === "manager" ? " selected" : "") + '>Müdir müavini</option></select></div>' +
      '<div class="field"><label>İcazələr</label>' + permissionsFieldHtml(perms, "edit") + "</div>" +
      '<div class="page-actions" style="margin-top:16px"><button type="button" class="btn" data-action="close-modal">Ləğv</button>' +
      '<button type="submit" class="btn btn--primary"><i class="fa-solid fa-check"></i> Yadda saxla</button></div></form>'
    );
  }

  function staffForm() {
    return (
      '<form class="modal-form" id="staffForm">' +
      '<div class="field"><label>Email *</label><input name="email" type="email" required placeholder="isci@example.com"></div>' +
      '<div class="field"><label>Ad</label><input name="name" placeholder="Ad Soyad"></div>' +
      '<div class="field"><label>Vəzifə</label><select name="role" id="staffInviteRole"><option value="staff">İşçi</option><option value="manager">Müdir müavini</option></select></div>' +
      '<div class="field"><label>İcazələr</label>' + permissionsFieldHtml(ROLE_DEFAULT_PERMS.staff, "invite") + "</div>" +
      '<div class="page-actions" style="margin-top:16px"><button type="button" class="btn" data-action="close-modal">Ləğv</button><button type="submit" class="btn btn--primary"><i class="fa-solid fa-paper-plane"></i> Dəvət göndər</button></div></form>'
    );
  }

  function loadCategories() {
    return API.categories().then(function (d) { state.categories = d.categories || []; });
  }

  function loadRoute(route) {
    if (state.pendingOnly) return;
    state.route = route;
    workspace.innerHTML = loadingHtml();
    closeSidebar();
    document.querySelectorAll(".nav-item").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-route") === route);
    });
    var label = (navItems.find(function (i) { return i[0] === route; }) || navItems[0])[1];
    breadcrumb.innerHTML = "Buykon / <strong>" + esc(label) + "</strong>";

    var promise;
    if (route === "dashboard") promise = API.dashboard();
    else if (route === "products") promise = API.products();
    else if (route === "feedback") promise = Promise.all([API.reviews(), API.complaints()]).then(function (r) { return { reviews: r[0].reviews, complaints: r[1].complaints }; });
    else if (route === "questions") promise = API.questions();
    else if (route === "notifications") promise = API.notifications();
    else if (route === "staff") promise = API.staff();
    else if (route === "settings") promise = API.profile();
    else promise = API.dashboard();

    promise
      .then(function (data) {
        state.data = data || {};
        if (data.store) state.store = data.store;
        updateStoreHead(state.store);
        if (route === "dashboard") workspace.innerHTML = renderDashboard(data);
        else if (route === "products") workspace.innerHTML = renderProducts(data);
        else if (route === "feedback") workspace.innerHTML = renderFeedback(data);
        else if (route === "questions") workspace.innerHTML = renderQuestions(data);
        else if (route === "notifications") workspace.innerHTML = renderNotifications(data);
        else if (route === "staff") workspace.innerHTML = renderStaff(data);
        else if (route === "settings") {
          workspace.innerHTML = renderSettings(data);
          bindSettingsForm();
        }
      })
      .catch(function (err) {
        workspace.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h3>Xəta</h3><p>' + esc(err.message) + '</p><button class="btn btn--primary" data-action="reload">Yenidən cəhd et</button></div>';
      });
  }

  function handleAction(e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    var id = btn.getAttribute("data-id");

    if (action === "reload") { loadRoute(state.route); return; }
    if (action === "close-modal") { closeModal(); return; }
    if (action === "copy-invite") {
      var url = btn.getAttribute("data-url") || "";
      if (!url) { toast("Xəta", "Dəvət linki tapılmadı", true); return; }
      copyText(url)
        .then(function () { toast("Kopyalandı", "Dəvət linki buferə köçürüldü"); })
        .catch(function () { toast("Link", url); });
      return;
    }
    if (action === "remove-logo") {
      API.removeLogo().then(function (res) {
        if (res.store) state.store = res.store;
        updateStoreHead(state.store);
        toast("Silindi", "Profil şəkli silindi");
        loadRoute("settings");
      }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "freeze-store") {
      if (!confirm("Mağazanı dondurmaq istəyirsiniz? Məhsullar saytda görünməyəcək.")) return;
      API.freezeStore().then(function (res) {
        if (res.store) state.store = res.store;
        updateStoreHead(state.store);
        toast("Donduruldu", res.message || "Mağaza donduruldu");
        loadRoute("settings");
      }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "unfreeze-store") {
      API.unfreezeStore().then(function (res) {
        if (res.store) state.store = res.store;
        updateStoreHead(state.store);
        toast("Aktiv", res.message || "Mağaza aktiv edildi");
        loadRoute("settings");
      }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "delete-store") {
      deleteStoreModal();
      return;
    }
    if (action === "tab-reviews") { state.feedbackTab = "reviews"; loadRoute("feedback"); return; }
    if (action === "tab-complaints") { state.feedbackTab = "complaints"; loadRoute("feedback"); return; }
    if (action === "read-notif" && id) {
      API.readNotification(id).then(function () { loadRoute("notifications"); });
      return;
    }
    if (action === "invite-staff") {
      openModal("İşçi dəvət et", staffForm());
      var inviteForm = document.getElementById("staffForm");
      var inviteRole = document.getElementById("staffInviteRole");
      if (inviteRole) {
        inviteRole.addEventListener("change", function () {
          applyRoleDefaults(inviteForm, inviteRole.value);
        });
      }
      inviteForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var fd = new FormData(ev.target);
        API.inviteStaff({
          email: fd.get("email"),
          name: fd.get("name"),
          role: fd.get("role"),
          permissions: readPermissionsFromForm(inviteForm),
        })
          .then(function (r) {
            toast("Uğurlu", r.message || "Dəvət göndərildi");
            if (r.invite_url) {
              var inviteUrl = API.normalizeExternalStoreUrl
                ? API.normalizeExternalStoreUrl(r.invite_url)
                : r.invite_url;
              copyText(inviteUrl)
                .then(function () { toast("Link kopyalandı", "Dəvət linki buferə köçürüldü"); })
                .catch(function () { toast("Dəvət linki", inviteUrl); });
            }
            closeModal();
            loadRoute("staff");
          })
          .catch(function (err) { toast("Xəta", err.message, true); });
      }, { once: true });
      return;
    }
    if (action === "remove-staff" && id) {
      if (!confirm("İşçini silmək istəyirsiniz?")) return;
      API.removeStaff(id).then(function () { toast("Silindi", "İşçi silindi"); loadRoute("staff"); }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "edit-staff" && id) {
      var staffMember = (state.data.staff || []).find(function (s) { return String(s.id) === String(id); });
      if (!staffMember) { toast("Xəta", "İşçi tapılmadı", true); return; }
      openModal("İşçini redaktə et", staffEditForm(staffMember));
      var editForm = document.getElementById("staffEditForm");
      var editRole = document.getElementById("staffEditRole");
      if (editRole) {
        editRole.addEventListener("change", function () {
          applyRoleDefaults(editForm, editRole.value);
        });
      }
      editForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var fd = new FormData(ev.target);
        API.updateStaff(id, { role: fd.get("role"), permissions: readPermissionsFromForm(editForm) })
          .then(function () { toast("Uğurlu", "İşçi yeniləndi"); closeModal(); loadRoute("staff"); })
          .catch(function (err) { toast("Xəta", err.message, true); });
      }, { once: true });
      return;
    }
    if (action === "reply-review" && id) {
      var reply = prompt("Rəyə cavabınız:");
      if (!reply || !reply.trim()) return;
      API.replyReview(id, reply.trim()).then(function () { toast("Uğurlu", "Cavab yazıldı"); loadRoute("feedback"); }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "answer-question" && id) {
      var ans = prompt("Cavabınız:");
      if (!ans || !ans.trim()) return;
      API.answerQuestion(id, ans.trim()).then(function () { toast("Uğurlu", "Cavab yazıldı"); loadRoute("questions"); }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "publish-question" && id) {
      API.publishQuestion(id).then(function () { toast("Açıq", "Sual hamıya açıldı"); loadRoute("questions"); }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "add-product") {
      openModal("Yeni məhsul", productForm(null, false), true);
      bindProductForm(null);
      return;
    }
    if (action === "edit-product" && id) {
      API.product(id).then(function (r) {
        openModal("Məhsulu redaktə et", productForm(r.product, true), true);
        bindProductForm(id);
      });
      return;
    }
    if (action === "submit-product") {
      submitProductForm();
      return;
    }
    if (action === "pick-images") {
      var input = document.getElementById("imgFileInput");
      if (input) input.click();
      return;
    }
    if (action === "open-category-picker") {
      var backdrop = document.getElementById("catPickerBackdrop");
      if (backdrop) {
        renderCategoryPicker("");
        var search = document.getElementById("catSearchInput");
        if (search) search.value = "";
        backdrop.removeAttribute("hidden");
        if (search) search.focus();
      }
      return;
    }
    if (action === "close-category-picker") {
      var cp = document.getElementById("catPickerBackdrop");
      if (cp) cp.setAttribute("hidden", "");
      return;
    }
    if (action === "pick-category") {
      if (state.productDraft) {
        state.productDraft.categorySlug = btn.getAttribute("data-slug") || "";
        state.productDraft.categoryName = btn.getAttribute("data-name") || "";
        updateCategoryButton();
      }
      var cp2 = document.getElementById("catPickerBackdrop");
      if (cp2) cp2.setAttribute("hidden", "");
      return;
    }
    if (action === "set-cover") {
      var thumb = btn.closest(".img-thumb");
      if (thumb && state.productDraft) {
        state.productDraft.coverIndex = Number(thumb.getAttribute("data-index")) || 0;
        renderImageGrid();
      }
      return;
    }
    if (action === "remove-image") {
      e.stopPropagation();
      var idx = Number(btn.getAttribute("data-index"));
      if (state.productDraft && !isNaN(idx)) {
        state.productDraft.images.splice(idx, 1);
        if (state.productDraft.coverIndex >= state.productDraft.images.length) {
          state.productDraft.coverIndex = Math.max(0, state.productDraft.images.length - 1);
        }
        renderImageGrid();
      }
      return;
    }
    if (action === "delete-product" && id) {
      var reason = prompt("Silinmə səbəbini yazın:");
      if (!reason || !reason.trim()) return;
      API.deleteProduct(id, reason.trim()).then(function () { toast("Uğurlu", "Silinmə sorğusu göndərildi"); loadRoute("products"); }).catch(function (err) { toast("Xəta", err.message, true); });
    }
  }

  function bindProductForm(id) {
    var form = document.getElementById("productForm");
    if (!form) return;

    state.productSubmitId = id || null;

    // Submit listener ilk növbədə bağlanır — digər bind-lər xəta versə belə form GET etməsin
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      e.stopPropagation();
      submitProductForm();
    });

    renderImageGrid();
    updatePricePreview();
    updateCategoryButton();

    var fileInput = document.getElementById("imgFileInput");
    var uploadZone = document.getElementById("imgUploadZone");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        addImageFiles(fileInput.files);
        fileInput.value = "";
      });
    }
    if (uploadZone) {
      uploadZone.addEventListener("dragover", function (e) {
        e.preventDefault();
        uploadZone.classList.add("is-dragover");
      });
      uploadZone.addEventListener("dragleave", function () {
        uploadZone.classList.remove("is-dragover");
      });
      uploadZone.addEventListener("drop", function (e) {
        e.preventDefault();
        uploadZone.classList.remove("is-dragover");
        addImageFiles(e.dataTransfer && e.dataTransfer.files);
      });
      uploadZone.addEventListener("click", function (e) {
        if (e.target.closest("[data-action=pick-images]") || e.target.closest(".img-thumb")) return;
        if (uploadZone.classList.contains("is-full")) return;
        if (fileInput) fileInput.click();
      });
    }

    var catSearch = document.getElementById("catSearchInput");
    if (catSearch) {
      catSearch.addEventListener("input", function () {
        renderCategoryPicker(catSearch.value);
      });
    }

    var catBackdrop = document.getElementById("catPickerBackdrop");
    if (catBackdrop) {
      catBackdrop.addEventListener("click", function (e) {
        if (e.target === catBackdrop || e.target.closest("[data-action=close-category-picker]")) {
          catBackdrop.setAttribute("hidden", "");
        }
      });
    }

    var baseInput = form.querySelector('[name="base_price"]');
    var discInput = form.querySelector('[name="discount_percent"]');
    if (baseInput) baseInput.addEventListener("input", updatePricePreview);
    if (discInput) discInput.addEventListener("input", updatePricePreview);

    modalBody.addEventListener("click", handleAction);
  }

  function submitProductForm() {
    var form = document.getElementById("productForm");
    if (!form) return;
    if (typeof form.reportValidity === "function" && !form.reportValidity()) return;

    var draft = state.productDraft;
    if (!draft || draft.pendingFiles.length) {
      toast("Gözləyin", "Şəkillər hələ yüklənir", true);
      return;
    }
    if (draft.images.length < 3) {
      toast("Xəta", "Minimum 3 şəkil yükləyin", true);
      return;
    }
    if (!form.querySelector('[name="category_slug"]').value) {
      toast("Xəta", "Kateqoriya seçin", true);
      return;
    }
    var terms = form.querySelector('[name="accept_terms"]');
    if (terms && !terms.checked) {
      toast("Xəta", "Satıcı şərtlərini qəbul edin", true);
      return;
    }

    var fd = new FormData(form);
    var payload = {
      name: fd.get("name"),
      category_slug: fd.get("category_slug"),
      description: fd.get("description"),
      stock: Number(fd.get("stock")) || 0,
      base_price: Number(fd.get("base_price")),
      discount_percent: Number(fd.get("discount_percent")) || 0,
      images: draft.images.map(function (img) { return img.url; }),
      cover_index: draft.coverIndex,
    };
    var id = state.productSubmitId;
    var submitBtn = document.getElementById("productSubmitBtn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Göndərilir...';
    }
    (id ? API.updateProduct(id, payload) : API.createProduct(payload))
      .then(function (res) {
        toast("Uğurlu", res.message || "Göndərildi");
        closeModal();
        loadRoute("products");
      })
      .catch(function (err) {
        toast("Xəta", err.message || "Məhsul göndərilmədi", true);
      })
      .finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Adminə göndər';
        }
      });
  }

  function init() {
    renderNav();
    Promise.all([loadCategories(), API.session()])
      .then(function (results) {
        var sess = results[1];
        if (!API.enforcePanelAccess(sess)) return;
        state.session = sess;
        state.store = (sess.seller || sess.user || {});
        state.permissions = sess.permissions || null;
        state.isOwner = !sess.staff;
        updateBrandHead(sess);
        renderNav();
        if (isStorePending(state.store)) {
          showPendingMode(state.store);
          return;
        }
        loadRoute((location.hash || "#dashboard").replace("#", ""));
      })
      .catch(function () { window.location.replace(API.loginUrl()); });

    sideNav.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-route]");
      if (!btn) return;
      location.hash = btn.getAttribute("data-route");
      loadRoute(btn.getAttribute("data-route"));
    });
    workspace.addEventListener("click", handleAction);
    modalBackdrop.addEventListener("click", function (e) {
      if (e.target === modalBackdrop || e.target.closest("[data-action=close-modal]")) closeModal();
    });
    window.addEventListener("hashchange", function () {
      if (!state.pendingOnly) loadRoute((location.hash || "#dashboard").replace("#", ""));
    });
    document.getElementById("logoutBtn").addEventListener("click", function () {
      API.logout().finally(function () {
        var slug = state.session && state.session.store_slug;
        window.location.href = API.loginUrl(slug);
      });
    });

    var openBtn = document.getElementById("sidebarOpen");
    var closeBtn = document.getElementById("sidebarClose");
    if (openBtn) openBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);
  }

  init();
})();
