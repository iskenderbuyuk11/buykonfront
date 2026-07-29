/**
 * Buykon AI Translate — neural tərcümə (məhsul adları + səhifə mətnləri)
 * Cache: localStorage
 */
(function (global) {
  "use strict";

  var CACHE_KEY = "buykon_ai_tr_v2";
  var MAX_CACHE = 2500;
  var CONCURRENCY = 4;
  var LANG_MAP = {
    az: "az",
    tr: "tr",
    zh: "zh-CN",
    ka: "ka",
    kk: "kk",
    uz: "uz",
    ar: "ar",
    en: "en",
  };

  var cache = loadCache();
  var inflight = {};
  var queue = [];
  var active = 0;
  var productNameCache = Object.create(null);

  function loadCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function saveCache() {
    try {
      var keys = Object.keys(cache);
      if (keys.length > MAX_CACHE) {
        keys.slice(0, keys.length - MAX_CACHE).forEach(function (k) {
          delete cache[k];
        });
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      /* ignore quota */
    }
  }

  function currentLang() {
    if (global.BuykonI18n && BuykonI18n.getLang) return BuykonI18n.getLang();
    try {
      return localStorage.getItem("buykon_lang") || "az";
    } catch (e) {
      return "az";
    }
  }

  function mapLang(code) {
    return LANG_MAP[String(code || "az").toLowerCase()] || "en";
  }

  function norm(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }

  function cacheKey(text, to, from) {
    return from + "|" + to + "|" + norm(text).toLowerCase();
  }

  function getCached(text, to, from) {
    var k = cacheKey(text, to, from);
    return cache[k] || null;
  }

  function setCached(text, to, from, translated) {
    var k = cacheKey(text, to, from);
    cache[k] = translated;
    saveCache();
  }

  function translateUrl(text, to, from) {
    var cfg = global.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveTranslateUrl === "function") {
      var api = cfg.resolveTranslateUrl();
      if (api) return { type: "api", url: api };
    }
    return {
      type: "gtx",
      url:
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
        encodeURIComponent(from) +
        "&tl=" +
        encodeURIComponent(to) +
        "&dt=t&q=" +
        encodeURIComponent(text),
    };
  }

  function parseGtx(data) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
    return data[0]
      .map(function (part) {
        return part && part[0] ? part[0] : "";
      })
      .join("");
  }

  function fetchGtx(text, to, from) {
    var url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
      encodeURIComponent(from) +
      "&tl=" +
      encodeURIComponent(to) +
      "&dt=t&q=" +
      encodeURIComponent(text);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("translate http " + res.status);
        return res.json();
      })
      .then(parseGtx);
  }

  function fetchOne(text, to, from) {
    var endpoint = translateUrl(text, to, from);
    if (endpoint.type === "api" && endpoint.url) {
      return fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, from: from, to: to, texts: [text], target: to, source: from }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error((data && data.error) || "AI translate failed");
            var out =
              (data && (data.translation || data.translated || (data.translations && data.translations[0]))) ||
              "";
            if (!norm(out)) throw new Error("empty api translation");
            return out;
          });
        })
        .catch(function () {
          return fetchGtx(text, to, from);
        });
    }

    return fetchGtx(text, to, from);
  }

  function runQueue() {
    while (active < CONCURRENCY && queue.length) {
      var job = queue.shift();
      active += 1;
      fetchOne(job.text, job.to, job.from)
        .then(function (translated) {
          var out = norm(translated) || job.text;
          setCached(job.text, job.to, job.from, out);
          delete inflight[job.key];
          active -= 1;
          job.resolve(out);
          runQueue();
        })
        .catch(function () {
          delete inflight[job.key];
          active -= 1;
          job.resolve(job.text);
          runQueue();
        });
    }
  }

  function translate(text, toLang, fromLang) {
    var raw = norm(text);
    if (!raw) return Promise.resolve("");
    var to = mapLang(toLang || currentLang());
    var from = mapLang(fromLang || "az");
    if (to === from) return Promise.resolve(raw);

    var hit = getCached(raw, to, from);
    if (hit) return Promise.resolve(hit);

    var key = cacheKey(raw, to, from);
    if (inflight[key]) return inflight[key];

    var p = new Promise(function (resolve) {
      queue.push({ text: raw, to: to, from: from, key: key, resolve: resolve });
      runQueue();
    });
    inflight[key] = p;
    return p;
  }

  function translateMany(texts, toLang, fromLang) {
    var list = (texts || []).map(norm).filter(Boolean);
    var uniq = [];
    var seen = Object.create(null);
    list.forEach(function (t) {
      var k = t.toLowerCase();
      if (!seen[k]) {
        seen[k] = true;
        uniq.push(t);
      }
    });
    return Promise.all(
      uniq.map(function (t) {
        return translate(t, toLang, fromLang);
      })
    ).then(function (translated) {
      var map = Object.create(null);
      uniq.forEach(function (t, i) {
        map[t] = translated[i];
        map[t.toLowerCase()] = translated[i];
      });
      return map;
    });
  }

  function displayName(product) {
    if (!product) return "";
    var original = norm(product.name || product.title || "");
    if (!original) return "";
    var lang = currentLang();
    if (lang === "az") return original;
    var id = product.id != null ? String(product.id) : "";
    var key = lang + ":" + (id || original.toLowerCase());
    if (productNameCache[key]) return productNameCache[key];
    var hit = getCached(original, mapLang(lang), "az");
    if (hit) {
      productNameCache[key] = hit;
      return hit;
    }
    return original;
  }

  function warmProducts(products, toLang) {
    var lang = toLang || currentLang();
    if (lang === "az") return Promise.resolve(products || []);
    var list = products || [];
    var names = list
      .map(function (p) {
        return norm(p && (p.name || p.title));
      })
      .filter(Boolean);
    return translateMany(names, lang, "az").then(function (map) {
      list.forEach(function (p) {
        if (!p) return;
        var original = norm(p.name || p.title);
        if (!original) return;
        var tr = map[original] || map[original.toLowerCase()] || original;
        var id = p.id != null ? String(p.id) : "";
        productNameCache[lang + ":" + (id || original.toLowerCase())] = tr;
        p._name_az = p._name_az || original;
        p._name_i18n = tr;
      });
      return list;
    });
  }

  function updateProductNameNodes(root) {
    var scope = root || document;
    var lang = currentLang();
    scope.querySelectorAll("[data-ai-product-name]").forEach(function (el) {
      var original = el.getAttribute("data-ai-product-name") || el.textContent;
      original = norm(original);
      if (!original) return;
      if (lang === "az") {
        el.textContent = original;
        return;
      }
      var id = el.getAttribute("data-ai-product-id") || "";
      var key = lang + ":" + (id || original.toLowerCase());
      if (productNameCache[key]) {
        el.textContent = productNameCache[key];
        return;
      }
      translate(original, lang, "az").then(function (tr) {
        if (currentLang() !== lang) return;
        productNameCache[key] = tr;
        el.textContent = tr;
      });
    });
  }

  function looksTranslatable(text) {
    var s = norm(text);
    if (s.length < 3 || s.length > 220) return false;
    if (/^https?:\/\//i.test(s)) return false;
    if (/^[\d\s.,:%₼$€+\-]+$/.test(s)) return false;
    if (/^[A-Z0-9_\-./]+$/.test(s) && s.length < 12) return false;
    // Skip pure brand codes already latin short
    return true;
  }

  function translateLiveDom(root) {
    var lang = currentLang();
    if (lang === "az") return Promise.resolve();
    var scope = root || document.body;
    if (!scope) return Promise.resolve();

    var texts = [];
    var nodes = [];
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node || !norm(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        var parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        var tag = parent.tagName;
        if (
          tag === "SCRIPT" ||
          tag === "STYLE" ||
          tag === "TEXTAREA" ||
          tag === "CODE" ||
          tag === "NOSCRIPT"
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest("[data-lang-switch], .lang-switch, [data-ai-skip]")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.getAttribute("data-i18n")) return NodeFilter.FILTER_REJECT;
        if (!looksTranslatable(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) {
      var n = walker.currentNode;
      var t = norm(n.nodeValue);
      // Prefer Azerbaijani-looking or already known source texts
      nodes.push(n);
      texts.push(t);
    }

    if (!texts.length) {
      updateProductNameNodes(scope);
      return Promise.resolve();
    }

    return translateMany(texts, lang, "az").then(function (map) {
      if (currentLang() !== lang) return;
      nodes.forEach(function (node) {
        var raw = node.nodeValue;
        var trimmed = norm(raw);
        var tr = map[trimmed] || map[trimmed.toLowerCase()];
        if (!tr || tr === trimmed) return;
        var lead = raw.match(/^\s*/)[0] || "";
        var trail = raw.match(/\s*$/)[0] || "";
        node.nodeValue = lead + tr + trail;
      });
      updateProductNameNodes(scope);
    });
  }

  function onLangChanged() {
    productNameCache = Object.create(null);
    updateProductNameNodes(document);
    translateLiveDom(document.body);
    document.dispatchEvent(new CustomEvent("BuykonAITranslateReady", { detail: { lang: currentLang() } }));
  }

  function init() {
    document.addEventListener("BuykonLangChanged", function () {
      setTimeout(onLangChanged, 30);
    });
    document.addEventListener("BizdevarLayoutLoaded", function () {
      setTimeout(function () {
        updateProductNameNodes(document);
        if (currentLang() !== "az") translateLiveDom(document.body);
      }, 50);
    });
    if (currentLang() !== "az") {
      setTimeout(function () {
        translateLiveDom(document.body);
      }, 200);
    }
  }

  global.BuykonAITranslate = {
    translate: translate,
    translateMany: translateMany,
    displayName: displayName,
    warmProducts: warmProducts,
    updateProductNameNodes: updateProductNameNodes,
    translateLiveDom: translateLiveDom,
    onLangChanged: onLangChanged,
    CACHE_KEY: CACHE_KEY,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
