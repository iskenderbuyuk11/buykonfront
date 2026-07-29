/**
 * Buykon AI Translate — sürətli batch tərcümə (məhsul adları + səhifə)
 * Cache: localStorage (debounce)
 */
(function (global) {
  "use strict";

  var CACHE_KEY = "buykon_ai_tr_v2";
  var MAX_CACHE = 3000;
  var BATCH_SIZE = 25;
  var CONCURRENCY = 6;
  var SEP = "\n⟦⟧\n";
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
    return LANG_MAP[String(code || "az").toLowerCase()] || "en";
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

    return fetchApiBatch(texts, to, from)
      .catch(function () {
        var joined = texts.join(SEP);
        return fetchGtxJoined(joined, to, from).then(function (out) {
          var raw = String(out || "");
          var parts = raw.split(SEP);
          if (parts.length !== texts.length) {
            // Fallback: parallel single (small batches only)
            return Promise.all(
              texts.map(function (t) {
                return fetchGtxJoined(t, to, from).then(function (x) {
                  return norm(x) || t;
                });
              })
            );
          }
          return parts.map(function (p, i) {
            return norm(p) || texts[i];
          });
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

  function rememberProductName(product, translated, lang) {
    if (!product) return;
    var original = norm(product.name || product.title || "");
    if (!original) return;
    var id = product.id != null ? String(product.id) : "";
    productNameCache[lang + ":" + (id || original.toLowerCase())] = translated;
    product._name_az = product._name_az || original;
    product._name_i18n = translated;
  }

  function warmProducts(products, toLang, onChunk) {
    var lang = toLang || currentLang();
    if (lang === "az") return Promise.resolve(products || []);
    var list = products || [];
    var names = list
      .map(function (p) {
        return norm(p && (p.name || p.title));
      })
      .filter(Boolean);

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

    return translateMany(names, lang, "az", applyMap).then(function (map) {
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
      if (lang === "az") {
        if (el.textContent !== original) el.textContent = original;
        return;
      }
      var id = el.getAttribute("data-ai-product-id") || "";
      var key = lang + ":" + (id || original.toLowerCase());
      var hit = productNameCache[key] || getCached(original, mapLang(lang), "az");
      if (hit) {
        productNameCache[key] = hit;
        if (el.textContent !== hit) el.textContent = hit;
        return;
      }
      missing.push({ el: el, original: original, key: key });
    });

    if (!missing.length || lang === "az") return;

    var texts = missing.map(function (m) {
      return m.original;
    });
    translateMany(texts, lang, "az", function (partial) {
      if (currentLang() !== lang) return;
      missing.forEach(function (m) {
        var tr = partial[m.original] || partial[m.original.toLowerCase()];
        if (!tr) return;
        productNameCache[m.key] = tr;
        if (m.el.textContent !== tr) m.el.textContent = tr;
      });
    });
  }

  function looksTranslatable(text) {
    var s = norm(text);
    if (s.length < 3 || s.length > 160) return false;
    if (/^https?:\/\//i.test(s)) return false;
    if (/^[\d\s.,:%₼$€+\-]+$/.test(s)) return false;
    if (/^[A-Z0-9_\-./]+$/.test(s) && s.length < 12) return false;
    return true;
  }

  function translateLiveDom(root) {
    var lang = currentLang();
    if (lang === "az") return Promise.resolve();
    var scope = root || document.body;
    if (!scope) return Promise.resolve();

    var token = ++liveDomToken;
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
        if (parent.closest("[data-lang-switch], .lang-switch, [data-ai-skip], [data-ai-product-name]")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.getAttribute("data-i18n")) return NodeFilter.FILTER_REJECT;
        if (parent.closest(".product-card__title, .store-card__title, .cart-item__name, .rec-card__name, .search-popup__result-name")) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!looksTranslatable(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    var limit = 80;
    while (walker.nextNode() && nodes.length < limit) {
      var n = walker.currentNode;
      nodes.push(n);
      texts.push(norm(n.nodeValue));
    }

    if (!texts.length) return Promise.resolve();

    return translateMany(texts, lang, "az", function (partial) {
      if (token !== liveDomToken || currentLang() !== lang) return;
      nodes.forEach(function (node) {
        if (!node || !node.parentElement) return;
        var raw = node.nodeValue;
        var trimmed = norm(raw);
        var tr = partial[trimmed] || partial[trimmed.toLowerCase()];
        if (!tr || tr === trimmed) return;
        var lead = raw.match(/^\s*/)[0] || "";
        var trail = raw.match(/\s*$/)[0] || "";
        node.nodeValue = lead + tr + trail;
      });
    });
  }

  function scheduleLiveDom(root) {
    if (liveDomTimer) clearTimeout(liveDomTimer);
    liveDomTimer = setTimeout(function () {
      liveDomTimer = null;
      translateLiveDom(root || document.body);
    }, 120);
  }

  function onLangChanged() {
    // Cache saxlanılır — eyni dilə qayıdanda ani olur
    updateProductNameNodes(document);
    scheduleLiveDom(document.body);
    document.dispatchEvent(
      new CustomEvent("BuykonAITranslateReady", { detail: { lang: currentLang() } })
    );
  }

  function init() {
    document.addEventListener("BuykonLangChanged", function () {
      // Məhsul adları əvvəl — DOM tərcüməsi sonra
      setTimeout(onLangChanged, 0);
    });
    document.addEventListener("BizdevarLayoutLoaded", function () {
      setTimeout(function () {
        updateProductNameNodes(document);
        if (currentLang() !== "az") scheduleLiveDom(document.body);
      }, 20);
    });
    if (currentLang() !== "az") {
      setTimeout(function () {
        updateProductNameNodes(document);
        scheduleLiveDom(document.body);
      }, 60);
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
