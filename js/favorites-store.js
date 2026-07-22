(function () {
  var STORAGE_KEY = "bizdevar-favorites";

  function normalizeIds(arr) {
    if (!Array.isArray(arr)) return [];
    var out = [];
    var seen = {};
    arr.forEach(function (x) {
      var n = parseInt(x, 10);
      if (!isNaN(n) && n > 0 && !seen[n]) {
        seen[n] = true;
        out.push(n);
      }
    });
    return out;
  }

  function read() {
    try {
      return normalizeIds(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
    } catch (e) {
      return [];
    }
  }

  function write(ids) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
      /* ignore */
    }
    document.dispatchEvent(
      new CustomEvent("BizdevarFavoritesChanged", { detail: { ids: ids } })
    );
    if (window.BizdevarHeader && typeof BizdevarHeader.setFavoritesBadge === "function") {
      BizdevarHeader.setFavoritesBadge(ids.length);
    }
  }

  window.BizdevarFavorites = {
    getIds: read,
    has: function (id) {
      return read().indexOf(Number(id)) !== -1;
    },
    count: function () {
      return read().length;
    },
    add: function (id) {
      id = Number(id);
      if (!id) return;
      var ids = read();
      if (ids.indexOf(id) === -1) {
        ids.push(id);
        write(ids);
      }
    },
    remove: function (id) {
      id = Number(id);
      var ids = read().filter(function (x) {
        return x !== id;
      });
      write(ids);
    },
    toggle: function (id) {
      id = Number(id);
      if (!id) return false;
      var ids = read();
      var i = ids.indexOf(id);
      if (i === -1) {
        ids.push(id);
        write(ids);
        return true;
      }
      ids.splice(i, 1);
      write(ids);
      return false;
    },
    syncIds: function (validIds) {
      var valid = {};
      normalizeIds(validIds).forEach(function (id) {
        valid[id] = true;
      });
      var next = read().filter(function (id) {
        return valid[id];
      });
      write(next);
    },
  };
})();
