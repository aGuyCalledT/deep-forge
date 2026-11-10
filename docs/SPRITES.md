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
| `art-src/rooms.px.js` | die 12 Räume (96 px hoch, Breite = Zellen × 24), Möbel in Zwergengröße, Feuer- und Rad-Animationen |
| `art-src/world.px.js` | Fels, Gänge, Treppen, Schacht, Oberfläche, Wagen, Fackel, Pfeil, Minen-Teile |
| `art-src/goods.px.js` | Erze, Barren, Waren, Rohstoffe, Münze, Artefakt |
| `art-src/monsters.px.js` | 9 Monster mit 2 Bildern |
| `art-src/ui.px.js` | Symbole der Oberfläche |

## Austauschfarben

Einige Farben in der Grafik sind Platzhalter, die das Spiel ersetzt (`SWAP` in `shared.js`):

- **Metall** (`m M x X`): Barren, Waren, Werkzeuge bekommen die Farbe ihres Metalls.
- Zwerge werden nicht mehr umgefärbt, sondern mit ihren Farben von `figure.js` gebaut.

Neue Grafik, die umgefärbt werden soll, nutzt genau diese Palettenschlüssel.

## Eigene Bilder

Eine PNG-Datei im Ordner `sprites/` mit dem Namen eines Sprites ersetzt es, z. B. `sprites/room_forge.png`,
`sprites/ore_galena.png`, `sprites/ui_war.png`. Ein `sprites/dwarf.png` ersetzt alle Zwerge (Füße unten in der Mitte).
Alle Namen stehen in `static/art/atlas.json`. Neu laden reicht.

## Größen

| Was | Größe | Hinweis |
|---|---|---|
| Raster-Zelle | 24 × 96 | `CELL` in `shared.js` und `hold.js`; der Grundriss in `Layouts.java` zählt Zellen |
| Raum | Zellen × 24 breit, 96 hoch | Füße der Zwerge auf y = 90; Tisch ca. 13 px hoch, Sitz 7 px, Etagenbett 51 px |
| Zwerg | Leinwand 44 × 52, Figur ca. 33 px hoch | Anker unten Mitte (x 22, y 50); liegend 34 × 20 |
| Gang | 24 × 96 | runde Enden `hall_cap_l/r` 8 × 96 |
| Treppe | 48 × 192 | zwei Spalten, zwei Stockwerke, nach rechts unten; Zwerge laufen die Stufen entlang |
| Schacht | 48 × 96 | zwei Spalten links |
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

- Der Fels ist die vordere Ebene: abgerundete Steine mit Licht oben links (`rock`), dazu im Spiel leichte Schichten,
  Wurzeln unter der Erde und nach unten dunkler, kühler werdendes Gestein (`depthLayers` in `hold.js`).
- Räume, Gänge, Treppen und Schacht sind hineingeschnitten: der Fels wirft einen weichen Schatten nach rechts unten
  hinein, die untere und rechte Kante jeder Öffnung fängt Licht. Beide Ebenen werden je Grundriss einmal gezeichnet.
- Am Himmel ziehen Berge (mit Schnee) und bewaldete Hügel beim Verschieben langsamer mit als die Welt (Parallaxe),
  dazu Dunst über dem Horizont.
- Zwerge werfen einen kleinen Schatten auf den Boden (`groundShadow` in `sprites.js`).
