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
}

// 6) 2xx quickly
echo 'ok';
