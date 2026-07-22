(function () {
  "use strict";

  function siteRoot() {
    var path = decodeURIComponent(window.location.pathname).replace(/\\/g, "/");
    var parts = path.split("/").filter(Boolean);
    var bizdeIdx = -1;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase() === "bizde") {
        bizdeIdx = i;
        break;
      }
    }
    var segs = bizdeIdx >= 0 ? parts.slice(bizdeIdx + 1) : parts;
    if (segs.length && /\.[a-z0-9]+$/i.test(segs[segs.length - 1])) {
      segs = segs.slice(0, -1);
    }
    if (!segs.length) return "";
    var up = "";
    for (var j = 0; j < segs.length; j++) up += "../";
    return up;
  }

  function link(rel, href, sizes, type) {
    if (document.querySelector('link[rel="' + rel + '"][href="' + href + '"]')) return;
    var el = document.createElement("link");
    el.rel = rel;
    el.href = href;
    el.setAttribute("data-bizde-favicon", "1");
    if (sizes) el.sizes = sizes;
    if (type) el.type = type;
    document.head.appendChild(el);
  }

  function initFavicon() {
    if (document.querySelector("link[data-bizde-favicon]")) return;
    var base = siteRoot() + "images/favicon/";
    link("icon", base + "favicon.ico", null, "image/x-icon");
    link("icon", base + "favicon-32x32.png", "32x32", "image/png");
    link("icon", base + "favicon-16x16.png", "16x16", "image/png");
    link("apple-touch-icon", base + "apple-touch-icon.png", "180x180");
    link("manifest", base + "site.webmanifest");
  }

  initFavicon();
})();
