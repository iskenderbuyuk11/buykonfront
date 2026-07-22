(function () {
  "use strict";

  function getAssets() {
    if (window.BizdevarLayout && BizdevarLayout.getAssets) return BizdevarLayout.getAssets();
    return document.body.getAttribute("data-assets") || "../";
  }

  var products = [];

  window.products = products;

  function formatPrice(price) {
    return Number(price).toLocaleString("az-AZ") + " ₼";
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function soldCount(product) {
    return product && product.sold_count != null ? Number(product.sold_count) || 0 : 0;
  }

  function vendorName(product) {
    return (product && product.vendor_name) || "";
  }

  function ratingStars(product) {
    return Math.max(0, Math.min(5, Number((product && product.rating_stars) || 0) || 0));
  }

  function starsHtml(value) {
    var filled = Math.round(value);
    var out = "";
    for (var i = 1; i <= 5; i++) {
      out += '<span class="' + (i <= filled ? "is-filled" : "is-empty") + '">★</span>';
    }
    return out;
  }

  function productMetaHtml(product) {
    var rating = ratingStars(product);
    return (
      '<div class="product-card__meta">' +
      '<span class="product-card__stars" aria-label="' + esc(rating.toFixed(1)) + ' / 5 ulduz">' +
      starsHtml(rating) +
      '<strong>' + esc(rating.toFixed(1)) + "/5</strong></span>" +
      '<span><strong>' + esc(soldCount(product)) + "</strong> satıldı</span>" +
      "</div>" +
      '<div class="product-card__store">' +
      '<span class="product-card__store-dot" aria-hidden="true"></span>' +
      '<span>' + esc(vendorName(product)) + "</span>" +
      "</div>"
    );
  }

  function createProductCard(product) {
    var assets = getAssets();
    var image = product.image_url || product.image || "";
    var img = /^https?:\/\//i.test(image) ? image : assets + image;
    var Fav = window.BizdevarFavorites;
    var favOn = Fav && Fav.has(product.id);
    var favClass = favOn ? "product-card__fav is-active" : "product-card__fav";
    var oldPrice = product.base_price != null ? product.base_price : product.oldPrice;
    var hasDiscount = Number(product.discount_percent || 0) > 0 || Boolean(product.sale);

    return (
      '<article class="product-card" data-product-id="' + product.id + '">' +
      '<a href="pages/product/?id=' + product.id + '" class="product-card__link">' +
      '<div class="product-card__media">' +
      '<img src="' + esc(img) + '" alt="' + esc(product.name) + '" class="product-card__photo" loading="lazy">' +
      "</div>" +
      '<div class="product-card__body">' +
      '<span class="product-card__cat">' + esc(product.category || product.cat || "") + "</span>" +
      '<h3 class="product-card__title">' + esc(product.name) + "</h3>" +
      '<p class="product-card__price">' +
      (oldPrice && hasDiscount
        ? '<span class="product-card__old-price"><s>' + formatPrice(oldPrice) + "</s></span> "
        : "") +
      "<strong>" + formatPrice(product.price) + "</strong>" +
      '<span class="product-card__vat">ƏDV daxil</span></p>' +
      productMetaHtml(product) +
      "</div></a>" +
      '<button type="button" class="' + favClass + '" data-product-id="' + product.id + '" aria-label="Sevimlilərə əlavə et">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
      "</button>" +
      '<button class="product-card__btn" type="button" data-product-id="' + product.id + '">Səbətə əlavə et</button>' +
      "</article>"
    );
  }

  function renderList(list, container) {
    if (!container) return;
    container.innerHTML = list.map(createProductCard).join("");
    bindFavorites(container);
  }

  function bindFavorites(container) {
    var Fav = window.BizdevarFavorites;
    if (!Fav) return;
    container.querySelectorAll(".product-card__fav").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = parseInt(btn.getAttribute("data-product-id"), 10);
        var on = Fav.toggle(id);
        btn.classList.toggle("is-active", on);
      });
    });
  }

  function getActiveCat() {
    try {
      return (new URLSearchParams(window.location.search).get("cat") || "all").trim();
    } catch (e) {
      return "all";
    }
  }

  function filterByCat(list) {
    var cat = getActiveCat();
    if (cat === "all") return list;
    return list.filter(function (p) { return p.cat === cat; });
  }

  function renderAll() {
    var base = filterByCat(products);
    renderList(products.slice().sort(function (a, b) { return Number(b.popular || 0) - Number(a.popular || 0); }).slice(0, 12), document.getElementById("products-popular"));
    renderList(products.filter(function (p) { return Number(p.discount_percent || 0) > 0 || p.sale; }), document.getElementById("products-sale"));
    renderList(base, document.getElementById("products"));
  }

  function setupSorting() {
    var sortSelect = document.getElementById("sort");
    if (!sortSelect) return;
    sortSelect.addEventListener("change", function () {
      var sorted = filterByCat(products.slice());
      if (this.value === "price-asc") sorted.sort(function (a, b) { return a.price - b.price; });
      else if (this.value === "price-desc") sorted.sort(function (a, b) { return b.price - a.price; });
      else sorted.sort(function (a, b) { return Number(b.popular || 0) - Number(a.popular || 0); });
      renderList(sorted, document.getElementById("products"));
    });
  }

  function setupAddToCart() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".product-card__btn[data-product-id]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var id = Number(btn.dataset.productId);
      var product = products.find(function (p) { return p.id === id; });
      if (!product) return;
      if (window.BizdevarAPI && BizdevarAPI.cartAdd) {
        BizdevarAPI.cartAdd(id, 1).then(function (d) {
          if (window.BizdevarApp) BizdevarApp.setCartBadge(d.total_qty);
          btn.textContent = "Əlavə edildi ✓";
          setTimeout(function () { btn.textContent = "Səbətə əlavə et"; }, 1400);
        });
      }
    });
  }

  function setupCategoryTiles() {
    var cat = getActiveCat();
    document.querySelectorAll(".cat-tile[data-cat]").forEach(function (tile) {
      tile.classList.toggle("is-active", tile.getAttribute("data-cat") === cat);
      tile.addEventListener("click", function (e) {
        var slug = tile.getAttribute("data-cat");
        if (slug) {
          e.preventDefault();
          window.location.href = "index.html?cat=" + encodeURIComponent(slug) + "#catalog";
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupSorting();
    setupAddToCart();
    setupCategoryTiles();
    if (!window.BizdevarAPI || !BizdevarAPI.products) return;
    BizdevarAPI.products("all").then(function (data) {
      products = (data && data.products) || [];
      window.products = products;
      renderAll();
    });
  });
})();
