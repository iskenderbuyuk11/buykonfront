(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(v) {
    var n = Number(v || 0);
    return "₼ " + n.toFixed(2);
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

  function renderStore(data) {
    var store = data.store || {};
    var products = data.products || [];
    var logo = store.logo_url
      ? '<img src="' + esc(store.logo_url) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:20px">'
      : '<i class="fa-solid fa-store"></i>';

    var productHtml = products.length
      ? products.map(function (p) {
          var img = p.image_url
            ? '<img src="' + esc(p.image_url) + '" alt="">'
            : '<i class="fa-solid fa-image" style="font-size:32px;color:#ccc"></i>';
          return (
            '<a class="store-product" href="' +
            (window.BizdevarSiteConfig && BizdevarSiteConfig.productPageUrl
              ? esc(BizdevarSiteConfig.productPageUrl(p, "/"))
              : "/pages/product/?id=" + encodeURIComponent(p.id)) +
            '">' +
            '<div class="store-product__img">' + img + "</div>" +
            '<div class="store-product__body"><strong>' + esc(p.name) + "</strong>" +
            '<div class="store-product__price">' + money(p.price) + "</div></div></a>"
          );
        }).join("")
      : '<div class="store-error"><i class="fa-solid fa-box-open"></i><p>Hələ aktiv məhsul yoxdur</p></div>';

    return (
      '<section class="store-hero">' +
      '<div class="store-hero__logo">' + logo + "</div>" +
      "<div>" +
      "<h1 class=\"store-hero__title\">" + esc(store.name || "Mağaza") + "</h1>" +
      (store.pending ? '<p class="store-hero__meta" style="color:#b45309"><i class="fa-solid fa-clock"></i> Mağaza admin təsdiqi gözləyir</p>' : "") +
      '<p class="store-hero__meta">' + esc(store.category || "Mağaza") +
      (store.joined_at ? " · Qoşulma: " + esc(String(store.joined_at).slice(0, 10)) : "") +
      "</p>" +
      '<div class="store-stats">' +
      '<div class="store-stat"><strong>' + esc(store.rating || "0") + '</strong><span>Reytinq</span></div>' +
      '<div class="store-stat"><strong>' + esc(store.success_rate || 0) + '%</strong><span>Uğurlu sifariş</span></div>' +
      '<div class="store-stat"><strong>' + esc(store.order_count || 0) + '</strong><span>Sifariş sayı</span></div>' +
      '<div class="store-stat"><strong>' + esc(store.product_count || 0) + '</strong><span>Məhsul</span></div>' +
      "</div></div></section>" +
      '<section class="store-section"><h2>Məhsullar</h2><div class="store-grid">' + productHtml + "</div></section>"
    );
  }

  var slug = readSlug();
  var page = document.getElementById("storePage");
  if (!slug) {
    page.innerHTML = '<div class="store-error"><h2>Mağaza tapılmadı</h2></div>';
    return;
  }

  document.title = slug + " | Buykon";

  BuykonSellerAPI.publicStore(slug)
    .then(function (data) {
      page.innerHTML = renderStore(data);
      if (data.store && data.store.name) document.title = data.store.name + " | Buykon";
    })
    .catch(function (err) {
      var msg = (err && err.message) ? err.message : "Bu adla mağaza yoxdur.";
      page.innerHTML = '<div class="store-error"><i class="fa-solid fa-store-slash"></i><h2>Mağaza tapılmadı</h2><p>' + esc(msg) + '</p><p style="color:#667085;font-size:14px">URL mağaza slug-u olmalıdır. Məs: <strong>buykon.com/store?bizdevar</strong></p><a href="/index.html">Ana səhifəyə qayıt</a></div>';
    });
})();
