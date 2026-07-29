/**
 * Buykon AI Translate — sürətli batch tərcümə (məhsul adları + səhifə)
 * Cache: localStorage (debounce)
 */
(function (global) {
  "use strict";

  var CACHE_KEY = "buykon_ai_tr_v2";
  var MAX_CACHE = 3000;
  var BATCH_SIZE = 18;
  var CONCURRENCY = 8;
  var SEP = "\n";
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
  var saveTimer = null;
  var liveDomTimer = null;
  var liveDomToken = 0;

  function loadCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function flushCache() {
    saveTimer = null;
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

  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(flushCache, 400);
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
    var c = String(code || "az").toLowerCase();
    if (c === "auto") return "auto";
    return LANG_MAP[c] || "en";
  }

  function sourceLangFor(text) {
    var s = String(text || "");
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(s)) return "zh-CN";
    if (/[\u0600-\u06FF]/.test(s)) return "ar";
    if (/[\u10A0-\u10FF]/.test(s)) return "ka";
    if (/[\u0400-\u04FF]/.test(s)) return "kk";
    return "auto";
  }

  function sameLangFamily(a, b) {
    var x = mapLang(a);
    var y = mapLang(b);
    if (x === y) return true;
    if (String(x).indexOf("zh") === 0 && String(y).indexOf("zh") === 0) return true;
    return false;
  }

  /** Mətn seçilmiş dilə uyğundurmu, yoxsa tərcümə lazımdır? */
  function needsTranslate(text, toLang) {
    var raw = norm(text);
    if (!raw) return false;
    var to = mapLang(toLang || currentLang());
    var from = sourceLangFor(raw);
    if (from === "auto") {
      // Latın/AZ mətn — yalnız hədəf AZ deyilsə tərcümə et
      return to !== "az";
    }
    return !sameLangFamily(from, to);
  }

  function norm(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }

  function cacheKey(text, to, from) {
    return from + "|" + to + "|" + norm(text).toLowerCase();
  }

  function getCached(text, to, from) {
    return cache[cacheKey(text, to, from)] || null;
  }

  function setCached(text, to, from, translated) {
    cache[cacheKey(text, to, from)] = translated;
    scheduleSave();
  }

  function setCachedMany(pairs, to, from) {
    pairs.forEach(function (p) {
      cache[cacheKey(p.text, to, from)] = p.out;
    });
    scheduleSave();
  }

  function parseGtx(data) {
    if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
    return data[0]
      .map(function (part) {
        return part && part[0] ? part[0] : "";
      })
      .join("");
  }

  function fetchGtxJoined(joined, to, from) {
    var url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
      encodeURIComponent(from) +
      "&tl=" +
      encodeURIComponent(to) +
      "&dt=t&q=" +
      encodeURIComponent(joined);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("translate http " + res.status);
        return res.json();
      })
      .then(parseGtx);
  }

  function fetchApiBatch(texts, to, from) {
    var cfg = global.BizdevarSiteConfig;
    var api =
      cfg && typeof cfg.resolveTranslateUrl === "function" ? cfg.resolveTranslateUrl() : "";
    if (!api) return Promise.reject(new Error("no api"));
    return fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: texts, text: texts.join("\n"), from: from, to: to, source: from, target: to }),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || "AI translate failed");
        if (Array.isArray(data.translations) && data.translations.length === texts.length) {
          return data.translations;
        }
        if (Array.isArray(data.translated) && data.translated.length === texts.length) {
          return data.translated;
        }
        var one = data.translation || data.translated || "";
        if (typeof one === "string" && one) {
          var parts = one.split(SEP);
          if (parts.length === texts.length) return parts;
        }
        throw new Error("bad api batch");
      });
    });
  }

  function translateBatch(texts, to, from) {
    if (!texts.length) return Promise.resolve([]);
    if (texts.length === 1) {
      return fetchGtxJoined(texts[0], to, from).then(function (out) {
        return [norm(out) || texts[0]];
      });
    }

    var marked = texts
      .map(function (t, i) {
        return "[" + i + "]" + t;
      })
      .join("\n");

    function parseMarked(raw) {
      var out = new Array(texts.length);
      var re = /\[(\d+)\]([\s\S]*?)(?=\[\d+\]|$)/g;
      var m;
      var found = 0;
      while ((m = re.exec(String(raw || ""))) !== null) {
        var idx = parseInt(m[1], 10);
        if (idx >= 0 && idx < texts.length) {
          out[idx] = norm(m[2]);
          found += 1;
        }
      }
      if (found < Math.ceil(texts.length * 0.6)) return null;
      for (var i = 0; i < texts.length; i++) {
        if (!out[i]) out[i] = texts[i];
      }
      return out;
    }

    return fetchApiBatch(texts, to, from)
      .catch(function () {
        return fetchGtxJoined(marked, to, from).then(function (raw) {
          var parsed = parseMarked(raw);
          if (parsed) return parsed;
          return Promise.all(
            texts.map(function (t) {
              return fetchGtxJoined(t, to, from).then(function (x) {
                return norm(x) || t;
              });
            })
          );
        });
      })
      .then(function (outs) {
        return (outs || []).map(function (o, i) {
          return norm(o) || texts[i];
        });
      });
  }

  function runQueue() {
    while (active < CONCURRENCY && queue.length) {
      var job = queue.shift();
      active += 1;
      translateBatch(job.texts, job.to, job.from)
        .then(function (outs) {
          var pairs = [];
          job.texts.forEach(function (t, i) {
            var out = outs[i] || t;
            pairs.push({ text: t, out: out });
            var key = cacheKey(t, job.to, job.from);
            delete inflight[key];
            if (job.resolvers[key]) {
              job.resolvers[key].forEach(function (resolve) {
                resolve(out);
              });
            }
          });
          setCachedMany(pairs, job.to, job.from);
          active -= 1;
          runQueue();
        })
        .catch(function () {
          job.texts.forEach(function (t) {
            var key = cacheKey(t, job.to, job.from);
            delete inflight[key];
            if (job.resolvers[key]) {
              job.resolvers[key].forEach(function (resolve) {
                resolve(t);
              });
            }
          });
          active -= 1;
          runQueue();
        });
    }
  }

  function enqueueBatch(pending, to, from) {
    // pending: [{text, resolve}]
    var i = 0;
    while (i < pending.length) {
      var chunk = pending.slice(i, i + BATCH_SIZE);
      i += BATCH_SIZE;
      var texts = [];
      var resolvers = Object.create(null);
      var seenText = Object.create(null);
      chunk.forEach(function (item) {
        var key = cacheKey(item.text, to, from);
        if (!resolvers[key]) resolvers[key] = [];
        resolvers[key].push(item.resolve);
        if (!seenText[key]) {
          seenText[key] = true;
          texts.push(item.text);
        }
      });
      queue.push({ texts: texts, to: to, from: from, resolvers: resolvers });
    }
    runQueue();
  }

  function flushTranslateBuffer() {
    if (translate._bufFlush) {
      clearTimeout(translate._bufFlush);
      translate._bufFlush = null;
    }
    var items = translate._buf || [];
    var to = translate._bufTo;
    var from = translate._bufFrom;
    translate._buf = null;
    if (items.length) enqueueBatch(items, to, from);
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
    if (inflight[key] && typeof inflight[key].then === "function") return inflight[key];

    var resolveOuter;
    var p = new Promise(function (resolve) {
      resolveOuter = resolve;
    });
    inflight[key] = p;

    if (!translate._buf) {
      translate._buf = [];
      translate._bufTo = to;
      translate._bufFrom = from;
      translate._bufFlush = setTimeout(flushTranslateBuffer, 8);
    } else if (translate._bufTo !== to || translate._bufFrom !== from) {
      flushTranslateBuffer();
      translate._buf = [];
      translate._bufTo = to;
      translate._bufFrom = from;
      translate._bufFlush = setTimeout(flushTranslateBuffer, 8);
    }

    translate._buf.push({
      text: raw,
      resolve: function (out) {
        resolveOuter(out);
      },
    });

    return p;
  }

  function translateMany(texts, toLang, fromLang, onChunk) {
    var to = mapLang(toLang || currentLang());
    var from = mapLang(fromLang || "az");
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

    var map = Object.create(null);
    var missing = [];

    uniq.forEach(function (t) {
      if (to === from) {
        map[t] = t;
        map[t.toLowerCase()] = t;
        return;
      }
      var hit = getCached(t, to, from);
      if (hit) {
        map[t] = hit;
        map[t.toLowerCase()] = hit;
      } else {
        missing.push(t);
      }
    });

    if (typeof onChunk === "function" && Object.keys(map).length) {
      try {
        onChunk(map);
      } catch (e) {
        /* ignore */
      }
    }

    if (!missing.length) return Promise.resolve(map);

    var pending = Promise.all(
      missing.map(function (t) {
        return translate(t, to, from).then(function (tr) {
          map[t] = tr;
          map[t.toLowerCase()] = tr;
          if (typeof onChunk === "function") {
            var partial = Object.create(null);
            partial[t] = tr;
            partial[t.toLowerCase()] = tr;
            try {
              onChunk(partial);
            } catch (e) {
              /* ignore */
            }
          }
          return tr;
        });
      })
    ).then(function () {
      return map;
    });

    // Buffer-dakı bütün mətnləri dərhal göndər (gözləmə)
    flushTranslateBuffer();
    return pending;
  }

  function displayName(product) {
    if (!product) return "";
    var original = norm(product.name || product.title || "");
    if (!original) return "";
    var lang = currentLang();
    if (!needsTranslate(original, lang)) return original;
    var id = product.id != null ? String(product.id) : "";
    var key = lang + ":" + (id || original.toLowerCase());
    if (productNameCache[key]) return productNameCache[key];
    var from = sourceLangFor(original);
    if (from === "auto") from = "az";
    var hit =
      getCached(original, mapLang(lang), from) ||
      getCached(original, mapLang(lang), "auto") ||
      getCached(original, mapLang(lang), "az");
    if (hit) {
      productNameCache[key] = hit;
      return hit;
    }
    return original;
  }

  function rememberProductName(product, translated, lang) {
    if (!product) return;
    var original = norm(product.name || product.title || "");
    if (!original) return;
    var id = product.id != null ? String(product.id) : "";
    productNameCache[lang + ":" + (id || original.toLowerCase())] = translated;
    product._name_src = product._name_src || original;
    product._name_i18n = translated;
  }

  function warmProducts(products, toLang, onChunk) {
    var lang = toLang || currentLang();
    var list = products || [];
    var names = list
      .map(function (p) {
        return norm(p && (p.name || p.title));
      })
      .filter(function (n) {
        return n && needsTranslate(n, lang);
      });

    if (!names.length) return Promise.resolve(list);

    var paintScheduled = false;
    function schedulePaint() {
      if (paintScheduled) return;
      paintScheduled = true;
      var raf = global.requestAnimationFrame || function (cb) {
        setTimeout(cb, 16);
      };
      raf(function () {
        paintScheduled = false;
        updateProductNameNodes(document);
        updateAiTextNodes(document);
        if (typeof onChunk === "function") {
          try {
            onChunk(list);
          } catch (e) {
            /* ignore */
          }
        }
      });
    }

    function applyMap(map) {
      list.forEach(function (p) {
        if (!p) return;
        var original = norm(p.name || p.title);
        if (!original) return;
        var tr = map[original] || map[original.toLowerCase()];
        if (!tr) return;
        rememberProductName(p, tr, lang);
      });
      schedulePaint();
    }

    // API mətnləri müxtəlif dildə ola bilər — auto
    return translateMany(names, lang, "auto", applyMap).then(function (map) {
      applyMap(map);
      return list;
    });
  }

  function updateProductNameNodes(root) {
    var scope = root || document;
    var lang = currentLang();
    var missing = [];
    scope.querySelectorAll("[data-ai-product-name]").forEach(function (el) {
      var original = norm(el.getAttribute("data-ai-product-name") || el.textContent);
      if (!original) return;
      if (!needsTranslate(original, lang)) {
        if (el.textContent !== original) el.textContent = original;
        return;
      }
      var id = el.getAttribute("data-ai-product-id") || "";
      var key = lang + ":" + (id || original.toLowerCase());
      var from = sourceLangFor(original);
      if (from === "auto") from = "az";
      var hit =
        productNameCache[key] ||
        getCached(original, mapLang(lang), from) ||
        getCached(original, mapLang(lang), "auto") ||
        getCached(original, mapLang(lang), "az");
      if (hit) {
        productNameCache[key] = hit;
        if (el.textContent !== hit) el.textContent = hit;
        return;
      }
      missing.push({ el: el, original: original, key: key });
    });

    if (!missing.length) return;

    var texts = missing.map(function (m) {
      return m.original;
    });
    translateMany(texts, lang, "auto", function (partial) {
      if (currentLang() !== lang) return;
      missing.forEach(function (m) {
        var tr = partial[m.original] || partial[m.original.toLowerCase()];
        if (!tr) return;
        productNameCache[m.key] = tr;
        if (m.el.textContent !== tr) m.el.textContent = tr;
      });
    });
  }

  /** Ümumi data-ai-text (kateqoriya və s.) */
  function updateAiTextNodes(root) {
    var scope = root || document;
    var lang = currentLang();
    var missing = [];
    scope.querySelectorAll("[data-ai-text]").forEach(function (el) {
      var original = norm(el.getAttribute("data-ai-text") || "");
      if (!original) return;
      if (!needsTranslate(original, lang)) {
        if (el.textContent !== original) el.textContent = original;
        return;
      }
      var hit =
        getCached(original, mapLang(lang), sourceLangFor(original)) ||
        getCached(original, mapLang(lang), "auto") ||
        getCached(original, mapLang(lang), "az");
      if (hit) {
        if (el.textContent !== hit) el.textContent = hit;
        return;
      }
      missing.push({ el: el, original: original });
    });
    if (!missing.length) return;
    translateMany(
      missing.map(function (m) {
        return m.original;
      }),
      lang,
      "auto",
      function (partial) {
        if (currentLang() !== lang) return;
        missing.forEach(function (m) {
          var tr = partial[m.original] || partial[m.original.toLowerCase()];
          if (tr && m.el.textContent !== tr) m.el.textContent = tr;
        });
      }
    );
  }

  function looksTranslatable(text) {
    var s = norm(text);
    if (s.length < 2 || s.length > 280) return false;
    if (/^https?:\/\//i.test(s)) return false;
    if (/^[\d\s.,:%₼$€+\-×÷]+$/.test(s)) return false;
    if (/^[A-Z0-9_\-./]+$/.test(s) && s.length < 8) return false;
    if (/^[⊞›⚡📦❤️]+$/.test(s)) return false;
    return true;
  }

  function isManagedByI18n(text) {
    return !!(global.BuykonI18n && typeof BuykonI18n.isManagedText === "function" && BuykonI18n.isManagedText(text));
  }

  var textOrigMap = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  var attrOrigMap = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function getTextOrig(node) {
    if (textOrigMap && textOrigMap.has(node)) return textOrigMap.get(node);
    var v = norm(node.nodeValue);
    if (textOrigMap) textOrigMap.set(node, v);
    return v;
  }

  function getAttrOrig(el, name) {
    if (!attrOrigMap) return el.getAttribute(name);
    var bag = attrOrigMap.get(el);
    if (!bag) {
      bag = Object.create(null);
      attrOrigMap.set(el, bag);
    }
    if (!bag[name]) bag[name] = el.getAttribute(name);
    return bag[name];
  }

  function collectLiveTargets(scope) {
    var items = [];
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
          tag === "NOSCRIPT" ||
          tag === "SVG" ||
          tag === "PATH"
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest("[data-lang-switch], .lang-switch, [data-ai-skip], [data-ai-product-name]")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.getAttribute("data-i18n") || parent.getAttribute("data-i18n-html")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest(".product-card__title, .store-card__title, .cart-item__name, .rec-card__name, .search-popup__result-name, #pd-title")) {
          return NodeFilter.FILTER_REJECT;
        }
        var orig = getTextOrig(node);
        if (!looksTranslatable(orig)) return NodeFilter.FILTER_REJECT;
        if (isManagedByI18n(orig)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    while (walker.nextNode()) {
      items.push({ type: "text", node: walker.currentNode, orig: getTextOrig(walker.currentNode) });
    }

    var attrs = ["placeholder", "aria-label", "title"];
    if (scope.querySelectorAll) {
      scope.querySelectorAll("input, textarea, button, a, [aria-label], [placeholder], [title]").forEach(function (el) {
        if (el.closest("[data-lang-switch], .lang-switch, [data-ai-skip]")) return;
        if (el.getAttribute("data-i18n") || el.getAttribute("data-i18n-attr")) return;
        attrs.forEach(function (name) {
          if (!el.hasAttribute(name)) return;
          var orig = norm(getAttrOrig(el, name));
          if (!looksTranslatable(orig)) return;
          if (isManagedByI18n(orig)) return;
          items.push({ type: "attr", el: el, name: name, orig: orig });
        });
      });
    }

    return items;
  }

  function applyLiveItem(item, tr) {
    if (tr == null || tr === "") return;
    if (item.type === "text") {
      var node = item.node;
      if (!node || !node.parentElement) return;
      var raw = node.nodeValue || "";
      var lead = raw.match(/^\s*/)[0] || "";
      var trail = raw.match(/\s*$/)[0] || "";
      node.nodeValue = lead + tr + trail;
      return;
    }
    if (item.type === "attr" && item.el) {
      item.el.setAttribute(item.name, tr);
    }
  }

  var liveBusy = false;
  var liveQueued = false;

  function translateLiveDom(root) {
    var lang = currentLang();
    var scope = root || document.body;
    if (!scope) return Promise.resolve();

    var token = ++liveDomToken;
    liveBusy = true;
    var items = collectLiveTargets(scope);

    function finish() {
      liveBusy = false;
      if (liveQueued) {
        liveQueued = false;
        scheduleLiveDom(scope);
      }
    }

    updateAiTextNodes(scope);

    if (!items.length) {
      finish();
      return Promise.resolve();
    }

    var toTranslate = [];
    items.forEach(function (item) {
      if (needsTranslate(item.orig, lang)) {
        toTranslate.push(item);
      } else {
        applyLiveItem(item, item.orig);
      }
    });

    if (!toTranslate.length) {
      finish();
      return Promise.resolve();
    }

    var texts = toTranslate.map(function (it) {
      return it.orig;
    });

    return translateMany(texts, lang, "auto", function (partial) {
      if (token !== liveDomToken || currentLang() !== lang) return;
      toTranslate.forEach(function (item) {
        var tr = partial[item.orig] || partial[item.orig.toLowerCase()];
        if (tr) applyLiveItem(item, tr);
      });
    })
      .then(function (map) {
        if (token !== liveDomToken || currentLang() !== lang) return;
        toTranslate.forEach(function (item) {
          var tr = map[item.orig] || map[item.orig.toLowerCase()] || item.orig;
          applyLiveItem(item, tr);
        });
      })
      .then(finish, finish);
  }

  function scheduleLiveDom(root) {
    if (liveDomTimer) clearTimeout(liveDomTimer);
    liveDomTimer = setTimeout(function () {
      liveDomTimer = null;
      translateLiveDom(root || document.body);
    }, 80);
  }

  function onLangChanged() {
    updateProductNameNodes(document);
    updateAiTextNodes(document);
    scheduleLiveDom(document.body);
    document.dispatchEvent(
      new CustomEvent("BuykonAITranslateReady", { detail: { lang: currentLang() } })
    );
  }

  var mutationTimer = null;
  function bindObserver() {
    if (!global.MutationObserver || !document.body) return;
    var mo = new MutationObserver(function (mutations) {
      if (liveBusy) {
        liveQueued = true;
        return;
      }
      var relevant = false;
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
          relevant = true;
          break;
        }
      }
      if (!relevant) return;
      if (mutationTimer) clearTimeout(mutationTimer);
      mutationTimer = setTimeout(function () {
        mutationTimer = null;
        updateProductNameNodes(document);
        updateAiTextNodes(document);
        scheduleLiveDom(document.body);
      }, 220);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    document.addEventListener("BuykonLangChanged", function () {
      setTimeout(onLangChanged, 0);
    });
    document.addEventListener("BizdevarLayoutLoaded", function () {
      setTimeout(function () {
        updateProductNameNodes(document);
        updateAiTextNodes(document);
        scheduleLiveDom(document.body);
      }, 20);
    });
    setTimeout(function () {
      updateProductNameNodes(document);
      updateAiTextNodes(document);
      scheduleLiveDom(document.body);
      bindObserver();
    }, 80);
  }

  global.BuykonAITranslate = {
    translate: translate,
    translateMany: translateMany,
    displayName: displayName,
    warmProducts: warmProducts,
    updateProductNameNodes: updateProductNameNodes,
    updateAiTextNodes: updateAiTextNodes,
    translateLiveDom: translateLiveDom,
    scheduleLiveDom: scheduleLiveDom,
    onLangChanged: onLangChanged,
    needsTranslate: needsTranslate,
    CACHE_KEY: CACHE_KEY,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
