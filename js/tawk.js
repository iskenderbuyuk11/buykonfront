(function () {
  "use strict";

  if (window.__buykonTawkLoaded) return;
  window.__buykonTawkLoaded = true;

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();

  var script = document.createElement("script");
  script.async = true;
  script.src = "https://embed.tawk.to/6a44d604b539ed1d4853c245/1jsee810d";
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");

  var first = document.getElementsByTagName("script")[0];
  if (first && first.parentNode) {
    first.parentNode.insertBefore(script, first);
  } else {
    document.head.appendChild(script);
  }
})();
