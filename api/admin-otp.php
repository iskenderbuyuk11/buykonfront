<?php
/**
 * Admin panel OTP — Java şifrəni yoxlayır / kodu saxlayır; e-poçtu PHP SMTP göndərir.
 *
 * 1) Yeni JAR: X-Buykon-Mail-Key → mail_code → SMTP
 * 2) Köhnə JAR: DB_HOST varsa admin_otps-ə yazıb SMTP
 * POST JSON: email, password?
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

$raw = file_get_contents('php://input');
$input = json_decode((string) $raw, true);
if (!is_array($input)) {
    buykon_json_fail(400, 'JSON gözlənilirdi');
}

$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');

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

$secret = buykon_env('MAIL_INTERNAL_KEY');
if ($secret === '') {
    $secret = buykon_env('DIDIT_WEBHOOK_SECRET');
}

$body = ['email' => $email];
if ($password !== '') {
    $body['password'] = $password;
}

$headers = [
    'Content-Type: application/json',
    'Accept: application/json',
];
if ($secret !== '') {
    $headers[] = 'X-Buykon-Mail-Key: ' . $secret;
}

$ch = curl_init($apiBase . '/auth/admin/request-otp');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => $headers,
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
    buykon_json_fail(502, 'API bağlantı xətası: ' . $err);
}

$data = json_decode((string) $resp, true);
if (!is_array($data)) {
    $data = [];
}

if ($status < 200 || $status >= 300) {
    $msg = (string) ($data['error'] ?? $data['message'] ?? 'OTP yaradıla bilmədi');
    http_response_code($status >= 400 ? $status : 502);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$needsSetup = !empty($data['needs_password_setup']);
$expiresIn = (int) ($data['expires_in'] ?? 600);
$code = preg_replace('/\D+/', '', (string) ($data['mail_code'] ?? ''));
$via = 'java-mail-code';

// Köhnə JAR: mail_code yoxdur → DB-yə öz kodumuzu yazırıq
if ($code === '' || strlen($code) < 4) {
    $code = (string) random_int(100000, 999999);
    $purpose = $needsSetup ? 'setup' : 'login';
    $stored = admin_otp_store_in_db($email, $code, $purpose, $expiresIn);
    if (!$stored['ok']) {
        buykon_json_fail(502, $stored['error'] ?? 'OTP saxlanılmadı — JAR yeniləyin və ya .env-də DB_HOST yazın');
    }
    $via = 'php-db';
}

$subject = 'Buykon Admin — giriş təsdiq kodu';
$plain = "Buykon Admin panel\n\n"
    . 'Giriş kodunuz: ' . $code . "\n\n"
    . "Kod 10 dəqiqə ərzində etibarlıdır.\n"
    . "Bu kodu heç kimlə paylaşmayın.\n\n"
    . '— Buykon Marketplace';

$mail = buykon_mail_send($email, $subject, buykon_otp_email_html($code), $plain);
if (empty($mail['ok'])) {
    if ($isLocal || buykon_env('OTP_DEV_LOG', '0') === '1') {
        echo json_encode([
            'ok' => true,
            'otp_sent' => true,
            'expires_in' => $expiresIn,
            'needs_password_setup' => $needsSetup,
            'via' => $via . '-dev',
            'dev_code' => $code,
            'mail_warning' => $mail['error'] ?? 'SMTP uğursuz',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    buykon_json_fail(502, (string) ($mail['error'] ?? 'OTP e-poçtu göndərilmədi'));
}

echo json_encode([
    'ok' => true,
    'otp_sent' => true,
    'expires_in' => $expiresIn,
    'needs_password_setup' => $needsSetup,
    'via' => ($mail['via'] ?? 'php') . '/' . $via,
], JSON_UNESCAPED_UNICODE);

/**
 * @return array{ok:bool, error?:string}
 */
function admin_otp_store_in_db(string $email, string $code, string $purpose, int $expiresIn): array
{
    $dbHost = buykon_env('DB_HOST', buykon_env('MYSQL_HOST'));
    $dbName = buykon_env('DB_NAME', buykon_env('MYSQL_DATABASE', 'buykondb'));
    $dbUser = buykon_env('DB_USER', buykon_env('MYSQL_USER'));
    $dbPass = buykon_env('DB_PASS', buykon_env('MYSQL_PASSWORD', buykon_env('DB_PASSWORD')));

    if ($dbHost === '' || $dbUser === '') {
        return [
            'ok' => false,
            'error' => 'Köhnə API mail_code vermir. .env-ə DB_HOST/DB_USER/DB_PASS/DB_NAME əlavə edin və ya backend JAR yeniləyin',
        ];
    }

    try {
        $pdo = new PDO(
            'mysql:host=' . $dbHost . ';dbname=' . $dbName . ';charset=utf8mb4',
            $dbUser,
            $dbPass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => 'DB bağlantısı uğursuz: ' . $e->getMessage()];
    }

    try {
        $st = $pdo->prepare('SELECT id FROM admins WHERE email = ? AND is_active = 1 LIMIT 1');
        $st->execute([$email]);
        $row = $st->fetch();
        if (!$row) {
            return ['ok' => false, 'error' => 'Admin tapılmadı'];
        }
        $adminId = (int) $row['id'];
        $hash = password_hash($code, PASSWORD_BCRYPT);
        $pdo->prepare('DELETE FROM admin_otps WHERE admin_id = ?')->execute([$adminId]);
        $ins = $pdo->prepare(
            'INSERT INTO admin_otps (admin_id, code_hash, purpose, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))'
        );
        $ins->execute([$adminId, $hash, $purpose, max(60, $expiresIn)]);
        return ['ok' => true];
    } catch (Throwable $e) {
        return ['ok' => false, 'error' => 'OTP DB yazıla bilmədi: ' . $e->getMessage()];
    }
}
