(function () {
  "use strict";

  var categories = [
    { slug: "all", name: "Bütün məhsullar", icon: "⊞" },
    { slug: "elektronika", name: "Elektronika", icon: "📱" },
    { slug: "geyim", name: "Geyim", icon: "👕" },
    { slug: "ev", name: "Ev & yaşam", icon: "🏠" },
    { slug: "kosmetika", name: "Kosmetika", icon: "💄" },
    { slug: "aksesuar", name: "Aksesuarlar", icon: "⌚" },
    { slug: "texnika", name: "Məişət texnikası", icon: "🔌" },
    { slug: "notbuk", name: "Notbuklar", icon: "💻" },
    { slug: "idman", name: "İdman", icon: "⚽" },
    { slug: "usaqlar", name: "Uşaqlar", icon: "🧸" },
    { slug: "oyun", name: "Oyun", icon: "🎮" },
  ];

  function getRoot() {
    return (window.BizdevarLayout && BizdevarLayout.getRoot()) || "../../";
  }

  function render() {
    var list = document.getElementById("cat-page-list");
    if (!list) return;
    var root = getRoot();

    list.innerHTML = categories
      .map(function (cat) {
        var href =
          cat.slug === "all"
            ? root + "index.html#catalog"
            : root + "index.html?cat=" + encodeURIComponent(cat.slug) + "#catalog";
        return (
          '<a href="' +
          href +
          '" class="cat-page-item">' +
          '<span class="cat-page-item__ico" aria-hidden="true">' +
          cat.icon +
          "</span>" +
          '<span class="cat-page-item__label">' +
          cat.name +
          "</span>" +
          '<span class="cat-page-item__chev" aria-hidden="true">›</span>' +
          "</a>"
        );
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", render);
  document.addEventListener("BizdevarLayoutLoaded", render);
})();
