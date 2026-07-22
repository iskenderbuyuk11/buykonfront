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
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
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

    var slug =
      p.slug ||
      (p.name ? slugify(p.name) : "") ||
      (id ? "p-" + id : "");

    var images = [];
    if (Array.isArray(p.images) && p.images.length) images = p.images.slice();
    if (!images.length && image) images = [image];

    if (images.length < 5 && images.length) {
      while (images.length < 5) images.push(images[0]);
    }

    return {
      id: id,
      name: name,
      cat: cat,
      price: price,
      base_price: base,
      discount_percent: discountPercent,
      popular: popular,
      slug: slug,
      image_url: image,
      images: images,
      vendor_name: p.vendor_name || "",
      sold_count: p.sold_count != null ? Number(p.sold_count) || 0 : 0,
      rating_stars: p.rating_stars != null ? Number(p.rating_stars) || 0 : 0,
      rating_count: p.rating_count != null ? Number(p.rating_count) || 0 : 0,
      specs:
        p.specs ||
        {
          "Brend": (name.split(" ")[0] || "—").trim(),
          "Model": name,
          "Zəmanət": "12 ay",
          "Çatdırılma": "1-3 iş günü",
        },
      variant_group: p.variant_group || slug.split("-").slice(0, 2).join("-"),
      variant_color: p.variant_color || getParam("color") || "",
    };
  }

  function buildColorVariants(product, allProducts) {
    var base = product.variant_group || product.slug;
    var pool = (allProducts || []).map(normalizeProduct).filter(Boolean);
    var siblings = pool.filter(function (p) {
      return p.variant_group === base && p.id !== product.id;
    });

    var colors = [
      { key: "black", label: "Qara", swatch: "#111827" },
      { key: "white", label: "Ağ", swatch: "#f8fafc" },
      { key: "blue", label: "Mavi", swatch: "#2563eb" },
      { key: "green", label: "Yaşıl", swatch: "#16a34a" },
      { key: "pink", label: "Çəhrayı", swatch: "#db2777" },
    ];

    var list = colors.slice(0, 4).map(function (c, idx) {
      var target = siblings[idx] || null;
      return {
        key: c.key,
        label: c.label,
        swatch: c.swatch,
        targetId: target ? target.id : product.id,
      };
    });

    var active = product.variant_color || list[0].key;
    if (!list.some(function (x) { return x.key === active; })) active = list[0].key;
    return { list: list, activeKey: active };
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

  function cardHtml(p, catLabel) {
    var href = "../product/?id=" + encodeURIComponent(p.id);
    var media = p.image_url
      ? '<img src="' + escAttr(p.image_url) + '" alt="" loading="lazy" />'
      : '<span class="product-card__initial">' + esc(p.name.charAt(0)) + "</span>";
    var old = p.base_price != null && Number(p.discount_percent) > 0
      ? "<del>" + formatMoney(p.base_price) + "</del>"
      : "";
    return (
      '<article class="pd-card">' +
      '<a href="' + href + '">' +
      '<div class="pd-card__media">' + media + "</div>" +
      '<div class="pd-card__body">' +
      '<div class="pd-card__cat">' + esc(catLabel || p.cat) + "</div>" +
      '<div class="pd-card__title">' + esc(p.name) + "</div>" +
      '<div class="pd-card__price">' + old + "<strong>" + formatMoney(p.price) + "</strong></div>" +
      "</div></a></article>"
    );
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

  function initAccordion() {
    var btn = $("pd-specs-toggle");
    var panel = $("pd-specs-panel");
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      if (open) {
        panel.classList.remove("is-opening");
        panel.setAttribute("hidden", "");
      } else {
        panel.removeAttribute("hidden");
        panel.classList.add("is-opening");
        window.setTimeout(function () {
          panel.classList.remove("is-opening");
        }, 240);
      }
    });
  }

  function initGallery(images) {
    var thumbs = $("pd-thumbs");
    var img = $("pd-img");
    var imgWrap = $("pd-img-wrap");
    var prev = $("pd-prev");
    var next = $("pd-next");
    var lens = $("pd-lens");
    var zoom = $("pd-zoom");
    var zoomImg = $("pd-zoom-img");
    var open = $("pd-open");

    if (!thumbs || !img || !prev || !next || !imgWrap) return;
    var list = (images || []).slice(0, 6);
    if (!list.length) list = (function(){var a=document.body.getAttribute("data-assets")||"../../../";return[a+"images/products/iphone15.jpg"];})();

    var idx = 0;

    function setActive(i, animate) {
      idx = (i + list.length) % list.length;
      var src = list[idx];
      if (animate) img.classList.add("is-fading");
      window.setTimeout(function () {
        img.src = src;
        img.classList.remove("is-fading");
        if (zoomImg) zoomImg.src = src;
        thumbs.querySelectorAll(".gallery__thumb").forEach(function (t) {
          t.classList.toggle("is-active", Number(t.getAttribute("data-idx")) === idx);
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

    prev.addEventListener("click", function () {
      setActive(idx - 1, true);
    });
    next.addEventListener("click", function () {
      setActive(idx + 1, true);
    });

    function pointerPos(e) {
      var r = imgWrap.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      return { x: clamp(x, 0, 1), y: clamp(y, 0, 1), rect: r };
    }

    function enableZoom(on) {
      if (!lens || !zoom || !zoomImg) return;
      lens.classList.toggle("is-on", on);
      zoom.classList.toggle("is-on", on);
      zoom.setAttribute("aria-hidden", on ? "false" : "true");
    }

    function moveZoom(e) {
      if (!lens || !zoom || !zoomImg) return;
      var p = pointerPos(e);
      var lensSize = lens.offsetWidth || 140;
      var lx = p.x * p.rect.width - lensSize / 2;
      var ly = p.y * p.rect.height - lensSize / 2;
      lx = clamp(lx, 0, p.rect.width - lensSize);
      ly = clamp(ly, 0, p.rect.height - lensSize);
      lens.style.transform = "translate(" + lx + "px," + ly + "px)";

      var zoomScale = 2.4;
      var zx = -p.x * (zoomScale - 1) * zoom.offsetWidth;
      var zy = -p.y * (zoomScale - 1) * zoom.offsetHeight;
      zoomImg.style.transform = "translate(" + zx + "px," + zy + "px) scale(" + zoomScale + ")";
    }

    imgWrap.addEventListener("mouseenter", function () {
      enableZoom(true);
    });
    imgWrap.addEventListener("mouseleave", function () {
      enableZoom(false);
    });
    imgWrap.addEventListener("mousemove", moveZoom);
    imgWrap.addEventListener("focus", function () { enableZoom(false); });

    function keyNav(e) {
      if (e.key === "ArrowLeft") setActive(idx - 1, true);
      if (e.key === "ArrowRight") setActive(idx + 1, true);
    }
    imgWrap.addEventListener("keydown", keyNav);

    if (open) {
      open.addEventListener("click", function () {
        openLightbox(list, idx, setActive);
      });
    }
    imgWrap.addEventListener("click", function () {
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
    if (!box || !img || !prev || !next || !thumbs) return;

    var list = (images || []).slice();
    var idx = startIdx || 0;

    function setIdx(i) {
      idx = (i + list.length) % list.length;
      img.src = list[idx];
      thumbs.querySelectorAll(".pd-lightbox__thumb").forEach(function (t) {
        t.classList.toggle("is-active", Number(t.getAttribute("data-idx")) === idx);
      });
      if (typeof onChangeMain === "function") onChangeMain(idx, false);
    }

    thumbs.innerHTML = list
      .map(function (src, i) {
        return (
          '<button type="button" class="pd-lightbox__thumb' +
          (i === idx ? " is-active" : "") +
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

    thumbs.onclick = function (e) {
      var b = e.target.closest(".pd-lightbox__thumb");
      if (!b) return;
      setIdx(Number(b.getAttribute("data-idx")) || 0);
    };

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

      var assetRoot = document.body.getAttribute("data-assets") || "../../../";
      btn.innerHTML =
        '<img src="' +
        (active
          ? assetRoot + "images/heart-svgrepo-com (1).svg"
          : assetRoot + "images/heart-svgrepo-com.svg") +
        '" alt="" class="fav-icon">';
    }

    setHeartIcon(on);

    btn.addEventListener("click", function () {
      if (!Fav || !Fav.toggle) return;

      var next = Fav.toggle(productId);
      setHeartIcon(next);
    });
  }

  function initAddToCart(productId) {
    var btn = $("pd-add-cart");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!API || !API.cartAdd) {
        alert("Səbət funksiyası üçün sayt API-si tələb olunur.");
        return;
      }
      btn.disabled = true;
      API.cartAdd(productId, 1)
        .then(function (d) {
          if (window.BizdevarHeader) BizdevarHeader.setCartBadge(d.total_qty);
        })
        .catch(function (e) {
          alert((e && e.message) || "Səbətə əlavə olunmadı");
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  function initReviews(product) {
    var key = "pd-reviews:" + (product.id || product.slug);
    var listEl = $("pd-reviews");
    var sumEl = $("pd-review-summary");
    var form = $("pd-review-form");
    if (!listEl || !form || !sumEl) return;

    var list = getLocal(key, []);
    function render() {
      if (!list.length) {
        listEl.innerHTML = "<p class='pd-mini'>Hələ rəy yoxdur. İlk rəy yazan siz olun.</p>";
      } else {
        listEl.innerHTML = list
          .slice()
          .reverse()
          .map(function (r) {
            return (
              '<article class="pd-review">' +
              '<div class="pd-review__head">' +
              '<div class="pd-review__name">' +
              esc(r.name || "İstifadəçi") +
              "</div>" +
              '<div class="pd-review__stars" aria-label="' +
              escAttr(String(r.stars || 5)) +
              ' ulduz">' +
              renderStars(Number(r.stars) || 5) +
              "</div>" +
              "</div>" +
              '<p class="pd-review__text">' +
              esc(r.text || "") +
              "</p>" +
              "</article>"
            );
          })
          .join("");
      }
      var avg =
        list.length
          ? list.reduce(function (s, r) { return s + (Number(r.stars) || 0); }, 0) / list.length
          : 0;
      sumEl.textContent = list.length ? ("Orta: " + avg.toFixed(1) + " / 5 (" + list.length + " rəy)") : "0 rəy";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var stars = Number($("pd-review-stars").value) || 5;
      var text = String(($("pd-review-text").value || "")).trim();
      if (!text) return;
      list.push({ stars: stars, text: text, name: "İstifadəçi" });
      setLocal(key, list);
      $("pd-review-text").value = "";
      render();
    });
    render();
  }

  function initQA(product) {
    var key = "pd-qa:" + (product.id || product.slug);
    var listEl = $("pd-qa");
    var sumEl = $("pd-qa-summary");
    var form = $("pd-qa-form");
    if (!listEl || !form || !sumEl) return;

    var list = getLocal(key, []);
    function render() {
      sumEl.textContent = list.length ? (list.length + " sual") : "0 sual";
      if (!list.length) {
        listEl.innerHTML = "<p class='pd-mini'>Hələ sual yoxdur. İlk sualı siz verin.</p>";
      } else {
        listEl.innerHTML = list
          .slice()
          .reverse()
          .map(function (q) {
            return (
              '<article class="pd-review">' +
              '<div class="pd-review__head">' +
              '<div class="pd-review__name">' +
              esc(q.name || "İstifadəçi") +
              "</div>" +
              '<div class="pd-mini">' +
              esc(q.time || "") +
              "</div>" +
              "</div>" +
              '<p class="pd-review__text"><strong>Sual:</strong> ' +
              esc(q.text || "") +
              "</p>" +
              (q.answer
                ? '<p class="pd-review__text"><strong>Cavab:</strong> ' + esc(q.answer) + "</p>"
                : '<p class="pd-mini">Cavab gözlənilir…</p>') +
              "</article>"
            );
          })
          .join("");
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = String(($("pd-qa-text").value || "")).trim();
      if (!text) return;
      var now = new Date();
      list.push({
        text: text,
        name: "İstifadəçi",
        time: now.toLocaleDateString("az-AZ"),
        answer: "",
      });
      setLocal(key, list);
      $("pd-qa-text").value = "";
      render();
    });
    render();
  }

  function renderSellers(product) {
    var main = $("pd-main-seller");
    var list = $("pd-sellers");
    if (!main || !list) return;
    var seller = product.vendor_name || "BizdeVar Resmi";
    var rating = Math.max(0, Math.min(5, Number(product.rating_stars) || 0));
    var sold = Number(product.sold_count) || 0;

    main.innerHTML =
      '<div class="seller-avatar">BV</div>' +
      "<div>" +
      '<div class="seller-name">' +
      esc(seller) +
      "</div>" +
      '<div class="seller-meta">' +
      esc(renderStars(rating)) +
      " " +
      esc(rating.toFixed(1)) +
      "/5 · Satıldı: " +
      esc(String(sold)) +
      "</div>" +
      "</div>";

    list.innerHTML = "";
  }

  function renderColorRow(variants, activeKey) {
    var row = $("pd-colors");
    if (!row) return;
    row.innerHTML = variants
      .map(function (c) {
        var active = c.key === activeKey;
        return (
          '<button type="button" class="pd-color' +
          (active ? " is-active" : "") +
          '" style="--swatch:' +
          escAttr(c.swatch) +
          '" data-color="' +
          escAttr(c.key) +
          '" data-target="' +
          escAttr(String(c.targetId || "")) +
          '" aria-label="' +
          escAttr(c.label) +
          '"></button>'
        );
      })
      .join("");

    row.addEventListener("click", function (e) {
      var b = e.target.closest(".pd-color");
      if (!b) return;
      var color = b.getAttribute("data-color") || "";
      var target = b.getAttribute("data-target") || "";
      if (target) {
        setParams({ id: target, color: color });
      } else {
        setParams({ color: color });
      }
    });
  }

  function applyHeader(product) {
    var bc = $("pd-bc-title");
    if (bc) bc.textContent = product.name;
    document.title = product.name + " | BizdəVar";
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

  function renderRating(product) {
    var rating = Math.max(0, Math.min(5, Number(product.rating_stars) || 0));
    var count = Number(product.rating_count) || 0;
    var sold = Number(product.sold_count) || 0;
    var starsEl = document.querySelector("#pd-rating .pd-stars");
    var txtEl = $("pd-rating-text");
    var inCarts = $("pd-in-carts");
    if (starsEl) starsEl.textContent = renderStars(rating);
    if (txtEl) txtEl.textContent = rating.toFixed(1) + " (" + count + " rəy)";
    if (inCarts) inCarts.textContent = sold + " ədəd satıldı";
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
    var slugRaw = getParam("slug");
    var id = Number(idRaw) || 0;
    var allNorm = (all || []).map(normalizeProduct).filter(Boolean);
    if (id) {
      return allNorm.find(function (p) { return p.id === id; }) || allNorm[0] || null;
    }
    if (slugRaw) {
      var s = slugify(slugRaw);
      return (
        allNorm.find(function (p) { return slugify(p.slug) === s; }) ||
        allNorm.find(function (p) { return slugify(p.name) === s; }) ||
        allNorm[0] ||
        null
      );
    }
    return allNorm[0] || null;
  }

  function renderSimilarAndPopular(product, allProducts) {
    var similarEl = $("pd-similar");
    var popularEl = $("pd-popular");
    if (!similarEl || !popularEl) return;

    var allNorm = (allProducts || []).map(normalizeProduct).filter(Boolean);
    var sameCat = allNorm.filter(function (p) { return p.cat === product.cat && p.id !== product.id; });
    var popular = allNorm
      .slice()
      .sort(function (a, b) { return (b.popular || 0) - (a.popular || 0); })
      .filter(function (p) { return p.id !== product.id; });

    similarEl.innerHTML = sameCat.slice(0, 8).map(function (p) { return cardHtml(p, p.cat); }).join("") ||
      "<p class='pd-mini'>Oxşar məhsul tapılmadı.</p>";
    popularEl.innerHTML = popular.slice(0, 8).map(function (p) { return cardHtml(p, p.cat); }).join("") ||
      "<p class='pd-mini'>Populyar məhsul tapılmadı.</p>";
  }

  function renderAll(product, allProducts) {
    applyHeader(product);
    var titleEl = $("pd-title");
    if (titleEl) titleEl.textContent = product.name;
    renderRating(product);
    renderPrice(product);
    setMainImgBadge(product);
    initGallery(product.images);
    renderSpecs(product.specs);
    renderSellers(product);
    initFavorites(product.id);
    initAddToCart(product.id);
    initReviews(product);
    initQA(product);

    var variants = buildColorVariants(product, allProducts);
    renderColorRow(variants.list, variants.activeKey);
    renderSimilarAndPopular(product, allProducts);
  }

  function showMissing() {
    var titleEl = $("pd-title");
    if (titleEl) titleEl.textContent = "Məhsul tapılmadı";
    var now = $("pd-price-now");
    if (now) now.textContent = "—";
    var panel = $("pd-specs");
    if (panel) panel.innerHTML = "<p class='pd-mini'>Link düzgün deyil və ya məhsul mövcud deyil.</p>";
  }

  function load() {
    initAccordion();
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

