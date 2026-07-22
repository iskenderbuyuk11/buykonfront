(function () {
  "use strict";

  var ORDERS_KEY = "bizdevar-orders";
  var DEFAULT_IMG = "images/products/iphone15.jpg";

  var STATUS_ORDER = ["placed", "packing", "cargo", "delivering", "delivered"];
  var CANCELLED = "cancelled";

  var STATUS_META = {
    placed: {
      label: "Sifariş verildi",
      short: "Verildi",
      tone: "info",
    },
    packing: {
      label: "Paketlənir",
      short: "Paketlənir",
      tone: "warn",
    },
    cargo: {
      label: "Kargodadır",
      short: "Kargoda",
      tone: "info",
    },
    delivering: {
      label: "Çatdırılır",
      short: "Çatdırılır",
      tone: "active",
    },
    delivered: {
      label: "Çatdırıldı",
      short: "Çatdırıldı",
      tone: "ok",
    },
    cancelled: {
      label: "Ləğv edildi",
      short: "Ləğv",
      tone: "bad",
    },
  };

  function readRaw() {
    try {
      var raw = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function writeRaw(list) {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
    } catch (e) {
      /* ignore */
    }
  }

  function normalizeStatus(status) {
    if (status === "paid") return "placed";
    if (STATUS_META[status]) return status;
    return "placed";
  }

  function normalizeOrder(order) {
    if (!order) return null;
    var items = Array.isArray(order.items) ? order.items : [];
    var first = items[0] || {};
    return {
      id: order.id || "BV-000000",
      date: order.date || new Date().toLocaleDateString("az-AZ"),
      createdAt: order.createdAt || new Date().toISOString(),
      status: normalizeStatus(order.status),
      total: Number(order.total) || 0,
      seller:
        order.seller ||
        (order.delivery && order.delivery.company) ||
        "BizdəVar Rəsmi",
      items: items,
      delivery: order.delivery || {},
      productName: first.name || "Məhsul",
      productImage: first.image_url || first.image || DEFAULT_IMG,
      itemCount: items.reduce(function (s, i) {
        return s + (Number(i.qty) || 1);
      }, 0),
    };
  }

  function getAll() {
    return readRaw().map(normalizeOrder).sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  function getById(id) {
    var target = String(id || "").trim();
    if (!target) return null;
    var found = getAll().find(function (o) {
      return o.id === target;
    });
    return found || null;
  }

  function saveOrder(order) {
    var normalized = normalizeOrder(order);
    if (!normalized) return null;
    var list = readRaw();
    list.unshift(
      Object.assign({}, order, {
        status: normalized.status,
        createdAt: normalized.createdAt,
        date: normalized.date,
        seller: normalized.seller,
      })
    );
    writeRaw(list);
    return normalized;
  }

  function updateStatus(id, status) {
    var list = readRaw();
    var idx = list.findIndex(function (o) {
      return o.id === id;
    });
    if (idx === -1) return null;
    list[idx].status = normalizeStatus(status);
    writeRaw(list);
    return normalizeOrder(list[idx]);
  }

  function resolveImg(src, root) {
    root = root || "";
    var s = String(src || "").trim();
    if (!s) return root + DEFAULT_IMG;
    if (/^https?:\/\//i.test(s) || s.charAt(0) === "/") return s;
    if (s.indexOf("../") === 0) return s;
    return root + s.replace(/^\.\//, "");
  }

  function formatMoney(n) {
    return (
      Number(n || 0).toLocaleString("az-AZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " ₼"
    );
  }

  function getStatusLabel(status) {
    var meta = STATUS_META[normalizeStatus(status)];
    return meta ? meta.label : status;
  }

  function getStatusShort(status) {
    var meta = STATUS_META[normalizeStatus(status)];
    return meta ? meta.short : status;
  }

  function getStatusTone(status) {
    var meta = STATUS_META[normalizeStatus(status)];
    return meta ? meta.tone : "info";
  }

  function isStepDone(step, currentStatus) {
    if (currentStatus === CANCELLED) return false;
    var cur = normalizeStatus(currentStatus);
    var stepIdx = STATUS_ORDER.indexOf(step);
    var curIdx = STATUS_ORDER.indexOf(cur);
    if (stepIdx === -1 || curIdx === -1) return false;
    return stepIdx <= curIdx;
  }

  function isStepActive(step, currentStatus) {
    if (currentStatus === CANCELLED) return false;
    return normalizeStatus(currentStatus) === step;
  }

  window.BizdevarOrders = {
    ORDERS_KEY: ORDERS_KEY,
    STATUS_ORDER: STATUS_ORDER,
    CANCELLED: CANCELLED,
    STATUS_META: STATUS_META,
    getAll: getAll,
    getById: getById,
    saveOrder: saveOrder,
    updateStatus: updateStatus,
    normalizeOrder: normalizeOrder,
    normalizeStatus: normalizeStatus,
    resolveImg: resolveImg,
    formatMoney: formatMoney,
    getStatusLabel: getStatusLabel,
    getStatusShort: getStatusShort,
    getStatusTone: getStatusTone,
    isStepDone: isStepDone,
    isStepActive: isStepActive,
  };
})();
