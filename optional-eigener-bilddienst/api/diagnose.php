<?php
// Einrichtungs-Check. Aufruf: diagnose.php?code=ADMINCODE
header('Content-Type: text/plain; charset=utf-8'); header('Cache-Control: no-store');
$cfgDatei = __DIR__ . '/config.php';
if (!is_file($cfgDatei)) { echo "config.php fehlt. Kopiere config.beispiel.php nach config.php.\n"; exit; }
$cfg = include $cfgDatei;
if (empty($cfg['admincode']) || !hash_equals((string)$cfg['admincode'], (string)($_GET['code'] ?? ''))) { http_response_code(403); echo "Falscher oder fehlender Code.\n"; exit; }
echo "PHP " . PHP_VERSION . "\n";
echo "cURL " . (function_exists('curl_init') ? 'vorhanden' : 'FEHLT') . "\n";
$dir = __DIR__ . '/daten'; if (!is_dir($dir)) @mkdir($dir, 0700, true);
echo "Ordner daten " . (is_writable($dir) ? 'beschreibbar' : 'NICHT beschreibbar') . "\n";
echo "Token " . (!empty($cfg['token']) && strpos($cfg['token'], 'HIER_EINTRAGEN') === false ? 'eingetragen' : 'FEHLT') . "\n";
function r($cfg, $pfad) { $ch = curl_init(rtrim($cfg['api_basis'] ?? 'https://api.replicate.com/v1', '/') . $pfad); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $cfg['token']]]); $o = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch); return [$c, json_decode((string)$o, true)]; }
list($c, $a) = r($cfg, '/account'); echo "Replicate Konto Antwortcode $c" . ($c === 200 ? ' (Token gültig, Konto ' . ($a['username'] ?? '?') . ')' : ' (Token ungültig oder Dienst nicht erreichbar)') . "\n";
$v = $cfg['version'] ?? ''; $modelle = ['jagilley/controlnet-scribble'];
foreach ($modelle as $m) { list($c, $d) = r($cfg, "/models/$m/versions/$v"); echo "Version $v bei $m Antwortcode $c\n";
  if ($c === 200 && isset($d['openapi_schema']['components']['schemas']['Input']['properties'])) { echo "Eingabefelder des Modells\n"; foreach ($d['openapi_schema']['components']['schemas']['Input']['properties'] as $k => $p) echo "  - $k (" . ($p['type'] ?? '?') . ")" . (isset($p['default']) ? ' Standard ' . json_encode($p['default']) : '') . "\n"; echo "In config.php eingestellt " . implode(', ', array_keys($cfg['eingabe'])) . "\n"; break; } }
