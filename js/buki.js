/**
 * Buki — AI alış-veriş köməkçisi
 * Büdcə + ehtiyaca görə kataloqdan məhsul tövsiyə edir.
 */
(function (global) {
  "use strict";

  var catalogCache = null;
  var catalogPromise = null;
  var open = false;
  var busy = false;

  var QUICK = [
    "Paltar almaq istəyirəm",
    "Büdcəm 2000 AZN, oyun üçün masaüstü kompüter",
    "Büdcəm 2000 AZN, gündəlik telefon tövsiyə et",
    "Ucuz qulaqlıq tövsiyə et",
  ];

  /**
   * mustMatch: true → yalnız bu kateqoriya/işarələr keçir (digərləri atılır)
   */
  var INTENT_RULES = [
    {
      id: "clothing",
      keys: [
        "paltar",
        "geyim",
        "koynək",
        "köynək",
        "koynək",
        "don",
        "şalvar",
        "salvar",
        "cin",
        "jeans",
        "hoodie",
        "sviter",
        "jaket",
        "jacket",
        "palto",
        "ətək",
        "etek",
        "köynək",
        "tshirt",
        "t-shirt",
        "shirt",
        "ayaqqabi",
        "ayaqqabı",
        "krossovka",
        "corab",
        "moda",
        "geymek",
        "geyinmek",
        "clothing",
        "apparel",
        "服装",
        "衣服",
        "裤子",
        "裙",
      ],
      cats: ["geyim", "clothing", "fashion", "apparel", "moda"],
      nameHints: [
        "geyim",
        "paltar",
        "hoodie",
        "shirt",
        "t-shirt",
        "jeans",
        "köynək",
        "koynək",
        "jacket",
        "dress",
        "pants",
        "clothing",
        "恤",
        "裤",
        "裤",
        "鞋",
        "帽",
      ],
      excludeHints: ["iphone", "samsung galaxy", "laptop", "noutbuk", "rtx", "ssd", "ram ", "televizor", "airpods"],
      mustMatch: true,
      label: "geyim / paltar",
    },
    {
      id: "phone",
      keys: ["telefon", "smartphone", "iphone", "smartfon", "mobil"],
      cats: ["elektronika", "telefon", "phone"],
      nameHints: ["telefon", "phone", "iphone", "galaxy", "redmi", "xiaomi", "pixel", "smartphone"],
      excludeHints: ["qulaqlıq", "case only", "kabəl"],
      mustMatch: true,
      label: "telefon",
    },
    {
      id: "laptop",
      keys: ["noutbuk", "notebook", "laptop", "macbook"],
      cats: ["elektronika", "notbuklar", "laptop"],
      nameHints: ["laptop", "noutbuk", "notebook", "macbook", "ultrabook"],
      mustMatch: true,
      label: "noutbuk",
    },
    {
      id: "desktop",
      keys: [
        "masaüstü",
        "masaustu",
        "desktop",
        "oyun komput",
        "oyun pc",
        "sistem bloku",
        "pc topla",
        "pc yig",
        "pc yığ",
        "komputer topla",
        "kompüter topla",
        "sistem yig",
        "sistem yığ",
        "gaming pc",
        "oyun kompüter",
      ],
      cats: ["elektronika", "komputer", "pc"],
      nameHints: [
        "desktop",
        "gaming pc",
        "masaüstü",
        "sistem bloku",
        "pc build",
        "tower",
        "rtx",
        "işlemçi",
        "processor",
        "motherboard",
      ],
      excludeHints: [
        "iphone",
        "smartphone",
        "telefon",
        "geyim",
        "hoodie",
        "t-shirt",
        "paltar",
        "airpods",
        "qulaqlıq",
      ],
      mustMatch: true,
      label: "masaüstü kompüter",
    },
    {
      id: "computer",
      keys: ["komputer", "kompüter", " pc", "pc ", "pc", "toplanmis", "toplanmış"],
      cats: ["elektronika", "komputer", "pc"],
      nameHints: [
        "komputer",
        "kompüter",
        " pc",
        "desktop",
        "gaming",
        "sistem bloku",
        "rtx",
        "ssd",
      ],
      excludeHints: [
        "iphone",
        "smartphone",
        "telefon qutusu",
        "geyim",
        "hoodie",
        "t-shirt",
        "paltar",
        "ayaqqabı",
      ],
      mustMatch: true,
      label: "kompüter",
    },
    {
      id: "tv",
      keys: ["televizor", " tv", "smart tv"],
      cats: ["elektronika"],
      nameHints: ["televizor", "tv", "oled", "smart tv"],
      mustMatch: true,
      label: "televizor",
    },
    {
      id: "headphones",
      keys: ["qulaqlıq", "qulaqliq", "airpods", "headphone", "earbud"],
      cats: ["aksesuar", "elektronika", "aksesuarlar"],
      nameHints: ["qulaqlıq", "airpods", "headphone", "earbud", "buds"],
      mustMatch: true,
      label: "qulaqlıq",
    },
    {
      id: "cosmetics",
      keys: ["kosmetika", "krem", "makiyaj", "parfum"],
      cats: ["kosmetika"],
      nameHints: ["krem", "kosmetika", "parfum", "serum"],
      mustMatch: true,
      label: "kosmetika",
    },
  ];

  function rootPath() {
    if (global.BizdevarLayout && BizdevarLayout.getRoot) return BizdevarLayout.getRoot();
    return document.body.getAttribute("data-root") || "";
  }

  function ensureCss() {
    if (document.querySelector('link[data-buki-css]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = rootPath() + "css/buki.css?v=3";
    link.setAttribute("data-buki-css", "1");
    document.head.appendChild(link);
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function escAttr(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;");
  }

  function mediaUrl(src) {
    var cfg = global.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveMediaUrl === "function") return cfg.resolveMediaUrl(src || "");
    return src || "";
  }

  function productHref(p) {
    var cfg = global.BizdevarSiteConfig;
    if (cfg && typeof cfg.productPageUrl === "function") return cfg.productPageUrl(p, rootPath());
    return rootPath() + "pages/product/?id=" + encodeURIComponent(String(p.id || ""));
  }

  function formatPrice(n) {
    return (
      Number(n || 0).toLocaleString("az-AZ", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }) + " ₼"
    );
  }

  function fold(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ə/g, "e")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/[^a-z0-9\u4e00-\u9fff\s.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function productBlob(p) {
    var specs = p.specs && typeof p.specs === "object" ? JSON.stringify(p.specs) : "";
    return fold(
      [p.name, p.cat, p.category, p.category_name, p.description, p.vendor_name, specs]
        .filter(Boolean)
        .join(" ")
    );
  }

  function loadCatalog() {
    if (catalogCache) return Promise.resolve(catalogCache);
    if (catalogPromise) return catalogPromise;
    var API = global.BizdevarAPI;
    if (!API || !API.products) {
      catalogCache = [];
      return Promise.resolve(catalogCache);
    }
    catalogPromise = API.products("all")
      .then(function (d) {
        catalogCache = (d && d.products) || [];
        return catalogCache;
      })
      .catch(function () {
        catalogCache = [];
        return catalogCache;
      });
    return catalogPromise;
  }

  function parseBudget(text) {
    var t = fold(text);
    var near = t.match(
      /(?:budce|budcem|budget|maksimum|max|qe|qeder|kadar|azn|manat|₼)\D{0,12}(\d{2,6}(?:[.,]\d{1,2})?)/i
    );
    if (near) return Math.round(parseFloat(String(near[1]).replace(",", ".")));
    var all = [];
    var re = /(\d{2,6}(?:[.,]\d{1,2})?)\s*(?:azn|manat|₼)?/gi;
    var m;
    while ((m = re.exec(text)) !== null) {
      var n = Math.round(parseFloat(String(m[1]).replace(",", ".")));
      if (n >= 20 && n <= 200000) all.push(n);
    }
    if (!all.length) return null;
    return all.sort(function (a, b) {
      return b - a;
    })[0];
  }

  function parseSpecs(text) {
    var t = fold(text);
    var specs = {};
    var ram = t.match(/(\d+)\s*gb\s*ram|ram\s*(\d+)\s*gb|(\d+)\s*gb\s*yaddas/);
    if (ram) specs.ram = parseInt(ram[1] || ram[2] || ram[3], 10);
    var ssd = t.match(/(\d+(?:\.\d+)?)\s*(tb|gb)\s*ssd|ssd\s*(\d+(?:\.\d+)?)\s*(tb|gb)/);
    if (ssd) {
      var val = parseFloat(ssd[1] || ssd[3]);
      var unit = (ssd[2] || ssd[4] || "gb").toLowerCase();
      specs.ssdGb = unit === "tb" ? val * 1024 : val;
    }
    var gpu = t.match(
      /(rtx\s*)?(\d{3,4})\s*(ti|super)?|(gtx\s*\d{3,4})|(rx\s*\d{3,4})|5060|4060|4070|4080|4090|3060|3070/
    );
    if (gpu) specs.gpu = fold(gpu[0]);
    if (/oyun|gaming|game/.test(t)) specs.gaming = true;
    if (/gundelik|gunluk|daily|adi istifade|ise|ofis/.test(t)) specs.daily = true;
    return specs;
  }

  function hasIntentKey(hay, key) {
    var k = fold(key);
    if (!k) return false;
    if (/[\u4e00-\u9fff]/.test(k)) return hay.indexOf(k) !== -1;
    // "paltar" ≠ "paltaryuyan"
    if (k === "paltar" && /paltaryuyan/.test(hay)) return false;
    var re = new RegExp("(^|[^a-z0-9])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)");
    return re.test(hay);
  }

  function detectIntentRule(text) {
    var t = fold(text);
    // «pc topla / mene pc» — birbaşa masaüstü / kompüter
    if (
      /\bpc\b/.test(t) ||
      /komp[uü]ter/.test(t) ||
      /sistem\s*y[iı][gğ]/.test(t) ||
      /desktop/.test(t) ||
      /masa\s*ustu/.test(t)
    ) {
      if (/noutbuk|notebook|laptop|macbook/.test(t)) {
        return INTENT_RULES.filter(function (r) {
          return r.id === "laptop";
        })[0];
      }
      if (/oyun|gaming|topla|yig|yığ|sistem|masa/.test(t) || /\bpc\b/.test(t)) {
        return (
          INTENT_RULES.filter(function (r) {
            return r.id === "desktop";
          })[0] ||
          INTENT_RULES.filter(function (r) {
            return r.id === "computer";
          })[0]
        );
      }
    }

    var best = null;
    var bestScore = -1;
    INTENT_RULES.forEach(function (rule) {
      rule.keys.forEach(function (key) {
        if (!hasIntentKey(t, key)) return;
        var k = fold(key);
        var pos = t.indexOf(k);
        // Uzun / spesifik açar sözlər üstün
        var score = k.length * 10 - (pos >= 0 ? pos : 50);
        if (score > bestScore) {
          bestScore = score;
          best = rule;
        }
      });
    });
    return best;
  }

  function productMatchesRule(p, rule) {
    if (!rule) return true;
    var blob = productBlob(p);
    var cslug = fold(p.cat || p.category || "");
    var cname = fold(p.category_name || "");

    if (rule.excludeHints) {
      for (var e = 0; e < rule.excludeHints.length; e++) {
        if (blob.indexOf(fold(rule.excludeHints[e])) !== -1) return false;
      }
    }

    var catOk = false;
    (rule.cats || []).forEach(function (c) {
      var cf = fold(c);
      if (cslug.indexOf(cf) !== -1 || cname.indexOf(cf) !== -1 || cf.indexOf(cslug) !== -1) {
        catOk = true;
      }
    });

    var nameOk = false;
    (rule.nameHints || []).forEach(function (h) {
      if (blob.indexOf(fold(h)) !== -1) nameOk = true;
    });

    if (rule.mustMatch) return catOk || nameOk;
    return true;
  }

  function parseIntent(message) {
    var rule = detectIntentRule(message);
    return {
      raw: message,
      budget: parseBudget(message),
      specs: parseSpecs(message),
      rule: rule,
      limit: rule && rule.id === "phone" ? 3 : 5,
    };
  }

  function scoreProduct(p, intent) {
    var price = Number(p.price) || 0;
    if (price <= 0) return -1;

    if (intent.rule && intent.rule.mustMatch && !productMatchesRule(p, intent.rule)) {
      return -1;
    }

    var blob = productBlob(p);
    var score = 0;
    var why = [];

    if (intent.budget != null) {
      if (price > intent.budget * 1.08) return -1;
      var fill = price / intent.budget;
      if (fill >= 0.35 && fill <= 1) score += 40 + fill * 20;
      else if (fill >= 0.15) score += 22;
      else score += 8;
      why.push("büdcəyə uyğun");
    } else {
      score += 8;
    }

    if (intent.rule) {
      score += 50;
      why.push(intent.rule.label || "kateqoriya");
      (intent.rule.nameHints || []).forEach(function (h) {
        if (blob.indexOf(fold(h)) !== -1) score += 6;
      });
    }

    var sp = intent.specs || {};
    if (sp.ram) {
      if (blob.indexOf(String(sp.ram) + "gb") !== -1 || blob.indexOf("ram " + sp.ram) !== -1) {
        score += 25;
        why.push(sp.ram + "GB RAM");
      } else if (intent.rule && (intent.rule.id === "desktop" || intent.rule.id === "laptop")) {
        score -= 8;
      }
    }
    if (sp.ssdGb) {
      var tb = sp.ssdGb >= 1000 ? Math.round(sp.ssdGb / 1024) + "tb" : null;
      if (
        (tb && blob.indexOf(tb) !== -1) ||
        blob.indexOf(String(sp.ssdGb) + "gb") !== -1 ||
        blob.indexOf("ssd") !== -1
      ) {
        score += 18;
        why.push("yaddaş");
      }
    }
    if (sp.gpu) {
      if (blob.indexOf(sp.gpu) !== -1 || /rtx|gtx|rx|5060|4060|4070/.test(blob)) {
        score += 28;
        why.push("video kart");
      }
    }
    if (sp.gaming && /gaming|oyun|rtx|gtx|rgb/.test(blob)) {
      score += 20;
      why.push("oyun üçün");
    }
    if (sp.daily && intent.rule && intent.rule.id === "phone") {
      score += 10;
      why.push("gündəlik");
    }

    var stop = /^(ucun|olan|menim|budcem|azn|ve|ile|bir|bu|ne|hansi|isteyirem|almaq|tovsiye|ele|mene|buki)$/;
    fold(intent.raw)
      .split(" ")
      .filter(function (w) {
        return w.length > 2 && !stop.test(w);
      })
      .forEach(function (tok) {
        if (blob.indexOf(tok) !== -1) score += 4;
      });

    if (Number(p.popular) > 0) score += Math.min(8, Number(p.popular) / 12);
    if (Number(p.discount_percent) > 0) score += 3;

    return { score: score, why: why.slice(0, 3) };
  }

  function recommendLocal(message, products) {
    var intent = parseIntent(message);
    var pool = products || [];

    if (intent.rule && intent.rule.mustMatch) {
      var filtered = pool.filter(function (p) {
        return productMatchesRule(p, intent.rule);
      });
      if (filtered.length) pool = filtered;
    }

    var ranked = pool
      .map(function (p) {
        var r = scoreProduct(p, intent);
        if (!r || r.score < 0) return null;
        return { product: p, score: r.score, why: r.why };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return b.score - a.score;
      });

    var limit = intent.limit || 5;
    var picks = ranked.slice(0, limit);

    var reply;
    if (!picks.length) {
      if (intent.rule) {
        reply =
          "«" +
          (intent.rule.label || "bu kateqoriya") +
          "» üzrə uyğun məhsul tapa bilmədim. Başqa büdcə və ya model yazın.";
      } else {
        reply =
          "Sorğunuzu dəqiqləşdirin — məsələn: paltar, telefon, noutbuk və büdcəniz.";
      }
    } else if (intent.rule && intent.budget != null) {
      reply =
        (intent.rule.label || "Kateqoriya") +
        " üçün büdcəniz " +
        formatPrice(intent.budget) +
        " daxilində " +
        picks.length +
        " seçim:";
    } else if (intent.rule) {
      reply = (intent.rule.label || "Kateqoriya") + " üzrə " + picks.length + " uyğun məhsul:";
    } else if (intent.budget != null) {
      reply = "Büdcəniz daxilində " + picks.length + " məhsul:";
    } else {
      reply = "Sizə " + picks.length + " məhsul seçdim:";
    }

    return { reply: reply, products: picks, intent: intent, source: "local" };
  }

  function slimCatalog(products) {
    return (products || []).slice(0, 140).map(function (p) {
      var specs = "";
      if (p.specs && typeof p.specs === "object") {
        try {
          specs = JSON.stringify(p.specs).slice(0, 180);
        } catch (e) {
          specs = "";
        }
      }
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        cat: p.cat || p.category || "",
        category: p.category_name || p.cat || "",
        specs: specs,
      };
    });
  }

  function picksFromIds(ids, products, reasons) {
    var byId = Object.create(null);
    (products || []).forEach(function (p) {
      byId[String(p.id)] = p;
    });
    reasons = reasons || {};
    return (ids || [])
      .map(function (id) {
        var p = byId[String(id)];
        if (!p) return null;
        var why = reasons[String(id)] || reasons[id];
        return {
          product: p,
          score: 100,
          why: why ? [String(why)] : [],
        };
      })
      .filter(Boolean);
  }

  function fetchBukiJson(url, message, products) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = ctrl
      ? setTimeout(function () {
          try {
            ctrl.abort();
          } catch (e) {
            /* ignore */
          }
        }, 48000)
      : null;

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        products: slimCatalog(products),
        lang: "az",
      }),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || (data && data.ok === false)) {
            throw new Error((data && data.error) || "Buki AI xətası");
          }
          return data;
        });
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  function applyAiResult(data, message, products) {
    var ids = data.product_ids || data.ids || [];
    var picks = picksFromIds(ids, products, data.reasons || {});

    var intent = parseIntent(message);
    if (data.category) {
      var mapped = detectIntentRule(String(data.category) + " " + message);
      if (mapped) intent.rule = mapped;
    }
    if (intent.rule && intent.rule.mustMatch && picks.length) {
      picks = picks.filter(function (item) {
        return productMatchesRule(item.product, intent.rule);
      });
    }

    if (!picks.length) {
      return recommendLocal(message, products);
    }

    return {
      reply: data.reply || data.message || "Sizə uyğun məhsullar:",
      products: picks.slice(0, intent.limit || 5),
      intent: intent,
      source: "ai",
    };
  }

  function recommendViaAi(message, products) {
    var cfg = global.BizdevarSiteConfig;
    var javaUrl = cfg && typeof cfg.resolveBukiUrl === "function" ? cfg.resolveBukiUrl() : "";
    var phpUrl = rootPath() + "api/buki.php";

    // Gemini (.env) əsas yol — Java yalnız ehtiyat
    return fetchBukiJson(phpUrl, message, products)
      .catch(function (err) {
        if (!javaUrl) throw err || new Error("no ai");
        return fetchBukiJson(javaUrl, message, products);
      })
      .then(function (data) {
        return applyAiResult(data, message, products);
      });
  }

  function recommend(message) {
    return loadCatalog().then(function (products) {
      return recommendViaAi(message, products).catch(function (err) {
        var msg = (err && err.message) || "";
        if (msg === "NO_GEMINI_KEY") {
          return {
            reply:
              "Buki üçün GEMINI_API_KEY lazımdır. Layihə kökündə .env faylına GEMINI_API_KEY əlavə edin.",
            products: [],
            intent: parseIntent(message),
            source: "error",
          };
        }
        // AI işləməsə — lokal, amma yalnız aşkar kateqoriya varsa
        var local = recommendLocal(message, products);
        if (local.intent && local.intent.rule) return local;
        return {
          reply:
            "Süni intellektə çatılmadı. Daha dəqiq yazın — məsələn: «büdcəm 2000 AZN, oyun PC topla».",
          products: [],
          intent: local.intent,
          source: "error",
        };
      });
    });
  }

  function productCardHtml(item) {
    var p = item.product;
    var name =
      global.BuykonAITranslate && BuykonAITranslate.displayName
        ? BuykonAITranslate.displayName(p)
        : p.name;
    var img = mediaUrl(p.image_url || p.image || "");
    var why = (item.why || []).join(" · ");
    return (
      '<a class="buki-card" href="' +
      escAttr(productHref(p)) +
      '">' +
      '<div class="buki-card__media">' +
      (img
        ? '<img src="' + escAttr(img) + '" alt="" loading="lazy" />'
        : '<span class="buki-card__ph">' + esc(String(name || "?").charAt(0)) + "</span>") +
      "</div>" +
      '<div class="buki-card__body">' +
      '<div class="buki-card__cat">' +
      esc(p.category_name || p.cat || "Məhsul") +
      "</div>" +
      '<div class="buki-card__name" data-ai-product-name="' +
      escAttr(p.name || "") +
      '" data-ai-product-id="' +
      escAttr(String(p.id || "")) +
      '">' +
      esc(name) +
      "</div>" +
      '<div class="buki-card__price">' +
      esc(formatPrice(p.price)) +
      "</div>" +
      (why ? '<div class="buki-card__why">' + esc(why) + "</div>" : "") +
      "</div></a>"
    );
  }

  function ensureUi() {
    if (document.getElementById("buki-root")) return;
    var root = document.createElement("div");
    root.id = "buki-root";
    root.className = "buki-root";
    root.hidden = true;
    root.innerHTML =
      '<div class="buki-root__backdrop" data-buki-close></div>' +
      '<section class="buki-panel" role="dialog" aria-modal="true" aria-label="Buki AI köməkçi">' +
      '<header class="buki-panel__head">' +
      '<div class="buki-panel__avatar" aria-hidden="true">' +
      '<svg class="buki-avatar__face" viewBox="0 0 64 64" fill="none">' +
      '<defs><linearGradient id="bukiFaceGradP" x1="12" y1="8" x2="52" y2="58" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#ffffff"/><stop offset="1" stop-color="#e8eeff"/></linearGradient>' +
      '<linearGradient id="bukiEyeGradP" x1="0" y1="0" x2="1" y2="1">' +
      '<stop stop-color="#5ad0ff"/><stop offset="1" stop-color="#3b7cff"/></linearGradient></defs>' +
      '<rect x="10" y="12" width="44" height="40" rx="16" fill="url(#bukiFaceGradP)"/>' +
      '<rect x="18" y="26" width="10" height="14" rx="5" fill="url(#bukiEyeGradP)"/>' +
      '<rect x="36" y="26" width="10" height="14" rx="5" fill="url(#bukiEyeGradP)"/>' +
      '<path d="M24 44c2.8 3.2 6.2 4.8 8 4.8s5.2-1.6 8-4.8" stroke="#4ea8ff" stroke-width="2.6" stroke-linecap="round"/>' +
      "</svg></div>" +
      '<div class="buki-panel__meta">' +
      '<p class="buki-panel__name">Buki</p>' +
      '<p class="buki-panel__sub">Süni intellekt köməkçiniz</p>' +
      "</div>" +
      '<button type="button" class="buki-panel__close" data-buki-close aria-label="Bağla">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      "</button></header>" +
      '<div class="buki-panel__body" id="buki-messages"></div>' +
      '<div class="buki-chips" id="buki-chips"></div>' +
      '<div class="buki-panel__foot">' +
      '<form class="buki-form" id="buki-form">' +
      '<textarea id="buki-input" rows="1" placeholder="Məs: Büdcəm 2000 AZN, oyun PC tövsiyə et..." autocomplete="off"></textarea>' +
      '<button type="submit" class="buki-form__send" aria-label="Göndər">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9l20-7z"/></svg>' +
      "</button></form>" +
      '<p class="buki-panel__hint">Buki yalnız Buykon kataloqundakı məhsullardan tövsiyə edir.</p>' +
      "</div></section>";
    document.body.appendChild(root);

    var chips = document.getElementById("buki-chips");
    chips.innerHTML = QUICK.map(function (q) {
      return '<button type="button" class="buki-chip" data-buki-chip="' + escAttr(q) + '">' + esc(q) + "</button>";
    }).join("");

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-buki-close]")) closePanel();
      var chip = e.target.closest("[data-buki-chip]");
      if (chip) {
        var q = chip.getAttribute("data-buki-chip");
        var input = document.getElementById("buki-input");
        if (input) input.value = q;
        sendMessage(q);
      }
    });

    document.getElementById("buki-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("buki-input");
      var text = (input && input.value) || "";
      sendMessage(text);
    });

    var ta = document.getElementById("buki-input");
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage(ta.value);
      }
    });
  }

  function appendMsg(role, html) {
    var box = document.getElementById("buki-messages");
    if (!box) return null;
    var el = document.createElement("div");
    el.className = "buki-msg buki-msg--" + role;
    el.innerHTML = html;
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  function showWelcome() {
    var box = document.getElementById("buki-messages");
    if (!box || box.childElementCount) return;
    appendMsg(
      "bot",
      '<div class="buki-msg__bubble">Salam! Mən <strong>Buki</strong>yəm — Buykon AI alış-veriş köməkçisi.\n\nBüdcənizi və ehtiyacınızı yazın, mən kataloqdan uyğun məhsulları seçim.</div>'
    );
  }

  function sendMessage(text) {
    var msg = String(text || "").trim();
    if (!msg || busy) return;
    var input = document.getElementById("buki-input");
    if (input) input.value = "";

    appendMsg("user", '<div class="buki-msg__bubble">' + esc(msg) + "</div>");
    var typing = appendMsg(
      "bot",
      '<div class="buki-msg__bubble buki-msg__typing" aria-label="Yazır"><i></i><i></i><i></i></div>'
    );
    busy = true;

    recommend(msg)
      .then(function (res) {
        if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
        var cards =
          res.products && res.products.length
            ? '<div class="buki-products">' +
              res.products.map(productCardHtml).join("") +
              "</div>"
            : "";
        appendMsg(
          "bot",
          '<div class="buki-msg__bubble">' + esc(res.reply) + "</div>" + cards
        );
        if (global.BuykonAITranslate && BuykonAITranslate.updateProductNameNodes) {
          BuykonAITranslate.updateProductNameNodes(document.getElementById("buki-messages"));
        }
      })
      .catch(function () {
        if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
        appendMsg(
          "bot",
          '<div class="buki-msg__bubble">İndi cavab verə bilmədim. Bir az sonra yenidən cəhd edin.</div>'
        );
      })
      .finally(function () {
        busy = false;
      });
  }

  function openPanel() {
    ensureCss();
    ensureUi();
    var root = document.getElementById("buki-root");
    if (!root) return;
    root.hidden = false;
    open = true;
    document.body.style.overflow = "hidden";
    showWelcome();
    loadCatalog();
    setTimeout(function () {
      var input = document.getElementById("buki-input");
      if (input) input.focus();
    }, 80);
  }

  function closePanel() {
    var root = document.getElementById("buki-root");
    if (root) root.hidden = true;
    open = false;
    document.body.style.overflow = "";
  }

  function bindTriggers() {
    document.querySelectorAll("[data-buki-open]").forEach(function (btn) {
      if (btn.dataset.bukiBound) return;
      btn.dataset.bukiBound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (open) closePanel();
        else openPanel();
      });
    });
  }

  function init() {
    ensureCss();
    bindTriggers();
    document.addEventListener("BizdevarLayoutLoaded", bindTriggers);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && open) closePanel();
    });
  }

  global.BuykonBuki = {
    open: openPanel,
    close: closePanel,
    recommend: recommend,
    bindTriggers: bindTriggers,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
