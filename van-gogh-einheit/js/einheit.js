(function () {
  "use strict";
  var D = window.VG;
  var BILD = (document.body.getAttribute("data-wurzel") || "") + "bilder/sternennacht.jpg";
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function mk(tag, attrs) {
    var e = document.createElement(tag); attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c == null) continue; if (Array.isArray(c)) c.forEach(function (x) { e.append(x); }); else e.append(c); }
    return e;
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var mem = {};
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("vg-" + k); if (v !== null) return JSON.parse(v); } catch (e) {} return (k in mem) ? mem[k] : d; },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem("vg-" + k, JSON.stringify(v)); } catch (e) {} }
  };
  function fertig(id) {
    if (!id) return; var f = store.get("fertig", {}); f[id] = true; store.set("fertig", f); chips();
  }
  function chips() {
    var f = store.get("fertig", {});
    $$("[data-chip]").forEach(function (li) { li.classList.toggle("fertig", !!f[li.getAttribute("data-chip")]); });
  }
  function rueck(el, text, art) { el.textContent = text; el.className = "rueck" + (art ? " " + art : ""); }

  /* ---------- Formen ---------- */
  function inForm(f, x, y) {
    if (f[0] === "ell") { var dx = (x - f[1]) / f[3], dy = (y - f[2]) / f[4]; return dx * dx + dy * dy <= 1; }
    var p = f[1], in_ = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      var xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) in_ = !in_;
    }
    return in_;
  }
  function formSvg(f, farbe) {
    var ns = "http://www.w3.org/2000/svg", e;
    if (f[0] === "ell") { e = document.createElementNS(ns, "ellipse"); e.setAttribute("cx", f[1]); e.setAttribute("cy", f[2]); e.setAttribute("rx", f[3]); e.setAttribute("ry", f[4]); }
    else { e = document.createElementNS(ns, "polygon"); e.setAttribute("points", f[1].map(function (p) { return p.join(","); }).join(" ")); }
    e.setAttribute("fill", "rgba(240,194,75,.28)"); e.setAttribute("stroke", farbe || "#f0c24b"); e.setAttribute("stroke-width", "5"); e.setAttribute("vector-effect", "non-scaling-stroke");
    return e;
  }
  function svgLeer() { var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 " + D.W + " " + D.H); s.setAttribute("preserveAspectRatio", "none"); s.setAttribute("aria-hidden", "true"); return s; }
  function bildPunkt(ev, el) {
    var r = el.getBoundingClientRect();
    return [(ev.clientX - r.left) / r.width * D.W, (ev.clientY - r.top) / r.height * D.H];
  }
  function bildEl(alt) { return mk("img", { src: BILD, alt: alt || "Gemälde Die Sternennacht von Vincent van Gogh: blauer Nachthimmel mit großen Wirbeln, gelbem Mond und Sternen, links eine dunkle Zypresse, unten ein Dorf mit Kirchturm", draggable: "false" }); }

  /* ---------- Gedächtnis ---------- */
  function gedaechtnis(root) {
    var id = root.getAttribute("data-id");
    var start = mk("button", { class: "knopf", type: "button", text: "Bild zehn Sekunden zeigen" });
    var zone = mk("div"); var rk = mk("p", { class: "rueck", "aria-live": "polite" });
    root.append(mk("p", { class: "titel", text: "Übung Das Bild im Kopf" }), start, zone, rk);
    start.addEventListener("click", function () {
      start.disabled = true; zone.innerHTML = "";
      var leiste = mk("div", { class: "zeitleiste laeuft", role: "presentation" }, mk("i"));
      var bu = mk("div", { class: "buehne" }, bildEl());
      zone.append(leiste, bu); rueck(rk, "Schau genau hin. Du hast zehn Sekunden.");
      setTimeout(function () {
        zone.innerHTML = "";
        var items = shuffle(D.gedaechtnis.richtig.map(function (t) { return [t, true]; }).concat(D.gedaechtnis.falsch.map(function (t) { return [t, false]; })));
        var wahl = mk("div", { class: "wahl" });
        items.forEach(function (it, i) { wahl.append(mk("label", {}, mk("input", { type: "checkbox", "data-r": it[1] ? "1" : "0" }), it[0])); });
        var pruef = mk("button", { class: "knopf", type: "button", text: "Auswerten" });
        zone.append(mk("p", { text: "Das Bild ist abgedeckt. Was war im Bild? Kreuze alles an, woran du dich erinnerst." }), wahl, mk("div", { class: "aktionen" }, pruef));
        rueck(rk, "");
        pruef.addEventListener("click", function () {
          var ok = 0; $$("label", wahl).forEach(function (l) {
            var c = $("input", l), soll = c.getAttribute("data-r") === "1", gut = (c.checked === soll);
            l.className = gut ? "ok" : "nein"; if (gut) ok++; c.disabled = true;
          });
          rueck(rk, ok + " von " + items.length + " richtig. Richtig wäre gewesen. Zypresse, Mond, Dorf mit Kirchturm, Sterne, Hügel und Wirbel waren im Bild. Fluss, Windmühle, Menschen, Boot, Wolkenkratzer und Schnee nicht.", ok >= items.length - 2 ? "ok" : "nein");
          pruef.disabled = true; fertig(id);
          var nochmal = mk("button", { class: "knopf leise", type: "button", text: "Bild jetzt zum Abgleich ansehen", onclick: function () { zone.append(mk("div", { class: "buehne" }, bildEl())); nochmal.disabled = true; } });
          $(".aktionen", zone).append(nochmal);
        });
      }, 10000);
    });
  }

  /* ---------- Bildelemente finden ---------- */
  function hotspots(root) {
    var id = root.getAttribute("data-id"); var i = 0, versuche = 0, punkte = 0, offen = true;
    var ziel = mk("p", { class: "frage", style: "font-size:1.15rem" });
    var svg = svgLeer(); var bu = mk("div", { class: "buehne klick" }, bildEl(), svg);
    var rk = mk("p", { class: "rueck", "aria-live": "polite" });
    var weiter = mk("button", { class: "knopf", type: "button", text: "Weiter" });
    weiter.hidden = true; var akt = mk("div", { class: "aktionen" }, weiter);
    root.append(mk("p", { class: "titel", text: "Übung Bildelemente finden" }), ziel, bu, rk, akt);
    function zeigen() {
      svg.innerHTML = ""; weiter.hidden = true; versuche = 0; offen = true;
      if (i >= D.hotspots.length) {
        ziel.textContent = "Geschafft."; rueck(rk, punkte + " von " + D.hotspots.length + " Bildelementen hast du beim ersten Versuch gefunden.", "ok"); fertig(id);
        weiter.textContent = "Noch einmal"; weiter.hidden = false; weiter.onclick = function () { i = 0; punkte = 0; weiter.textContent = "Weiter"; weiter.onclick = nxt; zeigen(); }; return;
      }
      ziel.textContent = "Klicke oder tippe auf " + D.hotspots[i].name + ". (" + (i + 1) + " von " + D.hotspots.length + ")"; rueck(rk, "");
    }
    function nxt() { i++; zeigen(); }
    weiter.onclick = nxt;
    bu.addEventListener("pointerup", function (ev) {
      if (!offen || i >= D.hotspots.length) return;
      var p = bildPunkt(ev, bu), h = D.hotspots[i];
      if (inForm(h.form, p[0], p[1])) {
        if (versuche === 0) punkte++; offen = false; svg.innerHTML = ""; svg.append(formSvg(h.form));
        rueck(rk, "Richtig. " + h.info, "ok"); weiter.hidden = false; weiter.focus();
      } else {
        versuche++;
        if (versuche >= 2) { offen = false; svg.innerHTML = ""; svg.append(formSvg(h.form)); rueck(rk, "Hier ist es. " + h.info, "nein"); weiter.hidden = false; weiter.focus(); }
        else rueck(rk, "Das war es noch nicht. Schau noch einmal genau hin und versuche es erneut.", "nein");
      }
    });
    zeigen();
  }

  /* ---------- Bildebenen ---------- */
  function ebenen(root) {
    var id = root.getAttribute("data-id"); var liste = mk("div"); var zeilen = [];
    D.ebenen.items.forEach(function (it, n) {
      var btns = mk("div", { class: "btns", style: "flex-wrap:wrap" });
      D.ebenen.ebenen.forEach(function (e, k) {
        btns.append(mk("label", { class: "wahlknopf", style: "display:inline-flex;gap:8px;align-items:center" }, mk("input", { type: "radio", name: id + n, value: k, style: "width:18px;height:18px;accent-color:#f0c24b" }), e));
      });
      var z = mk("div", { class: "satz" }, mk("div", { class: "text", text: it[0] }), btns); zeilen.push(z); liste.append(z);
    });
    var rk = mk("p", { class: "rueck", "aria-live": "polite" }); var b = mk("button", { class: "knopf", type: "button", text: "Prüfen" });
    root.append(mk("p", { class: "titel", text: "Übung Bildebenen" }), liste, mk("div", { class: "aktionen" }, b), rk);
    b.addEventListener("click", function () {
      var ok = 0, fehlt = 0;
      D.ebenen.items.forEach(function (it, n) {
        var c = $("input[name='" + id + n + "']:checked", root);
        if (!c) { fehlt++; return; }
        var gut = +c.value === it[1]; if (gut) ok++; zeilen[n].style.outline = "2px solid " + (gut ? "#6fe3a0" : "#ff8fa3"); zeilen[n].style.outlineOffset = "2px";
      });
      if (fehlt) { rueck(rk, "Bitte ordne zuerst alle Zeilen zu.", "nein"); return; }
      rueck(rk, ok + " von " + D.ebenen.items.length + " richtig. Die Zypresse steht im Vordergrund. Dorf und Hügel bilden den Mittelgrund. Himmel, Mond und Sterne liegen im Hintergrund.", ok === D.ebenen.items.length ? "ok" : "nein");
      if (ok === D.ebenen.items.length) fertig(id);
    });
  }

  /* ---------- Begriffe verbinden ---------- */
  function begriffe(root) {
    var id = root.getAttribute("data-id"); var gew = null, gefunden = 0, fehler = 0;
    var l = mk("div", { class: "spalte" }), r = mk("div", { class: "spalte" }); var rk = mk("p", { class: "rueck", "aria-live": "polite" });
    D.begriffe.forEach(function (b, i) { l.append(mk("button", { class: "wahlknopf", type: "button", "data-i": i, text: b[0] })); });
    shuffle(D.begriffe.map(function (b, i) { return i; })).forEach(function (i) { r.append(mk("button", { class: "wahlknopf", type: "button", "data-i": i, text: D.begriffe[i][1] })); });
    root.append(mk("p", { class: "titel", text: "Übung Fachbegriffe verbinden" }), mk("p", { class: "klein", text: "Tippe zuerst einen Begriff an, dann seine Erklärung." }), mk("div", { class: "paare" }, l, r), rk);
    $$("button", l).forEach(function (bt) { bt.addEventListener("click", function () { $$("button", l).forEach(function (x) { x.classList.remove("an"); }); gew = bt; bt.classList.add("an"); }); });
    $$("button", r).forEach(function (bt) {
      bt.addEventListener("click", function () {
        if (!gew) { rueck(rk, "Wähle zuerst links einen Begriff.", "nein"); return; }
        if (gew.getAttribute("data-i") === bt.getAttribute("data-i")) {
          gew.classList.remove("an"); gew.classList.add("ok"); bt.classList.add("ok"); gew.disabled = true; bt.disabled = true; gew = null; gefunden++;
          rueck(rk, gefunden + " von " + D.begriffe.length + " gefunden.", "ok");
          if (gefunden === D.begriffe.length) { rueck(rk, "Alle Paare gefunden" + (fehler ? " bei " + fehler + " Fehlversuchen." : " ohne Fehler."), "ok"); fertig(id); }
        } else { fehler++; rueck(rk, "Das passt nicht zusammen. Versuche es noch einmal.", "nein"); bt.classList.add("nein"); setTimeout(function () { bt.classList.remove("nein"); }, 700); }
      });
    });
  }

  /* ---------- Lückentext ---------- */
  function luecken(root) {
    var id = root.getAttribute("data-id"); var p = mk("p", { class: "fliesstext" }); var sel = [];
    D.luecken.forEach(function (s) {
      if (typeof s === "string") p.append(document.createTextNode(s));
      else {
        var w = mk("select", { class: "luecke", "aria-label": "Lücke" }); w.append(mk("option", { value: "", text: "…" }));
        shuffle(s[1]).forEach(function (o) { w.append(mk("option", { value: o, text: o })); }); w.setAttribute("data-r", s[0]); sel.push(w); p.append(w);
      }
    });
    var rk = mk("p", { class: "rueck", "aria-live": "polite" }); var b = mk("button", { class: "knopf", type: "button", text: "Prüfen" });
    root.append(mk("p", { class: "titel", text: "Übung Lückentext" }), p, mk("div", { class: "aktionen" }, b), rk);
    b.addEventListener("click", function () {
      var ok = 0, leer = 0; sel.forEach(function (w) { if (!w.value) { leer++; return; } var g = w.value === w.getAttribute("data-r"); w.className = "luecke " + (g ? "ok" : "nein"); if (g) ok++; });
      if (leer) { rueck(rk, "Bitte fülle zuerst alle Lücken.", "nein"); return; }
      if (ok === sel.length) { rueck(rk, "Alle " + sel.length + " Lücken stimmen.", "ok"); fertig(id); }
      else { rueck(rk, ok + " von " + sel.length + " stimmen. Rot markierte Lücken kannst du noch einmal ändern.", "nein"); }
    });
  }

  /* ---------- Beschreibung oder Deutung ---------- */
  function sortieren(root) {
    var id = root.getAttribute("data-id"); var ok = 0, fertigN = 0; var rk = mk("p", { class: "rueck", "aria-live": "polite" });
    root.append(mk("p", { class: "titel", text: "Übung Beschreibung oder Deutung" }));
    shuffle(D.sortieren).forEach(function (it) {
      var b1 = mk("button", { class: "wahlknopf", type: "button", text: "Beschreibung" }), b2 = mk("button", { class: "wahlknopf", type: "button", text: "Deutung" });
      var fb = mk("span", { class: "klein" }); var z = mk("div", { class: "satz" }, mk("div", { class: "text", text: it[0] }), mk("div", { class: "btns" }, b1, b2), fb);
      [b1, b2].forEach(function (b, k) {
        b.addEventListener("click", function () {
          var g = (k === it[1]); b.classList.add(g ? "ok" : "nein"); fertigN++; if (g) ok++;
          b1.disabled = b2.disabled = true; if (!g) { (it[1] === 0 ? b1 : b2).classList.add("ok"); }
          fb.textContent = g ? "Stimmt." : (it[1] === 0 ? "Das ist eine Beschreibung. Sie hält fest, was zu sehen ist." : "Das ist eine Deutung. Sie sagt, wie etwas wirkt.");
          rueck(rk, ok + " von " + fertigN + " richtig.", ok === fertigN ? "ok" : "nein");
          if (fertigN === D.sortieren.length) { fertig(id); rueck(rk, "Fertig. " + ok + " von " + fertigN + " richtig.", ok >= fertigN - 1 ? "ok" : "nein"); }
        });
      });
      root.append(z);
    });
    root.append(rk);
  }

  /* ---------- Deutung belegen ---------- */
  function belege(root) {
    var id = root.getAttribute("data-id"); var ok = 0, n = 0; var rk = mk("p", { class: "rueck", "aria-live": "polite" });
    root.append(mk("p", { class: "titel", text: "Übung Deutung belegen" }), mk("p", { class: "klein", text: "Wähle zu jeder Deutung den Beleg, der sich wirklich am Bild zeigen lässt." }));
    D.belege.forEach(function (b, bi) {
      var box = mk("div"); var opt = mk("div", { class: "opt" }); var fb = mk("p", { class: "rueck" });
      box.append(mk("p", { class: "behauptung", text: "Deutung. " + b[0] }));
      b[1].forEach(function (t, k) {
        var inp = mk("input", { type: "radio", name: id + bi, value: k }); var lab = mk("label", {}, inp, t);
        inp.addEventListener("change", function () {
          var g = k === b[2]; n++; if (g) ok++; $$("input", opt).forEach(function (x) { x.disabled = true; });
          lab.className = g ? "ok" : "nein"; if (!g) $$("label", opt)[b[2]].className = "ok";
          rueck(fb, g ? "Genau. Dieser Beleg zeigt sich am Bild." : "Dieser Beleg trägt nicht. Gut belegt ist die grün markierte Aussage, denn sie nennt etwas, das man im Bild sieht.", g ? "ok" : "nein");
          if (n === D.belege.length) { fertig(id); rueck(rk, ok + " von " + n + " richtig.", ok === n ? "ok" : "nein"); }
        });
        opt.append(lab);
      });
      box.append(opt, fb); root.append(box);
    });
    root.append(rk);
  }

  /* ---------- Kriterien ---------- */
  function kriterien(root) {
    var id = root.getAttribute("data-id"); var meter = mk("div", { class: "meter" }, mk("i")); var rk = mk("p", { class: "rueck", "aria-live": "polite" }); var cb = [];
    var w = mk("div", { class: "wahl", style: "grid-template-columns:1fr" });
    D.kriterien.forEach(function (k, i) { var c = mk("input", { type: "checkbox" }); cb.push(c); w.append(mk("label", {}, c, k)); });
    root.append(mk("p", { class: "titel", text: "Selbstcheck Kriterienraster" }), mk("p", { class: "klein", text: "Lies deinen Text noch einmal und hake nur ab, was wirklich drinsteht." }), w, meter, rk);
    var gespeichert = store.get("krit", []); cb.forEach(function (c, i) { c.checked = !!gespeichert[i]; });
    function upd() {
      var n = cb.filter(function (c) { return c.checked; }).length; $("i", meter).style.width = (n / cb.length * 100) + "%"; store.set("krit", cb.map(function (c) { return c.checked; }));
      rueck(rk, n + " von " + cb.length + " Kriterien erfüllt." + (n === cb.length ? " Sehr gut, dein Text ist vollständig." : n >= 6 ? " Fast geschafft. Ergänze, was noch fehlt." : " Überlege, was du noch ergänzen kannst."), n >= 6 ? "ok" : "");
      if (n === cb.length) fertig(id);
    }
    cb.forEach(function (c) { c.addEventListener("change", upd); }); upd();
  }

  /* ---------- Notizen ---------- */
  function notizen() {
    $$("textarea[data-notiz]").forEach(function (t) {
      var k = "notiz-" + t.getAttribute("data-notiz"); t.value = store.get(k, "");
      var z = t.parentNode.querySelector(".zaehler");
      function zaehl() { if (z) { var n = (t.value.trim().match(/\S+/g) || []).length; z.textContent = n + " Wörter" + (t.hasAttribute("data-ziel-woerter") ? ", Ziel " + t.getAttribute("data-ziel-woerter") : ""); } }
      t.addEventListener("input", function () { store.set(k, t.value); zaehl(); }); zaehl();
    });
    $$("[data-kopieren]").forEach(function (b) {
      b.addEventListener("click", function () {
        var ids = b.getAttribute("data-kopieren").split(","); var text = ids.map(function (i) { var t = $("textarea[data-notiz='" + i + "']"); return t ? t.value : ""; }).join("\n\n");
        var done = function () { b.textContent = "Kopiert"; setTimeout(function () { b.textContent = "Text kopieren"; }, 1800); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt("Text zum Kopieren", text); });
        else window.prompt("Text zum Kopieren", text);
      });
    });
    $$("[data-baustein]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = $("textarea[data-notiz='" + b.getAttribute("data-ziel") + "']"); if (!t) return;
        t.value += (t.value && !/\s$/.test(t.value) ? " " : "") + b.getAttribute("data-baustein") + " "; t.focus(); t.dispatchEvent(new Event("input"));
      });
    });
    $$("[data-ausschnitt]").forEach(function (r) {
      r.addEventListener("change", function () { var a = D.ausschnitte[r.value], el = $("#ausschnitt-bild"); if (el) { el.style.backgroundPosition = a.pos; el.setAttribute("aria-label", "Ausschnitt " + a.name); } store.set("ausschnitt", r.value); });
    });
    var sa = store.get("ausschnitt", null); if (sa !== null) { var rr = $("[data-ausschnitt][value='" + sa + "']"); if (rr) { rr.checked = true; rr.dispatchEvent(new Event("change")); } }
  }

  /* ---------- Lupe ---------- */
  function lupe(root) {
    var Z = 3, bu = mk("div", { class: "buehne" }, bildEl()), l = mk("div", { class: "lens" }); bu.append(l);
    var schalter = mk("button", { class: "knopf leise", type: "button", "aria-pressed": "false", text: "Lupe einschalten" });
    root.append(mk("p", { class: "titel", text: "Duktus-Lupe" }), mk("p", { class: "klein", text: "Schalte die Lupe ein und fahre mit Maus oder Finger über das Bild. Achte auf Länge, Richtung und Dicke der Striche." }), mk("div", { class: "aktionen", style: "margin:0 0 10px" }, schalter), bu);
    var an = false;
    schalter.addEventListener("click", function () { an = !an; schalter.setAttribute("aria-pressed", an); schalter.textContent = an ? "Lupe ausschalten" : "Lupe einschalten"; bu.classList.toggle("lupe", an); if (!an) l.style.display = "none"; });
    function bewegen(ev) {
      if (!an) return; var r = bu.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) { l.style.display = "none"; return; }
      l.style.display = "block"; l.style.left = (x - 95) + "px"; l.style.top = (y - 95 - 40) + "px";
      l.style.backgroundImage = "url(" + BILD + ")"; l.style.backgroundSize = (r.width * Z) + "px " + (r.height * Z) + "px"; l.style.backgroundPosition = (-(x * Z - 95)) + "px " + (-(y * Z - 95)) + "px";
    }
    bu.addEventListener("pointermove", bewegen); bu.addEventListener("pointerdown", bewegen); bu.addEventListener("pointerleave", function () { l.style.display = "none"; });
  }

  /* ---------- Quiz ---------- */
  function quiz(root) {
    var kurz = D.quizKurz, stand = null;
    var kopf = mk("div", { class: "quiz-kopf" }), body = mk("div"); root.append(kopf, body);
    var best = store.get("quiz-best", null);
    function start() {
      kopf.textContent = ""; body.innerHTML = "";
      body.append(mk("p", { class: "lead", text: "Wähle eine Version. Zu jeder Antwort gibt es sofort eine Erklärung." }));
      var a = mk("button", { class: "knopf", type: "button", text: "Kurzquiz mit " + kurz.length + " Fragen", onclick: function () { los(kurz.slice()); } });
      var b = mk("button", { class: "knopf leise", type: "button", text: "Gesamtquiz mit " + D.quiz.length + " Fragen", onclick: function () { los(D.quiz.map(function (_, i) { return i; })); } });
      body.append(mk("div", { class: "aktionen" }, a, b));
      if (best) body.append(mk("p", { class: "klein", style: "margin-top:14px", text: "Dein bestes Gesamtquiz auf diesem Gerät " + best + " von " + D.quiz.length + " richtig." }));
    }
    function los(idx) {
      stand = { idx: shuffle(idx), i: 0, ok: 0, falsch: [], gesamt: idx.length === D.quiz.length }; frage();
    }
    function frage() {
      body.innerHTML = ""; var q = D.quiz[stand.idx[stand.i]];
      kopf.textContent = ""; kopf.append(mk("span", { text: "Frage " + (stand.i + 1) + " von " + stand.idx.length }), mk("span", { text: stand.ok + " richtig" }));
      body.append(mk("h2", { class: "frage", text: q[0], style: "margin-top:0;font-size:1.35rem" }));
      var liste = mk("div", { class: "antworten" }), fb = mk("div", { "aria-live": "polite" }); var order = shuffle(q[1].map(function (_, i) { return i; })); var knoepfe = [];
      order.forEach(function (oi) {
        var b = mk("button", { class: "antwort", type: "button", text: q[1][oi] }); knoepfe.push([b, oi]);
        b.addEventListener("click", function () {
          knoepfe.forEach(function (k) { k[0].disabled = true; if (k[1] === q[2]) k[0].classList.add("ok"); });
          var g = oi === q[2]; if (g) stand.ok++; else { b.classList.add("nein"); stand.falsch.push(stand.idx[stand.i]); }
          fb.append(mk("p", { class: "erklaerung", html: "" }));
          fb.firstChild.textContent = (g ? "Richtig. " : "Leider nicht. ") + q[3];
          var w = mk("button", { class: "knopf", type: "button", style: "margin-top:14px", text: stand.i + 1 < stand.idx.length ? "Nächste Frage" : "Ergebnis ansehen", onclick: function () { stand.i++; stand.i < stand.idx.length ? frage() : ende(); } });
          fb.append(w); w.focus();
        });
        liste.append(b);
      });
      body.append(liste, fb);
    }
    function ende() {
      body.innerHTML = ""; kopf.textContent = ""; var n = stand.idx.length, ok = stand.ok;
      if (stand.gesamt) { if (!best || ok > best) { best = ok; store.set("quiz-best", ok); } fertig("quiz-gesamt"); } else fertig("quiz-kurz");
      body.append(mk("p", { class: "klein", text: "Ergebnis" }), mk("p", { class: "groß", text: ok + " von " + n }),
        mk("p", { class: "lead", text: ok === n ? "Alles richtig. Du kannst die Sternennacht jetzt mit Fachbegriffen beschreiben." : ok >= n * 0.75 ? "Stark. Schau dir die falschen Antworten noch einmal an." : "Ein guter Anfang. Wiederhole die falschen Fragen und schau dir danach noch einmal die Seiten zu den Stunden an." }));
      var themen = {}; stand.falsch.forEach(function (i) { var t = D.quiz[i][4]; themen[t] = (themen[t] || 0) + 1; });
      var tk = Object.keys(themen); if (tk.length) body.append(mk("p", { text: "Hier lohnt sich Wiederholen. " + tk.map(function (t) { return t + " (" + themen[t] + ")"; }).join(", ") + "." }));
      var a = mk("div", { class: "aktionen" });
      if (stand.falsch.length) a.append(mk("button", { class: "knopf", type: "button", text: "Falsche Fragen wiederholen", onclick: function () { los(stand.falsch.slice()); } }));
      a.append(mk("button", { class: "knopf leise", type: "button", text: "Zurück zur Auswahl", onclick: start }));
      body.append(a);
    }
    start();
  }

  /* ---------- Spiel Ausschnitt-Jäger ---------- */
  function spiel(root) {
    var RUNDEN = 10, SEITE = 200, ANZ = 260, k = ANZ / SEITE;
    var kopf = mk("div", { class: "punkte-leiste", "aria-live": "polite" }); var raster = mk("div", { class: "spiel-raster" });
    root.append(kopf, raster); var best = store.get("spiel-best", 0);
    var st;
    function start() {
      st = { reihe: shuffle(D.spiel.map(function (_, i) { return i; })).slice(0, RUNDEN), i: 0, sum: 0 }; runde();
    }
    function runde() {
      raster.innerHTML = ""; var s = D.spiel[st.reihe[st.i]];
      var cx = Math.max(SEITE / 2, Math.min(D.W - SEITE / 2, s[0])), cy = Math.max(SEITE / 2, Math.min(D.H - SEITE / 2, s[1]));
      kopf.innerHTML = ""; kopf.append(mk("span", { html: "Runde <b>" + (st.i + 1) + "</b> von " + RUNDEN }), mk("span", { html: "Punkte <b>" + st.sum + "</b>" }));
      var aus = mk("div", { class: "ausschnitt", role: "img", "aria-label": "Vergrößerter Ausschnitt aus dem Gemälde. Wo im ganzen Bild liegt er?" });
      aus.style.backgroundImage = "url(" + BILD + ")"; aus.style.backgroundSize = (D.W * k) + "px " + (D.H * k) + "px"; aus.style.backgroundPosition = (-(cx - SEITE / 2) * k) + "px " + (-(cy - SEITE / 2) * k) + "px";
      var svg = svgLeer(); var bu = mk("div", { class: "buehne klick", style: "max-width:100%" }, bildEl("Das ganze Gemälde. Tippe auf die Stelle, aus der der Ausschnitt stammt."), svg);
      bu.setAttribute("data-ziel", cx + "," + cy);
      var rk = mk("div", { "aria-live": "polite" }); var links = mk("div", {}, mk("p", { class: "klein", text: "Dieser Ausschnitt gehört zum Bild." }), aus);
      var rechts = mk("div", {}, mk("p", { class: "frage", style: "font-size:1.1rem;margin-bottom:8px", text: "Wo im Bild liegt dieser Ausschnitt? Tippe auf die Stelle." }), bu, rk);
      raster.append(links, rechts); var offen = true;
      bu.addEventListener("pointerup", function (ev) {
        if (!offen) return; offen = false; var p = bildPunkt(ev, bu), d = Math.hypot(p[0] - cx, p[1] - cy) / D.W;
        var pt = d < 0.05 ? 100 : d > 0.35 ? 0 : Math.round(100 * (0.35 - d) / 0.30); st.sum += pt;
        var ns = "http://www.w3.org/2000/svg", mkS = function (t, a) { var e = document.createElementNS(ns, t); Object.keys(a).forEach(function (q) { e.setAttribute(q, a[q]); }); return e; };
        svg.append(mkS("rect", { x: cx - SEITE / 2, y: cy - SEITE / 2, width: SEITE, height: SEITE, fill: "rgba(240,194,75,.22)", stroke: "#f0c24b", "stroke-width": 4, "vector-effect": "non-scaling-stroke" }),
          mkS("line", { x1: p[0], y1: p[1], x2: cx, y2: cy, stroke: "#fff", "stroke-width": 3, "stroke-dasharray": "6 6", "vector-effect": "non-scaling-stroke" }),
          mkS("circle", { cx: p[0], cy: p[1], r: 14, fill: "#8fb4ff", stroke: "#fff", "stroke-width": 3, "vector-effect": "non-scaling-stroke" }));
        kopf.innerHTML = ""; kopf.append(mk("span", { html: "Runde <b>" + (st.i + 1) + "</b> von " + RUNDEN }), mk("span", { html: "Punkte <b>" + st.sum + "</b>" }));
        rk.append(mk("p", { class: "rueck " + (pt >= 60 ? "ok" : "nein"), text: pt + " Punkte. Das war " + s[2] + "." }), mk("p", { class: "erklaerung", text: s[3] }));
        var w = mk("button", { class: "knopf", type: "button", style: "margin-top:14px", text: st.i + 1 < RUNDEN ? "Nächste Runde" : "Ergebnis ansehen", onclick: function () { st.i++; st.i < RUNDEN ? runde() : ende(); } });
        rk.append(w); w.focus();
      });
    }
    function ende() {
      raster.innerHTML = ""; kopf.innerHTML = ""; var neu = st.sum > best; if (neu) { best = st.sum; store.set("spiel-best", best); } fertig("spiel");
      var stufe = st.sum >= 850 ? "Meisterblick. Du kennst dieses Bild fast auswendig." : st.sum >= 600 ? "Scharfer Blick. Du erkennst die Stellen sicher." : st.sum >= 350 ? "Gut. Mit etwas Übung wirst du genauer." : "Schau dir das Bild in Ruhe noch einmal an. Die Lupe auf der Seite zu Stunde 1 hilft.";
      raster.style.display = "block";
      raster.append(mk("p", { class: "klein", text: "Ergebnis" }), mk("p", { class: "groß", text: st.sum + " von " + (RUNDEN * 100) }), mk("p", { class: "lead", text: stufe + (neu ? " Das ist dein neuer Bestwert." : " Dein Bestwert auf diesem Gerät liegt bei " + best + ".") }),
        mk("div", { class: "aktionen" }, mk("button", { class: "knopf", type: "button", text: "Noch einmal spielen", onclick: function () { raster.style.display = ""; start(); } })));
    }
    start();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var map = { gedaechtnis: gedaechtnis, hotspots: hotspots, ebenen: ebenen, begriffe: begriffe, luecken: luecken, sortieren: sortieren, belege: belege, kriterien: kriterien, lupe: lupe, quiz: quiz, spiel: spiel };
    $$("[data-uebung]").forEach(function (el) { var f = map[el.getAttribute("data-uebung")]; if (f) { try { f(el); } catch (e) { console.error(e); } } });
    notizen(); chips();
    $$("[data-fertig]").forEach(function (b) { b.addEventListener("click", function () { fertig(b.getAttribute("data-fertig")); b.textContent = "Erledigt"; }); });
  });
})();
