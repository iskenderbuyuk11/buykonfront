/**
 * Buykon — Ana səhifə FAQ (tez-tez verilən suallar)
 * Admin Ayarlar və public səhifə eyni default / normalizasiyadan istifadə edir.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "buykon_homepage_faq_v1";
  var SETTING_KEY = "homepage_faq";

  var DEFAULT = {
    title: "Tez-tez verilən suallar",
    subtitle: "Alış-veriş, çatdırılma və hesab barədə ən çox soruşulanlar.",
    items: [
      {
        q: "Sifarişimi necə izləyə bilərəm?",
        a: "Hesabınıza daxil olub Profil → Sifarişlərim bölməsindən bütün sifarişlərinizin statusunu izləyə bilərsiniz."
      },
      {
        q: "Hansı ödəniş üsulları qəbul olunur?",
        a: "Kart və digər mövcud ödəniş üsulları ilə ödəyə bilərsiniz. Ödəniş məlumatlarınız qorunur."
      },
      {
        q: "Çatdırılma nə qədər çəkir?",
        a: "Çatdırılma müddəti satıcıya və ünvana görə dəyişir. Sifariş təsdiqindən sonra təxmini müddət sifariş detallarında göstərilir."
      },
      {
        q: "Məhsulu qaytara bilərəmmi?",
        a: "Bəli, qaytarma şərtlərinə uyğun məhsulları sifariş detallarından və ya dəstək vasitəsilə qaytara bilərsiniz."
      },
      {
        q: "Satıcı olmaq üçün nə etməliyəm?",
        a: "Satıcı qeydiyyatından keçin, mağaza məlumatlarınızı doldurun və təsdiq gözləyin. Təsdiqdən sonra məhsul əlavə edə bilərsiniz."
      }
    ]
  };

  function parseMaybeJson(raw) {
    if (raw == null) return null;
    if (typeof raw === "object") return raw;
    if (typeof raw !== "string") return null;
    var t = raw.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch (e) {
      return null;
    }
  }

  function normalizeItem(it) {
    if (!it || typeof it !== "object") return null;
    var q = String(it.q || it.question || "").trim();
    var a = String(it.a || it.answer || "").trim();
    if (!q || !a) return null;
    return { q: q, a: a };
  }

  function normalize(input) {
    var src = input && typeof input === "object" ? input : {};
    var items = Array.isArray(src.items) ? src.items : [];
    var outItems = [];
    for (var i = 0; i < items.length; i++) {
      var n = normalizeItem(items[i]);
      if (n) outItems.push(n);
    }
    return {
      title: String(src.title || DEFAULT.title).trim() || DEFAULT.title,
      subtitle: String(src.subtitle != null ? src.subtitle : DEFAULT.subtitle).trim(),
      items: outItems.length ? outItems : DEFAULT.items.map(function (x) {
        return { q: x.q, a: x.a };
      })
    };
  }

  function getDefault() {
    return normalize(DEFAULT);
  }

  function readLocal() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalize(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  function writeLocal(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalize(data)));
    } catch (e) {}
  }

  global.BuykonHomeFaq = {
    STORAGE_KEY: STORAGE_KEY,
    SETTING_KEY: SETTING_KEY,
    getDefault: getDefault,
    normalize: normalize,
    parseMaybeJson: parseMaybeJson,
    readLocal: readLocal,
    writeLocal: writeLocal
  };
})(typeof window !== "undefined" ? window : this);
