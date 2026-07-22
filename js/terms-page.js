(function () {
  "use strict";

  var root = document.getElementById("termsRoot");
  if (!root || !window.BuykonTerms) return;

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function paragraphsHtml(list) {
    return (list || [])
      .map(function (p) {
        return String(p || "")
          .split(/\n{2,}/)
          .map(function (chunk) {
            var t = chunk.trim();
            return t ? "<p>" + esc(t).replace(/\n/g, "<br />") + "</p>" : "";
          })
          .join("");
      })
      .join("");
  }

  function bulletsHtml(list) {
    if (!list || !list.length) return "";
    return "<ul>" + list.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>";
  }

  function render(data) {
    data = BuykonTerms.normalize(data);
    var toc =
      '<nav class="policy-toc" aria-label="Müqavilə bölmələri">' +
      "<h2>Mündəricat</h2>" +
      data.sections
        .map(function (s) {
          return '<a href="#' + esc(s.id) + '">' + esc(s.title) + "</a>";
        })
        .join("") +
      "</nav>";

    var body = data.sections
      .map(function (s) {
        return (
          '<section class="policy-section" id="' +
          esc(s.id) +
          '">' +
          "<h2>" +
          esc(s.title) +
          "</h2>" +
          paragraphsHtml(s.paragraphs) +
          bulletsHtml(s.bullets) +
          paragraphsHtml(s.after) +
          "</section>"
        );
      })
      .join("");

    root.innerHTML =
      '<section class="policy-hero">' +
      '<div class="policy-hero__inner container">' +
      "<div>" +
      '<span class="policy-eyebrow">Hüquqi sənəd</span>' +
      "<h1>" +
      esc(data.title) +
      "</h1>" +
      '<div class="policy-hero__intro">' +
      paragraphsHtml([data.intro]) +
      "</div>" +
      "</div>" +
      '<aside class="policy-date" aria-label="Sənəd tarixi">' +
      "<span>Son yenilənmə</span>" +
      "<strong>" +
      esc(data.updated_at) +
      "</strong>" +
      "</aside>" +
      "</div>" +
      "</section>" +
      '<div class="policy-layout container">' +
      toc +
      '<article class="policy-document">' +
      body +
      '<div class="policy-note">Bu Müqavilə ilə bağlı suallar üçün <a href="../elaqe/">Əlaqə</a> səhifəsindən Buykon dəstək xidmətinə müraciət edə bilərsiniz. Şəxsi məlumatlar üçün <a href="../gizlilik-siyaseti/">Məxfilik Siyasəti</a>nə baxın.</div>' +
      "</article>" +
      "</div>";
  }

  function loadFromApi() {
    var API = window.BizdevarAPI;
    if (!API) return Promise.reject(new Error("no-api"));

    var tries = [];
    if (typeof API.legalTerms === "function") tries.push(function () { return API.legalTerms(); });
    if (typeof API.publicSetting === "function") {
      tries.push(function () { return API.publicSetting(BuykonTerms.SETTING_KEY); });
    }

    function next(i) {
      if (i >= tries.length) return Promise.reject(new Error("no-terms-endpoint"));
      return tries[i]()
        .then(function (data) {
          var parsed =
            BuykonTerms.parseMaybeJson(data && (data.terms || data.value || data.config || data)) ||
            (data && data.sections ? data : null);
          if (!parsed || !parsed.sections) throw new Error("empty");
          return BuykonTerms.normalize(parsed);
        })
        .catch(function () {
          return next(i + 1);
        });
    }

    return next(0);
  }

  root.innerHTML = '<p class="policy-loading container">Yüklənir...</p>';

  loadFromApi()
    .then(function (data) {
      render(data);
    })
    .catch(function () {
      var local = BuykonTerms.readLocal();
      render(local || BuykonTerms.getDefault());
    });
})();
