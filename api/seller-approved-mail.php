<?php
/**
 * Satıcı mağaza təsdiqi e-poçtu — Java SMTP işləməyəndə PHP SMTP fallback.
 * POST JSON: email, store_code, owner_name?, store_name?, login_url?
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
if ($secret === '' || $key === '' || !hash_equals($secret, $key)) {
    buykon_json_fail(401, 'İcazə yoxdur');
}

$raw = file_get_contents('php://input');
$input = json_decode((string) $raw, true);
if (!is_array($input)) {
    $input = [];
}

$email = strtolower(trim((string) ($input['email'] ?? '')));
$storeCode = trim((string) ($input['store_code'] ?? $input['storeCode'] ?? ''));
$ownerName = trim((string) ($input['owner_name'] ?? $input['ownerName'] ?? 'Mağaza sahibi'));
$storeName = trim((string) ($input['store_name'] ?? $input['storeName'] ?? ''));
$loginUrl = trim((string) ($input['login_url'] ?? $input['loginUrl'] ?? ''));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    buykon_json_fail(400, 'E-poçt yanlışdır');
}
if ($storeCode === '' || !preg_match('/^\d{9}$/', $storeCode)) {
    buykon_json_fail(400, 'Mağaza nömrəsi (9 rəqəm) tələb olunur');
}
if ($loginUrl === '') {
    $loginUrl = 'https://buykon.com/sellerpanel/login.html';
}
if ($ownerName === '') {
    $ownerName = 'Mağaza sahibi';
}

$subject = 'Buykon — Mağazanız təsdiqləndi';
$storeLine = $storeName !== '' ? ('Mağaza: ' . $storeName . "\n") : '';
$plain = "MAĞAZANIZ TƏSDİQLƏNDİ\n\n"
    . $storeLine
    . 'Mağaza nömrəsi: ' . $storeCode . "\n"
    . 'Mağaza sahibi: ' . $ownerName . "\n\n"
    . "İndi mağaza kodunuz və şifrəniz ilə satıcı panelinə daxil ola bilərsiniz:\n"
    . $loginUrl . "\n\n"
    . "— Buykon Marketplace";

$safeOwner = htmlspecialchars($ownerName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$safeCode = htmlspecialchars($storeCode, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$safeLogin = htmlspecialchars($loginUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$safeStore = htmlspecialchars($storeName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$year = (int) date('Y');
$storeHtml = $storeName !== ''
    ? '<p style="margin:0 0 8px;font-size:16px;"><strong>Mağaza:</strong> ' . $safeStore . '</p>'
    : '';

$html = <<<HTML
<!DOCTYPE html>
<html lang="az">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:24px;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 24px rgba(0,0,0,.08);">
    <h1 style="margin:0 0 16px;font-size:22px;color:#059669;">Mağazanız təsdiqləndi</h1>
    {$storeHtml}
    <p style="margin:0 0 8px;font-size:16px;"><strong>Mağaza nömrəsi:</strong> <span style="font-size:22px;letter-spacing:2px;color:#4f46e5;font-weight:700;">{$safeCode}</span></p>
    <p style="margin:0 0 24px;font-size:16px;"><strong>Mağaza sahibi:</strong> {$safeOwner}</p>
    <p style="margin:0 0 20px;color:#666;line-height:1.6;">Mağaza kodunuz və qeydiyyat zamanı təyin etdiyiniz şifrə ilə satıcı panelinə daxil ola bilərsiniz.</p>
    <a href="{$safeLogin}" style="display:inline-block;padding:14px 28px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Satıcı panelinə keç</a>
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
    'store_code' => $storeCode,
], JSON_UNESCAPED_UNICODE);
