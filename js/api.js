(function () {
  "use strict";

  function defaultApiBase() {
    var h = window.location && window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]") {
      return "http://localhost:8080/api";
    }
    return "https://api.buykon.com/api";
  }

  var API_BASE =
    (window.BizdevarSiteConfig && window.BizdevarSiteConfig.resolveApiBase()) ||
    defaultApiBase();

  API_BASE = String(API_BASE).replace(/\/+$/, "");

  var sessionCache = null;

  function request(path, options) {
    var opts = options || {};
    var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});

    return fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: headers,
      credentials: "include",
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          if (!res.ok) {
            var err = new Error((data && data.error) || "Server xətası");
            err.status = res.status;
            err.payload = data;
            throw err;
          }
          return data;
        });
    });
  }

  function isLoggedIn() {
    return sessionCache && sessionCache.logged_in;
  }

  function emitAuthChanged() {
    try {
      document.dispatchEvent(new CustomEvent("BizdevarAuthChanged", {
        detail: { logged_in: isLoggedIn() },
      }));
    } catch (e) {
      /* ignore */
    }
  }

  function refreshSession() {
    return request("/auth/session").then(function (data) {
      sessionCache = data;
      return data;
    });
  }

  function localCartGet() {
    if (window.BizdevarCart) {
      return Promise.resolve({
        items: BizdevarCart.getItems(),
        total_qty: BizdevarCart.getTotalQty(),
      });
    }
    return Promise.resolve({ items: [], total_qty: 0 });
  }

  function localCartAdd(id, qty) {
    if (!window.BizdevarCart) {
      return Promise.reject(new Error("Səbət mövcud deyil"));
    }
    return refreshSession()
      .then(function (s) {
        if (s.logged_in) {
          return request("/cart/items", {
            method: "POST",
            body: { product_id: Number(id), qty: qty || 1 },
          });
        }
        var product = null;
        if (Array.isArray(window.products)) {
          product = window.products.find(function (p) {
            return Number(p.id) === Number(id);
          });
        }
        if (!product) {
          product = { id: id, name: "Məhsul", price: 0 };
        }
        BizdevarCart.add(product, qty || 1);
        return localCartGet();
      })
      .catch(function (err) {
        if (err.status === 401) {
          return localCartAddGuest(id, qty);
        }
        throw err;
      });
  }

  function localCartAddGuest(id, qty) {
    if (!window.BizdevarCart) {
      return Promise.reject(new Error("Səbət mövcud deyil"));
    }
    var product = { id: id, name: "Məhsul", price: 0 };
    if (Array.isArray(window.products)) {
      var found = window.products.find(function (p) {
        return Number(p.id) === Number(id);
      });
      if (found) product = found;
    }
    BizdevarCart.add(product, qty || 1);
    return localCartGet();
  }

  function syncGuestCart() {
    if (!window.BizdevarCart) return Promise.resolve();
    var items = BizdevarCart.getItems();
    if (!items.length) return Promise.resolve();
    var chain = Promise.resolve();
    items.forEach(function (it) {
      chain = chain.then(function () {
        return request("/cart/items", {
          method: "POST",
          body: { product_id: Number(it.product_id || it.id), qty: Number(it.qty) || 1 },
        }).catch(function () {});
      });
    });
    return chain.then(function () {
      BizdevarCart.clear();
    });
  }

  function cartGet() {
    return refreshSession()
      .then(function (s) {
        if (s.logged_in) {
          return syncGuestCart().then(function () {
            return request("/cart");
          });
        }
        return localCartGet();
      })
      .catch(function () {
        return localCartGet();
      });
  }

  function cartUpdate(id, qty) {
    return refreshSession()
      .then(function (s) {
        if (s.logged_in) {
          return request("/cart/items/" + Number(id), {
            method: "PATCH",
            body: { qty: Number(qty) },
          });
        }
        if (window.BizdevarCart) {
          BizdevarCart.setQty(id, Number(qty));
          return localCartGet();
        }
        return localCartGet();
      })
      .catch(function () {
        if (window.BizdevarCart) {
          BizdevarCart.setQty(id, Number(qty));
        }
        return localCartGet();
      });
  }

  function cartRemove(id) {
    return cartUpdate(id, 0);
  }

  window.BizdevarAPI = {
    baseUrl: API_BASE,

    session: function () {
      return refreshSession();
    },

    login: function (email, password) {
      return request("/auth/login", {
        method: "POST",
        body: { email: email, password: password },
      }).then(function (data) {
        sessionCache = data;
        emitAuthChanged();
        return data;
      });
    },

    register: function (payload) {
      return request("/auth/register", { method: "POST", body: payload }).then(function (data) {
        sessionCache = data;
        emitAuthChanged();
        return data;
      });
    },

    googleLogin: function (credential) {
      return request("/auth/google", {
        method: "POST",
        body: { credential: credential },
      }).then(function (data) {
        sessionCache = data;
        emitAuthChanged();
        return data;
      });
    },

    logout: function () {
      return request("/auth/logout", { method: "POST", body: {} }).then(function (data) {
        sessionCache = { logged_in: false };
        emitAuthChanged();
        return data;
      });
    },

    categories: function () {
      return request("/categories");
    },

    products: function (cat) {
      var q = cat && cat !== "all" ? "?cat=" + encodeURIComponent(cat) : "";
      return request("/products" + q);
    },

    product: function (id) {
      return request("/products/" + id);
    },

    productReviews: function (id) {
      return request("/products/" + encodeURIComponent(id) + "/reviews");
    },

    productReviewCreate: function (id, payload) {
      return request("/products/" + encodeURIComponent(id) + "/reviews", {
        method: "POST",
        body: payload,
      });
    },

    productQuestions: function (id) {
      return request("/products/" + encodeURIComponent(id) + "/questions");
    },

    productQuestionCreate: function (id, payload) {
      return request("/products/" + encodeURIComponent(id) + "/questions", {
        method: "POST",
        body: payload,
      });
    },

    cartGet: cartGet,

    cartAdd: localCartAdd,

    cartUpdate: cartUpdate,

    cartRemove: cartRemove,

    favoritesList: function () {
      return refreshSession().then(function (s) {
        if (!s.logged_in) {
          if (window.BizdevarFavorites) {
            return Promise.resolve({ ids: BizdevarFavorites.getIds() });
          }
          return Promise.resolve({ ids: [] });
        }
        return request("/favorites");
      });
    },

    favoritesAdd: function (productId) {
      return request("/favorites/" + productId, { method: "POST", body: {} });
    },

    favoritesRemove: function (productId) {
      return request("/favorites/" + productId, { method: "DELETE" });
    },

    ordersList: function () {
      return request("/orders");
    },

    orderGet: function (id) {
      return request("/orders/" + encodeURIComponent(id));
    },

    orderCreate: function (payload) {
      return request("/orders", { method: "POST", body: payload });
    },

    validatePromo: function (code) {
      return request("/promo/validate", { method: "POST", body: { code: code } });
    },

    stories: function () {
      return request("/stories");
    },

    legalTerms: function () {
      return request("/legal/terms").catch(function (err) {
        if (err.status !== 404 && err.status !== 405) throw err;
        return request("/content/terms").catch(function (err2) {
          if (err2.status !== 404 && err2.status !== 405) throw err2;
          return request("/settings/public/" + encodeURIComponent("terms_of_use"));
        });
      });
    },

    publicSetting: function (key) {
      return request("/settings/public/" + encodeURIComponent(key)).catch(function (err) {
        if (err.status !== 404 && err.status !== 405) throw err;
        return request("/public/settings/" + encodeURIComponent(key));
      });
    },

    wheelConfig: function () {
      return request("/wheel-config");
    },

    rewardWheelStatus: function () {
      return request("/reward-wheel/status");
    },

    rewardWheelSpin: function () {
      return request("/reward-wheel/spin", { method: "POST", body: {} });
    },

    profileGet: function () {
      return request("/profile");
    },

    kycStatus: function () {
      return request("/kyc/status");
    },

    kycCreateSession: function () {
      return request("/kyc/session", { method: "POST", body: {} });
    },

    profileUpdate: function (payload) {
      return request("/profile", { method: "PUT", body: payload });
    },
  };

  refreshSession()
    .then(function (data) {
      emitAuthChanged();
      return data;
    })
    .catch(function () {
      sessionCache = { logged_in: false };
      emitAuthChanged();
    });
})();
