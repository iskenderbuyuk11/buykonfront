/* ============================================================
   BUYKON CLUB · Şans çarxı — paylaşılan konfiqurasiya
   Backend: GET /wheel-config · PUT /admin/wheel-config
   ============================================================ */
(function (global) {
  "use strict";

  var STORAGE_KEY = "buykon_wheel_config_v1";
  var cached = null;
  var loadPromise = null;

  var ICONS = {
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L22 7H6"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    star: '<path d="M12 3.5 14.6 8.8l5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L4.5 9.7l5.9-.9z"/>',
    review: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-1L3 20l1.3-4A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/><path d="M8.5 11h7M8.5 8h4"/>',
    percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.2"/><circle cx="17.5" cy="17.5" r="2.2"/>',
    tag: '<path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
    truck: '<path d="M1 4h13v11H1z"/><path d="M14 8h4l3 3v4h-7z"/><circle cx="5.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
    coins: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.6 3.6 3 8 3s8-1.4 8-3V6"/><path d="M4 12v6c0 1.6 3.6 3 8 3s8-1.4 8-3v-6"/>',
    wallet: '<path d="M3 6a2 2 0 0 1 2-2h12v4"/><path d="M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="17" cy="13" r="1.2"/>',
    ticket: '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/><path d="M14 5.5v11" stroke-dasharray="1.5 2.5"/>',
    gift: '<path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8"/><path d="M2.5 8h19v4h-19z"/><path d="M12 8v13"/><path d="M12 8S10.7 3.6 8 4.3 12 8 12 8z"/><path d="M12 8s1.3-4.4 4-3.7S12 8 12 8z"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    diamond: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18"/><path d="M9 3 6 9l6 12"/><path d="M15 3l3 6-6 12"/>',
    crown: '<path d="M3 8l3.5 3.2L12 5l5.5 6.2L21 8l-1.5 11h-15z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
  };

  var REQ_TYPES = {
    cart_count: { label: "Səbətdəki məhsul sayı", unit: "ədəd", icon: "bag" },
    cart_total: { label: "Səbətdə məbləğ (₼)", unit: "₼", icon: "cart" },
    favorites_count: { label: "Bəyənilən məhsul sayı", unit: "ədəd", icon: "heart" },
    review: { label: "Rəy yazılması", unit: "", icon: "review", fixedTarget: 1 },
  };

  function defaults() {
    return {
      requirements: [
        { type: "cart_count", title: "1 məhsul səbətinə əlavə et", target: 1, icon: "bag", enabled: true },
        { type: "favorites_count", title: "3 məhsul bəyən", target: 3, icon: "heart", enabled: true },
        { type: "review", title: "Rəy yaz", target: 1, icon: "review", enabled: true },
      ],
      prizes: [
        { label: "10% Endirim", short: "10%", icon: "percent", tone: "orange", weight: 1, xp: 40 },
        { label: "Pulsuz Çatdırılma", short: "Çatdırılma", icon: "truck", tone: "cream", weight: 1, xp: 30 },
        { label: "5 ₼ Bonus", short: "5 ₼", icon: "coins", tone: "orange", weight: 1, xp: 30 },
        { label: "Hədiyyə Kuponu", short: "Kupon", icon: "ticket", tone: "cream", weight: 1, xp: 35 },
        { label: "15% Endirim", short: "15%", icon: "tag", tone: "orange", weight: 1, xp: 50 },
        { label: "50 XP Bonusu", short: "50 XP", icon: "bolt", tone: "cream", weight: 1, xp: 80 },
        { label: "Yenidən Fırlat", short: "Respin", icon: "refresh", tone: "orange", weight: 1, xp: 10, respin: true },
        { label: "25 ₼ Balans", short: "25 ₼", icon: "wallet", tone: "cream", weight: 1, xp: 60 },
      ],
    };
  }

  function iconKey(k) {
    return ICONS[k] ? k : "gift";
  }

  function sanitize(cfg) {
    var d = defaults();
    var out = { requirements: [], prizes: [] };

    (cfg && cfg.requirements || []).forEach(function (r) {
      if (!r || !REQ_TYPES[r.type]) return;
      var fixed = REQ_TYPES[r.type].fixedTarget;
      out.requirements.push({
        type: r.type,
        title: String(r.title || REQ_TYPES[r.type].label).slice(0, 80),
        target: fixed != null ? fixed : Math.max(1, Number(r.target) || 1),
        icon: iconKey(r.icon || REQ_TYPES[r.type].icon),
        enabled: r.enabled !== false,
      });
    });
    if (!out.requirements.length) out.requirements = d.requirements;

    (cfg && cfg.prizes || []).forEach(function (p) {
      if (!p || !p.label) return;
      out.prizes.push({
        label: String(p.label).slice(0, 40),
        short: String(p.short || p.label).slice(0, 16),
        icon: iconKey(p.icon),
        tone: p.tone === "cream" ? "cream" : "orange",
        weight: Math.max(0, Number(p.weight)) || 1,
        xp: p.xp != null ? Math.max(0, Number(p.xp)) || 0 : 30,
        respin: !!p.respin,
      });
    });
    if (out.prizes.length < 2) out.prizes = d.prizes;

    return out;
  }

  function readLocal() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && saved.requirements && saved.prizes) return sanitize(saved);
    } catch (e) {
      /* ignore */
    }
    return defaults();
  }

  function writeLocal(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {
      /* ignore */
    }
  }

  function emitChange(cfg) {
    try {
      document.dispatchEvent(new CustomEvent("BuykonWheelConfigChanged", { detail: cfg }));
    } catch (e) {
      /* ignore */
    }
  }

  function get() {
    return cached || readLocal();
  }

  function loadFromApi() {
    if (loadPromise) return loadPromise;
    if (!global.BizdevarAPI || typeof BizdevarAPI.wheelConfig !== "function") {
      cached = readLocal();
      return Promise.resolve(cached);
    }
    loadPromise = BizdevarAPI.wheelConfig()
      .then(function (data) {
        cached = sanitize(data && data.config ? data.config : data);
        writeLocal(cached);
        emitChange(cached);
        return cached;
      })
      .catch(function () {
        cached = readLocal();
        return cached;
      });
    return loadPromise;
  }

  function apply(cfg) {
    cached = sanitize(cfg);
    writeLocal(cached);
    emitChange(cached);
    return cached;
  }

  function save(cfg) {
    var clean = sanitize(cfg);
    cached = clean;
    writeLocal(clean);
    emitChange(clean);

    if (global.BizdeAdminAPI && typeof BizdeAdminAPI.wheelConfigSave === "function") {
      return BizdeAdminAPI.wheelConfigSave(clean)
        .then(function () { return clean; })
        .catch(function () {
          if (global.BizdeAdminAPI && typeof BizdeAdminAPI.updateSetting === "function") {
            return BizdeAdminAPI.updateSetting("wheel_config", JSON.stringify(clean))
              .then(function () { return clean; })
              .catch(function () { return clean; });
          }
          return clean;
        });
    }
    if (global.BizdeAdminAPI && typeof BizdeAdminAPI.updateSetting === "function") {
      return BizdeAdminAPI.updateSetting("wheel_config", JSON.stringify(clean))
        .then(function () { return clean; })
        .catch(function () { return clean; });
    }
    return Promise.resolve(clean);
  }

  function resetToDefault() {
    var d = defaults();
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    return save(d);
  }

  function icon(key, size) {
    var px = size || 24;
    return (
      '<svg viewBox="0 0 24 24" width="' + px + '" height="' + px + '" fill="none" ' +
      'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + (ICONS[iconKey(key)] || ICONS.gift) + "</svg>"
    );
  }

  global.BuykonWheelConfig = {
    STORAGE_KEY: STORAGE_KEY,
    ICONS: ICONS,
    REQ_TYPES: REQ_TYPES,
    iconInner: function (key) { return ICONS[iconKey(key)] || ICONS.gift; },
    iconKeys: function () { return Object.keys(ICONS); },
    defaults: defaults,
    sanitize: sanitize,
    get: get,
    apply: apply,
    loadFromApi: loadFromApi,
    save: save,
    resetToDefault: resetToDefault,
    icon: icon,
  };
})(window);
