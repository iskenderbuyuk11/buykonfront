(function () {
  "use strict";

  var CAT_LABELS = {
    "ev-yasam": "Ev & Yaşam",
    elektronika: "Elektronika",
    geyim: "Geyim",
    aksesuar: "Aksesuar",
    kosmetika: "Kosmetika",
    diger: "Digər",
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escAttr(s) {
    return esc(s).replace(/'/g, "&#39;");
  }

  function mediaUrl(src) {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveMediaUrl === "function") {
      return cfg.resolveMediaUrl(src);
    }
    return String(src || "").trim();
  }

  function productImage(p) {
    var raw =
      (p && p.images && p.images[0]) ||
      (p && p.image_url) ||
      (p && p.image) ||
      "";
    return mediaUrl(raw);
  }

  function formatPrice(v) {
    return (
      Number(v || 0).toLocaleString("az-AZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " ₼"
    );
  }

  function catLabel(slug) {
    if (!slug) return "";
    return CAT_LABELS[slug] || String(slug).replace(/-/g, " ").replace(/\b\w/g, function (c) {
      return c.toUpperCase();
    });
  }

  function readSlug() {
    if (typeof BuykonSellerAPI !== "undefined" && BuykonSellerAPI.parseStoreQueryPath) {
      var queryPath = BuykonSellerAPI.parseStoreQueryPath();
      if (queryPath) {
        var parts = queryPath.split("/").filter(Boolean);
        if (parts.length && parts[0] !== "sellerpanel") return parts[0];
      }
    }
    return "";
  }

  function productHref(p) {
    if (window.BizdevarSiteConfig && BizdevarSiteConfig.productPageUrl) {
      return BizdevarSiteConfig.productPageUrl(p, "/");
    }
    return "/pages/product/?id=" + encodeURIComponent(p.id);
  }

  function renderProductCard(p) {
    var imgSrc = productImage(p);
    var initial = esc(String(p.name || "?").charAt(0).toUpperCase());
    var media = imgSrc
      ? '<img class="store-card__photo" src="' +
        escAttr(imgSrc) +
        '" alt="' +
        escAttr(p.name || "") +
        '" loading="lazy" decoding="async" />'
      : '<span class="store-card__placeholder" aria-hidden="true">' + initial + "</span>";
    var category = catLabel(p.category);

    return (
      '<a class="store-card" href="' +
      escAttr(productHref(p)) +
      '">' +
      '<div class="store-card__media">' +
      media +
      (category
        ? '<span class="store-card__cat">' + esc(category) + "</span>"
        : "") +
      "</div>" +
      '<div class="store-card__body">' +
      '<h3 class="store-card__title">' +
      esc(p.name) +
      "</h3>" +
      '<p class="store-card__price">' +
      formatPrice(p.price) +
      "</p>" +
      "</div></a>"
    );
  }

  function renderStats(store) {
    var items = [
      { value: store.rating != null ? Number(store.rating).toFixed(1) : "0.0", label: "Reytinq", icon: "fa-star" },
      { value: (store.success_rate != null ? store.success_rate : 0) + "%", label: "Uğurlu sifariş", icon: "fa-circle-check" },
      { value: store.order_count != null ? store.order_count : 0, label: "Sifariş", icon: "fa-bag-shopping" },
      { value: store.product_count != null ? store.product_count : 0, label: "Məhsul", icon: "fa-box" },
    ];

    return items
      .map(function (item) {
        return (
          '<div class="store-stat">' +
          '<span class="store-stat__icon"><i class="fa-solid ' +
          item.icon +
          '"></i></span>' +
          "<div><strong>" +
          esc(String(item.value)) +
          "</strong><span>" +
          esc(item.label) +
          "</span></div></div>"
        );
      })
      .join("");
  }

  function renderStore(data) {
    var store = data.store || {};
    var products = data.products || [];
    var logoSrc = mediaUrl(store.logo_url || "");
    var isActive = store.status === "active" && !store.pending;

    var logo = logoSrc
      ? '<img src="' + escAttr(logoSrc) + '" alt="' + escAttr(store.name || "Mağaza") + '" />'
      : '<i class="fa-solid fa-store"></i>';

    var productHtml = products.length
      ? products.map(renderProductCard).join("")
      : '<div class="store-empty"><i class="fa-solid fa-box-open"></i><p>Hələ aktiv məhsul yoxdur</p></div>';

    var joined =
      store.joined_at && String(store.joined_at).length >= 10
        ? String(store.joined_at).slice(0, 10)
        : "";

    return (
      '<section class="store-banner">' +
      '<div class="store-banner__glow" aria-hidden="true"></div>' +
      '<div class="store-profile">' +
      '<div class="store-profile__logo">' +
      logo +
      "</div>" +
      '<div class="store-profile__main">' +
      '<div class="store-profile__head">' +
      "<h1>" +
      esc(store.name || "Mağaza") +
      "</h1>" +
      (isActive
        ? '<span class="store-badge store-badge--active"><i class="fa-solid fa-circle-check"></i> Aktiv mağaza</span>'
        : store.pending
          ? '<span class="store-badge store-badge--pending"><i class="fa-solid fa-clock"></i> Təsdiq gözləyir</span>'
          : "") +
      "</div>" +
      '<p class="store-profile__meta">' +
      '<span><i class="fa-solid fa-tag"></i> ' +
      esc(store.category || "Mağaza") +
      "</span>" +
      (joined
        ? '<span><i class="fa-regular fa-calendar"></i> Qoşulma: ' + esc(joined) + "</span>"
        : "") +
      "</p>" +
      '<div class="store-stats">' +
      renderStats(store) +
      "</div></div></div></section>" +
      '<section class="store-section">' +
      '<div class="store-section__head">' +
      "<h2>Məhsullar</h2>" +
      '<span class="store-section__count">' +
      products.length +
      " məhsul</span>" +
      "</div>" +
      '<div class="store-grid">' +
      productHtml +
      "</div></section>"
    );
  }

  function bindImageFallbacks(root) {
    if (!root) return;
    root.querySelectorAll(".store-card__photo").forEach(function (img) {
      img.addEventListener("error", function () {
        var wrap = img.closest(".store-card__media");
        if (!wrap || wrap.querySelector(".store-card__placeholder")) {
          img.remove();
          return;
        }
        var initial = (img.getAttribute("alt") || "?").charAt(0).toUpperCase();
        img.remove();
        var ph = document.createElement("span");
        ph.className = "store-card__placeholder";
        ph.setAttribute("aria-hidden", "true");
        ph.textContent = initial;
        wrap.insertBefore(ph, wrap.firstChild);
      });
    });
  }

  var slug = readSlug();
  var page = document.getElementById("storePage");
  if (!slug) {
    page.innerHTML =
      '<div class="store-error"><i class="fa-solid fa-store-slash"></i><h2>Mağaza tapılmadı</h2><p>Keçərli mağaza ünvanı daxil edin.</p><a class="store-error__link" href="/index.html">Ana səhifəyə qayıt</a></div>';
    return;
  }

  document.title = slug + " | Buykon";

  BuykonSellerAPI.publicStore(slug)
    .then(function (data) {
      page.innerHTML = renderStore(data);
      bindImageFallbacks(page);
      if (data.store && data.store.name) document.title = data.store.name + " | Buykon";
    })
    .catch(function (err) {
      var msg = err && err.message ? err.message : "Bu adla mağaza yoxdur.";
      page.innerHTML =
        '<div class="store-error"><i class="fa-solid fa-store-slash"></i><h2>Mağaza tapılmadı</h2><p>' +
        esc(msg) +
        '</p><p class="store-error__hint">URL mağaza slug-u olmalıdır. Məs: <strong>buykon.com/store?eca</strong></p><a class="store-error__link" href="/index.html">Ana səhifəyə qayıt</a></div>';
    });
})();
