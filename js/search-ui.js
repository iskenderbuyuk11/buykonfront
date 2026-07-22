(function () {
  "use strict";

  var STORAGE_KEY = "bizdevar-recent-searches";
  var MAX_RECENT = 8;

  var POPULAR_PICKS = [
    { label: "iPhone", query: "iPhone", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa260" stroke-width="1.75"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>' },
    { label: "Samsung", query: "Samsung", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa260" stroke-width="1.75"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>' },
    { label: "Geyim", query: "geyim", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa260" stroke-width="1.75"><path d="M20.38 3.46L16 2 12 5 8 2 3.62 3.46 2 7l4 2v11h12V9l4-2-2-3.54z"/></svg>' },
    { label: "Kosmetika", query: "kosmetika", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa260" stroke-width="1.75"><path d="M12 3a6 6 0 0 0 6 6c0 2.2-1.2 4.1-3 5.2V21H9v-6.8C7.2 13.1 6 11.2 6 9a6 6 0 0 0 6-6z"/></svg>' },
    { label: "AirPods", query: "AirPods", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa260" stroke-width="1.75"><circle cx="12" cy="12" r="7"/><path d="M12 9v3l2 2"/></svg>' },
    { label: "Elektronika", query: "elektronika", icon: "⚡" },
    { label: "Uşaqlar", query: "usaqlar", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa260" stroke-width="1.75"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a6 6 0 0 1 12 0v2"/></svg>' },
    { label: "İdman", query: "idman", icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffa260" stroke-width="1.75"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>' },
  ];

  var FALLBACK_PRODUCTS = [
    { id: 1, name: "iPhone 15 Pro Max", cat: "Elektronika", price: 2599, image_url: "images/products/iphone15.jpg" },
    { id: 2, name: "Samsung Galaxy S25 Ultra", cat: "Elektronika", price: 2399, image_url: "images/products/iphone15.jpg" },
    { id: 3, name: "Nike Oversize Hoodie", cat: "Geyim", price: 89, image_url: "images/products/iphone15.jpg" },
    { id: 4, name: "Gaming Keyboard RGB", cat: "Elektronika", price: 149, image_url: "images/products/iphone15.jpg" },
    { id: 5, name: "AirPods Pro 2", cat: "Aksesuarlar", price: 499, image_url: "images/products/iphone15.jpg" },
  ];

  var overlay = null;
  var input = null;
  var productsCache = null;
  var productsLoading = false;
  var debounceTimer = null;
  var isOpen = false;
  var lastFocus = null;
  var cameraStream = null;
  var visualToken = 0;

  function getRoot() {
    if (window.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return document.body.getAttribute("data-root") || "";
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
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
      }) + " ₼"
    );
  }

  function readRecent() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(raw)) return [];
      return raw
        .map(function (q) {
          return String(q || "").trim();
        })
        .filter(Boolean)
        .slice(0, MAX_RECENT);
    } catch (e) {
      return [];
    }
  }

  function saveRecent(query) {
    var q = String(query || "").trim();
    if (!q) return;
    var list = readRecent().filter(function (item) {
      return item.toLowerCase() !== q.toLowerCase();
    });
    list.unshift(q);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
    } catch (e) {
      /* ignore */
    }
  }

  function clearRecent() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
    renderIdleState();
  }

  function getProducts() {
    if (productsCache) return Promise.resolve(productsCache);
    if (productsLoading) {
      return new Promise(function (resolve) {
        var tries = 0;
        var timer = setInterval(function () {
          tries += 1;
          if (productsCache) {
            clearInterval(timer);
            resolve(productsCache);
          } else if (tries > 40) {
            clearInterval(timer);
            resolve(normalizeProducts(FALLBACK_PRODUCTS));
          }
        }, 50);
      });
    }

    productsLoading = true;

    if (window.BizdevarAPI && typeof BizdevarAPI.products === "function") {
      return BizdevarAPI.products("all")
        .then(function (data) {
          productsCache = normalizeProducts((data && data.products) || []);
          productsLoading = false;
          return productsCache;
        })
        .catch(function () {
          productsCache = normalizeProducts(getLocalProducts());
          productsLoading = false;
          return productsCache;
        });
    }

    productsCache = normalizeProducts(getLocalProducts());
    productsLoading = false;
    return Promise.resolve(productsCache);
  }

  function getLocalProducts() {
    if (Array.isArray(window.products) && window.products.length) {
      return window.products;
    }
    return FALLBACK_PRODUCTS;
  }

  function normalizeProducts(list) {
    return list.map(function (p) {
      return {
        id: p.id,
        name: p.name || "",
        cat: p.cat || p.category || "",
        price: Number(p.price) || 0,
        image_url: p.image_url || p.image || "",
        slug: p.slug || "",
        description: p.description || "",
        vendor_name: p.vendor_name || p.brand || "",
      };
    });
  }

  function productHref(p) {
    var cfg = window.BizdevarSiteConfig;
    var root = getRoot();
    if (cfg && typeof cfg.productPageUrl === "function") {
      return cfg.productPageUrl(p, root);
    }
    if (p && p.slug) return root + "pages/product/?=" + encodeURIComponent(p.slug);
    if (p && p.id) return root + "pages/product/?id=" + encodeURIComponent(String(p.id));
    return root + "index.html#catalog";
  }

  function productImage(p) {
    var root = getRoot();
    var src = p.image_url || "";
    if (!src) return "";
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveMediaUrl === "function") {
      var resolved = cfg.resolveMediaUrl(src);
      if (resolved) return resolved;
    }
    if (/^https?:\/\//i.test(src) || src.charAt(0) === "/") return src;
    return root + src.replace(/^\.\//, "");
  }

  function isHomePage() {
    var path = (window.location.pathname || "").toLowerCase();
    return path.endsWith("/index.html") || path.endsWith("/") || path.endsWith("/bizde");
  }

  function goSearch(query) {
    var q = String(query || "").trim();
    if (!q) return;
    saveRecent(q);
    close();

    var root = getRoot();
    if (isHomePage()) {
      try {
        var u = new URL(window.location.href);
        u.searchParams.set("q", q);
        u.hash = "catalog";
        window.history.replaceState({}, "", u.pathname + u.search + u.hash);
        window.dispatchEvent(new PopStateEvent("popstate"));
        var catalog = document.getElementById("catalog");
        if (catalog) {
          var top = catalog.getBoundingClientRect().top + window.pageYOffset - 88;
          window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        }
      } catch (e) {
        window.location.href = root + "index.html?q=" + encodeURIComponent(q) + "#catalog";
      }
      return;
    }

    window.location.href =
      root + "index.html?q=" + encodeURIComponent(q) + "#catalog";
  }

  function goProduct(p) {
    if (!p) return;
    saveRecent(p.name || "");
    close();
    window.location.href = productHref(p);
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (t) {
        try {
          t.stop();
        } catch (e) {
          /* ignore */
        }
      });
      cameraStream = null;
    }
    var video = document.getElementById("search-camera-video");
    if (video) video.srcObject = null;
  }

  function renderCameraSheet() {
    var body = document.getElementById("search-popup-body");
    var foot = document.getElementById("search-popup-foot");
    if (!body) return;
    if (foot) foot.setAttribute("hidden", "");

    body.innerHTML =
      '<div class="search-camera">' +
      '<div class="search-camera__head">' +
      "<strong>Şəkillə axtar</strong>" +
      '<button type="button" class="search-camera__back" data-camera-back>Geri</button>' +
      "</div>" +
      '<div class="search-camera__stage">' +
      '<video id="search-camera-video" class="search-camera__video" playsinline muted autoplay></video>' +
      '<div class="search-camera__fallback" id="search-camera-fallback" hidden>' +
      "<p>Kamera açıla bilmədi. Qalereyadan şəkil seçin və ya yenidən cəhd edin.</p>" +
      "</div>" +
      "</div>" +
      '<div class="search-camera__actions">' +
      '<button type="button" class="search-camera__shot" id="search-camera-shot" aria-label="Şəkil çək">' +
      '<span class="search-camera__shot-ring"></span>' +
      "</button>" +
      '<button type="button" class="search-camera__gallery" id="search-camera-gallery">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>' +
      " Qalereya" +
      "</button>" +
      "</div>" +
      '<p class="search-camera__hint">Məhsulu yaxşı işıqda, tam görsənəcək şəkildə çəkin</p>' +
      "</div>";

    var video = document.getElementById("search-camera-video");
    var fallback = document.getElementById("search-camera-fallback");
    var shotBtn = document.getElementById("search-camera-shot");
    var galleryBtn = document.getElementById("search-camera-gallery");

    function openFilePicker(useCapture) {
      var fileInput = document.getElementById("search-popup-file");
      if (!fileInput) return;
      if (useCapture) fileInput.setAttribute("capture", "environment");
      else fileInput.removeAttribute("capture");
      fileInput.value = "";
      fileInput.click();
    }

    if (galleryBtn) {
      galleryBtn.addEventListener("click", function () {
        openFilePicker(false);
      });
    }

    if (shotBtn) {
      shotBtn.addEventListener("click", function () {
        if (!video || !cameraStream || !video.videoWidth) {
          openFilePicker(true);
          return;
        }
        var canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(
          function (blob) {
            if (!blob) {
              openFilePicker(true);
              return;
            }
            stopCamera();
            processVisualSearch(blob);
          },
          "image/jpeg",
          0.92
        );
      });
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (fallback) fallback.removeAttribute("hidden");
      if (video) video.setAttribute("hidden", "");
      openFilePicker(true);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then(function (stream) {
        cameraStream = stream;
        if (video) {
          video.srcObject = stream;
          video.play().catch(function () {
            /* ignore */
          });
        }
      })
      .catch(function () {
        if (fallback) fallback.removeAttribute("hidden");
        if (video) video.setAttribute("hidden", "");
        openFilePicker(true);
      });
  }

  function renderVisualLoading(previewUrl) {
    var body = document.getElementById("search-popup-body");
    var foot = document.getElementById("search-popup-foot");
    if (!body) return;
    if (foot) foot.setAttribute("hidden", "");
    body.innerHTML =
      '<div class="search-visual">' +
      (previewUrl
        ? '<div class="search-visual__preview"><img src="' +
          escAttr(previewUrl) +
          '" alt="" /></div>'
        : "") +
      '<div class="search-popup__loading">' +
      '<span class="search-popup__spinner" aria-hidden="true"></span>' +
      "Oxşar məhsullar axtarılır..." +
      "</div></div>";
  }

  function renderMatchList(matches, badgeFn) {
    return (
      '<ul class="search-popup__result-list">' +
      matches
        .map(function (m) {
          var p = m.product;
          var img = productImage(p);
          var badge = badgeFn ? badgeFn(m) : "";
          return (
            '<li><button type="button" class="search-popup__result" data-search-product-id="' +
            escAttr(String(p.id)) +
            '">' +
            '<span class="search-popup__result-media">' +
            (img
              ? '<img src="' + escAttr(img) + '" alt="" loading="lazy" />'
              : '<span class="search-popup__result-placeholder" aria-hidden="true">📦</span>') +
            "</span>" +
            '<span class="search-popup__result-body">' +
            '<span class="search-popup__result-cat">' +
            esc(p.cat) +
            badge +
            "</span>" +
            '<span class="search-popup__result-name">' +
            esc(p.name) +
            "</span>" +
            '<span class="search-popup__result-price">' +
            esc(formatPrice(p.price)) +
            "</span>" +
            "</span>" +
            '<svg class="search-popup__result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>' +
            "</button></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderVisualResults(previewUrl, pack, meta) {
    var body = document.getElementById("search-popup-body");
    var foot = document.getElementById("search-popup-foot");
    if (!body) return;
    if (foot) foot.setAttribute("hidden", "");
    meta = meta || {};
    pack = pack || {};
    var similar = pack.similar || [];
    var needed = pack.needed || [];
    var detected = meta.detected || "";

    if (!similar.length && !needed.length) {
      body.innerHTML =
        '<div class="search-visual">' +
        (previewUrl
          ? '<div class="search-visual__preview"><img src="' +
            escAttr(previewUrl) +
            '" alt="" /></div>'
          : "") +
        '<div class="search-popup__empty">' +
        '<div class="search-popup__empty-icon" aria-hidden="true">📷</div>' +
        "<p><strong>" +
        (detected
          ? "“" + esc(detected) + "” üçün kataloqda uyğun məhsul yoxdur"
          : "Uyğun məhsul tapılmadı") +
        "</strong></p>" +
        '<p class="search-popup__empty-hint">' +
        esc(
          meta.hint ||
            "Bu tip məhsul hələ kataloqda yoxdur. Mətnlə axtarın və ya başqa bucaqdan çəkin."
        ) +
        "</p>" +
        (meta.query
          ? '<button type="button" class="search-visual__retry" data-visual-text-search="' +
            escAttr(meta.query) +
            '">“' +
            esc(meta.query) +
            "” ilə axtar</button>"
          : "") +
        '<button type="button" class="search-visual__retry search-visual__retry--link" data-camera-retry>Yenidən çək</button>' +
        "</div></div>";
      return;
    }

    var queryHint = detected
      ? '<p class="search-visual__query">Tanındı: <strong>' +
        esc(detected) +
        "</strong></p>"
      : meta.query
        ? '<p class="search-visual__query">Axtarış: <strong>' +
          esc(meta.query) +
          "</strong></p>"
        : "";

    var similarHtml = similar.length
      ? '<section class="search-visual__section">' +
        '<h3 class="search-visual__section-title">Eyni / oxşar</h3>' +
        renderMatchList(similar, function (m) {
          var kind = m.kind || "";
          if (kind === "exact") {
            return ' · <span class="search-visual__match">Eyni / çox yaxın</span>';
          }
          var pct = Math.round((m.score || 0) * 100);
          if (pct >= 55) {
            return ' · <span class="search-visual__match">' + pct + "% uyğun</span>";
          }
          return ' · <span class="search-visual__match search-visual__match--soft">Oxşar</span>';
        }) +
        "</section>"
      : "";

    var neededHtml = needed.length
      ? '<section class="search-visual__section">' +
        '<h3 class="search-visual__section-title">Bunun üçün lazım ola bilər</h3>' +
        renderMatchList(needed, function () {
          return ' · <span class="search-visual__match search-visual__match--soft">Uyğun aksesuar</span>';
        }) +
        "</section>"
      : "";

    body.innerHTML =
      '<div class="search-visual">' +
      '<div class="search-visual__top">' +
      (previewUrl
        ? '<div class="search-visual__preview search-visual__preview--sm"><img src="' +
          escAttr(previewUrl) +
          '" alt="" /></div>'
        : "") +
      "<div>" +
      '<p class="search-popup__results-meta">' +
      esc(String(similar.length + needed.length)) +
      " uyğun nəticə</p>" +
      queryHint +
      '<button type="button" class="search-visual__retry search-visual__retry--link" data-camera-retry>Yenidən çək</button>' +
      "</div></div>" +
      similarHtml +
      neededHtml +
      "</div>";
  }

  function getGeminiKey() {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveGeminiKey === "function") {
      return cfg.resolveGeminiKey();
    }
    return "";
  }

  function azFold(s) {
    var map = {
      ə: "e",
      Ə: "e",
      ı: "i",
      İ: "i",
      ğ: "g",
      Ğ: "g",
      ö: "o",
      Ö: "o",
      ü: "u",
      Ü: "u",
      ş: "s",
      Ş: "s",
      ç: "c",
      Ç: "c",
    };
    return String(s || "")
      .split("")
      .map(function (ch) {
        return map[ch] != null ? map[ch] : ch;
      })
      .join("")
      .toLowerCase();
  }

  function tokenize(s) {
    return azFold(s)
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .map(function (t) {
        return t.trim();
      })
      .filter(function (t) {
        return t.length >= 2;
      });
  }

  var VISUAL_SYNONYMS = {
    kran: ["faucet", "mixer", "musluk", "qarisdirici", "tap", "bath", "mixerfaucet"],
    qarisdirici: ["kran", "faucet", "mixer", "musluk", "mixing"],
    dus: ["shower", "ust dus", "rainshower", "duş"],
    shower: ["dus", "ust", "rain"],
    telefon: ["phone", "smartphone", "iphone", "samsung", "mobil"],
    iphone: ["apple", "telefon", "phone", "ios"],
    samsung: ["galaxy", "telefon", "android", "phone"],
    ayaqqabi: ["shoe", "sneakers", "krossovka", "bot"],
    geyim: ["clothing", "apparel", "tshirt", "hoodie", "shirt"],
    kosmetika: ["beauty", "makeup", "cream", "serum"],
    noutbuk: ["laptop", "notebook", "macbook"],
    qulaqliq: ["headphone", "earphone", "airpods", "buds"],
    saat: ["watch", "smartwatch"],
    canta: ["bag", "backpack", "purse"],
    ev: ["home", "kitchen", "house", "ev-yasam", "yasam"],
    "ev-yasam": ["ev", "home", "kran", "dus", "bathroom"],
  };

  var CAT_ALIASES = {
    ev: ["ev", "ev-yasam", "home", "yasam", "meiset"],
    "ev-yasam": ["ev", "ev-yasam", "home", "yasam"],
    elektronika: ["elektronika", "electronics", "tech"],
    geyim: ["geyim", "clothing", "moda"],
    kosmetika: ["kosmetika", "beauty"],
    aksesuar: ["aksesuar", "aksesuarlar", "accessories"],
    aksesuarlar: ["aksesuar", "aksesuarlar"],
    usaq: ["usaq", "usaqlar", "kids", "child"],
    idman: ["idman", "sport"],
    supermarket: ["supermarket", "market"],
  };

  function expandTokens(tokens) {
    var out = {};
    tokens.forEach(function (t) {
      out[t] = true;
      var syn = VISUAL_SYNONYMS[t];
      if (syn) {
        syn.forEach(function (s) {
          out[azFold(s)] = true;
        });
      }
      Object.keys(VISUAL_SYNONYMS).forEach(function (key) {
        if (VISUAL_SYNONYMS[key].indexOf(t) !== -1) out[key] = true;
      });
    });
    return Object.keys(out);
  }

  function blobToJpegBase64(blob, maxSide) {
    maxSide = maxSide || 896;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          var scale = Math.min(1, maxSide / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));
          var canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          canvas.getContext("2d").drawImage(img, 0, 0, cw, ch);
          var dataUrl = canvas.toDataURL("image/jpeg", 0.78);
          URL.revokeObjectURL(url);
          var base64 = dataUrl.split(",")[1] || "";
          resolve({ base64: base64, previewUrl: dataUrl, mime: "image/jpeg" });
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Şəkil oxunmadı"));
      };
      img.src = url;
    });
  }

  function parseVisionJson(text) {
    var raw = String(text || "").trim();
    var fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) raw = fence[1].trim();
    var start = raw.indexOf("{");
    var end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (e) {
      return null;
    }
  }

  function buildCatalogDigest(products) {
    var max = Math.min(products.length, 90);
    var lines = [];
    var i;
    for (i = 0; i < max; i++) {
      var p = products[i];
      lines.push(
        String(p.id) +
          " | " +
          String(p.name || "").slice(0, 90) +
          " | " +
          String(p.cat || "") +
          " | " +
          String(p.vendor_name || "")
      );
    }
    return lines.join("\n");
  }

  var WEAK_TOKENS = {
    ev: true,
    home: true,
    yasam: true,
    "ev-yasam": true,
    other: true,
    product: true,
    mehsul: true,
    item: true,
    white: true,
    black: true,
    silver: true,
    chrome: true,
    xrom: true,
    modern: true,
    new: true,
    set: true,
  };

  function strongTypeTokens(analysis) {
    var bag = [];
    if (!analysis) return [];
    ["type", "product_name", "brand"].forEach(function (k) {
      if (analysis[k]) bag = bag.concat(tokenize(analysis[k]));
    });
    (analysis.keywords || []).forEach(function (k) {
      bag = bag.concat(tokenize(k));
    });
    return expandTokens(bag).filter(function (t) {
      return t && t.length >= 3 && !WEAK_TOKENS[t];
    });
  }

  function productHaystack(product) {
    return azFold(
      [
        product.name,
        product.cat,
        product.slug,
        product.vendor_name,
        String(product.description || "").slice(0, 280),
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function productSharesType(product, typeTokens) {
    if (!typeTokens || !typeTokens.length) return false;
    var hay = productHaystack(product);
    var hits = 0;
    typeTokens.forEach(function (t) {
      if (hay.indexOf(t) !== -1) hits += 1;
    });
    return hits >= 1;
  }

  function analyzeImageWithGemini(base64, mime, products) {
    var key = getGeminiKey();
    if (!key) {
      return Promise.reject(new Error("NO_GEMINI_KEY"));
    }

    var catalog = buildCatalogDigest(products || []);
    var prompt =
      "You help Buykon (Azerbaijani marketplace) visual search.\n" +
      "STEP 1: Identify the MAIN product in the photo (name, brand, type).\n" +
      "STEP 2: From OUR CATALOG, select ONLY products that are the SAME or TRULY SIMILAR type.\n" +
      "STEP 3: Also select catalog products that are typically NEEDED FOR / USED WITH that product (parts, accessories, complements).\n" +
      "CRITICAL RULES:\n" +
      "- If catalog has nothing similar, return matched_ids: [] and catalog_match: false. DO NOT invent unrelated matches.\n" +
      "- Never pick bathroom faucets for a phone, clothing, food, etc.\n" +
      "- Prefer exact model/brand when visible.\n" +
      "Return ONLY valid JSON:\n" +
      "{\n" +
      '  "product_name": "what is in the photo",\n' +
      '  "brand": "",\n' +
      '  "category": "ev-yasam|elektronika|geyim|kosmetika|aksesuar|usaq|idman|supermarket|other",\n' +
      '  "type": "short type e.g. kran, dus, elbow, smartphone",\n' +
      '  "keywords": ["specific az+en words"],\n' +
      '  "search_queries": ["2-3 short queries"],\n' +
      '  "catalog_match": true,\n' +
      '  "matched_ids": [same/similar catalog ids, best first],\n' +
      '  "needed_ids": [complementary catalog ids for use with the photographed item]\n' +
      "}\n" +
      "CATALOG (id | name | category | brand):\n" +
      (catalog || "(empty)");

    // 2.0 / 1.5 modellər 2026-da bağlanıb — cari Flash modellər
    var models = [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
    ];

    var lastError = "AI cavab vermədi";

    function extractText(data) {
      var c = data && data.candidates && data.candidates[0];
      if (!c) {
        var block =
          data &&
          data.promptFeedback &&
          data.promptFeedback.blockReason;
        if (block) return { error: "Şəkil bloklandı: " + block };
        return { error: "Boş AI cavabı" };
      }
      if (c.finishReason && c.finishReason !== "STOP" && c.finishReason !== "MAX_TOKENS") {
        // SAFETY və s. — yenə də mətn ola bilər
      }
      var parts =
        c.content && c.content.parts
          ? c.content.parts
          : [];
      var text = parts
        .map(function (p) {
          return p.text || "";
        })
        .join("\n")
        .trim();
      if (!text) return { error: "AI mətn qaytarmadı (" + (c.finishReason || "?") + ")" };
      return { text: text };
    }

    function callModel(model, useJsonMime) {
      var url =
        "https://generativelanguage.googleapis.com/v1beta/models/" +
        model +
        ":generateContent?key=" +
        encodeURIComponent(key);
      var gen = { temperature: 0.1, maxOutputTokens: 1024 };
      if (useJsonMime) gen.responseMimeType = "application/json";

      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inline_data: {
                    mime_type: mime || "image/jpeg",
                    data: base64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: gen,
        }),
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var msg =
              (data && data.error && data.error.message) ||
              "Gemini xətası (" + res.status + ")";
            throw new Error(msg);
          }
          var extracted = extractText(data);
          if (extracted.error) throw new Error(extracted.error);
          var parsed = parseVisionJson(extracted.text);
          if (!parsed) throw new Error("AI JSON oxunmadı");
          return parsed;
        });
      });
    }

    function tryModels(idx) {
      if (idx >= models.length) {
        return Promise.reject(new Error(lastError));
      }
      return callModel(models[idx], true)
        .catch(function (err1) {
          lastError = (err1 && err1.message) || lastError;
          return callModel(models[idx], false);
        })
        .catch(function (err2) {
          lastError = (err2 && err2.message) || lastError;
          return tryModels(idx + 1);
        });
    }

    return tryModels(0);
  }

  function analysisToTokens(analysis) {
    var bag = [];
    if (!analysis) return [];
    ["product_name", "brand", "category", "color", "type"].forEach(function (k) {
      if (analysis[k]) bag = bag.concat(tokenize(analysis[k]));
    });
    (analysis.keywords || []).forEach(function (k) {
      bag = bag.concat(tokenize(k));
    });
    (analysis.search_queries || []).forEach(function (k) {
      bag = bag.concat(tokenize(k));
    });
    return expandTokens(bag);
  }

  function productMatchesCategory(product, analysisCat) {
    var cat = azFold(analysisCat || "");
    if (!cat || cat === "other") return false;
    var hay = azFold(product.cat || "");
    if (!hay) return false;
    if (hay.indexOf(cat) !== -1 || cat.indexOf(hay) !== -1) return true;
    var aliases = CAT_ALIASES[cat] || [cat];
    return aliases.some(function (a) {
      return hay.indexOf(azFold(a)) !== -1;
    });
  }

  function scoreProductAgainstTokens(product, tokens, analysis) {
    if (!tokens.length) return 0;
    var hay = productHaystack(product);
    var score = 0;
    var hits = 0;
    var typeTokens = strongTypeTokens(analysis);
    var typeHits = 0;

    tokens.forEach(function (t) {
      if (!t || WEAK_TOKENS[t]) return;
      if (hay.indexOf(t) !== -1) {
        hits += 1;
        score += t.length >= 5 ? 2.6 : t.length >= 3 ? 1.7 : 0.6;
      }
    });

    typeTokens.forEach(function (t) {
      if (hay.indexOf(t) !== -1) typeHits += 1;
    });

    // Tip uyğunluğu yoxdursa — kateqoriya tək başına kifayət etmir
    if (typeTokens.length && typeHits === 0) return 0;

    if (analysis && analysis.brand) {
      var brand = azFold(analysis.brand);
      if (brand.length >= 2 && hay.indexOf(brand) !== -1) score += 4;
    }
    if (analysis && analysis.product_name) {
      var nameTokens = tokenize(analysis.product_name).filter(function (t) {
        return !WEAK_TOKENS[t];
      });
      var nameHits = 0;
      nameTokens.forEach(function (t) {
        if (hay.indexOf(t) !== -1) nameHits += 1;
      });
      if (nameTokens.length && nameHits / nameTokens.length >= 0.45) score += 4;
    }
    if (!hits) return 0;
    return Math.min(1, score / 14);
  }

  function idsToMatches(ids, byId, seen, scoreStart, kind) {
    var out = [];
    (ids || []).forEach(function (rawId, idx) {
      var id = String(rawId);
      var p = byId[id];
      if (!p || seen[id]) return;
      seen[id] = true;
      out.push({
        product: p,
        score: Math.max(0.4, scoreStart - idx * 0.05),
        kind: kind || "similar",
      });
    });
    return out;
  }

  function rankProductsByVision(products, analysis) {
    var byId = {};
    products.forEach(function (p) {
      byId[String(p.id)] = p;
    });

    var typeTokens = strongTypeTokens(analysis);
    var seen = {};
    var similar = [];
    var needed = [];

    var forceEmpty =
      analysis &&
      (analysis.catalog_match === false ||
        analysis.catalog_match === "false" ||
        analysis.catalog_match === 0);

    if (!forceEmpty) {
      var aiMatched = idsToMatches(
        analysis && analysis.matched_ids,
        byId,
        seen,
        0.95,
        "exact"
      ).filter(function (m) {
        // AI səhvən uyğunsuz ID versə — tip filtrindən keçsin
        if (!typeTokens.length) return true;
        return productSharesType(m.product, typeTokens);
      });

      // filter may skip seen already set — rebuild carefully
      similar = [];
      seen = {};
      aiMatched.forEach(function (m) {
        var id = String(m.product.id);
        if (seen[id]) return;
        seen[id] = true;
        similar.push(m);
      });

      var tokens = analysisToTokens(analysis);
      var scored = products
        .map(function (p) {
          return {
            product: p,
            score: scoreProductAgainstTokens(p, tokens, analysis),
            kind: "similar",
          };
        })
        .filter(function (m) {
          return m.score >= 0.18 && !seen[String(m.product.id)];
        })
        .sort(function (a, b) {
          return b.score - a.score;
        });

      scored.forEach(function (m) {
        if (similar.length >= 8) return;
        seen[String(m.product.id)] = true;
        similar.push(m);
      });
    }

    var neededSeen = {};
    Object.keys(seen).forEach(function (k) {
      neededSeen[k] = true;
    });
    var aiNeeded = idsToMatches(
      analysis && analysis.needed_ids,
      byId,
      neededSeen,
      0.72,
      "needed"
    );
    needed = aiNeeded;

    // Lokal tamamlayıcı: eyni tipdən fərqli alt-növlər (məs. kran → duş)
    if (needed.length < 4 && typeTokens.length) {
      var complementHints = {
        kran: ["dus", "shower", "elbow", "outlet", "birleshdirici", "kronşteyn", "kronsteyn"],
        qarisdirici: ["dus", "shower", "elbow", "outlet"],
        dus: ["kran", "qarisdirici", "elbow", "hose", "shlange"],
        shower: ["kran", "faucet", "elbow"],
        telefon: ["qulaqliq", "adapter", "chehol", "case", "charger"],
        iphone: ["airpods", "adapter", "case"],
      };
      var extra = [];
      typeTokens.forEach(function (t) {
        if (complementHints[t]) extra = extra.concat(complementHints[t]);
      });
      extra = expandTokens(extra);
      if (extra.length) {
        products.forEach(function (p) {
          if (needed.length >= 6) return;
          var id = String(p.id);
          if (neededSeen[id] || seen[id]) return;
          if (!productSharesType(p, extra)) return;
          // eyni tipdədirsə similar-ə düşüb; burada yalnız fərqli/aksesuar
          if (productSharesType(p, typeTokens)) return;
          neededSeen[id] = true;
          needed.push({ product: p, score: 0.5, kind: "needed" });
        });
      }
    }

    return {
      similar: similar.slice(0, 8),
      needed: needed.slice(0, 6),
    };
  }

  function processVisualSearch(blob) {
    var token = ++visualToken;
    var previewUrl = "";

    var bodyEl = document.getElementById("search-popup-body");
    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="search-visual">' +
        '<div class="search-popup__loading">' +
        '<span class="search-popup__spinner" aria-hidden="true"></span>' +
        "Şəkil hazırlanır..." +
        "</div></div>";
    }

    Promise.all([blobToJpegBase64(blob, 896), getProducts()])
      .then(function (pair) {
        if (token !== visualToken || !isOpen) return null;
        var imgPack = pair[0];
        var products = pair[1] || [];
        previewUrl = imgPack.previewUrl;
        if (bodyEl) {
          bodyEl.innerHTML =
            '<div class="search-visual">' +
            '<div class="search-visual__preview"><img src="' +
            escAttr(previewUrl) +
            '" alt="" /></div>' +
            '<div class="search-popup__loading">' +
            '<span class="search-popup__spinner" aria-hidden="true"></span>' +
            "AI məhsulu tanıyır..." +
            "</div></div>";
        }

        return analyzeImageWithGemini(imgPack.base64, imgPack.mime, products).then(
          function (analysis) {
            return { analysis: analysis, products: products };
          }
        );
      })
      .then(function (pack) {
        if (!pack || token !== visualToken || !isOpen) return;
        var ranked = rankProductsByVision(pack.products, pack.analysis);
        var detected =
          pack.analysis.product_name ||
          pack.analysis.type ||
          (pack.analysis.keywords && pack.analysis.keywords[0]) ||
          "";
        var q =
          (pack.analysis.search_queries && pack.analysis.search_queries[0]) ||
          detected ||
          "";
        if (q && input) input.value = q;
        renderVisualResults(previewUrl, ranked, {
          query: q,
          detected: detected,
          hint: ranked.similar.length
            ? ""
            : "Şəkildəki məhsul tipi kataloqda tapılmadı.",
        });
      })
      .catch(function (err) {
        if (token !== visualToken || !isOpen) return;
        var msg = (err && err.message) || "";
        var body = document.getElementById("search-popup-body");
        if (!body) return;

        if (msg === "NO_GEMINI_KEY") {
          body.innerHTML =
            '<div class="search-visual">' +
            (previewUrl
              ? '<div class="search-visual__preview"><img src="' +
                escAttr(previewUrl) +
                '" alt="" /></div>'
              : "") +
            '<div class="search-popup__empty">' +
            '<div class="search-popup__empty-icon" aria-hidden="true">🔑</div>' +
            "<p><strong>AI axtarış üçün Google açarı lazımdır</strong></p>" +
            '<p class="search-popup__empty-hint">' +
            '1) <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> — pulsuz açar götürün<br/>' +
            "2) Brauzer konsolunda (F12 → Console):<br/><code>localStorage.setItem('buykon_gemini_key','AIza...')</code><br/>" +
            "və ya <code>index.html</code>-də <code>buykon-gemini-key</code> meta-ya yapışdırın → səhifəni yeniləyin." +
            "</p>" +
            '<button type="button" class="search-visual__retry" data-camera-retry>Yenidən çək</button>' +
            "</div></div>";
          return;
        }

        // Əvvəlki kimi eyni məhsulları göstərmirik — xətanı göstəririk
        body.innerHTML =
          '<div class="search-visual">' +
          (previewUrl
            ? '<div class="search-visual__preview"><img src="' +
              escAttr(previewUrl) +
              '" alt="" /></div>'
            : "") +
          '<div class="search-popup__empty">' +
          "<p><strong>Şəkil tanına bilmədi</strong></p>" +
          '<p class="search-popup__empty-hint">' +
          esc(msg || "Yenidən cəhd edin.") +
          "</p>" +
          '<button type="button" class="search-visual__retry" data-camera-retry>Yenidən çək</button>' +
          "</div></div>";
      });
  }

  function openCameraSearch() {
    stopCamera();
    renderCameraSheet();
  }

  function buildOverlay() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "search-popup";
    overlay.className = "search-popup";
    overlay.setAttribute("hidden", "");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-labelledby", "search-popup-title");
    overlay.innerHTML =
      '<div class="search-popup__backdrop" data-search-close tabindex="-1" aria-hidden="true"></div>' +
      '<div class="search-popup__panel">' +
      '<div class="search-popup__head">' +
      '<div class="search-popup__field">' +
      '<span class="search-popup__field-icon" aria-hidden="true">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
      "</span>" +
      '<input type="search" id="search-popup-input" class="search-popup__input" placeholder="Məhsul, brend və ya kateqoriya axtar..." autocomplete="off" enterkeyhint="search" />' +
      '<button type="button" class="search-popup__clear" id="search-popup-clear" aria-label="Təmizlə" hidden>×</button>' +
      "</div>" +
      '<button type="button" class="search-popup__camera" id="search-popup-camera" aria-label="Şəkillə axtar" title="Şəkillə axtar">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
      '<circle cx="12" cy="13" r="4"/>' +
      "</svg>" +
      "</button>" +
      '<button type="button" class="search-popup__close" data-search-close aria-label="Bağla">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      "</button>" +
      "</div>" +
      '<input type="file" id="search-popup-file" class="search-popup__file" accept="image/*" capture="environment" hidden />' +
      '<p class="search-popup__auth-hint" id="search-popup-auth-hint" hidden>' +
      'Daha dəqiq nəticələr üçün <a href="' +
      escAttr(getRoot() + "pages/login/") +
      '">daxil olun</a>.' +
      "</p>" +
      '<div class="search-popup__body" id="search-popup-body"></div>' +
      '<div class="search-popup__foot" id="search-popup-foot" hidden>' +
      '<button type="button" class="search-popup__submit" id="search-popup-submit">Hamısını göstər</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(overlay);
    input = document.getElementById("search-popup-input");

    overlay.querySelectorAll("[data-search-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });

    var clearBtn = document.getElementById("search-popup-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (!input) return;
        input.value = "";
        clearBtn.setAttribute("hidden", "");
        stopCamera();
        renderIdleState();
        input.focus();
      });
    }

    var cameraBtn = document.getElementById("search-popup-camera");
    if (cameraBtn) {
      cameraBtn.addEventListener("click", function () {
        openCameraSearch();
      });
    }

    var fileInput = document.getElementById("search-popup-file");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        stopCamera();
        processVisualSearch(file);
      });
    }

    var submitBtn = document.getElementById("search-popup-submit");
    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        if (input) goSearch(input.value);
      });
    }

    if (input) {
      input.addEventListener("input", function () {
        var val = input.value.trim();
        if (clearBtn) {
          if (val) clearBtn.removeAttribute("hidden");
          else clearBtn.setAttribute("hidden", "");
        }
        if (debounceTimer) window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(function () {
          stopCamera();
          if (!val) renderIdleState();
          else renderResults(val);
        }, 180);
      });

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          goSearch(input.value);
        }
      });
    }

    overlay.addEventListener("click", function (e) {
      if (e.target.closest("[data-camera-back]")) {
        e.preventDefault();
        stopCamera();
        renderIdleState();
        if (input) input.focus();
        return;
      }

      if (e.target.closest("[data-camera-retry]")) {
        e.preventDefault();
        stopCamera();
        openCameraSearch();
        return;
      }

      var textSearchBtn = e.target.closest("[data-visual-text-search]");
      if (textSearchBtn) {
        e.preventDefault();
        var tq = textSearchBtn.getAttribute("data-visual-text-search") || "";
        if (tq) {
          if (input) input.value = tq;
          renderResults(tq);
        }
        return;
      }

      var productBtn = e.target.closest("[data-search-product-id]");
      if (productBtn) {
        e.preventDefault();
        var pid = Number(productBtn.getAttribute("data-search-product-id"));
        getProducts().then(function (list) {
          var found = list.find(function (p) {
            return Number(p.id) === pid;
          });
          if (found) goProduct(found);
        });
        return;
      }

      var chip = e.target.closest("[data-search-query]");
      if (chip) {
        e.preventDefault();
        var q = chip.getAttribute("data-search-query") || "";
        if (input) input.value = q;
        goSearch(q);
        return;
      }

      var result = e.target.closest("[data-search-result]");
      if (result) {
        e.preventDefault();
        var name = result.getAttribute("data-search-result") || "";
        if (input) input.value = name;
        goSearch(name);
        return;
      }

      var clearRecentBtn = e.target.closest("[data-search-clear-recent]");
      if (clearRecentBtn) {
        e.preventDefault();
        clearRecent();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) close();
    });
  }

  function renderIdleState() {
    var body = document.getElementById("search-popup-body");
    var foot = document.getElementById("search-popup-foot");
    if (!body) return;
    if (foot) foot.setAttribute("hidden", "");

    var recent = readRecent();
    var recentHtml = "";
    if (recent.length) {
      recentHtml =
        '<section class="search-popup__section">' +
        '<div class="search-popup__section-head">' +
        '<h3 class="search-popup__section-title"><span aria-hidden="true">🕐</span> Son axtarılanlar</h3>' +
        '<button type="button" class="search-popup__section-action" data-search-clear-recent>Təmizlə</button>' +
        "</div>" +
        '<div class="search-popup__chips">' +
        recent
          .map(function (q) {
            return (
              '<button type="button" class="search-popup__chip" data-search-query="' +
              escAttr(q) +
              '">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
              "<span>" +
              esc(q) +
              "</span></button>"
            );
          })
          .join("") +
        "</div></section>";
    }

    var popularHtml =
      '<section class="search-popup__section">' +
      '<div class="search-popup__section-head">' +
      '<h3 class="search-popup__section-title"><span aria-hidden="true">🔥</span> Populyar seçimlər</h3>' +
      "</div>" +
      '<div class="search-popup__popular">' +
      POPULAR_PICKS.map(function (item) {
        return (
          '<button type="button" class="search-popup__popular-item" data-search-query="' +
          escAttr(item.query) +
          '">' +
          '<span class="search-popup__popular-ico" aria-hidden="true">' +
          item.icon +
          "</span>" +
          '<span class="search-popup__popular-label">' +
          esc(item.label) +
          "</span>" +
          '<svg class="search-popup__popular-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>' +
          "</button>"
        );
      }).join("") +
      "</div></section>";

    body.innerHTML =
      '<div class="search-popup__idle">' +
      (recentHtml || "") +
      popularHtml +
      "</div>";
  }

  function renderResults(query) {
    var body = document.getElementById("search-popup-body");
    var foot = document.getElementById("search-popup-foot");
    if (!body) return;

    body.innerHTML =
      '<div class="search-popup__loading">' +
      '<span class="search-popup__spinner" aria-hidden="true"></span>' +
      "Axtarılır..." +
      "</div>";

    getProducts().then(function (products) {
      if (!isOpen || !input || input.value.trim() !== query) return;

      var lower = query.toLowerCase();
      var found = products.filter(function (p) {
        var name = (p.name || "").toLowerCase();
        var cat = (p.cat || "").toLowerCase();
        return name.indexOf(lower) !== -1 || cat.indexOf(lower) !== -1;
      });

      if (!found.length) {
        if (foot) foot.setAttribute("hidden", "");
        body.innerHTML =
          '<div class="search-popup__empty">' +
          '<div class="search-popup__empty-icon" aria-hidden="true">🔍</div>' +
          "<p><strong>“" +
          esc(query) +
          "”</strong> üzrə nəticə tapılmadı.</p>" +
          '<p class="search-popup__empty-hint">Başqa açar sözlə cəhd edin və ya populyar seçimlərdən birini seçin.</p>' +
          "</div>";
        return;
      }

      var limited = found.slice(0, 6);
      body.innerHTML =
        '<div class="search-popup__results">' +
        '<p class="search-popup__results-meta">' +
        esc(String(found.length)) +
        " nəticə tapıldı</p>" +
        '<ul class="search-popup__result-list">' +
        limited
          .map(function (p) {
            var img = productImage(p);
            return (
              '<li><button type="button" class="search-popup__result" data-search-result="' +
              escAttr(p.name) +
              '">' +
              '<span class="search-popup__result-media">' +
              (img
                ? '<img src="' + escAttr(img) + '" alt="" loading="lazy" />'
                : '<span class="search-popup__result-placeholder" aria-hidden="true">📦</span>') +
              "</span>" +
              '<span class="search-popup__result-body">' +
              '<span class="search-popup__result-cat">' +
              esc(p.cat) +
              "</span>" +
              '<span class="search-popup__result-name">' +
              esc(p.name) +
              "</span>" +
              '<span class="search-popup__result-price">' +
              esc(formatPrice(p.price)) +
              "</span>" +
              "</span>" +
              '<svg class="search-popup__result-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>' +
              "</button></li>"
            );
          })
          .join("") +
        "</ul></div>";

      if (foot) foot.removeAttribute("hidden");
    });
  }

  function refreshAuthHint() {
    var hint = document.getElementById("search-popup-auth-hint");
    if (!hint) return;

    if (typeof BizdevarAPI === "undefined" || !BizdevarAPI.session) {
      hint.removeAttribute("hidden");
      return;
    }

    BizdevarAPI.session()
      .then(function (data) {
        if (data && data.logged_in) hint.setAttribute("hidden", "");
        else hint.removeAttribute("hidden");
      })
      .catch(function () {
        hint.removeAttribute("hidden");
      });
  }

  function open() {
    buildOverlay();
    if (!overlay) return;

    lastFocus = document.activeElement;
    isOpen = true;
    overlay.removeAttribute("hidden");
    document.body.classList.add("search-popup-open");

    if (input) {
      input.value = "";
      var clearBtn = document.getElementById("search-popup-clear");
      if (clearBtn) clearBtn.setAttribute("hidden", "");
    }

    stopCamera();
    renderIdleState();
    refreshAuthHint();

    window.requestAnimationFrame(function () {
      if (input) input.focus();
    });
  }

  function close() {
    if (!overlay) return;
    isOpen = false;
    stopCamera();
    visualToken += 1;
    overlay.setAttribute("hidden", "");
    document.body.classList.remove("search-popup-open");
    if (lastFocus && typeof lastFocus.focus === "function") {
      try {
        lastFocus.focus();
      } catch (e) {
        /* ignore */
      }
    }
  }

  function bindTriggers() {
    document.querySelectorAll("[data-nav-search]").forEach(function (btn) {
      if (btn.dataset.searchBound) return;
      btn.dataset.searchBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        open();
      });
    });
  }

  function init() {
    buildOverlay();
    bindTriggers();
    document.addEventListener("BizdevarLayoutLoaded", bindTriggers);
    document.addEventListener("BizdevarAuthUpdate", refreshAuthHint);
  }

  window.BizdevarSearchUI = {
    open: open,
    close: close,
    refreshAuthHint: refreshAuthHint,
    bindTriggers: bindTriggers,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
