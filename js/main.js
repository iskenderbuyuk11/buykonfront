(function () {
  var API = window.BizdevarAPI;
  if (!API) return;

  var popularEl = document.getElementById("products-popular");
  var listEl = document.getElementById("products");
  var saleEl = document.getElementById("products-sale");
  var titleEl = document.getElementById("catalog-title");
  var sortEl = document.getElementById("sort");
  var categoryListEl = document.getElementById("category-list");

  var POPULAR_LIMIT = 12;

  /* Populyar/Endirimli bölmələr: üfüqi sıra <-> tam siyahı */
  var expandedPopular = false;
  var expandedSale = false;

  var products = [];
  var categories = [];
  var catLabels = { all: "Bütün məhsullar" };
  var activeCat = "all";
  var loadError = "";

  function getRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return document.body.getAttribute("data-root") || "";
  }

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

  function sortItems(items, mode) {
    var copy = items.slice();
    if (mode === "price-asc") copy.sort(function (a, b) { return a.price - b.price; });
    else if (mode === "price-desc") copy.sort(function (a, b) { return b.price - a.price; });
    else copy.sort(function (a, b) { return b.popular - a.popular; });
    return copy;
  }

  function getSearchQuery() {
    try {
      return (new URLSearchParams(window.location.search).get("q") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function filterProducts() {
    var list =
      activeCat === "all"
        ? products.slice()
        : products.filter(function (p) {
            return p.cat === activeCat;
          });
    var q = getSearchQuery().toLowerCase();
    if (!q) return list;
    return list.filter(function (p) {
      return (p.name || "").toLowerCase().indexOf(q) !== -1;
    });
  }

  function filterSaleProducts(baseList) {
    return baseList.filter(function (p) {
      return Number(p.discount_percent) > 0;
    });
  }

  function bindFavoriteButtons(container) {
    var Fav = window.BizdevarFavorites;
    if (!Fav || !container) return;
    container.querySelectorAll(".product-card__fav").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = parseInt(btn.getAttribute("data-product-id"), 10);
        if (!id) return;
        var on = Fav.toggle(id);
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.setAttribute(
          "aria-label",
          on ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et"
        );
      });
    });
  }

  var CART_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';

  var SHIP_HTML =
    '<span class="product-card__ship">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' +
    "Pulsuz çatdırılma</span>";

  function mediaUrl(src) {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveMediaUrl === "function") {
      return cfg.resolveMediaUrl(src);
    }
    return src || "";
  }

  function productHref(p) {
    var cfg = window.BizdevarSiteConfig;
    var root = getRoot();
    if (cfg && typeof cfg.productPageUrl === "function") {
      return cfg.productPageUrl(p, root);
    }
    if (p && p.id) return root + "pages/product/?id=" + encodeURIComponent(String(p.id));
    return root + "pages/product/";
  }

  function renderProductCards(sorted, container) {
    if (!container) return;
    var Fav = window.BizdevarFavorites;
    container.innerHTML = sorted
      .map(function (p) {
        var catLabel = esc(catLabels[p.cat] || p.cat);
        var imgSrc = mediaUrl(p.image_url || p.image || "");
        var media = imgSrc
          ? '<img src="' + escAttr(imgSrc) + '" alt="" class="product-card__photo" loading="lazy" />'
          : '<span class="product-card__initial">' + esc(p.initial || "") + "</span>";
        var favOn = Fav && Fav.has(p.id);
        var favClass = favOn ? "product-card__fav is-active" : "product-card__fav";
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
          '<button type="button" class="' +
          favClass +
          '" data-product-id="' +
          esc(String(p.id)) +
          '" aria-pressed="' +
          (favOn ? "true" : "false") +
          '" aria-label="' +
          (favOn ? "Sevimlilərdən çıxar" : "Sevimlilərə əlavə et") +
          '">' +
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
          CART_ICON +
          "</button>" +
          "</div>" +
          "</div></article>"
        );
      })
      .join("");

    bindFavoriteButtons(container);

    container.querySelectorAll(".product-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (
          e.target.closest(".product-card__btn") ||
          e.target.closest(".product-card__fav")
        ) {
          return;
        }
        var href = card.getAttribute("data-href");
        if (href) {
          window.location.href = href;
          return;
        }
        var id = card.getAttribute("data-id");
        if (!id) return;
        window.location.href = getRoot() + "pages/product/?id=" + encodeURIComponent(id);
      });
    });

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

  function render() {
    if (!titleEl) return;

    var qRaw = getSearchQuery();
    if (qRaw) {
      titleEl.textContent = "«" + qRaw + "» üzrə nəticə";
    } else {
      titleEl.textContent = catLabels[activeCat] || catLabels.all;
    }

    if (loadError) {
      var errHtml = '<p class="catalog-msg catalog-msg--error">' + esc(loadError) + "</p>";
      if (popularEl) popularEl.innerHTML = errHtml;
      if (listEl) listEl.innerHTML = errHtml;
      if (saleEl) saleEl.innerHTML = errHtml;
      return;
    }

    var filtered = filterProducts();

    /* Populyar — həmişə populyarlıq üzrə */
    var popularSorted = sortItems(filtered, "popular");
    var popularShow = expandedPopular
      ? popularSorted
      : popularSorted.slice(0, POPULAR_LIMIT);
    if (popularEl) {
      popularEl.classList.toggle("products--row", !expandedPopular);
      if (popularShow.length === 0) {
        popularEl.classList.remove("products--row");
        popularEl.innerHTML =
          '<p class="catalog-msg">' +
          (getSearchQuery()
            ? "Bu axtarış üzrə populyar məhsul tapılmadı."
            : "Hazırda populyar məhsul yoxdur.") +
          "</p>";
      } else {
        renderProductCards(popularShow, popularEl);
      }
      syncSectionControls("popular", expandedPopular, popularShow.length);
    }

    /* Endirimli */
    var saleFiltered = filterSaleProducts(filtered);
    var saleSorted = sortItems(saleFiltered, "popular");
    if (saleEl) {
      saleEl.classList.toggle("products--row", !expandedSale);
      if (saleSorted.length === 0) {
        saleEl.classList.remove("products--row");
        saleEl.innerHTML =
          '<p class="catalog-msg catalog-msg--muted">' +
          (getSearchQuery()
            ? "Bu axtarış üzrə endirimli məhsul yoxdur."
            : "Hazırda endirimli məhsul yoxdur.") +
          "</p>";
      } else {
        renderProductCards(saleSorted, saleEl);
      }
      syncSectionControls("sale", expandedSale, saleSorted.length);
    }

    /* Bütün məhsullar — sıralama seçimə görə */
    if (listEl) {
      var sorted = sortItems(filtered, sortEl ? sortEl.value : "popular");
      if (sorted.length === 0) {
        listEl.innerHTML =
          '<p class="catalog-msg">' +
          (getSearchQuery()
            ? "Bu axtarış üzrə məhsul tapılmadı."
            : "Bu kateqoriyada məhsul yoxdur. Məhsullar admin paneldən əlavə olunacaq.") +
          "</p>";
      } else {
        renderProductCards(sorted, listEl);
      }
    }

    if (window.CatSection && CatSection.syncMegaPanelToActive) {
      CatSection.syncMegaPanelToActive();
    }
  }

  function renderCategories() {
    if (!categoryListEl) return;
    var items = [
      '<li><button type="button" class="cat-list__btn cat-list__btn--mega' +
        (activeCat === "all" ? " is-active" : "") +
        '" data-cat="all">' +
        '<span class="cat-list__btn-ico" aria-hidden="true">⊞</span>' +
        '<span class="cat-list__btn-label">Bütün məhsullar</span>' +
        '<span class="cat-list__btn-chev" aria-hidden="true">›</span>' +
        "</button></li>",
    ];
    categories.forEach(function (cat) {
      var count = cat.product_count > 0 ? " (" + cat.product_count + ")" : "";
      var ico =
        window.CatSection && CatSection.getIconForSlug
          ? CatSection.getIconForSlug(cat.slug)
          : "📦";
      var isAct = activeCat === cat.slug ? " is-active" : "";
      items.push(
        '<li><button type="button" class="cat-list__btn cat-list__btn--mega' +
          isAct +
          '" data-cat="' +
          escAttr(cat.slug) +
          '">' +
          '<span class="cat-list__btn-ico" aria-hidden="true">' +
          esc(ico) +
          "</span>" +
          '<span class="cat-list__btn-label">' +
          esc(cat.name + count) +
          "</span>" +
          '<span class="cat-list__btn-chev" aria-hidden="true">›</span>' +
          "</button></li>"
      );
      catLabels[cat.slug] = cat.name;
    });
    categoryListEl.innerHTML = items.join("");
    bindCategoryEvents();
    if (window.CatSection && CatSection.syncMegaPanelToActive) {
      CatSection.syncMegaPanelToActive();
    }
  }

  function bindCategoryEvents() {
    var categoryButtons = document.querySelectorAll(".cat-list__btn");
    categoryButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        categoryButtons.forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        activeCat = btn.getAttribute("data-cat") || "all";
        syncStripActive(activeCat);
        if (window.history && window.history.replaceState) {
          try {
            var u = new URL(window.location.href);
            u.searchParams.delete("q");
            window.history.replaceState({}, "", u.pathname + u.search + u.hash);
          } catch (e) {
            /* ignore */
          }
        }
        render();
      });
    });
  }

  function loadProducts() {
    loadError = "";
    Promise.all([API.categories(), API.products("all")])
      .then(function (all) {
        var catData = all[0] || {};
        var productData = all[1] || {};
        categories = catData.categories || [];
        products = productData.products || [];
        window.products = products;
        renderCategories();
        render();
      })
      .catch(function (e) {
        loadError =
          e.message ||
          "Məhsullar yüklənmədi. API serverinə (api.buykon.com) qoşulmaq mümkün olmadı.";
        products = [];
        render();
      });
  }

  function syncSectionControls(section, expanded, count) {
    var toggle = document.getElementById(section + "-toggle");
    if (toggle) {
      toggle.classList.toggle("is-open", expanded);
      var label = toggle.querySelector("span");
      if (label) label.textContent = expanded ? "Daha az göstər" : "Hamısına bax";
      toggle.style.display = count === 0 ? "none" : "";
    }
    document
      .querySelectorAll('.catalog__nav-btn[data-scroll="products-' + section + '"]')
      .forEach(function (btn) {
        btn.hidden = expanded || count === 0;
      });
  }

  function bindSectionControls() {
    var popToggle = document.getElementById("popular-toggle");
    if (popToggle) {
      popToggle.addEventListener("click", function () {
        expandedPopular = !expandedPopular;
        render();
      });
    }
    var saleToggle = document.getElementById("sale-toggle");
    if (saleToggle) {
      saleToggle.addEventListener("click", function () {
        expandedSale = !expandedSale;
        render();
      });
    }
    document.querySelectorAll(".catalog__nav-btn[data-scroll]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.getAttribute("data-scroll"));
        if (!target) return;
        var dir = parseInt(btn.getAttribute("data-dir"), 10) || 1;
        var card = target.querySelector(".product-card");
        var step = card ? (card.offsetWidth + 12) * 2 : target.clientWidth * 0.8;
        target.scrollBy({ left: dir * step, behavior: "smooth" });
      });
    });
  }

  bindSectionControls();

  if (sortEl) sortEl.addEventListener("change", render);

  window.addEventListener("popstate", render);
  window.addEventListener("hashchange", render);

  function syncStripActive(slug) {
    document.querySelectorAll(".home-cat-strip__item[data-cat]").forEach(function (item) {
      item.classList.toggle("is-active", item.getAttribute("data-cat") === slug);
    });
  }

  window._catSectionOnSelect = function (slug) {
    activeCat = slug;
    var categoryButtons = document.querySelectorAll(".cat-list__btn");
    categoryButtons.forEach(function (b) {
      b.classList.toggle("is-active", (b.getAttribute("data-cat") || "all") === slug);
    });
    syncStripActive(slug);
    render();
    var catalogEl = document.getElementById("catalog");
    if (catalogEl) {
      var offset = 80;
      var top = catalogEl.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: "smooth" });
    }
  };

  document.querySelectorAll(".home-cat-strip__item[data-cat]").forEach(function (item) {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      var slug = item.getAttribute("data-cat") || "all";
      if (typeof window._catSectionOnSelect === "function") {
        window._catSectionOnSelect(slug);
      }
    });
  });

  loadProducts();
})();
