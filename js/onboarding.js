/* ===== BUYKON ONBOARDING =====
 * Sayta ilk dəfə daxil olanda:
 *  Addım 1 — ölkə seçimi (bayraqlı siyahı + avtomatik təyinat)
 *  Addım 2 — cinsiyyət seçimi (ikonlu kartlar)
 * Seçimlər localStorage-da saxlanılır.
 */
(function () {
  "use strict";

  var DONE_KEY = "buykon_onboarding_done";
  var COUNTRY_KEY = "buykon_country";
  var GENDER_KEY = "buykon_gender";

  // Onboarding-in görünməməli olduğu səhifələr
  var SKIP_PATHS = ["/login/", "/register/", "/verify/", "/error/"];

  var COUNTRIES = [
    { code: "AZ", name: "Azərbaycan" },
    { code: "TR", name: "Türkiyə" },
    { code: "GE", name: "Gürcüstan" },
    { code: "RU", name: "Rusiya" },
    { code: "UA", name: "Ukrayna" },
    { code: "KZ", name: "Qazaxıstan" },
    { code: "UZ", name: "Özbəkistan" },
    { code: "TM", name: "Türkmənistan" },
    { code: "KG", name: "Qırğızıstan" },
    { code: "IR", name: "İran" },
    { code: "AE", name: "Birləşmiş Ərəb Əmirlikləri" },
    { code: "SA", name: "Səudiyyə Ərəbistanı" },
    { code: "QA", name: "Qətər" },
    { code: "IL", name: "İsrail" },
    { code: "DE", name: "Almaniya" },
    { code: "GB", name: "Böyük Britaniya" },
    { code: "FR", name: "Fransa" },
    { code: "IT", name: "İtaliya" },
    { code: "ES", name: "İspaniya" },
    { code: "NL", name: "Niderland" },
    { code: "PL", name: "Polşa" },
    { code: "SE", name: "İsveç" },
    { code: "CH", name: "İsveçrə" },
    { code: "AT", name: "Avstriya" },
    { code: "US", name: "ABŞ" },
    { code: "CA", name: "Kanada" },
    { code: "BR", name: "Braziliya" },
    { code: "CN", name: "Çin" },
    { code: "JP", name: "Yaponiya" },
    { code: "KR", name: "Cənubi Koreya" },
    { code: "IN", name: "Hindistan" },
    { code: "AU", name: "Avstraliya" },
  ];

  var ICONS = {
    globe:
      '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    target:
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>',
    check:
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    search:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    male:
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="6"/><path d="M14.5 9.5 21 3"/><path d="M15.5 3H21v5.5"/></svg>',
    female:
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M12 14v8"/><path d="M8.5 18.5h7"/></svg>',
    arrowRight:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    arrowLeft:
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  };

  var state = {
    step: 1,
    country: null, // {code, name, auto}
    gender: null, // "male" | "female"
    detecting: false,
  };

  var els = {};

  function getRoot() {
    return (document.body && document.body.getAttribute("data-root")) || "";
  }

  function flagUrl(code) {
    return "https://flagcdn.com/w40/" + code.toLowerCase() + ".png";
  }

  function shouldSkipPage() {
    var p = location.pathname;
    for (var i = 0; i < SKIP_PATHS.length; i++) {
      if (p.indexOf(SKIP_PATHS[i]) !== -1) return true;
    }
    return false;
  }

  function injectCss() {
    if (document.querySelector('link[href*="onboarding.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = getRoot() + "css/onboarding.css?v=2";
    document.head.appendChild(link);
  }

  /* ---------- DOM qurulması ---------- */

  function buildCountryItem(c) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "obx-item";
    btn.setAttribute("data-code", c.code);
    btn.setAttribute("data-name", c.name);
    btn.innerHTML =
      '<img class="obx-item__flag" src="' + flagUrl(c.code) + '" alt="" loading="lazy" />' +
      '<span class="obx-item__name">' + c.name + "</span>" +
      '<span class="obx-item__check">' + ICONS.check + "</span>";
    btn.addEventListener("click", function () {
      selectCountry({ code: c.code, name: c.name, auto: false }, btn);
    });
    return btn;
  }

  function buildModal() {
    var backdrop = document.createElement("div");
    backdrop.className = "obx-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", "Xoş gəlmisiniz");

    backdrop.innerHTML =
      '<div class="obx-card">' +
      '  <div class="obx-head">' +
      '    <div class="obx-head__badge" id="obxBadge">' + ICONS.globe + "</div>" +
      '    <h2 class="obx-head__title" id="obxTitle">Ölkənizi seçin</h2>' +
      '    <p class="obx-head__sub" id="obxSub">Sizə uyğun məhsul və çatdırılma üçün</p>' +
      '    <div class="obx-steps">' +
      '      <span class="obx-steps__dot is-active" data-step="1"></span>' +
      '      <span class="obx-steps__dot" data-step="2"></span>' +
      "    </div>" +
      "  </div>" +
      '  <div class="obx-body">' +
      '    <div class="obx-step is-active" id="obxStep1">' +
      '      <div class="obx-search">' +
      ICONS.search +
      '        <input type="text" id="obxSearch" placeholder="Ölkə axtar..." autocomplete="off" />' +
      "      </div>" +
      '      <div class="obx-list" id="obxList"></div>' +
      "    </div>" +
      '    <div class="obx-step" id="obxStep2">' +
      '      <div class="obx-genders">' +
      '        <button type="button" class="obx-gender obx-gender--male" data-gender="male">' +
      '          <span class="obx-gender__check">' + ICONS.check + "</span>" +
      '          <span class="obx-gender__icon">' + ICONS.male + "</span>" +
      "          <span>Kişi</span>" +
      "        </button>" +
      '        <button type="button" class="obx-gender obx-gender--female" data-gender="female">' +
      '          <span class="obx-gender__check">' + ICONS.check + "</span>" +
      '          <span class="obx-gender__icon">' + ICONS.female + "</span>" +
      "          <span>Qadın</span>" +
      "        </button>" +
      "      </div>" +
      "    </div>" +
      "  </div>" +
      '  <div class="obx-foot">' +
      '    <button type="button" class="obx-btn obx-btn--ghost" id="obxBack" hidden>' +
      ICONS.arrowLeft + " Geri</button>" +
      '    <button type="button" class="obx-btn obx-btn--primary" id="obxNext" disabled>' +
      "Davam et " + ICONS.arrowRight + "</button>" +
      "  </div>" +
      '  <div class="obx-skip"><button type="button" id="obxSkip">İndi yox, sonra seçəcəm</button></div>' +
      "</div>";

    // Ölkə siyahısı: əvvəldə "Avtomatik" seçimi
    var list = backdrop.querySelector("#obxList");

    var autoBtn = document.createElement("button");
    autoBtn.type = "button";
    autoBtn.className = "obx-item obx-item--auto";
    autoBtn.id = "obxAuto";
    autoBtn.innerHTML =
      '<span class="obx-item__icon">' + ICONS.target + "</span>" +
      '<span class="obx-item__name">Avtomatik təyin et' +
      '<span class="obx-item__hint" id="obxAutoHint">Yerləşdiyiniz ölkə avtomatik tapılsın</span></span>' +
      '<span class="obx-item__check">' + ICONS.check + "</span>";
    autoBtn.addEventListener("click", detectCountry);
    list.appendChild(autoBtn);

    COUNTRIES.forEach(function (c) {
      list.appendChild(buildCountryItem(c));
    });

    document.body.appendChild(backdrop);

    els.backdrop = backdrop;
    els.badge = backdrop.querySelector("#obxBadge");
    els.title = backdrop.querySelector("#obxTitle");
    els.sub = backdrop.querySelector("#obxSub");
    els.dots = backdrop.querySelectorAll(".obx-steps__dot");
    els.step1 = backdrop.querySelector("#obxStep1");
    els.step2 = backdrop.querySelector("#obxStep2");
    els.list = list;
    els.search = backdrop.querySelector("#obxSearch");
    els.autoBtn = autoBtn;
    els.autoHint = backdrop.querySelector("#obxAutoHint");
    els.back = backdrop.querySelector("#obxBack");
    els.next = backdrop.querySelector("#obxNext");
    els.skip = backdrop.querySelector("#obxSkip");
    els.genderBtns = backdrop.querySelectorAll(".obx-gender");

    bindEvents();
  }

  function bindEvents() {
    els.search.addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      var items = els.list.querySelectorAll(".obx-item:not(.obx-item--auto)");
      items.forEach(function (it) {
        var name = (it.getAttribute("data-name") || "").toLowerCase();
        it.style.display = name.indexOf(q) !== -1 ? "" : "none";
      });
      els.autoBtn.style.display = q === "" ? "" : "none";
    });

    els.genderBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.gender = btn.getAttribute("data-gender");
        els.genderBtns.forEach(function (b) {
          b.classList.toggle("is-selected", b === btn);
        });
        els.next.disabled = false;
      });
    });

    els.next.addEventListener("click", function () {
      if (state.step === 1 && state.country) {
        goToStep(2);
      } else if (state.step === 2 && state.gender) {
        finish();
      }
    });

    els.back.addEventListener("click", function () {
      goToStep(1);
    });

    els.skip.addEventListener("click", function () {
      try {
        localStorage.setItem(DONE_KEY, "skipped");
      } catch (e) {}
      close();
    });
  }

  /* ---------- Məntiq ---------- */

  function selectCountry(country, btn) {
    state.country = country;
    var items = els.list.querySelectorAll(".obx-item");
    items.forEach(function (it) {
      it.classList.toggle("is-selected", it === btn);
    });
    els.next.disabled = false;
  }

  function detectCountry() {
    if (state.detecting) return;
    state.detecting = true;
    els.autoBtn.classList.add("is-loading");
    els.autoHint.textContent = "Ölkəniz təyin edilir...";

    fetchGeo("https://ipapi.co/json/")
      .catch(function () {
        return fetchGeo("https://ipwho.is/");
      })
      .then(function (geo) {
        state.detecting = false;
        els.autoBtn.classList.remove("is-loading");
        if (!geo || !geo.code) {
          els.autoHint.textContent = "Təyin etmək mümkün olmadı, siyahıdan seçin";
          return;
        }
        var known = COUNTRIES.filter(function (c) {
          return c.code === geo.code;
        })[0];
        var name = known ? known.name : geo.name;
        els.autoHint.innerHTML =
          'Tapıldı: <img src="' + flagUrl(geo.code) +
          '" alt="" style="width:16px;height:12px;border-radius:2px;vertical-align:-1px;box-shadow:0 0 2px rgba(0,0,0,.3)" /> <strong>' +
          name + "</strong>";
        selectCountry({ code: geo.code, name: name, auto: true }, els.autoBtn);
      })
      .catch(function () {
        state.detecting = false;
        els.autoBtn.classList.remove("is-loading");
        els.autoHint.textContent = "Təyin etmək mümkün olmadı, siyahıdan seçin";
      });
  }

  function fetchGeo(url) {
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("geo failed");
        return res.json();
      })
      .then(function (data) {
        // ipapi.co: country_code / country_name; ipwho.is: country_code / country
        var code = (data.country_code || "").toUpperCase();
        if (!code || code.length !== 2) throw new Error("geo no code");
        return {
          code: code,
          name: data.country_name || data.country || "",
        };
      });
  }

  function goToStep(step) {
    state.step = step;
    els.step1.classList.toggle("is-active", step === 1);
    els.step2.classList.toggle("is-active", step === 2);
    els.dots.forEach(function (dot) {
      dot.classList.toggle(
        "is-active",
        parseInt(dot.getAttribute("data-step"), 10) <= step
      );
    });
    els.back.hidden = step === 1;

    if (step === 1) {
      els.title.textContent = "Ölkənizi seçin";
      els.sub.textContent = "Sizə uyğun məhsul və çatdırılma üçün";
      els.badge.innerHTML = ICONS.globe;
      els.next.innerHTML = "Davam et " + ICONS.arrowRight;
      els.next.disabled = !state.country;
    } else {
      els.title.textContent = "Cinsiyyətinizi seçin";
      els.sub.textContent = "Sizə uyğun təkliflər göstərək";
      els.badge.innerHTML = state.gender === "female" ? ICONS.female : ICONS.male;
      els.next.innerHTML = ICONS.check + " Bitir";
      els.next.disabled = !state.gender;
    }
  }

  function finish() {
    try {
      localStorage.setItem(COUNTRY_KEY, JSON.stringify(state.country));
      localStorage.setItem(GENDER_KEY, state.gender);
      localStorage.setItem(DONE_KEY, "1");
    } catch (e) {}
    document.dispatchEvent(
      new CustomEvent("BuykonOnboardingDone", {
        detail: { country: state.country, gender: state.gender },
      })
    );
    close();
  }

  function open() {
    injectCss();
    if (!els.backdrop) buildModal();
    document.body.classList.add("obx-open");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () {
      els.backdrop.classList.add("is-open");
    });
  }

  function close() {
    document.body.classList.remove("obx-open");
    document.body.style.overflow = "";
    if (!els.backdrop) return;
    els.backdrop.classList.remove("is-open");
    setTimeout(function () {
      if (els.backdrop && els.backdrop.parentNode) {
        els.backdrop.parentNode.removeChild(els.backdrop);
      }
      els = {};
    }, 380);
  }

  function init() {
    if (shouldSkipPage()) return;
    var done = null;
    try {
      done = localStorage.getItem(DONE_KEY);
    } catch (e) {}
    if (done) return;
    open();
  }

  // Yenidən açmaq üçün qlobal API (məs. profil səhifəsindən)
  window.BuykonOnboarding = {
    open: function () {
      state.step = 1;
      state.country = null;
      state.gender = null;
      open();
      goToStep(1);
    },
    getCountry: function () {
      try {
        return JSON.parse(localStorage.getItem(COUNTRY_KEY) || "null");
      } catch (e) {
        return null;
      }
    },
    getGender: function () {
      try {
        return localStorage.getItem(GENDER_KEY);
      } catch (e) {
        return null;
      }
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
