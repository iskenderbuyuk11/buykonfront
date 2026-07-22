<?php
/**
 * Geyim virtual yoxlama — AI maneken (Gemini Image)
 * GEMINI_API_KEY yalnız .env-dən oxunur.
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
    buykon_json_fail(405, 'Yalnız POST icazəlidir');
}

buykon_load_env();

$apiKey = buykon_env('GEMINI_API_KEY');
if ($apiKey === '' || $apiKey === 'AIza...') {
    buykon_json_fail(503, 'NO_GEMINI_KEY');
}

$raw = file_get_contents('php://input');
$input = json_decode((string) $raw, true);
if (!is_array($input)) {
    buykon_json_fail(400, 'JSON gözlənilirdi');
}

$height = isset($input['height_cm']) ? (int) $input['height_cm'] : 0;
$weight = isset($input['weight_kg']) ? (int) $input['weight_kg'] : 0;
$skin = isset($input['skin']) ? trim((string) $input['skin']) : '';
$productName = isset($input['product_name']) ? trim((string) $input['product_name']) : 'clothing item';
$imageBase64 = isset($input['image_base64']) ? preg_replace('/\s+/', '', (string) $input['image_base64']) : '';
$imageUrl = isset($input['image_url']) ? trim((string) $input['image_url']) : '';
$mime = isset($input['mime']) ? (string) $input['mime'] : 'image/jpeg';

if ($height < 140 || $height > 220) {
    buykon_json_fail(400, 'Boy 140–220 sm arasında olmalıdır');
}
if ($weight < 40 || $weight > 160) {
    buykon_json_fail(400, 'Çəki 40–160 kq arasında olmalıdır');
}

$skinMap = [
    'light' => 'fair / light skin tone',
    'aciq' => 'fair / light skin tone',
    'medium' => 'medium / olive skin tone',
    'orta' => 'medium / olive skin tone',
    'tan' => 'tan / warm medium-deep skin tone',
    'bronza' => 'tan / warm medium-deep skin tone',
    'dark' => 'deep / dark skin tone',
    'tund' => 'deep / dark skin tone',
];
$skinKey = strtolower($skin);
$skinDesc = $skinMap[$skinKey] ?? '';
if ($skinDesc === '') {
    buykon_json_fail(400, 'Dəri rəngi seçin');
}

if ($imageBase64 === '' && $imageUrl !== '') {
    $ch = curl_init($imageUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_USERAGENT => 'BuykonTryOn/1.0',
    ]);
    $bin = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $ctype = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    if ($bin === false || $code < 200 || $code >= 300) {
        buykon_json_fail(400, 'Məhsul şəkli yüklənmədi');
    }
    $imageBase64 = base64_encode($bin);
    if (stripos($ctype, 'png') !== false) {
        $mime = 'image/png';
    } elseif (stripos($ctype, 'webp') !== false) {
        $mime = 'image/webp';
    } else {
        $mime = 'image/jpeg';
    }
}

if ($imageBase64 === '' || strlen($imageBase64) < 64) {
    buykon_json_fail(400, 'Məhsul şəkli lazımdır');
}
if (strlen($imageBase64) > 5 * 1024 * 1024) {
    buykon_json_fail(413, 'Şəkil çox böyükdür');
}
if (!preg_match('#^image/(jpeg|jpg|png|webp)$#i', $mime)) {
    $mime = 'image/jpeg';
}

$prompt =
    "You are a fashion e-commerce virtual try-on generator.\n" .
    "Using the REFERENCE clothing product image, create ONE photorealistic studio photo of a fashion mannequin/model WEARING that exact garment.\n" .
    "Product name: {$productName}\n" .
    "Body profile: height {$height} cm, weight {$weight} kg, {$skinDesc}.\n" .
    "Rules:\n" .
    "- Preserve the garment color, pattern, cut and logos accurately from the reference.\n" .
    "- Full or 3/4 body, standing pose, clean neutral studio background.\n" .
    "- Natural proportions matching the height/weight profile.\n" .
    "- No text overlays, no watermarks, no extra products.\n" .
    "- Output a single high-quality fashion photo.";

$models = [
    'gemini-3.1-flash-image',
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash-image',
];

function tryon_call_gemini(string $apiKey, string $model, string $prompt, string $base64, string $mime): array
{
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
        . rawurlencode($model)
        . ':generateContent?key='
        . rawurlencode($apiKey);

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
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE'],
            'temperature' => 0.4,
        ],
    ];

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 90,
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

    $parts = $data['candidates'][0]['content']['parts'] ?? [];
    foreach ($parts as $part) {
        $inline = $part['inline_data'] ?? $part['inlineData'] ?? null;
        if (is_array($inline) && !empty($inline['data'])) {
            $outMime = $inline['mime_type'] ?? $inline['mimeType'] ?? 'image/png';
            return [
                'ok' => true,
                'image_base64' => $inline['data'],
                'mime' => $outMime,
                'model' => $model,
            ];
        }
    }

    $block = $data['promptFeedback']['blockReason'] ?? null;
    if ($block) {
        return ['ok' => false, 'error' => 'Şəkil bloklandı: ' . $block];
    }
    return ['ok' => false, 'error' => 'AI şəkil qaytarmadı'];
}

$lastError = 'AI şəkil yarada bilmədi';
$result = null;
foreach ($models as $model) {
    $attempt = tryon_call_gemini($apiKey, $model, $prompt, $imageBase64, $mime);
    if (!empty($attempt['ok'])) {
        $result = $attempt;
        break;
    }
    $lastError = (string) ($attempt['error'] ?? $lastError);
}

if (!$result) {
    buykon_json_fail(502, $lastError);
}

echo json_encode([
    'ok' => true,
    'image_base64' => $result['image_base64'],
    'mime' => $result['mime'] ?? 'image/png',
    'model' => $result['model'] ?? null,
], JSON_UNESCAPED_UNICODE);
