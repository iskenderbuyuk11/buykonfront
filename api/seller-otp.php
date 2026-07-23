<?php
/**
 * Satıcı OTP — telefon / e-poçt (lokal session + rate limit)
 * Production-da SMS/email gateway-ə bağlanmalıdır.
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
$channel = strtolower(trim((string) ($input['channel'] ?? '')));
$destination = trim((string) ($input['destination'] ?? ''));

if (!in_array($channel, ['phone', 'email'], true)) {
    buykon_json_fail(400, 'Kanal yanlışdır');
}
if ($destination === '') {
    buykon_json_fail(400, 'Ünvan lazımdır');
}

if ($channel === 'phone') {
    $digits = preg_replace('/\D+/', '', $destination) ?? '';
    if (str_starts_with($digits, '994') && strlen($digits) === 12) {
        $destination = '+' . $digits;
    } elseif (strlen($digits) === 9) {
        $destination = '+994' . $digits;
    }
    if (!preg_match('/^\+994\d{9}$/', $destination)) {
        buykon_json_fail(400, 'Telefon formatı yanlışdır');
    }
} else {
    $destination = strtolower($destination);
    if (!filter_var($destination, FILTER_VALIDATE_EMAIL)) {
        buykon_json_fail(400, 'E-poçt yanlışdır');
    }
}

$storeDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'seller-otp';
if (!is_dir($storeDir)) {
    @mkdir($storeDir, 0755, true);
}

$key = hash('sha256', $channel . '|' . $destination);
$file = $storeDir . DIRECTORY_SEPARATOR . $key . '.json';
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ipKey = hash('sha256', 'ip|' . $ip);
$ipFile = $storeDir . DIRECTORY_SEPARATOR . 'ip_' . $ipKey . '.json';

function seller_otp_read(string $path): array
{
    if (!is_readable($path)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function seller_otp_write(string $path, array $data): void
{
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function seller_otp_rate_ok(array $meta, int $max, int $windowSec): bool
{
    $now = time();
    $hits = array_values(array_filter(
        $meta['hits'] ?? [],
        static fn ($t) => is_int($t) && ($now - $t) < $windowSec
    ));
    return count($hits) < $max;
}

function seller_otp_hit(array $meta): array
{
    $now = time();
    $hits = array_values(array_filter(
        $meta['hits'] ?? [],
        static fn ($t) => is_int($t) && ($now - $t) < 3600
    ));
    $hits[] = $now;
    $meta['hits'] = $hits;
    return $meta;
}

$isLocal = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)
    || str_contains((string) ($_SERVER['HTTP_HOST'] ?? ''), 'localhost');

if ($action === 'send') {
    $ipMeta = seller_otp_read($ipFile);
    if (!seller_otp_rate_ok($ipMeta, 20, 3600)) {
        buykon_json_fail(429, 'Çox cəhd — bir az sonra yenidən yoxlayın');
    }
    $destMeta = seller_otp_read($file);
    if (!seller_otp_rate_ok($destMeta, 5, 3600)) {
        buykon_json_fail(429, 'Bu ünvana çox kod göndərildi');
    }

    $code = (string) random_int(100000, 999999);
    $payload = [
        'code_hash' => password_hash($code, PASSWORD_DEFAULT),
        'expires' => time() + 600,
        'attempts' => 0,
        'channel' => $channel,
        'destination' => $destination,
        'hits' => seller_otp_hit($destMeta)['hits'],
        'verified' => false,
    ];
    seller_otp_write($file, $payload);
    seller_otp_write($ipFile, seller_otp_hit($ipMeta));

    // Gateway placeholder — production-da SMS/email göndər
    $logLine = date('c') . " OTP {$channel} {$destination}\n";
    @file_put_contents($storeDir . DIRECTORY_SEPARATOR . 'audit.log', $logLine, FILE_APPEND | LOCK_EX);

    $out = [
        'ok' => true,
        'retry_after' => 60,
        'message' => 'Kod göndərildi',
    ];
    if ($isLocal) {
        $out['dev_code'] = $code;
    }
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'verify') {
    $code = preg_replace('/\D+/', '', (string) ($input['code'] ?? '')) ?? '';
    if (strlen($code) !== 6) {
        buykon_json_fail(400, 'Kod 6 rəqəm olmalıdır');
    }
    $meta = seller_otp_read($file);
    if ($meta === [] || empty($meta['code_hash'])) {
        buykon_json_fail(400, 'Əvvəlcə kod göndərin');
    }
    if (($meta['attempts'] ?? 0) >= 5) {
        buykon_json_fail(429, 'Çox səhv cəhd — yeni kod istəyin');
    }
    if (time() > (int) ($meta['expires'] ?? 0)) {
        buykon_json_fail(400, 'Kodun vaxtı bitib');
    }
    $meta['attempts'] = (int) ($meta['attempts'] ?? 0) + 1;
    if (!password_verify($code, (string) $meta['code_hash'])) {
        seller_otp_write($file, $meta);
        buykon_json_fail(400, 'Kod səhvdir');
    }
    $meta['verified'] = true;
    $meta['code_hash'] = '';
    seller_otp_write($file, $meta);

    if (!isset($_SESSION['seller_otp_ok']) || !is_array($_SESSION['seller_otp_ok'])) {
        $_SESSION['seller_otp_ok'] = [];
    }
    $_SESSION['seller_otp_ok'][$channel . '|' . $destination] = time();

    echo json_encode(['ok' => true, 'verified' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

buykon_json_fail(400, 'Naməlum action');
