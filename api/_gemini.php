<?php
/**
 * Shared Gemini helpers for Buykon AI endpoints
 */

function buykon_project_root() {
  return dirname(__DIR__);
}

function buykon_load_env($root = null) {
  static $cache = null;
  if ($cache !== null) return $cache;
  $cache = [];
  $root = $root ?: buykon_project_root();
  $path = rtrim($root, "/\\") . DIRECTORY_SEPARATOR . ".env";
  if (!is_file($path)) return $cache;
  $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if (!$lines) return $cache;
  foreach ($lines as $line) {
    $line = trim($line);
    if ($line === "" || $line[0] === "#") continue;
    $eq = strpos($line, "=");
    if ($eq === false) continue;
    $k = trim(substr($line, 0, $eq));
    $v = trim(substr($line, $eq + 1));
    $v = trim($v, "\"'");
    if ($k !== "") $cache[$k] = $v;
  }
  return $cache;
}

function buykon_env($key, $default = "") {
  $v = getenv($key);
  if ($v !== false && $v !== "") return $v;
  $env = buykon_load_env();
  return isset($env[$key]) && $env[$key] !== "" ? $env[$key] : $default;
}

function buykon_gemini_key() {
  return buykon_env("GEMINI_API_KEY", "");
}

function buykon_cors_json() {
  header("Content-Type: application/json; charset=utf-8");
  header("Access-Control-Allow-Origin: *");
  header("Access-Control-Allow-Methods: POST, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type");
  if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
  }
}

function buykon_read_json_body() {
  $raw = file_get_contents("php://input");
  $body = json_decode($raw, true);
  return is_array($body) ? $body : null;
}

function buykon_gemini_generate($parts, $opts = []) {
  $apiKey = buykon_gemini_key();
  if ($apiKey === "") {
    return ["ok" => false, "error" => "NO_GEMINI_KEY", "http" => 503];
  }

  $models = [];
  if (!empty($opts["model"])) $models[] = $opts["model"];
  $preferred = buykon_env("GEMINI_BUKI_MODEL", "");
  if ($preferred) $models[] = $preferred;
  $models[] = "gemini-2.0-flash";
  $models[] = "gemini-2.0-flash-lite";
  $models[] = "gemini-1.5-flash";
  $models[] = "gemini-1.5-flash-latest";
  $models = array_values(array_unique($models));

  $temperature = isset($opts["temperature"]) ? $opts["temperature"] : 0.2;
  $jsonMode = !isset($opts["json"]) || $opts["json"];
  $timeout = isset($opts["timeout"]) ? (int) $opts["timeout"] : 55;

  $lastError = "Gemini failed";
  $lastHttp = 502;

  foreach ($models as $model) {
    $url =
      "https://generativelanguage.googleapis.com/v1beta/models/" .
      rawurlencode($model) .
      ":generateContent?key=" .
      rawurlencode($apiKey);

    $gen = ["temperature" => $temperature];
    if ($jsonMode) $gen["responseMimeType"] = "application/json";

    $payload = [
      "contents" => [
        [
          "role" => "user",
          "parts" => $parts,
        ],
      ],
      "generationConfig" => $gen,
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
      CURLOPT_POSTFIELDS => json_encode($payload),
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => $timeout,
    ]);
    $resBody = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($resBody === false) {
      $lastError = $err ?: "Gemini request failed";
      $lastHttp = 502;
      continue;
    }

    $gemini = json_decode($resBody, true);
    if ($code >= 400 || !is_array($gemini)) {
      $lastError = is_array($gemini) && isset($gemini["error"]["message"])
        ? $gemini["error"]["message"]
        : "Gemini HTTP " . $code;
      $lastHttp = $code >= 400 ? $code : 502;
      // model not found / unsupported — try next
      if ($code === 404 || $code === 400) continue;
      continue;
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
    if ($text === "") {
      $lastError = "Empty Gemini response";
      continue;
    }

    return ["ok" => true, "text" => $text, "model" => $model];
  }

  return ["ok" => false, "error" => $lastError, "http" => $lastHttp];
}

function buykon_extract_json($text) {
  $text = trim((string) $text);
  if (preg_match('/\{[\s\S]*\}/', $text, $m)) {
    $text = $m[0];
  }
  $parsed = json_decode($text, true);
  return is_array($parsed) ? $parsed : null;
}
