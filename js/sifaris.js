(function () {
  "use strict";

  var BAKU = [40.4093, 49.8672];
  var CHECKOUT_KEY = "bizdevar-checkout";
  var ORDERS_KEY = "bizdevar-orders";
  var DEFAULT_IMG = "../../images/products/iphone15.jpg";

  var CARGO_POINTS = {
    "kargo-1": [
      { id: "k1-nizami", name: "Birmarket — Nizami", address: "Nizami küç. 45, Bakı", lat: 40.3777, lng: 49.853 },
      { id: "k1-genclik", name: "Birmarket — Gənclik", address: "Atatürk pr. 24, Bakı", lat: 40.4025, lng: 49.851 },
      { id: "k1-narimanov", name: "Birmarket — Nərimanov", address: "Təbriz küç. 89, Bakı", lat: 40.3969, lng: 49.88 },
    ],
    "kargo-2": [
      { id: "k2-28may", name: "Azərpoçt — 28 May", address: "Azadlıq pr. 15, Bakı", lat: 40.3795, lng: 49.8486 },
      { id: "k2-sahil", name: "Azərpoçt — Sahil", address: "Neftçilər pr. 65, Bakı", lat: 40.3665, lng: 49.8352 },
      { id: "k2-khatai", name: "Azərpoçt — Xətai", address: "Xətai pr. 33, Bakı", lat: 40.3847, lng: 49.893 },
    ],
    "kargo-3": [
      { id: "k3-sumqayit", name: "Kargo Express — Sumqayıt", address: "Sumqayıt şossesi 78", lat: 40.418, lng: 49.902 },
      { id: "k3-bakikhanov", name: "Kargo Express — Bakıxanov", address: "S. Vurğun küç. 5", lat: 40.421, lng: 49.938 },
      { id: "k3-binagadi", name: "Kargo Express — Binəqədi", address: "8-ci mkr., Bakı", lat: 40.461, lng: 49.805 },
    ],
  };

  var checkout = null;
  var deliveryType = "pickup";
  var selectedCargoCompany = "";
  var selectedCargoPoint = null;
  var userLocation = null;
  var cargoMap = null;
  var cargoMarkers = [];
  var pendingOrderId = null;

  var els = {};

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function formatMoney(n) {
    return (
      Number(n || 0).toLocaleString("az-AZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " ₼"
    );
  }

  function resolveImg(src) {
    var s = String(src || "").trim();
    if (!s) return DEFAULT_IMG;
    if (/^https?:\/\//i.test(s) || s.charAt(0) === "/") return s;
    if (s.indexOf("../") === 0) return s;
    return "../../" + s.replace(/^\.\//, "");
  }

  function loadCheckout() {
    try {
      var raw = sessionStorage.getItem(CHECKOUT_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }

    if (window.BizdevarCart) {
      var items = BizdevarCart.getItems();
      var subtotal = items.reduce(function (sum, item) {
        return sum + (Number(item.price) || 0) * (Number(item.qty) || 1);
      }, 0);
      return { items: items, subtotal: subtotal, promoDiscountPercent: 0, total: subtotal };
    }

    return null;
  }

  function getTotalQty() {
    if (!checkout || !checkout.items) return 0;
    return checkout.items.reduce(function (s, item) {
      return s + (Number(item.qty) || 1);
    }, 0);
  }

  function renderSummary() {
    if (!checkout || !checkout.items || !checkout.items.length) {
      window.location.href = "../sebet/";
      return;
    }

    var subtotal = checkout.subtotal || 0;
    var discountPct = checkout.promoDiscountPercent || 0;
    var discountAmt = subtotal * (discountPct / 100);
    var total = checkout.total != null ? checkout.total : subtotal - discountAmt;
    var qty = getTotalQty();

    if (els.cartLabel) {
      els.cartLabel.textContent = "Səbətimdəki məhsullar (" + qty + ")";
    }

    if (els.cartThumbs) {
      els.cartThumbs.innerHTML = checkout.items
        .slice(0, 3)
        .map(function (item) {
          return (
            '<img src="' +
            esc(resolveImg(item.image_url || item.image)) +
            '" alt="" class="checkout-cart-thumb" />'
          );
        })
        .join("");
    }

    if (els.itemsList) {
      els.itemsList.innerHTML = checkout.items
        .map(function (item) {
          var itemQty = Number(item.qty) || 1;
          var price = Number(item.price) || 0;
          var unit = formatMoney(price);
          var line = formatMoney(price * itemQty);
          return (
            '<li class="checkout-item">' +
            '<img class="checkout-item__img" src="' +
            esc(resolveImg(item.image_url || item.image)) +
            '" alt="" loading="lazy" />' +
            '<div class="checkout-item__info">' +
            '<p class="checkout-item__name">' +
            esc(item.name || "Məhsul") +
            "</p>" +
            '<p class="checkout-item__meta">' +
            unit +
            "</p>" +
            "</div>" +
            '<div class="checkout-item__right">' +
            '<span class="checkout-item__qty">×' +
            itemQty +
            "</span>" +
            '<div class="checkout-item__price">' +
            line +
            "</div></div></li>"
          );
        })
        .join("");
    }

    if (els.subtotal) els.subtotal.textContent = formatMoney(subtotal);
    if (els.discount) els.discount.textContent = formatMoney(discountAmt);
    if (els.discountRow) {
      if (discountAmt > 0) els.discountRow.removeAttribute("hidden");
      else els.discountRow.setAttribute("hidden", "");
    }
    if (els.total) els.total.textContent = formatMoney(total);
  }

  function updatePayButton() {
    if (!els.submitBtn || !els.termsCheck) return;
    var termsOk = els.termsCheck.checked;
    els.submitBtn.disabled = !termsOk;
  }

  function setDeliveryType(type) {
    deliveryType = type;
    els.deliveryOptions.forEach(function (opt) {
      var input = opt.querySelector("input");
      var val = input ? input.value : "";
      opt.classList.toggle("is-selected", val === type);
      if (input) input.checked = val === type;
    });

    if (els.courierPanel) els.courierPanel.hidden = type !== "courier";
    if (els.pickupPanel) els.pickupPanel.hidden = type !== "pickup";
    if (els.postPanel) els.postPanel.hidden = type !== "post";

    if (type !== "pickup") {
      selectedCargoCompany = "";
      selectedCargoPoint = null;
      els.cargoCompanies.forEach(function (btn) {
        btn.classList.remove("is-selected");
      });
      if (els.cargoMapWrap) els.cargoMapWrap.hidden = true;
    } else if (!selectedCargoCompany && els.cargoCompanies[0]) {
      selectCargoCompany(els.cargoCompanies[0].dataset.company);
    }
  }

  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = ((lat2 - lat1) * Math.PI) / 180;
    var dLng = ((lng2 - lng1) * Math.PI) / 180;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getUserLocation(callback) {
    if (userLocation) {
      callback(userLocation);
      return;
    }
    if (!navigator.geolocation) {
      callback({ lat: BAKU[0], lng: BAKU[1] });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        callback(userLocation);
      },
      function () {
        callback({ lat: BAKU[0], lng: BAKU[1] });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function selectCargoPoint(point) {
    selectedCargoPoint = point;
    els.cargoPoints.forEach(function (el) {
      el.classList.toggle("is-selected", el.dataset.pointId === point.id);
    });
    cargoMarkers.forEach(function (m) {
      var isSel = m._pointId === point.id;
      m.setIcon(
        L.divIcon({
          className: "cargo-marker" + (isSel ? " cargo-marker--sel" : ""),
          html: "<span></span>",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })
      );
    });
  }

  function renderCargoPoints(companyId) {
    var points = CARGO_POINTS[companyId] || [];
    getUserLocation(function (loc) {
      var withDist = points
        .map(function (p) {
          return Object.assign({}, p, {
            distance: haversine(loc.lat, loc.lng, p.lat, p.lng),
          });
        })
        .sort(function (a, b) {
          return a.distance - b.distance;
        });

      var nearestId = withDist.length ? withDist[0].id : null;

      if (els.cargoPoints) {
        els.cargoPoints.innerHTML = withDist
          .map(function (p) {
            var nearest =
              p.id === nearestId
                ? '<span class="cargo-point__badge">Ən yaxın</span>'
                : "";
            return (
              '<li class="cargo-point' +
              (p.id === nearestId ? " is-nearest" : "") +
              '" data-point-id="' +
              esc(p.id) +
              '">' +
              "<div>" +
              nearest +
              '<p class="cargo-point__name">' +
              esc(p.name) +
              '</p><p class="cargo-point__addr">' +
              esc(p.address) +
              " · " +
              p.distance.toFixed(1) +
              " km</p></div></li>"
            );
          })
          .join("");

        els.cargoPoints.querySelectorAll(".cargo-point").forEach(function (el) {
          el.addEventListener("click", function () {
            var id = el.dataset.pointId;
            var point = withDist.find(function (x) {
              return x.id === id;
            });
            if (point) {
              selectCargoPoint(point);
              if (cargoMap) cargoMap.setView([point.lat, point.lng], 14);
            }
          });
        });
      }

      initCargoMap(withDist, loc, nearestId);
      if (withDist.length) selectCargoPoint(withDist[0]);
    });
  }

  function initCargoMap(points, userLoc, nearestId) {
    if (typeof L === "undefined" || !els.cargoMap) return;

    if (els.cargoMapWrap) els.cargoMapWrap.hidden = false;

    if (cargoMap) {
      cargoMap.remove();
      cargoMap = null;
      cargoMarkers = [];
    }

    cargoMap = L.map(els.cargoMap, { scrollWheelZoom: false }).setView(
      [userLoc.lat, userLoc.lng],
      12
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(cargoMap);

    L.circleMarker([userLoc.lat, userLoc.lng], {
      radius: 8,
      color: "#f97316",
      fillColor: "#f97316",
      fillOpacity: 0.9,
    })
      .addTo(cargoMap)
      .bindPopup("Sizin mövqeyiniz");

    points.forEach(function (p) {
      var marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "cargo-marker" + (p.id === nearestId ? " cargo-marker--sel" : ""),
          html: "<span></span>",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(cargoMap);

      marker._pointId = p.id;
      marker.bindPopup("<strong>" + esc(p.name) + "</strong><br>" + esc(p.address));
      marker.on("click", function () {
        selectCargoPoint(p);
      });
      cargoMarkers.push(marker);
    });

    setTimeout(function () {
      cargoMap.invalidateSize();
    }, 200);
  }

  function selectCargoCompany(companyId) {
    selectedCargoCompany = companyId;
    selectedCargoPoint = null;
    els.cargoCompanies.forEach(function (btn) {
      btn.classList.toggle("is-selected", btn.dataset.company === companyId);
    });
    renderCargoPoints(companyId);
  }

  function reverseGeocode(lat, lng, inputEl) {
    if (!inputEl) return;
    fetch(
      "https://nominatim.openstreetmap.org/reverse?format=json&lat=" +
        lat +
        "&lon=" +
        lng +
        "&accept-language=az"
    )
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.display_name) inputEl.value = d.display_name;
      })
      .catch(function () {});
  }

  function findMyAddress() {
    var btn = els.findAddressBtn;
    var input = els.addressInput;
    if (!btn || !input) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Axtarılır…';

    getUserLocation(function (loc) {
      userLocation = loc;
      reverseGeocode(loc.lat, loc.lng, input);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i> Ünvanımı tap';
    });
  }

  function validateOrder() {
    if (!deliveryType) {
      alert("Çatdırılma üsulunu seçin.");
      return false;
    }

    if (deliveryType === "courier") {
      var address = (els.addressInput && els.addressInput.value.trim()) || "";
      var building = (els.buildingInput && els.buildingInput.value.trim()) || "";
      var apartment = (els.apartmentInput && els.apartmentInput.value.trim()) || "";
      if (!address) {
        alert("Ünvan daxil edin və ya «Ünvanımı tap» düyməsindən istifadə edin.");
        return false;
      }
      if (!building || !apartment) {
        alert("Bina və mənzil nömrəsini daxil edin.");
        return false;
      }
    }

    if (deliveryType === "pickup") {
      if (!selectedCargoCompany) {
        alert("Gəl al məntəqəsi şirkətini seçin.");
        return false;
      }
      if (!selectedCargoPoint) {
        alert("Məntəqəni seçin.");
        return false;
      }
    }

    if (deliveryType === "post") {
      var city = (els.postCity && els.postCity.value.trim()) || "";
      var office = els.postOffice && els.postOffice.value;
      var recipient = (els.postRecipient && els.postRecipient.value.trim()) || "";
      var phone = (els.postPhone && els.postPhone.value.trim()) || "";
      if (!city || !office || !recipient || !phone) {
        alert("Poçt məlumatlarını tam doldurun.");
        return false;
      }
    }

    if (!els.termsCheck || !els.termsCheck.checked) {
      alert("Ödəniş üçün müqaviləni təsdiqləyin.");
      return false;
    }

    return true;
  }

  function buildOrder() {
    var first = (checkout.items && checkout.items[0]) || {};
    var order = {
      id: pendingOrderId || "BV-" + Date.now().toString().slice(-6),
      date: new Date().toLocaleDateString("az-AZ"),
      createdAt: new Date().toISOString(),
      status: "placed",
      items: checkout.items,
      total: checkout.total,
      seller: getSellerName({ id: first.product_id || first.id || 1 }, 0),
      delivery: { type: deliveryType },
    };

    if (deliveryType === "courier") {
      order.delivery.address = els.addressInput.value.trim();
      order.delivery.building = els.buildingInput.value.trim();
      order.delivery.apartment = els.apartmentInput.value.trim();
      order.delivery.landmark = (els.landmarkInput && els.landmarkInput.value.trim()) || "";
      order.delivery.note = (els.noteInput && els.noteInput.value.trim()) || "";
    } else if (deliveryType === "pickup") {
      order.delivery.company = selectedCargoCompany;
      order.delivery.point = selectedCargoPoint;
    } else if (deliveryType === "post") {
      order.delivery.city = els.postCity.value.trim();
      order.delivery.office = els.postOffice.value;
      order.delivery.recipient = els.postRecipient.value.trim();
      order.delivery.phone = els.postPhone.value.trim();
    }

    return order;
  }

  function saveOrder(order) {
    if (window.BizdevarOrders && BizdevarOrders.saveOrder) {
      BizdevarOrders.saveOrder(order);
      return;
    }
    try {
      var orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      orders.unshift(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      /* ignore */
    }
  }

  function openPaymentModal() {
    if (!validateOrder()) return;
    pendingOrderId = "BV-" + Date.now().toString().slice(-6);
    if (els.paymentModal) {
      els.paymentModal.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
    }
  }

  function closePaymentModal() {
    if (els.paymentModal) {
      els.paymentModal.setAttribute("hidden", "");
      document.body.style.overflow = "";
    }
  }

  function showSuccess(orderId) {
    closePaymentModal();
    if (els.orderForm) els.orderForm.hidden = true;
    if (els.orderSuccess) {
      els.orderSuccess.hidden = false;
      var idEl = document.getElementById("order-success-id");
      if (idEl) idEl.textContent = orderId;
      var track = document.getElementById("order-track-link");
      if (track) track.href = "../sifarislerim/detail.html?id=" + encodeURIComponent(orderId);
      var anim = document.getElementById("order-success-anim");
      if (anim) {
        anim.classList.remove("is-done");
        void anim.offsetWidth;
        anim.classList.add("is-done");
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completePayment() {
    var order = buildOrder();
    if (pendingOrderId) order.id = pendingOrderId;

    function finish(orderId) {
      sessionStorage.removeItem(CHECKOUT_KEY);
      if (window.BizdevarCart) BizdevarCart.clear();
      if (window.BizdevarHeader) BizdevarHeader.setCartBadge(0);
      showSuccess(orderId);
    }

    if (window.BizdevarAPI && BizdevarAPI.orderCreate) {
      BizdevarAPI.orderCreate({
        delivery: order.delivery,
        promo_code: checkout && checkout.promoCode ? checkout.promoCode : "",
        promo_discount_percent: checkout ? checkout.promoDiscountPercent || 0 : 0,
      })
        .then(function (res) {
          var saved = (res && res.order) || order;
          if (window.BizdevarOrders && BizdevarOrders.saveOrder) {
            BizdevarOrders.saveOrder(saved);
          }
          finish(saved.id || order.id);
        })
        .catch(function (err) {
          if (els.paymentModal) els.paymentModal.classList.remove("is-processing");
          if (els.paymentConfirmBtn) {
            els.paymentConfirmBtn.disabled = false;
            els.paymentConfirmBtn.textContent = "Ödənişi tamamla";
          }
          if (err && err.status === 401 && window.BizdevarAuthGuard) {
            window.location.href = BizdevarAuthGuard.loginUrlFor(window.location.pathname);
            return;
          }
          alert((err && err.message) || "Sifariş yaradıla bilmədi. Giriş edib yenidən cəhd edin.");
        });
      return;
    }

    alert("Backend əlaqəsi yoxdur. API serverini işə salın.");
  }

  function confirmPayment() {
    var btn = els.paymentConfirmBtn;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Ödəniş edilir…";
    }
    if (els.paymentModal) els.paymentModal.classList.add("is-processing");

    window.setTimeout(function () {
      completePayment();
      if (els.paymentModal) els.paymentModal.classList.remove("is-processing");
    }, 1800);
  }

  function toggleCart() {
    if (!els.cartToggle || !els.itemsList) return;
    var open = els.cartToggle.getAttribute("aria-expanded") === "true";
    els.cartToggle.setAttribute("aria-expanded", open ? "false" : "true");
    els.itemsList.classList.toggle("is-collapsed", open);
  }

  function bindEvents() {
    els.deliveryOptions.forEach(function (opt) {
      var input = opt.querySelector('input[type="radio"]');
      input.addEventListener("change", function () {
        if (input.checked) setDeliveryType(input.value);
      });
    });

    els.cargoCompanies.forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectCargoCompany(btn.dataset.company);
      });
    });

    if (els.findAddressBtn) {
      els.findAddressBtn.addEventListener("click", findMyAddress);
    }

    if (els.termsCheck) {
      els.termsCheck.addEventListener("change", updatePayButton);
    }

    if (els.submitBtn) {
      els.submitBtn.addEventListener("click", openPaymentModal);
    }

    if (els.paymentConfirmBtn) {
      els.paymentConfirmBtn.addEventListener("click", confirmPayment);
    }

    if (els.paymentModal) {
      els.paymentModal.querySelectorAll("[data-payment-close]").forEach(function (el) {
        el.addEventListener("click", closePaymentModal);
      });
    }

    if (els.cartToggle) {
      els.cartToggle.addEventListener("click", toggleCart);
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && els.paymentModal && !els.paymentModal.hasAttribute("hidden")) {
        closePaymentModal();
      }
    });
  }

  function init() {
    checkout = loadCheckout();
    if (!checkout || !checkout.items || !checkout.items.length) {
      window.location.href = "../sebet/";
      return;
    }

    els = {
      itemsList: document.getElementById("order-items"),
      cartLabel: document.getElementById("order-cart-label"),
      cartThumbs: document.getElementById("order-cart-thumbs"),
      cartToggle: document.getElementById("order-cart-toggle"),
      subtotal: document.getElementById("order-subtotal"),
      discount: document.getElementById("order-discount"),
      discountRow: document.getElementById("order-discount-row"),
      total: document.getElementById("order-total"),
      deliveryOptions: Array.prototype.slice.call(
        document.querySelectorAll(".delivery-card")
      ),
      courierPanel: document.getElementById("courier-panel"),
      pickupPanel: document.getElementById("pickup-panel"),
      postPanel: document.getElementById("post-panel"),
      cargoCompanies: Array.prototype.slice.call(
        document.querySelectorAll(".cargo-tab")
      ),
      cargoMapWrap: document.getElementById("cargo-map-wrap"),
      cargoMap: document.getElementById("cargo-map"),
      cargoPoints: document.getElementById("cargo-points"),
      findAddressBtn: document.getElementById("find-address-btn"),
      addressInput: document.getElementById("courier-address"),
      buildingInput: document.getElementById("courier-building"),
      apartmentInput: document.getElementById("courier-apartment"),
      landmarkInput: document.getElementById("courier-landmark"),
      noteInput: document.getElementById("courier-note"),
      postCity: document.getElementById("post-city"),
      postOffice: document.getElementById("post-office"),
      postRecipient: document.getElementById("post-recipient"),
      postPhone: document.getElementById("post-phone"),
      termsCheck: document.getElementById("order-terms-check"),
      submitBtn: document.getElementById("submit-order"),
      orderForm: document.getElementById("order-form"),
      orderSuccess: document.getElementById("order-success"),
      paymentModal: document.getElementById("payment-modal"),
      paymentConfirmBtn: document.getElementById("payment-confirm-btn"),
    };

    renderSummary();
    setDeliveryType("pickup");
    updatePayButton();
    bindEvents();
  }

  function boot() {
    if (window.BizdevarAuthGuard) {
      BizdevarAuthGuard.requireAuth()
        .then(function () {
          init();
        })
        .catch(function () {});
      return;
    }
    init();
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
