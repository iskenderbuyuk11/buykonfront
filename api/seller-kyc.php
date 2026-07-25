<?php
/**
 * Satıcı Didit KYC — Java /auth/seller/kyc/* yoxdursa (404 Tapilmadi) lokal fallback.
 * Actions: session | status
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/_env.php';

const DIDIT_WORKFLOW_ID = '377185f9-762b-4bb4-aea2-b495a6f7a998';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

buykon_load_env();

$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
$isLocal = str_contains($host, 'localhost') || str_contains($host, '127.0.0.1');
$apiBase = buykon_env('API_BASE');
if ($apiBase === '') {
    $apiBase = $isLocal ? 'http://localhost:8080/api' : 'https://api.buykon.com/api';
}
$apiBase = rtrim($apiBase, '/');

$storeDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'seller-kyc';
if (!is_dir($storeDir)) {
    @mkdir($storeDir, 0755, true);
}

function skyc_file(string $dir, string $token): string
{
    return $dir . DIRECTORY_SEPARATOR . preg_replace('/[^a-f0-9]/', '', strtolower($token)) . '.json';
}

function skyc_read(string $path): array
{
    if (!is_readable($path)) {
        return [];
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : [];
}

function skyc_write(string $path, array $data): void
{
    file_put_contents($path, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

function skyc_map_status(string $diditStatus): string
{
    $map = [
        'Approved' => 'approved',
        'Declined' => 'declined',
        'In Review' => 'pending_review',
        'In Progress' => 'in_progress',
        'Awaiting User' => 'awaiting_user',
        'Not Started' => 'pending',
        'Resubmitted' => 'resubmitted',
        'Abandoned' => 'abandoned',
        'Expired' => 'expired',
        'Kyc Expired' => 'kyc_expired',
    ];
    foreach ($map as $key => $value) {
        if (strcasecmp($key, $diditStatus) === 0) {
            return $value;
        }
    }
    $slug = strtolower(str_replace(' ', '_', trim($diditStatus)));
    return $slug !== '' ? $slug : 'pending';
}

function skyc_proxy_json(string $method, string $url, ?array $body = null): array
{
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
    ];
    if ($body !== null) {
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);
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

function skyc_callback_url(): string
{
    $configured = buykon_env('DIDIT_SELLER_CALLBACK_URL');
    if ($configured !== '') {
        return $configured;
    }
    // Didit localhost/http callback-i bəzən 400 verir — prod HTTPS default
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (string) $_SERVER['SERVER_PORT'] === '443');
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $isLocal = str_contains($host, 'localhost') || str_contains($host, '127.0.0.1');
    if ($isLocal || !$https) {
        return 'https://buykon.com/buykonbusiness/register.html?kyc_return=1';
    }
    $scheme = 'https';
    $base = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
    return $scheme . '://' . $host . $base . '/buykonbusiness/register.html?kyc_return=1';
}

function skyc_create_didit(string $vendorData, string $email): array
{
    $apiKey = buykon_env('DIDIT_API_KEY');
    if ($apiKey === '') {
        return ['ok' => false, 'http' => 503, 'error' => 'NO_DIDIT_KEY'];
    }

    // Customer KYC ilə eyni minimal payload — contact_details/metadata Didit-də 400 verir
    $payload = [
        'workflow_id' => DIDIT_WORKFLOW_ID,
        'vendor_data' => $vendorData,
        'callback' => skyc_callback_url(),
        'callback_method' => 'both',
    ];
    // $email yalnız caller tərəfindən local JSON-a yazılır

    $ch = curl_init('https://verification.didit.me/v3/session/');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'x-api-key: ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return ['ok' => false, 'http' => 502, 'error' => 'Didit bağlantı xətası: ' . $err];
    }
    $data = json_decode((string) $body, true);
    if (!is_array($data)) {
        return ['ok' => false, 'http' => 502, 'error' => 'Didit cavabı oxunmadı'];
    }
    if ($status < 200 || $status >= 300) {
        $detail = $data['detail'] ?? $data['message'] ?? $data['error'] ?? null;
        if (is_array($detail)) {
            $detail = json_encode($detail, JSON_UNESCAPED_UNICODE);
        }
        $msg = is_string($detail) && $detail !== '' ? $detail : ('Didit xətası (' . $status . ')');
        if ($status === 401 || $status === 403) {
            return ['ok' => false, 'http' => 503, 'error' => 'NO_DIDIT_KEY'];
        }
        return ['ok' => false, 'http' => ($status >= 400 && $status < 600 ? $status : 502), 'error' => $msg];
    }
    $url = isset($data['url']) ? (string) $data['url'] : '';
    if ($url === '') {
        return ['ok' => false, 'http' => 502, 'error' => 'Didit URL qaytarmadı'];
    }
    return [
        'ok' => true,
        'url' => $url,
        'session_id' => $data['session_id'] ?? null,
        'status' => $data['status'] ?? 'Not Started',
    ];
}

function skyc_verify_otp_gate(string $email, ?string $otpProof): bool
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        @session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
            'use_strict_mode' => true,
        ]);
    }
    $ok = $_SESSION['seller_otp_ok']['email|' . $email] ?? null;
    if (is_int($ok) && (time() - $ok) < 7200) {
        return true;
    }
    if ($otpProof === null || $otpProof === '') {
        return false;
    }
    $secret = buykon_env('OTP_PROOF_SECRET');
    if ($secret === '') {
        $secret = buykon_env('DIDIT_WEBHOOK_SECRET');
    }
    if ($secret === '') {
        return false;
    }
    $parts = explode('|', $otpProof);
    if (count($parts) !== 4) {
        return false;
    }
    [$proofEmail, $purpose, $exp, $sig] = $parts;
    if (strtolower($proofEmail) !== $email || $purpose !== 'seller_register') {
        return false;
    }
    if ((int) $exp < time()) {
        return false;
    }
    $payload = strtolower($proofEmail) . '|' . $purpose . '|' . $exp;
    $expected = hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, strtolower($sig));
}

$action = '';
$token = '';
$email = '';
$otpProof = null;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = strtolower(trim((string) ($_GET['action'] ?? 'status')));
    $token = trim((string) ($_GET['token'] ?? ''));
} else {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        buykon_json_fail(405, 'Yalnız GET/POST');
    }
    $raw = file_get_contents('php://input');
    $input = json_decode((string) $raw, true);
    if (!is_array($input)) {
        $input = [];
    }
    $action = strtolower(trim((string) ($input['action'] ?? 'session')));
    $email = strtolower(trim((string) ($input['email'] ?? '')));
    $token = trim((string) ($input['token'] ?? $input['kyc_token'] ?? ''));
    $otpProof = isset($input['otp_proof']) ? trim((string) $input['otp_proof']) : null;
}

if ($action === 'session' || $action === 'create' || $action === 'create-session') {
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        buykon_json_fail(400, 'E-poçt yanlışdır');
    }
    if (!skyc_verify_otp_gate($email, $otpProof)) {
        buykon_json_fail(403, 'Əvvəlcə e-poçt OTP təsdiqini tamamlayın');
    }

    // 1) Try Java
    $javaBody = ['email' => $email];
    if ($otpProof) {
        $javaBody['otp_proof'] = $otpProof;
    }
    $java = skyc_proxy_json('POST', $apiBase . '/auth/seller/kyc/session', $javaBody);
    $ok = ($java['http'] >= 200 && $java['http'] < 300)
        && (!empty($java['data']['ok']) || !empty($java['data']['url']) || !empty($java['data']['kyc_token']));
    if ($ok) {
        $data = $java['data'];
        $data['via'] = 'java';
        if (empty($data['ok'])) {
            $data['ok'] = true;
        }
        // Güzgü: status yeniləmədə Didit decision çəkmək üçün session_id saxla
        $mirrorToken = (string) ($data['kyc_token'] ?? $data['token'] ?? '');
        $mirrorSession = (string) ($data['session_id'] ?? '');
        if ($mirrorToken !== '' && $mirrorSession !== '') {
            skyc_write(skyc_file($storeDir, $mirrorToken), [
                'application_token' => $mirrorToken,
                'email' => $email,
                'status' => skyc_map_status((string) ($data['status'] ?? 'Not Started')),
                'didit_status' => $data['didit_status'] ?? ($data['status'] ?? 'Not Started'),
                'didit_session_id' => $mirrorSession,
                'vendor_data' => 'seller_kyc:' . $mirrorToken,
                'created_at' => date('c'),
                'updated_at' => date('c'),
                'via' => 'java-mirror',
            ]);
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 2) PHP Didit fallback (Java 404 Tapilmadi / offline)
    $token = bin2hex(random_bytes(32));
    $vendorData = 'seller_kyc:' . $token;
    $didit = skyc_create_didit($vendorData, $email);
    if (empty($didit['ok'])) {
        buykon_json_fail((int) ($didit['http'] ?? 502), (string) ($didit['error'] ?? 'KYC sessiyası açılmadı'));
    }

    $diditStatus = (string) ($didit['status'] ?? 'Not Started');
    $record = [
        'application_token' => $token,
        'email' => $email,
        'status' => skyc_map_status($diditStatus),
        'didit_status' => $diditStatus,
        'didit_session_id' => $didit['session_id'] ?? null,
        'vendor_data' => $vendorData,
        'created_at' => date('c'),
        'updated_at' => date('c'),
        'via' => 'php',
    ];
    skyc_write(skyc_file($storeDir, $token), $record);

    echo json_encode([
        'ok' => true,
        'kyc_token' => $token,
        'token' => $token,
        'url' => $didit['url'],
        'verification_url' => $didit['url'],
        'session_id' => $didit['session_id'] ?? null,
        'status' => $record['status'],
        'via' => 'php',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function skyc_fetch_decision(string $sessionId): array
{
    $apiKey = buykon_env('DIDIT_API_KEY');
    if ($apiKey === '' || $sessionId === '') {
        return [];
    }
    $url = 'https://verification.didit.me/v3/session/' . rawurlencode($sessionId) . '/decision/';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPGET => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'x-api-key: ' . $apiKey,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 25,
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status < 200 || $status >= 300) {
        return [];
    }
    $data = json_decode((string) $body, true);
    return is_array($data) ? $data : [];
}

function skyc_apply_decision_to_app(array $app, array $decision): array
{
    $diditStatus = (string) ($decision['status'] ?? ($app['didit_status'] ?? ''));
    if ($diditStatus === '') {
        return $app;
    }
    $app['didit_status'] = $diditStatus;
    $app['status'] = skyc_map_status($diditStatus);
    $app['decision'] = $decision;
    $app['updated_at'] = date('c');
    if (($app['status'] ?? '') === 'approved') {
        $app['verified_at'] = date('c');
    }
    $idv = $decision['id_verifications'][0] ?? null;
    if (is_array($idv)) {
        $app['document_type'] = $idv['document_type'] ?? null;
        $app['document_number'] = $idv['document_number'] ?? null;
        $app['first_name'] = $idv['first_name'] ?? null;
        $app['last_name'] = $idv['last_name'] ?? null;
        $app['full_name'] = $idv['full_name'] ?? null;
        $app['date_of_birth'] = $idv['date_of_birth'] ?? null;
        $app['nationality'] = $idv['nationality'] ?? null;
        $app['gender'] = $idv['gender'] ?? null;
        $app['address'] = $idv['address'] ?? null;
        $app['issuing_state'] = $idv['issuing_state'] ?? null;
        $app['issuing_state_name'] = $idv['issuing_state_name'] ?? null;
        $app['place_of_birth'] = $idv['place_of_birth'] ?? null;
        $app['expiration_date'] = $idv['expiration_date'] ?? null;
        $app['date_of_issue'] = $idv['date_of_issue'] ?? null;
    }
    $live = $decision['liveness_checks'][0]['score'] ?? null;
    $face = $decision['face_matches'][0]['score'] ?? null;
    if ($live !== null) {
        $app['liveness_score'] = $live;
    }
    if ($face !== null) {
        $app['face_match_score'] = $face;
    }
    return $app;
}

function skyc_status_response(array $app, string $token): array
{
    $out = [
        'ok' => true,
        'kyc_token' => $app['application_token'] ?? $token,
        'status' => $app['status'] ?? 'pending',
        'kyc_status' => $app['status'] ?? 'pending',
        'didit_status' => $app['didit_status'] ?? null,
        'email' => $app['email'] ?? null,
        'verified' => (($app['status'] ?? '') === 'approved'),
        'via' => 'php',
    ];
    if (($app['status'] ?? '') === 'pending_review') {
        $out['reason'] = 'Sənəd məlumatı natamamdır və ya əlavə yoxlama tələb olunur';
    }
    if (($app['status'] ?? '') === 'declined') {
        $out['reason'] = 'Şəxsiyyət yoxlaması rədd edildi';
    }
    if (!empty($app['full_name'])) {
        $out['full_name'] = $app['full_name'];
    }
    return $out;
}

if ($action === 'status' || $action === 'kyc-status') {
    if ($token === '') {
        buykon_json_fail(400, 'KYC token tələb olunur');
    }

    $terminal = ['approved', 'declined', 'expired', 'kyc_expired', 'abandoned'];

    $java = skyc_proxy_json('GET', $apiBase . '/auth/seller/kyc/status?token=' . rawurlencode($token));
    $javaOk = ($java['http'] >= 200 && $java['http'] < 300) && !empty($java['data']['ok']);
    if ($javaOk) {
        $st = strtolower((string) ($java['data']['status'] ?? $java['data']['kyc_status'] ?? ''));
        if (in_array($st, $terminal, true)) {
            $data = $java['data'];
            $data['via'] = 'java';
            echo json_encode($data, JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $path = skyc_file($storeDir, $token);
    $app = skyc_read($path);
    if ($app === []) {
        $statusFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'kyc-status.json';
        $vendorKey = 'seller_kyc:' . $token;
        if (is_readable($statusFile)) {
            $map = json_decode((string) file_get_contents($statusFile), true);
            if (is_array($map) && isset($map[$vendorKey]) && is_array($map[$vendorKey])) {
                $row = $map[$vendorKey];
                $app = [
                    'application_token' => $token,
                    'status' => $row['status'] ?? 'pending',
                    'didit_status' => $row['didit_status'] ?? null,
                    'didit_session_id' => $row['session_id'] ?? null,
                ];
            }
        }
    }

    // Java cavabından session_id götür (güzgü yoxdursa)
    if ($app !== [] && empty($app['didit_session_id']) && $javaOk) {
        $sid = (string) ($java['data']['session_id'] ?? '');
        if ($sid !== '') {
            $app['didit_session_id'] = $sid;
        }
    }

    if ($app === []) {
        if ($javaOk) {
            $data = $java['data'];
            $data['via'] = 'java';
            echo json_encode($data, JSON_UNESCAPED_UNICODE);
            exit;
        }
        buykon_json_fail(404, 'KYC müraciəti tapılmadı');
    }

    $current = strtolower((string) ($app['status'] ?? 'pending'));
    if (!in_array($current, $terminal, true)) {
        $sessionId = (string) ($app['didit_session_id'] ?? '');
        if ($sessionId !== '') {
            $decision = skyc_fetch_decision($sessionId);
            if ($decision !== []) {
                $app = skyc_apply_decision_to_app($app, $decision);
                skyc_write($path, $app);
                $statusFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'kyc-status.json';
                $map = [];
                if (is_readable($statusFile)) {
                    $prev = json_decode((string) file_get_contents($statusFile), true);
                    if (is_array($prev)) {
                        $map = $prev;
                    }
                }
                $vendorKey = 'seller_kyc:' . $token;
                $map[$vendorKey] = [
                    'status' => $app['status'] ?? 'pending',
                    'didit_status' => $app['didit_status'] ?? null,
                    'session_id' => $sessionId,
                    'updated_at' => date('c'),
                ];
                @file_put_contents($statusFile, json_encode($map, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            }
        }
    }

    $out = skyc_status_response($app, $token);
    // Didit hələ pendingdirsə, Java pending cavabını da göstər
    if ($javaOk && !in_array(strtolower((string) ($out['status'] ?? '')), $terminal, true)) {
        $out['java_status'] = $java['data']['status'] ?? null;
    }
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

buykon_json_fail(400, 'Naməlum action');
