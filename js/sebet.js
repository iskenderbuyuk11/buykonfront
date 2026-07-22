(function () {
  var API = window.BizdevarAPI;

  var groupsEl = document.getElementById("cart-groups");
  var emptyEl = document.getElementById("cart-empty");
  var countEl = document.getElementById("cart-count");

  var subtotalEl = document.getElementById("summary-subtotal");
  var prodSaveRow = document.getElementById("summary-product-save-row");
  var prodSaveEl = document.getElementById("summary-product-save");
  var promoRow = document.getElementById("summary-promo-row");
  var promoRateEl = document.getElementById("summary-promo-rate");
  var promoSaveEl = document.getElementById("summary-promo-save");
  var gainRow = document.getElementById("summary-gain-row");
  var gainEl = document.getElementById("summary-gain");
  var totalEl = document.getElementById("summary-total");

  var promoForm = document.getElementById("promo-form");
  var promoMessage = document.getElementById("promo-message");
  var confirmBtn = document.getElementById("confirm-cart");

  var recWrap = document.getElementById("recommended");
  var recList = document.getElementById("recommended-list");

  var promoDiscountPercent = 0;
  var currentItems = [];
  var busy = false;
  var recommendedDone = false;

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

  function soldCount(product) {
    return product && product.sold_count != null ? Number(product.sold_count) || 0 : 0;
  }

  function vendorName(product) {
    return (product && product.vendor_name) || "";
  }

  function ratingStars(product) {
    return Math.max(0, Math.min(5, Number((product && product.rating_stars) || 0) || 0));
  }

  function starsHtml(value) {
    var filled = Math.round(value);
    var out = "";
    for (var i = 1; i <= 5; i++) {
      out += '<span class="' + (i <= filled ? "is-filled" : "is-empty") + '">★</span>';
    }
    return out;
  }

  function recMetaHtml(product) {
    var rating = ratingStars(product);
    return (
      '<div class="rec-card__meta">' +
      '<span class="rec-card__stars" aria-label="' + esc(rating.toFixed(1)) + ' / 5 ulduz">' +
      starsHtml(rating) +
      '<strong>' + esc(rating.toFixed(1)) + "/5</strong></span>" +
      '<span><strong>' + esc(soldCount(product)) + "</strong> satıldı</span>" +
      "</div>" +
      '<div class="rec-card__store">' +
      '<span class="rec-card__store-dot" aria-hidden="true"></span>' +
      '<span>' + esc(vendorName(product)) + "</span>" +
      "</div>"
    );
  }

  function unitPrice(item) {
    return Number(item && item.price) || 0;
  }

  function basePrice(item) {
    var b = Number(item && item.base_price) || 0;
    return b > unitPrice(item) ? b : 0;
  }

  function qtyOf(item) {
    return Number(item && (item.qty != null ? item.qty : item.quantity)) || 1;
  }

  function nameOf(item) {
    return (item && item.name) || "Məhsul";
  }

  function imageOf(item) {
    var src = (item && (item.image_url || item.image)) || "";
    if (!src) return "";
    var cfg = window.BizdevarSiteConfig;
    if (cfg && typeof cfg.resolveMediaUrl === "function") {
      return cfg.resolveMediaUrl(src);
    }
    return src;
  }

  function vendorOf(item) {
    return (item && item.vendor_name) || "BizdəVar";
  }

  function idOf(item) {
    return Number(item && (item.product_id || item.id)) || 0;
  }

  function groupByVendor(items) {
    var map = {};
    var order = [];
    items.forEach(function (it) {
      var v = vendorOf(it);
      if (!map[v]) {
        map[v] = [];
        order.push(v);
      }
      map[v].push(it);
    });
    return order.map(function (v) {
      return { vendor: v, items: map[v] };
    });
  }

  function itemHtml(item) {
    var id = idOf(item);
    var name = esc(nameOf(item));
    var qty = qtyOf(item);
    var unit = unitPrice(item);
    var base = basePrice(item);
    var image = imageOf(item);
    var lineTotal = unit * qty;

    var media = image
      ? '<img src="' + esc(image) + '" alt="" loading="lazy" />'
      : "<span>" + name.charAt(0).toUpperCase() + "</span>";

    var pricesHtml =
      (base
        ? '<span class="cart-item__old">' + formatMoney(base) + "</span>"
        : "") +
      '<span class="cart-item__new">' + formatMoney(unit) + "</span>" +
      (base
        ? '<span class="cart-item__save">-' +
          Math.round(((base - unit) / base) * 100) +
          "%</span>"
        : "");

    return (
      '<li class="cart-item" data-id="' + id + '">' +
      '<div class="cart-item__media">' + media + "</div>" +
      '<div class="cart-item__content">' +
      '<h3 class="cart-item__name">' + name + "</h3>" +
      '<div class="cart-item__prices">' + pricesHtml + "</div>" +
      '<div class="cart-item__controls">' +
      '<div class="qty-stepper">' +
      '<button type="button" class="qty-stepper__btn" data-action="dec" data-id="' +
      id +
      '" aria-label="Azalt"' +
      (qty <= 1 ? " disabled" : "") +
      ">−</button>" +
      '<span class="qty-stepper__value">' + qty + "</span>" +
      '<button type="button" class="qty-stepper__btn" data-action="inc" data-id="' +
      id +
      '" aria-label="Artır">+</button>' +
      "</div>" +
      '<button type="button" class="cart-item__remove" data-action="remove" data-id="' +
      id +
      '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
      "<span>Sil</span></button>" +
      "</div>" +
      "</div>" +
      '<div class="cart-item__line">' +
      '<span class="cart-item__line-total">' + formatMoney(lineTotal) + "</span>" +
      "</div>" +
      "</li>"
    );
  }

  function groupHtml(group) {
    var items = group.items.map(itemHtml).join("");
    return (
      '<div class="cart-group">' +
      '<div class="cart-group__head">' +
      '<span class="cart-group__seller"><i class="fa-solid fa-store"></i> ' + esc(group.vendor) + "</span>" +
      '<span class="cart-group__badge"><i class="fa-solid fa-circle-check"></i> Etibarlı satıcı</span>' +
      "</div>" +
      '<ul class="cart-items">' + items + "</ul>" +
      "</div>"
    );
  }

  function renderItems(items) {
    currentItems = items || [];

    if (countEl) {
      var totalQty = currentItems.reduce(function (s, it) {
        return s + qtyOf(it);
      }, 0);
      countEl.textContent = totalQty ? "· " + totalQty + " məhsul" : "";
    }

    if (!currentItems.length) {
      if (groupsEl) groupsEl.innerHTML = "";
      if (emptyEl) emptyEl.removeAttribute("hidden");
      return;
    }

    if (emptyEl) emptyEl.setAttribute("hidden", "");
    if (groupsEl) {
      groupsEl.innerHTML = groupByVendor(currentItems).map(groupHtml).join("");
    }
  }

  function show(el, on) {
    if (!el) return;
    if (on) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  function renderTotals(items) {
    items = items || [];
    var subtotal = 0;
    var productSave = 0;

    items.forEach(function (it) {
      var qty = qtyOf(it);
      var unit = unitPrice(it);
      var base = basePrice(it);
      subtotal += unit * qty;
      if (base) productSave += (base - unit) * qty;
    });

    var promoSave = subtotal * (promoDiscountPercent / 100);
    var total = Math.max(0, subtotal - promoSave);
    var gain = productSave + promoSave;

    if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);

    if (productSave > 0) {
      if (prodSaveEl) prodSaveEl.textContent = "-" + formatMoney(productSave);
      show(prodSaveRow, true);
    } else {
      show(prodSaveRow, false);
    }

    if (promoDiscountPercent > 0) {
      if (promoRateEl) promoRateEl.textContent = promoDiscountPercent + "%";
      if (promoSaveEl) promoSaveEl.textContent = "-" + formatMoney(promoSave);
      show(promoRow, true);
    } else {
      show(promoRow, false);
    }

    if (gain > 0) {
      if (gainEl) gainEl.textContent = "-" + formatMoney(gain);
      show(gainRow, true);
    } else {
      show(gainRow, false);
    }

    if (totalEl) totalEl.textContent = formatMoney(total);
  }

  function setHeaderBadge(qty) {
    if (window.BizdevarHeader && typeof BizdevarHeader.setCartBadge === "function") {
      BizdevarHeader.setCartBadge(qty);
    }
  }

  function applyCartData(data) {
    var items = (data && data.items) || [];
    renderItems(items);
    renderTotals(items);
    setHeaderBadge((data && data.total_qty) != null
      ? data.total_qty
      : items.reduce(function (s, it) { return s + qtyOf(it); }, 0));

    if (!recommendedDone) {
      recommendedDone = true;
      renderRecommended();
    }
  }

  function loadCart() {
    if (API && API.cartGet) {
      API.cartGet()
        .then(applyCartData)
        .catch(function () {
          applyCartData({ items: [] });
        });
      return;
    }
    if (window.BizdevarCart) {
      applyCartData(BizdevarCart.getPayload());
      return;
    }
    applyCartData({ items: [] });
  }

  function changeQty(id, qty) {
    if (busy || !API || !API.cartUpdate) return;
    busy = true;
    if (groupsEl) groupsEl.classList.add("is-busy");
    API.cartUpdate(id, qty)
      .then(applyCartData)
      .catch(function () {})
      .finally(function () {
        busy = false;
        if (groupsEl) groupsEl.classList.remove("is-busy");
      });
  }

  function removeItem(id) {
    if (busy || !API || !API.cartRemove) return;
    busy = true;
    API.cartRemove(id)
      .then(applyCartData)
      .catch(function () {})
      .finally(function () {
        busy = false;
      });
  }

  if (groupsEl) {
    groupsEl.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var id = Number(btn.getAttribute("data-id"));
      if (!id) return;
      var action = btn.getAttribute("data-action");

      var item = currentItems.filter(function (it) {
        return idOf(it) === id;
      })[0];
      var qty = item ? qtyOf(item) : 1;

      if (action === "inc") changeQty(id, qty + 1);
      else if (action === "dec") changeQty(id, qty - 1);
      else if (action === "remove") removeItem(id);
    });
  }

  /* ---- Tövsiyə olunan məhsullar ---- */
  function renderRecommended() {
    if (!API || !API.products || !recList) return;
    API.products("all")
      .then(function (data) {
        var list = (data && data.products) || [];
        var inCart = {};
        currentItems.forEach(function (it) {
          inCart[idOf(it)] = true;
        });
        var picks = list
          .filter(function (p) {
            return !inCart[Number(p.id)];
          })
          .slice(0, 6);

        if (!picks.length) {
          show(recWrap, false);
          return;
        }

        recList.innerHTML = picks
          .map(function (p) {
            var img = imageOf(p);
            var media = img
              ? '<img src="' + esc(img) + '" alt="" loading="lazy" />'
              : "";
            return (
              '<div class="rec-card">' +
              '<div class="rec-card__media">' + media + "</div>" +
              '<div class="rec-card__body">' +
              '<h3 class="rec-card__name">' + esc(p.name) + "</h3>" +
              '<span class="rec-card__price">' + formatMoney(p.price) + "</span>" +
              recMetaHtml(p) +
              '<button type="button" class="rec-card__add" data-rec-id="' +
              esc(String(p.id)) +
              '">Səbətə əlavə et</button>' +
              "</div>" +
              "</div>"
            );
          })
          .join("");
        show(recWrap, true);

        recList.querySelectorAll("[data-rec-id]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var id = Number(btn.getAttribute("data-rec-id"));
            if (!id || !API.cartAdd) return;
            btn.disabled = true;
            API.cartAdd(id, 1)
              .then(function () {
                loadCart();
                renderRecommended();
              })
              .catch(function (err) {
                alert(err.message || "Səbətə əlavə olunmadı");
              })
              .finally(function () {
                btn.disabled = false;
              });
          });
        });
      })
      .catch(function () {
        show(recWrap, false);
      });
  }

  /* ---- Endirim kodu ---- */
  function setPromoMsg(text, ok) {
    if (!promoMessage) return;
    promoMessage.textContent = text || "";
    promoMessage.className =
      "promo-block__message" + (text ? (ok ? " promo-block__message--ok" : " promo-block__message--err") : "");
  }

  if (promoForm) {
    promoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("promo-code");
      var code = String((input && input.value) || "").trim().toUpperCase();

      if (!code) {
        promoDiscountPercent = 0;
        setPromoMsg("Endirim kodu daxil edilməyib.", false);
        renderTotals(currentItems);
        return;
      }

      if (!(API && API.validatePromo)) {
        setPromoMsg("Endirim kodu yoxlanıla bilmədi.", false);
        return;
      }

      API.validatePromo(code)
        .then(function (res) {
          if (res && res.valid) {
            promoDiscountPercent = Number(res.discount_percent) || 0;
            setPromoMsg("Endirim kodu tətbiq edildi: " + promoDiscountPercent + "% endirim", true);
          } else {
            promoDiscountPercent = 0;
            setPromoMsg("Endirim kodu etibarsızdır.", false);
          }
          renderTotals(currentItems);
        })
        .catch(function () {
          promoDiscountPercent = 0;
          setPromoMsg("Endirim kodu etibarsızdır.", false);
          renderTotals(currentItems);
        });
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      if (!currentItems.length) {
        alert("Səbət boşdur.");
        return;
      }

      var subtotal = currentItems.reduce(function (sum, item) {
        return sum + unitPrice(item) * qtyOf(item);
      }, 0);
      var promoSave = subtotal * (promoDiscountPercent / 100);
      var total = Math.max(0, subtotal - promoSave);

      var checkoutPayload = {
        items: currentItems,
        subtotal: subtotal,
        promoDiscountPercent: promoDiscountPercent,
        total: total,
      };

      function goCheckout() {
        try {
          sessionStorage.setItem("bizdevar-checkout", JSON.stringify(checkoutPayload));
        } catch (e) {
          /* ignore */
        }
        window.location.href = "../sifaris/";
      }

      if (!API || typeof API.session !== "function") {
        goCheckout();
        return;
      }

      API.session()
        .then(function (session) {
          if (session && session.logged_in) {
            goCheckout();
            return;
          }
          try {
            sessionStorage.setItem("bizdevar-checkout", JSON.stringify(checkoutPayload));
          } catch (e) {
            /* ignore */
          }
          var checkoutPath = new URL("../sifaris/", window.location.href).pathname;
          var loginUrl =
            window.BizdevarAuthGuard && BizdevarAuthGuard.loginUrlFor
              ? BizdevarAuthGuard.loginUrlFor(checkoutPath)
              : "../../pages/login/?next=" + encodeURIComponent(checkoutPath);
          window.location.href = loginUrl;
        })
        .catch(function () {
          var checkoutPath = new URL("../sifaris/", window.location.href).pathname;
          window.location.href =
            (window.BizdevarAuthGuard && BizdevarAuthGuard.loginUrlFor(checkoutPath)) ||
            "../../pages/login/?next=" + encodeURIComponent(checkoutPath);
        });
    });
  }

  loadCart();
})();
