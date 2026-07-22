/**
 * Buykon / BizdəVar — API ünvanı
 * buykon.com → https://api.buykon.com/api
 * localhost  → http://localhost:8080/api
 */
(function (global) {
  "use strict";

  var PROD_API = "https://api.buykon.com/api";
  var LOCAL_API = "http://localhost:8080/api";

  function isLocalHost() {
    var h = global.location && global.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  }

  function normalize(url) {
    return String(url || "").replace(/\/+$/, "");
  }

  function resolveApiBase() {
    if (global.BIZDEVAR_API_BASE) {
      return normalize(global.BIZDEVAR_API_BASE);
    }

    // Production saytda (buykon.com) meta-da localhost olsa belə server API istifadə et
    if (!isLocalHost()) {
      return PROD_API;
    }

    var meta =
      global.document && global.document.querySelector('meta[name="bizdevar-api"]');
    if (meta && meta.getAttribute("content")) {
      return normalize(meta.getAttribute("content"));
    }

    return LOCAL_API;
  }

  function resolveApiOrigin() {
    return resolveApiBase().replace(/\/api\/?$/, "");
  }

  /** Satıcı upload və digər media URL-lərini tam ünvana çevirir */
  function resolveMediaUrl(src) {
    var s = String(src == null ? "" : src).trim();
    if (!s) return "";
    if (/^https?:\/\//i.test(s) || s.indexOf("data:") === 0 || s.indexOf("blob:") === 0) {
      return s;
    }
    var path = s.replace(/^\/+/, "");
    if (path.indexOf("uploads/") === 0) {
      return resolveApiOrigin() + "/" + path;
    }
    return s;
  }

  /** Məhsul slug: AZ hərfləri + SEO-dostu tire */
  function productSlugify(s) {
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
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");
  }

  function productSlug(p) {
    if (!p) return "";
    if (p.slug) return productSlugify(p.slug);
    return productSlugify(p.name || "") || (p.id ? "p-" + p.id : "");
  }

  /**
   * Məhsul səhifəsi URL — istifadəçi formatı: /pages/product?=iphone-15-...
   * root: "" | "/" | "../" | sayt kökü
   */
  function productPageUrl(p, root) {
    var base = root != null ? String(root) : "";
    if (base && base.slice(-1) !== "/" && base !== "") base += "/";
    var s = productSlug(p);
    if (s) return base + "pages/product/?=" + encodeURIComponent(s);
    if (p && p.id) return base + "pages/product/?id=" + encodeURIComponent(String(p.id));
    return base + "pages/product/";
  }

  /**
   * Şəkillə axtarış endpoint (Gemini açarı server .env-də qalır)
   */
  function resolveVisualSearchUrl() {
    var root = "";
    if (global.document && global.document.body) {
      var attr = global.document.body.getAttribute("data-root");
      if (attr != null) root = String(attr);
    }
    if (root && root.slice(-1) !== "/" && root !== "") root += "/";
    return root + "api/visual-search.php";
  }

  function resolveKycSessionUrl() {
    var root = "";
    if (global.document && global.document.body) {
      var attr = global.document.body.getAttribute("data-root");
      if (attr != null) root = String(attr);
    }
    if (root && root.slice(-1) !== "/" && root !== "") root += "/";
    return root + "api/kyc-session.php";
  }

  global.BizdevarSiteConfig = {
    PROD_API: PROD_API,
    LOCAL_API: LOCAL_API,
    isLocalHost: isLocalHost,
    resolveApiBase: resolveApiBase,
    resolveApiOrigin: resolveApiOrigin,
    resolveMediaUrl: resolveMediaUrl,
    productSlugify: productSlugify,
    productSlug: productSlug,
    productPageUrl: productPageUrl,
    resolveVisualSearchUrl: resolveVisualSearchUrl,
    resolveKycSessionUrl: resolveKycSessionUrl,
  };

  global.BIZDEVAR_API_BASE = resolveApiBase();
})(window);
