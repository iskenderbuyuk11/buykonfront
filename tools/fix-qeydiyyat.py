path = r"C:\xampp2\htdocs\bizde\pages\sat\qeydiyyat.html"
with open(path, encoding="utf-8") as f:
    lines = f.read().splitlines()
for j, line in enumerate(lines):
    if line.strip() == "<script>":
        lines = lines[:j] + [
            '    <script src="../../js/sat-qeydiyyat.js"></script>',
            "  </body>",
            "</html>",
        ]
        break
with open(path, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
