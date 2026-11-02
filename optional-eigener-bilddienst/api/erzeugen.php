<?php
// Kleiner Vermittler zwischen der Seite kritzel-bild.html und Replicate.
// Der Zugangsschlüssel bleibt auf dem Server und gelangt nie in den Browser.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$cfgDatei = __DIR__ . '/config.php';
$cfg = is_file($cfgDatei) ? include $cfgDatei : null;

function antwort($daten, $status = 200) { http_response_code($status); echo json_encode($daten, JSON_UNESCAPED_UNICODE); exit; }
function fehler($text, $status = 400) { antwort(['fehler' => $text], $status); }

if (!$cfg || empty($cfg['token']) || strpos($cfg['token'], 'HIER_EINTRAGEN') !== false || !function_exists('curl_init')) {
  if (isset($_GET['status'])) antwort(['bereit' => false, 'code' => false]);
  fehler('Der Bilddienst ist noch nicht eingerichtet.', 503);
}
$basis = rtrim($cfg['api_basis'] ?? 'https://api.replicate.com/v1', '/');
$datenDir = __DIR__ . '/daten';
if (!is_dir($datenDir)) { @mkdir($datenDir, 0700, true); @file_put_contents($datenDir . '/.htaccess', "Require all denied\nDeny from all\n"); }

function replicate($cfg, $methode, $pfad, $body = null) {
  $basis = rtrim($cfg['api_basis'] ?? 'https://api.replicate.com/v1', '/');
  $ch = curl_init($basis . $pfad);
  $kopf = ['Authorization: Bearer ' . $cfg['token'], 'Content-Type: application/json'];
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25, CURLOPT_CUSTOMREQUEST => $methode, CURLOPT_HTTPHEADER => $kopf]);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
  $roh = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
  return [$code, $roh === false ? null : json_decode($roh, true), $err];
}
function zaehler_pruefen($cfg, $datenDir, $zaehlen) {
  $datei = $datenDir . '/zaehler.json'; $fp = fopen($datei, 'c+'); if (!$fp) return true; flock($fp, LOCK_EX);
  $roh = stream_get_contents($fp); $z = $roh ? json_decode($roh, true) : []; if (!is_array($z)) $z = [];
  $heute = date('Y-m-d'); if (($z['tag'] ?? '') !== $heute) $z = ['tag' => $heute, 'gesamt' => 0, 'ips' => []];
  $stunde = date('Y-m-d H'); $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'kritzel'); 
  $mi = $z['ips'][$ip] ?? ['h' => $stunde, 'n' => 0]; if ($mi['h'] !== $stunde) $mi = ['h' => $stunde, 'n' => 0];
  $ok = $z['gesamt'] < ($cfg['max_pro_tag'] ?? 80) && $mi['n'] < ($cfg['max_pro_ip_und_stunde'] ?? 12);
  if ($ok && $zaehlen) { $z['gesamt']++; $mi['n']++; $z['ips'][$ip] = $mi; }
  rewind($fp); ftruncate($fp, 0); fwrite($fp, json_encode($z)); flock($fp, LOCK_UN); fclose($fp);
  return [$ok, max(0, ($cfg['max_pro_tag'] ?? 80) - $z['gesamt'])];
}

// Status für die Seite
if (isset($_GET['status'])) { list($ok, $rest) = zaehler_pruefen($cfg, $datenDir, false); antwort(['bereit' => true, 'code' => !empty($cfg['klassencode']), 'heuteFrei' => $ok, 'rest' => $rest]); }

// Fertiges Bild abholen oder Stand abfragen
if (isset($_GET['id'])) {
  $id = $_GET['id']; if (!preg_match('/^[a-z0-9]{10,40}$/', $id)) fehler('Ungültige Kennung.');
  list($code, $p, $err) = replicate($cfg, 'GET', '/predictions/' . $id);
  if ($code !== 200 || !is_array($p)) fehler('Der Dienst antwortet gerade nicht. Versuche es gleich noch einmal.', 502);
  $status = $p['status'] ?? 'unbekannt';
  if (isset($_GET['bild'])) {
    if ($status !== 'succeeded') fehler('Das Bild ist noch nicht fertig.', 409);
    $out = $p['output'] ?? null; $url = is_array($out) ? end($out) : $out;
    $host = parse_url((string)$url, PHP_URL_HOST) ?: ''; $erlaubt = false;
    foreach ($cfg['bildhosts'] ?? [] as $h) if ($host === $h || substr($host, -strlen($h) - 1) === '.' . $h) $erlaubt = true;
    if (!$erlaubt) fehler('Unerwartete Bildquelle.', 502);
    $ch = curl_init($url); curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25, CURLOPT_FOLLOWLOCATION => false]);
    $bin = curl_exec($ch); $c2 = curl_getinfo($ch, CURLINFO_HTTP_CODE); $typ = curl_getinfo($ch, CURLINFO_CONTENT_TYPE); curl_close($ch);
    if ($c2 !== 200 || $bin === false) fehler('Das Bild konnte nicht geladen werden.', 502);
    header('Content-Type: ' . (preg_match('#^image/(png|jpeg|webp)#', (string)$typ) ? $typ : 'image/png')); header('Cache-Control: private, max-age=3600'); echo $bin; exit;
  }
  $msg = null; if ($status === 'failed') $msg = 'Die Erzeugung ist fehlgeschlagen.'; if ($status === 'canceled') $msg = 'Die Erzeugung wurde abgebrochen.';
  antwort(['status' => $status, 'fehler' => $msg]);
}

// Neues Bild
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fehler('Bitte POST verwenden.', 405);
$in = json_decode(file_get_contents('php://input'), true); if (!is_array($in)) fehler('Ungültige Anfrage.');
if (!empty($cfg['klassencode']) && !hash_equals((string)$cfg['klassencode'], (string)($in['code'] ?? ''))) fehler('Der Klassencode stimmt nicht.', 403);
$prompt = trim((string)($in['prompt'] ?? '')); if ($prompt === '' || mb_strlen($prompt) > 200) fehler('Bitte schreibe eine kurze Beschreibung mit höchstens 200 Zeichen.');
$klein = mb_strtolower($prompt); foreach ($cfg['sperrwoerter'] ?? [] as $w) if ($w !== '' && mb_strpos($klein, $w) !== false) fehler('Diese Beschreibung ist hier nicht erlaubt. Wähle bitte etwas anderes.');
$bild = (string)($in['bild'] ?? ''); if (!preg_match('#^data:image/png;base64,[A-Za-z0-9+/=]+$#', $bild) || strlen($bild) > 1800000) fehler('Die Zeichnung ist ungültig oder zu groß.');
list($ok, $rest) = zaehler_pruefen($cfg, $datenDir, true); if (!$ok) fehler('Für heute oder diese Stunde sind alle Bilder aufgebraucht. Versuche es später noch einmal.', 429);
$voll = $prompt . (empty($cfg['prompt_zusatz']) ? '' : ', ' . $cfg['prompt_zusatz']);
$eingabe = []; foreach ($cfg['eingabe'] as $k => $v) $eingabe[$k] = $v === '{bild}' ? $bild : ($v === '{prompt}' ? $voll : $v);
list($code, $p, $err) = replicate($cfg, 'POST', '/predictions', ['version' => $cfg['version'], 'input' => $eingabe]);
if (($code !== 201 && $code !== 200) || !is_array($p) || empty($p['id'])) fehler('Der Bilddienst hat die Anfrage nicht angenommen' . ($code ? ' (Code ' . $code . ')' : '') . '.', 502);
antwort(['id' => $p['id'], 'rest' => $rest]);
