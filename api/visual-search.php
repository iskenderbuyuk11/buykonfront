<?php
/**
 * Şəkillə axtarış — Gemini Vision proxy
 * Açarı yalnız .env-dən oxuyur (frontend-ə getmir).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Yalnız POST icazəlidir']);
    exit;
}

function load_env_file(string $path): void
{
    if (!is_readable($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        if (strpos($line, '=') === false) {
            continue;
        }
        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if ($name === '') {
            continue;
        }
        // Dırnaqları götür
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }
        if (getenv($name) === false) {
            putenv($name . '=' . $value);
            $_ENV[$name] = $value;
        }
    }
}

function env_get(string $key): string
{
    $v = $_ENV[$key] ?? getenv($key);
    return is_string($v) ? trim($v) : '';
}

function json_fail(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function parse_vision_json(string $text): ?array
{
    $raw = trim($text);
    if (preg_match('/```(?:json)?\s*([\s\S]*?)```/i', $raw, $m)) {
        $raw = trim($m[1]);
    }
    $start = strpos($raw, '{');
    $end = strrpos($raw, '}');
    if ($start === false || $end === false || $end <= $start) {
        return null;
    }
    $slice = substr($raw, $start, $end - $start + 1);
    $decoded = json_decode($slice, true);
    return is_array($decoded) ? $decoded : null;
}

function call_gemini(string $apiKey, string $model, string $prompt, string $base64, string $mime, bool $jsonMime): array
{
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
        . rawurlencode($model)
        . ':generateContent?key='
        . rawurlencode($apiKey);

    $gen = [
        'temperature' => 0.1,
        'maxOutputTokens' => 1600,
    ];
    if ($jsonMime) {
        $gen['responseMimeType'] = 'application/json';
    }

    $payload = [
        'contents' => [[
            'role' => 'user',
            'parts' => [
                [
                    'inline_data' => [
                        'mime_type' => $mime,
                        'data' => $base64,
                    ],
                ],
                ['text' => $prompt],
            ],
        ]],
        'generationConfig' => $gen,
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 45,
    ]);
    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno) {
        return ['ok' => false, 'error' => 'Gemini bağlantı xətası: ' . $err];
    }

    $data = json_decode((string) $body, true);
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'Gemini cavabı oxunmadı'];
    }

    if ($status < 200 || $status >= 300) {
        $msg = $data['error']['message'] ?? ('Gemini xətası (' . $status . ')');
        return ['ok' => false, 'error' => $msg];
    }

    $candidate = $data['candidates'][0] ?? null;
    if (!$candidate) {
        $block = $data['promptFeedback']['blockReason'] ?? null;
        return [
            'ok' => false,
            'error' => $block ? ('Şəkil bloklandı: ' . $block) : 'Boş AI cavabı',
        ];
    }

    $parts = $candidate['content']['parts'] ?? [];
    $text = '';
    foreach ($parts as $part) {
        if (!empty($part['text'])) {
            $text .= $part['text'] . "\n";
        }
    }
    $text = trim($text);
    if ($text === '') {
        $reason = $candidate['finishReason'] ?? '?';
        return ['ok' => false, 'error' => 'AI mətn qaytarmadı (' . $reason . ')'];
    }

    $parsed = parse_vision_json($text);
    if (!$parsed) {
        return ['ok' => false, 'error' => 'AI JSON oxunmadı'];
    }

    return ['ok' => true, 'analysis' => $parsed, 'model' => $model];
}

// ——— main ———

load_env_file(dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');

$apiKey = env_get('GEMINI_API_KEY');
if ($apiKey === '' || $apiKey === 'your_key_here' || $apiKey === 'AIza...') {
    json_fail(503, 'NO_GEMINI_KEY');
}

$raw = file_get_contents('php://input');
$input = json_decode((string) $raw, true);
if (!is_array($input)) {
    json_fail(400, 'JSON gözlənilirdi');
}

$base64 = isset($input['image_base64']) ? (string) $input['image_base64'] : '';
$mime = isset($input['mime']) ? (string) $input['mime'] : 'image/jpeg';
$catalog = isset($input['catalog']) ? (string) $input['catalog'] : '';

$base64 = preg_replace('/\s+/', '', $base64) ?? '';
if ($base64 === '' || strlen($base64) < 64) {
    json_fail(400, 'Şəkil göndərilməyib');
}

// ~4MB base64 limiti
if (strlen($base64) > 4 * 1024 * 1024) {
    json_fail(413, 'Şəkil çox böyükdür');
}

if (!preg_match('#^image/(jpeg|jpg|png|webp)$#i', $mime)) {
    $mime = 'image/jpeg';
}

$prompt =
    "You help Buykon (Azerbaijani marketplace) visual search.\n" .
    "Find ALL distinct shoppable products visible in the photo (not background furniture).\n" .
    "For EACH detected product, estimate a bounding box as fractions of the image (0..1): [x, y, width, height] from top-left.\n" .
    "Match each detection to OUR CATALOG ids when truly similar. Also list complementary needed_ids.\n" .
    "CRITICAL: Do not force unrelated catalog matches. If none fit, matched_ids=[].\n" .
    "Return ONLY valid JSON:\n" .
    "{\n" .
    "  \"detections\": [\n" .
    "    {\n" .
    "      \"label\": \"short AZ/EN name e.g. Powerbank\",\n" .
    "      \"type\": \"powerbank|kran|dus|charger|smartphone|...\",\n" .
    "      \"brand\": \"\",\n" .
    "      \"keywords\": [\"az\",\"en\"],\n" .
    "      \"bbox\": [0.1, 0.2, 0.3, 0.4],\n" .
    "      \"matched_ids\": [catalog ids],\n" .
    "      \"needed_ids\": [complementary catalog ids]\n" .
    "    }\n" .
    "  ],\n" .
    "  \"product_name\": \"primary product\",\n" .
    "  \"brand\": \"\",\n" .
    "  \"category\": \"ev-yasam|elektronika|geyim|kosmetika|aksesuar|usaq|idman|supermarket|other\",\n" .
    "  \"type\": \"primary type\",\n" .
    "  \"keywords\": [\"...\"],\n" .
    "  \"search_queries\": [\"...\"],\n" .
    "  \"catalog_match\": true,\n" .
    "  \"matched_ids\": [],\n" .
    "  \"needed_ids\": []\n" .
    "}\n" .
    "Put 1-6 detections, most prominent first. Primary fields should mirror detections[0].\n" .
    "CATALOG (id | name | category | brand):\n" .
    ($catalog !== '' ? $catalog : '(empty)');

$models = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
];

$lastError = 'AI cavab vermədi';
$result = null;

foreach ($models as $model) {
    foreach ([true, false] as $jsonMime) {
        $attempt = call_gemini($apiKey, $model, $prompt, $base64, $mime, $jsonMime);
        if (!empty($attempt['ok'])) {
            $result = $attempt;
            break 2;
        }
        $lastError = (string) ($attempt['error'] ?? $lastError);
    }
}

if (!$result) {
    json_fail(502, $lastError);
}

echo json_encode([
    'ok' => true,
    'analysis' => $result['analysis'],
    'model' => $result['model'] ?? null,
], JSON_UNESCAPED_UNICODE);
