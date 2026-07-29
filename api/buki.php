<?php
/**
 * Buki AI — Gemini məhsul tövsiyəsi
 * GEMINI_API_KEY .env
 */
require_once __DIR__ . "/_gemini.php";
buykon_cors_json();

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "POST required"]);
  exit;
}

if (buykon_gemini_key() === "") {
  http_response_code(503);
  echo json_encode(["ok" => false, "error" => "NO_GEMINI_KEY"]);
  exit;
}

$body = buykon_read_json_body();
if (!$body) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "Invalid JSON"]);
  exit;
}

$message = isset($body["message"]) ? trim((string) $body["message"]) : "";
$products = isset($body["products"]) && is_array($body["products"]) ? $body["products"] : [];
if ($message === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "message required"]);
  exit;
}

$slim = [];
foreach (array_slice($products, 0, 150) as $p) {
  if (!is_array($p)) continue;
  $id = isset($p["id"]) ? $p["id"] : null;
  if ($id === null || $id === "") continue;
  $specs = "";
  if (isset($p["specs"]) && is_array($p["specs"])) {
    $bits = [];
    foreach ($p["specs"] as $sk => $sv) {
      $bits[] = $sk . ":" . $sv;
      if (count($bits) >= 6) break;
    }
    $specs = implode("; ", $bits);
  }
  $slim[] = [
    "id" => $id,
    "name" => isset($p["name"]) ? mb_substr((string) $p["name"], 0, 140) : "",
    "price" => isset($p["price"]) ? floatval($p["price"]) : 0,
    "cat" => isset($p["cat"]) ? (string) $p["cat"] : (isset($p["category"]) ? (string) $p["category"] : ""),
    "specs" => $specs,
  ];
}

$catalogJson = json_encode($slim, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$prompt =
  "Sən Buykon mağazasının AI köməkçisisən. Adın: Buki.\n" .
  "İstifadəçi Azərbaycan dilində yazır. Cavabın da Azərbaycan dilində olsun.\n\n" .
  "ƏSAS QAYDALAR:\n" .
  "1) YALNIZ aşağıdakı kataloqdan məhsul seç. Kataloqda yoxdursa product_ids=[] ver.\n" .
  "2) Kateqoriya sərt olsun:\n" .
  "   - paltar/geyim/köynək → yalnız geyim\n" .
  "   - telefon/smartphone → yalnız telefon\n" .
  "   - pc/kompüter/masaüstü/oyun komputeri topla → yalnız desktop/PC/kompüter hissələri və ya hazır PC (noutbuk DEYİL, telefon DEYİL, geyim DEYİL)\n" .
  "   - noutbuk/laptop → yalnız noutbuk\n" .
  "3) Büdcə verilərsə qiyməti aşma.\n" .
  "4) Əlaqəsiz məhsul QARIŞDIRMA.\n" .
  "5) «PC topla / sistem yığ» deyirsə: eyni büdcədə ən yaxşı 3-5 uyğun kompüter/komponent seç və niyə uyğun olduğunu qısa yaz.\n\n" .
  "YALNIZ JSON:\n" .
  "{\"reply\":\"qısa cavab\",\"category\":\"geyim|telefon|komputer|noutbuk|aksesuar|kosmetika|other\",\"product_ids\":[id...],\"reasons\":{\"ID\":\"səbəb\"}}\n" .
  "Maksimum 5 id.\n\n" .
  "İstifadəçi: " . $message . "\n\n" .
  "Kataloq (" . count($slim) . " məhsul): " . $catalogJson;

$result = buykon_gemini_generate(
  [["text" => $prompt]],
  ["temperature" => 0.15, "timeout" => 50]
);

if (!$result["ok"]) {
  http_response_code(!empty($result["http"]) ? (int) $result["http"] : 502);
  echo json_encode(["ok" => false, "error" => $result["error"]]);
  exit;
}

$parsed = buykon_extract_json($result["text"]);
if (!$parsed) {
  http_response_code(502);
  echo json_encode([
    "ok" => false,
    "error" => "AI JSON parse failed",
    "raw" => mb_substr($result["text"], 0, 500),
  ]);
  exit;
}

$ids = [];
if (isset($parsed["product_ids"]) && is_array($parsed["product_ids"])) {
  foreach ($parsed["product_ids"] as $id) {
    $ids[] = $id;
  }
}

// Validate ids exist in catalog
$allowed = [];
foreach ($slim as $row) {
  $allowed[strval($row["id"])] = true;
}
$ids = array_values(array_filter($ids, function ($id) use ($allowed) {
  return isset($allowed[strval($id)]);
}));

echo json_encode([
  "ok" => true,
  "reply" => isset($parsed["reply"]) ? $parsed["reply"] : "Sizə uyğun məhsullar:",
  "category" => isset($parsed["category"]) ? $parsed["category"] : "other",
  "product_ids" => $ids,
  "reasons" => isset($parsed["reasons"]) && is_array($parsed["reasons"]) ? $parsed["reasons"] : new stdClass(),
  "model" => isset($result["model"]) ? $result["model"] : "",
], JSON_UNESCAPED_UNICODE);
