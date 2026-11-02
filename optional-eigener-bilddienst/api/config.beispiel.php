<?php
// Diese Datei kopieren nach config.php und ausfüllen. config.php nie weitergeben.
return [
  // Zugangsschlüssel von replicate.com (Account, API tokens). Beginnt mit r8_
  'token' => 'r8_HIER_EINTRAGEN',

  // Modell und Version bei Replicate (ControlNet Scribble, dieselbe Version wie das ursprüngliche Scribble Diffusion)
  'version' => '435061a1b5a4c1e26740464bf786efdfa9cb3a3ac488595a2de23e143fdb0117',

  // Eingabefelder des Modells. {bild} und {prompt} werden ersetzt. Mit diagnose.php lassen sich die echten Feldnamen prüfen.
  'eingabe' => ['image' => '{bild}', 'prompt' => '{prompt}', 'structure' => 'scribble'],

  // Wird an jeden Prompt angehängt
  'prompt_zusatz' => 'best quality, detailed',

  // Klassencode. Leer lassen für keinen Code. Schüler geben ihn auf der Seite ein.
  'klassencode' => 'bitte-aendern',

  // Mit diesem Code öffnet man diagnose.php
  'admincode' => 'bitte-auch-aendern',

  // Kostenbremse
  'max_pro_ip_und_stunde' => 12,
  'max_pro_tag' => 80,

  // Erlaubte Hosts für fertige Bilder
  'bildhosts' => ['replicate.delivery', 'pbxt.replicate.delivery'],

  // Unerwünschte Wörter (klein geschrieben, Teilwörter genügen)
  'sperrwoerter' => ['nackt', 'nude', 'naked', 'porn', 'sex', 'blut', 'gore', 'hitler', 'nazi', 'töten', 'kill', 'suizid', 'waffe', 'gun'],

  // Nur für Tests, normalerweise nicht ändern
  'api_basis' => 'https://api.replicate.com/v1',
];
