# Grafik

Die Grafik entsteht als Code und wird zu Bildern in `src/main/resources/static/art/` gebaut. Eigene PNGs gehen vor
(Werkzeug unten).

| Quelle | Ergebnis | Bauen | Inhalt |
|---|---|---|---|
| `art-src/icons/*.px.js` (pxl, Skill `pxl-pixel-art`) | `static/art/icons/` (`atlas.png`, `atlas.json`, `meta.json`) | `node scripts/build-art.mjs [--preview]` | Symbole, Knöpfe, Waren, Werkzeuge, Erze, Edelsteine |
| `art-src/scene/*.py` (Python, numpy, Pillow) | `static/art/scene/` (`sheet.png`, `glow.png`, `sheet.json`) | `python3 art-src/scene/export.py` | Räume aus Teilen, Möbel, Wände, Böden, Tal, Fels, Mine, Monster, Effekte |
| `art-src/scene/backdrop.py` | `static/art/backdrop/` | `python3 art-src/scene/backdrop.py` | Ebenen des Tal-Hintergrunds |
| `art-src/dwarves/*.py` | `static/art/dwarves/<Teil>/<Ansicht>.png` + `kit.json` | `python3 art-src/dwarves/build.py src/main/resources/static/art/dwarves` | Zwerg-Teile 48 × 64 |
| Raum-Editor | `static/art/rooms/<typ>/*.json` | `python3 tools/room-editor/serve.py` | eingebaute Raumvorlagen |

Vorschauen landen in `art-src/out/` (nicht in Git), z. B. `art-src/out/preview/`.

## Austauschfarben

Einige Farben sind Platzhalter, die das Spiel ersetzt: im Atlas `SWAP` in `art-src/icons/shared.js` (**Metall**
`m M x X`: Barren, Waren, Werkzeuge bekommen die Farbe ihres Metalls), in der Szene `placeholders` (`ingot`, `rockd`),
bei Zwergen `ramps` in `kit.json`. Neue Grafik, die umgefärbt werden soll, nutzt genau diese Farben.

Kleidungs-Symbole (Hemd, Hose, Stiefel …) zeichnet `static/js/art/wearicons.js` zur Laufzeit in der Farbe des Stücks.

## Sprites als PNG (Werkzeug)

Jedes Sprite des Spiels als PNG herausholen, ändern und wieder hineinlegen, oder neue hinzufügen.
Braucht Python 3 mit Pillow und numpy.

```
python3 tools/sprites/sprites.py serve        # im Browser: http://localhost:8098
python3 tools/sprites/sprites.py              # Menü im Terminal: suchen, Nummer wählen, exportieren
python3 tools/sprites/sprites.py list wall_   # alle Dateinamen (mit Suchwort)
python3 tools/sprites/sprites.py export scene/furniture/table icons/ui/ui_war dwarves/hair/front
python3 tools/sprites/sprites.py export --all
python3 tools/sprites/sprites.py apply        # eigene Bilder ins Spiel (optional nur ein Satz: apply scene)
```

- **Export** schreibt nach `sprites-export/<Satz>/<Ordner>/<Name>.png` (nicht in Git). Im Browser auch „Download“ je
  Bild und „Download all (zip)“.
- **Eigene Bilder** liegen in `art-src/png/<Satz>/<Ordner>/` unter genau dem Pfad aus dem Export. Sie gehen vor die
  gezeichnete Grafik. `apply` (oder „Replace“ im Browser) packt sie in die Bilder in `static/art/`. Danach das
  Spiel neu laden. Raumvorlagen mit neuen Szenen-Teilen speichert der Server erst nach einem Neustart
  (`RoomTemplates` kennt die Namen aus `sheet.json`); läuft er aus dem jar, vorher neu bauen.
- **Ein neuer Name** ist ein neues Sprite. Im Browser über „New sprite“. Bei der Szene bestimmt der Ordner die Gruppe
  im Raum-Editor.
- **Zurück zur gezeichneten Grafik:** Datei aus `art-src/png/` löschen und `apply` laufen lassen, oder im Browser
  „Use drawn one“. Die gezeichnete Fassung merkt sich das Werkzeug in `art-src/out/sprite-base/`. Auf einem
  frischen Checkout erst den Generator laufen lassen.
- Die Generatoren legen die eigenen Bilder am Ende wieder hinein. Ein Fehler darin bricht den Bau nicht ab, er wird
  als Warnung gemeldet.

| Satz | Pfad | Was |
|---|---|---|
| `icons` | `icons/<Art>/<name>.png`, Art: `ui`, `buttons`, `items`, `ores`, `raws`, `gems`, `goods`, `markers` | Symbole, Knöpfe (`btn_*`, 9-Slice), Waren. Größe bei Symbolen und Knöpfen halten |
| `scene` | `scene/<Gruppe>/<name>.png`, `name@1.png` (weitere Bilder einer Animation), `name.glow.png` (was nachts leuchtet), optional `name.json` | Räume, Möbel, Wände (`wall_*`), Böden (`floor_*`), Tal, Fels, Monster. `name.json` darf `kind` (`prop`/`tile`), `anchor` [x, y] und `recolour` setzen. Neue Teile ohne Angabe: `prop` (`wall_`/`floor_` = `tile`), Anker unten Mitte. Ein Bild in anderer Größe behält seinen Standpunkt |
| `dwarves` | `dwarves/<Teil>/<Ansicht>@<Stil>.png`, z. B. `dwarves/hair/front@mohawk.png`, `dwarves/body/front_m@0.png` | Zwerge, jedes Bild 48 × 64, Füße unten Mitte, Platzhalterfarben werden je Zwerg umgefärbt. Ein neuer Stilname kommt in die Liste in `kit.json` (Frisuren, Bärte, Hüte, Gesichter, Requisiten) und bekommt in den anderen Ansichten erst ein leeres Bild |
| `backdrop` | `backdrop/<name>.png` | Ebenen des Tals, nur ersetzen |

**Grenzen:** Ein neuer Zwergstil steht im Kit, aber das Spiel wählt ihn erst, wenn der Code ihn einem Zwerg
gibt (`art/dwarves.js`). Neue Symbole und Waren erscheinen erst, wenn der Code ihren Namen benutzt. Neue
Wände und Böden erscheinen sofort im Raum-Editor, neue Möbel unter ihrer Gruppe.

## Zwerge

Alle Zwerge (Festung, Mine, Porträts, Login-Bild) kommen aus dem Satz in `static/art/dwarves/` (die Figuren sind etwa
47 px hoch, Räume 144 px). Jedes Teil hat einen Ordner (`arms`, `beard`, `body`, `face`, `hair`, `hat`, `head`, `legs`,
`props`, `quilt`, `vest`), darin ein Streifen je Ansicht (`front.png`, `side_m.png`, `side_far.png` …); `kit.json`
nennt Streifen, Dateien (`files`), Posen und Farben.

- **Vorlage:** das Basismodell (Mann, kurze Haare, Vollbart, grüne Tunika, Lederweste), Vorschau mit
  `python3 art-src/dwarves/preview.py`, im Raster der Laufvorlage: Zellen 48 × 64, Reihen hinten, rechts, vorn, links (links = rechts gespiegelt), Spalten Schritt, Stand, Schritt.
- **Quelle ist Code:** `art-src/dwarves/parts.py` baut jedes Teil aus einfachen Formen, `engine.py` schattiert sie
  (Licht von oben links, 5 Töne je Farbe, Umriss im dunkelsten Ton des Teils). `python3 build.py <ordner>` schreibt
  die Streifen und `kit.json`, `python3 preview.py <ordner>` die Vorschauen. Wer eine PNG von Hand verbessert, darf
  `build.py` danach nicht mehr über den Ordner laufen lassen.
- **Teile:** Beine (gehen 3, sitzen in allen Ansichten), Körper Mann/Frau, Weste, Arme (gehen, Hände unten/Brust/Mund;
  von hinten an der Werkbank, Hammer oben, Schlag), Kopf, Gesichter
  (`neutral happy angry open blink sleep`), 6 Frisuren, 5 Bärte, 3 Hüte, Dinge in der Hand, Decke zum Schlafen; je Ansicht.
- **Posen** stehen mit Bildern und Reihenfolge in `kit.json` (`poses`, `order`): `idle talk hands sit sitTalk eat drink
  walkFront walkBack idleBack walk idleSide work sleep`, dazu sitzend und arbeitend in jeder Ansicht: `sitSide sitBack
  workSit workBack workSitBack workSitFront` (Vorschau `seated_work.png`). Eine Zeile ist `[Beine, Arme, dy, Stimmung, Ding/Decke]`; `dy`
  schiebt alles außer den Beinen. Schlafen ist das Seitenbild, eine Vierteldrehung nach links.
- **Augen:** 3 px breit, Lid oben, zwei Reihen Weiß und Iris.
- **Umfärben:** `ramps` in `kit.json` sind Platzhalter (Haut, Haar, Tunika, Weste, Hose, Stiefel, Metall, Stoff …);
  Ton 3 ist die Grundfarbe, die neue Reihe kommt aus `ramp(farbe)` in `art/dwarves.js`. `fixed` (Augen, Umriss) bleibt.
- **Lader:** `static/js/art/dwarves.js` (`load`, `frame(look, pose, f)`, `draw(ctx, look, pose, f, x, y, {flip})`, Umfärben
  über `look.ramps`, `quilt: false` lässt die Decke weg). Der Raum-Editor zeigt seine Punkte damit. Im Spiel übersetzt
  `look48(d)` in `art/dwarves.js` einen Zwerg (Frisur, Bart, Haut, Haar, Kleidung, Helm, Stimmung) in einen `look`.
- **Mine:** vierter Hut `miner` (Lederhelm mit Messinglampe), Pose `mine` (Seitenansicht, Spitzhacke oben/Mitte/unten,
  `side_prop` / `side_prop_back` in `kit.json`; oben liegt die Hacke hinter dem Kopf). `look48(d, {hat: 'miner'})`.

## Szene 48 px

Räume, Tal, Fels, Monster und Effekte im Maßstab der Zwerge 48 × 64: Zelle 48 px, Raum 144 px hoch, Boden bei y 135.
Räume sind keine fertigen Bilder mehr, sondern werden aus Teilen zusammengesetzt (Wand, Boden, Gewölbe, Möbel).

- **Quelle ist Code** in `art-src/scene/` (Python mit numpy und Pillow): `engine.py` (Formen, Schattierung, Farbreihen),
  `props.py` (Möbel), `shells.py` (Wände, Böden, Gewölbe, Gang, Treppenhaus, Schacht, Tunnel, Pfeiler), `living.py`,
  `workshop.py`, `storage.py`, `valley.py`, `rock.py`, `monsters.py`, `ambient.py`. Jede Datei mit
  `python3 <datei> preview` baut Vorschaubilder nach `art-src/out/preview/`.
- **Stil:** 5 warme Töne je Material, Schatten ins Pflaumenfarbene, Licht von oben links, Holz flach nach Flächen,
  Rundes gewölbt, Umriss im dunkelsten Ton des Materials, Muster nur mit Grund. Mauerwerk und Bretter schattiert
  `blocks()` (Fuge, helle Kante oben links, dunkle unten rechts).
- **Export:** `python3 art-src/scene/export.py` schreibt `static/art/scene/sheet.png`, `glow.png` (nur selbst
  leuchtende Pixel, gleiche Lage) und `sheet.json` und vergleicht danach jedes Pixel. Ein Eintrag:
  `{kind: prop|tile, group, frames: [[x, y, w, h, ankerX, ankerY], ...], recolour, glow}`. Möbel stehen mit dem Anker
  auf dem Boden, Wandteile hängen daran, Kacheln wiederholen sich ab ihrer linken Kante (Wände und Fels alle 96 px).
  Animierte Teile haben 4 Bilder.
- **Umfärben:** Platzhalter-Reihen in `placeholders`: `ingot` (Barren, Erz; Ton 3 = Metallfarbe, neue Reihe aus
  `ramp`) und `rockd` (Höhlen, Risse, Brocken; Reihen der Minenschichten in `depths`). Der Export prüft, dass
  kein anderes Material dieser Teile eine Platzhalterfarbe hat.
- **Im Spiel:** `static/js/art/scene.js` (`load`, `draw`, `frame`, `tile`, `depthRamp`, `names`). `scene/hold.js` lädt Sheet,
  Zwerge und alle Raumvorlagen vor dem ersten Bild (`loadArt()`), zeichnet Himmel, Berge (`mountains_*` nach Tageszeit),
  Wiese, Bäume, Stand, Brunnen, Fels (`rock_0..4` nach Tiefe, nahtlos in beide Richtungen: `voronoi(..., wrap_y=True)`,
  `blocks(..., wrap_y=True)` in `rock.py`), Gänge (`hallway`), Schacht (auf jeder Etage die Treppenhaus-Vorlage mit
  Tür, keine Leitern), Treppenhäuser, Tunnel, Tor,
  schlanke Trennsäulen (16 px, `divider_rock|brick|sand|slate|stone|oak` in `ways.py`, 4 Bilder: zu, Tür halb, fast,
  ganz offen) im Vordergrund überall, wo eine Wand einen Raum von einem anderen Raum oder einem Gang trennt (`wallsOf`,
  `drawWalls`). Die Säule nimmt das Material der Rückwand des Raums (`PILLAR` in `hold.js`), oben trifft sie die
  Gewölbe-Ecken der Räume, Kapitell und Sockel sind Blöcke. Schmuck je Säule (`pillar_band`, `pillar_runes`,
  `pillar_banner`, zufällig aus der Lage). Die Tür steckt in der Säule und ist nur zu sehen, solange ein Zwerg auf seinem
  Weg daneben ist (dann schwingt sie heraus).
  Rückwände: `wall_rock`, `wall_hewn`, `wall_brick`, `wall_ashlar`, `wall_panel`, dazu `wall_plaster` (Fachwerk),
  `wall_slate` (Schiefer) und `wall_tile` (glasierte Fliesen mit Goldfries). Jeder Raum und jeder Abschnitt aus Gängen/Treppenhäusern hat an allen vier
  Innenkanten gestuften Schatten (`drawEdges`),
  Höhlen mit Bewuchs (`moss_*`, `glowshrooms`, `roots`, `stalactites`), Risse beim Graben und Monster. Räume: Hülle
  und hintere Möbel, die Zwerge im Raum, vordere Möbel; die leuchtenden Pixel (`glow`) kommen nach der Lichtschicht.
  Lichter, Rauch, Funken, Dampf und Klickflächen kommen aus den Punkten der Vorlage. Alte Symbole (Status, Pfeile,
  Pixelschrift) werden doppelt groß gezeichnet.
- **Mine** (`art-src/scene/mine.py`, Gruppe `mine`): gehauene Stützpfeiler `mine_pillar` und dunkler `mine_pillar_fg`
  (40 × 230), Vordergrund-Felsen `mine_fg_rock_0..2`, große Tropfsteine `mine_fg_stal_0..1`, Felsnadeln `mine_spire_0..1`,
  Erzadern `ore_seam_0..2` (Platzhalter `ingot` = Erzfarbe), Tunnelloch `mine_hole`, Erzwagen `minecart` (5 Bilder:
  leer bis voll, Haufen in `ingot`), Schiene `rail` (Kachel). Fels überall in `rockd`, gezeichnet in `scene/mine.js`.

### Raumvorlagen (Editor)

Wie ein Raum eingerichtet ist, steht in Vorlagen: Wand, Boden, Gewölbe, Möbel mit Position, Ebene (`layer`: `back`
hinter den Zwergen, `front` vor ihnen, z. B. ein Tisch, hinter dem sie sitzen), Reihenfolge, Spiegelung und Bild,
dazu Punkte, die das Spiel liest (`worker` mit Blickrichtung `face` – `front`, `left`, `right`, `back` = Rücken zum
Betrachter – und `sit`, `seat`, `bar`, `bed`, `light` mit Radius, Farbe und
Stärke, `fire`, `chimney`, `bellows`, `anvil`, `quench`, `wheel`, `work`, `kettle`, `steam`, `stand`).

- **Im Spiel:** Raumfenster → „Change look“ zeigt alle Vorlagen des Raumtyps mit Bild (eingebaut und von Spielern).
  „Use“ wählt, „Copy“ öffnet eine Kopie im Editor, „Edit“ die eigene, „Make a new look“ eine Kopie der aktuellen. Der
  Editor (`static/editor/`) läuft als Fenster über dem Spiel (`openEditor` in `ui/popups.js`, `?embed=1&type=&part=&name=&copy=1`)
  und meldet `saved`, `deleted` und `close` per `postMessage`; nach dem Speichern bekommt der Raum die neue Vorlage.
  Am Handy (≤ 760 px) gibt es nur die Liste mit „Use“, Editor-Knöpfe fehlen dort.
- **Spieler-Vorlagen** speichert der Server in der Tabelle `room_templates` (`RoomTemplates.java`): jeder Eingeloggte
  darf Vorlagen anlegen (höchstens 40), alle sehen und nutzen sie, ändern oder löschen darf nur der Ersteller (auch kein
  Admin). Namen eingebauter Vorlagen sind vergeben. Der Server baut jede Vorlage aus bekannten Feldern neu auf
  (Sprites und Kacheln aus `sheet.json`, bekannte Punkte, Zahlen begrenzt). API: `GET /api/rooms` (Liste mit Ersteller),
  `GET /api/rooms/template`, `POST /api/rooms/save`, `POST /api/rooms/delete`.
- **Lokal (eingebaute Vorlagen):** `python3 tools/room-editor/serve.py`, dann `http://localhost:8099` öffnen. Braucht nur
  Python 3, speichert als Dateien. Raumtypen und Breiten liest er aus `Layouts.java` (`ROOM_CELLS`, `MACHINE_CELLS`).
- **Hilfe:** Jedes Bedienelement, jeder Punkt und jede Möbel-Gruppe hat einen Info-Knopf (i) und einen Tooltip mit
  einer kurzen englischen Erklärung. Texte: Bedienung und Möbel in `static/editor/info.js`, Punkte in
  `art/rooms.js` (`SPOTS[kind].about`, das Spiel nutzt sie mit).
- **Raster:** „Snap“ (Standard 4 px) rastet Platzieren, Ziehen und Pfeiltasten ein, gezählt ab der Bodenlinie, die
  Decke (y 0) rastet auch. Alt platziert pixelgenau. Der Schalter „grid“ zeigt die Rasterpunkte, die 48-px-Zellen und
  die Raummitte.
- **Mehrfachauswahl:** Shift+Klick, Rahmen auf freier Fläche aufziehen, Strg+A. Dann: linke Kante und Oberkante der
  Gruppe eingeben, ausrichten (links, Mitte, rechts, oben, Mitte, unten), im Raum zentrieren, gleichmäßig verteilen
  (zwischen dem ersten und letzten) oder über die ganze Raumbreite bzw. -höhe verteilen. Einzelne Teile: x/y eingeben
  und zentrieren. Ziehen, Pfeile, F, S, L und Bild auf/ab wirken auf die ganze Auswahl.
- **Bedienen:** Links Möbel oder Punkt wählen und in den Raum klicken. Möbel rasten am Boden ein (Alt hält sie frei).
  Ziehen verschiebt. Tasten: Pfeile (mit Shift 8 px), F spiegeln, Bild auf/ab für die Ebene, Entf, Strg+D, Strg+S,
  Esc, L wechselt die Ebene. Bei einem Punkt dreht F die Blickrichtung weiter, S schaltet sitzen/stehen; rechts steht
  die Pose, die daraus wird (`spotPose(spot)` in `art/rooms.js`, z. B. Arbeiter `back` + `sit` = `workSitBack`). Links „New props go“ wählt, wohin neue Möbel kommen; der Schalter „front“ macht die
  vordere Ebene durchsichtig. „auto spots“ setzt die Punkte, die die Möbel mitbringen (Fackel gibt Licht, Bank zwei Sitze, Amboss Funken
  und Arbeitsplatz …). Rechts steht, welche Punkte der Raumtyp mindestens braucht. Schalter für Licht, Zwerge an den
  Punkten, Animation, Raster und Zoom.
- **Wege:** Eingangshalle (`entrance_hall`, 6 Zellen), Treppenhaus (`stairwell`, 2) und Gang (`hallway`, 1) sind im
  Editor zusätzliche Typen (`WAYS` in `RoomTemplates.java` und `serve.py`). Vorlagen je Stil `timber`, `stone`, `grand`; Gänge dazu `<stil>_lit`
  (jede vierte Zelle, Fackel) und `<stil>_deco` (Banner, Fass, Waffen). Ein Treppenhaus braucht einen Punkt `door` (am Fuß
  der Tür `stairdoor*`, dort gehen Zwerge hinein); das Spiel setzt das Bild der Tür selbst (0 zu bis 3 offen). Teile in
  `art-src/scene/ways.py`.
- **Ablage:** `static/art/rooms/<typ>/<room|bay>_<name>.json`, Liste in `rooms/index.json` (schreibt der
  Editor). `bay` ist eine Maschinen-Erweiterung. Format und Pflichtpunkte stehen in `static/js/art/rooms.js`
  (`SPOTS`, `NEEDS`, `PROP_SPOTS`), zeichnen mit `drawRoom(ctx, tpl, x, y, t, {between})`: Hülle und hintere Ebene, dann `between` (die Zwerge),
  dann die vordere Ebene, jede Ebene für sich beleuchtet.
- **Im Spiel:** `Building.look` (leer = erste Vorlage) und die Aktion `roomLook {building, look}`. Der Server prüft
  gegen `rooms/index.json` (`RoomLooks.java`) und die Spieler-Vorlagen. Ein Test verlangt für jeden Raumtyp und jede Erweiterung mindestens
  eine Vorlage.

## Tiefe

- Die Festung liegt in einem Berg: links das Tal (Bäume, Marktstand, Reisende, Karawanen), ein Tor mit Tunnel (die
  Eingangshalle) führt auf Etage `ENTRY` zum Schacht. Die Bergform kommt aus `mtop(x)` in `scene/hold.js`.
- Räume, Gänge, Treppenhäuser und Schacht sind in den Fels geschnitten (`drawEdges`), ungenutzter Fels ist schwarz
  (`drawFog`).
- Der Hintergrund des Tals zieht beim Verschieben langsamer mit (Parallaxe, `art/backdrop.js`).
- Zwerge werfen einen kleinen Schatten auf den Boden (`groundShadow` in `art/sprites.js`).

## Stil

- Symbole und Knöpfe exakt symmetrisch: nur die linke Hälfte als Raster zeichnen und mit `mx` spiegeln
  (`mx: "c"` bei ungerader Breite). `poly`/`line` geben schräge Kanten oft ungleich.

Warm und freundlich: abgerundete Höhlenräume statt Kästen, Licht von oben links, weiche Laternen- und
Feuerschein-Effekte über das Licht im Spiel, kleine liebevolle Details (Katze am Kamin, Pflanzen, Spinnweben).
Kein Rauschen als Füller: jede Markierung auf einer Fläche braucht einen Grund (Fuge, Brett, Fleck).
