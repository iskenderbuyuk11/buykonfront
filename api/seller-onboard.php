<?php
/**
 * Satıcı onboarding müraciəti — fayllar + JSON (admin təsdiqi üçün)
 * storage/seller-applications/ (gitignore-da)
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

function so_clean(string $v, int $max = 500): string
{
    $v = trim(strip_tags($v));
    if (strlen($v) > $max) {
        $v = substr($v, 0, $max);
    }
    return $v;
}

$account = so_clean((string) ($_POST['account_type'] ?? ''), 20);
if (!in_array($account, ['fiziki', 'ferdi', 'mmc'], true)) {
    buykon_json_fail(400, 'Hesab növü yanlışdır');
}

$email = strtolower(so_clean((string) ($_POST['email'] ?? ''), 180));
$phone = so_clean((string) ($_POST['phone'] ?? ''), 20);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    buykon_json_fail(400, 'E-poçt yanlışdır');
}
if (!preg_match('/^\+994\d{9}$/', $phone)) {
    buykon_json_fail(400, 'Telefon yanlışdır');
}

$otpOk = $_SESSION['seller_otp_ok'] ?? [];
if (!is_array($otpOk) || empty($otpOk['email|' . $email])) {
    buykon_json_fail(403, 'E-poçt təsdiqi tələb olunur');
}

$password = (string) ($_POST['password'] ?? '');
$password2 = (string) ($_POST['password_confirm'] ?? '');
if (strlen($password) < 8 || $password !== $password2) {
    buykon_json_fail(400, 'Şifrə düzgün deyil');
}
if (($_POST['contract_accepted'] ?? '') !== '1') {
    buykon_json_fail(400, 'Müqavilə qəbul edilməlidir');
}

$voen = so_clean((string) ($_POST['voen'] ?? ''), 10);
if ($account === 'ferdi' || $account === 'mmc') {
    if (!preg_match('/^\d{10}$/', $voen)) {
        buykon_json_fail(400, 'VÖEN tələb olunur');
    }
} else {
    $voen = '';
}

$requiredFiles = ['kycFront', 'kycBack', 'kycSelfie', 'logo', 'banner'];
foreach ($requiredFiles as $rf) {
    if (empty($_FILES[$rf]['tmp_name']) || !is_uploaded_file($_FILES[$rf]['tmp_name'])) {
        buykon_json_fail(400, 'Fayl çatışmır: ' . $rf);
    }
    if ((int) ($_FILES[$rf]['size'] ?? 0) > 5 * 1024 * 1024) {
        buykon_json_fail(413, 'Fayl çox böyükdür: ' . $rf);
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($_FILES[$rf]['tmp_name']) ?: '';
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        buykon_json_fail(400, 'Yalnız şəkil faylları: ' . $rf);
    }
}

$id = bin2hex(random_bytes(12));
$base = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'seller-applications';
$dir = $base . DIRECTORY_SEPARATOR . $id;
if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
    buykon_json_fail(500, 'Saxlama xətası');
}

$savedFiles = [];
foreach ($requiredFiles as $rf) {
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($_FILES[$rf]['tmp_name']) ?: 'image/jpeg';
    $ext = 'jpg';
    if ($mime === 'image/png') {
        $ext = 'png';
    } elseif ($mime === 'image/webp') {
        $ext = 'webp';
    }
    $name = $rf . '.' . $ext;
    $dest = $dir . DIRECTORY_SEPARATOR . $name;
    if (!move_uploaded_file($_FILES[$rf]['tmp_name'], $dest)) {
        buykon_json_fail(500, 'Fayl yüklənmədi');
    }
    $savedFiles[$rf] = $name;
}

$record = [
    'id' => $id,
    'status' => 'pending',
    'created_at' => date('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
    'account_type' => $account,
    'store_type' => so_clean((string) ($_POST['store_type'] ?? ''), 20),
    'name' => so_clean((string) ($_POST['name'] ?? '')),
    'surname' => so_clean((string) ($_POST['surname'] ?? '')),
    'patronymic' => so_clean((string) ($_POST['patronymic'] ?? '')),
    'birth_date' => so_clean((string) ($_POST['birth_date'] ?? ''), 20),
    'phone' => $phone,
    'email' => $email,
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    'voen' => $voen,
    'company_name' => so_clean((string) ($_POST['company_name'] ?? '')),
    'company_email' => so_clean((string) ($_POST['company_email'] ?? '')),
    'company_phone' => so_clean((string) ($_POST['company_phone'] ?? '')),
    'store_name' => so_clean((string) ($_POST['store_name'] ?? '')),
    'about' => so_clean((string) ($_POST['about'] ?? ''), 2000),
    'city' => so_clean((string) ($_POST['city'] ?? '')),
    'hours' => so_clean((string) ($_POST['hours'] ?? '')),
    'address' => so_clean((string) ($_POST['address'] ?? ''), 400),
    'bank_placeholder' => (($_POST['bank_placeholder'] ?? '') === '1'),
    'files' => $savedFiles,
];

file_put_contents(
    $dir . DIRECTORY_SEPARATOR . 'application.json',
    json_encode($record, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
    LOCK_EX
);

$audit = $base . DIRECTORY_SEPARATOR . 'audit.log';
@file_put_contents(
    $audit,
    date('c') . " NEW {$id} {$email} {$account} pending\n",
    FILE_APPEND | LOCK_EX
);

echo json_encode([
    'ok' => true,
    'id' => $id,
    'status' => 'pending',
    'message' => 'Müraciət qəbul edildi — admin təsdiqi gözlənilir',
], JSON_UNESCAPED_UNICODE);
