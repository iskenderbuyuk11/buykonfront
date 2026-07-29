<?php
/**
 * Buki AI proxy — Gemini ilə məhsul tövsiyəsi
 * GEMINI_API_KEY .env faylında (layihə kökü)
 */
header("Content-Type: application/json; charset=utf-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
  http_response_code(204);
  exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "POST required"]);
  exit;
}

function load_env_key($root) {
  $path = rtrim($root, "/\\") . DIRECTORY_SEPARATOR . ".env";
  if (!is_file($path)) return "";
  $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if (!$lines) return "";
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === "" || $line[0] === "#") continue;
    if (stripos($line, "GEMINI_API_KEY=") === 0) {
      $val = trim(substr($line, strlen("GEMINI_API_KEY=")));
      $val = trim($val, "\"'");
      return $val;
    }
  }
  return "";
}

$root = dirname(__DIR__);
$apiKey = getenv("GEMINI_API_KEY") ?: load_env_key($root);
if ($apiKey === "") {
  http_response_code(503);
  echo json_encode(["ok" => false, "error" => "NO_GEMINI_KEY"]);
  exit;
}

$raw = file_get_contents("php://input");
$body = json_decode($raw, true);
if (!is_array($body)) {
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
foreach (array_slice($products, 0, 80) as $p) {
  if (!is_array($p)) continue;
  $slim[] = [
    "id" => isset($p["id"]) ? $p["id"] : null,
    "name" => isset($p["name"]) ? mb_substr((string) $p["name"], 0, 120) : "",
    "price" => isset($p["price"]) ? $p["price"] : 0,
    "cat" => isset($p["cat"]) ? $p["cat"] : (isset($p["category"]) ? $p["category"] : ""),
  ];
}

$catalogJson = json_encode($slim, JSON_UNESCAPED_UNICODE);
$prompt =
  "Sən Buykon onlayn mağazasının AI köməkçisisən (adın: Buki).\n" .
  "İstifadəçi Azərbaycan dilində alış-veriş sorğusu yazır.\n" .
  "YALNIZ verilən kataloqdan məhsul seç. Kataloqda yoxdursa boş array qaytar.\n" .
  "Kateqoriyaya ciddi riayət et: paltar/geyim → yalnız geyim; telefon → yalnız telefon; kompüter → yalnız kompüter/noutbuk.\n" .
  "Başqa kateqoriyadan məhsul QARIŞDIRMA.\n" .
  "Cavabı YALNIZ JSON ver:\n" .
  "{\"reply\":\"qısa azərbaycan cavabı\",\"category\":\"geyim|telefon|komputer|noutbuk|aksesuar|kosmetika|other\",\"product_ids\":[id...],\"reasons\":{\"ID\":\"qısa səbəb\"}}\n" .
  "Maksimum 5 id seç. Büdcə varsa aşma.\n\n" .
  "İstifadəçi: " . $message . "\n\n" .
  "Kataloq: " . $catalogJson;

$model = getenv("GEMINI_BUKI_MODEL") ?: "gemini-2.0-flash";
$url =
  "https://generativelanguage.googleapis.com/v1beta/models/" .
  rawurlencode($model) .
  ":generateContent?key=" .
  rawurlencode($apiKey);

$payload = [
  "contents" => [
    [
      "role" => "user",
      "parts" => [["text" => $prompt]],
    ],
  ],
  "generationConfig" => [
    "temperature" => 0.2,
    "responseMimeType" => "application/json",
  ],
];

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
  CURLOPT_POSTFIELDS => json_encode($payload),
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 45,
]);
$resBody = curl_exec($ch);
$err = curl_error($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($resBody === false) {
  http_response_code(502);
  echo json_encode(["ok" => false, "error" => $err ?: "Gemini request failed"]);
  exit;
}

$gemini = json_decode($resBody, true);
if ($code >= 400 || !is_array($gemini)) {
  http_response_code(502);
  $msg = is_array($gemini) && isset($gemini["error"]["message"])
    ? $gemini["error"]["message"]
    : "Gemini HTTP " . $code;
  echo json_encode(["ok" => false, "error" => $msg]);
  exit;
}

$text = "";
if (
  isset($gemini["candidates"][0]["content"]["parts"]) &&
  is_array($gemini["candidates"][0]["content"]["parts"])
) {
  foreach ($gemini["candidates"][0]["content"]["parts"] as $part) {
    if (isset($part["text"])) $text .= $part["text"];
  }
}

$text = trim($text);
if (preg_match('/\{[\s\S]*\}/', $text, $m)) {
  $text = $m[0];
}
$parsed = json_decode($text, true);
if (!is_array($parsed)) {
  http_response_code(502);
  echo json_encode(["ok" => false, "error" => "AI JSON parse failed", "raw" => mb_substr($text, 0, 500)]);
  exit;
}

$ids = [];
if (isset($parsed["product_ids"]) && is_array($parsed["product_ids"])) {
  foreach ($parsed["product_ids"] as $id) {
    $ids[] = $id;
  }
}

echo json_encode([
  "ok" => true,
  "reply" => isset($parsed["reply"]) ? $parsed["reply"] : "Sizə uyğun məhsullar:",
  "category" => isset($parsed["category"]) ? $parsed["category"] : "other",
  "product_ids" => $ids,
  "reasons" => isset($parsed["reasons"]) && is_array($parsed["reasons"]) ? $parsed["reasons"] : new stdClass(),
], JSON_UNESCAPED_UNICODE);
