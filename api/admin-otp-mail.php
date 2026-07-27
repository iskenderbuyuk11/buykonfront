<?php
/**
 * Admin panel OTP e-poçtu — Java SMTP işləməyəndə PHP SMTP fallback.
 * POST JSON: email, code
 * Auth: X-Buykon-Mail-Key = DIDIT_WEBHOOK_SECRET və ya MAIL_INTERNAL_KEY
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/_env.php';
require_once __DIR__ . '/_mail.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Buykon-Mail-Key');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    buykon_json_fail(405, 'Yalnız POST');
}

buykon_load_env();

$secret = buykon_env('MAIL_INTERNAL_KEY');
if ($secret === '') {
    $secret = buykon_env('DIDIT_WEBHOOK_SECRET');
}
$key = (string) ($_SERVER['HTTP_X_BUYKON_MAIL_KEY'] ?? '');
$remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
$fromLocal = $remote === '127.0.0.1' || $remote === '::1' || $remote === 'localhost';
if (!$fromLocal && ($secret === '' || $key === '' || !hash_equals($secret, $key))) {
    buykon_json_fail(401, 'İcazə yoxdur');
}

$raw = file_get_contents('php://input');
$input = json_decode((string) $raw, true);
if (!is_array($input)) {
    $input = [];
}

$email = strtolower(trim((string) ($input['email'] ?? '')));
$code = preg_replace('/\D+/', '', (string) ($input['code'] ?? ''));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    buykon_json_fail(400, 'E-poçt yanlışdır');
}
if ($code === '' || strlen($code) < 4 || strlen($code) > 8) {
    buykon_json_fail(400, 'OTP kodu yanlışdır');
}

$subject = 'Buykon Admin — giriş təsdiq kodu';
$plain = "Buykon Admin panel\n\n"
    . 'Giriş kodunuz: ' . $code . "\n\n"
    . "Kod 10 dəqiqə ərzində etibarlıdır.\n"
    . "Bu kodu heç kimlə paylaşmayın.\n\n"
    . '— Buykon Marketplace';

$safeCode = htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$safeEmail = htmlspecialchars($email, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$year = (int) date('Y');
$digits = '';
foreach (str_split($code) as $d) {
    $digits .= '<td style="padding:4px;"><div style="width:40px;height:48px;line-height:48px;text-align:center;'
        . 'background:#fff7ed;border:2px solid #ff9100;border-radius:10px;font-size:22px;font-weight:700;'
        . 'color:#1a1a1a;font-family:Consolas,Monaco,monospace;">'
        . htmlspecialchars($d, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
        . '</div></td>';
}

$html = <<<HTML
<!DOCTYPE html>
<html lang="az">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:24px;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 24px rgba(0,0,0,.08);">
    <h1 style="margin:0 0 8px;font-size:22px;color:#ff9100;">Buykon Admin</h1>
    <p style="margin:0 0 20px;color:#666;">Giriş təsdiq kodu · {$safeEmail}</p>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 20px;"><tr>{$digits}</tr></table>
    <p style="margin:0 0 8px;text-align:center;font-size:18px;letter-spacing:4px;font-weight:700;">{$safeCode}</p>
    <p style="margin:16px 0 0;color:#666;line-height:1.6;font-size:14px;">Kod 10 dəqiqə ərzində etibarlıdır. Bu kodu heç kimlə paylaşmayın.</p>
    <p style="margin:24px 0 0;color:#999;font-size:12px;">© {$year} Buykon</p>
  </div>
</body>
</html>
HTML;

$result = buykon_mail_send($email, $subject, $html, $plain);
if (empty($result['ok'])) {
    buykon_json_fail(502, (string) ($result['error'] ?? 'E-poçt göndərilmədi'));
}

echo json_encode([
    'ok' => true,
    'via' => $result['via'] ?? 'php',
    'email' => $email,
], JSON_UNESCAPED_UNICODE);
