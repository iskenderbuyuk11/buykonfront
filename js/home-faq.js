/**
 * Ana səhifə — Tez-tez verilən suallar (admin Ayarlardan idarə olunur)
 */
(function () {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function render(data) {
    var root = document.getElementById("homeFaq");
    var list = document.getElementById("homeFaqList");
    var titleEl = document.getElementById("homeFaqTitle");
    var leadEl = document.getElementById("homeFaqLead");
    if (!root || !list) return;

    var faq = window.BuykonHomeFaq
      ? BuykonHomeFaq.normalize(data)
      : data || { title: "Tez-tez verilən suallar", subtitle: "", items: [] };

    if (titleEl) titleEl.textContent = faq.title || "Tez-tez verilən suallar";
    if (leadEl) {
      if (faq.subtitle) {
        leadEl.textContent = faq.subtitle;
        leadEl.hidden = false;
      } else {
        leadEl.hidden = true;
      }
    }

    if (!faq.items || !faq.items.length) {
      root.hidden = true;
      return;
    }

    root.hidden = false;
    list.innerHTML = faq.items
      .map(function (item, i) {
        return (
          '<div class="home-faq__item" id="home-faq-' +
          i +
          '">' +
          '<button type="button" class="home-faq__q" aria-expanded="false" aria-controls="home-faq-a-' +
          i +
          '">' +
          esc(item.q) +
          "</button>" +
          '<div class="home-faq__a" id="home-faq-a-' +
          i +
          '" hidden><p>' +
          esc(item.a) +
          "</p></div>" +
          "</div>"
        );
      })
      .join("");

    list.querySelectorAll(".home-faq__q").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".home-faq__item");
        var panel = item.querySelector(".home-faq__a");
        var willOpen = !item.classList.contains("is-open");
        list.querySelectorAll(".home-faq__item.is-open").forEach(function (openItem) {
          if (openItem === item) return;
          openItem.classList.remove("is-open");
          var ob = openItem.querySelector(".home-faq__q");
          var op = openItem.querySelector(".home-faq__a");
          if (ob) ob.setAttribute("aria-expanded", "false");
          if (op) op.hidden = true;
        });
        item.classList.toggle("is-open", willOpen);
        btn.setAttribute("aria-expanded", willOpen ? "true" : "false");
        if (panel) panel.hidden = !willOpen;
      });
    });
  }

  function fromApiPayload(payload) {
    if (!payload) return null;
    if (window.BuykonHomeFaq) {
      if (payload.items || payload.title) return BuykonHomeFaq.normalize(payload);
      var parsed = BuykonHomeFaq.parseMaybeJson(payload.value);
      if (parsed) return BuykonHomeFaq.normalize(parsed);
      if (payload.setting && payload.setting.value) {
        parsed = BuykonHomeFaq.parseMaybeJson(payload.setting.value);
        if (parsed) return BuykonHomeFaq.normalize(parsed);
      }
    }
    return null;
  }

  function load() {
    var fallback = window.BuykonHomeFaq ? BuykonHomeFaq.getDefault() : null;
    var local = window.BuykonHomeFaq ? BuykonHomeFaq.readLocal() : null;
    if (local) render(local);
    else if (fallback) render(fallback);

    var API = window.BizdevarAPI;
    if (!API || typeof API.publicSetting !== "function" || !window.BuykonHomeFaq) return;

    API.publicSetting(BuykonHomeFaq.SETTING_KEY)
      .then(function (payload) {
        var data = fromApiPayload(payload);
        if (!data) return;
        BuykonHomeFaq.writeLocal(data);
        render(data);
      })
      .catch(function () {
        /* default / lokal qalır */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();
