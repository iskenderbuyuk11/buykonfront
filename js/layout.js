(function () {
  "use strict";

  function getRoot() {
    return document.body.getAttribute("data-root") || "";
  }

  function ensureAzFont() {
    if (document.querySelector('link[data-buykon-font="nunito"]')) return;
    var pre1 = document.createElement("link");
    pre1.rel = "preconnect";
    pre1.href = "https://fonts.googleapis.com";
    var pre2 = document.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "anonymous";
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("data-buykon-font", "nunito");
    link.href =
      "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,400..800;1,6..12,400..800&display=swap";
    document.head.appendChild(pre1);
    document.head.appendChild(pre2);
    document.head.appendChild(link);
  }

  function applyRoot(html, root) {
    return html.replace(/\{\{ROOT\}\}/g, root);
  }

  function loadPartial(path, root) {
    return fetch(root + path).then(function (res) {
      if (!res.ok) {
        throw new Error("Partial yüklənmədi: " + path);
      }
      return res.text();
    });
  }

  function injectHtml(targetId, html) {
    var target = document.getElementById(targetId);
    if (target) {
      target.innerHTML = html;
    }
  }

  function ensureI18n(root) {
    function loadScript(src) {
      return new Promise(function (resolve) {
        if (document.querySelector('script[src*="' + src.split("/").pop().split("?")[0] + '"]')) {
          resolve();
          return;
        }
        var s = document.createElement("script");
        s.src = root + src;
        s.onload = function () {
          resolve();
        };
        s.onerror = function () {
          resolve();
        };
        document.head.appendChild(s);
      });
    }

    var chain = Promise.resolve();
    if (!window.BuykonI18n) chain = chain.then(function () {
      return loadScript("js/i18n.js?v=4");
    });
    if (!window.BuykonAITranslate) chain = chain.then(function () {
      return loadScript("js/ai-translate.js?v=4");
    });
    return chain.then(function () {
      return new Promise(function (resolve) {
        var tries = 0;
        var timer = setInterval(function () {
          tries += 1;
          if ((window.BuykonI18n && window.BuykonAITranslate) || tries > 40) {
            clearInterval(timer);
            resolve();
          }
        }, 40);
      });
    });
  }

  window.BizdevarLayoutReady = ensureI18n(getRoot())
    .then(function () {
      return Promise.all([
        loadPartial("partials/header.html", getRoot()),
        loadPartial("partials/footer.html", getRoot()),
        loadPartial("partials/bottom-nav.html", getRoot()),
      ]);
    })
    .then(function (parts) {
      ensureAzFont();
      var root = getRoot();
      injectHtml("site-header", applyRoot(parts[0], root));
      injectHtml("site-footer", applyRoot(parts[1], root));
      injectHtml("site-bottom-nav", applyRoot(parts[2], root));

      if (window.BuykonI18n) {
        BuykonI18n.mountDesktop(document.getElementById("lang-switch-desktop-host"));
        BuykonI18n.mountMobileBar(document.getElementById("lang-switch-mobile-host"));
        BuykonI18n.apply(document.getElementById("site-header"));
        BuykonI18n.apply(document.getElementById("site-footer"));
        BuykonI18n.apply(document.getElementById("site-bottom-nav"));
        BuykonI18n.apply(document.body);
      }
      if (window.BuykonAITranslate && typeof BuykonAITranslate.translateLiveDom === "function") {
        setTimeout(function () {
          BuykonAITranslate.updateProductNameNodes(document);
          var lang =
            window.BuykonI18n && BuykonI18n.getLang ? BuykonI18n.getLang() : "az";
          if (lang !== "az") {
            BuykonAITranslate.translateLiveDom(document.body);
          }
        }, 80);
      }

      document.dispatchEvent(new CustomEvent("BizdevarLayoutLoaded"));
      if (!window.__buykonTawkLoaded && !document.querySelector('script[src*="tawk.js"]')) {
        var s = document.createElement("script");
        s.src = root + "js/tawk.js";
        s.async = true;
        document.body.appendChild(s);
      }
      if (!window.BuykonOnboarding && !document.querySelector('script[src*="onboarding.js"]')) {
        var ob = document.createElement("script");
        ob.src = root + "js/onboarding.js?v=3";
        ob.async = true;
        document.body.appendChild(ob);
      }
    })
    .catch(function (err) {
      console.error(err);
    });

  window.BizdevarLayout = {
    getRoot: getRoot,
  };
})();
