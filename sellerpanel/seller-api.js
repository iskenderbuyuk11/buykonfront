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

  function normalizePath(path) {
    return String(path || "").replace(/\/+$/, "") || "/";
  }

  function parseStoreQueryPath() {
    var search = window.location.search;
    if (!search || search.length < 2) return "";
    var raw = search.slice(1);
    if (raw.charAt(0) === "=") raw = raw.slice(1);
    var amp = raw.indexOf("&");
    if (amp !== -1) raw = raw.slice(0, amp);
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch (e) {
      return raw;
    }
  }

  function isStoreEntryPath() {
    var path = normalizePath(window.location.pathname);
    return path === "/store" || path === "/pages/store/index.html";
  }

  function storePathUrl(path) {
    return "/store?" + String(path || "").replace(/^\?+/, "").replace(/^=+/, "");
  }

  function storePublicUrl(storeSlug) {
    if (!storeSlug) return "/store";
    return storePathUrl(storeSlug);
  }

  function sellerLoginUrl(storeSlug) {
    if (storeSlug) return storePathUrl(storeSlug + "/sellerpanel/login");
    var queryPath = parseStoreQueryPath();
    if (queryPath) {
      var parts = queryPath.split("/").filter(Boolean);
      if (parts.length && parts[0] !== "sellerpanel") {
        return storePathUrl(parts[0] + "/sellerpanel/login");
      }
    }
    var legacy = (window.location.pathname || "").split("/").filter(Boolean);
    if (legacy.length >= 2 && legacy[1] === "sellerpanel" && legacy[0] !== "sellerpanel") {
      return storePathUrl(legacy[0] + "/sellerpanel/login");
    }
    return "/sellerpanel/login.html";
  }

  function sellerPanelUrl(storeSlug, memberSlug) {
    return storePathUrl(storeSlug + "/sellerpanel/" + memberSlug);
  }

  function parsePanelUrl() {
    if (isStoreEntryPath()) {
      var queryPath = parseStoreQueryPath();
      var parts = queryPath.split("/").filter(Boolean);
      if (
        parts.length >= 3 &&
        parts[1] === "sellerpanel" &&
        parts[2] !== "login" &&
        parts[2] !== "accept-invite"
      ) {
        return { storeSlug: parts[0], memberSlug: parts[2] };
      }
    }
    var legacy = (window.location.pathname || "").split("/").filter(Boolean);
    if (
      legacy.length >= 3 &&
      legacy[1] === "sellerpanel" &&
      legacy[2] !== "login" &&
      legacy[2] !== "login.html" &&
      legacy[2] !== "accept-invite"
    ) {
      return { storeSlug: legacy[0], memberSlug: legacy[2] };
    }
    return null;
  }

  function normalizePanelPath(path) {
    var p = String(path || "").trim();
    if (!p) return "";
    if (p.indexOf("/store?") === 0) return p;
    if (p.indexOf("store?") === 0) return "/" + p;
    var m = p.match(/^\/?([a-z0-9_-]+)\/sellerpanel\/([a-z0-9_-]+)\/?$/i);
    if (m) {
      return storePathUrl(m[1] + "/sellerpanel/" + m[2]);
    }
    return p;
  }

  function normalizeExternalStoreUrl(url) {
    var raw = String(url || "").trim();
    if (!raw) return raw;
    var m = raw.match(/^(https?:\/\/[^/?#]+)?(\/?)([a-z0-9_-]+)\/sellerpanel\/([a-z0-9_-]+)(\?[^#]*)?(#.*)?$/i);
    if (!m) return raw;
    var origin = m[1] || "";
    var extra = m[5] || "";
    var hash = m[6] || "";
    var next = storePathUrl(m[3] + "/sellerpanel/" + m[4]);
    if (extra) {
      next += extra.charAt(0) === "?" ? "&" + extra.slice(1) : extra;
    }
    return origin + next + hash;
  }

  function currentPanelLocation() {
    return normalizePath(window.location.pathname) + window.location.search;
  }

  function enforcePanelAccess(session) {
    var expected = normalizePanelPath(session.panel_path || session.redirect_path);
    var current = currentPanelLocation();
    if (expected && current !== expected) {
      window.location.replace(expected);
      return false;
    }
    var fromUrl = parsePanelUrl();
    if (fromUrl && session.member_slug && fromUrl.memberSlug !== session.member_slug) {
      window.location.replace(expected || sellerLoginUrl(session.store_slug));
      return false;
    }
    if (fromUrl && session.store_slug && fromUrl.storeSlug !== session.store_slug) {
      window.location.replace(expected || sellerLoginUrl(session.store_slug));
      return false;
    }
    if (!fromUrl && expected && expected.indexOf("sellerpanel") > 0) {
      window.location.replace(expected);
      return false;
    }
    return true;
  }

  function request(path, options) {
    var opts = options || {};
    return fetch(API_BASE + path, {
      method: opts.method || "GET",
      headers: Object.assign({ "Content-Type": "application/json" }, opts.headers || {}),
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

  window.BuykonSellerAPI = window.BizdeSellerAPI = {
    baseUrl: API_BASE,
    loginUrl: sellerLoginUrl,
    storePublicUrl: storePublicUrl,
    storePathUrl: storePathUrl,
    sellerPanelUrl: sellerPanelUrl,
    parseStoreQueryPath: parseStoreQueryPath,
    parsePanelUrl: parsePanelUrl,
    normalizePanelPath: normalizePanelPath,
    normalizeExternalStoreUrl: normalizeExternalStoreUrl,
    enforcePanelAccess: enforcePanelAccess,

    login: function (email, password, memberId) {
      return request("/auth/seller/login", {
        method: "POST",
        body: { email: email, password: password, member_id: memberId || "owner" },
      });
    },

    verifyStore: function (storeCode, storePassword) {
      return request("/auth/seller/verify-store", {
        method: "POST",
        body: { store_code: storeCode, store_password: storePassword },
      });
    },

    requestOtp: function (storeCode, memberId, password) {
      return request("/auth/seller/request-otp", {
        method: "POST",
        body: { store_code: storeCode, member_id: memberId, password: password },
      });
    },

    verifyMember: function (storeCode, memberId, password) {
      return request("/auth/seller/verify-member", {
        method: "POST",
        body: { store_code: storeCode, member_id: memberId, password: password },
      });
    },

    setMemberPassword: function (storeCode, memberId, password, passwordConfirm) {
      return request("/auth/seller/set-member-password", {
        method: "POST",
        body: {
          store_code: storeCode,
          member_id: memberId,
          password: password,
          password_confirm: passwordConfirm,
        },
      });
    },

    verifyOtp: function (challengeToken, code) {
      return request("/auth/seller/verify-otp", {
        method: "POST",
        body: { challenge_token: challengeToken, code: code },
      });
    },

    publicStore: function (slug) {
      return request("/stores/" + encodeURIComponent(slug));
    },

    members: function (email) {
      return request("/auth/seller/members", { method: "POST", body: { email: email } });
    },

    acceptInvite: function (payload) {
      return request("/auth/seller/accept-invite", { method: "POST", body: payload });
    },

    invitePreview: function (token) {
      return request("/auth/seller/invite-preview?token=" + encodeURIComponent(token || ""));
    },

    register: function (payload) {
      return request("/auth/seller-register", { method: "POST", body: payload });
    },

    logout: function () {
      return request("/auth/seller/logout", { method: "POST", body: {} });
    },

    session: function () {
      return request("/auth/seller/session").then(function (data) {
        if (!data.logged_in || data.role !== "seller") {
          throw new Error("Satıcı sessiyası yoxdur");
        }
        return data;
      });
    },

    dashboard: function () {
      return request("/seller/dashboard");
    },

    profile: function () {
      return request("/seller/profile");
    },

    updateSettings: function (payload) {
      return request("/seller/settings", { method: "PATCH", body: payload });
    },

    uploadLogo: function (file) {
      var formData = new FormData();
      formData.append("file", file);
      return fetch(API_BASE + "/seller/settings/logo", {
        method: "POST",
        credentials: "include",
        body: formData,
      }).then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              var err = new Error((data && data.error) || "Profil şəkli yüklənmədi");
              err.status = res.status;
              throw err;
            }
            return data;
          });
      });
    },

    removeLogo: function () {
      return request("/seller/settings/logo", { method: "DELETE" });
    },

    freezeStore: function () {
      return request("/seller/settings/freeze", { method: "POST", body: {} });
    },

    unfreezeStore: function () {
      return request("/seller/settings/unfreeze", { method: "POST", body: {} });
    },

    deleteStore: function (password) {
      return request("/seller/settings/delete", { method: "POST", body: { password: password } });
    },

    categories: function () {
      return request("/seller/categories");
    },

    products: function () {
      return request("/seller/products");
    },

    product: function (id) {
      return request("/seller/products/" + id);
    },

    createProduct: function (payload) {
      return request("/seller/products", { method: "POST", body: payload });
    },

    updateProduct: function (id, payload) {
      return request("/seller/products/" + id, { method: "PATCH", body: payload });
    },

    deleteProduct: function (id, reason) {
      return request("/seller/products/" + id + "/delete-request", {
        method: "POST",
        body: { reason: reason },
      });
    },

    reviews: function () {
      return request("/seller/reviews");
    },

    replyReview: function (id, reply) {
      return request("/seller/reviews/" + id + "/reply", { method: "POST", body: { reply: reply } });
    },

    questions: function () {
      return request("/seller/questions");
    },

    answerQuestion: function (id, answer) {
      return request("/seller/questions/" + id + "/answer", { method: "POST", body: { answer: answer } });
    },

    publishQuestion: function (id) {
      return request("/seller/questions/" + id + "/publish", { method: "POST", body: {} });
    },

    complaints: function () {
      return request("/seller/complaints");
    },

    notifications: function () {
      return request("/seller/notifications");
    },

    readNotification: function (id) {
      return request("/seller/notifications/" + id + "/read", { method: "POST", body: {} });
    },

    staff: function () {
      return request("/seller/staff");
    },

    inviteStaff: function (payload) {
      return request("/seller/staff", { method: "POST", body: payload });
    },

    updateStaff: function (id, payload) {
      return request("/seller/staff/" + id, { method: "PATCH", body: payload });
    },

    removeStaff: function (id) {
      return request("/seller/staff/" + id, { method: "DELETE" });
    },

    uploadImages: function (files) {
      var formData = new FormData();
      for (var i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      return fetch(API_BASE + "/seller/upload-images", {
        method: "POST",
        credentials: "include",
        body: formData,
      }).then(function (res) {
        return res
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!res.ok) {
              var err = new Error((data && data.error) || "Sekil yuklenmedi");
              err.status = res.status;
              throw err;
            }
            return data;
          });
      });
    },
  };
})();
