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
    "Büdcəm 2000 AZN, oyun üçün masaüstü kompüter tövsiyə et",
    "Büdcəm 2000 AZN, gündəlik istifadə üçün telefon",
    "16GB RAM və yaxşı video kartlı noutbuk",
    "Ucuz qulaqlıq tövsiyə et",
  ];

  var CAT_HINTS = [
    { keys: ["telefon", "smartphone", "iphone", "samsung", "xiaomi", "smartfon"], cats: ["elektronika", "telefon"], boost: ["telefon", "phone", "iphone", "galaxy", "redmi"] },
    { keys: ["komputer", "kompüter", "masaüstü", "masaustu", "desktop", "pc", "oyun komput"], cats: ["elektronika"], boost: ["desktop", "pc", "gaming", "masaüstü", "komputer", "ryzen", "intel"] },
    { keys: ["noutbuk", "notebook", "laptop", "macbook"], cats: ["elektronika", "notbuklar"], boost: ["laptop", "noutbuk", "notebook", "macbook"] },
    { keys: ["televizor", "tv"], cats: ["elektronika"], boost: ["tv", "televizor", "oled", "smart tv"] },
    { keys: ["qulaqlıq", "qulaqliq", "airpods", "headphone"], cats: ["aksesuar", "elektronika"], boost: ["qulaqlıq", "airpods", "headphone", "earbud"] },
    { keys: ["geyim", "t-shirt", "köynək", "koynək", "hoodie"], cats: ["geyim"], boost: ["geyim", "hoodie", "köynək", "shirt"] },
    { keys: ["kosmetika", "krem"], cats: ["kosmetika"], boost: ["krem", "kosmetika"] },
  ];

  function rootPath() {
    if (global.BizdevarLayout && BizdevarLayout.getRoot) return BizdevarLayout.getRoot();
    return document.body.getAttribute("data-root") || "";
  }

  function ensureCss() {
    if (document.querySelector('link[data-buki-css]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = rootPath() + "css/buki.css?v=1";
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
      .replace(/[^a-z0-9\s.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function productBlob(p) {
    var specs = p.specs && typeof p.specs === "object" ? JSON.stringify(p.specs) : "";
    return fold(
      [p.name, p.cat, p.category_name, p.description, p.vendor_name, specs].filter(Boolean).join(" ")
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
    var gpu = t.match(/(rtx\s*)?(\d{3,4})\s*(ti|super)?|(gtx\s*\d{3,4})|(rx\s*\d{3,4})|5060|4060|4070|4080|4090|3060|3070/);
    if (gpu) specs.gpu = fold(gpu[0]);
    if (/oyun|gaming|game/.test(t)) specs.gaming = true;
    if (/gundelik|gunluk|daily|adi istifade|ise|ofis/.test(t)) specs.daily = true;
    return specs;
  }

  function detectCategory(text) {
    var t = fold(text);
    for (var i = 0; i < CAT_HINTS.length; i++) {
      var h = CAT_HINTS[i];
      for (var k = 0; k < h.keys.length; k++) {
        if (t.indexOf(fold(h.keys[k])) !== -1) return h;
      }
    }
    return null;
  }

  function parseIntent(message) {
    return {
      raw: message,
      budget: parseBudget(message),
      specs: parseSpecs(message),
      cat: detectCategory(message),
      limit: /telefon|phone/.test(fold(message)) ? 3 : 5,
    };
  }

  function scoreProduct(p, intent) {
    var price = Number(p.price) || 0;
    if (price <= 0) return -1;
    var blob = productBlob(p);
    var score = 0;
    var why = [];

    if (intent.budget != null) {
      if (price > intent.budget * 1.05) return -1;
      var fill = price / intent.budget;
      if (fill >= 0.45 && fill <= 1) score += 40 + fill * 20;
      else if (fill >= 0.25) score += 25;
      else score += 10;
      why.push("büdcəyə uyğun (" + formatPrice(price) + ")");
    } else {
      score += 10;
    }

    if (intent.cat) {
      var catHit = false;
      var cslug = fold(p.cat || p.category || "");
      intent.cat.cats.forEach(function (c) {
        if (cslug.indexOf(fold(c)) !== -1) catHit = true;
      });
      intent.cat.boost.forEach(function (b) {
        if (blob.indexOf(fold(b)) !== -1) {
          catHit = true;
          score += 8;
        }
      });
      if (catHit) {
        score += 35;
        why.push("kateqoriya uyğundur");
      } else {
        score -= 15;
      }
    }

    var sp = intent.specs || {};
    if (sp.ram) {
      if (blob.indexOf(String(sp.ram) + "gb") !== -1 || blob.indexOf("ram " + sp.ram) !== -1) {
        score += 25;
        why.push(sp.ram + "GB RAM");
      }
    }
    if (sp.ssdGb) {
      var tb = sp.ssdGb >= 1000 ? Math.round(sp.ssdGb / 1024) + "tb" : null;
      if ((tb && blob.indexOf(tb) !== -1) || blob.indexOf(String(sp.ssdGb) + "gb") !== -1 || blob.indexOf("ssd") !== -1) {
        score += 18;
        why.push("yaddaş uyğun");
      }
    }
    if (sp.gpu) {
      if (blob.indexOf(sp.gpu) !== -1 || /rtx|gtx|rx|5060|4060|4070/.test(blob)) {
        score += 28;
        why.push("video kart");
      } else if (sp.gaming) {
        score -= 5;
      }
    }
    if (sp.gaming) {
      if (/gaming|oyun|rtx|gtx|rgb/.test(blob)) {
        score += 20;
        why.push("oyun üçün uyğun");
      }
    }
    if (sp.daily) {
      if (/telefon|phone|galaxy|iphone|redmi|pixel/.test(blob)) {
        score += 12;
        why.push("gündəlik istifadə");
      }
    }

    var tokens = fold(intent.raw)
      .split(" ")
      .filter(function (w) {
        return w.length > 2 && !/^(ucun|olan|menim|budcem|azn|ve|ile|bir|bu|ne|hansi)$/.test(w);
      });
    tokens.forEach(function (tok) {
      if (blob.indexOf(tok) !== -1) score += 3;
    });

    if (Number(p.popular) > 0) score += Math.min(10, Number(p.popular) / 10);
    if (Number(p.discount_percent) > 0) score += 4;

    return { score: score, why: why.slice(0, 3) };
  }

  function recommendLocal(message, products) {
    var intent = parseIntent(message);
    var ranked = products
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
      reply =
        intent.budget != null
          ? "Bu büdcə və sorğuya uyğun məhsul tapa bilmədim. Büdcəni və ya kateqoriyanı dəyişib yenidən yaza bilərsiniz."
          : "Sorğunuzu bir az dəqiqləşdirin — məsələn büdcə, kateqoriya (telefon, kompüter) və əsas tələblər.";
    } else if (intent.budget != null && intent.cat) {
      reply =
        "Büdcəniz " +
        formatPrice(intent.budget) +
        " əsasında sizə ən uyğun " +
        picks.length +
        " seçimi seçdim:";
    } else if (intent.budget != null) {
      reply = "Büdcəniz daxilində " + picks.length + " uyğun məhsul tapdım:";
    } else {
      reply = "Kataloqdan sizə uyğun " + picks.length + " məhsul seçdim:";
    }

    return { reply: reply, products: picks, intent: intent };
  }

  function recommendViaApi(message, products) {
    var cfg = global.BizdevarSiteConfig;
    var url = cfg && typeof cfg.resolveBukiUrl === "function" ? cfg.resolveBukiUrl() : "";
    if (!url) return Promise.reject(new Error("no buki api"));

    var slim = products.slice(0, 120).map(function (p) {
      return {
        id: p.id,
        name: p.name,
        price: p.price,
        cat: p.cat || p.category,
        specs: p.specs || null,
      };
    });

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, products: slim, lang: "az" }),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || "Buki API xətası");
        var ids = data.product_ids || data.ids || [];
        var byId = Object.create(null);
        products.forEach(function (p) {
          byId[String(p.id)] = p;
        });
        var picks = ids
          .map(function (id) {
            var p = byId[String(id)];
            return p ? { product: p, score: 100, why: [] } : null;
          })
          .filter(Boolean);
        if (!picks.length && Array.isArray(data.products)) {
          picks = data.products
            .map(function (row) {
              var p = byId[String(row.id)] || row;
              return { product: p, score: 100, why: row.why ? [row.why] : [] };
            })
            .filter(function (x) {
              return x.product && x.product.id;
            });
        }
        if (!picks.length) throw new Error("empty buki result");
        return {
          reply: data.reply || data.message || "Sizə uyğun məhsullar:",
          products: picks.slice(0, 6),
        };
      });
    });
  }

  function recommend(message) {
    return loadCatalog().then(function (products) {
      return recommendViaApi(message, products).catch(function () {
        return recommendLocal(message, products);
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
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3z" fill="#fff"/><path d="M18.5 13.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1z" fill="#fff"/></svg>' +
      "</div>" +
      '<div class="buki-panel__meta">' +
      '<p class="buki-panel__name">Buki</p>' +
      '<p class="buki-panel__sub">AI alış-veriş köməkçiniz</p>' +
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
