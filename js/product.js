(function () {
  var API = window.BizdevarAPI || null;

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function escAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;");
  }
  function resolveAssetPath(src) {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveMediaUrl === "function") {
      var via = cfg.resolveMediaUrl(src);
      if (via && (/^https?:\/\//i.test(via) || via.indexOf("uploads/") === -1)) {
        if (/^https?:\/\//i.test(via) || via.charAt(0) === "/" || via.indexOf("../") === 0) {
          return via;
        }
      }
    }
    var s = String(src || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s) || s.charAt(0) === "/") return s;
    if (s.indexOf("../") === 0 || s.indexOf("./") === 0) return s;
    if (s.indexOf("uploads/") === 0) {
      var base = cfg && typeof cfg.resolveApiBase === "function" ? cfg.resolveApiBase() : "";
      var origin = String(base || "").replace(/\/api\/?$/, "");
      if (origin) return origin + "/" + s.replace(/^\/+/, "");
    }
    return "../../" + s.replace(/^\.\//, "");
  }

  function formatMoney(n) {
    return (
      Number(n || 0).toLocaleString("az-AZ", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }) + " ₼"
    );
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function slugify(s) {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.productSlugify === "function") {
      return cfg.productSlugify(s);
    }
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function productSlug(p) {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.productSlug === "function") {
      return cfg.productSlug(p);
    }
    if (!p) return "";
    if (p.slug) return slugify(p.slug);
    return slugify(p.name || "") || (p.id ? "p-" + p.id : "");
  }

  /** Kart linkləri: ../product/?=slug (pages/product içindən) */
  function productUrl(p, root) {
    var s = productSlug(p);
    var base = root != null ? root : "../";
    if (s) return base + "product/?=" + encodeURIComponent(s);
    if (p && p.id) return base + "product/?id=" + encodeURIComponent(String(p.id));
    return base + "product/";
  }

  function getQuery() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (e) {
      return null;
    }
  }

  function getParam(name) {
    var q = getQuery();
    if (!q) return "";
    return (q.get(name) || "").trim();
  }

  /** ?slug=... və ya istifadəçi formatı ?=iphone-15-... */
  function getSlugFromLocation() {
    var slug = getParam("slug");
    if (slug) return slug;
    try {
      var q = window.location.search || "";
      // ?=my-slug  və ya ?my-slug
      var m = q.match(/^\?=?([^&]+)/);
      if (m && m[1] && m[1].indexOf("=") === -1) {
        return decodeURIComponent(m[1].replace(/\+/g, " ")).trim();
      }
      var params = new URLSearchParams(q);
      if (params.has("") && params.get("")) return String(params.get("")).trim();
    } catch (e) {
      /* ignore */
    }
    return "";
  }

  function setParams(next) {
    try {
      var u = new URL(window.location.href);
      Object.keys(next || {}).forEach(function (k) {
        if (next[k] == null || next[k] === "") u.searchParams.delete(k);
        else u.searchParams.set(k, String(next[k]));
      });
      window.location.href = u.pathname + u.search;
    } catch (e) {
      /* ignore */
    }
  }

  function replaceProductUrl(product) {
    try {
      var s = productSlug(product);
      if (!s) return;
      var desired = window.location.pathname + "?=" + encodeURIComponent(s);
      var current = window.location.pathname + window.location.search;
      if (current === desired) return;
      var currentSlug = getSlugFromLocation();
      if (getParam("id") || getParam("slug") || slugify(currentSlug) !== s) {
        window.history.replaceState({}, "", desired);
      }
    } catch (e) {
      /* ignore */
    }
  }

  function getLocal(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* ignore */
    }
  }

  function getAllProductsFallback() {
    try {
      if (Array.isArray(window.products)) return window.products.slice();
    } catch (e) {
      /* ignore */
    }
    return [];
  }

  function normalizeProduct(p) {
    if (!p) return null;
    var id = Number(p.id) || 0;
    var name = p.name || "Məhsul";
    var cat = p.cat || p.category || "all";
    var image = p.image_url || p.image || "";
    var price = Number(p.price) || 0;
    var base =
      p.base_price != null
        ? Number(p.base_price)
        : p.oldPrice != null
          ? Number(p.oldPrice)
          : null;
    var discountPercent =
      p.discount_percent != null
        ? Number(p.discount_percent) || 0
        : base && base > 0
          ? Math.round(((base - price) / base) * 100)
          : 0;
    var popular = Number(p.popular) || 0;

    var slug = productSlug({ slug: p.slug, name: name, id: id });

    var images = [];
    if (Array.isArray(p.images) && p.images.length) {
      images = p.images.filter(Boolean);
    }
    if (!images.length && image) images = [image];

    var specs =
      p.specs && typeof p.specs === "object" && Object.keys(p.specs).length
        ? p.specs
        : {};

    return {
      id: id,
      name: name,
      cat: cat,
      category_name: categoryLabel(cat),
      price: price,
      base_price: base,
      discount_percent: discountPercent,
      popular: popular,
      slug: slug,
      image_url: image,
      images: images,
      specs: specs,
      description:
        p.description ||
        name +
          " — Buykon-da rəsmi satıcıdan. Sürətli çatdırılma və etibarlı zəmanət.",
      vendor_name: p.vendor_name || STORE_NAME,
      vendor_logo_url: p.vendor_logo_url || "",
      sold_count: p.sold_count != null ? Number(p.sold_count) || 0 : 0,
      rating_stars: p.rating_stars != null ? Number(p.rating_stars) || 0 : 0,
      rating_count: p.rating_count != null ? Number(p.rating_count) || 0 : 0,
      stock: p.stock != null ? Number(p.stock) : null,
      status: p.status || "active",
      in_stock: p.in_stock != null ? !!p.in_stock : null,
    };
  }

  var CATEGORY_LABELS = {
    elektronika: "Elektronika",
    geyim: "Geyim",
    kosmetika: "Kosmetika",
    aksesuarlar: "Aksesuarlar",
    "ev-yasam": "Ev və yaşam",
    ev: "Ev və yaşam",
    supermarket: "Supermarket",
    usaqlar: "Ana və uşaq",
    qadin: "Qadın",
    kisi: "Kişi",
  };

  function categoryLabel(slug) {
    var key = String(slug || "").toLowerCase();
    if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
    if (!key || key === "all") return "";
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " ");
  }

  function isInStock(product) {
    if (!product) return false;
    if (product.status && product.status !== "active") return false;
    if (product.in_stock === false) return false;
    if (product.in_stock === true) return true;
    if (product.stock != null) return Number(product.stock) > 0;
    return true;
  }

  var AVAIL_ICON_IN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var AVAIL_ICON_OUT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  var STORE_NAME = "Buykon Rəsmi";

  function getSellerName(product) {
    return (product && product.vendor_name) || STORE_NAME;
  }

  function soldCount(product) {
    return product && product.sold_count != null ? Number(product.sold_count) || 0 : 0;
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

  var SHIP_HTML =
    '<span class="product-card__ship">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' +
    "Pulsuz çatdırılma</span>";

  function productMetaHtml(product) {
    var rating = ratingStars(product);
    return (
      '<div class="product-card__meta">' +
      '<span class="product-card__stars" aria-label="' + escAttr(rating.toFixed(1)) + ' / 5 ulduz">' +
      starsHtml(rating) +
      '<strong>' + esc(rating.toFixed(1)) + "/5</strong></span>" +
      "</div>"
    );
  }

  function renderStars(n) {
    var full = Math.floor(n);
    var half = n - full >= 0.5 ? 1 : 0;
    var out = "";
    for (var i = 0; i < full; i++) out += "★";
    if (half) out += "★";
    while (out.length < 5) out += "☆";
    return out.slice(0, 5);
  }

  function deliveredStatus(status) {
    return String(status || "").toLowerCase() === "delivered";
  }

  function orderHasProduct(order, productId) {
    var items = Array.isArray(order && order.items) ? order.items : [];
    return items.some(function (it) {
      return Number(it.product_id || it.id) === Number(productId);
    });
  }

  function canReviewProduct(productId) {
    if (!API || !API.ordersList) return Promise.resolve(false);
    return API.ordersList()
      .then(function (data) {
        var orders = Array.isArray(data && data.orders) ? data.orders : [];
        return orders.some(function (order) {
          return deliveredStatus(order.status) && orderHasProduct(order, productId);
        });
      })
      .catch(function () {
        return false;
      });
  }

  function modalCloseButtons(modal) {
    if (!modal || modal.dataset.bound) return;
    modal.dataset.bound = "1";
    modal.querySelectorAll("[data-pd-modal-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        modal.setAttribute("hidden", "");
        document.body.style.overflow = "";
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hasAttribute("hidden")) {
        modal.setAttribute("hidden", "");
        document.body.style.overflow = "";
      }
    });
  }

  function openPanelModal(id) {
    var modal = $(id);
    if (!modal) return;
    modalCloseButtons(modal);
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
  }

  function panelProductHtml(product) {
    var img = resolveAssetPath((product.images && product.images[0]) || product.image_url || "");
    return (
      '<div class="pd-panel-product__media">' +
      (img ? '<img src="' + escAttr(img) + '" alt="" />' : "") +
      "</div>" +
      '<div class="pd-panel-product__body">' +
      "<strong>" + esc(product.name) + "</strong>" +
      "<p>" + esc(formatMoney(product.price)) + "</p>" +
      '<button type="button" class="pd-panel-add">Səbətə əlavə et</button>' +
      "</div>"
    );
  }

  function panelSellerHtml(product) {
    var seller = getSellerName(product);
    var logo = product && product.vendor_logo_url ? resolveAssetPath(product.vendor_logo_url) : "";
    var logoHtml = logo
      ? '<img class="pd-panel-seller__logo pd-panel-seller__logo--img" src="' + escAttr(logo) + '" alt="">'
      : '<span class="pd-panel-seller__logo">' + esc(seller.charAt(0)) + "</span>";
    return (
      logoHtml +
      "<strong>" + esc(seller) + "</strong>" +
      '<span class="pd-panel-seller__badge">Rəsmi mağaza</span>'
    );
  }

  var CARD_CART_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';

  function cardHtml(p, catLabel) {
    var imgSrc = resolveAssetPath(p.image_url || "");
    var media = imgSrc
      ? '<img src="' + escAttr(imgSrc) + '" alt="" class="product-card__photo" loading="lazy" />'
      : '<span class="product-card__initial">' + esc(p.name.charAt(0)) + "</span>";
    var Fav = window.BizdevarFavorites;
    var favOn = Fav && Fav.has ? Fav.has(p.id) : false;
    var favClass = favOn ? "product-card__fav is-active" : "product-card__fav";
    var cat = esc(catLabel || p.cat || "");
    var catSlug = escAttr(String(p.cat || "all").replace(/\s+/g, "-").toLowerCase());
    var discount = Math.round(Number(p.discount_percent) || 0);
    var badge =
      discount > 0
        ? '<span class="product-card__badge">-' + discount + "%</span>"
        : "";
    var priceHtml =
      discount > 0 && p.base_price != null
        ? '<del class="product-card__old-price">' +
          formatMoney(p.base_price) +
          "</del><strong>" +
          formatMoney(p.price) +
          "</strong>"
        : "<strong>" + formatMoney(p.price) + "</strong>";

    return (
      '<article class="product-card" data-id="' +
      escAttr(String(p.id)) +
      '" data-href="' +
      escAttr(productUrl(p, "../")) +
      '">' +
      '<div class="product-card__media product-card__media--' +
      catSlug +
      '">' +
      badge +
      '<button type="button" class="' +
      favClass +
      '" data-product-id="' +
      escAttr(String(p.id)) +
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
      cat +
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
      escAttr(String(p.id)) +
      '" aria-label="Səbətə əlavə et" title="Səbətə əlavə et">' +
      CARD_CART_ICON +
      "</button>" +
      "</div>" +
      "</div></article>"
    );
  }

  function bindProductCardActions(container) {
    if (!container) return;
    var Fav = window.BizdevarFavorites;

    container.querySelectorAll(".product-card__fav").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!Fav || !Fav.toggle) return;
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

    container.querySelectorAll(".product-card__btn").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var id = parseInt(btn.getAttribute("data-product-id"), 10);
        if (!id) return;
        btn.disabled = true;
        if (API && API.cartAdd) {
          API.cartAdd(id, 1)
            .then(function (d) {
              if (window.BizdevarHeader) BizdevarHeader.setCartBadge(d.total_qty);
            })
            .catch(function (err) {
              alert((err && err.message) || "Səbətə əlavə olunmadı");
            })
            .finally(function () {
              btn.disabled = false;
            });
          return;
        }
        if (typeof BizdevarCart !== "undefined") {
          var item = getAllProductsFallback().find(function (p) {
            return Number(p.id) === id;
          });
          if (item) {
            BizdevarCart.add(
              {
                product_id: item.id,
                id: item.id,
                name: item.name,
                price: item.price,
                image_url: item.image || item.image_url || "",
              },
              1
            );
          }
        }
        btn.disabled = false;
      });
    });

    container.querySelectorAll(".product-card[data-href]").forEach(function (card) {
      if (card.dataset.navBound) return;
      card.dataset.navBound = "1";
      card.addEventListener("click", function (e) {
        if (e.target.closest("button")) return;
        var href = card.getAttribute("data-href");
        if (href) window.location.href = href;
      });
    });
  }

  function initCarouselNav() {
    document.querySelectorAll("[data-carousel-next]").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-carousel-next");
        var el = id ? document.getElementById(id) : null;
        if (!el) return;
        el.scrollBy({ left: Math.min(el.clientWidth * 0.85, 320), behavior: "smooth" });
      });
    });
  }

  function renderSpecs(specs) {
    var el = $("pd-specs");
    if (!el) return;
    var entries = Object.keys(specs || {});
    if (!entries.length) {
      el.innerHTML = "<p class='pd-mini'>Xüsusiyyət tapılmadı.</p>";
      return;
    }
    el.innerHTML = entries
      .map(function (k) {
        return (
          "<div><dt>" +
          esc(k) +
          "</dt><dd>" +
          esc(String(specs[k])) +
          "</dd></div>"
        );
      })
      .join("");
  }

  function renderProductDetails(product) {
    var descEl = $("pd-description");
    var extraEl = $("pd-extra-info");
    var thumbEl = $("pd-details-thumb");
    var galleryEl = $("pd-detail-images");
    var toggleBtn = $("pd-desc-toggle");
    if (!descEl) return;

    var desc =
      product.description ||
      product.name +
        " — yüksək keyfiyyətli məhsul. Geniş çeşid, sürətli çatdırılma və rəsmi zəmanət ilə BizdəVar-da.";
    descEl.textContent = desc;

    if (thumbEl && product.images && product.images[0]) {
      thumbEl.src = resolveAssetPath(product.images[0]);
      thumbEl.alt = product.name;
    }

    if (extraEl) {
      var seller = getSellerName(product);
      var bullets = ["<li>Satıcı: <strong>" + esc(seller) + "</strong></li>"];
      if (product.category_name) {
        bullets.push("<li>Kateqoriya: <strong>" + esc(product.category_name) + "</strong></li>");
      }
      if (isInStock(product)) {
        bullets.push(
          product.stock != null
            ? "<li>Stok: <strong>" + esc(String(product.stock)) + " ədəd</strong></li>"
            : "<li>Stokda mövcuddur</li>"
        );
      } else {
        bullets.push("<li>Hazırda stokda yoxdur</li>");
      }
      bullets.push("<li>Çatdırılma: 1–3 iş günü</li>");
      bullets.push("<li>Ödəniş: nağd, kart, taksit</li>");
      bullets.push("<li>Qaytarma: 14 gün ərzində</li>");
      extraEl.innerHTML = bullets.join("");
    }

    if (galleryEl) {
      var imgs = (product.images || []).filter(Boolean).slice(0, 8);
      if (imgs.length > 1) {
        galleryEl.innerHTML = imgs
          .map(function (src) {
            return (
              '<img src="' +
              escAttr(resolveAssetPath(src)) +
              '" alt="' +
              escAttr(product.name) +
              '" loading="lazy" />'
            );
          })
          .join("");
        galleryEl.hidden = false;
      } else {
        galleryEl.innerHTML = "";
        galleryEl.hidden = true;
      }
    }

    if (toggleBtn) {
      var needsToggle = String(desc || "").length > 220;
      toggleBtn.hidden = !needsToggle;
      if (needsToggle && !toggleBtn.dataset.bound) {
        toggleBtn.dataset.bound = "1";
        toggleBtn.addEventListener("click", function () {
          var open = toggleBtn.getAttribute("aria-expanded") === "true";
          toggleBtn.setAttribute("aria-expanded", open ? "false" : "true");
          descEl.classList.toggle("is-expanded", !open);
          toggleBtn.innerHTML = open
            ? 'Daha çox göstər <span aria-hidden="true">▾</span>'
            : 'Daha az göstər <span aria-hidden="true">▴</span>';
        });
      }
      if (!needsToggle) descEl.classList.add("is-expanded");
    }
  }

  function initGallery(images) {
    var thumbs = $("pd-thumbs");
    var img = $("pd-img");
    var imgWrap = $("pd-img-wrap");
    var prev = $("pd-prev");
    var next = $("pd-next");
    var lens = $("pd-lens");
    var zoom = $("pd-zoom");
    var zoomInner = $("pd-zoom-inner");
    var open = $("pd-open");
    var thumbsUp = $("pd-thumbs-up");
    var thumbsDown = $("pd-thumbs-down");
    var zoomFactor = 2.5;

    if (!thumbs || !img || !prev || !next || !imgWrap) return;
    var list = (images || []).slice(0, 8).map(resolveAssetPath);
    if (!list.length) list = ["../../images/products/iphone15.jpg"];

    var idx = 0;

    function syncThumbNav() {
      if (!thumbsUp && !thumbsDown) return;
      var canScroll = thumbs.scrollHeight > thumbs.clientHeight + 4;
      if (thumbsUp) thumbsUp.hidden = !canScroll;
      if (thumbsDown) thumbsDown.hidden = !canScroll;
    }

    function setActive(i, animate) {
      idx = (i + list.length) % list.length;
      var src = list[idx];
      if (animate) img.classList.add("is-fading");
      window.setTimeout(function () {
        img.src = src;
        img.classList.remove("is-fading");
        if (zoomInner) {
          zoomInner.style.backgroundImage = 'url("' + src + '")';
        }
        thumbs.querySelectorAll(".gallery__thumb").forEach(function (t) {
          var on = Number(t.getAttribute("data-idx")) === idx;
          t.classList.toggle("is-active", on);
          if (on) {
            try {
              t.scrollIntoView({ block: "nearest", behavior: "smooth" });
            } catch (e) {
              /* ignore */
            }
          }
        });
      }, animate ? 130 : 0);
    }

    thumbs.innerHTML = list
      .map(function (src, i) {
        return (
          '<button type="button" class="gallery__thumb' +
          (i === 0 ? " is-active" : "") +
          '" data-idx="' +
          i +
          '" aria-label="Şəkil ' +
          (i + 1) +
          '">' +
          '<img src="' +
          escAttr(src) +
          '" alt="" loading="lazy" />' +
          "</button>"
        );
      })
      .join("");

    thumbs.addEventListener("click", function (e) {
      var btn = e.target.closest(".gallery__thumb");
      if (!btn) return;
      setActive(Number(btn.getAttribute("data-idx")) || 0, true);
    });

    if (thumbsUp) {
      thumbsUp.addEventListener("click", function () {
        thumbs.scrollBy({ top: -80, behavior: "smooth" });
      });
    }
    if (thumbsDown) {
      thumbsDown.addEventListener("click", function () {
        thumbs.scrollBy({ top: 80, behavior: "smooth" });
      });
    }
    window.setTimeout(syncThumbNav, 50);
    window.addEventListener("resize", syncThumbNav);

    prev.addEventListener("click", function () {
      setActive(idx - 1, true);
    });
    next.addEventListener("click", function () {
      setActive(idx + 1, true);
    });

    function getDisplayedImageBounds() {
      var wrapRect = imgWrap.getBoundingClientRect();
      var imgRect = img.getBoundingClientRect();
      if (imgRect.width > 1 && imgRect.height > 1) {
        return {
          left: imgRect.left - wrapRect.left,
          top: imgRect.top - wrapRect.top,
          width: imgRect.width,
          height: imgRect.height,
          wrapW: wrapRect.width,
          wrapH: wrapRect.height,
        };
      }
      var natW = img.naturalWidth || 0;
      var natH = img.naturalHeight || 0;
      if (!natW || !natH) {
        return {
          left: 0,
          top: 0,
          width: wrapRect.width,
          height: wrapRect.height,
          wrapW: wrapRect.width,
          wrapH: wrapRect.height,
        };
      }
      var pad = 40;
      var availW = Math.max(1, wrapRect.width - pad);
      var availH = Math.max(1, wrapRect.height - pad);
      var scale = Math.min(availW / natW, availH / natH);
      var dispW = natW * scale;
      var dispH = natH * scale;
      return {
        left: (wrapRect.width - dispW) / 2,
        top: (wrapRect.height - dispH) / 2,
        width: dispW,
        height: dispH,
        wrapW: wrapRect.width,
        wrapH: wrapRect.height,
      };
    }

    function pointerPos(e) {
      var wrapRect = imgWrap.getBoundingClientRect();
      var bounds = getDisplayedImageBounds();
      var localX = e.clientX - wrapRect.left - bounds.left;
      var localY = e.clientY - wrapRect.top - bounds.top;
      var relX = bounds.width ? clamp(localX / bounds.width, 0, 1) : 0;
      var relY = bounds.height ? clamp(localY / bounds.height, 0, 1) : 0;
      return { relX: relX, relY: relY, bounds: bounds };
    }

    function enableZoom(on) {
      if (!lens || !zoom || !zoomInner) return;
      lens.classList.toggle("is-on", on);
      zoom.classList.toggle("is-on", on);
      zoom.setAttribute("aria-hidden", on ? "false" : "true");
      if (on && zoomInner && img.src) {
        zoomInner.style.backgroundImage = 'url("' + img.src + '")';
      }
    }

    function moveZoom(e) {
      if (!lens || !zoom || !zoomInner) return;
      var p = pointerPos(e);
      var bounds = p.bounds;
      var lensSize = lens.offsetWidth || 120;
      var cursorX = bounds.left + p.relX * bounds.width;
      var cursorY = bounds.top + p.relY * bounds.height;
      var lx = clamp(cursorX - lensSize / 2, bounds.left, bounds.left + bounds.width - lensSize);
      var ly = clamp(cursorY - lensSize / 2, bounds.top, bounds.top + bounds.height - lensSize);
      lens.style.left = lx + "px";
      lens.style.top = ly + "px";
      lens.style.transform = "none";

      var zoomW = zoom.offsetWidth || 1;
      var zoomH = zoom.offsetHeight || 1;
      var bgW = bounds.width * zoomFactor;
      var bgH = bounds.height * zoomFactor;
      var bgX = -(p.relX * bgW - zoomW / 2);
      var bgY = -(p.relY * bgH - zoomH / 2);
      zoomInner.style.backgroundSize = bgW + "px " + bgH + "px";
      zoomInner.style.backgroundPosition = bgX + "px " + bgY + "px";
    }

    imgWrap.addEventListener("mouseenter", function () {
      enableZoom(false);
    });
    imgWrap.addEventListener("mouseleave", function () {
      enableZoom(false);
    });
    imgWrap.addEventListener("mousemove", function () {
      /* hover zoom söndürülüb — Böyüt / klik ilə açılır */
    });
    imgWrap.addEventListener("focus", function () { enableZoom(false); });

    function keyNav(e) {
      if (e.key === "ArrowLeft") setActive(idx - 1, true);
      if (e.key === "ArrowRight") setActive(idx + 1, true);
    }
    imgWrap.addEventListener("keydown", keyNav);

    if (open) {
      open.addEventListener("click", function (e) {
        e.stopPropagation();
        openLightbox(list, idx, setActive);
      });
    }
    imgWrap.addEventListener("click", function (e) {
      if (e.target.closest(".gallery__lens")) return;
      openLightbox(list, idx, setActive);
    });

    setActive(0, false);
  }

  function openLightbox(images, startIdx, onChangeMain) {
    var box = $("pd-lightbox");
    var closeA = $("pd-lightbox-close");
    var closeX = $("pd-lightbox-x");
    var img = $("pd-lightbox-img");
    var prev = $("pd-lightbox-prev");
    var next = $("pd-lightbox-next");
    var thumbs = $("pd-lightbox-thumbs");
    var titleEl = $("pd-lightbox-title");
    if (!box || !img || !prev || !next) return;

    var list = (images || []).slice();
    var idx = startIdx || 0;
    var title =
      ($("pd-title") && $("pd-title").textContent) ||
      document.title.replace(/\s*\|\s*Buykon\.com\s*$/i, "") ||
      "";
    if (titleEl) titleEl.textContent = title.trim();

    function setIdx(i) {
      idx = (i + list.length) % list.length;
      img.src = list[idx];
      img.alt = title || "Məhsul şəkli";
      if (thumbs) {
        thumbs.querySelectorAll(".pd-lightbox__thumb").forEach(function (t) {
          t.classList.toggle("is-active", Number(t.getAttribute("data-idx")) === idx);
        });
      }
      if (typeof onChangeMain === "function") onChangeMain(idx, false);
    }

    if (thumbs) {
      thumbs.innerHTML = "";
      thumbs.setAttribute("hidden", "");
    }

    function close() {
      box.setAttribute("hidden", "");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") setIdx(idx - 1);
      if (e.key === "ArrowRight") setIdx(idx + 1);
    }

    closeA && (closeA.onclick = close);
    closeX && (closeX.onclick = close);
    prev.onclick = function () { setIdx(idx - 1); };
    next.onclick = function () { setIdx(idx + 1); };

    box.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    setIdx(idx);
  }

  function initFavorites(productId) {
    var btn = $("pd-fav");
    if (!btn) return;

    var Fav = window.BizdevarFavorites || null;
    var on = Fav && Fav.has ? Fav.has(productId) : false;

    function setHeartIcon(active) {
      btn.classList.toggle("is-on", !!active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");

      btn.innerHTML = `
        <img 
          src="${active 
            ? '/images/heart-svgrepo-com (1).svg' 
            : '/images/heart-svgrepo-com.svg'}" 
          alt=""
          class="fav-icon"
        >
      `;
    }

    setHeartIcon(on);

    btn.addEventListener("click", function () {
      if (!Fav || !Fav.toggle) return;

      var next = Fav.toggle(productId);
      setHeartIcon(next);
    });
  }

  function initAddToCart(productId, product) {
    var btn = $("pd-add-cart");
    if (!btn) return;
    var available = !product || isInStock(product);
    if (!available) {
      btn.disabled = true;
      btn.textContent = "Stokda yoxdur";
      btn.classList.add("pd-btn--disabled");
      return;
    }
    var defaultLabel = btn.textContent;
    btn.addEventListener("click", function () {
      if (!API || !API.cartAdd) {
        alert("Səbət funksiyası üçün sayt API-si tələb olunur.");
        return;
      }
      var qty = getSelectedQty();
      btn.disabled = true;
      API.cartAdd(productId, qty)
        .then(function (d) {
          if (window.BizdevarHeader) BizdevarHeader.setCartBadge(d.total_qty);
          btn.textContent = "Səbətə əlavə olundu ✓";
          window.setTimeout(function () { btn.textContent = defaultLabel; }, 1600);
        })
        .catch(function (e) {
          alert((e && e.message) || "Səbətə əlavə olunmadı");
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  function renderReviewSummaryPanel(list) {
    var panel = $("pd-review-summary-panel");
    if (!panel) return;

    var total = list.length;
    var avg =
      list.length
        ? list.reduce(function (s, r) { return s + (Number(r.stars) || 0); }, 0) / list.length
        : 0;

    panel.innerHTML =
      '<div class="pd-reviews-summary__stars" aria-hidden="true">' +
      renderStars(avg) +
      "</div>" +
      '<strong class="pd-reviews-summary__score">' +
      avg.toFixed(1) +
      "</strong>" +
      '<span class="pd-reviews-summary__sep">•</span>' +
      '<div class="pd-reviews-summary__count">' +
      total +
      " dəyərləndirmə</div>" +
      '<span class="pd-reviews-summary__sep">•</span>' +
      '<div class="pd-reviews-summary__count">' +
      total +
      " rəy</div>";
  }

  function initReviews(product) {
    var key = "pd-reviews:" + (product.id || product.slug);
    var listEl = $("pd-reviews");
    var form = $("pd-review-form");
    if (!listEl || !form) return;

    var list = getLocal(key, []);
    if (!list || !list.length) list = [];
    var serverMode = false;
    var reviewAllowed = false;
    var popup = $("pd-review-popup");
    var terms = $("pd-review-terms");
    var textEl = $("pd-review-text");
    var submitEl = $("pd-review-submit");

    function updateReviewSubmitState() {
      if (!submitEl || !terms || !textEl) return;
      submitEl.disabled = !reviewAllowed || !terms.checked || !String(textEl.value || "").trim();
    }

    function openReviewPopup() {
      if (!reviewAllowed) return;
      if (!popup) return;
      popup.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
      if (terms) terms.checked = false;
      if (textEl) {
        textEl.value = "";
        window.setTimeout(function () { textEl.focus(); }, 60);
      }
      updateReviewSubmitState();
    }

    function closeReviewPopup() {
      if (!popup) return;
      popup.setAttribute("hidden", "");
      document.body.style.overflow = document.querySelector(".pd-panel-modal:not([hidden])") ? "hidden" : "";
    }

    function bindReviewPopup() {
      var open = $("pd-open-review-panel");
      if (open && !open.dataset.bound) {
        open.dataset.bound = "1";
        open.addEventListener("click", openReviewPopup);
      }
      if (popup && !popup.dataset.bound) {
        popup.dataset.bound = "1";
        popup.querySelectorAll("[data-pd-review-close]").forEach(function (btn) {
          btn.addEventListener("click", closeReviewPopup);
        });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && !popup.hasAttribute("hidden")) closeReviewPopup();
        });
      }
      if (terms && !terms.dataset.bound) {
        terms.dataset.bound = "1";
        terms.addEventListener("change", updateReviewSubmitState);
      }
      if (textEl && !textEl.dataset.bound) {
        textEl.dataset.bound = "1";
        textEl.addEventListener("input", updateReviewSubmitState);
      }
      updateReviewSubmitState();
    }

    function renderPanel(filterText) {
      var listPanel = $("pd-review-panel-list");
      var ratingPanel = $("pd-review-panel-rating");
      var productCard = $("pd-review-product-card");
      var sellerCard = $("pd-review-seller-card");
      if (productCard) productCard.innerHTML = panelProductHtml(product);
      if (sellerCard) sellerCard.innerHTML = panelSellerHtml(product);

      var visible = list.slice().reverse();
      if (filterText) {
        var q = filterText.toLowerCase();
        visible = visible.filter(function (r) {
          return String(r.text || "").toLowerCase().indexOf(q) !== -1;
        });
      }

      var avg = list.length
        ? list.reduce(function (s, r) { return s + (Number(r.stars) || 0); }, 0) / list.length
        : 0;
      if (ratingPanel) {
        ratingPanel.innerHTML =
          "<strong>" + avg.toFixed(1) + "</strong> " +
          '<span aria-hidden="true">' + renderStars(avg) + "</span> " +
          '<small>' + list.length + " dəyərləndirmə · " + list.length + " rəy</small>";
      }
      if (!listPanel) return;
      if (!visible.length) {
        listPanel.innerHTML = "<p class='pd-panel-empty'>Göstəriləcək rəy yoxdur.</p>";
        return;
      }
      listPanel.innerHTML = visible
        .map(function (r) {
          return (
            '<article class="pd-panel-review">' +
            '<div class="pd-panel-review__stars" aria-label="' + escAttr(String(r.stars || 5)) + ' ulduz">' +
            renderStars(Number(r.stars) || 5) +
            "</div>" +
            '<p class="pd-panel-review__meta">' +
            esc(r.name || "İstifadəçi") + " · " + esc(r.time || "") +
            "</p>" +
            '<p class="pd-panel-review__text">' + esc(r.text || "") + "</p>" +
            '<p class="pd-panel-review__seller">' + esc(STORE_NAME) + " satıcısından alındı</p>" +
            "</article>"
          );
        })
        .join("");
    }

    function bindPanel() {
      var open = $("pd-open-reviews");
      var search = $("pd-review-search");
      if (open && !open.dataset.bound) {
        open.dataset.bound = "1";
        open.addEventListener("click", function () {
          renderPanel(search ? search.value.trim() : "");
          openPanelModal("pd-reviews-modal");
        });
      }
      if (search && !search.dataset.bound) {
        search.dataset.bound = "1";
        search.addEventListener("input", function () {
          renderPanel(search.value.trim());
        });
      }
    }

    function setReviewAccess(allowed) {
      var submit = form.querySelector('button[type="submit"]');
      var select = $("pd-review-stars");
      var text = $("pd-review-text");
      var open = $("pd-open-review-panel");
      var panelNote = $("pd-review-access-note");
      var note = form.querySelector(".pd-review-access-note");
      if (!note) {
        note = document.createElement("p");
        note.className = "pd-review-access-note";
        form.appendChild(note);
      }
      reviewAllowed = !!allowed;
      if (allowed) {
        form.classList.remove("is-locked");
        if (open) {
          open.disabled = false;
          open.title = "";
        }
        if (select) select.disabled = false;
        if (text) {
          text.disabled = false;
          text.placeholder = "Məhsul barədə fikriniz";
        }
        note.textContent = "Bu məhsul sizə çatdırıldığı üçün rəy yaza bilərsiniz.";
        if (panelNote) panelNote.textContent = "Bu məhsul sizə çatdırıldığı üçün rəy yaza bilərsiniz.";
      } else {
        form.classList.add("is-locked");
        if (open) {
          open.disabled = true;
          open.title = "Rəy yazmaq üçün məhsul sizə çatdırılmalıdır";
        }
        if (select) select.disabled = true;
        if (text) {
          text.disabled = true;
          text.placeholder = "Rəy yazmaq üçün məhsulu sifariş edib təhvil almalısınız";
        }
        note.textContent =
          "Rəy və reytinq yalnız məhsulu sifariş edib təhvil alan istifadəçilər üçündür.";
        if (panelNote) panelNote.textContent =
          "Rəy yazmaq üçün bu məhsulun sifarişinizdə çatdırılmış olması lazımdır.";
      }
      updateReviewSubmitState();
    }

    function render() {
      if (!list.length) {
        listEl.innerHTML =
          '<article class="pd-review pd-review--empty">' +
          '<div class="pd-review__stars" aria-hidden="true">☆☆☆☆☆</div>' +
          '<p class="pd-review__text">Hələ rəy yoxdur. İlk rəy yazan siz olun.</p>' +
          '<div class="pd-review__seller">' + esc(STORE_NAME) + " satıcısından alınır</div>" +
          "</article>";
      } else {
        listEl.innerHTML = list
          .slice()
          .reverse()
          .slice(0, 4)
          .map(function (r) {
            return (
              '<article class="pd-review">' +
              '<div class="pd-review__stars" aria-label="' +
              escAttr(String(r.stars || 5)) +
              ' ulduz">' +
              renderStars(Number(r.stars) || 5) +
              "</div>" +
              '<div class="pd-review__head">' +
              '<div class="pd-review__name">' +
              esc(r.name || "İstifadəçi") +
              "</div>" +
              '<span class="pd-review__date">' +
              esc(r.time || "") +
              "</span>" +
              "</div>" +
              '<p class="pd-review__text">' +
              esc(r.text || "") +
              "</p>" +
              '<div class="pd-review__seller">' + esc(STORE_NAME) + " satıcısından alındı</div>" +
              "</article>"
            );
          })
          .join("");
      }
      renderReviewSummaryPanel(list);
      renderPanel();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.classList.contains("is-locked")) return;
      if (!terms || !terms.checked) {
        alert("Rəy göndərmək üçün istifadəçi şərtlərini qəbul edin.");
        return;
      }
      var stars = Number($("pd-review-stars").value) || 5;
      var text = String(($("pd-review-text").value || "")).trim();
      if (!text) return;
      if (serverMode && API && API.productReviewCreate) {
        API.productReviewCreate(product.id, { stars: stars, text: text })
          .then(function () {
            $("pd-review-text").value = "";
            if (terms) terms.checked = false;
            updateReviewSubmitState();
            closeReviewPopup();
            return API.productReviews(product.id);
          })
          .then(function (data) {
            list = Array.isArray(data && data.reviews) ? data.reviews : [];
            setReviewAccess(!!(data && data.can_review));
            render();
          })
          .catch(function (err) {
            alert((err && err.message) || "Rəy göndərilmədi");
          });
        return;
      }
      list.push({
        stars: stars,
        text: text,
        name: "İstifadəçi",
        time: new Date().toLocaleDateString("az-AZ"),
      });
      setLocal(key, list);
      $("pd-review-text").value = "";
      if (terms) terms.checked = false;
      updateReviewSubmitState();
      closeReviewPopup();
      render();
    });
    bindPanel();
    bindReviewPopup();
    render();
    setReviewAccess(false);
    if (API && API.productReviews) {
      API.productReviews(product.id)
        .then(function (data) {
          serverMode = true;
          list = Array.isArray(data && data.reviews) ? data.reviews : [];
          setReviewAccess(!!(data && data.can_review));
          render();
        })
        .catch(function () {
          canReviewProduct(product.id).then(setReviewAccess);
        });
    } else {
      canReviewProduct(product.id).then(setReviewAccess);
    }
  }

  function initQA(product) {
    var key = "pd-qa:" + (product.id || product.slug);
    var listEl = $("pd-qa");
    var sumEl = $("pd-qa-summary");
    var form = $("pd-qa-form");
    if (!listEl || !form) return;

    var list = getLocal(key, []);
    var serverMode = false;
    var popup = $("pd-question-popup");
    var terms = $("pd-qa-terms");
    var textEl = $("pd-qa-text");
    var submit = $("pd-qa-submit");

    function updateSubmitState() {
      if (!submit || !terms || !textEl) return;
      submit.disabled = !terms.checked || !String(textEl.value || "").trim();
    }

    function openQuestionPopup() {
      if (!popup) return;
      popup.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
      if (terms) terms.checked = false;
      if (textEl) {
        textEl.value = "";
        window.setTimeout(function () { textEl.focus(); }, 60);
      }
      updateSubmitState();
    }

    function closeQuestionPopup() {
      if (!popup) return;
      popup.setAttribute("hidden", "");
      document.body.style.overflow = document.querySelector(".pd-panel-modal:not([hidden])") ? "hidden" : "";
    }

    function bindQuestionPopup() {
      ["pd-open-question", "pd-open-question-panel"].forEach(function (id) {
        var btn = $(id);
        if (btn && !btn.dataset.bound) {
          btn.dataset.bound = "1";
          btn.addEventListener("click", openQuestionPopup);
        }
      });
      if (popup && !popup.dataset.bound) {
        popup.dataset.bound = "1";
        popup.querySelectorAll("[data-pd-question-close]").forEach(function (btn) {
          btn.addEventListener("click", closeQuestionPopup);
        });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape" && !popup.hasAttribute("hidden")) closeQuestionPopup();
        });
      }
      if (terms && !terms.dataset.bound) {
        terms.dataset.bound = "1";
        terms.addEventListener("change", updateSubmitState);
      }
      if (textEl && !textEl.dataset.bound) {
        textEl.dataset.bound = "1";
        textEl.addEventListener("input", updateSubmitState);
      }
      updateSubmitState();
    }

    function renderPanel(filterText) {
      var listPanel = $("pd-qa-panel-list");
      var productCard = $("pd-qa-product-card");
      var sellerCard = $("pd-qa-seller-card");
      var title = $("pd-qa-modal-title");
      if (productCard) productCard.innerHTML = panelProductHtml(product);
      if (sellerCard) sellerCard.innerHTML = panelSellerHtml(product);
      if (title) title.textContent = "Bütün məhsul sualları (" + list.length + ")";

      var visible = list.slice().reverse();
      if (filterText) {
        var q = filterText.toLowerCase();
        visible = visible.filter(function (item) {
          return (
            String(item.text || "").toLowerCase().indexOf(q) !== -1 ||
            String(item.answer || "").toLowerCase().indexOf(q) !== -1
          );
        });
      }

      if (!listPanel) return;
      if (!visible.length) {
        listPanel.innerHTML = "<p class='pd-panel-empty'>Göstəriləcək sual yoxdur.</p>";
        return;
      }
      listPanel.innerHTML = visible
        .map(function (q) {
          return (
            '<article class="pd-panel-question">' +
            "<h3>" + esc(q.text || "") + "</h3>" +
            '<p class="pd-panel-question__meta">' +
            esc(q.name || "İstifadəçi") + " · " + esc(q.time || "") +
            "</p>" +
            '<div class="pd-panel-question__answer">' +
            '<span class="pd-qa-avatar">' + esc(STORE_NAME.charAt(0)) + "</span>" +
            "<div><strong>" + esc(STORE_NAME) + " satıcısının cavabı</strong>" +
            "<p>" + esc(q.answer || "Cavab gözlənilir...") + "</p></div>" +
            "</div>" +
            "</article>"
          );
        })
        .join("");
    }

    function bindPanel() {
      var open = $("pd-open-qa");
      var search = $("pd-qa-search");
      if (open && !open.dataset.bound) {
        open.dataset.bound = "1";
        open.addEventListener("click", function () {
          renderPanel(search ? search.value.trim() : "");
          openPanelModal("pd-qa-modal");
        });
      }
      if (search && !search.dataset.bound) {
        search.dataset.bound = "1";
        search.addEventListener("input", function () {
          renderPanel(search.value.trim());
        });
      }
    }

    function render() {
      if (sumEl) sumEl.textContent = "(" + list.length + ")";
      if (!list.length) {
        listEl.innerHTML =
          '<article class="pd-qa-item pd-qa-item--empty">' +
          '<h3>Hələ sual yoxdur</h3>' +
          '<div class="pd-qa-item__answer">' +
          '<span class="pd-qa-avatar">' + esc(STORE_NAME.charAt(0)) + "</span>" +
          '<div><strong>' + esc(STORE_NAME) + " satıcısının cavabı</strong>" +
          "<p>İlk sualı siz verin, cavab burada görünəcək.</p></div>" +
          "</div>" +
          "</article>";
      } else {
        listEl.innerHTML = list
          .slice()
          .reverse()
          .slice(0, 3)
          .map(function (q) {
            return (
              '<article class="pd-qa-item">' +
              "<h3>" +
              esc(q.text || "") +
              "</h3>" +
              '<p class="pd-qa-item__meta">' +
              esc(q.name || "İstifadəçi") +
              " · " +
              esc(q.time || "") +
              "</p>" +
              '<div class="pd-qa-item__answer">' +
              '<span class="pd-qa-avatar">' + esc(STORE_NAME.charAt(0)) + "</span>" +
              "<div><strong>" + esc(STORE_NAME) + " satıcısının cavabı</strong>" +
              "<p>" + esc(q.answer || "Cavab gözlənilir...") + "</p></div>" +
              "</div>" +
              "</article>"
            );
          })
          .join("");
      }
      renderPanel();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = String(($("pd-qa-text").value || "")).trim();
      if (!terms || !terms.checked) {
        alert("Sual göndərmək üçün istifadəçi şərtlərini qəbul edin.");
        return;
      }
      if (!text) return;
      if (serverMode && API && API.productQuestionCreate) {
        API.productQuestionCreate(product.id, { text: text })
          .then(function () {
            $("pd-qa-text").value = "";
            if (terms) terms.checked = false;
            updateSubmitState();
            closeQuestionPopup();
            return API.productQuestions(product.id);
          })
          .then(function (data) {
            list = Array.isArray(data && data.questions) ? data.questions : [];
            render();
          })
          .catch(function (err) {
            if (err && err.status === 401) {
              alert("Sual vermək üçün hesaba giriş edin.");
              return;
            }
            alert((err && err.message) || "Sual göndərilmədi");
          });
        return;
      }
      var now = new Date();
      list.push({
        text: text,
        name: "İstifadəçi",
        time: now.toLocaleDateString("az-AZ"),
        answer: "",
      });
      setLocal(key, list);
      $("pd-qa-text").value = "";
      if (terms) terms.checked = false;
      updateSubmitState();
      closeQuestionPopup();
      render();
    });
    bindPanel();
    bindQuestionPopup();
    render();
    if (API && API.productQuestions) {
      API.productQuestions(product.id)
        .then(function (data) {
          serverMode = true;
          list = Array.isArray(data && data.questions) ? data.questions : [];
          render();
        })
        .catch(function () {
          serverMode = false;
        });
    }
  }

  function renderSellers(product) {
    var main = $("pd-main-seller");
    if (!main) return;
    var mainSeller = getSellerName(product);
    var logo = product && product.vendor_logo_url ? resolveAssetPath(product.vendor_logo_url) : "";
    var avatarHtml = logo
      ? '<img class="seller-avatar seller-avatar--img" src="' + escAttr(logo) + '" alt="' + escAttr(mainSeller) + '">'
      : '<div class="seller-avatar">' + esc(mainSeller.charAt(0)) + "</div>";

    main.innerHTML =
      avatarHtml +
      "<div>" +
      '<div class="seller-name">' +
      esc(mainSeller) +
      "</div>" +
      '<div class="seller-meta">Rəsmi mağaza · Çatdırılma: 1–3 iş günü · Pulsuz çatdırılma</div>' +
      "</div>";
  }

  function applyHeader(product) {
    var bc = $("pd-bc-title");
    if (bc) bc.textContent = product.name;
    document.title = product.name + " | Buykon.com";
  }

  function renderPrice(product) {
    var now = $("pd-price-now");
    var old = $("pd-price-old");
    var disc = $("pd-price-disc");
    if (now) now.textContent = formatMoney(product.price);
    if (!old || !disc) return;
    if (product.base_price != null && Number(product.discount_percent) > 0) {
      old.textContent = formatMoney(product.base_price);
      old.removeAttribute("hidden");
      disc.textContent = "-" + Math.round(Number(product.discount_percent)) + "%";
      disc.removeAttribute("hidden");
    } else {
      old.setAttribute("hidden", "");
      disc.setAttribute("hidden", "");
    }
  }

  function renderModelCode(product) {
    var el = $("pd-model");
    if (!el) return;
    var code = product.sku || product.model || product.id;
    if (code == null || code === "") {
      el.setAttribute("hidden", "");
      return;
    }
    el.textContent = "Məhsul kodu: " + code;
    el.removeAttribute("hidden");
  }

  function renderAvailability(product) {
    var el = $("pd-availability");
    if (!el) return;
    var available = isInStock(product);
    var label;
    if (!available) {
      label = "Məhsul mövcud deyil";
    } else if (product.stock != null && Number(product.stock) > 0 && Number(product.stock) <= 5) {
      label = "Son " + Number(product.stock) + " ədəd — tələsin";
    } else {
      label = "Stokda mövcuddur";
    }
    el.className =
      "pd-availability " + (available ? "pd-availability--in" : "pd-availability--out");
    el.innerHTML = (available ? AVAIL_ICON_IN : AVAIL_ICON_OUT) + esc(label);
  }

  function renderCategoryChip(product) {
    var chip = $("pd-cat-chip");
    if (!chip) return;
    var name = product.category_name || categoryLabel(product.cat);
    if (!name) {
      chip.setAttribute("hidden", "");
      return;
    }
    chip.textContent = name;
    chip.href = "../../index.html#catalog";
    chip.removeAttribute("hidden");
  }

  function renderSold(product) {
    var el = $("pd-sold");
    if (!el) return;
    var sold = Number(product.sold_count) || 0;
    if (sold > 0) {
      el.textContent = sold + " ədəd satıldı";
      el.removeAttribute("hidden");
    } else {
      el.setAttribute("hidden", "");
    }
  }

  function initQuantity(product) {
    var wrap = $("pd-qty-wrap");
    var input = $("pd-qty-input");
    var dec = $("pd-qty-dec");
    var inc = $("pd-qty-inc");
    if (!wrap || !input) return;

    if (!isInStock(product)) {
      wrap.setAttribute("hidden", "");
      return;
    }
    var max =
      product.stock != null && Number(product.stock) > 0
        ? Number(product.stock)
        : 99;

    function getQty() {
      var v = parseInt(input.value, 10);
      if (isNaN(v) || v < 1) v = 1;
      if (v > max) v = max;
      return v;
    }
    function setQty(v) {
      input.value = getQtyClamped(v);
      if (dec) dec.disabled = getQty() <= 1;
      if (inc) inc.disabled = getQty() >= max;
    }
    function getQtyClamped(v) {
      if (isNaN(v) || v < 1) v = 1;
      if (v > max) v = max;
      return v;
    }

    input.dataset.max = String(max);
    if (dec) dec.addEventListener("click", function () { setQty(getQty() - 1); });
    if (inc) inc.addEventListener("click", function () { setQty(getQty() + 1); });
    input.addEventListener("input", function () {
      input.value = input.value.replace(/[^\d]/g, "");
    });
    input.addEventListener("blur", function () { setQty(getQty()); });
    setQty(1);
  }

  function getSelectedQty() {
    var input = $("pd-qty-input");
    if (!input) return 1;
    var v = parseInt(input.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    return v;
  }

  function initMobileTabs() {
    var nav = $("pd-tab-nav");
    if (!nav || nav.dataset.bound) return;
    nav.dataset.bound = "1";

    var mq = window.matchMedia("(max-width: 900px)");
    var buttons = nav.querySelectorAll(".pd-tab-nav__btn");
    var panels = document.querySelectorAll(".pd-tab-panel");

    function activate(tab) {
      buttons.forEach(function (btn) {
        var on = btn.getAttribute("data-pd-tab") === tab;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach(function (panel) {
        var on = panel.getAttribute("data-pd-panel") === tab;
        panel.classList.toggle("is-active", on);
        if (mq.matches) {
          panel.hidden = !on;
        } else {
          panel.hidden = false;
        }
      });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activate(btn.getAttribute("data-pd-tab") || "specs");
      });
    });

    function syncLayout() {
      var active =
        nav.querySelector(".pd-tab-nav__btn.is-active") ||
        buttons[0];
      var tab = active ? active.getAttribute("data-pd-tab") || "specs" : "specs";
      if (mq.matches) {
        activate(tab);
      } else {
        panels.forEach(function (panel) {
          panel.hidden = false;
          panel.classList.add("is-active");
        });
      }
    }

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", syncLayout);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(syncLayout);
    }

    syncLayout();
  }

  function renderRating(product) {
    var rating = Math.max(0, Math.min(5, Number(product.rating_stars) || 0));
    var count = Number(product.rating_count) || 0;
    var starsEl = document.querySelector("#pd-rating .pd-stars");
    var txtEl = $("pd-rating-text");
    if (starsEl) starsEl.innerHTML = starsHtml(rating);
    if (txtEl) {
      txtEl.textContent = count > 0
        ? rating.toFixed(1) + " (" + count + " rəy)"
        : "Hələ rəy yoxdur";
    }
  }

  function setMainImgBadge(product) {
    var badge = $("pd-badge");
    if (!badge) return;
    if (product.discount_percent && product.discount_percent > 0) {
      badge.textContent = "-" + Math.round(product.discount_percent) + "%";
      badge.removeAttribute("hidden");
    } else {
      badge.textContent = "";
      badge.setAttribute("hidden", "");
    }
  }

  function pickProduct(all) {
    var idRaw = getParam("id");
    var slugRaw = getSlugFromLocation();
    var id = Number(idRaw) || 0;
    var allNorm = (all || []).map(normalizeProduct).filter(Boolean);
    if (slugRaw) {
      var s = slugify(slugRaw);
      return (
        allNorm.find(function (p) { return slugify(p.slug) === s; }) ||
        allNorm.find(function (p) { return slugify(p.name) === s; }) ||
        (id ? allNorm.find(function (p) { return p.id === id; }) : null) ||
        null
      );
    }
    if (id) {
      return allNorm.find(function (p) { return p.id === id; }) || null;
    }
    return allNorm[0] || null;
  }

  function renderProductCarousels(product, allProducts) {
    var similarEl = $("pd-similar");
    var sellerEl = $("pd-seller-products");
    var allEl = $("pd-all-products");
    if (!similarEl) return;

    var allNorm = (allProducts || []).map(normalizeProduct).filter(Boolean);
    var sameCat = allNorm.filter(function (p) {
      return p.cat === product.cat && p.id !== product.id;
    });
    if (!sameCat.length) {
      sameCat = allNorm.filter(function (p) { return p.id !== product.id; });
    }

    var sellerIdx = Number(product.id || 1) % 5;
    var sellerProducts = allNorm.filter(function (p, i) {
      return p.id !== product.id && i % 5 === sellerIdx;
    });
    if (sellerProducts.length < 3) {
      sellerProducts = allNorm.filter(function (p) { return p.id !== product.id; }).slice(0, 8);
    }

    similarEl.innerHTML =
      sameCat.slice(0, 12).map(function (p) { return cardHtml(p, p.cat); }).join("") ||
      "<p class='pd-mini'>Oxşar məhsul tapılmadı.</p>";
    bindProductCardActions(similarEl);

    if (sellerEl) {
      sellerEl.innerHTML =
        sellerProducts.slice(0, 12).map(function (p) { return cardHtml(p, p.cat); }).join("") ||
        "<p class='pd-mini'>Satıcının başqa məhsulu tapılmadı.</p>";
      bindProductCardActions(sellerEl);
    }

    if (allEl) {
      allEl.innerHTML =
        allNorm.map(function (p) { return cardHtml(p, p.cat); }).join("") ||
        "<p class='pd-mini'>Məhsul tapılmadı.</p>";
      bindProductCardActions(allEl);
    }
  }

  function renderAll(product, allProducts) {
    applyHeader(product);
    replaceProductUrl(product);
    var titleEl = $("pd-title");
    if (titleEl) titleEl.textContent = product.name;
    renderCategoryChip(product);
    renderPrice(product);
    renderRating(product);
    renderSold(product);
    renderAvailability(product);
    renderModelCode(product);
    setMainImgBadge(product);
    initGallery(product.images);
    renderSpecs(product.specs);
    renderProductDetails(product);
    renderSellers(product);
    initFavorites(product.id);
    initQuantity(product);
    initAddToCart(product.id, product);
    initReviews(product);
    initQA(product);
    initCarouselNav();
    initMobileTabs();
    renderProductCarousels(product, allProducts);
  }

  function showMissing() {
    var titleEl = $("pd-title");
    if (titleEl) titleEl.textContent = "Məhsul tapılmadı";
    var now = $("pd-price-now");
    if (now) now.textContent = "—";
    var panel = $("pd-specs");
    if (panel) panel.innerHTML = "<p class='pd-mini'>Link düzgün deyil və ya məhsul mövcud deyil.</p>";
    ["pd-qty-wrap", "pd-actions", "pd-seller", "pd-availability", "pd-meta-row"].forEach(function (cls) {
      var el = document.getElementById(cls) || document.querySelector("." + cls);
      if (el) el.style.display = "none";
    });
  }

  function load() {
    var loader;

    if (API && API.products) {
      loader = API.products("all").then(function (d) {
        return (d && d.products) || [];
      });
    } else {
      loader = Promise.resolve(getAllProductsFallback());
    }

    loader
      .then(function (all) {
        var picked = pickProduct(all);
        if (!picked) {
          showMissing();
          return;
        }
        renderAll(picked, all);
      })
      .catch(function () {
        showMissing();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();

