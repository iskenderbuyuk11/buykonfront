(function () {
  var API = window.BizdevarAPI;
  var Store = window.BizdevarFavorites;
  var listEl = document.getElementById("favorites-products");
  var emptyEl = document.getElementById("favorites-empty");

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function escAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;");
  }

  function getRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return document.body.getAttribute("data-root") || "../../";
  }

  function productHref(p) {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.productPageUrl === "function") {
      return cfg.productPageUrl(p, getRoot());
    }
    return getRoot() + "pages/product/?id=" + encodeURIComponent(String(p.id || ""));
  }

  function formatPrice(n) {
    return (
      Number(n).toLocaleString("az-AZ", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }) + " \u20BC"
    );
  }

  function soldCount(p) {
    return p && p.sold_count != null ? Number(p.sold_count) || 0 : 0;
  }

  function vendorName(p) {
    return (p && p.vendor_name) || "";
  }

  function ratingStars(p) {
    return Math.max(0, Math.min(5, Number((p && p.rating_stars) || 0) || 0));
  }

  function starsHtml(value) {
    var filled = Math.round(value);
    var out = "";
    for (var i = 1; i <= 5; i++) {
      out += '<span class="' + (i <= filled ? "is-filled" : "is-empty") + '">★</span>';
    }
    return out;
  }

  var SHIP_HTML =
    '<span class="product-card__ship">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' +
    "Pulsuz çatdırılma</span>";

  function productMetaHtml(p) {
    var rating = ratingStars(p);
    return (
      '<div class="product-card__meta">' +
      '<span class="product-card__stars" aria-label="' + escAttr(rating.toFixed(1)) + ' / 5 ulduz">' +
      starsHtml(rating) +
      '<strong>' + esc(rating.toFixed(1)) + "/5</strong></span>" +
      "</div>"
    );
  }

  function bindFavoriteButtons(container) {
    if (!Store || !container) return;
    container.querySelectorAll(".product-card__fav").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = parseInt(btn.getAttribute("data-product-id"), 10);
        if (!id) return;
        var on = Store.toggle(id);
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        if (!on) {
          var card = btn.closest(".product-card");
          if (card) card.remove();
          if (listEl && !listEl.querySelector(".product-card")) showEmpty();
        }
      });
    });
  }

  function bindAddToCart(container) {
    if (!API || !container) return;
    container.querySelectorAll(".product-card__btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = parseInt(btn.getAttribute("data-product-id"), 10);
        if (!id) return;
        btn.disabled = true;
        API.cartAdd(id, 1)
          .then(function (d) {
            if (window.BizdevarHeader) BizdevarHeader.setCartBadge(d.total_qty);
          })
          .catch(function (e) {
            alert(e.message || "Səbətə əlavə olunmadı");
          })
          .finally(function () {
            btn.disabled = false;
          });
      });
    });
  }

  var CARD_CART_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';

  function mediaUrl(src) {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveMediaUrl === "function") return cfg.resolveMediaUrl(src);
    return src || "";
  }

  function renderCards(items, catLabels) {
    if (!listEl) return;
    listEl.innerHTML = items
      .map(function (p) {
        var catLabel = esc(catLabels[p.cat] || p.cat);
        var imgSrc = mediaUrl(p.image_url || p.image || "");
        var media = imgSrc
          ? '<img src="' +
            escAttr(imgSrc) +
            '" alt="" class="product-card__photo" loading="lazy" />'
          : '<span class="product-card__initial">' + esc(p.initial || "") + "</span>";
        var discount = Math.round(Number(p.discount_percent) || 0);
        var badge =
          discount > 0
            ? '<span class="product-card__badge">-' + discount + "%</span>"
            : "";
        var priceHtml =
          discount > 0 && p.base_price != null
            ? '<del class="product-card__old-price">' +
              formatPrice(p.base_price) +
              "</del><strong>" +
              formatPrice(p.price) +
              "</strong>"
            : "<strong>" + formatPrice(p.price) + "</strong>";
        return (
          '<article class="product-card" data-id="' +
          esc(String(p.id)) +
          '" data-href="' +
          escAttr(productHref(p)) +
          '">' +
          '<div class="product-card__media product-card__media--' +
          esc(p.cat) +
          '">' +
          badge +
          '<button type="button" class="product-card__fav is-active" data-product-id="' +
          esc(String(p.id)) +
          '" aria-pressed="true" aria-label="Sevimlilərdən çıxar">' +
          '<svg class="product-card__fav-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
          "</button>" +
          media +
          SHIP_HTML +
          "</div>" +
          '<div class="product-card__body">' +
          '<span class="product-card__cat">' +
          catLabel +
          "</span>" +
          '<h3 class="product-card__title">' +
          esc(p.name) +
          "</h3>" +
          productMetaHtml(p) +
          '<div class="product-card__foot">' +
          '<p class="product-card__price">' +
          priceHtml +
          "</p>" +
          '<button type="button" class="product-card__btn" data-product-id="' +
          esc(String(p.id)) +
          '" aria-label="Səbətə əlavə et" title="Səbətə əlavə et">' +
          CARD_CART_ICON +
          "</button>" +
          "</div>" +
          "</div></article>"
        );
      })
      .join("");

    bindFavoriteButtons(listEl);
    bindAddToCart(listEl);

    listEl.querySelectorAll(".product-card[data-href]").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (
          e.target.closest(".product-card__btn") ||
          e.target.closest(".product-card__fav")
        ) {
          return;
        }
        var href = card.getAttribute("data-href");
        if (href) window.location.href = href;
      });
    });
  }

  var EMPTY_COPY =
    "Hələ sevimli məhsul seçməmisiniz. Məhsul kartındakı ürək işarəsinə toxunaraq siyahıya əlavə edin.";

  function showEmpty(message) {
    if (emptyEl) {
      emptyEl.removeAttribute("hidden");
      var p = emptyEl.querySelector(".fav-empty__text");
      if (p) p.textContent = message || EMPTY_COPY;
    }
    if (listEl) listEl.innerHTML = "";
  }

  function hideEmpty() {
    if (emptyEl) emptyEl.setAttribute("hidden", "");
  }

  function load() {
    if (!Store) {
      showEmpty();
      return;
    }

    var ids = Store.getIds();
    if (!ids.length) {
      showEmpty();
      return;
    }

    hideEmpty();

    if (!API) {
      showEmpty("Məhsulları göstərmək üçün sayt API-si tələb olunur.");
      return;
    }

    Promise.all([API.categories(), API.products("all")])
      .then(function (all) {
        var catData = all[0] || {};
        var productData = all[1] || {};
        var categories = catData.categories || [];
        var catLabels = { all: "Bütün məhsullar" };
        categories.forEach(function (cat) {
          catLabels[cat.slug] = cat.name;
        });

        var products = productData.products || [];
        var map = {};
        products.forEach(function (p) {
          map[p.id] = p;
        });

        var list = ids.map(function (id) {
          return map[id];
        }).filter(Boolean);

        var foundIds = list.map(function (p) {
          return p.id;
        });
        if (foundIds.length !== ids.length) {
          Store.syncIds(foundIds);
        }

        if (!list.length) {
          showEmpty();
          return;
        }

        renderCards(list, catLabels);
      })
      .catch(function () {
        showEmpty("Məhsullar yüklənmədi. Bir az sonra yenidən cəhd edin.");
      });
  }

  document.addEventListener("BizdevarFavoritesChanged", function () {
    if (Store && Store.count() === 0) showEmpty();
    else if (Store && Store.count() > 0 && listEl && !listEl.querySelector(".product-card")) {
      load();
    }
  });

  load();
})();
