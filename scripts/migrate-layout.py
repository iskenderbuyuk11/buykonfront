#!/usr/bin/env python3
"""Remove inline header/footer and use layout partials."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def fix_product(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        r'(<body data-root="\.\./\.\./">)\s*.*?(<!--LAYOUT-START-->\s*)?<div id="site-header"></div>',
        r'\1\n    <div id="site-header"></div>',
        text,
        count=1,
        flags=re.DOTALL,
    )
    path.write_text(text, encoding="utf-8")
    print("fixed:", path.name)


def strip_header_footer(path: Path, main_marker: str) -> None:
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        rf"<body>\s*.*?({re.escape(main_marker)})",
        rf'<body data-root="../../">\n    <div id="site-header"></div>\n\n    \1',
        text,
        count=1,
        flags=re.DOTALL,
    )
    text = re.sub(
        r'<footer class="footer">.*?</footer>',
        '    <div id="site-footer"></div>',
        text,
        count=1,
        flags=re.DOTALL,
    )
    if "layout.js" not in text:
        text = text.replace(
            "    <script src=\"../../js/favorites-store.js\"></script>",
            "    <script src=\"../../js/layout.js\"></script>\n"
            "    <script src=\"../../js/favorites-store.js\"></script>\n"
            "    <script src=\"../../js/cart-store.js\"></script>",
        )
    if "footer.js" not in text:
        text = text.replace(
            "    <script src=\"../../js/header.js\"></script>",
            "    <script src=\"../../js/header.js\"></script>\n"
            "    <script src=\"../../js/footer.js\"></script>",
        )
    path.write_text(text, encoding="utf-8")
    print("fixed:", path.name)


def fix_error(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    head_insert = (
        '  <link rel="stylesheet" href="../../css/main.css" />\n'
        '  <link rel="stylesheet" href="../../css/header.css" />\n'
        '  <link rel="stylesheet" href="../../css/footer.css" />\n'
        '  <link rel="stylesheet" href="../../css/dark-mode.css" />\n'
    )
    if "header.css" not in text:
        text = text.replace("  <title>404 | BizdəVar</title>\n\n", "  <title>404 | BizdəVar</title>\n\n" + head_insert + "\n")
    text = text.replace("<body>", '<body data-root="../../">\n  <div id="site-header"></div>')
    text = text.replace(
        "  </script>\n\n</body>",
        "  </script>\n\n  <div id=\"site-footer\"></div>\n"
        "  <script src=\"../../js/layout.js\"></script>\n"
        "  <script src=\"../../js/favorites-store.js\"></script>\n"
        "  <script src=\"../../js/cart-store.js\"></script>\n"
        "  <script src=\"../../js/header.js\"></script>\n"
        "  <script src=\"../../js/footer.js\"></script>\n</body>",
    )
    path.write_text(text, encoding="utf-8")
    print("fixed:", path.name)


if __name__ == "__main__":
    fix_product(ROOT / "pages/product/index.html")
    strip_header_footer(ROOT / "pages/profile/index.html", '<main class="profil-page container">')
    strip_header_footer(ROOT / "pages/haqqimizda/index.html", '<main class="about-page">')
    fix_error(ROOT / "pages/error/index.html")
