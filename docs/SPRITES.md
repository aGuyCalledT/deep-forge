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
| Oberfläche | Bäume 44 × 62, Stand 70 × 52, Zelt 60 × 46 | stehen auf dem Gras (`onGrass` in `hold.js`), Lage in `SURFACE` |
| Waren, Symbole | 16 × 16 | im Spiel ×2 gezeigt |
| Monster | je nach Art, Figuren wie Zwerge | `Figure.monster(id, frame)` |

## Stil

Warm und freundlich: abgerundete Höhlenräume statt Kästen, Licht von oben links, weiche Laternen- und
Feuerschein-Effekte über das Licht im Spiel, kleine liebevolle Details (Katze am Kamin, Pflanzen, Spinnweben).
Kein Rauschen als Füller: jede Markierung auf einer Fläche braucht einen Grund (Fuge, Brett, Fleck).

## Zwerge

`figure.js` baut jede Figur aus Teilen (Körper, Beine, Kleidung, Kopf, Gesicht, Haare, Bart, Hut, Werkzeug) und malt
sie flach mit leichtem Verlauf von oben nach unten, Stoff-Texturen je Kleidungsstück, farbigen Innenlinien und einem
weichen Umriss. 10 Körper (5 Männer, 5 Frauen), Nasen, Brauen, Augenfarben, Münder, Frisuren und Bärte (Bart = Haarfarbe).
Posen: `idle talk sit sitTalk eat drink walk work climb sleep`, Stimmung `happy neutral angry` aus der Zufriedenheit.
`sprites.js` (`dwarfSprite`, `placeDwarf`, `portrait`) speichert fertige Bilder zwischen.

## Tiefe

- Die Festung liegt in einem Berg: links das Tal (Markt, Zelt, Winde, Mauer, Karawanen), ein Tor (`gate`) mit Tunnel
  führt auf Etage `ENTRY` (2) zum Schacht, darüber zwei Etagen über dem Talboden. Die Bergform kommt aus `mtop(x)` in
  `hold.js` (Steilwand am Tor, Hang, Gipfel mit Schnee, Gras und kleine Tannen am Rand).
- Der Fels ist die vordere Ebene: grauer Naturstein in vier Gesteinsbändern (`stone_*`, je zwei Etagen, je drei
  Varianten per Hash), oben die Bergkante mit Gras und Schnee, unter dem Tal Erde und Wurzeln.
- Räume, Gänge, Treppenhäuser und Schacht sind hineingeschnitten: der Fels wirft einen weichen Schatten nach rechts unten
  hinein, die untere und rechte Kante jeder Öffnung fängt Licht. Beide Ebenen werden je Grundriss einmal gezeichnet.
- Am Himmel ziehen Berge (mit Schnee) und bewaldete Hügel beim Verschieben langsamer mit als die Welt (Parallaxe),
  dazu Dunst über dem Horizont.
- Zwerge werfen einen kleinen Schatten auf den Boden (`groundShadow` in `sprites.js`).
