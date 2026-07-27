<?php
/**
 * Admin OTP — DB lazım deyil.
 * action=request|verify|set-password
 *
 * request: Java şifrə yoxlaması → faylda OTP → PHP SMTP
 * verify / set-password: fayl OTP → Java /php-login | /php-set-password (cookie)
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

$action = strtolower(trim((string) ($input['action'] ?? 'request')));
$email = strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');
$passwordConfirm = (string) ($input['password_confirm'] ?? $input['passwordConfirm'] ?? '');
$code = preg_replace('/\D+/', '', (string) ($input['code'] ?? '')) ?? '';

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
if ($secret === '') {
    buykon_json_fail(500, 'DIDIT_WEBHOOK_SECRET .env-də yoxdur');
}

$storeDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'admin-otp';
if (!is_dir($storeDir)) {
    @mkdir($storeDir, 0755, true);
}

if ($action === 'request' || $action === 'send' || $action === '') {
    admin_otp_action_request($email, $password, $apiBase, $secret, $storeDir, $isLocal);
}

if ($action === 'verify') {
    admin_otp_action_verify($email, $code, $apiBase, $secret, $storeDir);
}

if ($action === 'set-password' || $action === 'set_password') {
    admin_otp_action_set_password($email, $code, $password, $passwordConfirm, $apiBase, $secret, $storeDir);
}

buykon_json_fail(400, 'Naməlum action');

function admin_otp_file(string $dir, string $email): string
{
    return $dir . DIRECTORY_SEPARATOR . hash('sha256', 'admin|' . $email) . '.json';
}

function admin_otp_read(string $path): array
{
    if (!is_readable($path)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function admin_otp_write(string $path, array $data): void
{
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/** @return array{http:int,data:array,headers:string} */
function admin_otp_java(string $url, array $body, string $secret, bool $withHeaders = false): array
{
    $ch = curl_init($url);
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-Buykon-Mail-Key: ' . $secret,
    ];
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_HEADER => $withHeaders,
    ]);
    $resp = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    if ($errno) {
        return ['http' => 0, 'data' => ['error' => 'API bağlantı xətası: ' . $err], 'headers' => ''];
    }

    $rawHeaders = '';
    $rawBody = (string) $resp;
    if ($withHeaders) {
        $rawHeaders = substr($rawBody, 0, $headerSize);
        $rawBody = substr($rawBody, $headerSize);
    }
    $data = json_decode($rawBody, true);
    if (!is_array($data)) {
        $data = [];
    }
    return ['http' => $status, 'data' => $data, 'headers' => $rawHeaders];
}

function admin_otp_forward_cookies(string $rawHeaders): void
{
    foreach (explode("\r\n", $rawHeaders) as $line) {
        if (stripos($line, 'Set-Cookie:') === 0) {
            $cookie = trim(substr($line, strlen('Set-Cookie:')));
            if ($cookie !== '') {
                header('Set-Cookie: ' . $cookie, false);
            }
        }
    }
}

function admin_otp_action_request(
    string $email,
    string $password,
    string $apiBase,
    string $secret,
    string $storeDir,
    bool $isLocal
): void {
    $body = ['email' => $email];
    if ($password !== '') {
        $body['password'] = $password;
    }

    // 1) Yeni JAR: mail_code
    $res = admin_otp_java($apiBase . '/auth/admin/request-otp', $body, $secret);
    if ($res['http'] < 200 || $res['http'] >= 300) {
        $msg = (string) ($res['data']['error'] ?? $res['data']['message'] ?? 'OTP yaradıla bilmədi');
        http_response_code($res['http'] >= 400 ? $res['http'] : 502);
        echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $needsSetup = !empty($res['data']['needs_password_setup']);
    $expiresIn = (int) ($res['data']['expires_in'] ?? 600);
    $code = preg_replace('/\D+/', '', (string) ($res['data']['mail_code'] ?? ''));
    $via = 'java-mail-code';

    // 2) mail_code yoxdursa — faylda saxla (DB yox)
    if ($code === '' || strlen($code) < 4) {
        $code = (string) random_int(100000, 999999);
        $via = 'php-file';
        $file = admin_otp_file($storeDir, $email);
        $meta = admin_otp_read($file);
        $now = time();
        $hits = array_values(array_filter(
            $meta['hits'] ?? [],
            static fn ($t) => is_int($t) && ($now - $t) < 3600
        ));
        if (count($hits) >= 8) {
            buykon_json_fail(429, 'Bu e-poçta çox kod göndərildi — bir az sonra yenidən yoxlayın');
        }
        $hits[] = $now;
        admin_otp_write($file, [
            'code_hash' => password_hash($code, PASSWORD_DEFAULT),
            'expires' => $now + max(60, $expiresIn),
            'attempts' => 0,
            'email' => $email,
            'needs_setup' => $needsSetup,
            'hits' => $hits,
            'verified' => false,
        ]);
    } else {
        // Java hash-i saxlayıb — verify birbaşa Java-ya gedə bilər; faylı da yazırıq ehtiyat üçün
        $file = admin_otp_file($storeDir, $email);
        admin_otp_write($file, [
            'code_hash' => password_hash($code, PASSWORD_DEFAULT),
            'expires' => time() + max(60, $expiresIn),
            'attempts' => 0,
            'email' => $email,
            'needs_setup' => $needsSetup,
            'hits' => [time()],
            'verified' => false,
            'java_mail_code' => true,
        ]);
    }

    $subject = 'Buykon Admin — giriş təsdiq kodu';
    $plain = "Buykon Admin panel\n\nGiriş kodunuz: {$code}\n\nKod 10 dəqiqə ərzində etibarlıdır.\n";
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
    exit;
}

function admin_otp_check_file(string $email, string $code, string $storeDir): array
{
    if (strlen($code) !== 6) {
        return ['ok' => false, 'http' => 400, 'error' => '6 rəqəmli kod daxil edin'];
    }
    $file = admin_otp_file($storeDir, $email);
    $meta = admin_otp_read($file);
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
        admin_otp_write($file, $meta);
        return ['ok' => false, 'http' => 400, 'error' => 'OTP kodu yanlışdır'];
    }
    $meta['verified'] = true;
    $meta['code_hash'] = '';
    admin_otp_write($file, $meta);
    return [
        'ok' => true,
        'needs_setup' => !empty($meta['needs_setup']),
        'java_mail_code' => !empty($meta['java_mail_code']),
    ];
}

function admin_otp_action_verify(
    string $email,
    string $code,
    string $apiBase,
    string $secret,
    string $storeDir
): void {
    $check = admin_otp_check_file($email, $code, $storeDir);
    if (empty($check['ok'])) {
        http_response_code((int) ($check['http'] ?? 400));
        echo json_encode(['ok' => false, 'error' => $check['error'] ?? 'OTP yanlışdır'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Java mail_code yolu: birbaşa verify-otp
    if (!empty($check['java_mail_code'])) {
        $res = admin_otp_java($apiBase . '/auth/admin/verify-otp', [
            'email' => $email,
            'code' => $code,
        ], $secret, true);
        if ($res['http'] >= 200 && $res['http'] < 300) {
            admin_otp_forward_cookies($res['headers']);
            echo json_encode($res['data'] ?: ['ok' => true], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    if (!empty($check['needs_setup'])) {
        echo json_encode([
            'ok' => true,
            'needs_password_setup' => true,
            'email' => $email,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $res = admin_otp_java($apiBase . '/auth/admin/php-login', ['email' => $email], $secret, true);
    if ($res['http'] === 404 || ($res['http'] === 401 && ($res['data']['error'] ?? '') === 'İcazə yoxdur')) {
        // Köhnə JAR: php-login yoxdur — Java verify cəhd et
        $res2 = admin_otp_java($apiBase . '/auth/admin/verify-otp', [
            'email' => $email,
            'code' => $code,
        ], $secret, true);
        if ($res2['http'] >= 200 && $res2['http'] < 300 && empty($res2['data']['needs_password_setup'])) {
            admin_otp_forward_cookies($res2['headers']);
            echo json_encode($res2['data'] ?: ['ok' => true], JSON_UNESCAPED_UNICODE);
            exit;
        }
        buykon_json_fail(502, 'Backend JAR yenilənməlidir (php-login). Şimdilik API: ' . ($res['data']['error'] ?? $res['http']));
    }
    if ($res['http'] < 200 || $res['http'] >= 300) {
        buykon_json_fail($res['http'] >= 400 ? $res['http'] : 502, (string) ($res['data']['error'] ?? 'Giriş uğursuz'));
    }
    if (!empty($res['data']['needs_password_setup'])) {
        echo json_encode($res['data'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    admin_otp_forward_cookies($res['headers']);
    echo json_encode($res['data'] ?: ['ok' => true, 'logged_in' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

function admin_otp_action_set_password(
    string $email,
    string $code,
    string $password,
    string $passwordConfirm,
    string $apiBase,
    string $secret,
    string $storeDir
): void {
    $file = admin_otp_file($storeDir, $email);
    $meta = admin_otp_read($file);
    if (empty($meta['verified'])) {
        $check = admin_otp_check_file($email, $code, $storeDir);
        if (empty($check['ok'])) {
            http_response_code((int) ($check['http'] ?? 400));
            echo json_encode(['ok' => false, 'error' => $check['error'] ?? 'OTP yanlışdır'], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $res = admin_otp_java($apiBase . '/auth/admin/php-set-password', [
        'email' => $email,
        'password' => $password,
        'password_confirm' => $passwordConfirm,
    ], $secret, true);

    if ($res['http'] === 404) {
        $res = admin_otp_java($apiBase . '/auth/admin/set-password', [
            'email' => $email,
            'code' => $code,
            'password' => $password,
            'password_confirm' => $passwordConfirm,
        ], $secret, true);
    }

    if ($res['http'] < 200 || $res['http'] >= 300) {
        buykon_json_fail($res['http'] >= 400 ? $res['http'] : 502, (string) ($res['data']['error'] ?? 'Şifrə təyin edilmədi'));
    }
    admin_otp_forward_cookies($res['headers']);
    @unlink($file);
    echo json_encode($res['data'] ?: ['ok' => true, 'logged_in' => true], JSON_UNESCAPED_UNICODE);
    exit;
}
