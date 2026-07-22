<?php
/**
 * Ortak .env oxuyucu — api/*.php üçün
 */
declare(strict_types=1);

function buykon_load_env(?string $path = null): void
{
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;
    $envPath = $path ?: (dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env');
    if (!is_readable($envPath)) {
        return;
    }
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
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
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }
        // .env həmişə üstün olsun (köhnə boş env-ləri əvəz et)
        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
    }
}

function buykon_env(string $key, string $default = ''): string
{
    $v = $_ENV[$key] ?? getenv($key);
    if (!is_string($v) || trim($v) === '') {
        return $default;
    }
    return trim($v);
}

function buykon_json_fail(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
