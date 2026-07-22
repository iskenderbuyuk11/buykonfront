(function () {
  "use strict";

  var STORAGE_KEY = "bizdevar-cart";

  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function write(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      /* ignore */
    }
    document.dispatchEvent(
      new CustomEvent("BizdevarCartChanged", { detail: { items: items } })
    );
    if (window.BizdevarHeader && typeof BizdevarHeader.setCartBadge === "function") {
      BizdevarHeader.setCartBadge(getTotalQty(items));
    }
  }

  function getTotalQty(items) {
    items = items || read();
    return items.reduce(function (sum, item) {
      return sum + (Number(item.qty) || Number(item.quantity) || 1);
    }, 0);
  }

  function findIndex(items, productId) {
    productId = Number(productId);
    return items.findIndex(function (item) {
      var id = Number(item.product_id || item.id);
      return id === productId;
    });
  }

  window.BizdevarCart = {
    getItems: read,
    getPayload: function () {
      var items = read();
      return { items: items, total_qty: getTotalQty(items) };
    },
    getTotalQty: function () {
      return getTotalQty(read());
    },
    add: function (product, qty) {
      qty = Number(qty) || 1;
      if (!product) return;

      var productId = Number(product.id || product.product_id);
      if (!productId) return;

      var items = read();
      var idx = findIndex(items, productId);

      if (idx === -1) {
        items.push({
          product_id: productId,
          id: productId,
          name: product.name || "Məhsul",
          price: Number(product.price) || 0,
          base_price: Number(product.base_price || product.oldPrice) || null,
          discount_percent: Number(product.discount_percent) || 0,
          vendor_name: product.vendor_name || "",
          qty: qty,
          image_url: product.image || product.image_url || "",
        });
      } else {
        items[idx].qty = (Number(items[idx].qty) || 1) + qty;
      }

      write(items);
    },
    setQty: function (productId, qty) {
      productId = Number(productId);
      qty = Number(qty) || 0;
      var items = read();
      var idx = findIndex(items, productId);
      if (idx === -1) return;
      if (qty <= 0) {
        items.splice(idx, 1);
      } else {
        items[idx].qty = qty;
      }
      write(items);
    },
    remove: function (productId) {
      productId = Number(productId);
      write(
        read().filter(function (item) {
          return Number(item.product_id || item.id) !== productId;
        })
      );
    },
    clear: function () {
      write([]);
    },
  };
})();
