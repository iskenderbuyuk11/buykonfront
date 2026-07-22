/* ============================================================
   BUYKON CLUB · Şans çarxı
   Konfiqurasiya: js/wheel-config.js (admin paneldən idarə olunur)
   Canlı şərtlər · həftəlik cooldown · level/XP/streak · reveal
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Konfiqurasiya ---------- */
  var WC = window.BuykonWheelConfig;
  var CONFIG = WC ? WC.get() : { requirements: [], prizes: [] };
  var PRIZES = CONFIG.prizes;

  var TIERS = ["Yeni üzv", "Bürünc üzv", "Gümüş üzv", "Qızıl üzv", "Platin üzv", "Elmas üzv"];
  var XP_PER_LEVEL = 300;
  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  var SPIN_MS = 5200;

  var useBackend = !!(window.BizdevarAPI && typeof BizdevarAPI.rewardWheelStatus === "function");
  var serverStatus = null;
  var serverReady = false;
  var loggedIn = false;
  var STORAGE_KEY = "buykon_reward_v1";

  function loadLocalState() {
    try {
      var s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        lastSpinAt: Number(s.lastSpinAt) || 0,
        xp: Number(s.xp) || 0,
        streak: Number(s.streak) || 0,
        history: Array.isArray(s.history) ? s.history : [],
      };
    } catch (e) {
      return { lastSpinAt: 0, xp: 0, streak: 0, history: [] };
    }
  }

  function saveLocalState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  var localState = loadLocalState();

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function icon(key, size) {
    return WC ? WC.icon(key, size) : "";
  }

  /* ---------- Server status ---------- */
  function syncLoggedIn(session) {
    loggedIn = !!(session && session.logged_in);
    return loggedIn;
  }

  function refreshServerStatus() {
    if (!useBackend) return Promise.resolve(null);

    var sessionPromise =
      window.BizdevarAPI && typeof BizdevarAPI.session === "function"
        ? BizdevarAPI.session().catch(function () {
            return { logged_in: false };
          })
        : Promise.resolve({ logged_in: false });

    return sessionPromise
      .then(function (sess) {
        syncLoggedIn(sess);
        return BizdevarAPI.rewardWheelStatus();
      })
      .then(function (st) {
        serverStatus = st || null;
        serverReady = true;
        if (st && st.logged_in !== undefined) syncLoggedIn(st);
        renderAll();
        return st;
      })
      .catch(function () {
        serverStatus = null;
        serverReady = false;
        renderAll();
        return null;
      });
  }

  function usingLocalSpin() {
    return loggedIn && !serverReady;
  }

  function serverXp() {
    if (serverStatus) return Number(serverStatus.xp) || 0;
    if (usingLocalSpin()) return localState.xp;
    return 0;
  }

  function weeklyAvailable() {
    if (loggedIn && serverStatus) {
      return Number(serverStatus.spins_remaining) > 0;
    }
    if (usingLocalSpin()) {
      return !localState.lastSpinAt || Date.now() - localState.lastSpinAt >= WEEK_MS;
    }
    return true;
  }

  function cooldownMs() {
    if (loggedIn && serverStatus) {
      return Number(serverStatus.cooldown_ms) || 0;
    }
    if (usingLocalSpin() && localState.lastSpinAt) {
      return Math.max(0, localState.lastSpinAt + WEEK_MS - Date.now());
    }
    return 0;
  }

  /* ---------- DOM refs ---------- */
  function $(id) {
    return document.getElementById(id);
  }

  var els = {};
  var currentRotation = 0;
  var isSpinning = false;
  var countdownTimer = null;
  var prevDone = {};
  var reducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Şərtlər (canlı) ---------- */
  function cartItems() {
    try {
      return (window.BizdevarCart && BizdevarCart.getItems()) || [];
    } catch (e) {
      return [];
    }
  }
  function cartCount() {
    return cartItems().reduce(function (s, it) {
      return s + (Number(it.qty) || 1);
    }, 0);
  }
  function cartTotal() {
    return cartItems().reduce(function (s, it) {
      return s + (Number(it.price) || 0) * (Number(it.qty) || 1);
    }, 0);
  }
  function favCount() {
    try {
      return window.BizdevarFavorites ? BizdevarFavorites.getIds().length : 0;
    } catch (e) {
      return 0;
    }
  }

  function reqValue(type) {
    switch (type) {
      case "cart_count": return cartCount();
      case "cart_total": return cartTotal();
      case "favorites_count": return favCount();
      case "review":
        if (loggedIn && serverStatus && serverStatus.requirements) {
          var rev = serverStatus.requirements.find(function (r) { return r.type === "review"; });
          return rev ? Number(rev.value) || 0 : 0;
        }
        return 0;
      default: return 0;
    }
  }

  function reqText(type, value, target) {
    if (type === "review") return value >= target ? "Tamam" : "0 / 1";
    if (type === "cart_total") return Math.min(Math.round(value), target) + " / " + target + " ₼";
    return Math.min(value, target) + " / " + target;
  }

  function requirements() {
    if (loggedIn && serverStatus && Array.isArray(serverStatus.requirements)) {
      return serverStatus.requirements.map(function (r) {
        return {
          key: r.type,
          type: r.type,
          title: r.title,
          icon: r.icon,
          value: Number(r.value) || 0,
          target: Number(r.target) || 1,
          text: r.text,
        };
      });
    }
    return (CONFIG.requirements || [])
      .filter(function (r) { return r.enabled !== false; })
      .map(function (r) {
        var value = reqValue(r.type);
        return {
          key: r.type,
          type: r.type,
          title: r.title,
          icon: r.icon,
          value: value,
          target: r.target,
          text: reqText(r.type, value, r.target),
        };
      });
  }

  function allRequirementsDone(reqs) {
    reqs = reqs || requirements();
    if (!reqs.length) return false;
    if (loggedIn && serverStatus && serverStatus.progress_percent != null) {
      return Number(serverStatus.progress_percent) >= 100;
    }
    return reqs.every(function (r) { return r.value >= r.target; });
  }

  function canSpinNow() {
    if (isSpinning || !loggedIn) return false;
    if (serverReady && serverStatus) return !!serverStatus.can_spin;
    return allRequirementsDone() && weeklyAvailable();
  }

  function pickWinner() {
    var total = PRIZES.reduce(function (s, p) { return s + (Number(p.weight) || 1); }, 0);
    var r = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < PRIZES.length; i++) {
      acc += Number(PRIZES[i].weight) || 1;
      if (r <= acc) return i;
    }
    return PRIZES.length - 1;
  }

  function beginSpinUi() {
    isSpinning = true;
    if (els.cta) els.cta.classList.add("is-spinning");
    if (els.wheel) els.wheel.classList.remove("is-ready");
    if (els.disk) {
      els.disk.classList.remove("is-idle");
      els.disk.classList.add("is-spinning");
    }
    renderCta();
  }

  function finishLocalSpin(winIndex) {
    var prize = PRIZES[winIndex];
    localState.history.unshift({
      icon: prize.icon,
      label: prize.label,
      short: prize.short,
      at: Date.now(),
    });
    localState.history = localState.history.slice(0, 10);
    localState.xp += Number(prize.xp) || 20;
    if (!prize.respin) {
      var gap = localState.lastSpinAt ? Date.now() - localState.lastSpinAt : 0;
      if (localState.lastSpinAt && gap <= WEEK_MS * 2) localState.streak += 1;
      else localState.streak = 1;
      localState.lastSpinAt = Date.now();
    }
    saveLocalState(localState);
  }

  function spinLocal() {
    beginSpinUi();
    var winIndex = pickWinner();
    var prize = PRIZES[winIndex];
    animateToIndex(winIndex, prize, function () {
      finishLocalSpin(winIndex);
      renderAll();
    });
  }

  /* ---------- Çarx SVG ---------- */
  var SVG_NS = "http://www.w3.org/2000/svg";

  function polar(cx, cy, r, deg) {
    var rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function wedge(cx, cy, r, a0, a1) {
    var s = polar(cx, cy, r, a1);
    var e = polar(cx, cy, r, a0);
    var large = a1 - a0 <= 180 ? 0 : 1;
    return "M" + cx + " " + cy + " L" + s.x + " " + s.y +
      " A" + r + " " + r + " 0 " + large + " 0 " + e.x + " " + e.y + " Z";
  }

  function iconGroup(key, cx, cy, rot, px, color) {
    var g = document.createElementNS(SVG_NS, "g");
    var s = px / 24;
    g.setAttribute("transform",
      "translate(" + cx + " " + cy + ") rotate(" + rot + ") scale(" + s + ") translate(-12 -12)");
    g.setAttribute("fill", "none");
    g.setAttribute("stroke", color);
    g.setAttribute("stroke-width", "1.9");
    g.setAttribute("stroke-linecap", "round");
    g.setAttribute("stroke-linejoin", "round");
    try {
      var doc = new DOMParser().parseFromString(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
          (WC ? WC.iconInner(key) : "") + "</svg>",
        "image/svg+xml"
      );
      var node = doc.documentElement;
      for (var i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType === 1) {
          g.appendChild(document.importNode(node.childNodes[i], true));
        }
      }
    } catch (e) {
      /* ignore */
    }
    return g;
  }

  function buildWheel(size) {
    var n = PRIZES.length;
    var cx = size / 2;
    var cy = size / 2;
    var r = size / 2;
    var seg = 360 / n;

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + size + " " + size);
    svg.setAttribute("aria-hidden", "true");

    var defs = document.createElementNS(SVG_NS, "defs");
    defs.innerHTML =
      '<radialGradient id="rwG-orange" cx="50%" cy="50%" r="60%">' +
      '<stop offset="0%" stop-color="#ffbd5e"/><stop offset="70%" stop-color="#ff8a00"/><stop offset="100%" stop-color="#e5730a"/>' +
      "</radialGradient>" +
      '<radialGradient id="rwG-cream" cx="50%" cy="50%" r="60%">' +
      '<stop offset="0%" stop-color="#fffaf3"/><stop offset="100%" stop-color="#ffddb0"/>' +
      "</radialGradient>";
    svg.appendChild(defs);

    for (var i = 0; i < n; i++) {
      var a0 = i * seg;
      var a1 = (i + 1) * seg;
      var p = PRIZES[i];
      var mid = a0 + seg / 2;
      var ink = p.tone === "orange" ? "#ffffff" : "#8a4200";

      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", wedge(cx, cy, r, a0, a1));
      path.setAttribute("fill", p.tone === "orange" ? "url(#rwG-orange)" : "url(#rwG-cream)");
      path.setAttribute("stroke", "#ffffff");
      path.setAttribute("stroke-width", "2");
      svg.appendChild(path);

      // ikon (slice içində)
      var ip = polar(cx, cy, r * 0.64, mid);
      svg.appendChild(iconGroup(p.icon, ip.x, ip.y, mid, size < 300 ? 18 : 22, ink));

      // qısa mətn
      var lp = polar(cx, cy, r * 0.36, mid);
      var label = document.createElementNS(SVG_NS, "text");
      label.setAttribute("x", lp.x);
      label.setAttribute("y", lp.y);
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dominant-baseline", "central");
      label.setAttribute("fill", ink);
      label.setAttribute("font-size", size < 300 ? "9.5" : "11");
      label.setAttribute("font-weight", "800");
      label.setAttribute("font-family", "'Plus Jakarta Sans', sans-serif");
      label.setAttribute("transform", "rotate(" + (mid + 90) + " " + lp.x + " " + lp.y + ")");
      label.textContent = p.short;
      svg.appendChild(label);
    }

    return svg;
  }

  function mountWheel() {
    if (!els.disk) return;
    els.disk.innerHTML = "";
    els.disk.appendChild(buildWheel(320));
    setRotation(currentRotation, false);
    if (!isSpinning && weeklyAvailable()) els.disk.classList.add("is-idle");
  }

  function setRotation(deg, animate) {
    if (!els.disk) return;
    els.disk.style.transition = animate
      ? "transform " + SPIN_MS + "ms cubic-bezier(0.17, 0.67, 0.12, 0.99)"
      : "none";
    els.disk.style.transform = "rotate(" + deg + "deg)";
  }

  /* ---------- Render ---------- */
  function levelInfo() {
    var xp = serverXp();
    var level = Math.floor(xp / XP_PER_LEVEL) + 1;
    return {
      level: level,
      xpInLevel: xp % XP_PER_LEVEL,
      tier: TIERS[Math.min(level - 1, TIERS.length - 1)],
    };
  }

  function renderLevel() {
    var info = levelInfo();
    if (els.level) els.level.textContent = info.level;
    if (els.tier) els.tier.textContent = info.tier;
    if (els.xp) els.xp.textContent = info.xpInLevel;
    if (els.xpMax) els.xpMax.textContent = XP_PER_LEVEL;
    if (els.xpFill) els.xpFill.style.width = (info.xpInLevel / XP_PER_LEVEL) * 100 + "%";
    if (els.streak) {
      var streak = loggedIn && serverStatus
        ? Number(serverStatus.streak) || 0
        : (usingLocalSpin() ? localState.streak : 0);
      if (streak > 1) {
        els.streak.hidden = false;
        els.streak.querySelector("b").textContent = streak;
      } else {
        els.streak.hidden = true;
      }
    }
  }

  function renderRequirements() {
    if (!els.reqs) return;
    var reqs = requirements();

    els.reqs.innerHTML = reqs
      .map(function (r) {
        var done = r.value >= r.target;
        var pct = Math.min(100, Math.round((r.value / r.target) * 100));
        return (
          '<li class="reward-req' + (done ? " is-done" : "") + '" data-key="' + esc(r.key) + '">' +
          '<span class="reward-req__icon">' + icon(r.icon, 22) +
          '<span class="reward-req__check">' + icon("check", 22) + "</span></span>" +
          '<div class="reward-req__body">' +
          '<div class="reward-req__title">' + esc(r.title) + "</div>" +
          '<div class="reward-req__meta">' +
          '<span class="reward-req__bar"><span class="reward-req__bar-fill" style="width:' + pct + '%"></span></span>' +
          '<span class="reward-req__count">' + esc(r.text) + "</span>" +
          "</div></div>" +
          '<span class="reward-req__status">' + (done ? "Tamamlandı" : "Davam et") + "</span>" +
          "</li>"
        );
      })
      .join("");

    reqs.forEach(function (r) {
      var done = r.value >= r.target;
      if (done && prevDone[r.key] === false) {
        var el = els.reqs.querySelector('[data-key="' + r.key + '"]');
        if (el) {
          el.classList.add("just-done");
          window.setTimeout(function () { el.classList.remove("just-done"); }, 600);
        }
      }
      prevDone[r.key] = done;
    });

    var completed = reqs.filter(function (r) { return r.value >= r.target; }).length;
    var overall = reqs.length ? Math.round((completed / reqs.length) * 100) : 0;
    if (els.progressFill) els.progressFill.style.width = overall + "%";
    if (els.progressPct) els.progressPct.textContent = overall + "%";
  }

  function renderPreview() {
    if (!els.preview) return;
    var seen = {};
    var items = [];
    PRIZES.forEach(function (p) {
      var k = p.icon + "|" + p.short;
      if (seen[k]) return;
      seen[k] = true;
      items.push(p);
    });
    els.preview.innerHTML = items
      .slice(0, 6)
      .map(function (p) {
        return '<span class="reward-chip"><span class="reward-chip__ico">' + icon(p.icon, 15) + "</span>" + esc(p.short) + "</span>";
      })
      .join("");
  }

  function fmtCountdown(ms) {
    if (ms <= 0) return "Hazır";
    var t = Math.floor(ms / 1000);
    var d = Math.floor(t / 86400);
    var h = Math.floor((t % 86400) / 3600);
    var m = Math.floor((t % 3600) / 60);
    var s = t % 60;
    if (d > 0) return d + "g " + h + "s";
    if (h > 0) return h + "s " + m + "d";
    return m + "d " + s + "san";
  }

  function renderStats() {
    var available = weeklyAvailable();
    var spinsLeft = loggedIn && serverStatus
      ? Number(serverStatus.spins_remaining) || 0
      : (usingLocalSpin() ? (weeklyAvailable() ? 1 : 0) : (available ? 1 : 0));
    if (els.spins) els.spins.textContent = String(spinsLeft);

    if (els.countdown) {
      var cd = cooldownMs();
      if (available || cd <= 0) {
        els.countdown.textContent = "Hazır";
        if (els.countdown.parentElement) els.countdown.parentElement.classList.add("reward-stat--live");
      } else {
        els.countdown.textContent = fmtCountdown(cd);
        if (els.countdown.parentElement) els.countdown.parentElement.classList.remove("reward-stat--live");
      }
    }

    if (els.last) {
      var hist = (loggedIn && serverStatus && Array.isArray(serverStatus.history))
        ? serverStatus.history
        : (usingLocalSpin() ? localState.history : []);
      var last = hist[0];
      els.last.innerHTML = last
        ? '<span class="reward-stat__mini">' + icon(last.icon, 15) + "</span>" + esc(last.short || last.label)
        : "—";
    }
  }

  function renderCta() {
    var reqs = requirements();
    var done = allRequirementsDone(reqs);
    var available = weeklyAvailable();
    var canSpin = canSpinNow();

    if (els.wheel) {
      els.wheel.classList.toggle("is-locked", !canSpin && !isSpinning);
      els.wheel.classList.toggle("is-ready", canSpin);
    }
    if (!els.cta) return;
    els.cta.disabled = !canSpin;

    if (isSpinning) {
      els.ctaLabel.textContent = "Fırlanır…";
      els.hint.textContent = "Uğurlar!";
      els.hint.classList.remove("is-ready");
    } else if (!loggedIn) {
      if (!done) {
        var left = reqs.filter(function (r) { return r.value < r.target; }).length;
        els.ctaLabel.textContent = "Şərtləri tamamla";
        els.hint.textContent = left + " şərt qalıb — tamamla və fırlat";
      } else {
        els.ctaLabel.textContent = "Daxil ol və fırlat";
        els.hint.textContent = "Fırlatmaq üçün hesabına daxil ol";
      }
      els.hint.classList.remove("is-ready");
    } else if (!available && ((serverReady && serverStatus) || usingLocalSpin())) {
      els.ctaLabel.textContent = "Növbəti həftə hazır";
      els.hint.textContent = "Yenidən fırlatmağa " + fmtCountdown(cooldownMs()) + " qalıb";
      els.hint.classList.remove("is-ready");
    } else if (!done) {
      var left2 = reqs.filter(function (r) { return r.value < r.target; }).length;
      els.ctaLabel.textContent = "Şərtləri tamamla";
      els.hint.textContent = left2 + " şərt qalıb — tamamla və fırlat";
      els.hint.classList.remove("is-ready");
    } else if (!serverReady) {
      els.ctaLabel.textContent = "Çarxı fırlat";
      els.hint.textContent = "Hər şey hazırdır — uğurlar!";
      els.hint.classList.add("is-ready");
    } else {
      els.ctaLabel.textContent = "Çarxı fırlat";
      els.hint.textContent = "Hər şey hazırdır — uğurlar!";
      els.hint.classList.add("is-ready");
    }
  }

  function renderAll() {
    renderLevel();
    renderRequirements();
    renderPreview();
    renderStats();
    renderCta();
  }

  /* ---------- Partikul partlayışı ---------- */
  function burstParticles() {
    if (!els.particles || reducedMotion) return;
    els.particles.innerHTML = "";
    var colors = ["#ff8a00", "#ffa726", "#ffb74d", "#ffd700", "#fff"];
    for (var i = 0; i < 26; i++) {
      var p = document.createElement("span");
      p.className = "reward-particle";
      var ang = Math.random() * Math.PI * 2;
      var dist = 90 + Math.random() * 90;
      p.style.setProperty("--px", Math.cos(ang) * dist + "px");
      p.style.setProperty("--py", Math.sin(ang) * dist + "px");
      p.style.setProperty("--pr", Math.floor(Math.random() * 360) + "deg");
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      els.particles.appendChild(p);
    }
    window.setTimeout(function () { if (els.particles) els.particles.innerHTML = ""; }, 1000);
  }

  /* ---------- Konfeti ---------- */
  function launchConfetti() {
    var box = els.confetti;
    if (!box || reducedMotion) return;
    box.innerHTML = "";
    var colors = ["#ff8a00", "#ffa726", "#ffd700", "#22c55e", "#0ea5e9", "#ec4899"];
    var shapes = ["●", "■", "★", "✦", "▲"];
    var count = window.innerWidth < 600 ? 60 : 100;
    for (var i = 0; i < count; i++) {
      var c = document.createElement("span");
      c.className = "rw-confetti-piece";
      c.textContent = shapes[Math.floor(Math.random() * shapes.length)];
      c.style.left = Math.random() * 100 + "%";
      c.style.color = colors[Math.floor(Math.random() * colors.length)];
      c.style.fontSize = 8 + Math.random() * 14 + "px";
      c.style.setProperty("--cf-dur", 2.2 + Math.random() * 2.4 + "s");
      c.style.setProperty("--cf-delay", Math.random() * 0.5 + "s");
      c.style.setProperty("--cf-drift", -60 + Math.random() * 120 + "px");
      c.style.setProperty("--cf-rot", Math.floor(Math.random() * 720) + "deg");
      box.appendChild(c);
    }
    window.setTimeout(function () { if (box) box.innerHTML = ""; }, 5500);
  }

  /* ---------- Reveal ---------- */
  function renderHistory() {
    if (!els.history) return;
    var hist = (loggedIn && serverStatus && Array.isArray(serverStatus.history))
      ? serverStatus.history
      : (usingLocalSpin() ? localState.history : []);
    els.history.innerHTML = hist
      .slice(0, 8)
      .map(function (h) {
        return '<span class="reward-history__item" title="' + esc(h.label) + '">' + icon(h.icon, 16) + "</span>";
      })
      .join("");
  }

  function showReveal(prize) {
    if (!els.reveal) return;
    if (els.medalIcon) els.medalIcon.innerHTML = icon(prize.icon, 60);
    if (els.revealPrize) els.revealPrize.textContent = prize.label;
    if (els.revealNote) {
      els.revealNote.textContent = prize.respin
        ? "Bir daha fırlada bilərsən!"
        : "Mükafatın hesabına əlavə olundu.";
    }
    renderHistory();
    els.reveal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    launchConfetti();
  }

  function closeReveal() {
    if (!els.reveal) return;
    els.reveal.setAttribute("hidden", "");
    document.body.style.overflow = "";
    if (els.confetti) els.confetti.innerHTML = "";
    renderAll();
    mountWheel();
  }

  function animateToIndex(winIndex, prize, onDone) {
    var n = PRIZES.length;
    var seg = 360 / n;
    var extra = 5 + Math.floor(Math.random() * 4);
    var target = currentRotation + extra * 360 + (360 - winIndex * seg - seg / 2 - (currentRotation % 360));

    function complete() {
      isSpinning = false;
      if (els.cta) els.cta.classList.remove("is-spinning");
      if (els.disk) els.disk.classList.remove("is-spinning");
      burstParticles();
      window.setTimeout(function () { showReveal(prize); }, 350);
      if (typeof onDone === "function") onDone();
    }

    if (reducedMotion) {
      currentRotation = target;
      setRotation(target, false);
      complete();
      return;
    }

    setRotation(currentRotation, false);
    void els.disk.offsetWidth;
    currentRotation = target;
    setRotation(target, true);

    var done = false;
    function onEnd(e) {
      if (done || (e && e.propertyName !== "transform")) return;
      done = true;
      els.disk.removeEventListener("transitionend", onEnd);
      complete();
    }
    els.disk.addEventListener("transitionend", onEnd);
    window.setTimeout(function () {
      if (!done) {
        done = true;
        els.disk.removeEventListener("transitionend", onEnd);
        complete();
      }
    }, SPIN_MS + 400);
  }

  function spin() {
    if (isSpinning) return;

    if (!loggedIn) {
      if (!allRequirementsDone()) {
        nudge();
        return;
      }
      nudge();
      if (els.hint) els.hint.textContent = "Fırlatmaq üçün hesabına daxil ol";
      return;
    }

    if (!canSpinNow()) {
      nudge();
      if (els.hint) {
        if (!allRequirementsDone()) {
          var left = requirements().filter(function (r) { return r.value < r.target; }).length;
          els.hint.textContent = left + " şərt qalıb — tamamla və fırlat";
        } else if (!weeklyAvailable()) {
          els.hint.textContent = "Yenidən fırlatmağa " + fmtCountdown(cooldownMs()) + " qalıb";
        }
      }
      return;
    }

    if (!serverReady) {
      spinLocal();
      return;
    }

    beginSpinUi();

    if (!useBackend || typeof BizdevarAPI.rewardWheelSpin !== "function") {
      isSpinning = false;
      if (els.cta) els.cta.classList.remove("is-spinning");
      if (els.disk) els.disk.classList.remove("is-spinning");
      spinLocal();
      return;
    }

    BizdevarAPI.rewardWheelSpin()
      .then(function (res) {
        var idx = Number(res.prize_index);
        var prize = res.prize || PRIZES[idx];
        if (!prize) {
          throw new Error("Mükafat tapılmadı");
        }
        if (serverStatus) {
          serverStatus.xp = res.xp;
          serverStatus.streak = res.streak;
          if (!prize.respin && !res.respin) {
            serverStatus.spins_remaining = 0;
            serverStatus.can_spin = false;
            serverStatus.cooldown_ms = WEEK_MS;
          }
        }
        animateToIndex(idx, prize, function () {
          refreshServerStatus();
        });
      })
      .catch(function (err) {
        isSpinning = false;
        if (els.cta) els.cta.classList.remove("is-spinning");
        if (els.disk) els.disk.classList.remove("is-spinning");
        if (err && (err.status === 404 || err.status === 405)) {
          serverReady = false;
          spinLocal();
          return;
        }
        if (els.hint) els.hint.textContent = (err && err.message) ? err.message : "Fırlatma uğursuz oldu";
        renderCta();
      });
  }

  function nudge() {
    if (els.wheel && els.wheel.animate) {
      els.wheel.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(0.98)" },
          { transform: "scale(1)" },
        ],
        { duration: 280, easing: "ease-in-out" }
      );
    }
    if (!els.reqs) return;
    var firstOpen = els.reqs.querySelector(".reward-req:not(.is-done)");
    if (firstOpen && firstOpen.animate) {
      firstOpen.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 320, easing: "ease-in-out" }
      );
    }
  }

  function ripple(e) {
    if (!els.cta || els.cta.disabled) return;
    var rect = els.cta.getBoundingClientRect();
    var r = document.createElement("span");
    r.className = "reward-cta__ripple";
    var size = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = size + "px";
    r.style.left = (e.clientX - rect.left) + "px";
    r.style.top = (e.clientY - rect.top) + "px";
    els.cta.appendChild(r);
    window.setTimeout(function () { r.remove(); }, 600);
  }

  /* ---------- Countdown ---------- */
  function startCountdown() {
    if (countdownTimer) window.clearInterval(countdownTimer);
    countdownTimer = window.setInterval(function () {
      renderStats();
      renderCta();
      if (weeklyAvailable() && els.disk && !isSpinning && !els.disk.classList.contains("is-idle")) {
        els.disk.classList.add("is-idle");
      }
    }, 1000);
  }

  /* ---------- Konfiqurasiya dəyişəndə ---------- */
  function reloadConfig() {
    if (!WC) return;
    var load = WC.loadFromApi ? WC.loadFromApi() : Promise.resolve(WC.get());
    load.then(function () {
      CONFIG = WC.get();
      PRIZES = CONFIG.prizes;
      prevDone = {};
      mountWheel();
      return refreshServerStatus();
    }).then(function () {
      renderAll();
    });
  }

  /* ---------- Init ---------- */
  function init() {
    if (!document.getElementById("bonus-kart")) return;

    els = {
      wheel: $("rewardWheel"), disk: $("rewardDisk"), hub: $("rewardHub"),
      particles: $("rewardParticles"), spins: $("rewardSpins"),
      countdown: $("rewardCountdown"), last: $("rewardLast"),
      level: $("rewardLevel"), tier: $("rewardTier"), streak: $("rewardStreak"),
      xp: $("rewardXp"), xpMax: $("rewardXpMax"), xpFill: $("rewardXpFill"),
      reqs: $("rewardReqs"), progressPct: $("rewardProgressPct"), progressFill: $("rewardProgressFill"),
      preview: $("rewardPreview"), cta: $("rewardCta"), ctaLabel: $("rewardCtaLabel"), hint: $("rewardHint"),
      reveal: $("rewardReveal"), confetti: $("rewardConfetti"), medalIcon: $("rewardMedalIcon"),
      revealPrize: $("rewardRevealPrize"), revealNote: $("rewardRevealNote"),
      revealBtn: $("rewardRevealBtn"), revealClose: $("rewardRevealClose"), history: $("rewardHistory"),
    };

    mountWheel();

    var boot = Promise.resolve();
    if (WC && WC.loadFromApi) {
      boot = WC.loadFromApi().then(function () {
        CONFIG = WC.get();
        PRIZES = CONFIG.prizes;
        mountWheel();
      });
    }
    boot.then(function () {
      return refreshServerStatus();
    }).then(function () {
      renderAll();
      startCountdown();
    });

    if (els.cta) els.cta.addEventListener("click", function (e) { ripple(e); spin(); });
    if (els.hub) els.hub.addEventListener("click", function (e) { e.stopPropagation(); spin(); });
    if (els.wheel) {
      els.wheel.addEventListener("click", function (e) {
        if (e.target.closest(".reward-wheel__hub")) return;
        spin();
      });
      els.wheel.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin(); }
      });
    }
    if (els.revealBtn) els.revealBtn.addEventListener("click", closeReveal);
    if (els.revealClose) els.revealClose.addEventListener("click", closeReveal);
    if (els.reveal) {
      els.reveal.addEventListener("click", function (e) { if (e.target === els.reveal) closeReveal(); });
    }

    var fs = $("rewardFs");
    var openFs = $("rewardOpenFs");
    var closeFs = $("rewardFsClose");

    function setFsOpen(open) {
      if (!fs) return;
      if (open) {
        fs.removeAttribute("hidden");
        document.body.classList.add("reward-fs-open");
      } else {
        fs.setAttribute("hidden", "");
        document.body.classList.remove("reward-fs-open");
      }
    }

    if (openFs) {
      openFs.addEventListener("click", function () {
        setFsOpen(true);
      });
    }
    if (closeFs) {
      closeFs.addEventListener("click", function () {
        setFsOpen(false);
      });
    }
    if (fs) {
      fs.addEventListener("click", function (e) {
        if (e.target === fs) setFsOpen(false);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && els.reveal && !els.reveal.hasAttribute("hidden")) closeReveal();
      if (e.key === "Escape" && fs && !fs.hasAttribute("hidden")) setFsOpen(false);
    });

    document.addEventListener("BizdevarCartChanged", function () {
      renderAll();
      if (loggedIn) refreshServerStatus();
    });
    document.addEventListener("BizdevarFavoritesChanged", function () {
      renderAll();
      if (loggedIn) refreshServerStatus();
    });
    document.addEventListener("BuykonWheelConfigChanged", reloadConfig);
    document.addEventListener("BizdevarAuthChanged", refreshServerStatus);
    document.addEventListener("BizdevarAuthUpdate", refreshServerStatus);
    window.addEventListener("focus", function () {
      refreshServerStatus();
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refreshServerStatus();
    });

    window.BuykonReward = {
      refresh: refreshServerStatus,
      open: function () { setFsOpen(true); },
      close: function () { setFsOpen(false); },
      reset: function () {
        localState = { lastSpinAt: 0, xp: 0, streak: 0, history: [] };
        saveLocalState(localState);
        refreshServerStatus();
      },
      unlock: function () {
        localState.lastSpinAt = 0;
        saveLocalState(localState);
        refreshServerStatus();
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
