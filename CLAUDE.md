# Deep Forge – Regeln

Idle-Spiel mit Zwergenfestung. Spieltexte auf **Englisch**, Doku und Gespräche auf Deutsch.

## Werkzeuge

- **Grafik:** Vor jedem neuen oder geänderten Sprite, Raum, Monster oder Szenen-Element die Skills `sprites` und
  `pxl-pixel-art` laden. Grafik entsteht in `art-src/` und wird mit `node scripts/build-art.mjs` gebaut.
  Ausnahme Zwerge: PNG-Teile in `static/art/dwarf/`, gezeichnet in Pixelwright (siehe `docs/SPRITES.md`, „Zwerge“).
- **Oberfläche:** Vor Arbeit an Panels, Layout oder CSS den Skill `impeccable:impeccable` laden, falls vorhanden.
  Der Abschnitt „Design“ unten geht vor.
- Fehlt ein Skill, das dem Nutzer sagen.

## Regeln

- **Keine Geheimnisse im Repo:** keine Passwörter, Tokens, Einladungscodes oder Domains in Code, Doku, Commits.
  Umgebungsvariablen nur mit Namen nennen. `.env` wird nie committet.
- **Der Server ist die Wahrheit.** Jede Spielregel steht im Java-Code. Der Client rechnet nur zur Anzeige
  (Preisschätzung, Fortschrittsbalken) und bekommt abgeleitete Werte über `View.java`.
- **Balancing-Zahlen** stehen in `Content.java`/`Rules.java`. Wer eine ändert, passt `docs/BALANCING.md` an.
- **Spielstand-Felder:** neue Felder in `State.java` bekommen einen Standardwert, damit alte Spielstände laden
  (Jackson ignoriert unbekannte Felder, fehlende bekommen den Feld-Initialwert).
- **Keine Abhängigkeiten im Frontend:** kein npm, kein Build-Schritt. ES-Module direkt aus `static/js/`.
- **Spieltexte** kurz, freundlich, englisch. Warnungen sagen immer, was zu tun ist.

## Aufbau

| Datei | Inhalt |
|---|---|
| `game/Content.java` | alle Inhalte: Metalle, Legierungen, Erze, Waren, Schichten, Monster, Gebäude, Eigenschaften, Städte, Traditionen |
| `game/State.java` | Spielstand (eine JSON-Zeile pro Spieler) und die gemeinsame Welt (Markt) |
| `game/Rules.java` | Formeln: Tempo, Kraft, Kapazitäten, Kosten, Kampf, Tod |
| `game/Sim.java` | Zeitschritt: Bedürfnisse, Stimmung, Mine, Werkstätten, Monster, Überfälle, Karawanen, Zuwanderung |
| `game/Recipes.java` | was jede Werkstatt kann und braucht |
| `game/Expeditions.java` | Gerüchte, Etappen, Entscheidungen, Beute |
| `game/Market.java` | Weltkurs und Stadtkurse je Sorte (`type:`/`cat:`), Verlauf 7 Tage, Kauf und Verkauf mit Preiseinfluss nach Marktanteil |
| `game/Depot.java` | Handelsdepot: gespeicherte Karawanen, Regeln, Kauf-Aufträge, Lieferungen, Marktanteil-Verlauf |
| `game/Actions.java` | alle Spieleraktionen mit Prüfung |
| `game/View.java` | was der Client sieht (Spielstand + abgeleitete Zahlen) |
| `game/GameService.java` | Laden, Weiterrechnen, Speichern, Minuten-Takt für alle Festungen |
| `auth/` | Name + Passwort (BCrypt), Token-Sitzungen, Einladungscode, Admins |
| `game/Layouts.java` | Grundriss: Räume, Gänge, Treppenhäuser auf einem Raster (48 × 8 Zellen à 24 × 96 px, Schacht links). Alles steht auf ausgegrabenem Boden (`caves`, von Bergarbeitern gegraben, `marks` sind markierter Fels). Ein Raum ohne Gang, Treppenhaus (2 Zellen) oder Schacht daneben steht still (`Rules.active`) |
| `game/Cheats.java` | Test-Hilfen (Ressourcen, Zwerge, Aussehen, Zeit überspringen), nur Admins oder `CHEATS=true` |
| `art-src/` | Grafik-Quellen für pxl, `shared.js` mit Raum-Ankern und Palette; Ergebnis in `static/art/`. `figure.js` baut alle Figuren und wird als `static/js/figure.js` ins Spiel kopiert |
| `static/js/canvas.js` | Kamera (ziehen, Mausrad, Pinch), Licht, Hover-Umriss, Klicks |
| `static/js/hold.js` | Festung im Berg im 48-px-Maßstab (`CELL 48`, `RH 144`; Räume aus Vorlagen über `rooms48.js` mit `Building.look`, Zwerge über `dwarf48.js`, Tal und Fels über `art48.js`; Sitze, Betten, Arbeitsplätze, Lichter und Klickflächen aus den Vorlagen-Punkten), (grauer Fels nach Tiefe, Höhlen mit Bewuchs, Kriechtiere, grabende Zwerge, Status über Räumen (`roomStatus`: rotes Achteck steht still, gelbes Dreieck braucht dich, grüner Kreis mit ! fertig/einsammeln, graue Punkte nichts zu tun, grüner Pfeil kann laufen; graue Punkte auch über untätigen Zwergen), der Schacht ist auf jeder Etage ein Treppenhaus): links das Tal (Straße, große Bäume im Wind, Marktstand mit flatterndem Vordach, Reisende, Tor); Kaserne, Abenteurergilde (`expedition_hall`) und Handelsdepot sind Räume im Berg, Tunnel zum Schacht, Himmel und Sonne über Essen, Plan, Räume, Treppenhäuser (Bogen in der Rückwand, unsichtbarer Weg zu jedem Treppenhaus auf einer anderen Etage, Dauer nach Entfernung), Zwerge mit Wegen (Dijkstra) und 12-Minuten-Zyklus, Blasebalg/Abschreckfass zum Anklicken, Bau-Modus, grüne Pfeile; Schatten an allen Innenkanten (`drawEdges`), schlanke Trennsäulen (`divider_<Material>`, 16 px) zwischen Räumen im Vordergrund (`drawWalls`): Material nach der Rückwand des Raums (`PILLAR`), Schmuck je Säule (`PILLAR_DECO`), die Tür ist nur zu sehen, während sie aufgeht; ungenutzter Fels ist schwarz (`drawFog`: von jedem gegrabenen Raum, Gang, Schacht, Höhle und vom Himmel aus eine Raumhöhe sichtbar, nach außen dunkler, beim Bauen halb durchsichtig; das Tal bleibt hell) |
| `static/js/views.js` | Minen-Screen, Login-Bild (Werkstätten haben keinen eigenen Screen, sie sind Räume der Festung) |
| `static/js/popups.js` | Fenster beim Anklicken von Räumen und Zwergen (öffnen sich neben dem Objekt), Cheat-Werkzeuge |
| `static/js/sun.js` | Sonnenstand und Uhrzeit für Essen (`Europe/Berlin`) |
| `static/js/sprites.js` | lädt das Sprite-Sheet, färbt Metall um, liefert Zwerge, Fremde und Porträts |
| `art-src/props48/` | Grafik 48 px als Code (Räume aus Teilen, Tal, Fels, Monster, Effekte, Wege in `ways.py`), `export.py` schreibt `static/art/props48/` (Sheet, Glow, JSON), Lader `static/js/art48.js` |
| `static/editor/` | Raumvorlagen-Editor (Möbel und Punkte setzen), im Spiel über „Change look“ im Raumfenster als Fenster (`openEditor` in `popups.js`, `?embed=1`, meldet `saved`/`close` per `postMessage`). Spieler-Vorlagen speichert der Server (`game/RoomTemplates.java`, Tabelle `room_templates`, API `/api/rooms…`): jeder darf anlegen, alle sehen und nutzen sie, ändern/löschen nur der Ersteller (auch kein Admin). Am Handy (≤ 760 px) wird der Editor nicht angeboten, nur die Auswahl. Format und Zeichnen in `static/js/rooms48.js`, eingebaute Vorlagen `RoomLooks.java`, Wahl je Raum `Building.look` |
| `tools/room-editor/` | `serve.py` (Port 8099) startet denselben Editor lokal ohne Spiel und speichert eingebaute Vorlagen als Dateien nach `static/art/props48/rooms/` |
| `art-src/dwarf48/` | nächster Zwerg-Satz 48 × 64 als Code (`parts.py`, `build.py`), Ergebnis in `static/art/dwarf48/`, Lader `static/js/dwarf48.js` (zeichnet die Zwerge in der Festung) |
| `static/js/dwarfkit.js` | setzt Zwerge aus den PNG-Teilen in `static/art/dwarf/` zusammen (`kit.json`: Bilder, Reihenfolge, Platzhalterfarben) und färbt sie um; gezeichnet im Pixelwright-Projekt „Deep Forge Dwarves“ |
| `static/js/panels-*.js` | die Tabs (Hold, Mines, Work, Dwarves, Trade, Explore, War, More); sie öffnen sich in einer Schublade über der Szene; Formulare laufen in Sheets (`openSheet(render, anker)`, mit Anker als kleines Fenster neben dem Objekt) |
| `static/js/panels-market.js` | Marktliste mit Wochenlinie, Waren-Fenster mit Kursverlauf und Städte-Tabelle |
| `static/js/panels-depot.js` | Fenster des Handelsdepots: Marktanteil, Karawanen, Regeln, Kauf-Aufträge |
| `static/js/paper.js` | Papier-Zettel (Risse, Flecken, Falten aus der id) und Abhaklisten |
| `static/js/plate.js` | Hover-Schild, das an Ketten aus der Raumdecke fällt; Material je Raum (`roomMaterial`) |
| `static/js/collect.js` | Beute-Berichte von Karawanen und Expeditionen als Karten mit „Collect“-Knopf, Flug-Animation in die Vorräte |
| `static/js/audio.js` | Sounds, Hintergrund-Schleifen, Musik (Stimmung je Tab); Zuordnung in `docs/AUDIO.md` |
| `static/patchnotes.json`, `static/js/notes.js` | Patchnotes (neueste zuerst: Version, Datum, Titel, Kurzform, Details nach Gruppen); im Spiel unter More („What's new“, Details aufklappbar), einmal als Hinweis-Chip nach einem neuen Release |
| `static/js/data.js` → `contextResources()` | welche Vorräte jeder Tab in der Übersicht zeigt (aufklappbar oben in der Schublade) |

## Rezepte

- **Neuer Sound:** Eintrag in `SFX`/`LOOPS` (`audio.js`), abspielen über `A.sfx()` in `soundForAction()`,
  `LOG_SOUNDS` oder `ambience()` (`main.js`), `docs/AUDIO.md` ergänzen. Fehlt die Datei, bleibt es still oder der
  Ersatz-Sound spielt. Musik: Datei mit Stimmungs-Vorsilbe in `static/music/` (MP3/OGG, kein WAV).

- **Geld** rechnet der Server in Copper Jots (1 Mark = 100 Talents = 1000 Jots); im Client `money()`/`moneyText()`,
  in Logtexten `Rules.money()`.
- **Neues Metall oder neue Legierung:** `metal(...)` in `Content.java` (Farbe, Wert, Härte, edel, Hitzefaktor,
  Schmelz- und Abschreck-Text, Abschreck-Fenster). Legierung zusätzlich `alloy(...)`. Wert so wählen, dass die
  Legierung mehr wert ist als ihre Zutaten. Balancing-Doku ergänzen.
- **Neue Ware:** `ITEMS` in `Content.java` (Barren, Faktor, Kategorie, Metall-Regel, Slot, erlaubte Veredelungen,
  optional Bauplan). Pixel-Art in `sprites.js` → `item()`. Wenn ausrüstbar: Wirkung in `Rules.power`/`toolBonus`.
- **Neues Gebäude:** `building(...)` in `Content.java`. Werkstatt (`queue`): Rezepte in `Recipes.java`
  (`BY_BUILDING`, `validate`, `inputs`, `start`) und Bestell-Sheet in `panels-work.js`. Passiv: Wirkung in
  `Rules`/`Sim`, Text in `EFFECT` (`panels-base.js`), Raum in `art-src/rooms.px.js` (`room(...)`, drei Stufen), Anker in `art-src/shared.js` (`ROOMS`),
  Breite in `Layouts.ROOM_CELLS`, Vorräte für den Tab in `contextResources()`, Pfeil-Logik in `hold.js` (`hasInputs`).
  Werkstatt mit Maschinen: Breite einer Erweiterung in `Layouts.MACHINE_CELLS`, Grafik mit `bay(...)` in
  `rooms.px.js`, Anker in `BAYS` (`shared.js`).
- **Neue Raumvorlage:** Spieler bauen sie im Spiel (Raumfenster → „Change look“). Eingebaute Vorlagen im lokalen
  Editor (`python3 tools/room-editor/serve.py`) bauen und speichern; ein neuer Raumtyp braucht mindestens
  eine (Test in `SimTest`), Pflichtpunkte in `NEEDS` (`rooms48.js`).
- **Neue Eigenschaft:** `trait(...)` in `Content.java`, Wirkung in `Rules.workSpeed`, `Rules.power`,
  `Sim.happinessTarget` oder `Expeditions`.
- **Neues Expeditions-Ereignis:** in `Expeditions.choice()` (Text + Optionen) und `applyChoice()` (Wirkung).
- **Neue Aktion:** `Actions.apply` + eigene Methode mit `check(...)`, Aufruf im Client mit `bus.act({type: ...})`.
- **Neue Schicht:** `LAYERS` in `Content.java` (Erze, Rate, Monster, Kosten), Erkundungs-Expedition in
  `Expeditions.refreshOffers`.

## Offene Aufgaben

- Stehen in `docs/TODO.md`. Erledigtes dort abhaken, Neues dort eintragen.

## Design

- **Zwergisch und gegenständlich** (Skeuomorphismus): Hintergrund aus genieteten Eisenplatten, Fenster als
  geschmiedete Rahmen (`.win`) mit Filigran-Ecken, Wappen mit Edelstein und Runenleiste (`frameDecor()` aus `ui.js`,
  Symbole `#corner`/`#crest` in `index.html`). Überschrift oben als goldenes Namensschild (`.plate`).
- **Material nach Bedeutung** (`MATERIAL`/`setMaterial` in `ui.js`): Werkstatt/Festung Eisen + Rubin (`forge`),
  Handel Gold + Smaragd (`trade`), Krieg Schwarzeisen + Granat (`war`), Zwerge Kupfer + Bernstein (`dwarf`),
  Erkunden Silber + Saphir (`lore`), sonst `neutral`. `openSheet(render, anker, material)`; ohne Material gilt der Tab.
- Knöpfe sind Pixel-Platten, die sich eindrücken (`.btn`, `.primary` gold, `.good` grün, `.danger` rot; auch `.tool`):
  `btn_<iron|gold|green|red>[_down]` aus `ui.px.js` als CSS-`border-image` (Ecken fest, Mitte dehnt sich), die
  Bild-Variablen setzt `artToCss()` in `main.js`. Das X der Fenster ist `ui_xbtn` (`.sheet-x`, `.icon-btn`), das grüne
  Abzeichen auf Tabs `ui_good` (`.tab .dot`). Symbole immer als linke Hälfte zeichnen und spiegeln (`mx`).
  Innen eingravierte Felder (`.card`) statt erhabener Karten.
- **Papier** für Expeditionen, Gerüchte und Berichte: `paper(seed, opts, ...)` aus `paper.js` (Risse, Flecken, Falten,
  Neigung je id verschieden, Nagel oder Wachssiegel), Handschrift Kalam, Abhakliste `todo()`.
- **Sanduhr** statt Balken für ablaufende Zeit: `hourglass({job, machine} | {from, to} | {p})`, echter Fortschritt.
  Balken (`bar`) nur für Mengen (Lager, Gesundheit, Stimmung, Hitze).
- **Bewegung mechanisch:** Fenster fahren aus dem Bildschirmrand ein und wieder hinaus (`slideIn`/`slideOut`), das
  Hover-Schild eines Raums fällt an Ketten aus der Decke (`plate.js`). Bei `prefers-reduced-motion` bewegt sich nichts.
- Schriften (selbst gehostet in `static/fonts/`): Germania One für Titel, Alegreya Sans für Text, Alegreya Sans SC
  für Knöpfe und Tabs, Kalam für Handschrift auf Papier. Im Canvas die 3×5-Pixelschrift aus `pixfont.js`.
  Räume tragen keine Namensschilder mehr im Canvas.
- Im Spiel klicken statt Menüs: Räume und Zwerge öffnen ihr Fenster direkt (`popups.js`), Hover zeigt einen
  grünen Umriss, stillstehende Werkstätten mit Material bekommen einen grünen Pfeil.
- Farben aus den CSS-Variablen in `style.css`.
- Immer in Handybreite (390 px) prüfen: kein horizontales Scrollen, Knöpfe mindestens 40 px hoch.
- Die Szene füllt das Fenster. Die Tabs öffnen eine Schublade (Desktop rechts, Handy unten), ein zweiter Klick
  oder das X schließt sie. Hinweise liegen als kleine Chips unten auf der Szene. Keine zweite Spalte.
- Erklärungen nicht als Fließtext, sondern hinter kleinen Info-Knöpfen (`info(text)` aus `ui.js`); unter More
  lassen sie sich abschalten.
- Kosten immer mit `costChips`/`costBtn` zeigen: jede Zutat mit Symbol, fehlende rot als „habe/brauche“.
- Keine Unicode-Zeichen als Symbole (☠ ♥ ✕): gezeichnete Icons über `ico()` aus `ui.js`.
- Status immer mit den drei Zeichen (`statusIco(kind, cls)` aus `ui.js`): `stop` rotes Achteck, `warn` gelbes Dreieck,
  `good` grüner Kreis mit !, `idle` graue Punkte. Keine farbigen Punkte oder Kreise. Tab-Abzeichen: `statusIco(k, 'badge')`.

## Testen

- **Backend:** `mvn test` (Simulation über eine Woche, Markt, Karawane, Schmiede, Legierung, Expedition, Überfall, API).
- **IntelliJ:** Startkonfigurationen in `.run/` („Deep Forge“ startet das Spiel mit H2, Cheats an und liefert das
  Frontend direkt aus `src/main/resources/static/`, „Deep Forge tests“ führt alle Tests aus).
- **Grafik:** `node scripts/build-art.mjs --preview`, Vorschauen in `art-src/out/_preview/` ansehen.
- **JS-Syntax:** `for f in src/main/resources/static/js/*.js; do node --check "$f"; done`
- **Im Browser:** `mvn -DskipTests package && java -jar target/deep-forge.jar` (H2 in `./data`), dann Playwright gegen
  `http://localhost:8080`: registrieren, alle Tabs öffnen, Screenshots am Handy (iPhone 13) und Desktop ansehen,
  `pageerror` sammeln. `window.__deepforge` gibt Zugriff auf den Client-Zustand.
- Ehrlich sagen, was nicht getestet wurde (z. B. Docker-Build, echte HTTPS-Domain).

## Git

- Gearbeitet wird nur auf `development`. Andere Branches nur, wenn der Nutzer es will.
- `master` ist der Haupt-Branch: nur bei einem vorzeigbaren Stand von `development` nach `master` mergen, und zwar auf
  Wunsch des Nutzers. Vorher einen neuen Eintrag oben in `static/patchnotes.json` schreiben (englisch, kurz und
  freundlich, Kurzform mit 2–4 Punkten, Details nach Gruppen), Version hochzählen.
- PR nur auf Wunsch.
- Keine Modellnamen in Commits, PRs oder Code.
