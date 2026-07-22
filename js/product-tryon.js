/**
 * Geyim — virtual AI maneken yoxlaması
 * product.js-dən initProductTryOn(product) çağırılır.
 */
(function (global) {
  "use strict";

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

  function getRoot() {
    if (global.BizdevarLayout && typeof BizdevarLayout.getRoot === "function") {
      return BizdevarLayout.getRoot();
    }
    return (document.body && document.body.getAttribute("data-root")) || "../../";
  }

  function resolveAsset(src) {
    var cfg = global.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveMediaUrl === "function") {
      var via = cfg.resolveMediaUrl(src);
      if (via) src = via;
    }
    var s = String(src || "").trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s) || s.indexOf("data:") === 0) return s;
    s = getRoot() + s.replace(/^\.\//, "").replace(/^\/+/, "");
    try {
      return new URL(s, global.location.href).href;
    } catch (e) {
      return s;
    }
  }

  function tryOnUrl() {
    var cfg = global.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveTryOnUrl === "function") {
      return cfg.resolveTryOnUrl();
    }
    return getRoot() + "api/try-on.php";
  }

  function isClothing(product) {
    var cat = String((product && (product.cat || product.category)) || "")
      .toLowerCase()
      .trim();
    return cat === "geyim" || cat.indexOf("geyim") !== -1;
  }

  function ensureModal() {
    var el = document.getElementById("pd-tryon-modal");
    if (el) return el;
    el = document.createElement("div");
    el.id = "pd-tryon-modal";
    el.className = "pd-tryon-modal";
    el.hidden = true;
    el.innerHTML =
      '<div class="pd-tryon-modal__backdrop" data-tryon-close></div>' +
      '<div class="pd-tryon-modal__panel" role="dialog" aria-modal="true" aria-labelledby="pd-tryon-title">' +
      '<button type="button" class="pd-tryon-modal__x" data-tryon-close aria-label="Bağla">×</button>' +
      '<h2 id="pd-tryon-title" class="pd-tryon-modal__title">Görəsən əyninə olar?</h2>' +
      '<p class="pd-tryon-modal__sub">Boy, çəki və dəri rəngini seç — AI məhsulu maneken üzərində göstərsin.</p>' +
      '<div class="pd-tryon-form" id="pd-tryon-form">' +
      '<label class="pd-tryon-field"><span>Boy (sm)</span>' +
      '<input type="number" id="pd-tryon-height" min="140" max="220" value="170" inputmode="numeric" /></label>' +
      '<label class="pd-tryon-field"><span>Çəki (kq)</span>' +
      '<input type="number" id="pd-tryon-weight" min="40" max="160" value="65" inputmode="numeric" /></label>' +
      '<div class="pd-tryon-field"><span>Dəri rəngi</span>' +
      '<div class="pd-tryon-skins" id="pd-tryon-skins" role="radiogroup" aria-label="Dəri rəngi">' +
      '<button type="button" class="pd-tryon-skin is-active" data-skin="aciq" style="--skin:#f3d5b5" aria-pressed="true" title="Açıq"><span>Açıq</span></button>' +
      '<button type="button" class="pd-tryon-skin" data-skin="orta" style="--skin:#c9956c" aria-pressed="false" title="Orta"><span>Orta</span></button>' +
      '<button type="button" class="pd-tryon-skin" data-skin="bronza" style="--skin:#8d5524" aria-pressed="false" title="Bronza"><span>Bronza</span></button>' +
      '<button type="button" class="pd-tryon-skin" data-skin="tund" style="--skin:#4a2c1a" aria-pressed="false" title="Tünd"><span>Tünd</span></button>' +
      "</div></div>" +
      '<p class="pd-tryon-err" id="pd-tryon-err" aria-live="polite"></p>' +
      '<button type="button" class="pd-tryon-submit" id="pd-tryon-submit">Yoxla</button>' +
      "</div>" +
      '<div class="pd-tryon-result" id="pd-tryon-result" hidden>' +
      '<div class="pd-tryon-result__frame"><img id="pd-tryon-img" alt="AI maneken" /></div>' +
      '<button type="button" class="pd-tryon-again" id="pd-tryon-again">Yenidən seç</button>' +
      "</div>" +
      '<div class="pd-tryon-loading" id="pd-tryon-loading" hidden>' +
      '<span class="pd-tryon-spinner" aria-hidden="true"></span>' +
      "<p>AI maneken hazırlanır...</p>" +
      "</div>" +
      "</div>";
    document.body.appendChild(el);

    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-tryon-close]")) {
        closeModal();
      }
      var skinBtn = e.target.closest("[data-skin]");
      if (skinBtn) {
        el.querySelectorAll("[data-skin]").forEach(function (b) {
          b.classList.remove("is-active");
          b.setAttribute("aria-pressed", "false");
        });
        skinBtn.classList.add("is-active");
        skinBtn.setAttribute("aria-pressed", "true");
      }
    });

    if (!global.__pdTryOnEscBound) {
      global.__pdTryOnEscBound = true;
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          var m = document.getElementById("pd-tryon-modal");
          if (m && !m.hidden) closeModal();
        }
      });
    }

    var again = document.getElementById("pd-tryon-again");
    if (again) {
      again.addEventListener("click", function () {
        showForm();
      });
    }

    return el;
  }

  function openModal() {
    var el = ensureModal();
    el.hidden = false;
    document.body.classList.add("pd-tryon-open");
    showForm();
  }

  function closeModal() {
    var el = document.getElementById("pd-tryon-modal");
    if (el) el.hidden = true;
    document.body.classList.remove("pd-tryon-open");
  }

  function showForm() {
    var form = document.getElementById("pd-tryon-form");
    var result = document.getElementById("pd-tryon-result");
    var loading = document.getElementById("pd-tryon-loading");
    var err = document.getElementById("pd-tryon-err");
    if (form) form.hidden = false;
    if (result) result.hidden = true;
    if (loading) loading.hidden = true;
    if (err) err.textContent = "";
  }

  function showLoading() {
    var form = document.getElementById("pd-tryon-form");
    var result = document.getElementById("pd-tryon-result");
    var loading = document.getElementById("pd-tryon-loading");
    if (form) form.hidden = true;
    if (result) result.hidden = true;
    if (loading) loading.hidden = false;
  }

  function showResult(dataUrl) {
    var form = document.getElementById("pd-tryon-form");
    var result = document.getElementById("pd-tryon-result");
    var loading = document.getElementById("pd-tryon-loading");
    var img = document.getElementById("pd-tryon-img");
    if (form) form.hidden = true;
    if (loading) loading.hidden = true;
    if (result) result.hidden = false;
    if (img) img.src = dataUrl;
  }

  function selectedSkin() {
    var active = document.querySelector("#pd-tryon-skins .pd-tryon-skin.is-active");
    return active ? active.getAttribute("data-skin") : "orta";
  }

  function runTryOn(product) {
    var err = document.getElementById("pd-tryon-err");
    var heightEl = document.getElementById("pd-tryon-height");
    var weightEl = document.getElementById("pd-tryon-weight");
    var submit = document.getElementById("pd-tryon-submit");
    var height = heightEl ? Number(heightEl.value) : 0;
    var weight = weightEl ? Number(weightEl.value) : 0;
    var skin = selectedSkin();

    if (err) err.textContent = "";
    if (!height || height < 140 || height > 220) {
      if (err) err.textContent = "Boyu 140–220 sm arası seçin.";
      return;
    }
    if (!weight || weight < 40 || weight > 160) {
      if (err) err.textContent = "Çəkini 40–160 kq arası seçin.";
      return;
    }

    var imgSrc =
      resolveAsset(
        (product.images && product.images[0]) || product.image_url || product.image || ""
      ) || "";
    if (!imgSrc) {
      if (err) err.textContent = "Məhsul şəkli tapılmadı.";
      return;
    }

    showLoading();
    if (submit) submit.disabled = true;

    fetch(tryOnUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        height_cm: height,
        weight_kg: weight,
        skin: skin,
        product_name: product.name || "",
        image_url: imgSrc,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || !data.ok) {
            var e = new Error((data && data.error) || "Yoxlama alınmadı");
            e.code = data && data.error;
            throw e;
          }
          return data;
        });
      })
      .then(function (data) {
        var mime = data.mime || "image/png";
        showResult("data:" + mime + ";base64," + data.image_base64);
      })
      .catch(function (e) {
        showForm();
        var msg = (e && e.message) || "Xəta baş verdi";
        if (msg === "NO_GEMINI_KEY" || (e && e.code) === "NO_GEMINI_KEY") {
          msg = "AI üçün GEMINI_API_KEY .env faylında lazımdır.";
        } else if (/TRYON_QUOTA|quota|limit:\s*0|free_tier/i.test(msg)) {
          msg =
            "Gemini şəkil AI pulsuz planda bağlıdır (kvota 0). Google AI Studio-da Billing aktivləşdirin, sonra yenidən yoxlayın.";
        }
        if (err) err.textContent = msg;
      })
      .finally(function () {
        if (submit) submit.disabled = false;
      });
  }

  function renderCard(mount, product) {
    mount.hidden = false;
    mount.innerHTML =
      '<div class="pd-tryon">' +
      '<div class="pd-tryon__icon" aria-hidden="true">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/><circle cx="12" cy="12" r="4"/></svg>' +
      "</div>" +
      "<div>" +
      '<p class="pd-tryon__title">Görəsən əyninə olar?</p>' +
      '<p class="pd-tryon__text">Məhsulu online yoxla — boy, çəki və dəri rənginə görə AI maneken göstərsin.</p>' +
      "</div>" +
      '<button type="button" class="pd-tryon__btn" id="pd-tryon-open">Yoxla</button>' +
      "</div>";

    var openBtn = document.getElementById("pd-tryon-open");
    if (openBtn) {
      openBtn.addEventListener("click", function () {
        openModal();
        var submit = document.getElementById("pd-tryon-submit");
        if (submit) {
          submit.onclick = function () {
            runTryOn(product);
          };
        }
      });
    }
  }

  function initProductTryOn(product) {
    var mount = document.getElementById("pd-tryon");
    if (!mount) return;
    if (!isClothing(product)) {
      mount.hidden = true;
      mount.innerHTML = "";
      return;
    }
    ensureModal();
    renderCard(mount, product);
  }

  global.initProductTryOn = initProductTryOn;
})(window);
