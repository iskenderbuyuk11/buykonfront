(function () {
  "use strict";

  var Store = window.BizdevarOrders;
  if (!Store) return;

  var page = document.body.getAttribute("data-orders-page") || "list";
  var root = document.body.getAttribute("data-root") || "../../";

  var STATUS_HINTS = {
    placed: "Sifarişiniz qəbul olundu və emal gözləyir.",
    packing: "Məhsulunuz anbarımızda diqqətlə paketlənir.",
    cargo: "Sifarişiniz kargo şirkətinə təhvil verildi.",
    delivering: "Kuryer sifarişinizi çatdırmaq üçün yoldadır.",
    delivered: "Sifariş uğurla təhvil verildi. Təşəkkür edirik!",
    cancelled: "Bu sifariş ləğv edilib.",
  };

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function getQueryId() {
    try {
      return (new URLSearchParams(window.location.search).get("id") || "").trim();
    } catch (e) {
      return "";
    }
  }

  function setSceneStatus(sceneEl, status) {
    if (!sceneEl) return;
    var s = Store.normalizeStatus(status);
    sceneEl.setAttribute("data-status", s);
  }

  function renderTimeline(container, order, compact) {
    if (!container || !order) return;
    var status = order.status;
    var steps = Store.STATUS_ORDER.slice();
    var html = "";

    if (status === Store.CANCELLED) {
      html =
        '<li class="order-timeline__item is-cancelled">' +
        '<span class="order-timeline__dot"></span>' +
        '<div class="order-timeline__body">' +
        "<strong>" +
        esc(Store.getStatusLabel(Store.CANCELLED)) +
        "</strong>" +
        "<span>Sifariş ləğv olunub</span></div></li>";
    } else {
      html = steps
        .map(function (step) {
          var done = Store.isStepDone(step, status);
          var active = Store.isStepActive(step, status);
          var cls = "order-timeline__item";
          if (done) cls += " is-done";
          if (active) cls += " is-active";
          return (
            "<li class=\"" +
            cls +
            '">' +
            '<span class="order-timeline__dot"></span>' +
            '<div class="order-timeline__body">' +
            "<strong>" +
            esc(Store.getStatusLabel(step)) +
            "</strong>" +
            (active && !compact
              ? "<span>" + esc(STATUS_HINTS[step] || "") + "</span>"
              : active
                ? "<span>Hal-hazırda</span>"
                : done
                  ? "<span>Tamamlandı</span>"
                  : "<span>Gözləyir</span>") +
            "</div></li>"
          );
        })
        .join("");
    }

    container.innerHTML = html;
  }

  function renderDetail(order) {
    var content = document.getElementById("detail-content");
    var missing = document.getElementById("detail-missing");
    if (!order) {
      if (content) content.hidden = true;
      if (missing) missing.hidden = false;
      return;
    }

    if (missing) missing.hidden = true;
    if (content) content.hidden = false;

    var title = document.getElementById("detail-title");
    if (title) title.textContent = "Sifariş № " + order.id;

    var scene = document.getElementById("detail-scene");
    setSceneStatus(scene, order.status);

    var label = document.getElementById("detail-status-label");
    if (label) label.textContent = Store.getStatusLabel(order.status);

    var hint = document.getElementById("detail-status-hint");
    if (hint) hint.textContent = STATUS_HINTS[order.status] || "";

    renderTimeline(document.getElementById("detail-timeline"), order, false);

    var info = document.getElementById("detail-info");
    if (info) {
      info.innerHTML =
        '<div class="order-detail-grid__cell"><span>Sifariş nömrəsi</span><strong>' +
        esc(order.id) +
        "</strong></div>" +
        '<div class="order-detail-grid__cell"><span>Tarix</span><strong>' +
        esc(order.date) +
        "</strong></div>" +
        '<div class="order-detail-grid__cell"><span>Satıcı</span><strong>' +
        esc(order.seller) +
        "</strong></div>" +
        '<div class="order-detail-grid__cell"><span>Məbləğ</span><strong>' +
        esc(Store.formatMoney(order.total)) +
        "</strong></div>";
    }

    var itemsEl = document.getElementById("detail-items");
    if (itemsEl) {
      itemsEl.innerHTML = (order.items || [])
        .map(function (item) {
          var qty = Number(item.qty) || 1;
          var price = Number(item.price) || 0;
          return (
            '<li class="order-detail-item">' +
            '<img src="' +
            esc(Store.resolveImg(item.image_url || item.image, root)) +
            '" alt="" loading="lazy" />' +
            '<div class="order-detail-item__body">' +
            "<strong>" +
            esc(item.name || "Məhsul") +
            "</strong>" +
            "<span>" +
            qty +
            " ədəd · " +
            esc(Store.formatMoney(price * qty)) +
            "</span></div></li>"
          );
        })
        .join("");
    }
  }

  function renderList() {
    var listEl = document.getElementById("orders-list");
    var emptyEl = document.getElementById("orders-empty");
    var countEl = document.getElementById("orders-count");
    if (!listEl) return;

    var orders = Store.getAll();

    if (countEl) {
      if (orders.length) {
        countEl.textContent = orders.length + " sifariş";
        countEl.removeAttribute("hidden");
      } else {
        countEl.setAttribute("hidden", "");
      }
    }

    if (!orders.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    listEl.innerHTML = orders
      .map(function (order) {
        var tone = Store.getStatusTone(order.status);
        var img = Store.resolveImg(order.productImage, root);
        var title =
          order.itemCount > 1
            ? order.productName + " +" + (order.itemCount - 1) + " məhsul"
            : order.productName;

        return (
          '<li class="my-order-row">' +
          '<img class="my-order-row__img" src="' +
          esc(img) +
          '" alt="" loading="lazy" />' +
          '<div class="my-order-row__main">' +
          '<div class="my-order-row__top">' +
          "<strong>" +
          esc(title) +
          "</strong>" +
          '<span class="my-order-badge my-order-badge--' +
          esc(tone) +
          '">' +
          esc(Store.getStatusLabel(order.status)) +
          "</span></div>" +
          '<div class="my-order-row__meta">' +
          "<span><b>№</b> " +
          esc(order.id) +
          "</span>" +
          "<span><b>Satıcı:</b> " +
          esc(order.seller) +
          "</span>" +
          "<span><b>Tarix:</b> " +
          esc(order.date) +
          "</span>" +
          "<span><b>Məbləğ:</b> " +
          esc(Store.formatMoney(order.total)) +
          "</span></div></div>" +
          '<a class="my-order-row__btn" href="detail.html?id=' +
          encodeURIComponent(order.id) +
          '"><i class="fa-solid fa-arrow-right"></i> Ətraflı</a></li>'
        );
      })
      .join("");
  }

  function initDetail() {
    var id = getQueryId();
    var order = Store.getById(id);
    renderDetail(order);
  }

  function initTest() {
    var select = document.getElementById("test-order-select");
    var statusWrap = document.getElementById("test-status-buttons");
    var scene = document.getElementById("test-scene");
    var label = document.getElementById("test-status-label");
    var timeline = document.getElementById("test-timeline");
    var openLink = document.getElementById("test-open-detail");
    var resetBtn = document.getElementById("test-reset-demo");

    var orders = Store.getAll();
    var currentId = orders.length ? orders[0].id : "";

    function refreshSelect() {
      orders = Store.getAll();
      if (!select) return;
      select.innerHTML = orders
        .map(function (o) {
          return (
            '<option value="' +
            esc(o.id) +
            '">' +
            esc(o.id) +
            " — " +
            esc(Store.getStatusShort(o.status)) +
            "</option>"
          );
        })
        .join("");
      if (currentId) select.value = currentId;
    }

    function getSelectedOrder() {
      if (select) currentId = select.value;
      return Store.getById(currentId);
    }

    function updatePreview(order) {
      if (!order) return;
      setSceneStatus(scene, order.status);
      if (label) label.textContent = Store.getStatusLabel(order.status);
      renderTimeline(timeline, order, true);
      if (openLink) openLink.href = "detail.html?id=" + encodeURIComponent(order.id);
    }

    if (statusWrap) {
      var allStatuses = Store.STATUS_ORDER.concat([Store.CANCELLED]);
      statusWrap.innerHTML = allStatuses
        .map(function (st) {
          return (
            '<button type="button" class="orders-test__status-btn" data-status="' +
            esc(st) +
            '">' +
            esc(Store.getStatusLabel(st)) +
            "</button>"
          );
        })
        .join("");

      statusWrap.querySelectorAll("[data-status]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var st = btn.getAttribute("data-status");
          var order = getSelectedOrder();
          if (!order) return;
          var updated = Store.updateStatus(order.id, st);
          refreshSelect();
          select.value = order.id;
          updatePreview(updated || Store.getById(order.id));
          statusWrap.querySelectorAll(".orders-test__status-btn").forEach(function (b) {
            b.classList.toggle("is-active", b.getAttribute("data-status") === st);
          });
        });
      });
    }

    if (select) {
      select.addEventListener("change", function () {
        currentId = select.value;
        var order = getSelectedOrder();
        updatePreview(order);
        if (statusWrap && order) {
          statusWrap.querySelectorAll(".orders-test__status-btn").forEach(function (b) {
            b.classList.toggle("is-active", b.getAttribute("data-status") === order.status);
          });
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        Store.resetDemo();
        refreshSelect();
        var order = getSelectedOrder();
        updatePreview(order);
      });
    }

    refreshSelect();
    updatePreview(getSelectedOrder());
  }

  function syncFromAPI(done) {
    if (!window.BizdevarAPI || !BizdevarAPI.ordersList) {
      if (done) done();
      return;
    }
    BizdevarAPI.ordersList()
      .then(function (data) {
        var list = (data && data.orders) || [];
        if (list.length && window.BizdevarOrders) {
          try {
            localStorage.setItem(Store.ORDERS_KEY, JSON.stringify(list));
          } catch (e) {
            /* ignore */
          }
        }
      })
      .catch(function () {})
      .finally(function () {
        if (done) done();
      });
  }

  function init() {
    syncFromAPI(function () {
      if (page === "list") renderList();
      else if (page === "detail") initDetail();
      else if (page === "test") initTest();
    });
  }

  function boot() {
    if (window.BizdevarAuthGuard) {
      BizdevarAuthGuard.requireAuth().then(init).catch(function () {});
      return;
    }
    init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
