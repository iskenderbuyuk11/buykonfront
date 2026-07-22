(function () {
  "use strict";

  function getRoot() {
    return (window.BizdevarLayout && BizdevarLayout.getRoot()) || "../../";
  }

  function getQuery() {
    try {
      return (new URLSearchParams(window.location.search).get("q") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function getAssets() {
    return document.body.getAttribute("data-assets") || "../../../";
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

  function renderResults(products, q) {
    var container = document.getElementById("search-results");
    var hint = document.getElementById("search-hint");
    if (!container) return;

    if (!q) {
      if (hint) hint.textContent = "Məhsul adı yazın və axtarın.";
      container.innerHTML = "";
      return;
    }

    if (hint) {
      hint.textContent = products.length
        ? products.length + " nəticə tapıldı"
        : "“" + q + "” üzrə məhsul tapılmadı.";
    }

    var assets = getAssets();
    var root = getRoot();

    if (!products.length) {
      container.innerHTML = '<p class="catalog-msg">Başqa açar sözlə yenidən cəhd edin.</p>';
      return;
    }

    container.innerHTML = products
      .map(function (p) {
        var image = p.image || p.image_url || "images/products/iphone15.jpg";
        var imgSrc = /^https?:\/\//i.test(image) ? image : assets + image;
        return (
          '<article class="product-card">' +
          '<a href="' + root + "pages/product/?id=" + p.id + '" class="product-card__link">' +
          '<div class="product-card__media"><img src="' + esc(imgSrc) + '" alt="" class="product-card__photo"></div>' +
          '<div class="product-card__body">' +
          '<span class="product-card__cat">' + esc(p.category || p.cat || "") + "</span>" +
          '<h3 class="product-card__title">' + esc(p.name) + "</h3>" +
          '<p class="product-card__price"><strong>' + Number(p.price || 0).toLocaleString("az-AZ") + " ₼</strong></p>" +
          productMetaHtml(p) +
          "</div></a></article>"
        );
      })
      .join("");
  }

  function searchProducts(q) {
    var lower = q.toLowerCase();
    if (window.BizdevarAPI) {
      return BizdevarAPI.products()
        .then(function (res) {
          var list = res.products || [];
          return list.filter(function (p) {
            return (p.name || "").toLowerCase().indexOf(lower) !== -1;
          });
        })
        .catch(function () {
          return [];
        });
    }
    return Promise.resolve([]);
  }

  function init() {
    var form = document.getElementById("search-form");
    var input = document.getElementById("search-input");
    if (!form || !input) return;

    var q = getQuery();
    if (q) {
      input.value = q;
      searchProducts(q).then(function (found) {
        renderResults(found, q);
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var val = input.value.trim();
      if (window.history && window.history.replaceState) {
        var u = new URL(window.location.href);
        if (val) u.searchParams.set("q", val);
        else u.searchParams.delete("q");
        window.history.replaceState({}, "", u.pathname + u.search);
      }
      searchProducts(val).then(function (found) {
        renderResults(found, val);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
