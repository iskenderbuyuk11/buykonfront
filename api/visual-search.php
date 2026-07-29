<?php
/**
 * Visual search via Gemini (reads GEMINI_API_KEY from .env)
 * POST { image_base64, mime, catalog }
 * → { ok: true, analysis: {...} }
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

$b64 = isset($body["image_base64"]) ? preg_replace("/\s+/", "", (string) $body["image_base64"]) : "";
$mime = isset($body["mime"]) ? (string) $body["mime"] : "image/jpeg";
if ($b64 === "") {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "image_base64 required"]);
  exit;
}
if (!preg_match('#^image/(jpeg|jpg|png|webp|gif)$#i', $mime)) {
  $mime = "image/jpeg";
}

$catalog = isset($body["catalog"]) ? (string) $body["catalog"] : "";
if (mb_strlen($catalog) > 20000) {
  $catalog = mb_substr($catalog, 0, 20000);
}

$prompt =
  "Sən Buykon e-commerce visual search AI-sən.\n" .
  "Şəkildəki məhsulu/məhsulları tanı və kataloqla uyğunlaşdır.\n" .
  "Kataloq sətir formatı: id | name | category | vendor\n\n" .
  "Kataloq:\n" . ($catalog !== "" ? $catalog : "(boş)") . "\n\n" .
  "YALNIZ JSON qaytar:\n" .
  "{\n" .
  "  \"product_name\": \"string\",\n" .
  "  \"brand\": \"string\",\n" .
  "  \"category\": \"geyim|elektronika|telefon|aksesuar|kosmetika|ev-yasam|other\",\n" .
  "  \"color\": \"string\",\n" .
  "  \"type\": \"qısa tip (məs: t-shirt, faucet, phone)\",\n" .
  "  \"keywords\": [\"az/en açar sözlər\"],\n" .
  "  \"search_queries\": [\"axtarış sorğuları\"],\n" .
  "  \"catalog_match\": true,\n" .
  "  \"matched_ids\": [kataloqdan oxşar məhsul id-ləri, max 8],\n" .
  "  \"needed_ids\": [lazım ola biləcək aksesuar/tamamlayıcı id-lər, max 6],\n" .
  "  \"detections\": [{\n" .
  "    \"label\": \"görünən obyekt adı\",\n" .
  "    \"type\": \"tip\",\n" .
  "    \"brand\": \"\",\n" .
  "    \"keywords\": [],\n" .
  "    \"search_queries\": [],\n" .
  "    \"matched_ids\": [],\n" .
  "    \"needed_ids\": [],\n" .
  "    \"count\": 1\n" .
  "  }]\n" .
  "}\n" .
  "Qaydalar: matched_ids/needed_ids YALNIZ kataloqdakı real id-lər olsun. Uyğun yoxdursa boş array.\n" .
  "detections ən azı 1 element olsun.";

$parts = [
  ["text" => $prompt],
  [
    "inlineData" => [
      "mimeType" => $mime,
      "data" => $b64,
    ],
  ],
];

$result = buykon_gemini_generate($parts, [
  "model" => buykon_env("GEMINI_VISUAL_MODEL", ""),
  "temperature" => 0.15,
  "timeout" => 60,
]);

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
    "raw" => mb_substr($result["text"], 0, 400),
  ]);
  exit;
}

// Normalize analysis
if (!isset($parsed["detections"]) || !is_array($parsed["detections"]) || !count($parsed["detections"])) {
  $parsed["detections"] = [
    [
      "label" => isset($parsed["product_name"]) ? $parsed["product_name"] : "Məhsul",
      "type" => isset($parsed["type"]) ? $parsed["type"] : "",
      "brand" => isset($parsed["brand"]) ? $parsed["brand"] : "",
      "keywords" => isset($parsed["keywords"]) && is_array($parsed["keywords"]) ? $parsed["keywords"] : [],
      "search_queries" => isset($parsed["search_queries"]) && is_array($parsed["search_queries"]) ? $parsed["search_queries"] : [],
      "matched_ids" => isset($parsed["matched_ids"]) && is_array($parsed["matched_ids"]) ? $parsed["matched_ids"] : [],
      "needed_ids" => isset($parsed["needed_ids"]) && is_array($parsed["needed_ids"]) ? $parsed["needed_ids"] : [],
      "count" => 1,
    ],
  ];
}

foreach ($parsed["detections"] as &$det) {
  if (!isset($det["count"])) $det["count"] = 1;
  if (!isset($det["label"])) $det["label"] = "Məhsul";
}
unset($det);

echo json_encode([
  "ok" => true,
  "analysis" => $parsed,
  "model" => isset($result["model"]) ? $result["model"] : "",
], JSON_UNESCAPED_UNICODE);
