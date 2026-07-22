const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pages = [
  "pages/sebet/index.html",
  "pages/sifaris/index.html",
  "pages/sevimliler/index.html",
  "pages/product/index.html",
  "pages/profile/index.html",
  "pages/haqqimizda/index.html",
  "pages/error/index.html",
  "pages/login/index.html",
  "pages/register/index.html",
];

function stripLayout(html) {
  html = html.replace(/<div class="top-banner">[\s\S]*?<\/header>\s*/i, "");
  html = html.replace(/<body[^>]*>\s*/i, "");
  html = html.replace(/<\/body>[\s\S]*$/i, "");
  html = html.replace(/<footer class="footer">[\s\S]*?<\/footer>\s*/i, "");
  html = html.replace(/^[\s\S]*?(<head>[\s\S]*?<\/head>)/i, "$1");
  return html.trim();
}

function wrapPage(headAndContent, scripts) {
  const headMatch = headAndContent.match(/<head>[\s\S]*?<\/head>/i);
  const head = headMatch ? headMatch[0] : "";
  let content = headAndContent.replace(/<head>[\s\S]*?<\/head>/i, "").trim();

  const layoutScripts = [
    '<script src="../../js/layout.js"></script>',
    '<script src="../../js/header.js"></script>',
    '<script src="../../js/footer.js"></script>',
  ];

  const seen = new Set();
  const allScripts = [];
  [...layoutScripts, ...scripts].forEach(function (s) {
    if (!seen.has(s)) {
      seen.add(s);
      allScripts.push(s);
    }
  });

  return (
    '<!doctype html>\n<html lang="az">\n' +
    head +
    '\n<body data-root="../../">\n' +
    '    <div id="site-header"></div>\n' +
    content +
    "\n" +
    '    <div id="site-footer"></div>\n' +
    '    <div id="site-bottom-nav"></div>\n' +
    allScripts.map(function (s) {
      return "    " + s;
    }).join("\n") +
    "\n  </body>\n</html>\n"
  );
}

pages.forEach(function (rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    console.log("Skip missing", rel);
    return;
  }
  const html = fs.readFileSync(file, "utf8");
  const scripts = [];
  const scriptRe = /<script src="([^"]+)"><\/script>/g;
  let m;
  while ((m = scriptRe.exec(html))) {
    const tag = m[0];
    if (
      tag.includes("layout.js") ||
      tag.includes("footer.js") ||
      tag.includes("header.js")
    ) {
      continue;
    }
    scripts.push(tag);
  }
  const out = wrapPage(stripLayout(html), scripts);
  fs.writeFileSync(file, out);
  console.log("Updated", rel);
});
