<?php
/**
 * Satıcı e-poçt OTP
 * 1) Java API (/auth/email/*) — əsas yol
 * 2) Uğursuzdursa lokal SMTP (_mail.php) — prod JAR köhnə olanda 404-ü örtür
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/_env.php';
require_once __DIR__ . '/_mail.php';

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

$action = strtolower(trim((string) ($input['action'] ?? '')));
$email = strtolower(trim((string) ($input['email'] ?? $input['destination'] ?? '')));
$code = preg_replace('/\D+/', '', (string) ($input['code'] ?? '')) ?? '';
$purpose = trim((string) ($input['purpose'] ?? 'seller_register'));
if ($purpose === '') {
    $purpose = 'seller_register';
}

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    buykon_json_fail(400, 'E-poçt yanlışdır');
}

$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
$isLocal = str_contains($host, 'localhost') || str_contains($host, '127.0.0.1');
$apiBase = buykon_env('API_BASE');
if ($apiBase === '') {
    $apiBase = $isLocal ? 'http://localhost:8080/api' : 'https://api.buykon.com/api';
}
$apiBase = rtrim($apiBase, '/');

$storeDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'seller-otp';
if (!is_dir($storeDir)) {
    @mkdir($storeDir, 0755, true);
}

function seller_otp_proxy(string $url, array $body): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 8,
    ]);
    $resp = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return ['http' => 0, 'data' => ['ok' => false, 'error' => 'API bağlantı xətası: ' . $err]];
    }
    $data = json_decode((string) $resp, true);
    if (!is_array($data)) {
        $data = ['ok' => false, 'error' => 'API cavabı oxunmadı'];
    }
    return ['http' => $status, 'data' => $data];
}

function seller_otp_file(string $dir, string $email, string $purpose): string
{
    return $dir . DIRECTORY_SEPARATOR . hash('sha256', $purpose . '|' . $email) . '.json';
}

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

function seller_otp_local_send(string $email, string $purpose, string $storeDir, bool $isLocal): array
{
    $file = seller_otp_file($storeDir, $email, $purpose);
    $meta = seller_otp_read($file);
    $now = time();
    $hits = array_values(array_filter(
        $meta['hits'] ?? [],
        static fn ($t) => is_int($t) && ($now - $t) < 3600
    ));
    if (count($hits) >= 5) {
        return ['ok' => false, 'http' => 429, 'error' => 'Bu e-poçta çox kod göndərildi — bir az sonra yenidən yoxlayın'];
    }

    $code = (string) random_int(100000, 999999);
    $hits[] = $now;
    seller_otp_write($file, [
        'code_hash' => password_hash($code, PASSWORD_DEFAULT),
        'expires' => $now + 600,
        'attempts' => 0,
        'email' => $email,
        'purpose' => $purpose,
        'hits' => $hits,
        'verified' => false,
    ]);

    $subject = 'Buykon — satıcı qeydiyyat kodu';
    $text = "Buykon Satıcı Qeydiyyatı\n\nE-poçt təsdiq kodunuz: {$code}\n\nKod 10 dəqiqə ərzində etibarlıdır.\n";
    $mail = buykon_mail_send($email, $subject, buykon_otp_email_html($code), $text);

    $out = [
        'ok' => true,
        'otp_sent' => true,
        'retry_after' => 60,
        'expires_in' => 600,
        'message' => 'Kod e-poçtunuza göndərildi',
        'via' => 'php',
    ];

    if (!$mail['ok']) {
        if ($isLocal || buykon_env('OTP_DEV_LOG', '0') === '1') {
            $out['dev_code'] = $code;
            $out['mail_warning'] = $mail['error'] ?? 'SMTP uğursuz';
            @file_put_contents(
                $storeDir . DIRECTORY_SEPARATOR . 'audit.log',
                date('c') . " DEV_OTP {$email} {$code}\n",
                FILE_APPEND | LOCK_EX
            );
            return $out;
        }
        return ['ok' => false, 'http' => 500, 'error' => $mail['error'] ?? 'OTP e-poçtu göndərilmədi'];
    }

    @file_put_contents(
        $storeDir . DIRECTORY_SEPARATOR . 'audit.log',
        date('c') . " SENT {$email}\n",
        FILE_APPEND | LOCK_EX
    );

    return $out;
}

function seller_otp_make_proof(string $email, string $purpose): array
{
    $secret = buykon_env('OTP_PROOF_SECRET');
    if ($secret === '') {
        $secret = buykon_env('DIDIT_WEBHOOK_SECRET');
    }
    if ($secret === '') {
        return [];
    }
    $exp = time() + 7200;
    $payload = strtolower($email) . '|' . $purpose . '|' . $exp;
    $sig = hash_hmac('sha256', $payload, $secret);
    return [
        'otp_proof' => $payload . '|' . $sig,
        'otp_proof_expires' => $exp,
    ];
}

function seller_otp_local_verify(string $email, string $purpose, string $code, string $storeDir): array
{
    if (strlen($code) !== 6) {
        return ['ok' => false, 'http' => 400, 'error' => '6 rəqəmli kod daxil edin'];
    }
    $file = seller_otp_file($storeDir, $email, $purpose);
    $meta = seller_otp_read($file);
    if ($meta === [] || empty($meta['code_hash'])) {
        return ['ok' => false, 'http' => 400, 'error' => 'Əvvəlcə kod göndərin'];
    }
    if (($meta['attempts'] ?? 0) >= 5) {
        return ['ok' => false, 'http' => 429, 'error' => 'Çox səhv cəhd — yeni kod istəyin'];
    }
    if (time() > (int) ($meta['expires'] ?? 0)) {
        return ['ok' => false, 'http' => 400, 'error' => 'Kodun vaxtı bitib'];
    }
    $meta['attempts'] = (int) ($meta['attempts'] ?? 0) + 1;
    if (!password_verify($code, (string) $meta['code_hash'])) {
        seller_otp_write($file, $meta);
        return ['ok' => false, 'http' => 400, 'error' => 'OTP kodu yanlışdır'];
    }
    $meta['verified'] = true;
    $meta['code_hash'] = '';
    $meta['verified_at'] = time();
    seller_otp_write($file, $meta);

    if (!isset($_SESSION['seller_otp_ok']) || !is_array($_SESSION['seller_otp_ok'])) {
        $_SESSION['seller_otp_ok'] = [];
    }
    $_SESSION['seller_otp_ok']['email|' . $email] = time();

    $out = [
        'ok' => true,
        'verified' => true,
        'email' => $email,
        'purpose' => $purpose,
        'via' => 'php',
    ];
    return array_merge($out, seller_otp_make_proof($email, $purpose));
}

if ($action === 'send' || $action === 'request' || $action === 'request-otp') {
    $java = seller_otp_proxy($apiBase . '/auth/email/request-otp', [
        'email' => $email,
        'purpose' => $purpose,
    ]);
    $ok = ($java['http'] >= 200 && $java['http'] < 300) && !empty($java['data']['ok']);
    if ($ok) {
        $data = $java['data'];
        $data['via'] = 'java';
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 404 / bağlantı — lokal SMTP
    $local = seller_otp_local_send($email, $purpose, $storeDir, $isLocal);
    if (empty($local['ok'])) {
        buykon_json_fail((int) ($local['http'] ?? 500), (string) ($local['error'] ?? 'OTP göndərilmədi'));
    }
    echo json_encode($local, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'verify' || $action === 'verify-otp') {
    if (strlen($code) !== 6) {
        buykon_json_fail(400, '6 rəqəmli kod daxil edin');
    }

    $java = seller_otp_proxy($apiBase . '/auth/email/verify-otp', [
        'email' => $email,
        'code' => $code,
        'purpose' => $purpose,
    ]);
    $ok = ($java['http'] >= 200 && $java['http'] < 300) && !empty($java['data']['ok']);
    if ($ok) {
        if (!isset($_SESSION['seller_otp_ok']) || !is_array($_SESSION['seller_otp_ok'])) {
            $_SESSION['seller_otp_ok'] = [];
        }
        $_SESSION['seller_otp_ok']['email|' . $email] = time();
        $data = $java['data'];
        $data['via'] = 'java';
        $data = array_merge($data, seller_otp_make_proof($email, $purpose));
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    $local = seller_otp_local_verify($email, $purpose, $code, $storeDir);
    if (empty($local['ok'])) {
        // Java 404 olduqda lokal xəta; əks halda Java xətasını göstər
        if ($java['http'] === 404 || $java['http'] === 0) {
            buykon_json_fail((int) ($local['http'] ?? 400), (string) ($local['error'] ?? 'Kod səhvdir'));
        }
        buykon_json_fail(
            $java['http'] >= 400 ? $java['http'] : 400,
            (string) ($java['data']['error'] ?? $local['error'] ?? 'Kod səhvdir')
        );
    }
    echo json_encode($local, JSON_UNESCAPED_UNICODE);
    exit;
}

buykon_json_fail(400, 'Naməlum action');
