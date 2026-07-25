<?php
/**
 * Didit webhook — X-Signature-V2 HMAC verify + status dispatch.
 * Register this public HTTPS URL in Didit console (localhost rejected by SSRF guard).
 */
declare(strict_types=1);

require_once dirname(__DIR__) . '/_env.php';

buykon_load_env();

header('Content-Type: text/plain; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'method';
    exit;
}

$secret = buykon_env('DIDIT_WEBHOOK_SECRET');
if ($secret === '') {
    http_response_code(503);
    echo 'no secret';
    exit;
}

$raw = file_get_contents('php://input');
$sig = $_SERVER['HTTP_X_SIGNATURE_V2'] ?? '';
$ts = isset($_SERVER['HTTP_X_TIMESTAMP']) ? (int) $_SERVER['HTTP_X_TIMESTAMP'] : 0;

// 1) Freshness ≤ 300s
if (!$ts || abs(time() - $ts) > 300) {
    http_response_code(401);
    echo 'stale';
    exit;
}

$parsed = json_decode((string) $raw, true);
if (!is_array($parsed)) {
    http_response_code(400);
    echo 'bad json';
    exit;
}

// 2) Canonicalise: shortenFloats → sortKeys → JSON (unescaped Unicode)
function didit_shorten_floats(mixed $v): mixed
{
    if (is_array($v)) {
        $out = [];
        foreach ($v as $k => $x) {
            $out[$k] = didit_shorten_floats($x);
        }
        return $out;
    }
    if (is_float($v) && floor($v) == $v) {
        return (int) $v;
    }
    return $v;
}

function didit_sort_keys(mixed $v): mixed
{
    if (!is_array($v)) {
        return $v;
    }
    $isList = array_keys($v) === range(0, count($v) - 1);
    if ($isList) {
        $out = [];
        foreach ($v as $x) {
            $out[] = didit_sort_keys($x);
        }
        return $out;
    }
    $keys = array_keys($v);
    sort($keys, SORT_STRING);
    $out = [];
    foreach ($keys as $k) {
        $out[$k] = didit_sort_keys($v[$k]);
    }
    return $out;
}

$canonical = json_encode(
    didit_sort_keys(didit_shorten_floats($parsed)),
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

// 3) Constant-time HMAC-SHA256 vs X-Signature-V2
$expected = hash_hmac('sha256', (string) $canonical, $secret);
if ($sig === '' || !hash_equals($expected, $sig)) {
    http_response_code(401);
    echo 'bad sig';
    exit;
}

// 4) Idempotency on event_id (file-based for local/XAMPP)
$eventId = isset($parsed['event_id']) ? (string) $parsed['event_id'] : '';
$storeDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'buykon-didit-events';
if (!is_dir($storeDir)) {
    @mkdir($storeDir, 0700, true);
}
if ($eventId !== '') {
    $flag = $storeDir . DIRECTORY_SEPARATOR . hash('sha256', $eventId) . '.done';
    if (is_file($flag)) {
        echo 'ok';
        exit;
    }
    @file_put_contents($flag, (string) time());
}

// 5) Persist decision snapshot locally (Java API can replace this)
$status = isset($parsed['status']) ? (string) $parsed['status'] : '';
$vendor = isset($parsed['vendor_data']) ? (string) $parsed['vendor_data'] : '';
$logFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'didit-webhooks.log';
$logDir = dirname($logFile);
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}
@file_put_contents(
    $logFile,
    date('c') . "\t" . $status . "\t" . $vendor . "\t" . $eventId . "\n",
    FILE_APPEND
);

$statusFile = $logDir . DIRECTORY_SEPARATOR . 'kyc-status.json';
$map = [];
if (is_readable($statusFile)) {
    $prev = json_decode((string) file_get_contents($statusFile), true);
    if (is_array($prev)) {
        $map = $prev;
    }
}
if ($vendor !== '') {
    $statusMap = [
        'Approved' => 'approved',
        'Declined' => 'declined',
        'In Review' => 'pending_review',
        'In Progress' => 'in_progress',
        'Awaiting User' => 'awaiting_user',
        'Resubmitted' => 'resubmitted',
        'Abandoned' => 'abandoned',
        'Expired' => 'expired',
        'Kyc Expired' => 'kyc_expired',
    ];
    $internal = $statusMap[$status] ?? 'not_started';
    $map[$vendor] = [
        'status' => $internal,
        'didit_status' => $status,
        'session_id' => $parsed['session_id'] ?? null,
        'updated_at' => date('c'),
    ];
    @file_put_contents($statusFile, json_encode($map, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    // PHP seller KYC store (Java 404 fallback sessions)
    if (str_starts_with($vendor, 'seller_kyc:')) {
        $token = substr($vendor, strlen('seller_kyc:'));
        $token = preg_replace('/[^a-f0-9]/', '', strtolower($token)) ?? '';
        if ($token !== '') {
            $sellerKycDir = $logDir . DIRECTORY_SEPARATOR . 'seller-kyc';
            if (!is_dir($sellerKycDir)) {
                @mkdir($sellerKycDir, 0755, true);
            }
            $sellerFile = $sellerKycDir . DIRECTORY_SEPARATOR . $token . '.json';
            $app = [];
            if (is_readable($sellerFile)) {
                $prevApp = json_decode((string) file_get_contents($sellerFile), true);
                if (is_array($prevApp)) {
                    $app = $prevApp;
                }
            }
            $app['application_token'] = $app['application_token'] ?? $token;
            $app['status'] = $internal;
            $app['didit_status'] = $status;
            $app['didit_session_id'] = $parsed['session_id'] ?? ($app['didit_session_id'] ?? null);
            $app['vendor_data'] = $vendor;
            $app['updated_at'] = date('c');
            if (isset($parsed['decision']) && is_array($parsed['decision'])) {
                $app['decision'] = $parsed['decision'];
                $idv = $parsed['decision']['id_verifications'][0] ?? null;
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
                }
            }
            if ($internal === 'approved') {
                $app['verified_at'] = date('c');
            }
            @file_put_contents($sellerFile, json_encode($app, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
        }
    }
}

// Seller KYC: forward to Java so seller_kyc_applications is updated even if
// Didit console still points webhook at PHP hosting.
$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
$isLocal = str_contains($host, 'localhost') || str_contains($host, '127.0.0.1');
$apiBase = buykon_env('API_BASE');
if ($apiBase === '') {
    $apiBase = $isLocal ? 'http://localhost:8080/api' : 'https://api.buykon.com/api';
}
$apiBase = rtrim($apiBase, '/');
$forwardUrl = $apiBase . '/webhooks/didit';
$ch = curl_init($forwardUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json',
        'X-Signature-V2: ' . $sig,
        'X-Timestamp: ' . (string) $ts,
    ],
    CURLOPT_POSTFIELDS => (string) $raw,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 12,
    CURLOPT_CONNECTTIMEOUT => 5,
]);
@curl_exec($ch);
@curl_close($ch);

// 6) 2xx quickly
echo 'ok';
