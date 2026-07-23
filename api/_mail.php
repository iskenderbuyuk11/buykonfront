<?php
/**
 * Buykon mail — SMTP (.env) və ya PHP mail() fallback
 */
declare(strict_types=1);

require_once __DIR__ . '/_env.php';

/**
 * @return array{ok:bool, error?:string, via?:string}
 */
function buykon_mail_send(string $to, string $subject, string $htmlBody, string $textBody = ''): array
{
    buykon_load_env();

    $to = trim($to);
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Alıcı e-poçt yanlışdır'];
    }

    if ($textBody === '') {
        $textBody = trim(html_entity_decode(strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody)), ENT_QUOTES, 'UTF-8'));
    }

    $fromEmail = buykon_env('MAIL_FROM', buykon_env('SMTP_USER', 'noreply@buykon.com'));
    $fromName = buykon_env('MAIL_FROM_NAME', 'Buykon');
    $host = buykon_env('SMTP_HOST');

    if ($host !== '') {
        $result = buykon_mail_smtp($to, $subject, $htmlBody, $textBody, $fromEmail, $fromName);
        if ($result['ok']) {
            $result['via'] = 'smtp';
        }
        return $result;
    }

    // SMTP yoxdursa mail() cəhdi (XAMPP-də adətən işləmir)
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . buykon_mail_encode_address($fromName, $fromEmail),
        'Reply-To: ' . $fromEmail,
        'X-Mailer: Buykon/1.0',
    ];
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $ok = @mail($to, $encodedSubject, $htmlBody, implode("\r\n", $headers));
    if ($ok) {
        return ['ok' => true, 'via' => 'mail'];
    }

    return [
        'ok' => false,
        'error' => 'E-poçt göndərilmədi. .env-də SMTP_HOST / SMTP_USER / SMTP_PASS təyin edin.',
    ];
}

function buykon_mail_encode_address(string $name, string $email): string
{
    $name = trim(str_replace(["\r", "\n"], '', $name));
    $email = trim($email);
    if ($name === '') {
        return $email;
    }
    return '=?UTF-8?B?' . base64_encode($name) . '?= <' . $email . '>';
}

/**
 * @return array{ok:bool, error?:string}
 */
function buykon_mail_smtp(
    string $to,
    string $subject,
    string $htmlBody,
    string $textBody,
    string $fromEmail,
    string $fromName
): array {
    $host = buykon_env('SMTP_HOST');
    $port = (int) buykon_env('SMTP_PORT', '587');
    $user = buykon_env('SMTP_USER');
    $pass = buykon_env('SMTP_PASS');
    $secure = strtolower(buykon_env('SMTP_SECURE', $port === 465 ? 'ssl' : 'tls')); // ssl | tls | none

    $errno = 0;
    $errstr = '';
    $timeout = 20;

    $remote = ($secure === 'ssl' ? 'ssl://' : '') . $host . ':' . $port;
    $ctx = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
        ],
    ]);

    $fp = @stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) {
        return ['ok' => false, 'error' => 'SMTP bağlantısı alınmadı: ' . $errstr];
    }
    stream_set_timeout($fp, $timeout);

    $read = static function () use ($fp): string {
        $data = '';
        while (!feof($fp)) {
            $line = fgets($fp, 515);
            if ($line === false) {
                break;
            }
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        return $data;
    };

    $expect = static function (string $resp, string $code) use (&$fp): ?string {
        if (!str_starts_with(trim($resp), $code)) {
            $msg = 'SMTP xətası: ' . trim($resp);
            if (is_resource($fp)) {
                fclose($fp);
                $fp = null;
            }
            return $msg;
        }
        return null;
    };

    $cmd = static function (string $line) use ($fp, $read): string {
        fwrite($fp, $line . "\r\n");
        return $read();
    };

    $greeting = $read();
    if ($err = $expect($greeting, '220')) {
        return ['ok' => false, 'error' => $err];
    }

    $ehloHost = 'buykon.local';
    $resp = $cmd('EHLO ' . $ehloHost);
    if ($err = $expect($resp, '250')) {
        return ['ok' => false, 'error' => $err];
    }

    if ($secure === 'tls') {
        $resp = $cmd('STARTTLS');
        if ($err = $expect($resp, '220')) {
            return ['ok' => false, 'error' => $err];
        }
        $crypto = stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if ($crypto !== true) {
            fclose($fp);
            return ['ok' => false, 'error' => 'STARTTLS uğursuz oldu'];
        }
        $resp = $cmd('EHLO ' . $ehloHost);
        if ($err = $expect($resp, '250')) {
            return ['ok' => false, 'error' => $err];
        }
    }

    if ($user !== '' && $pass !== '') {
        $resp = $cmd('AUTH LOGIN');
        if ($err = $expect($resp, '334')) {
            return ['ok' => false, 'error' => $err];
        }
        $resp = $cmd(base64_encode($user));
        if ($err = $expect($resp, '334')) {
            return ['ok' => false, 'error' => $err];
        }
        $resp = $cmd(base64_encode($pass));
        if ($err = $expect($resp, '235')) {
            return ['ok' => false, 'error' => 'SMTP autentifikasiya uğursuz: ' . trim($resp)];
        }
    }

    $resp = $cmd('MAIL FROM:<' . $fromEmail . '>');
    if ($err = $expect($resp, '250')) {
        return ['ok' => false, 'error' => $err];
    }
    $resp = $cmd('RCPT TO:<' . $to . '>');
    if ($err = $expect($resp, '250')) {
        return ['ok' => false, 'error' => $err];
    }
    $resp = $cmd('DATA');
    if ($err = $expect($resp, '354')) {
        return ['ok' => false, 'error' => $err];
    }

    $boundary = 'bk_' . bin2hex(random_bytes(8));
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers = [
        'Date: ' . date('r'),
        'From: ' . buykon_mail_encode_address($fromName, $fromEmail),
        'To: <' . $to . '>',
        'Subject: ' . $encodedSubject,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'X-Mailer: Buykon/1.0',
    ];

    $safeText = str_replace(["\r\n.", "\n."], ["\r\n..", "\n.."], $textBody);
    $safeHtml = str_replace(["\r\n.", "\n."], ["\r\n..", "\n.."], $htmlBody);

    $message =
        implode("\r\n", $headers) . "\r\n\r\n" .
        '--' . $boundary . "\r\n" .
        "Content-Type: text/plain; charset=UTF-8\r\n" .
        "Content-Transfer-Encoding: base64\r\n\r\n" .
        chunk_split(base64_encode($safeText)) .
        '--' . $boundary . "\r\n" .
        "Content-Type: text/html; charset=UTF-8\r\n" .
        "Content-Transfer-Encoding: base64\r\n\r\n" .
        chunk_split(base64_encode($safeHtml)) .
        '--' . $boundary . "--\r\n.";

    fwrite($fp, $message . "\r\n");
    $resp = $read();
    if ($err = $expect($resp, '250')) {
        return ['ok' => false, 'error' => $err];
    }

    $cmd('QUIT');
    fclose($fp);
    return ['ok' => true];
}

function buykon_otp_email_html(string $code): string
{
    $safe = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    return '<!doctype html><html><body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif">'
        . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px">'
        . '<tr><td align="center">'
        . '<table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">'
        . '<tr><td style="background:linear-gradient(135deg,#ff9100,#ffae00);padding:22px 24px;color:#fff">'
        . '<div style="font-size:20px;font-weight:800">Buykon</div>'
        . '<div style="opacity:.9;font-size:13px;margin-top:4px">Satıcı e-poçt təsdiqi</div>'
        . '</td></tr>'
        . '<tr><td style="padding:28px 24px;color:#0f172a">'
        . '<p style="margin:0 0 12px;font-size:15px;line-height:1.5">Qeydiyyatı davam etdirmək üçün aşağıdakı 6 rəqəmli kodu daxil edin:</p>'
        . '<div style="font-size:32px;letter-spacing:8px;font-weight:800;text-align:center;padding:16px;background:#fff7ed;border-radius:12px;color:#c2410c">'
        . $safe . '</div>'
        . '<p style="margin:16px 0 0;font-size:13px;color:#64748b;line-height:1.45">Kod 10 dəqiqə keçərlidir. Bu sorğunu siz göndərməmisinizsə, e-poçtu nəzərə almayın.</p>'
        . '</td></tr></table></td></tr></table></body></html>';
}
