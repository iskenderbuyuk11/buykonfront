<?php
/**
 * Satıcı e-poçt OTP — Java API EmailService proxy (admin ilə eyni SMTP)
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/_env.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    buykon_json_fail(405, 'Yalnız POST');
}

buykon_load_env();

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        'use_strict_mode' => true,
    ]);
}

$raw = file_get_contents('php://input');
$input = json_decode((string) $raw, true);
if (!is_array($input)) {
    buykon_json_fail(400, 'JSON gözlənilirdi');
}

$action = (string) ($input['action'] ?? '');
$destination = strtolower(trim((string) ($input['destination'] ?? $input['email'] ?? '')));
if ($destination === '' || !filter_var($destination, FILTER_VALIDATE_EMAIL)) {
    buykon_json_fail(400, 'E-poçt yanlışdır');
}

$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
$isLocal = str_contains($host, 'localhost') || str_contains($host, '127.0.0.1');
$apiBase = buykon_env('API_BASE');
if ($apiBase === '') {
    $apiBase = $isLocal ? 'http://localhost:8080/api' : 'https://api.buykon.com/api';
}
$apiBase = rtrim($apiBase, '/');

function seller_otp_proxy(string $url, array $body): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    $resp = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return ['http' => 502, 'data' => ['ok' => false, 'error' => 'API bağlantı xətası: ' . $err]];
    }
    $data = json_decode((string) $resp, true);
    if (!is_array($data)) {
        $data = ['ok' => false, 'error' => 'API cavabı oxunmadı'];
    }
    return ['http' => $status, 'data' => $data];
}

if ($action === 'send') {
    $result = seller_otp_proxy($apiBase . '/auth/email/request-otp', [
        'email' => $destination,
        'purpose' => 'seller_register',
    ]);
    $data = $result['data'];
    $ok = ($result['http'] >= 200 && $result['http'] < 300) && !empty($data['ok']);
    if (!$ok) {
        buykon_json_fail(
            $result['http'] >= 400 ? $result['http'] : 502,
            (string) ($data['error'] ?? 'OTP göndərilmədi')
        );
    }
    echo json_encode([
        'ok' => true,
        'retry_after' => (int) ($data['expires_in'] ?? 60),
        'expires_in' => (int) ($data['expires_in'] ?? 600),
        'message' => (string) ($data['message'] ?? 'Kod e-poçtunuza göndərildi'),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'verify') {
    $code = preg_replace('/\D+/', '', (string) ($input['code'] ?? '')) ?? '';
    if (strlen($code) !== 6) {
        buykon_json_fail(400, 'Kod 6 rəqəm olmalıdır');
    }
    $result = seller_otp_proxy($apiBase . '/auth/email/verify-otp', [
        'email' => $destination,
        'code' => $code,
        'purpose' => 'seller_register',
    ]);
    $data = $result['data'];
    $ok = ($result['http'] >= 200 && $result['http'] < 300) && !empty($data['ok']);
    if (!$ok) {
        buykon_json_fail(
            $result['http'] >= 400 ? $result['http'] : 502,
            (string) ($data['error'] ?? 'Kod səhvdir')
        );
    }

    if (!isset($_SESSION['seller_otp_ok']) || !is_array($_SESSION['seller_otp_ok'])) {
        $_SESSION['seller_otp_ok'] = [];
    }
    $_SESSION['seller_otp_ok']['email|' . $destination] = time();

    echo json_encode(['ok' => true, 'verified' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

buykon_json_fail(400, 'Naməlum action');
