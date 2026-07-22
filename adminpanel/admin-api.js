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
            throw err;
          }
          return data;
        });
    });
  }

  function assertAdminSession(data) {
    if (!data.logged_in || !data.user || !data.user.is_admin) {
      throw new Error("Admin icazəsi yoxdur");
    }
    return data;
  }

  window.BizdeAdminAPI = {
    baseUrl: API_BASE,

    checkEmail: function (email) {
      return request("/auth/admin/check-email", { method: "POST", body: { email: email } });
    },

    requestOtp: function (email, password) {
      var body = { email: email };
      if (password) body.password = password;
      return request("/auth/admin/request-otp", { method: "POST", body: body });
    },

    verifyOtp: function (email, code) {
      return request("/auth/admin/verify-otp", { method: "POST", body: { email: email, code: code } }).then(function (data) {
        if (data.logged_in) return assertAdminSession(data);
        return data;
      });
    },

    setPassword: function (email, code, password, passwordConfirm) {
      return request("/auth/admin/set-password", {
        method: "POST",
        body: { email: email, code: code, password: password, password_confirm: passwordConfirm },
      }).then(assertAdminSession);
    },

    logout: function () {
      return request("/auth/admin/logout", { method: "POST", body: {} });
    },

    session: function () {
      return request("/auth/admin/session").then(assertAdminSession);
    },

    listAdmins: function () {
      return request("/auth/admin/list");
    },

    inviteAdmin: function (email) {
      return request("/auth/admin/invite", { method: "POST", body: { email: email } });
    },

    search: function (q) {
      return request("/admin/search?q=" + encodeURIComponent(q));
    },

    dashboard: function () {
      return request("/admin/dashboard");
    },

    vendors: function () {
      return request("/admin/stores");
    },

    vendorApplications: function () {
      return request("/admin/vendor-applications");
    },

    stores: function () {
      return request("/admin/stores");
    },

    vendor: function (id) {
      return request("/admin/vendors/" + id);
    },

    approveVendor: function (id) {
      return request("/admin/vendors/" + id + "/approve", { method: "POST", body: {} });
    },

    suspendVendor: function (id) {
      return request("/admin/vendors/" + id + "/suspend", { method: "POST", body: {} });
    },

    products: function () {
      return request("/admin/products");
    },

    catalogProducts: function () {
      return request("/admin/products?status=all").catch(function (err) {
        if (err.status !== 400 && err.status !== 404 && err.status !== 422) throw err;
        return request("/admin/products");
      });
    },

    product: function (id) {
      return request("/admin/products/" + id);
    },

    updateProduct: function (id, payload) {
      return request("/admin/products/" + id + "/update", { method: "POST", body: payload }).catch(function (err) {
        if (err.status !== 404 && err.status !== 405) throw err;
        return request("/admin/products/" + id, { method: "PATCH", body: payload });
      });
    },

    deleteProduct: function (id) {
      return request("/admin/products/" + id + "/delete", { method: "POST", body: {} }).catch(function (err) {
        if (err.status !== 404 && err.status !== 405) throw err;
        return request("/admin/products/" + id, { method: "DELETE", body: {} });
      });
    },

    approveProduct: function (id) {
      return request("/admin/products/" + id + "/approve", { method: "POST", body: {} });
    },

    rejectProduct: function (id, reason) {
      return request("/admin/products/" + id + "/reject", { method: "POST", body: { reason: reason } });
    },

    rejectVendor: function (id, reason) {
      return request("/admin/vendors/" + id + "/reject", { method: "POST", body: { reason: reason } });
    },

    bulkApproveProducts: function () {
      return request("/admin/products/bulk-approve", { method: "POST", body: {} });
    },

    categories: function () {
      return request("/admin/categories");
    },

    createCategory: function (payload) {
      return request("/admin/categories", { method: "POST", body: payload });
    },

    orders: function () {
      return request("/admin/orders");
    },

    order: function (id) {
      return request("/admin/orders/" + encodeURIComponent(id));
    },

    updateOrderStatus: function (id, status) {
      return request("/admin/orders/" + encodeURIComponent(id) + "/status", {
        method: "PATCH",
        body: { status: status },
      });
    },

    customers: function () {
      return request("/admin/customers");
    },

    customer: function (id) {
      return request("/admin/customers/" + id);
    },

    payments: function () {
      return request("/admin/payments");
    },

    approveTransaction: function (id) {
      return request("/admin/payments/" + encodeURIComponent(id) + "/approve", { method: "POST", body: {} });
    },

    shipping: function () {
      return request("/admin/shipping");
    },

    campaigns: function () {
      return request("/admin/coupons");
    },

    createCoupon: function (payload) {
      return request("/admin/coupons", { method: "POST", body: payload });
    },

    reviews: function () {
      return request("/admin/reviews");
    },

    pendingReviews: function () {
      return request("/admin/reviews/pending");
    },

    approveReview: function (id) {
      return request("/admin/reviews/" + id + "/approve", { method: "POST", body: {} });
    },

    rejectReview: function (id) {
      return request("/admin/reviews/" + id + "/reject", { method: "POST", body: {} });
    },

    reports: function () {
      return request("/admin/reports");
    },

    notifications: function () {
      return request("/admin/notifications");
    },

    cms: function () {
      return request("/admin/cms");
    },

    publishCMS: function (id) {
      return request("/admin/cms/" + id + "/publish", { method: "POST", body: {} });
    },

    settings: function () {
      return request("/admin/settings");
    },

    updateSetting: function (key, value) {
      return request("/admin/settings/" + encodeURIComponent(key), { method: "PATCH", body: { value: value } });
    },

    getTermsOfUse: function () {
      return request("/admin/settings").then(function (data) {
        var rows = (data && data.settings) || [];
        var row = rows.find(function (s) {
          return s && (s.key === "terms_of_use" || s.key === "legal_terms");
        });
        return { setting: row || null, settings: rows };
      });
    },

    saveTermsOfUse: function (payload) {
      var value = typeof payload === "string" ? payload : JSON.stringify(payload);
      return request("/admin/settings/" + encodeURIComponent("terms_of_use"), {
        method: "PATCH",
        body: { value: value },
      }).catch(function (err) {
        if (err.status !== 404 && err.status !== 405) throw err;
        return request("/admin/settings", {
          method: "POST",
          body: { key: "terms_of_use", value: value, group: "legal" },
        });
      });
    },

    supportTickets: function () {
      return request("/admin/support/tickets");
    },

    updateTicketStatus: function (id, status) {
      return request("/admin/support/tickets/" + encodeURIComponent(id) + "/status", {
        method: "PATCH",
        body: { status: status },
      });
    },

    auditLogs: function () {
      return request("/admin/audit-logs");
    },

    stories: function () {
      return request("/admin/stories");
    },

    uploadStoryImage: function (file) {
      var fd = new FormData();
      fd.append("file", file);
      fd.append("image", file);
      return fetch(API_BASE + "/admin/stories/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) throw new Error((data && data.error) || "Sekil yuklenmedi");
          // Bəzi cavablarda url fərqli açar altında gəlir
          if (!data.url && !data.image_url && data.data) {
            data.url = data.data.url || data.data.image_url || data.data.path;
          }
          if (!data.url) {
            data.url = data.image_url || data.path || data.file_url || "";
          }
          return data;
        });
      });
    },

    createStory: function (payload) {
      return request("/admin/stories", { method: "POST", body: payload });
    },

    updateStory: function (id, payload) {
      var body = Object.assign({}, payload || {});
      if (body.image_url && !body.image) body.image = body.image_url;
      return request("/admin/stories/" + encodeURIComponent(String(id)), {
        method: "PUT",
        body: body,
      });
    },

    deleteStory: function (id) {
      return request("/admin/stories/" + id, { method: "DELETE", body: {} });
    },

    wheelConfig: function () {
      return request("/admin/wheel-config").catch(function (err) {
        if (err.status !== 404 && err.status !== 405) throw err;
        return request("/admin/settings").then(function (data) {
          var row = (data.settings || []).find(function (s) { return s.key === "wheel_config"; });
          if (row && row.value) {
            try {
              return { config: JSON.parse(row.value) };
            } catch (e) {
              /* ignore */
            }
          }
          throw err;
        });
      });
    },

    wheelConfigSave: function (config) {
      return request("/admin/wheel-config", { method: "PUT", body: { config: config } }).catch(function (err) {
        if (err.status !== 404 && err.status !== 405) throw err;
        return request("/admin/settings/" + encodeURIComponent("wheel_config"), {
          method: "PATCH",
          body: { value: JSON.stringify(config) },
        });
      });
    },
  };
})();
