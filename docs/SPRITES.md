# Grafik

Alle Grafik wird mit **pxl** gezeichnet (Skill `pxl-pixel-art`, liegt auch im Repo unter
`.claude/skills/pixel-art/`). Quellen in `art-src/`, Ergebnis ist ein Sprite-Sheet:

```bash
node scripts/build-art.mjs            # schreibt static/art/atlas.png, atlas.json, meta.json
node scripts/build-art.mjs --preview  # zusätzlich vergrößerte Vorschauen in art-src/out/_preview/
```

| Datei | Inhalt |
|---|---|
| `art-src/shared.js` | Palette, Austauschfarben, Raum-Anker (Arbeitsplatz, Feuer, Licht, Sitzplätze, Betten), Zwergen-Posen, Erze, Minen-Schichten. Wird von pxl **und** vom Spiel gelesen (`meta.json`) |
| `art-src/palette.px.js` | Palette und Farbtreppen |
| `art-src/figure.js` | Figuren-Baukasten für Zwerge, Zwerginnen, NPCs und menschenähnliche Monster (Kobolde, Trolle, Oger) und die Tiere der Tiefe. Wird von pxl eingebunden **und** als `static/js/figure.js` ins Spiel kopiert, das die Zwerge zur Laufzeit mit ihrem Aussehen und ihrer Kleidung baut |
| `art-src/rooms.px.js` | die 13 Räume (96 px hoch, Breite = Zellen × 24), Möbel in Zwergengröße, Feuer- und Rad-Animationen |
| `art-src/world.px.js` | Gänge, Treppenhäuser, Schacht, Oberfläche, Wagen, Fackel, Pfeil, Minen-Teile |
| `art-src/cave.px.js` | grauer Fels nach Tiefe, ausgegrabene Höhlen, Risse beim Graben, Bewuchs, runde Enden |
| `art-src/goods.px.js` | Erze, Barren, Waren, Rohstoffe, Münze, Artefakt |
| `art-src/monsters.px.js` | 9 Monster mit 2 Bildern |
| `art-src/ui.px.js` | Symbole der Oberfläche |

## Austauschfarben

Einige Farben in der Grafik sind Platzhalter, die das Spiel ersetzt (`SWAP` in `shared.js`):

- **Metall** (`m M x X`): Barren, Waren, Werkzeuge bekommen die Farbe ihres Metalls.
- Zwerge werden nicht mehr umgefärbt, sondern mit ihren Farben von `figure.js` gebaut.

Neue Grafik, die umgefärbt werden soll, nutzt genau diese Palettenschlüssel.

## Eigene Bilder

Eine PNG-Datei im Ordner `sprites/` mit dem Namen eines Sprites ersetzt es, z. B. `sprites/room_forge.png` (ersetzt den Raum in allen Stufen, ohne Erweiterungen),
`sprites/ore_galena.png`, `sprites/ui_war.png`. Ein `sprites/dwarf.png` ersetzt alle Zwerge (Füße unten in der Mitte).
Alle Namen stehen in `static/art/atlas.json`. Neu laden reicht.

## Räume: Stufen, Varianten, Maschinen

Jeden Raum gibt es viermal: `room_<typ>_<stufe>_<variante>`. Stufe 0 „ausgehöhlt“ (Fels, Fackeln, Fässer als Tisch) ab
Gebäudestufe 1, Stufe 1 „eingerichtet“ (Bretter, Ziegel, Stein, Laternen) ab Stufe 2, Stufe 2 „prächtig“
(Täfelung, Goldfries, Fliesen, Kronleuchter) ab Stufe 3, Stufe 3 „Königshalle“ (dunkler Stein, Goldfries, Runentafeln,
Marmorboden, Kristall-Lampen; Möbel wie Stufe 2) ab Stufe 5 (`ROOM_TIERS` in `shared.js`). Je zwei Varianten pro Stufe,
das Spiel wählt sie fest nach der Gebäude-ID, damit zwei Schmieden nicht gleich aussehen.

Werkstätten bekommen pro zusätzlicher Maschine eine Erweiterung `bay_<typ>_<stufe>_<variante>`, die rechts angesetzt
wird. Wand-, Boden- und Deckenmuster wiederholen sich alle 24 px, damit die Naht nicht auffällt.

Die Quellen sind **nicht** ausgeschnitten: `sprites.js` (`roomImage`) setzt Raum und Erweiterungen zusammen, legt
eine Spinnwebe (`deco_web_*`) in eine Ecke und schneidet dann Gewölbe und Ecken aus. Kleine Fehler (andersfarbige
Steine und Ziegel, Risse, Wasserflecken, eingesunkene Bretter) entstehen in `rooms.px.js` beim Zeichnen der Wand,
damit Möbel sie verdecken.

## Größen

| Was | Größe | Hinweis |
|---|---|---|
| Raster-Zelle | 24 × 96 | `CELL` in `shared.js` und `hold.js`; der Grundriss in `Layouts.java` zählt Zellen |
| Raum | Zellen × 24 breit, 96 hoch; die letzte Zelle ist ein freier Streifen mit Haken und Umhang (Möbel werden mit `w - 24` gezeichnet, `doorStrip` in `rooms.px.js`) | Füße der Zwerge auf y = 90; Tisch ca. 13 px hoch, Sitz 7 px, Etagenbett 51 px |
| Maschinen-Erweiterung | `BAYS[type].w` × 24 breit, 96 hoch | beginnt mit einem Pfeiler (x 0–5), eigene Anker in `BAYS` |
| Zwerg | Leinwand 44 × 52, Figur ca. 33 px hoch | Anker unten Mitte (x 22, y 50); liegend 34 × 20 |
| Gang | 24 × 96 | runde Enden `cap_l_<band>` / `cap_r_<band>` 8 × 96 in der Farbe des Gesteins |
| Fels | `stone_<band>_<0..2>` 64 × 64 | Band 0 Kalkstein in dünnen Schichten, 1 Sandstein in dicken Bänken, 2 fleckiger Granit mit Quarzader, 3 Basaltsäulen. Kacheln laufen an allen Rändern weiter; jedes Band füllt genau seine zwei Etagen |
| Höhle | `cave_<band>_<0..1>` 24 × 96 | ausgegraben und leer: unebene Decke (oben durchsichtig, damit der Fels übersteht), Hackenspuren, Geröll; beide Ränder 7 px hoch, damit Zellen aneinanderpassen |
| Bewuchs | `grow_<1..3>_<0..1>` 24 × 96 | über der Höhle: 1 Moos, 2 dazu Wurzeln und Pilze, 3 Moosteppich, leuchtende Pilze, Spinnennetz |
| Graben | `dig_crack_<0..2>` 24 × 96 | Risse, die mit dem Fortschritt wachsen; Kreide-Umriss und Balken zeichnet `hold.js` |
| Treppenhaus | `well` / `well_lit` 48 × 96 | Gang zwei Zellen breit, in der Mitte der Rückwand ein Steinbogen ins Dunkle (Mitte bei x = 24), Schild mit Pfeilen, Laterne; `well_lit` leuchtet, wenn gerade jemand hinein- oder herausgeht. Keine Stufen zu sehen |
| Schacht | 48 × 96 | zwei Spalten links, ein Treppenhaus mit gekreuzten Spitzhacken und Gleisen (`shaft`, `shaft_lit`) |
| Tor | `gate_1..4`: 48 × 72, 54 × 78, 64 × 88, 76 × 100 | wächst mit der Tor-Stufe: Holztor, Steinbogen mit beschlagenen Flügeln, Fallgitter und Banner, Runenbogen mit Wappen; mittig auf der Bergwand (x = −FACE), ab Stufe 3 Feuerschalen (`brazier` 14 × 22 + `fire_place`) daneben |
| Eingangshalle | `entrance_hall_0..2` 144 × 96 | der Tor-Tunnel: Holz, Stein mit Schilden, prächtig mit Bannern und Läufer; Mitte (x 48–100) frei für die Übungskämpfe der Wachen (Werkzeug `stick` in `figure.js`) |
| Oberfläche | Bäume `tree_a`/`tree_b` 160 × 240 (4 Bilder Wind, die Krone neigt sich oben mehr), Marktstand `market_stall` 128 × 84 mit Vordach `stall_awning` 136 × 30 (4 Bilder, flattert) | stehen auf dem Gras (`onGrass` in `hold.js`), Lage in `SURFACE`. Die kleinen `tree_0/1`, `stall`, `tent` gibt es nur noch für das Login-Bild |
| Status | `ui_stop` (rotes Achteck, steht still), `ui_warn` (gelbes Dreieck, braucht dich), `ui_idle` (graue Punkte, nichts zu tun) 16 × 16 | über Räumen (`roomStatus` in `hold.js`), über untätigen Zwergen und in den Hinweis-Chips |
| Waren, Symbole | 16 × 16 | im Spiel ×2 gezeigt |
| Monster | je nach Art, Figuren wie Zwerge | `Figure.monster(id, frame)` |

## Stil

Warm und freundlich: abgerundete Höhlenräume statt Kästen, Licht von oben links, weiche Laternen- und
Feuerschein-Effekte über das Licht im Spiel, kleine liebevolle Details (Katze am Kamin, Pflanzen, Spinnweben).
Kein Rauschen als Füller: jede Markierung auf einer Fläche braucht einen Grund (Fuge, Brett, Fleck).

## Zwerge

Zwerge (und kleine Fremde im Tal) setzt `static/js/dwarfkit.js` aus **PNG-Teilen** in `static/art/dwarf/` zusammen.
Gezeichnet wurden sie im Pixelwright-Projekt „Deep Forge Dwarves“ (ein Sprite pro Teil); die PNGs im Repo sind
pixelgenau dieselben und ab jetzt die Quelle: zum Ändern die PNG in Aseprite, Krita o. ä. bearbeiten, neu laden.

- Jede PNG ist ein Streifen aus Bildern à **32 × 44**, alle deckungsgleich (Füße auf Zeile 41, Anker 16/42).
  Welche Datei wie viele Bilder hat und in welcher Reihenfolge, steht in `kit.json` (`sheets`, `styles`, `beards`, `hats`, `moods`, `props`).
- Körpergröße ist immer gleich; Mann und Frau unterscheiden sich nur in der Form (`*_body_m`, `*_body_f`).
- Ansichten: `front_*` (stehen, atmen, sitzen, essen, trinken, reden), `side_*` (gehen 0–3, arbeiten 4–7, stehen 8;
  nach rechts schauend, das Spiel spiegelt), `back_*` (klettern). Schlafen = Seitenansicht mit Decke, gedreht.
- **Platzhalterfarben** (`ramps` in `kit.json`): Haut, Haar, Tunika, Hose, Stiefel, Augen, Metall (Helm, Werkzeug) und
  Stoff (Mütze, Kapuze, Decke, Sack). Wer diese Farben benutzt, bekommt sie im Spiel umgefärbt; alle anderen Farben
  (Umriss, Gürtel, Gold, Holz) bleiben.
- Zeichenreihenfolge vorn: Körper, Kopf, Gesicht, Bart, Haare, Hut, rechter Arm, Ding in der Hand. Mit Hut fallen Haare
  oberhalb von Zeile 8 (`hatClip`) weg.
- Alte Merkmale werden zugeordnet: 10 Frisuren auf 6, 8 Bärte auf 5, Hüte auf Helm/Mütze/Kapuze. Werkzeuge an der
  Seite malt `dwarfkit.js` als Stiel und Kopf aus den Handpositionen (`sideHands`).
- `art-src/dwarf-kit/*.py` sind die Entwurfs-Skripte (`python3 build_kit.py <ordner>` schreibt die Teile neu). Nur für
  große Umbauten nutzen: es überschreibt Handarbeit an den PNGs.
- Fehlt `kit.json`, malt `figure.js` die Zwerge wie früher. Große Reisende (`tall`), Monster und Kleidungs-Symbole
  kommen weiter aus `figure.js`.
- `sprites.js` (`dwarfSprite`, `npcSprite`, `placeDwarf`, `portrait`) speichert fertige Bilder zwischen.

## Zwerge 48 × 64 (im Spiel)

Die Festung zeichnet alle Zwerge mit dem Satz in `static/art/dwarf48/` (die Figuren sind etwa 47 px hoch, Räume 144 px).
Porträts in den Panels und das Cheat-Fenster nutzen noch das alte Kit (`dwarfkit.js`).

- **Vorlage:** das Basismodell (Mann, kurze Haare, Vollbart, grüne Tunika, Lederweste), `art-src/dwarf48/preview/base_walk.png`,
  im Raster der Laufvorlage: Zellen 48 × 64, Reihen hinten, rechts, vorn, links (links = rechts gespiegelt), Spalten Schritt, Stand, Schritt.
- **Quelle ist Code:** `art-src/dwarf48/parts.py` baut jedes Teil aus einfachen Formen, `engine.py` schattiert sie
  (Licht von oben links, 5 Töne je Farbe, Umriss im dunkelsten Ton des Teils). `python3 build.py <ordner>` schreibt
  die Streifen und `kit.json`, `python3 preview.py <ordner>` die Vorschauen. Wer eine PNG von Hand verbessert, darf
  `build.py` danach nicht mehr über den Ordner laufen lassen.
- **Teile:** Beine (gehen 3, sitzen in allen Ansichten), Körper Mann/Frau, Weste, Arme (gehen, Hände unten/Brust/Mund;
  von hinten an der Werkbank, Hammer oben, Schlag), Kopf, Gesichter
  (`neutral happy angry open blink sleep`), 6 Frisuren, 5 Bärte, 3 Hüte, Dinge in der Hand, Decke zum Schlafen; je Ansicht.
- **Posen** stehen mit Bildern und Reihenfolge in `kit.json` (`poses`, `order`): `idle talk hands sit sitTalk eat drink
  walkFront walkBack idleBack walk idleSide work sleep`, dazu sitzend und arbeitend in jeder Ansicht: `sitSide sitBack
  workSit workBack workSitBack workSitFront` (Vorschau `preview/seated_work.png`). Eine Zeile ist `[Beine, Arme, dy, Stimmung, Ding/Decke]`; `dy`
  schiebt alles außer den Beinen. Schlafen ist das Seitenbild, eine Vierteldrehung nach links.
- **Augen** wie bei den CC0-Vorlagen in `art-src/bases/`: 3 px breit, Lid oben, zwei Reihen Weiß und Iris.
- **Umfärben:** `ramps` in `kit.json` sind Platzhalter (Haut, Haar, Tunika, Weste, Hose, Stiefel, Metall, Stoff …);
  Ton 3 ist die Grundfarbe, die neue Reihe kommt aus `Figure.ramp(farbe, 5)`. `fixed` (Augen, Umriss) bleibt.
- **Lader:** `static/js/dwarf48.js` (`load`, `frame(look, pose, f)`, `draw(ctx, look, pose, f, x, y, {flip})`, Umfärben
  über `look.ramps`, `quilt: false` lässt die Decke weg). Der Raum-Editor zeigt seine Punkte damit. Im Spiel übersetzt
  `look48(d)` in `hold.js` einen Zwerg (Frisur, Bart, Haut, Haar, Kleidung, Helm, Stimmung) in einen `look`.

## Grafik 48 px (im Spiel)

Räume, Tal, Fels, Monster und Effekte im Maßstab der Zwerge 48 × 64: Zelle 48 px, Raum 144 px hoch, Boden bei y 135.
Räume sind keine fertigen Bilder mehr, sondern werden aus Teilen zusammengesetzt (Wand, Boden, Gewölbe, Möbel).

- **Quelle ist Code** in `art-src/props48/` (Python mit numpy und Pillow): `engine.py` (Formen, Schattierung, Farbreihen),
  `props.py` (Möbel), `shells.py` (Wände, Böden, Gewölbe, Gang, Treppenhaus, Schacht, Tunnel, Pfeiler), `living.py`,
  `workshop.py`, `storage.py`, `valley.py`, `rock.py`, `monsters.py`, `ambient.py`. Jede Datei mit
  `python3 <datei> preview` baut Vorschaubilder nach `art-src/props48/preview/`.
- **Stil:** 5 warme Töne je Material, Schatten ins Pflaumenfarbene, Licht von oben links, Holz flach nach Flächen,
  Rundes gewölbt, Umriss im dunkelsten Ton des Materials, Muster nur mit Grund. Mauerwerk und Bretter schattiert
  `blocks()` (Fuge, helle Kante oben links, dunkle unten rechts).
- **Export:** `python3 art-src/props48/export.py` schreibt `static/art/props48/sheet.png`, `glow.png` (nur selbst
  leuchtende Pixel, gleiche Lage) und `sheet.json` und vergleicht danach jedes Pixel. Ein Eintrag:
  `{kind: prop|tile, group, frames: [[x, y, w, h, ankerX, ankerY], ...], recolour, glow}`. Möbel stehen mit dem Anker
  auf dem Boden, Wandteile hängen daran, Kacheln wiederholen sich ab ihrer linken Kante (Wände und Fels alle 96 px).
  Animierte Teile haben 4 Bilder.
- **Umfärben:** Platzhalter-Reihen in `placeholders`: `ingot` (Barren, Erz; Ton 3 = Metallfarbe, neue Reihe aus
  `Figure.ramp`) und `rockd` (Höhlen, Risse, Brocken; Reihen der Minenschichten in `depths`). Der Export prüft, dass
  kein anderes Material dieser Teile eine Platzhalterfarbe hat.
- **Im Spiel:** `static/js/art48.js` (`load`, `draw`, `frame`, `tile`, `depthRamp`, `names`). `hold.js` lädt Sheet,
  Zwerge und alle Raumvorlagen vor dem ersten Bild (`loadArt()`), zeichnet Himmel, Berge (`mountains_*` nach Tageszeit),
  Wiese, Bäume, Stand, Brunnen, Fels (`rock_0..4` nach Tiefe), Gänge (`hallway`), Schacht, Treppenhäuser, Tunnel, Tor,
  Höhlen mit Bewuchs (`moss_*`, `glowshrooms`, `roots`, `stalactites`), Risse beim Graben und Monster. Räume: Hülle
  und hintere Möbel, die Zwerge im Raum, vordere Möbel; die leuchtenden Pixel (`glow`) kommen nach der Lichtschicht.
  Lichter, Rauch, Funken, Dampf und Klickflächen kommen aus den Punkten der Vorlage. Alte Symbole (Status, Pfeile,
  Pixelschrift) werden doppelt groß gezeichnet.

### Raumvorlagen (Editor)

Wie ein Raum eingerichtet ist, steht in Vorlagen: Wand, Boden, Gewölbe, Möbel mit Position, Ebene (`layer`: `back`
hinter den Zwergen, `front` vor ihnen, z. B. ein Tisch, hinter dem sie sitzen), Reihenfolge, Spiegelung und Bild,
dazu Punkte, die das Spiel liest (`worker` mit Blickrichtung `face` – `front`, `left`, `right`, `back` = Rücken zum
Betrachter – und `sit`, `seat`, `bar`, `bed`, `light` mit Radius, Farbe und
Stärke, `fire`, `chimney`, `bellows`, `anvil`, `quench`, `wheel`, `work`, `kettle`, `steam`, `stand`).

- **Im Spiel:** Raumfenster → „Change look“ zeigt alle Vorlagen des Raumtyps mit Bild (eingebaut und von Spielern).
  „Use“ wählt, „Copy“ öffnet eine Kopie im Editor, „Edit“ die eigene, „Make a new look“ eine Kopie der aktuellen. Der
  Editor (`static/editor/`) läuft als Fenster über dem Spiel (`openEditor` in `popups.js`, `?embed=1&type=&part=&name=&copy=1`)
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
  `rooms48.js` (`SPOTS[kind].about`, das Spiel nutzt sie mit).
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
  die Pose, die daraus wird (`spotPose(spot)` in `rooms48.js`, z. B. Arbeiter `back` + `sit` = `workSitBack`). Links „New props go“ wählt, wohin neue Möbel kommen; der Schalter „front“ macht die
  vordere Ebene durchsichtig. „auto spots“ setzt die Punkte, die die Möbel mitbringen (Fackel gibt Licht, Bank zwei Sitze, Amboss Funken
  und Arbeitsplatz …). Rechts steht, welche Punkte der Raumtyp mindestens braucht. Schalter für Licht, Zwerge an den
  Punkten, Animation, Raster und Zoom.
- **Wege:** Eingangshalle (`entrance_hall`, 6 Zellen), Treppenhaus (`stairwell`, 2) und Gang (`hallway`, 1) sind im
  Editor zusätzliche Typen (`WAYS` in `RoomTemplates.java` und `serve.py`). Vorlagen je Stil `timber`, `stone`, `grand`; Gänge dazu `<stil>_lit`
  (jede vierte Zelle, Fackel) und `<stil>_deco` (Banner, Fass, Waffen). Ein Treppenhaus braucht einen Punkt `door` (am Fuß
  der Tür `stairdoor*`, dort gehen Zwerge hinein); das Spiel setzt das Bild der Tür selbst (0 zu bis 3 offen). Teile in
  `art-src/props48/ways.py`.
- **Ablage:** `static/art/props48/rooms/<typ>/<room|bay>_<name>.json`, Liste in `rooms/index.json` (schreibt der
  Editor). `bay` ist eine Maschinen-Erweiterung. Format und Pflichtpunkte stehen in `static/js/rooms48.js`
  (`SPOTS`, `NEEDS`, `PROP_SPOTS`), zeichnen mit `drawRoom(ctx, tpl, x, y, t, {between})`: Hülle und hintere Ebene, dann `between` (die Zwerge),
  dann die vordere Ebene, jede Ebene für sich beleuchtet.
- **Im Spiel:** `Building.look` (leer = erste Vorlage) und die Aktion `roomLook {building, look}`. Der Server prüft
  gegen `rooms/index.json` (`RoomLooks.java`) und die Spieler-Vorlagen. Ein Test verlangt für jeden Raumtyp und jede Erweiterung mindestens
  eine Vorlage. Zu sehen ist das erst mit dem neuen Renderer.

## Tiefe

- Die Festung liegt in einem Berg: links das Tal (zwei große Bäume, Marktstand, Wegweiser, Reisende, Karawanen), ein Tor (`gate_<stufe>`) mit Tunnel (die Eingangshalle)
  führt auf Etage `ENTRY` (2) zum Schacht, darüber zwei Etagen über dem Talboden. Die Bergform kommt aus `mtop(x)` in
  `hold.js` (Steilwand am Tor, Hang, Gipfel mit Schnee, Gras und kleine Tannen am Rand).
- Der Fels ist die vordere Ebene: grauer Naturstein in vier Gesteinsbändern (`stone_*`, je zwei Etagen, je drei
  Varianten per Hash), oben die Bergkante mit Gras und Schnee, unter dem Tal Erde und Wurzeln.
- Räume, Gänge, Treppenhäuser und Schacht sind hineingeschnitten: der Fels wirft einen weichen Schatten nach rechts unten
  hinein, die untere und rechte Kante jeder Öffnung fängt Licht. Beide Ebenen werden je Grundriss einmal gezeichnet.
- Am Himmel ziehen Berge (mit Schnee) und bewaldete Hügel beim Verschieben langsamer mit als die Welt (Parallaxe),
  dazu Dunst über dem Horizont.
- Zwerge werfen einen kleinen Schatten auf den Boden (`groundShadow` in `sprites.js`).

## Vorlagen (CC0)

`art-src/bases/human` und `art-src/bases/elf`: Figuren-Vorlagen im Raster 48 × 64 (Reihen und Richtungen im Dateinamen,
z. B. `SWEN_` oder `NESW_`), von Svetlana Kushnariova (Cabbit) und Jordan Irwin (AntumDeluge), CC0, Namensnennung
freiwillig (siehe `README.txt`). Maß für Größe, Proportionen und Augen; Menschen und Elfen im Tal könnten darauf aufbauen.
