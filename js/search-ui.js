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
  var cameraFacing = "environment";
  var cameraTorchOn = false;
  var lastDetectState = null;

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

  function setVizMode(on) {
    if (!overlay) return;
    if (on) overlay.classList.add("search-popup--viz");
    else overlay.classList.remove("search-popup--viz");
  }

  function stopCamera() {
    cameraTorchOn = false;
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

  function getVideoTrack() {
    if (!cameraStream) return null;
    var tracks = cameraStream.getVideoTracks();
    return tracks && tracks[0] ? tracks[0] : null;
  }

  function syncTorchButton() {
    var btn = document.getElementById("search-camera-flash");
    if (!btn) return;
    var track = getVideoTrack();
    var caps =
      track && typeof track.getCapabilities === "function"
        ? track.getCapabilities()
        : null;
    var supported = !!(caps && caps.torch) && cameraFacing === "environment";
    btn.disabled = !supported;
    btn.classList.toggle("is-on", !!cameraTorchOn && supported);
    btn.setAttribute("aria-pressed", cameraTorchOn && supported ? "true" : "false");
    btn.title = supported
      ? cameraTorchOn
        ? "Flaşı söndür"
        : "Flaşı yandır"
      : "Flaş bu kamerada yoxdur";
  }

  function setTorch(on) {
    var track = getVideoTrack();
    if (!track || typeof track.applyConstraints !== "function") {
      cameraTorchOn = false;
      syncTorchButton();
      return Promise.resolve();
    }
    var caps =
      typeof track.getCapabilities === "function" ? track.getCapabilities() : {};
    if (!caps.torch) {
      cameraTorchOn = false;
      syncTorchButton();
      return Promise.resolve();
    }
    return track
      .applyConstraints({ advanced: [{ torch: !!on }] })
      .then(function () {
        cameraTorchOn = !!on;
        syncTorchButton();
      })
      .catch(function () {
        cameraTorchOn = false;
        syncTorchButton();
      });
  }

  function requestCameraStream(facing) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.reject(new Error("NO_MEDIA"));
    }
    var attempts = [
      {
        audio: false,
        video: {
          facingMode: { exact: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      {
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      { audio: false, video: { facingMode: facing } },
      { audio: false, video: true },
    ];

    function next(i) {
      if (i >= attempts.length) {
        return Promise.reject(new Error("CAMERA_DENIED"));
      }
      return navigator.mediaDevices.getUserMedia(attempts[i]).catch(function () {
        return next(i + 1);
      });
    }
    return next(0);
  }

  function attachCameraStream(stream) {
    var video = document.getElementById("search-camera-video");
    cameraStream = stream;
    if (!video) return;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.muted = true;
    video.srcObject = stream;
    video.classList.toggle("is-front", cameraFacing === "user");
    var playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {});
    }
    syncTorchButton();
  }

  function startLiveCamera() {
    var fallback = document.getElementById("search-camera-fallback");
    var video = document.getElementById("search-camera-video");
    var status = document.getElementById("search-camera-status");
    if (status) status.textContent = "Kamera açılır...";
    if (cameraStream) {
      cameraStream.getTracks().forEach(function (t) {
        try {
          t.stop();
        } catch (e) {}
      });
      cameraStream = null;
    }
    cameraTorchOn = false;
    return requestCameraStream(cameraFacing)
      .then(function (stream) {
        if (fallback) fallback.setAttribute("hidden", "");
        if (video) video.removeAttribute("hidden");
        attachCameraStream(stream);
        if (status) status.textContent = "Məhsulu kadra salın";
      })
      .catch(function () {
        if (video) video.setAttribute("hidden", "");
        if (fallback) fallback.removeAttribute("hidden");
        if (status) {
          status.textContent =
            "Kamera açıla bilmədi — qalereyadan seçin və ya icazə verin";
        }
        syncTorchButton();
      });
  }

  function openGalleryPicker() {
    var fileInput = document.getElementById("search-popup-file");
    if (!fileInput) return;
    fileInput.removeAttribute("capture");
    fileInput.value = "";
    fileInput.click();
  }

  function captureFromVideo() {
    var video = document.getElementById("search-camera-video");
    if (!video || !cameraStream || !video.videoWidth) {
      openGalleryPicker();
      return;
    }
    var canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext("2d");
    if (cameraFacing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      function (blob) {
        if (!blob) {
          openGalleryPicker();
          return;
        }
        stopCamera();
        processVisualSearch(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  function renderCameraSheet() {
    var body = document.getElementById("search-popup-body");
    var foot = document.getElementById("search-popup-foot");
    if (!body) return;
    if (foot) foot.setAttribute("hidden", "");
    setVizMode(true);
    cameraTorchOn = false;

    body.innerHTML =
      '<div class="vizcam">' +
      '<div class="vizcam__top">' +
      '<button type="button" class="vizcam__icon-btn" data-camera-back aria-label="Bağla">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      "</button>" +
      '<div class="vizcam__title-wrap">' +
      '<p class="vizcam__title">Şəkillə axtar</p>' +
      '<p class="vizcam__sub" id="search-camera-status">Kamera açılır...</p>' +
      "</div>" +
      '<button type="button" class="vizcam__icon-btn" id="search-camera-flash" aria-label="Flaş" aria-pressed="false">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/></svg>' +
      "</button>" +
      "</div>" +
      '<div class="vizcam__stage">' +
      '<video id="search-camera-video" class="vizcam__video" playsinline webkit-playsinline muted autoplay></video>' +
      '<div class="vizcam__frame" aria-hidden="true"></div>' +
      '<div class="vizcam__fallback" id="search-camera-fallback" hidden>' +
      "<p>Kamera açıla bilmədi</p>" +
      '<button type="button" class="vizcam__fallback-btn" id="search-camera-retry">Yenidən cəhd et</button>' +
      '<button type="button" class="vizcam__fallback-btn vizcam__fallback-btn--ghost" id="search-camera-fallback-gallery">Qalereyadan seç</button>' +
      "</div>" +
      "</div>" +
      '<div class="vizcam__bottom">' +
      '<button type="button" class="vizcam__side-btn" id="search-camera-gallery" aria-label="Qalereya">' +
      '<span class="vizcam__side-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></span>' +
      "<span>Qalereya</span>" +
      "</button>" +
      '<button type="button" class="vizcam__shutter" id="search-camera-shot" aria-label="Şəkil çək">' +
      '<span class="vizcam__shutter-ring"></span>' +
      "</button>" +
      '<button type="button" class="vizcam__side-btn" id="search-camera-flip" aria-label="Kameranı dəyiş">' +
      '<span class="vizcam__side-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M21 3 14 10"/><path d="m3 21 7-7"/><circle cx="12" cy="12" r="3"/></svg></span>' +
      "<span>Dəyiş</span>" +
      "</button>" +
      "</div>" +
      "</div>";

    var galleryBtn = document.getElementById("search-camera-gallery");
    var shotBtn = document.getElementById("search-camera-shot");
    var flipBtn = document.getElementById("search-camera-flip");
    var flashBtn = document.getElementById("search-camera-flash");
    var retryBtn = document.getElementById("search-camera-retry");
    var fallbackGallery = document.getElementById(
      "search-camera-fallback-gallery"
    );

    if (galleryBtn) galleryBtn.addEventListener("click", openGalleryPicker);
    if (fallbackGallery)
      fallbackGallery.addEventListener("click", openGalleryPicker);
    if (shotBtn) shotBtn.addEventListener("click", captureFromVideo);
    if (retryBtn)
      retryBtn.addEventListener("click", function () {
        startLiveCamera();
      });
    if (flipBtn) {
      flipBtn.addEventListener("click", function () {
        cameraFacing = cameraFacing === "environment" ? "user" : "environment";
        startLiveCamera();
      });
    }
    if (flashBtn) {
      flashBtn.addEventListener("click", function () {
        setTorch(!cameraTorchOn);
      });
    }

    startLiveCamera();
  }

  function cropThumbFromPreview(previewUrl, bbox) {
    return new Promise(function (resolve) {
      if (!previewUrl || !bbox || bbox.length < 4) {
        resolve("");
        return;
      }
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          var x = Math.max(0, Math.min(1, Number(bbox[0]) || 0));
          var y = Math.max(0, Math.min(1, Number(bbox[1]) || 0));
          var bw = Math.max(0.08, Math.min(1 - x, Number(bbox[2]) || 0.3));
          var bh = Math.max(0.08, Math.min(1 - y, Number(bbox[3]) || 0.3));
          var sx = Math.floor(x * w);
          var sy = Math.floor(y * h);
          var sw = Math.max(1, Math.floor(bw * w));
          var sh = Math.max(1, Math.floor(bh * h));
          var size = 160;
          var canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          canvas
            .getContext("2d")
            .drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch (e) {
          resolve("");
        }
      };
      img.onerror = function () {
        resolve("");
      };
      img.src = previewUrl;
    });
  }

  function detectionToAnalysis(det, fallback) {
    fallback = fallback || {};
    return {
      product_name: det.label || fallback.product_name || "",
      brand: det.brand || "",
      category: det.category || fallback.category || "",
      type: det.type || fallback.type || "",
      keywords: det.keywords || [],
      search_queries: det.search_queries || [det.label || ""].filter(Boolean),
      catalog_match: det.matched_ids && det.matched_ids.length ? true : false,
      matched_ids: det.matched_ids || [],
      needed_ids: det.needed_ids || [],
    };
  }

  function buildDetectionCards(analysis, products, previewUrl) {
    var list = Array.isArray(analysis && analysis.detections)
      ? analysis.detections.slice(0, 6)
      : [];
    if (!list.length) {
      list = [
        {
          label: analysis.product_name || analysis.type || "Məhsul",
          type: analysis.type || "",
          brand: analysis.brand || "",
          keywords: analysis.keywords || [],
          bbox: null,
          matched_ids: analysis.matched_ids || [],
          needed_ids: analysis.needed_ids || [],
        },
      ];
    }

    return Promise.all(
      list.map(function (det) {
        var partial = detectionToAnalysis(det, analysis);
        var ranked = rankProductsByVision(products, partial);
        var count =
          (ranked.similar || []).length + (ranked.needed || []).length;
        var firstImg =
          (ranked.similar[0] && productImage(ranked.similar[0].product)) ||
          (ranked.needed[0] && productImage(ranked.needed[0].product)) ||
          "";
        return cropThumbFromPreview(previewUrl, det.bbox).then(function (
          thumb
        ) {
          return {
            label: det.label || partial.product_name || "Məhsul",
            type: partial.type || "",
            thumb: thumb || firstImg || previewUrl,
            count: count,
            ranked: ranked,
            analysis: partial,
          };
        });
      })
    );
  }

  function formatCountLabel(n) {
    if (n <= 0) return "Kataloqda yoxdur";
    if (n >= 20) return n + "+ məhsul";
    return n + " məhsul";
  }

  function renderDetectPick(previewUrl, detections) {
    var body = document.getElementById("search-popup-body");
    var foot = document.getElementById("search-popup-foot");
    if (!body) return;
    if (foot) foot.setAttribute("hidden", "");
    setVizMode(true);

    lastDetectState = { previewUrl: previewUrl, detections: detections };

    var cards = detections
      .map(function (d, i) {
        return (
          '<button type="button" class="vizpick__card" data-detect-idx="' +
          i +
          '">' +
          '<span class="vizpick__thumb">' +
          (d.thumb
            ? '<img src="' + escAttr(d.thumb) + '" alt="" />'
            : '<span class="vizpick__thumb-ph">📦</span>') +
          "</span>" +
          '<span class="vizpick__meta">' +
          '<span class="vizpick__name">' +
          esc(d.label) +
          "</span>" +
          '<span class="vizpick__count">' +
          esc(formatCountLabel(d.count)) +
          "</span>" +
          "</span>" +
          '<svg class="vizpick__chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>' +
          "</button>"
        );
      })
      .join("");

    body.innerHTML =
      '<div class="vizpick">' +
      '<div class="vizpick__bg" style="background-image:url(\'' +
      escAttr(previewUrl) +
      "')\"></div>" +
      '<div class="vizpick__shade"></div>' +
      '<div class="vizpick__content">' +
      '<div class="vizpick__head">' +
      '<button type="button" class="vizpick__back" data-camera-retry aria-label="Geri">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m15 18-6-6 6-6"/></svg>' +
      "</button>" +
      "<div>" +
      '<p class="vizpick__title">Şəkildə tapılanlar</p>' +
      '<p class="vizpick__sub">Axtarmaq istədiyin məhsulu seç</p>' +
      "</div></div>" +
      '<div class="vizpick__list">' +
      cards +
      "</div>" +
      (detections.length > 1
        ? '<button type="button" class="vizpick__all" data-detect-all>Hamısına bax</button>'
        : "") +
      '<button type="button" class="vizpick__retake" data-camera-retry>' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg>' +
      " Yenidən çək" +
      "</button>" +
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
    setVizMode(true);
    meta = meta || {};
    pack = pack || {};
    var similar = pack.similar || [];
    var needed = pack.needed || [];
    var detected = meta.detected || "";

    if (!similar.length && !needed.length) {
      body.innerHTML =
        '<div class="vizpick vizpick--plain">' +
        (previewUrl
          ? '<div class="vizpick__bg" style="background-image:url(\'' +
            escAttr(previewUrl) +
            "')\"></div><div class=\"vizpick__shade\"></div>"
          : "") +
        '<div class="vizpick__content">' +
        '<div class="search-popup__empty" style="color:#fff">' +
        "<p><strong>" +
        (detected
          ? "“" + esc(detected) + "” üçün kataloqda uyğun məhsul yoxdur"
          : "Uyğun məhsul tapılmadı") +
        "</strong></p>" +
        '<p class="search-popup__empty-hint" style="color:#cbd5e1">' +
        esc(meta.hint || "Başqa bucaqdan çəkin və ya mətnlə axtarın.") +
        "</p>" +
        (lastDetectState
          ? '<button type="button" class="search-visual__retry" data-detect-back>Siyahıya qayıt</button>'
          : "") +
        '<button type="button" class="vizpick__retake" data-camera-retry>Yenidən çək</button>' +
        "</div></div></div>";
      return;
    }

    var similarHtml = similar.length
      ? '<section class="search-visual__section">' +
        '<h3 class="search-visual__section-title">Eyni / oxşar</h3>' +
        renderMatchList(similar, function (m) {
          if (m.kind === "exact") {
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
      '<div class="vizresults">' +
      '<div class="vizresults__head">' +
      '<button type="button" class="vizpick__back" data-detect-back aria-label="Geri">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m15 18-6-6 6-6"/></svg>' +
      "</button>" +
      "<div>" +
      '<p class="vizresults__title">' +
      esc(detected || "Uyğun məhsullar") +
      "</p>" +
      '<p class="vizresults__meta">' +
      esc(String(similar.length + needed.length)) +
      " nəticə</p>" +
      "</div>" +
      '<button type="button" class="vizpick__retake vizpick__retake--mini" data-camera-retry>Yenidən</button>' +
      "</div>" +
      (previewUrl
        ? '<div class="vizresults__preview"><img src="' +
          escAttr(previewUrl) +
          '" alt="" /></div>'
        : "") +
      similarHtml +
      neededHtml +
      "</div>";
  }

  function showDetectionByIndex(idx) {
    if (!lastDetectState || !lastDetectState.detections) return;
    var d = lastDetectState.detections[idx];
    if (!d) return;
    if (input) input.value = d.label || "";
    renderVisualResults(d.thumb || lastDetectState.previewUrl, d.ranked, {
      detected: d.label,
      query: d.label,
    });
  }

  function showAllDetections() {
    if (!lastDetectState || !lastDetectState.detections) return;
    var merged = { similar: [], needed: [] };
    var seen = {};
    lastDetectState.detections.forEach(function (d) {
      (d.ranked.similar || []).forEach(function (m) {
        var id = String(m.product.id);
        if (seen[id]) return;
        seen[id] = true;
        merged.similar.push(m);
      });
      (d.ranked.needed || []).forEach(function (m) {
        var id = String(m.product.id);
        if (seen[id]) return;
        seen[id] = true;
        merged.needed.push(m);
      });
    });
    renderVisualResults(lastDetectState.previewUrl, merged, {
      detected: "Bütün tapılanlar",
      query: "",
    });
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

  function getVisualSearchUrl() {
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveVisualSearchUrl === "function") {
      return cfg.resolveVisualSearchUrl();
    }
    return getRoot() + "api/visual-search.php";
  }

  function analyzeImageWithGemini(base64, mime, products) {
    var catalog = buildCatalogDigest(products || []);
    var url = getVisualSearchUrl();

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_base64: base64,
        mime: mime || "image/jpeg",
        catalog: catalog,
      }),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || !data || !data.ok) {
          var msg =
            (data && data.error) ||
            "AI xətası (" + res.status + ")";
          throw new Error(msg);
        }
        if (!data.analysis) throw new Error("AI cavabı oxunmadı");
        return data.analysis;
      });
    }).catch(function (err) {
      var msg = (err && err.message) || "";
      if (
        msg.indexOf("Failed to fetch") !== -1 ||
        msg.indexOf("NetworkError") !== -1 ||
        msg.indexOf("Load failed") !== -1
      ) {
        throw new Error(
          "AI serverə çatılmadı. XAMPP-də PHP işləyirmi və api/visual-search.php mövcuddurmu?"
        );
      }
      throw err;
    });
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
    setVizMode(true);

    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="vizpick vizpick--plain">' +
        '<div class="vizpick__content" style="justify-content:center;align-items:center;gap:14px">' +
        '<span class="search-popup__spinner" aria-hidden="true"></span>' +
        '<p style="color:#fff;margin:0;font-weight:700">Şəkil hazırlanır...</p>' +
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
            '<div class="vizpick">' +
            '<div class="vizpick__bg" style="background-image:url(\'' +
            escAttr(previewUrl) +
            "')\"></div>" +
            '<div class="vizpick__shade"></div>' +
            '<div class="vizpick__content" style="justify-content:center;align-items:center;gap:14px">' +
            '<span class="search-popup__spinner" aria-hidden="true"></span>' +
            '<p style="color:#fff;margin:0;font-weight:700">Şəkildəki məhsullar tanınır...</p>' +
            "</div></div>";
        }
        return analyzeImageWithGemini(
          imgPack.base64,
          imgPack.mime,
          products
        ).then(function (analysis) {
          return { analysis: analysis, products: products };
        });
      })
      .then(function (pack) {
        if (!pack || token !== visualToken || !isOpen) return;
        return buildDetectionCards(
          pack.analysis,
          pack.products,
          previewUrl
        ).then(function (detections) {
          if (token !== visualToken || !isOpen) return;
          if (detections.length === 1 && detections[0].count > 0) {
            lastDetectState = {
              previewUrl: previewUrl,
              detections: detections,
            };
            if (input) input.value = detections[0].label || "";
            renderVisualResults(previewUrl, detections[0].ranked, {
              detected: detections[0].label,
              query: detections[0].label,
            });
            return;
          }
          renderDetectPick(previewUrl, detections);
        });
      })
      .catch(function (err) {
        if (token !== visualToken || !isOpen) return;
        var msg = (err && err.message) || "";
        var body = document.getElementById("search-popup-body");
        if (!body) return;

        if (msg === "NO_GEMINI_KEY") {
          body.innerHTML =
            '<div class="vizpick vizpick--plain"><div class="vizpick__content">' +
            '<div class="search-popup__empty" style="color:#fff">' +
            "<p><strong>AI axtarış üçün Google açarı lazımdır</strong></p>" +
            '<p class="search-popup__empty-hint" style="color:#cbd5e1">' +
            "Layihə kökündə <code>.env</code> faylına yazın:<br/><code>GEMINI_API_KEY=AIza...</code>" +
            "</p>" +
            '<button type="button" class="vizpick__retake" data-camera-retry>Yenidən çək</button>' +
            "</div></div></div>";
          return;
        }

        body.innerHTML =
          '<div class="vizpick vizpick--plain"><div class="vizpick__content">' +
          '<div class="search-popup__empty" style="color:#fff">' +
          "<p><strong>Şəkil tanına bilmədi</strong></p>" +
          '<p class="search-popup__empty-hint" style="color:#cbd5e1">' +
          esc(msg || "Yenidən cəhd edin.") +
          "</p>" +
          '<button type="button" class="vizpick__retake" data-camera-retry>Yenidən çək</button>' +
          "</div></div></div>";
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
      '<input type="file" id="search-popup-file" class="search-popup__file" accept="image/*" hidden />' +
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
        setVizMode(false);
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
        setVizMode(false);
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

      var detectCard = e.target.closest("[data-detect-idx]");
      if (detectCard) {
        e.preventDefault();
        showDetectionByIndex(
          Number(detectCard.getAttribute("data-detect-idx"))
        );
        return;
      }

      if (e.target.closest("[data-detect-all]")) {
        e.preventDefault();
        showAllDetections();
        return;
      }

      if (e.target.closest("[data-detect-back]")) {
        e.preventDefault();
        if (lastDetectState && lastDetectState.detections) {
          renderDetectPick(
            lastDetectState.previewUrl,
            lastDetectState.detections
          );
        } else {
          openCameraSearch();
        }
        return;
      }

      var textSearchBtn = e.target.closest("[data-visual-text-search]");
      if (textSearchBtn) {
        e.preventDefault();
        var tq = textSearchBtn.getAttribute("data-visual-text-search") || "";
        if (tq) {
          setVizMode(false);
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
    setVizMode(false);

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
    setVizMode(false);
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
