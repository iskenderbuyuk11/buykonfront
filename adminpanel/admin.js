(function () {
  "use strict";

  var shell = document.getElementById("adminShell");
  var workspace = document.getElementById("workspace");
  var sideNav = document.getElementById("sideNav");
  var breadcrumb = document.getElementById("breadcrumb");
  var modalBackdrop = document.getElementById("modalBackdrop");
  var modalPanel = document.getElementById("modalPanel");
  var modalTitle = document.getElementById("modalTitle");
  var modalBody = document.getElementById("modalBody");
  var modalFoot = document.getElementById("modalFoot");
  var toastStack = document.getElementById("toastStack");

  var navItems = [
    ["dashboard", "Dashboard", "fa-gauge-high"],
    ["vendor-applications", "Mağaza sorğuları", "fa-inbox"],
    ["stores", "Mağazalar", "fa-store"],
    ["products", "Məhsul qəbulu", "fa-clipboard-check"],
    ["catalog", "Məhsullar", "fa-box"],
    ["reviews", "Rəy moderasiyası", "fa-star"],
    ["orders", "Sifarişlər", "fa-bag-shopping"],
    ["categories", "Kateqoriyalar", "fa-layer-group"],
    ["campaigns", "Kuponlar", "fa-ticket"],
    ["stories", "Hekayələr", "fa-circle-play"],
    ["reward-wheel", "Şans çarxı", "fa-gift"],
    ["settings", "Ayarlar", "fa-gear"],
    ["security", "Əməliyyat jurnalı", "fa-clock-rotate-left"]
  ];

  var labelMap = {
    "Umumi gelir": "Ümumi gəlir",
    "Umumi sifaris": "Ümumi sifariş",
    "Gozleyen sifaris": "Gözləyən sifariş",
    "Tamamlanan sifaris": "Tamamlanan sifariş",
    "Aktiv saticilar": "Aktiv satıcılar",
    "Umumi musteri": "Ümumi müştəri",
    "Aktiv mehsul": "Aktiv məhsul",
    "Tesdiq gozleyir": "Təsdiq gözləyir",
    "Aktiv satici": "Aktiv satıcı",
    "Gozleyen muraciet": "Gözləyən müraciət",
    "Cemi sorğu": "Cəmi sorğu",
    "Aktiv magaza": "Aktiv mağaza",
    "Mehdud magaza": "Məhdud mağaza",
    "Orta reytinq": "Orta reytinq",
    "Cemi satici": "Cəmi satıcı",
    "Sikayet": "Şikayət",
    "Umumi stok": "Ümumi stok",
    "Cemi mehsul": "Cəmi məhsul",
    "Yeni mehsul": "Yeni məhsul",
    "Deyisiklik": "Dəyişiklik",
    "Silinme sorğusu": "Silinmə sorğusu",
    "Tesdiq gozleyir": "Təsdiq gözləyir",
    "Aktiv": "Aktiv",
    "Sikayet var": "Şikayət var",
    "Moderasiya": "Moderasiya",
    "Gozleyir": "Gözləyir",
    "Yoxlamada": "Yoxlamada",
    "Mehdud": "Məhdud",
    "Verified": "Təsdiqlənib",
    "Sened gozleyir": "Sənəd gözləyir",
    "Risk yoxlamasi": "Risk yoxlaması",
    "VOEN ilə": "VOEN ilə",
    "VOEN-siz": "VOEN-siz",
    "Onlayn mağaza": "Onlayn mağaza"
  };

  var state = { route: "dashboard", data: {}, navCounts: {} };

  var routeLoaders = {
    dashboard: function () { return BizdeAdminAPI.dashboard(); },
    "vendor-applications": function () { return BizdeAdminAPI.vendorApplications(); },
    stores: function () { return BizdeAdminAPI.stores(); },
    products: function () { return BizdeAdminAPI.products(); },
    catalog: function () { return BizdeAdminAPI.catalogProducts(); },
    reviews: function () { return BizdeAdminAPI.pendingReviews(); },
    categories: function () { return BizdeAdminAPI.categories(); },
    orders: function () { return BizdeAdminAPI.orders(); },
    campaigns: function () { return BizdeAdminAPI.campaigns(); },
    stories: function () { return BizdeAdminAPI.stories(); },
    "reward-wheel": function () {
      function localWheelData(offline) {
        var cfg = window.BuykonWheelConfig ? BuykonWheelConfig.get() : { requirements: [], prizes: [] };
        return { config: cfg, offline: !!offline };
      }
      if (!window.BizdeAdminAPI || typeof BizdeAdminAPI.wheelConfig !== "function") {
        return Promise.resolve(localWheelData(true));
      }
      return BizdeAdminAPI.wheelConfig()
        .then(function (d) {
          var cfg = d && d.config ? d.config : null;
          if (window.BuykonWheelConfig && cfg) {
            cfg = BuykonWheelConfig.sanitize(cfg);
            if (typeof BuykonWheelConfig.apply === "function") BuykonWheelConfig.apply(cfg);
          }
          return { config: cfg || (window.BuykonWheelConfig ? BuykonWheelConfig.get() : { requirements: [], prizes: [] }), offline: false };
        })
        .catch(function () {
          return localWheelData(true);
        });
    },
    settings: function () {
      return BizdeAdminAPI.settings().then(function (d) {
        var terms = window.BuykonTerms ? BuykonTerms.getDefault() : null;
        var rows = (d && d.settings) || [];
        var row = rows.find(function (s) {
          return s && (s.key === "terms_of_use" || s.key === "legal_terms");
        });
        if (row && row.value && window.BuykonTerms) {
          var parsed = BuykonTerms.parseMaybeJson(row.value);
          if (parsed) terms = BuykonTerms.normalize(parsed);
        } else if (window.BuykonTerms) {
          var local = BuykonTerms.readLocal();
          if (local) terms = local;
        }
        d.terms = terms;
        return d;
      });
    },
    security: function () { return BizdeAdminAPI.auditLogs(); }
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeLabel(s) {
    return labelMap[s] || s;
  }

  function productImgSrc(url) {
    if (!url) return "";
    var s = String(url).trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s) || s.indexOf("data:") === 0 || s.indexOf("blob:") === 0) {
      return s;
    }
    if (window.BizdevarSiteConfig && typeof BizdevarSiteConfig.resolveMediaUrl === "function") {
      var via = BizdevarSiteConfig.resolveMediaUrl(s);
      if (via && (/^https?:\/\//i.test(via) || via.indexOf("data:") === 0)) return via;
    }
    var path = s.replace(/^\/+/, "");
    if (path.indexOf("uploads/") === 0) {
      var base = (window.BizdeAdminAPI && BizdeAdminAPI.baseUrl) || "";
      var origin = String(base).replace(/\/api\/?$/, "");
      return origin + "/" + path;
    }
    return "../" + path;
  }

  function storyImgSrc(url) {
    return productImgSrc(url);
  }

  function cacheBust(url, hint) {
    var src = productImgSrc(url);
    if (!src) return "";
    var sep = src.indexOf("?") >= 0 ? "&" : "?";
    return src + sep + "t=" + encodeURIComponent(String(hint || Date.now()));
  }

  function formatEventLabel(raw) {
    var key = String(raw == null ? "" : raw).trim();
    if (!key) return "—";
    var map = {
      story_create: "Story kartı yaradıldı",
      story_created: "Story kartı yaradıldı",
      story_update: "Story kartı yeniləndi",
      story_updated: "Story kartı yeniləndi",
      story_delete: "Story kartı silindi",
      story_deleted: "Story kartı silindi",
      product_approve: "Məhsul qəbul edildi",
      product_approved: "Məhsul qəbul edildi",
      product_reject: "Məhsul rədd edildi",
      product_rejected: "Məhsul rədd edildi",
      product_update: "Məhsul yeniləndi",
      product_updated: "Məhsul yeniləndi",
      product_delete: "Məhsul silindi",
      product_deleted: "Məhsul silindi",
      product_create: "Məhsul əlavə edildi",
      products_bulk_approve: "Bütün məhsullar qəbul edildi",
      bulk_approve_products: "Bütün məhsullar qəbul edildi",
      vendor_approve: "Mağaza təsdiqləndi",
      vendor_approved: "Mağaza təsdiqləndi",
      vendor_reject: "Mağaza rədd edildi",
      vendor_rejected: "Mağaza rədd edildi",
      vendor_suspend: "Mağaza dayandırıldı",
      vendor_suspended: "Mağaza dayandırıldı",
      store_approve: "Mağaza təsdiqləndi",
      store_reject: "Mağaza rədd edildi",
      order_update: "Sifariş yeniləndi",
      order_status: "Sifariş statusu dəyişdi",
      order_status_update: "Sifariş statusu dəyişdi",
      review_approve: "Rəy təsdiqləndi",
      review_reject: "Rəy rədd edildi",
      category_create: "Kateqoriya yaradıldı",
      category_update: "Kateqoriya yeniləndi",
      category_delete: "Kateqoriya silindi",
      coupon_create: "Kupon yaradıldı",
      coupon_update: "Kupon yeniləndi",
      coupon_delete: "Kupon silindi",
      campaign_create: "Kampaniya yaradıldı",
      setting_update: "Ayar yeniləndi",
      settings_update: "Ayar yeniləndi",
      wheel_update: "Şans çarxı yeniləndi",
      wheel_config_update: "Şans çarxı yeniləndi",
      admin_login: "Admin daxil oldu",
      admin_logout: "Admin çıxış etdi",
      admin_invite: "Admin dəvət edildi"
    };
    if (map[key]) return map[key];
    var lower = key.toLowerCase();
    if (map[lower]) return map[lower];
    return key
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function formatMoney(val, label) {
    if (label) return label;
    if (val == null || val === "") return "—";
    var n = Number(val);
    if (!isNaN(n)) return "₼ " + n.toFixed(2);
    return esc(String(val));
  }

  function collectProductImages(p) {
    var list = [];
    function add(url) {
      if (!url) return;
      var u = String(url).trim();
      if (!u || list.indexOf(u) !== -1) return;
      list.push(u);
    }
    add(p.image_url);
    if (Array.isArray(p.images)) p.images.forEach(add);
    return list;
  }

  function metaRow(label, value) {
    return "<div><dt>" + esc(label) + "</dt><dd>" + value + "</dd></div>";
  }

  function renderProductDetailHtml(p) {
    var images = collectProductImages(p);
    var cover = images[0] || "";
    var thumbs = images.map(function (url, i) {
      return '<button type="button" class="product-gallery__thumb' + (i === 0 ? " is-active" : "") + '" data-gallery-src="' + esc(productImgSrc(url)) + '">' +
        '<img src="' + esc(productImgSrc(url)) + '" alt="Şəkil ' + (i + 1) + '"></button>';
    }).join("");

    var gallery = images.length
      ? '<div class="product-gallery"><div class="product-gallery__main">' +
        (cover ? '<img id="productGalleryMain" src="' + esc(productImgSrc(cover)) + '" alt="' + esc(p.name) + '">' : "") +
        '</div><div class="product-gallery__thumbs">' + thumbs + "</div></div>"
      : '<div class="product-gallery product-gallery--empty"><i class="fa-solid fa-image"></i><span>Şəkil yoxdur</span></div>';

    var allImagesHtml = images.length
      ? '<section class="product-detail-section"><h3>Bütün şəkillər <span class="section-count">(' + images.length + ")</span></h3>" +
        '<div class="product-images-grid">' + images.map(function (url, i) {
          return '<button type="button" class="product-images-grid__item' + (i === 0 ? " is-active" : "") + '" data-gallery-src="' + esc(productImgSrc(url)) + '">' +
            '<img src="' + esc(productImgSrc(url)) + '" alt="Şəkil ' + (i + 1) + '"><span>' + (i + 1) + "</span></button>";
        }).join("") + "</div></section>"
      : "";

    var priceBlock = '<div class="product-price-block">';
    if (p.discount_percent > 0 && p.base_price_label) {
      priceBlock += '<span class="product-price-block__old">' + esc(p.base_price_label) + "</span>";
      priceBlock += '<span class="product-price-block__sale">' + formatMoney(p.price, p.price_label) + "</span>";
      priceBlock += '<span class="product-price-block__badge">-' + esc(String(p.discount_percent)) + "%</span>";
    } else {
      priceBlock += '<span class="product-price-block__sale">' + formatMoney(p.price, p.price_label) + "</span>";
    }
    priceBlock += "</div>";

    var specs = p.specs && typeof p.specs === "object" ? Object.keys(p.specs) : [];
    var specsHtml = specs.length
      ? '<section class="product-detail-section"><h3>Xüsusiyyətlər</h3><dl class="product-specs">' +
        specs.map(function (k) {
          return "<div><dt>" + esc(k) + "</dt><dd>" + esc(p.specs[k]) + "</dd></div>";
        }).join("") + "</dl></section>"
      : "";

    var alerts = "";
    if (p.rejection_reason) {
      alerts += '<div class="product-alert product-alert--danger"><i class="fa-solid fa-circle-xmark"></i><div><strong>Rədd səbəbi</strong><span>' + esc(p.rejection_reason) + "</span></div></div>";
    }
    if (p.deletion_reason) {
      alerts += '<div class="product-alert product-alert--warning"><i class="fa-solid fa-trash"></i><div><strong>Silinmə səbəbi</strong><span>' + esc(p.deletion_reason) + "</span></div></div>";
    }

    return '<div class="product-detail">' + alerts +
      '<div class="product-detail__top">' + gallery +
      '<div class="product-detail__info">' +
      '<div class="product-detail__badges">' +
      badge(normalizeLabel(p.status_label || p.status), p.status_type || "info") +
      (p.moderation_label && p.moderation_label !== "—" ? badge(normalizeLabel(p.moderation_label), "warning") : "") +
      "</div>" +
      "<h3 class=\"product-detail__name\">" + esc(p.name) + "</h3>" +
      priceBlock +
      '<dl class="product-meta">' +
      "<div><dt>Mağaza</dt><dd>" + esc(p.vendor || "—") + "</dd></div>" +
      "<div><dt>Kateqoriya</dt><dd>" + esc(p.category_name || p.category_slug || "—") + "</dd></div>" +
      "<div><dt>Stok</dt><dd>" + esc(String(p.stock != null ? p.stock : "—")) + " ədəd</dd></div>" +
      "<div><dt>Məhsul ID</dt><dd>#" + esc(String(p.id || "")) + "</dd></div>" +
      (p.created_at ? "<div><dt>Əlavə tarixi</dt><dd>" + esc(p.created_at) + "</dd></div>" : "") +
      "</dl></div></div>" +
      '<section class="product-detail-section"><h3>Təsvir</h3><div class="product-description">' +
      (p.description ? esc(p.description) : '<span class="empty-inline">Təsvir daxil edilməyib</span>') +
      "</div></section>" + allImagesHtml + specsHtml + "</div>";
  }

  function renderVendorDetailHtml(v) {
    var initials = String(v.name || "?").split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
    var alerts = "";
    if (v.rejection_reason) {
      alerts += '<div class="product-alert product-alert--danger"><i class="fa-solid fa-circle-xmark"></i><div><strong>Rədd səbəbi</strong><span>' + esc(v.rejection_reason) + "</span></div></div>";
    }

    return '<div class="vendor-detail">' + alerts +
      '<div class="vendor-detail__hero">' +
      '<div class="vendor-detail__avatar">' + esc(initials) + "</div>" +
      '<div class="vendor-detail__head">' +
      '<div class="product-detail__badges">' +
      badge(normalizeLabel(v.status_label || v.status), v.status_type || "info") +
      badge(normalizeLabel(v.verification_label || v.verification_status), v.verification_type || "warning") +
      "</div>" +
      "<h3 class=\"product-detail__name\">" + esc(v.name || "—") + "</h3>" +
      '<p class="vendor-detail__sub">' + esc(v.store_type_label || v.store_type || "—") + " · " + esc(v.category || "—") + "</p>" +
      "</div></div>" +
      '<div class="vendor-detail__sections">' +
      '<section class="vendor-detail__card"><h3><i class="fa-solid fa-user"></i> Mağaza sahibi</h3><dl class="product-meta">' +
      metaRow("Ad, soyad", esc(v.owner_name || "—")) +
      metaRow("Qeydiyyat emaili", esc(v.email || "—")) +
      metaRow("Telefon", esc(v.phone || "—")) +
      "</dl></section>" +
      '<section class="vendor-detail__card"><h3><i class="fa-solid fa-store"></i> Mağaza məlumatları</h3><dl class="product-meta">' +
      metaRow("Mağaza adı", esc(v.name || "—")) +
      metaRow("Kateqoriya", esc(v.category || "—")) +
      metaRow("Mağaza növü", esc(v.store_type_label || v.store_type || "—")) +
      metaRow("VÖEN", esc(v.voen || "—")) +
      metaRow("Mağaza ID", "#" + esc(String(v.id || ""))) +
      (v.auto_named ? metaRow("Avtomatik ad", "Bəli") : "") +
      "</dl></section>" +
      '<section class="vendor-detail__card"><h3><i class="fa-solid fa-chart-line"></i> Statistika</h3><dl class="product-meta">' +
      metaRow("Gəlir", esc(v.revenue_label || String(v.revenue || "—"))) +
      metaRow("Reytinq", esc(String(v.rating || "—"))) +
      metaRow("Məhsul sayı", esc(String(v.product_count != null ? v.product_count : "—"))) +
      "</dl></section>" +
      '<section class="vendor-detail__card"><h3><i class="fa-solid fa-calendar"></i> Qeydiyyat</h3><dl class="product-meta">' +
      metaRow("Müraciət tarixi", esc(v.registered_at || v.created_at || "—")) +
      (v.approved_at ? metaRow("Təsdiq tarixi", esc(v.approved_at)) : "") +
      (v.rejected_at ? metaRow("Rədd tarixi", esc(v.rejected_at)) : "") +
      (v.seller_status_label ? metaRow("Satıcı statusu", esc(normalizeLabel(v.seller_status_label))) : "") +
      "</dl></section>" +
      "</div></div>";
  }

  function setGalleryImage(src) {
    var main = document.getElementById("productGalleryMain");
    if (main && src) main.src = src;
    modalBody.querySelectorAll("[data-gallery-src]").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-gallery-src") === src);
    });
  }

  function bindProductGallery() {
    modalBody.querySelectorAll("[data-gallery-src]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setGalleryImage(btn.getAttribute("data-gallery-src"));
      });
    });
  }

  function badge(label, type) {
    return '<span class="badge ' + esc(type || "neutral") + '">' + esc(label) + "</span>";
  }

  function entity(name, sub) {
    var initials = String(name || "?").split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
    return '<div class="entity"><span class="entity__logo">' + initials + '</span><span><strong>' + esc(name) + '</strong><small>' + esc(sub) + '</small></span></div>';
  }

  function toast(title, text, isError) {
    var item = document.createElement("div");
    item.className = "toast" + (isError ? " toast--error" : "");
    item.innerHTML = "<strong>" + esc(title) + "</strong><span>" + esc(text) + "</span>";
    toastStack.appendChild(item);
    setTimeout(function () { item.remove(); }, 4000);
  }

  function pageHead(title, desc, actions) {
    return '<section class="page-head"><div class="page-title"><h1>' + esc(title) + '</h1><p>' + esc(desc) + '</p></div><div class="page-actions">' + (actions || "") + '</div></section>';
  }

  function reloadBtn() {
    return '<button class="btn btn--icon-outline" type="button" data-action="reload" title="Siyahını yenilə" aria-label="Yenilə"><i class="fa-solid fa-rotate"></i></button>';
  }

  function rowActionBtns(editAction, deleteAction, idAttr, idVal) {
    return '<span class="row-actions">' +
      '<button class="btn btn--icon-outline" type="button" data-action="' + editAction + '" ' + idAttr + '="' + esc(String(idVal)) + '" title="Düzənlə" aria-label="Düzənlə"><i class="fa-solid fa-pen"></i></button>' +
      '<button class="btn btn--icon-outline btn--icon-danger" type="button" data-action="' + deleteAction + '" ' + idAttr + '="' + esc(String(idVal)) + '" title="Sil" aria-label="Sil"><i class="fa-solid fa-trash"></i></button>' +
      "</span>";
  }

  function metricCards(items) {
    items = items || [];
    if (!items.length) {
      return '<section class="metrics-grid"><article class="metric"><span class="metric__label">Məlumat yoxdur</span><div class="metric__value">—</div></article></section>';
    }
    return '<section class="metrics-grid">' + items.map(function (m) {
      var label = normalizeLabel(m.label || m[0]);
      var value = m.value || m[1];
      var hint = m.hint || m[2] || "";
      return '<article class="metric"><span class="metric__label">' + esc(label) + '</span><div class="metric__value">' + esc(value) + '</div>' +
        (hint && hint !== "—" && hint !== "-" ? '<span class="metric__hint">' + esc(hint) + '</span>' : '') + '</article>';
    }).join("") + "</section>";
  }

  function table(title, cols, rows, actions) {
    rows = rows || [];
    return '<section class="data-table"><div class="data-table__head"><h2>' + esc(title) + '</h2><div class="table-actions">' + (actions || "") + '</div></div><div class="table-wrap"><table><thead><tr>' +
      cols.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") +
      '</tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") : '<tr><td colspan="' + cols.length + '">Məlumat yoxdur</td></tr>') +
      "</tbody></table></div></section>";
  }

  function activities(list) {
    list = list || [];
    if (!list.length) return '<p class="empty-inline">Hələ qeyd yoxdur</p>';
    return '<div class="activity-list">' + list.map(function (a) {
      var title = formatEventLabel(a.title || a.event || a[0]);
      var text = a.text || a.detail || a[1] || "";
      return '<div class="activity"><span class="activity__dot"></span><div><strong>' + esc(title) + '</strong><span>' + esc(text) + '</span></div><time>' + esc(a.time || a.created_at || a[2] || "") + '</time></div>';
    }).join("") + "</div>";
  }

  function rowMenu(id, items) {
    var html = '<div class="row-menu"><button type="button" class="row-menu__trigger" data-action="toggle-row-menu" aria-label="Əməliyyatlar">' +
      '<i class="fa-solid fa-ellipsis-vertical"></i></button><div class="row-menu__dropdown" hidden>';
    items.forEach(function (item) {
      if (item.divider) {
        html += '<hr class="row-menu__divider">';
        return;
      }
      html += '<button type="button" class="row-menu__item' + (item.danger ? " row-menu__item--danger" : "") + '" data-action="' + item.action + '" data-id="' + esc(String(id)) + '">';
      if (item.icon) html += '<i class="fa-solid ' + item.icon + '"></i>';
      html += esc(item.label) + "</button>";
    });
    return html + "</div></div>";
  }

  function applicationMenu(v) {
    return rowMenu(v.id, [
      { action: "vendor-detail", label: "Ətraflı bax", icon: "fa-eye" },
      { action: "approve-vendor", label: "Təsdiqlə", icon: "fa-check" },
      { divider: true },
      { action: "reject-vendor", label: "Rədd et", icon: "fa-xmark", danger: true }
    ]);
  }

  function storeMenu(v) {
    var items = [
      { action: "vendor-detail", label: "Ətraflı bax", icon: "fa-eye" }
    ];
    if (v.raw_status === "active") {
      items.push({ divider: true });
      items.push({ action: "suspend-vendor", label: "Dayandır", icon: "fa-ban", danger: true });
    }
    return rowMenu(v.id, items);
  }

  function productMenu(p) {
    return rowMenu(p.id, [
      { action: "product-detail", label: "Ətraflı bax", icon: "fa-eye" },
      { action: "approve-product", label: "Qəbul et", icon: "fa-check" },
      { action: "reject-product", label: "Rədd et", icon: "fa-xmark", danger: true }
    ]);
  }

  function catalogProductMenu(p) {
    return rowMenu(p.id, [
      { action: "product-detail", label: "Ətraflı bax", icon: "fa-eye" },
      { action: "view-product-site", label: "Saytda bax", icon: "fa-arrow-up-right-from-square" },
      { action: "edit-product", label: "Düzənlə", icon: "fa-pen" },
      { divider: true },
      { action: "delete-product", label: "Sil", icon: "fa-trash", danger: true }
    ]);
  }

  function productSiteUrl(p) {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.productPageUrl === "function") {
      return cfg.productPageUrl(p, "../");
    }
    if (p && p.slug) return "../pages/product/?=" + encodeURIComponent(p.slug);
    return "../pages/product/?id=" + encodeURIComponent(String((p && p.id) || ""));
  }

  function productThumb(p) {
    var images = collectProductImages(p || {});
    var src = images[0] ? productImgSrc(images[0]) : "";
    if (src) {
      return '<div class="entity entity--product"><span class="entity__thumb"><img src="' + esc(src) + '" alt=""></span><span><strong>' +
        esc(p.name || "—") + "</strong><small>" + esc(p.vendor || p.vendor_name || "—") + "</small></span></div>";
    }
    return entity(p.name, p.vendor || p.vendor_name || "—");
  }

  function orderMenu(id) {
    return rowMenu(id, [
      { action: "order-detail", label: "Ətraflı bax", icon: "fa-eye" }
    ]);
  }

  function renderNav() {
    sideNav.innerHTML = navItems.map(function (item) {
      var count = state.navCounts[item[0]];
      return '<button class="nav-item" type="button" data-route="' + item[0] + '">' +
        '<i class="fa-solid ' + item[2] + '"></i>' +
        '<span class="nav-label">' + esc(item[1]) + '</span>' +
        (count ? '<span class="nav-count">' + count + "</span>" : "") +
        "</button>";
    }).join("");
  }

  function pendingQueue() {
    var applications = state.navCounts["vendor-applications"] || 0;
    var products = state.navCounts.products || 0;
    if (!applications && !products) return "";
    var html = '<section class="queue-grid">';
    if (applications) {
      html += '<a class="queue-card" href="#vendor-applications" data-route="vendor-applications"><i class="fa-solid fa-inbox"></i><strong>' + applications + '</strong><span>Mağaza sorğusu gözləyir</span></a>';
    }
    if (products) {
      html += '<a class="queue-card" href="#products" data-route="products"><i class="fa-solid fa-clipboard-check"></i><strong>' + products + '</strong><span>Məhsul qəbulu gözləyir</span></a>';
    }
    return html + "</section>";
  }

  function renderDashboard(d) {
    var orderRows = (d.latest_orders || []).map(function (o) {
      return "<tr><td>" + entity("#" + (o.id || ""), "Sifariş") + "</td><td>" + esc(o.customer) + "</td><td>" + esc(o.total) + "</td><td>" + badge(o.status, o.status_type) + "</td><td>" + orderMenu(o.id) + "</td></tr>";
    }).join("");
    var ordersTable = '<div class="table-wrap"><table><thead><tr><th>Sifariş</th><th>Müştəri</th><th>Məbləğ</th><th>Status</th><th></th></tr></thead><tbody>' +
      (orderRows || '<tr><td colspan="5">Sifariş yoxdur</td></tr>') + "</tbody></table></div>";
    return pageHead("Dashboard", "Marketplace icmalı və gözləyən işlər.", reloadBtn()) +
      metricCards(d.metrics) +
      pendingQueue() +
      '<section class="grid-2">' +
      '<div class="panel"><div class="panel__head"><h2>Son sifarişlər</h2></div>' + ordersTable + '</div>' +
      '<div class="panel"><div class="panel__head"><h2>Son hadisələr</h2></div>' + activities(d.activities) + "</div></section>";
  }

  function renderVendorApplications(d) {
    var rows = (d.applications || []).map(function (v) {
      return [
        entity(v.name, v.category),
        badge(v.verification, v.verification_type),
        badge(v.status, v.status_type),
        esc(v.created_at || "—"),
        applicationMenu(v)
      ];
    });
    return pageHead("Mağaza sorğuları", "Yeni müraciətləri yoxlayın, təsdiqləyin və ya rədd edin.", reloadBtn()) +
      metricCards(d.metrics) +
      table("Gözləyən müraciətlər", ["Mağaza", "Sənəd yoxlaması", "Status", "Tarix", ""], rows);
  }

  function renderStores(d) {
    var rows = (d.stores || []).map(function (v) {
      return [
        entity(v.name, v.category),
        badge(v.status, v.status_type),
        esc(v.revenue),
        esc(v.rating),
        storeMenu(v)
      ];
    });
    return pageHead("Mağazalar", "Təsdiqlənmiş və aktiv mağazaların siyahısı.", reloadBtn()) +
      metricCards(d.metrics) +
      table("Mağaza siyahısı", ["Mağaza", "Status", "Gəlir", "Reytinq", ""], rows);
  }

  function renderProducts(d) {
    var rows = (d.products || []).map(function (p) {
      return [
        entity(p.name, p.vendor),
        esc(p.price),
        esc(String(p.stock)),
        badge(normalizeLabel(p.status), p.status_type),
        productMenu(p)
      ];
    });
    return pageHead("Məhsul qəbulu", "Gözləyən məhsulları yoxlayın və qəbul edin.", reloadBtn() +
      ' <button class="btn btn--icon-outline" type="button" data-action="bulk-approve-products" title="Gözləyən bütün məhsulları bir klikdə qəbul edir" aria-label="Hamısını qəbul et"><i class="fa-solid fa-check-double"></i></button>') +
      metricCards(d.metrics) +
      table("Qəbul gözləyənlər", ["Məhsul", "Qiymət", "Stok", "Status", ""], rows);
  }

  function renderCatalog(d) {
    var list = d.products || d.items || [];
    var rows = list.map(function (p) {
      return [
        productThumb(p),
        esc(p.price_label || p.price || "—"),
        esc(String(p.stock != null ? p.stock : "—")),
        badge(normalizeLabel(p.status_label || p.status || "—"), p.status_type || "neutral"),
        catalogProductMenu(p)
      ];
    });
    return pageHead("Məhsullar", "Saytdakı məhsulları idarə edin: baxın, düzənləyin və ya silin.", reloadBtn()) +
      metricCards(d.metrics) +
      '<div class="catalog-toolbar">' +
      '<label class="catalog-search"><i class="fa-solid fa-magnifying-glass"></i>' +
      '<input type="search" id="catalogSearch" placeholder="Məhsul və ya mağaza axtar..." autocomplete="off" /></label>' +
      '<span class="catalog-count" id="catalogCount">' + list.length + " məhsul</span></div>" +
      table("Məhsul siyahısı", ["Məhsul", "Qiymət", "Stok", "Status", ""], rows);
  }

  function renderOrders(d) {
    var statusLabels = {
      placed: "Yerləşdirildi",
      packing: "Qablaşdırılır",
      cargo: "Karqoda",
      delivering: "Çatdırılır",
      delivered: "Çatdırıldı",
      cancelled: "Ləğv edildi"
    };
    var rows = (d.orders || []).map(function (o) {
      var id = o.id || "";
      var opts = ["placed", "packing", "cargo", "delivering", "delivered", "cancelled"].map(function (s) {
        return '<option value="' + s + '"' + (o.raw_status === s ? " selected" : "") + ">" + (statusLabels[s] || s) + "</option>";
      }).join("");
      var statusCell = '<div class="status-cell">' + badge(o.status, o.status_type) +
        '<select class="select select--inline" data-action="order-status" data-id="' + esc(id) + '" aria-label="Status dəyiş">' + opts + "</select></div>";
      return [
        entity("#" + id, "Sifariş"),
        esc(o.customer),
        esc(o.seller),
        esc(o.total),
        statusCell,
        orderMenu(id)
      ];
    });
    return pageHead("Sifarişlər", "Sifariş statusunu dəyişin və detallara baxın.", reloadBtn()) +
      metricCards(d.metrics) +
      table("Sifariş cədvəli", ["Sifariş", "Müştəri", "Satıcı", "Məbləğ", "Status", ""], rows);
  }

  function renderGenericModule(title, desc, d, rowMap, cols, extraActions) {
    var rows = rowMap(d);
    return pageHead(title, desc, extraActions || reloadBtn()) +
      metricCards(d.metrics) + table(title, cols, rows);
  }

  /* ---------- Şans çarxı ---------- */
  function wheelIcoCell(key) {
    return '<span class="wheel-ico">' + (window.BuykonWheelConfig ? BuykonWheelConfig.icon(key, 20) : "") + "</span>";
  }

  function renderRewardWheel(d) {
    if (!window.BuykonWheelConfig) {
      return pageHead("Şans çarxı", "Konfiqurasiya modulu tapılmadı.", reloadBtn()) +
        '<p class="empty-inline">wheel-config.js yüklənmədi.</p>';
    }
    var cfg = d.config || BuykonWheelConfig.get();
    if (typeof BuykonWheelConfig.sanitize === "function") cfg = BuykonWheelConfig.sanitize(cfg);
    var types = BuykonWheelConfig.REQ_TYPES;
    var offlineNote = d.offline
      ? '<section class="wheel-note wheel-note--warn"><i class="fa-solid fa-triangle-exclamation"></i> Server konfiqurasiyası hələ aktiv deyil — brauzer yaddaşından göstərilir. Dəyişikliklər yerli saxlanır; backend deploy edildikdən sonra avtomatik sinxronlaşacaq.</section>'
      : '<section class="wheel-note"><i class="fa-solid fa-circle-info"></i> Dəyişikliklər serverə yadda saxlanır və dərhal ana səhifədəki çarxa tətbiq olunur.</section>';

    var reqRows = cfg.requirements.map(function (r, i) {
      var t = types[r.type] || {};
      return [
        wheelIcoCell(r.icon),
        entity(r.title, t.label || r.type),
        esc(String(r.target)) + (t.unit ? " " + t.unit : ""),
        badge(r.enabled !== false ? "Aktiv" : "Deaktiv", r.enabled !== false ? "success" : "neutral"),
        rowActionBtns("wheel-edit-req", "wheel-del-req", "data-index", i)
      ];
    });

    var prizeRows = cfg.prizes.map(function (p, i) {
      return [
        wheelIcoCell(p.icon),
        entity(p.label, p.short),
        badge(p.tone === "orange" ? "Narıncı" : "Krem", "neutral"),
        esc(String(p.weight || 1)),
        p.respin ? badge("Respin", "success") : "—",
        rowActionBtns("wheel-edit-prize", "wheel-del-prize", "data-index", i)
      ];
    });

    return pageHead("Şans çarxı", "Ana səhifədəki çarxın şərtlərini və hədiyyələrini idarə edin.",
      '<button class="btn btn--icon-outline" type="button" data-action="wheel-reset" title="Standart konfiqurasiyaya qaytarır" aria-label="Standarta qaytar"><i class="fa-solid fa-rotate-left"></i></button> ' + reloadBtn()) +
      offlineNote +
      table("Şərtlər", ["İkon", "Şərt", "Hədəf", "Status", ""], reqRows,
        '<button class="btn btn--primary" type="button" data-action="wheel-add-req"><i class="fa-solid fa-plus"></i> Şərt əlavə et</button>') +
      table("Hədiyyələr", ["İkon", "Hədiyyə", "Rəng", "Şans", "Respin", ""], prizeRows,
        '<button class="btn btn--primary" type="button" data-action="wheel-add-prize"><i class="fa-solid fa-plus"></i> Hədiyyə əlavə et</button>');
  }

  function wheelIconOptions(selected) {
    return BuykonWheelConfig.iconKeys().map(function (k) {
      return '<option value="' + k + '"' + (k === selected ? " selected" : "") + ">" + k + "</option>";
    }).join("");
  }

  function wheelReqTypeOptions(selected) {
    var types = BuykonWheelConfig.REQ_TYPES;
    return Object.keys(types).map(function (k) {
      return '<option value="' + k + '"' + (k === selected ? " selected" : "") + ">" + esc(types[k].label) + "</option>";
    }).join("");
  }

  function openWheelReqModal(cfg) {
    var r = cfg.req || { type: "cart_count", title: "", target: 1, icon: "bag", enabled: true };
    var body =
      '<form class="modal-form" id="wheelReqForm">' +
      '<label class="form-field"><span class="form-field__label">Şərt tipi</span>' +
      '<select class="input" id="wf-type">' + wheelReqTypeOptions(r.type) + "</select></label>" +
      '<label class="form-field"><span class="form-field__label">Başlıq</span>' +
      '<input class="input" id="wf-title" value="' + esc(r.title) + '" maxlength="80" placeholder="Məs: 1 məhsul səbətinə əlavə et" required /></label>' +
      '<label class="form-field"><span class="form-field__label">Hədəf</span>' +
      '<input class="input" id="wf-target" type="number" min="1" value="' + esc(String(r.target)) + '" /></label>' +
      '<label class="form-field"><span class="form-field__label">İkon</span>' +
      '<div class="wheel-icon-pick"><select class="input" id="wf-icon">' + wheelIconOptions(r.icon) + "</select>" +
      '<span class="wheel-ico wheel-ico--lg" id="wf-icon-preview"></span></div></label>' +
      '<label class="form-field"><span class="form-field__label">Status</span>' +
      '<select class="input" id="wf-enabled"><option value="1"' + (r.enabled !== false ? " selected" : "") + ">Aktiv</option><option value=\"0\"" + (r.enabled === false ? " selected" : "") + ">Deaktiv</option></select></label>" +
      "</form>";

    var footer = '<button type="button" class="btn" data-modal-action="cancel">Ləğv et</button>' +
      '<button type="button" class="btn btn--primary" data-modal-action="submit">Yadda saxla</button>';
    openModal(cfg.title, body, { variant: "form", footer: footer });

    var typeSel = document.getElementById("wf-type");
    var targetInput = document.getElementById("wf-target");
    var iconSel = document.getElementById("wf-icon");
    var iconPrev = document.getElementById("wf-icon-preview");
    function syncIcon() { iconPrev.innerHTML = BuykonWheelConfig.icon(iconSel.value, 22); }
    function syncType() {
      var t = BuykonWheelConfig.REQ_TYPES[typeSel.value] || {};
      if (t.fixedTarget != null) {
        targetInput.value = t.fixedTarget;
        targetInput.disabled = true;
      } else {
        targetInput.disabled = false;
      }
    }
    iconSel.addEventListener("change", syncIcon);
    typeSel.addEventListener("change", syncType);
    syncIcon();
    syncType();

    modalFoot.onclick = function (e) {
      var btn = e.target.closest("[data-modal-action]");
      if (!btn) return;
      if (btn.getAttribute("data-modal-action") === "cancel") { closeModal(); return; }
      var title = String(document.getElementById("wf-title").value).trim();
      if (!title) { toast("Diqqət", "Başlıq daxil edin", true); return; }
      var out = {
        type: typeSel.value,
        title: title,
        target: Math.max(1, Number(targetInput.value) || 1),
        icon: iconSel.value,
        enabled: document.getElementById("wf-enabled").value === "1"
      };
      btn.disabled = true;
      Promise.resolve(cfg.onSubmit(out)).then(function () {
        closeModal();
        if (cfg.onSuccess) cfg.onSuccess();
      }).catch(function (err) { toast("Xəta", err.message, true); btn.disabled = false; });
    };
  }

  function openWheelPrizeModal(cfg) {
    var p = cfg.prize || { label: "", short: "", icon: "gift", tone: "orange", weight: 1, xp: 30, respin: false };
    var body =
      '<form class="modal-form" id="wheelPrizeForm">' +
      '<label class="form-field"><span class="form-field__label">Hədiyyə adı</span>' +
      '<input class="input" id="wp-label" value="' + esc(p.label) + '" maxlength="40" placeholder="Məs: 10% Endirim" required /></label>' +
      '<label class="form-field"><span class="form-field__label">Qısa mətn (çarxda görünür)</span>' +
      '<input class="input" id="wp-short" value="' + esc(p.short) + '" maxlength="16" placeholder="Məs: 10%" required /></label>' +
      '<label class="form-field"><span class="form-field__label">İkon</span>' +
      '<div class="wheel-icon-pick"><select class="input" id="wp-icon">' + wheelIconOptions(p.icon) + "</select>" +
      '<span class="wheel-ico wheel-ico--lg" id="wp-icon-preview"></span></div></label>' +
      '<label class="form-field"><span class="form-field__label">Rəng</span>' +
      '<select class="input" id="wp-tone"><option value="orange"' + (p.tone !== "cream" ? " selected" : "") + ">Narıncı</option><option value=\"cream\"" + (p.tone === "cream" ? " selected" : "") + ">Krem</option></select></label>" +
      '<label class="form-field"><span class="form-field__label">Qazanma şansı (çəki)</span>' +
      '<span class="form-field__hint">Böyük rəqəm = daha tez-tez düşür</span>' +
      '<input class="input" id="wp-weight" type="number" min="0" step="0.5" value="' + esc(String(p.weight || 1)) + '" /></label>' +
      '<label class="form-field"><span class="form-field__label">XP mükafatı</span>' +
      '<input class="input" id="wp-xp" type="number" min="0" value="' + esc(String(p.xp != null ? p.xp : 30)) + '" /></label>' +
      '<label class="form-field"><span class="form-field__label">Yenidən fırlatma hüququ</span>' +
      '<select class="input" id="wp-respin"><option value="0"' + (!p.respin ? " selected" : "") + ">Xeyr</option><option value=\"1\"" + (p.respin ? " selected" : "") + ">Bəli</option></select></label>" +
      "</form>";

    var footer = '<button type="button" class="btn" data-modal-action="cancel">Ləğv et</button>' +
      '<button type="button" class="btn btn--primary" data-modal-action="submit">Yadda saxla</button>';
    openModal(cfg.title, body, { variant: "form", footer: footer });

    var iconSel = document.getElementById("wp-icon");
    var iconPrev = document.getElementById("wp-icon-preview");
    function syncIcon() { iconPrev.innerHTML = BuykonWheelConfig.icon(iconSel.value, 22); }
    iconSel.addEventListener("change", syncIcon);
    syncIcon();

    modalFoot.onclick = function (e) {
      var btn = e.target.closest("[data-modal-action]");
      if (!btn) return;
      if (btn.getAttribute("data-modal-action") === "cancel") { closeModal(); return; }
      var label = String(document.getElementById("wp-label").value).trim();
      var short = String(document.getElementById("wp-short").value).trim();
      if (!label || !short) { toast("Diqqət", "Ad və qısa mətn daxil edin", true); return; }
      var out = {
        label: label,
        short: short,
        icon: iconSel.value,
        tone: document.getElementById("wp-tone").value === "cream" ? "cream" : "orange",
        weight: Math.max(0, Number(document.getElementById("wp-weight").value)) || 1,
        xp: Math.max(0, Number(document.getElementById("wp-xp").value)) || 0,
        respin: document.getElementById("wp-respin").value === "1"
      };
      btn.disabled = true;
      Promise.resolve(cfg.onSubmit(out)).then(function () {
        closeModal();
        if (cfg.onSuccess) cfg.onSuccess();
      }).catch(function (err) { toast("Xəta", err.message, true); btn.disabled = false; });
    };
  }

  function renderPage() {
    var d = state.data;
    switch (state.route) {
      case "dashboard": return renderDashboard(d);
      case "vendor-applications": return renderVendorApplications(d);
      case "stores": return renderStores(d);
      case "products": return renderProducts(d);
      case "catalog": return renderCatalog(d);
      case "reviews":
        return pageHead("Rəy moderasiyası", "Müştəri rəylərini təsdiqləyin və ya rədd edin.", reloadBtn()) +
          table("Gözləyən rəylər", ["Məhsul", "Mağaza", "Rəy", "Ulduz", ""], (d.reviews || []).map(function (r) {
            return [
              esc(r.product_name || "—"),
              esc(r.vendor_name || "—"),
              esc((r.text || "").slice(0, 120)),
              esc(String(r.stars || 0)),
              '<button class="btn" type="button" data-action="approve-review" data-id="' + esc(String(r.id)) + '"><i class="fa-solid fa-check"></i></button> ' +
              '<button class="btn btn--danger" type="button" data-action="reject-review" data-id="' + esc(String(r.id)) + '"><i class="fa-solid fa-xmark"></i></button>'
            ];
          }));
      case "orders": return renderOrders(d);
      case "categories":
        return renderGenericModule("Kateqoriyalar", "Kateqoriya siyahısı və yeni əlavə.", d, function (x) {
          return (x.categories || []).map(function (c) {
            return [entity(c.name, c.slug), esc(String(c.product_count)), badge(c.status, c.status_type), "—"];
          });
        }, ["Kateqoriya", "Məhsul sayı", "Status", ""],
          '<button class="btn" type="button" data-action="create-category"><i class="fa-solid fa-plus"></i> Yeni kateqoriya</button> ' + reloadBtn());
      case "campaigns":
        return renderGenericModule("Kuponlar", "Endirim kodlarını yaradın və idarə edin.", d, function (x) {
          return (x.coupons || []).map(function (c) {
            return [entity(c.name, "Endirim kodu"), esc(String(c.discount)) + "%", badge(c.status, c.status_type), "—"];
          });
        }, ["Kupon kodu", "Endirim", "Status", ""],
          '<button class="btn" type="button" data-action="create-coupon"><i class="fa-solid fa-plus"></i> Yeni kupon</button> ' + reloadBtn());
      case "stories":
        return pageHead("Hekayələr", "Mobil ana səhifədə görünən story kartları.", '<button class="btn" type="button" data-action="create-story"><i class="fa-solid fa-plus"></i> Yeni story</button> ' + reloadBtn()) +
          table("Story siyahısı", ["Şəkil", "Başlıq", "Sıra", "Status", ""], (d.items || []).map(function (s) {
            var thumb = s.image_url
              ? '<img src="' + esc(cacheBust(s.image_url, s.updated_at || s.id)) + '" alt="" style="width:40px;height:68px;border-radius:10px;object-fit:cover;border:1px solid #e5e7eb;">'
              : "—";
            return [
              thumb,
              entity(s.title || "—", s.link_url || "Link yoxdur"),
              esc(String(s.sort_order != null ? s.sort_order : 0)),
              badge(s.is_active ? "Aktiv" : "Deaktiv", s.is_active ? "success" : "neutral"),
              rowActionBtns("edit-story", "delete-story", "data-id", s.id)
            ];
          }));
      case "reward-wheel":
        return renderRewardWheel(d);
      case "settings":
        return renderSettingsPage(d);
      case "security":
        return renderGenericModule("Əməliyyat jurnalı", "Admin panelində edilən əməliyyatların siyahısı.", d, function (x) {
          return (x.logs || []).map(function (l) {
            return [entity(formatEventLabel(l.event || l.title), l.admin), esc(l.ip), badge(l.status, "success"), esc(l.created_at || "")];
          });
        }, ["Əməliyyat", "Admin", "IP ünvanı", "Tarix"]);
      default:
        return '<p class="empty-inline">Səhifə tapılmadı</p>';
    }
  }

  function getTermsState() {
    if (state.data && state.data.terms) return BuykonTerms.normalize(state.data.terms);
    return BuykonTerms.getDefault();
  }

  function persistTerms(terms, successMsg) {
    var normalized = BuykonTerms.normalize(terms);
    state.data.terms = normalized;
    BuykonTerms.writeLocal(normalized);
    return BizdeAdminAPI.saveTermsOfUse(normalized)
      .then(function () {
        toast("Uğurlu", successMsg || "İstifadə şərtləri yadda saxlandı");
        loadRoute("settings");
      })
      .catch(function (err) {
        // Server endpoint olmasa belə lokal saxlanır və səhifədə görünür
        toast("Yadda saxlandı", "Lokal olaraq yeniləndi. Server: " + (err.message || "əlçatan deyil"));
        workspace.innerHTML = renderPage();
      });
  }

  function renderSettingsPage(d) {
    var terms = BuykonTerms.normalize((d && d.terms) || BuykonTerms.getDefault());
    var otherSettings = ((d && d.settings) || []).filter(function (s) {
      return s && s.key !== "terms_of_use" && s.key !== "legal_terms";
    });

    var sectionRows = terms.sections.map(function (sec, i) {
      return [
        '<span class="terms-index">' + (i + 1) + "</span>",
        entity(sec.title, (sec.bullets && sec.bullets.length ? sec.bullets.length + " bənd" : (sec.paragraphs[0] || "").slice(0, 72))),
        rowActionBtns("terms-edit-section", "terms-delete-section", "data-index", i)
      ];
    });

    var termsPanel =
      '<section class="data-table terms-panel">' +
      '<div class="data-table__head"><h2>İstifadə şərtləri</h2><div class="table-actions">' +
      '<button class="btn" type="button" data-action="terms-edit-meta"><i class="fa-solid fa-pen-to-square"></i> Başlıq / tarix</button> ' +
      '<button class="btn btn--primary" type="button" data-action="terms-add-section"><i class="fa-solid fa-plus"></i> Bölmə əlavə et</button> ' +
      '<button class="btn btn--icon-outline" type="button" data-action="terms-reset" title="Standart müqaviləyə qaytar" aria-label="Sıfırla"><i class="fa-solid fa-rotate-left"></i></button>' +
      "</div></div>" +
      '<div class="terms-meta">' +
      "<div><span>Sənəd</span><strong>" + esc(terms.title) + "</strong></div>" +
      "<div><span>Son yenilənmə</span><strong>" + esc(terms.updated_at) + "</strong></div>" +
      "<div><span>Bölmə sayı</span><strong>" + terms.sections.length + "</strong></div>" +
      "</div>" +
      '<p class="terms-intro-preview">' + esc((terms.intro || "").slice(0, 220)) + ((terms.intro || "").length > 220 ? "…" : "") + "</p>" +
      '<div class="table-wrap"><table><thead><tr><th>#</th><th>Bölmə</th><th></th></tr></thead><tbody>' +
      (sectionRows.length
        ? sectionRows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("")
        : '<tr><td colspan="3">Bölmə yoxdur</td></tr>') +
      "</tbody></table></div>" +
      '<div class="terms-panel__foot"><a class="btn" href="../pages/istifade-sertleri/" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Səhifəyə bax</a></div>' +
      "</section>";

    var otherTable = otherSettings.length
      ? table(
          "Digər ayarlar",
          ["Parametr", "Dəyər", "Status", ""],
          otherSettings.map(function (s) {
            return [
              entity(s.key, s.group),
              esc(String(s.value || "").slice(0, 80)),
              badge(s.status || "Aktiv", "success"),
              '<button class="btn" type="button" data-action="edit-setting" data-key="' +
                esc(s.key) +
                '" data-value="' +
                esc(s.value) +
                '" data-label="' +
                esc(s.key) +
                '"><i class="fa-solid fa-pen"></i> Dəyiş</button>'
            ];
          })
        )
      : "";

    return pageHead("Ayarlar", "Marketplace konfiqurasiyası və hüquqi sənədlər.", reloadBtn()) +
      termsPanel +
      otherTable;
  }

  function openTermsMetaModal() {
    var terms = getTermsState();
    openFormModal({
      title: "Müqavilə məlumatları",
      desc: "Başlıq, tarix və giriş mətnini yeniləyin.",
      submitLabel: "Yadda saxla",
      fields: [
        { name: "title", label: "Başlıq", required: true, value: terms.title },
        { name: "updated_at", label: "Son yenilənmə tarixi", required: true, value: terms.updated_at, placeholder: "21 iyul 2026" },
        { name: "intro", label: "Giriş mətni", type: "textarea", required: true, value: terms.intro }
      ],
      onSubmit: function (data) {
        terms.title = data.title;
        terms.updated_at = data.updated_at;
        terms.intro = data.intro;
        return persistTerms(terms, "Müqavilə məlumatları yeniləndi");
      }
    });
  }

  function openTermsSectionModal(cfg) {
    var sec = cfg.section || { title: "", paragraphs: [], bullets: [], after: [] };
    var bodyHtml =
      '<form class="modal-form" id="termsSectionForm">' +
      '<label class="form-field"><span class="form-field__label">Bölmə başlığı</span>' +
      '<input class="input" name="title" value="' + esc(sec.title || "") + '" required maxlength="160" placeholder="Məs: 1. Platforma haqqında" /></label>' +
      '<label class="form-field"><span class="form-field__label">Paraqraflar</span>' +
      '<textarea class="input" name="paragraphs" rows="5" placeholder="Hər paraqrafı boş sətirlə ayırın">' + esc((sec.paragraphs || []).join("\n\n")) + "</textarea></label>" +
      '<label class="form-field"><span class="form-field__label">Siyahı bəndləri</span>' +
      '<textarea class="input" name="bullets" rows="5" placeholder="Hər sətir bir bənd">' + esc((sec.bullets || []).join("\n")) + "</textarea>" +
      '<span class="form-field__hint">İstəyə bağlıdır. Hər sətir ayrıca bənd kimi yazılır.</span></label>' +
      '<label class="form-field"><span class="form-field__label">Siyahıdan sonra mətn</span>' +
      '<textarea class="input" name="after" rows="3" placeholder="Hər paraqrafı boş sətirlə ayırın">' + esc((sec.after || []).join("\n\n")) + "</textarea></label>" +
      "</form>";

    var footer =
      '<button type="button" class="btn" data-modal-action="cancel">Ləğv et</button>' +
      '<button type="button" class="btn btn--primary" data-modal-action="submit">' + esc(cfg.submitLabel || "Yadda saxla") + "</button>";

    openModal(cfg.title, (cfg.desc ? '<p class="modal-intro">' + esc(cfg.desc) + "</p>" : "") + bodyHtml, {
      variant: "form",
      footer: footer
    });

    modalFoot.onclick = function (e) {
      var btn = e.target.closest("[data-modal-action]");
      if (!btn) return;
      if (btn.getAttribute("data-modal-action") === "cancel") {
        closeModal();
        return;
      }
      var form = document.getElementById("termsSectionForm");
      if (!form.reportValidity()) return;
      var title = String(form.elements.title.value).trim();
      var paragraphs = String(form.elements.paragraphs.value || "")
        .split(/\n{2,}/)
        .map(function (x) { return x.trim(); })
        .filter(Boolean);
      var bullets = String(form.elements.bullets.value || "")
        .split(/\n/)
        .map(function (x) { return x.trim(); })
        .filter(Boolean);
      var after = String(form.elements.after.value || "")
        .split(/\n{2,}/)
        .map(function (x) { return x.trim(); })
        .filter(Boolean);

      var terms = getTermsState();
      var out = {
        id: sec.id || BuykonTerms.slugify(title, cfg.index != null ? cfg.index : terms.sections.length),
        title: title,
        paragraphs: paragraphs,
        bullets: bullets,
        after: after
      };

      btn.disabled = true;
      if (cfg.index == null) terms.sections.push(out);
      else terms.sections[cfg.index] = out;

      Promise.resolve(persistTerms(terms, cfg.successMsg || "Bölmə yadda saxlandı"))
        .then(function () { closeModal(); })
        .catch(function (err) {
          toast("Xəta", err.message, true);
          btn.disabled = false;
        });
    };
  }

  /* --- route loading --- */
  function loadRoute(route) {
    if (!routeLoaders[route]) route = "dashboard";
    state.route = route;
    workspace.innerHTML = '<p class="loading-state">Yüklənir...</p>';
    routeLoaders[route]().then(function (data) {
      state.data = data || {};
      if (data.nav_counts) {
        state.navCounts = data.nav_counts;
        renderNav();
      }
      var label = (navItems.find(function (i) { return i[0] === route; }) || navItems[0])[1];
      document.querySelectorAll(".nav-item").forEach(function (el) {
        el.classList.toggle("is-active", el.getAttribute("data-route") === route);
      });
      breadcrumb.textContent = label;
      workspace.innerHTML = renderPage();
      bindCatalogSearch();
    }).catch(function (err) {
      workspace.innerHTML = '<div class="empty-state"><h3>Xəta</h3><p>' + esc(err.message) + '</p><button class="btn btn--primary" type="button" data-action="reload">Yenidən cəhd et</button></div>';
      toast("Xəta", err.message, true);
    });
  }

  function closeRowMenus() {
    document.querySelectorAll(".row-menu__dropdown").forEach(function (d) { d.hidden = true; });
  }

  function openModal(title, html, options) {
    options = options || {};
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modalPanel.className = "modal" + (options.variant ? " modal--" + options.variant : "");
    if (modalFoot) {
      modalFoot.innerHTML = options.footer || "";
      modalFoot.hidden = !options.footer;
    }
    modalFoot.onclick = options.onFootClick || null;
    modalBackdrop.hidden = false;
  }

  function closeModal() {
    modalBackdrop.hidden = true;
    if (modalFoot) {
      modalFoot.innerHTML = "";
      modalFoot.hidden = true;
      modalFoot.onclick = null;
    }
    modalPanel.className = "modal";
  }

  function openStoryModal(cfg) {
    var story = cfg.story || {};
    var imageUrl = story.image_url || "";
    var uploadPromise = null;
    var bodyHtml =
      '<form class="modal-form" id="storyForm">' +
      '<label class="form-field"><span class="form-field__label">Başlıq</span>' +
      '<input class="input" name="title" value="' + esc(story.title || "") + '" required maxlength="120" placeholder="Məs: Yeni kampaniya" /></label>' +
      '<label class="form-field"><span class="form-field__label">Şəkil</span>' +
      '<input class="input" type="file" id="storyImageFile" accept="image/jpeg,image/png,image/webp,image/gif" ' + (cfg.requireImage ? "required" : "") + " />" +
      '<input type="hidden" name="image_url" id="storyImageUrl" value="' + esc(imageUrl) + '" />' +
      '<p class="form-field__hint" id="storyUploadStatus" hidden></p>' +
      (imageUrl ? '<img id="storyImagePreview" src="' + esc(cacheBust(imageUrl, story.updated_at || story.id || "1")) + '" alt="" style="width:56px;height:96px;border-radius:12px;object-fit:cover;margin-top:10px;border:1px solid #e5e7eb;">' : '<img id="storyImagePreview" alt="" hidden style="width:56px;height:96px;border-radius:12px;object-fit:cover;margin-top:10px;border:1px solid #e5e7eb;">') +
      "</label>" +
      '<label class="form-field"><span class="form-field__label">Keçid linki (istəyə bağlı)</span>' +
      '<input class="input" name="link_url" value="' + esc(story.link_url || "") + '" placeholder="https://buykon.com/..." /></label>' +
      '<label class="form-field"><span class="form-field__label">Sıra nömrəsi</span>' +
      '<input class="input" type="number" name="sort_order" value="' + esc(String(story.sort_order != null ? story.sort_order : 0)) + '" min="0" /></label>' +
      '<label class="form-field"><span class="form-field__label">Status</span>' +
      '<select class="input" name="is_active">' +
      '<option value="1"' + (story.is_active !== false ? " selected" : "") + '>Aktiv</option>' +
      '<option value="0"' + (story.is_active === false ? " selected" : "") + ">Deaktiv</option>" +
      "</select></label></form>";

    var footer = '<button type="button" class="btn" data-modal-action="cancel">Ləğv et</button>' +
      '<button type="button" class="btn btn--primary" data-modal-action="submit">' + esc(cfg.submitLabel || "Yadda saxla") + "</button>";

    openModal(cfg.title, (cfg.desc ? '<p class="modal-intro">' + esc(cfg.desc) + "</p>" : "") + bodyHtml, { variant: "form", footer: footer });

    var fileInput = document.getElementById("storyImageFile");
    var urlInput = document.getElementById("storyImageUrl");
    var preview = document.getElementById("storyImagePreview");
    var statusEl = document.getElementById("storyUploadStatus");

    function extractUploadUrl(res) {
      if (!res) return "";
      return res.url || res.image_url || res.path || res.file_url ||
        (res.data && (res.data.url || res.data.image_url || res.data.path)) || "";
    }

    function setUploadStatus(text, isError) {
      if (!statusEl) return;
      if (!text) {
        statusEl.hidden = true;
        statusEl.textContent = "";
        return;
      }
      statusEl.hidden = false;
      statusEl.textContent = text;
      statusEl.style.color = isError ? "#b91c1c" : "#64748b";
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        setUploadStatus("Şəkil yüklənir...");
        uploadPromise = BizdeAdminAPI.uploadStoryImage(file).then(function (res) {
          var uploaded = String(extractUploadUrl(res) || "").trim();
          if (!uploaded) {
            throw new Error("Server şəkil ünvanı qaytarmadı");
          }
          urlInput.value = uploaded;
          preview.src = cacheBust(uploaded, Date.now());
          preview.hidden = false;
          fileInput.removeAttribute("required");
          setUploadStatus("Şəkil yükləndi");
          return uploaded;
        }).catch(function (err) {
          setUploadStatus(err.message || "Şəkil yüklənmədi", true);
          toast("Xəta", err.message, true);
          uploadPromise = null;
          throw err;
        });
      });
    }

    modalFoot.onclick = function (e) {
      var btn = e.target.closest("[data-modal-action]");
      if (!btn) return;
      if (btn.getAttribute("data-modal-action") === "cancel") {
        closeModal();
        return;
      }
      var form = document.getElementById("storyForm");
      if (!form.reportValidity()) return;

      btn.disabled = true;
      Promise.resolve(uploadPromise)
        .catch(function () { /* upload error already toasted */ })
        .then(function () {
          var payload = {
            title: String(form.elements.title.value).trim(),
            image_url: String(urlInput.value).trim(),
            link_url: String(form.elements.link_url.value).trim(),
            sort_order: Number(form.elements.sort_order.value) || 0,
            is_active: form.elements.is_active.value === "1"
          };
          if (!payload.image_url) {
            toast("Diqqət", "Şəkil yükləyin", true);
            btn.disabled = false;
            return null;
          }
          return Promise.resolve(cfg.onSubmit(payload));
        })
        .then(function (result) {
          if (result === null) return;
          closeModal();
          if (cfg.onSuccess) cfg.onSuccess();
        })
        .catch(function (err) {
          toast("Xəta", err.message, true);
          btn.disabled = false;
        });
    };
  }

  function openFormModal(cfg) {
    var fieldsHtml = cfg.fields.map(function (f) {
      var id = "mf-" + f.name;
      var input;
      if (f.type === "textarea") {
        input = '<textarea class="input input--textarea" id="' + id + '" name="' + f.name + '" rows="4" placeholder="' + esc(f.placeholder || "") + '"' + (f.required ? " required" : "") + ">" + esc(f.value || "") + "</textarea>";
      } else if (f.type === "select") {
        input = '<select class="input" id="' + id + '" name="' + f.name + '"' + (f.required ? " required" : "") + ">" +
          (f.options || []).map(function (opt) {
            var val = typeof opt === "object" ? opt.value : opt;
            var label = typeof opt === "object" ? opt.label : opt;
            return '<option value="' + esc(String(val)) + '"' + (String(f.value) === String(val) ? " selected" : "") + ">" + esc(String(label)) + "</option>";
          }).join("") + "</select>";
      } else {
        input = '<input class="input" type="' + (f.type || "text") + '" id="' + id + '" name="' + f.name + '" value="' + esc(f.value || "") + '" placeholder="' + esc(f.placeholder || "") + '"' + (f.required ? " required" : "") + (f.min != null ? ' min="' + f.min + '"' : "") + (f.max != null ? ' max="' + f.max + '"' : "") + (f.step != null ? ' step="' + f.step + '"' : "") + ">";
      }
      return '<label class="form-field"><span class="form-field__label">' + esc(f.label) + "</span>" +
        (f.hint ? '<span class="form-field__hint">' + esc(f.hint) + "</span>" : "") +
        input + "</label>";
    }).join("");

    var footer = '<button type="button" class="btn" data-modal-action="cancel">Ləğv et</button>' +
      '<button type="button" class="btn ' + (cfg.submitClass || "btn--primary") + '" data-modal-action="submit">' + esc(cfg.submitLabel || "Təsdiqlə") + "</button>";

    openModal(cfg.title, (cfg.desc ? '<p class="modal-intro">' + esc(cfg.desc) + "</p>" : "") +
      '<form class="modal-form" id="modalForm">' + fieldsHtml + "</form>", { variant: "form", footer: footer });

    var form = document.getElementById("modalForm");
    modalFoot.onclick = function (e) {
      var btn = e.target.closest("[data-modal-action]");
      if (!btn) return;
      if (btn.getAttribute("data-modal-action") === "cancel") {
        closeModal();
        return;
      }
      if (!form.reportValidity()) return;
      var data = {};
      cfg.fields.forEach(function (f) {
        var el = form.elements[f.name];
        data[f.name] = el ? String(el.value).trim() : "";
      });
      if (cfg.validate) {
        var err = cfg.validate(data);
        if (err) {
          toast("Diqqət", err, true);
          return;
        }
      }
      btn.disabled = true;
      Promise.resolve(cfg.onSubmit(data)).then(function () {
        closeModal();
        if (cfg.onSuccess) cfg.onSuccess();
      }).catch(function (err) {
        toast("Xəta", err.message, true);
        btn.disabled = false;
      });
    };

    setTimeout(function () {
      var first = form.querySelector("input, textarea, select");
      if (first) first.focus();
    }, 60);
  }

  function openConfirmModal(cfg) {
    var footer = '<button type="button" class="btn" data-modal-action="cancel">Xeyr</button>' +
      '<button type="button" class="btn ' + (cfg.danger ? "btn--danger" : "btn--primary") + '" data-modal-action="submit">' + esc(cfg.confirmLabel || "Bəli, təsdiqlə") + "</button>";
    openModal(cfg.title, '<p class="modal-intro">' + esc(cfg.message) + "</p>", { variant: "confirm", footer: footer });
    modalFoot.onclick = function (e) {
      var btn = e.target.closest("[data-modal-action]");
      if (!btn) return;
      if (btn.getAttribute("data-modal-action") === "cancel") {
        closeModal();
        return;
      }
      btn.disabled = true;
      Promise.resolve(cfg.onConfirm()).then(function () {
        closeModal();
        if (cfg.onSuccess) cfg.onSuccess();
      }).catch(function (err) {
        toast("Xəta", err.message, true);
        btn.disabled = false;
      });
    };
  }

  function rejectReasonModal(title, desc, onSubmit, onSuccess) {
    openFormModal({
      title: title,
      desc: desc,
      submitLabel: "Rədd et",
      submitClass: "btn--danger",
      fields: [{
        name: "reason",
        label: "Rədd səbəbi",
        type: "textarea",
        required: true,
        placeholder: "Məsələn: sənədlər natamamdır, mağaza adı qaydalara uyğun deyil..."
      }],
      validate: function (data) {
        if (data.reason.length < 5) return "Rədd səbəbi ən azı 5 simvol olmalıdır.";
        return "";
      },
      onSubmit: onSubmit,
      onSuccess: onSuccess
    });
  }

  function bindCatalogSearch() {
    var input = document.getElementById("catalogSearch");
    var countEl = document.getElementById("catalogCount");
    if (!input) return;
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      var rows = workspace.querySelectorAll(".data-table tbody tr");
      var visible = 0;
      rows.forEach(function (tr) {
        if (tr.querySelector("td[colspan]")) return;
        var text = (tr.textContent || "").toLowerCase();
        var show = !q || text.indexOf(q) !== -1;
        tr.hidden = !show;
        if (show) visible += 1;
      });
      if (countEl) countEl.textContent = visible + " məhsul";
    });
  }

  function openEditProductModal(p) {
    var basePrice = p.base_price != null ? p.base_price : (p.price != null ? p.price : "");
    openFormModal({
      title: "Məhsulu düzənlə",
      desc: "Dəyişikliklər dərhal sayta tətbiq olunacaq.",
      submitLabel: "Yadda saxla",
      fields: [
        { name: "name", label: "Məhsul adı", required: true, value: p.name || "" },
        { name: "description", label: "Təsvir", type: "textarea", value: p.description || "" },
        { name: "category_slug", label: "Kateqoriya (slug)", value: p.category_slug || "", hint: "Məs: elektronika", placeholder: "elektronika" },
        { name: "stock", label: "Stok", type: "number", min: 0, required: true, value: String(p.stock != null ? p.stock : 0) },
        { name: "base_price", label: "Qiymət (₼)", type: "number", min: 0, step: "0.01", required: true, value: String(basePrice) },
        { name: "discount_percent", label: "Endirim (%)", type: "number", min: 0, max: 90, value: String(p.discount_percent != null ? p.discount_percent : 0) }
      ],
      validate: function (data) {
        if (!data.name) return "Məhsul adı boş ola bilməz.";
        if (Number(data.stock) < 0) return "Stok mənfi ola bilməz.";
        if (!(Number(data.base_price) > 0)) return "Qiymət 0-dan böyük olmalıdır.";
        var disc = Number(data.discount_percent);
        if (isNaN(disc) || disc < 0 || disc > 90) return "Endirim 0–90% arasında olmalıdır.";
        return "";
      },
      onSubmit: function (data) {
        return BizdeAdminAPI.updateProduct(p.id, {
          name: data.name,
          description: data.description,
          category_slug: data.category_slug || undefined,
          stock: Number(data.stock),
          base_price: Number(data.base_price),
          discount_percent: Number(data.discount_percent) || 0
        });
      },
      onSuccess: function () {
        toast("Uğurlu", "Məhsul yeniləndi");
        loadRoute("catalog");
      }
    });
  }

  function handleAction(e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    var id = el.getAttribute("data-id");
    var key = el.getAttribute("data-key");

    if (action === "toggle-row-menu") {
      e.stopPropagation();
      var dropdown = el.closest(".row-menu").querySelector(".row-menu__dropdown");
      var wasOpen = !dropdown.hidden;
      closeRowMenus();
      if (!wasOpen) dropdown.hidden = false;
      return;
    }

    closeRowMenus();

    if (action === "reload") {
      loadRoute(state.route);
      return;
    }
    if (action === "approve-vendor" && id) {
      openConfirmModal({
        title: "Mağazanı təsdiqlə",
        message: "Bu mağaza müraciətini təsdiqləmək istəyirsiniz? Satıcı panelinə giriş açılacaq.",
        confirmLabel: "Təsdiqlə",
        onConfirm: function () { return BizdeAdminAPI.approveVendor(id); },
        onSuccess: function () { toast("Uğurlu", "Mağaza təsdiqləndi"); loadRoute("vendor-applications"); }
      });
      return;
    }
    if (action === "suspend-vendor" && id) {
      openConfirmModal({
        title: "Mağazanı dayandır",
        message: "Mağaza müvəqqəti olaraq dayandırılacaq. Davam edilsin?",
        confirmLabel: "Dayandır",
        danger: true,
        onConfirm: function () { return BizdeAdminAPI.suspendVendor(id); },
        onSuccess: function () { toast("Uğurlu", "Mağaza dayandırıldı"); loadRoute("stores"); }
      });
      return;
    }
    if (action === "approve-product" && id) {
      openConfirmModal({
        title: "Məhsulu qəbul et",
        message: "Məhsul satışa çıxarılacaq. Qəbul edirsiniz?",
        confirmLabel: "Qəbul et",
        onConfirm: function () { return BizdeAdminAPI.approveProduct(id); },
        onSuccess: function () { toast("Uğurlu", "Məhsul qəbul edildi"); loadRoute("products"); }
      });
      return;
    }
    if (action === "approve-review" && id) {
      BizdeAdminAPI.approveReview(id).then(function () {
        toast("Uğurlu", "Rəy təsdiqləndi");
        loadRoute("reviews");
      }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "reject-review" && id) {
      BizdeAdminAPI.rejectReview(id).then(function () {
        toast("Uğurlu", "Rəy rədd edildi");
        loadRoute("reviews");
      }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "reject-product" && id) {
      rejectReasonModal("Məhsulu rədd et", "Satıcıya göndəriləcək rədd səbəbini yazın.", function (data) {
        return BizdeAdminAPI.rejectProduct(id, data.reason);
      }, function () { toast("Uğurlu", "Məhsul rədd edildi"); loadRoute("products"); });
      return;
    }
    if (action === "reject-vendor" && id) {
      rejectReasonModal("Mağazanı rədd et", "Satıcıya göndəriləcək rədd səbəbini yazın.", function (data) {
        return BizdeAdminAPI.rejectVendor(id, data.reason);
      }, function () { toast("Uğurlu", "Mağaza rədd edildi"); loadRoute("vendor-applications"); });
      return;
    }
    if (action === "bulk-approve-products") {
      openConfirmModal({
        title: "Gözləyən məhsulları qəbul et",
        message: "Bütün gözləyən məhsullar bir anda qəbul ediləcək. Əminsiniz?",
        confirmLabel: "Hamısını qəbul et",
        onConfirm: function () { return BizdeAdminAPI.bulkApproveProducts(); },
        onSuccess: function (r) {
          toast("Uğurlu", "Məhsullar qəbul edildi");
          loadRoute("products");
        }
      });
      return;
    }
    if (action === "view-product-site" && id) {
      var list = (state.data && (state.data.products || state.data.items)) || [];
      var found = list.find(function (item) { return String(item.id) === String(id); }) || { id: id };
      window.open(productSiteUrl(found), "_blank", "noopener");
      return;
    }
    if (action === "edit-product" && id) {
      BizdeAdminAPI.product(id).then(function (r) {
        var p = r.product || {};
        if (!p.id) {
          toast("Xəta", "Məhsul tapılmadı", true);
          return;
        }
        openEditProductModal(p);
      }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "delete-product" && id) {
      openConfirmModal({
        title: "Məhsul silinsin?",
        message: "Bu məhsul saytdan və kataloqdan silinəcək. Bu əməliyyat geri qaytarıla bilməz.",
        confirmLabel: "Bəli, sil",
        danger: true,
        onConfirm: function () { return BizdeAdminAPI.deleteProduct(id); },
        onSuccess: function () {
          toast("Uğurlu", "Məhsul silindi");
          loadRoute("catalog");
        }
      });
      return;
    }
    if (action === "order-status" && id) {
      BizdeAdminAPI.updateOrderStatus(id, el.value).then(function () { toast("Uğurlu", "Status yeniləndi"); }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "edit-setting" && key) {
      openFormModal({
        title: "Parametri dəyiş",
        desc: "Marketplace ayarının yeni dəyərini daxil edin.",
        submitLabel: "Yadda saxla",
        fields: [{
          name: "value",
          label: el.getAttribute("data-label") || key,
          value: el.getAttribute("data-value") || "",
          required: true,
          placeholder: "Yeni dəyər"
        }],
        onSubmit: function (data) { return BizdeAdminAPI.updateSetting(key, data.value); },
        onSuccess: function () { toast("Uğurlu", "Ayar yeniləndi"); loadRoute("settings"); }
      });
      return;
    }
    if (action === "terms-edit-meta") {
      openTermsMetaModal();
      return;
    }
    if (action === "terms-add-section") {
      openTermsSectionModal({
        title: "Yeni bölmə",
        desc: "İstifadə şərtlərinə yeni bölmə əlavə edin.",
        submitLabel: "Əlavə et",
        successMsg: "Bölmə əlavə edildi"
      });
      return;
    }
    if (action === "terms-edit-section") {
      var editIdx = Number(el.getAttribute("data-index"));
      var editTerms = getTermsState();
      if (!editTerms.sections[editIdx]) {
        toast("Xəta", "Bölmə tapılmadı", true);
        return;
      }
      openTermsSectionModal({
        title: "Bölməni redaktə et",
        submitLabel: "Yadda saxla",
        index: editIdx,
        section: editTerms.sections[editIdx],
        successMsg: "Bölmə yeniləndi"
      });
      return;
    }
    if (action === "terms-delete-section") {
      var delIdx = Number(el.getAttribute("data-index"));
      openConfirmModal({
        title: "Bölmə silinsin?",
        message: "Bu bölmə istifadə şərtlərindən silinəcək.",
        confirmLabel: "Bəli, sil",
        danger: true,
        onConfirm: function () {
          var t = getTermsState();
          t.sections.splice(delIdx, 1);
          return persistTerms(t, "Bölmə silindi");
        }
      });
      return;
    }
    if (action === "terms-reset") {
      openConfirmModal({
        title: "Standart müqaviləyə qayıtsın?",
        message: "Bütün əl ilə edilən dəyişikliklər silinəcək və default Buykon müqaviləsi yüklənəcək.",
        confirmLabel: "Bəli, sıfırla",
        danger: true,
        onConfirm: function () {
          return persistTerms(BuykonTerms.getDefault(), "Standart müqavilə bərpa olundu");
        }
      });
      return;
    }
    if (action === "create-category") {
      openFormModal({
        title: "Yeni kateqoriya",
        desc: "Mağazada görünəcək yeni kateqoriya əlavə edin.",
        submitLabel: "Yarat",
        fields: [
          { name: "name", label: "Kateqoriya adı", required: true, placeholder: "Məs: Elektronika" },
          { name: "slug", label: "Link adı", required: true, hint: "URL üçün latın hərfləri, məs: elektronika", placeholder: "elektronika" }
        ],
        onSubmit: function (data) { return BizdeAdminAPI.createCategory({ slug: data.slug, name: data.name }); },
        onSuccess: function () { toast("Uğurlu", "Kateqoriya yaradıldı"); loadRoute("categories"); }
      });
      return;
    }
    if (action === "create-story") {
      openStoryModal({
        title: "Yeni story",
        desc: "Mobil ana səhifədə görünəcək story kartı əlavə edin (şaquli şəkil tövsiyə olunur).",
        submitLabel: "Yarat",
        requireImage: true,
        onSubmit: function (data) { return BizdeAdminAPI.createStory(data); },
        onSuccess: function () { toast("Uğurlu", "Story yaradıldı"); loadRoute("stories"); }
      });
      return;
    }
    if (action === "edit-story" && id) {
      var story = (state.data.items || []).find(function (s) { return String(s.id) === String(id); });
      if (!story) {
        toast("Xəta", "Story tapılmadı", true);
        return;
      }
      openStoryModal({
        title: "Story redaktə et",
        submitLabel: "Yadda saxla",
        story: story,
        onSubmit: function (data) { return BizdeAdminAPI.updateStory(id, data); },
        onSuccess: function () { toast("Uğurlu", "Story yeniləndi"); loadRoute("stories"); }
      });
      return;
    }
    if (action === "delete-story" && id) {
      openConfirmModal({
        title: "Story silinsin?",
        message: "Bu story mobil ana səhifədən silinəcək.",
        confirmLabel: "Bəli, sil",
        danger: true,
        onConfirm: function () { return BizdeAdminAPI.deleteStory(id); },
        onSuccess: function () { toast("Uğurlu", "Story silindi"); loadRoute("stories"); }
      });
      return;
    }
    if (action === "wheel-add-req") {
      openWheelReqModal({
        title: "Yeni şərt",
        onSubmit: function (r) { var c = BuykonWheelConfig.get(); c.requirements.push(r); BuykonWheelConfig.save(c); },
        onSuccess: function () { toast("Uğurlu", "Şərt əlavə edildi"); loadRoute("reward-wheel"); }
      });
      return;
    }
    if (action === "wheel-edit-req") {
      var reqIdx = Number(el.getAttribute("data-index"));
      var reqCfg = BuykonWheelConfig.get();
      var reqItem = reqCfg.requirements[reqIdx];
      if (!reqItem) { toast("Xəta", "Şərt tapılmadı", true); return; }
      openWheelReqModal({
        title: "Şərti redaktə et",
        req: reqItem,
        onSubmit: function (r) { var c = BuykonWheelConfig.get(); c.requirements[reqIdx] = r; BuykonWheelConfig.save(c); },
        onSuccess: function () { toast("Uğurlu", "Şərt yeniləndi"); loadRoute("reward-wheel"); }
      });
      return;
    }
    if (action === "wheel-del-req") {
      var delReqIdx = Number(el.getAttribute("data-index"));
      openConfirmModal({
        title: "Şərt silinsin?",
        message: "Bu şərt çarxdan silinəcək.",
        confirmLabel: "Bəli, sil",
        danger: true,
        onConfirm: function () {
          var c = BuykonWheelConfig.get();
          if (c.requirements.length <= 1) throw new Error("Ən azı bir şərt qalmalıdır");
          c.requirements.splice(delReqIdx, 1);
          BuykonWheelConfig.save(c);
          return Promise.resolve();
        },
        onSuccess: function () { toast("Uğurlu", "Şərt silindi"); loadRoute("reward-wheel"); }
      });
      return;
    }
    if (action === "wheel-add-prize") {
      openWheelPrizeModal({
        title: "Yeni hədiyyə",
        onSubmit: function (p) { var c = BuykonWheelConfig.get(); c.prizes.push(p); BuykonWheelConfig.save(c); },
        onSuccess: function () { toast("Uğurlu", "Hədiyyə əlavə edildi"); loadRoute("reward-wheel"); }
      });
      return;
    }
    if (action === "wheel-edit-prize") {
      var prizeIdx = Number(el.getAttribute("data-index"));
      var prizeCfg = BuykonWheelConfig.get();
      var prizeItem = prizeCfg.prizes[prizeIdx];
      if (!prizeItem) { toast("Xəta", "Hədiyyə tapılmadı", true); return; }
      openWheelPrizeModal({
        title: "Hədiyyəni redaktə et",
        prize: prizeItem,
        onSubmit: function (p) { var c = BuykonWheelConfig.get(); c.prizes[prizeIdx] = p; BuykonWheelConfig.save(c); },
        onSuccess: function () { toast("Uğurlu", "Hədiyyə yeniləndi"); loadRoute("reward-wheel"); }
      });
      return;
    }
    if (action === "wheel-del-prize") {
      var delPrizeIdx = Number(el.getAttribute("data-index"));
      openConfirmModal({
        title: "Hədiyyə silinsin?",
        message: "Bu hədiyyə çarxdan silinəcək.",
        confirmLabel: "Bəli, sil",
        danger: true,
        onConfirm: function () {
          var c = BuykonWheelConfig.get();
          if (c.prizes.length <= 2) throw new Error("Ən azı iki hədiyyə qalmalıdır");
          c.prizes.splice(delPrizeIdx, 1);
          BuykonWheelConfig.save(c);
          return Promise.resolve();
        },
        onSuccess: function () { toast("Uğurlu", "Hədiyyə silindi"); loadRoute("reward-wheel"); }
      });
      return;
    }
    if (action === "wheel-reset") {
      openConfirmModal({
        title: "Standart konfiqurasiya?",
        message: "Bütün şərtlər və hədiyyələr ilkin standart vəziyyətə qaytarılacaq.",
        confirmLabel: "Bəli, qaytar",
        danger: true,
        onConfirm: function () { BuykonWheelConfig.resetToDefault(); return Promise.resolve(); },
        onSuccess: function () { toast("Uğurlu", "Standarta qaytarıldı"); loadRoute("reward-wheel"); }
      });
      return;
    }
    if (action === "create-coupon") {
      openFormModal({
        title: "Yeni kupon",
        desc: "Müştərilər üçün endirim kodu yaradın.",
        submitLabel: "Yarat",
        fields: [
          { name: "code", label: "Kupon kodu", required: true, placeholder: "Məs: YAZ2026" },
          { name: "discount_percent", label: "Endirim faizi (%)", type: "number", min: 1, required: true, placeholder: "10" }
        ],
        validate: function (data) {
          var n = Number(data.discount_percent);
          if (!n || n < 1 || n > 99) return "Endirim 1% ilə 99% arasında olmalıdır.";
          return "";
        },
        onSubmit: function (data) {
          return BizdeAdminAPI.createCoupon({ code: data.code, discount_percent: Number(data.discount_percent) });
        },
        onSuccess: function () { toast("Uğurlu", "Kupon yaradıldı"); loadRoute("campaigns"); }
      });
      return;
    }
    if (action === "vendor-detail" && id) {
      BizdeAdminAPI.vendor(id).then(function (r) {
        var v = r.vendor || {};
        if (!v.id) {
          toast("Xəta", "Mağaza tapılmadı", true);
          return;
        }
        openModal("Mağaza haqqında", renderVendorDetailHtml(v), { variant: "vendor" });
      }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "product-detail" && id) {
      BizdeAdminAPI.product(id).then(function (r) {
        var p = r.product || {};
        if (!p.id) {
          toast("Xəta", "Məhsul tapılmadı", true);
          return;
        }
        openModal("Məhsul haqqında", renderProductDetailHtml(p), { variant: "product" });
        bindProductGallery();
      }).catch(function (err) { toast("Xəta", err.message, true); });
      return;
    }
    if (action === "order-detail" && id) {
      BizdeAdminAPI.order(id).then(function (r) {
        var o = r.order || {};
        openModal("Sifariş detalları", '<div class="detail-grid"><div class="detail-card"><span>Sifariş nömrəsi</span><strong>' + esc(o.id) + '</strong></div><div class="detail-card"><span>Müştəri</span><strong>' + esc(o.customer) + '</strong></div><div class="detail-card"><span>Məbləğ</span><strong>' + esc(String(o.total)) + '</strong></div><div class="detail-card"><span>Status</span><strong>' + esc(o.status) + '</strong></div></div>');
      }).catch(function (err) { toast("Xəta", err.message, true); });
    }
  }

  function init() {
    renderNav();
    BizdeAdminAPI.session().then(function (data) {
      if (data.user) {
        var profileName = document.getElementById("profileName");
        var profileAvatar = document.getElementById("profileAvatar");
        if (profileName && data.user.name) profileName.textContent = data.user.name;
        if (profileAvatar && data.user.name) {
          profileAvatar.textContent = data.user.name.split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
        }
      }
      loadRoute((location.hash || "#dashboard").replace("#", ""));
    }).catch(function () {
      window.location.href = "login.html";
    });

    sideNav.addEventListener("click", function (e) {
      var btn = e.target.closest(".nav-item[data-route]");
      if (!btn) return;
      location.hash = btn.getAttribute("data-route");
      loadRoute(btn.getAttribute("data-route"));
      shell.classList.remove("is-mobile-open");
    });

    document.body.addEventListener("click", function (e) {
      var link = e.target.closest("a[data-route]");
      if (link) {
        e.preventDefault();
        location.hash = link.getAttribute("data-route");
        loadRoute(link.getAttribute("data-route"));
      }
      if (!e.target.closest(".row-menu")) closeRowMenus();
    });

    workspace.addEventListener("click", handleAction);
    workspace.addEventListener("change", handleAction);

    window.addEventListener("hashchange", function () {
      loadRoute((location.hash || "#dashboard").replace("#", ""));
    });

    document.getElementById("sidebarToggle").addEventListener("click", function () {
      shell.classList.toggle("is-collapsed");
    });
    document.getElementById("mobileMenu").addEventListener("click", function () {
      shell.classList.toggle("is-mobile-open");
    });

    var themeBtn = document.getElementById("themeToggle");
    themeBtn.addEventListener("click", function () {
      document.body.classList.toggle("dark");
      var isDark = document.body.classList.contains("dark");
      localStorage.setItem("bv-admin-theme", isDark ? "dark" : "light");
      themeBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
    if (localStorage.getItem("bv-admin-theme") === "dark") {
      document.body.classList.add("dark");
      themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    document.getElementById("profileTrigger").addEventListener("click", function (e) {
      e.stopPropagation();
      document.getElementById("profileMenu").classList.toggle("is-open");
    });
    document.addEventListener("click", function () {
      document.getElementById("profileMenu").classList.remove("is-open");
    });
    document.getElementById("logoutBtn").addEventListener("click", function () {
      BizdeAdminAPI.logout().finally(function () { window.location.href = "login.html"; });
    });

    document.getElementById("modalClose").addEventListener("click", closeModal);
    modalBackdrop.addEventListener("click", function (e) { if (e.target === modalBackdrop) closeModal(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeModal(); closeRowMenus(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("globalSearch").focus();
      }
    });

    var searchTimer;
    document.getElementById("globalSearch").addEventListener("input", function (e) {
      clearTimeout(searchTimer);
      var q = e.target.value.trim();
      if (q.length < 2) return;
      searchTimer = setTimeout(function () {
        BizdeAdminAPI.search(q).then(function (r) {
          var results = r.results || [];
          if (!results.length) { toast("Axtarış", "Nəticə tapılmadı"); return; }
          var first = results[0];
          if (first.route) {
            location.hash = first.route;
            loadRoute(first.route);
            toast("Axtarış", first.label + " tapıldı");
          }
        }).catch(function (err) { toast("Xəta", err.message, true); });
      }, 350);
    });
  }

  init();
})();
