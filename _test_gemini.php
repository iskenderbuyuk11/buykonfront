<?php
require __DIR__ . "/api/_gemini.php";
echo buykon_gemini_key() ? ("KEY_OK len=" . strlen(buykon_gemini_key())) : "NO_KEY";
echo PHP_EOL;
$r = buykon_gemini_generate(
  [["text" => 'Reply JSON only: {"ok":true,"n":1}']],
  ["temperature" => 0, "timeout" => 40]
);
echo json_encode($r, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
echo PHP_EOL;
