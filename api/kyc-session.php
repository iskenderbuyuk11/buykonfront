<?php
/**
 * Didit KYC — create session (server-side only).
 * Secrets: DIDIT_API_KEY from .env
 * workflow_id: code constant (not a secret, not env).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/_env.php';

/** Free KYC workflow — per-session config, NOT an env secret */
const DIDIT_WORKFLOW_ID = '377185f9-762b-4bb4-aea2-b495a6f7a998';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    buykon_json_fail(405, 'Yalnız POST icazəlidir');
}

buykon_load_env();

$apiKey = buykon_env('DIDIT_API_KEY');
if ($apiKey === '') {
    buykon_json_fail(503, 'NO_DIDIT_KEY');
}

$raw = file_get_contents('php://input');
$input = json_decode((string) $raw, true);
if (!is_array($input)) {
    $input = [];
}

$vendorData = isset($input['vendor_data']) ? trim((string) $input['vendor_data']) : '';
if ($vendorData === '') {
    $vendorData = 'buykon-user-' . bin2hex(random_bytes(6));
}

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');
$scheme = $https ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$base = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
$callback = buykon_env('DIDIT_CALLBACK_URL');
if ($callback === '') {
    $callback = $scheme . '://' . $host . $base . '/pages/verify/done.html';
}

$payload = [
    'workflow_id' => DIDIT_WORKFLOW_ID,
    'vendor_data' => $vendorData,
    'callback' => $callback,
    'callback_method' => 'both',
];

$ch = curl_init('https://verification.didit.me/v3/session/');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'x-api-key: ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
]);

$body = curl_exec($ch);
$errno = curl_errno($ch);
$err = curl_error($ch);
$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($errno) {
    buykon_json_fail(502, 'Didit bağlantı xətası: ' . $err);
}

$data = json_decode((string) $body, true);
if (!is_array($data)) {
    buykon_json_fail(502, 'Didit cavabı oxunmadı');
}

if ($status < 200 || $status >= 300) {
    $detail = $data['detail'] ?? $data['message'] ?? $data['error'] ?? null;
    if (is_array($detail)) {
        $detail = json_encode($detail, JSON_UNESCAPED_UNICODE);
    }
    $msg = is_string($detail) && $detail !== ''
        ? $detail
        : ('Didit xətası (' . $status . ')');
    if ($status === 401 || $status === 403) {
        buykon_json_fail(503, 'NO_DIDIT_KEY');
    }
    buykon_json_fail($status >= 400 && $status < 600 ? $status : 502, $msg);
}

$url = isset($data['url']) ? (string) $data['url'] : '';
if ($url === '') {
    buykon_json_fail(502, 'Didit URL qaytarmadı');
}

// Client-ə yalnız lazım olanı qaytar
echo json_encode([
    'ok' => true,
    'url' => $url,
    'session_id' => $data['session_id'] ?? null,
], JSON_UNESCAPED_UNICODE);
