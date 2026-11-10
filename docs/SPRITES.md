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
| `art-src/dwarves.px.js` | Zwerge aus Teilen: 3 Statur-Varianten × Posen, 8 Bärte, 6 Frisuren, 6 Hüte, 5 Accessoires, Werkzeuge. Zwei Ansichten: von vorn (stehen, sitzen, trinken, schlafen) und von der Seite nach rechts (laufen, arbeiten, graben, klettern); Teile heißen `dw_beard_front_3`, `dw_hair_side_1` usw. |
| `art-src/rooms.px.js` | die 12 Räume (64 px hoch, Breite = Zellen × 16), Feuer- und Rad-Animationen |
| `art-src/world.px.js` | Fels, Gänge, Treppen, Schacht, Oberfläche, Wagen, Fackel, Pfeil, Minen-Teile |
| `art-src/goods.px.js` | Erze, Barren, Waren, Rohstoffe, Münze, Artefakt |
| `art-src/monsters.px.js` | 9 Monster mit 2 Bildern |
| `art-src/ui.px.js` | Symbole der Oberfläche |

## Austauschfarben

Einige Farben in der Grafik sind Platzhalter, die das Spiel ersetzt (`SWAP` in `shared.js`):

- **Metall** (`m M x X`): Barren, Waren, Werkzeuge bekommen die Farbe ihres Metalls.
- **Haut** (`a A i`), **Bart** (`r R t`), **Haare** (`d D E`), **Tunika** (`T L K`): je Zwerg.

Neue Grafik, die umgefärbt werden soll, nutzt genau diese Palettenschlüssel.

## Eigene Bilder

Eine PNG-Datei im Ordner `sprites/` mit dem Namen eines Sprites ersetzt es, z. B. `sprites/room_forge.png`,
`sprites/ore_galena.png`, `sprites/ui_war.png`. Ein `sprites/dwarf.png` (20 × 32) ersetzt alle Zwerge.
Alle Namen stehen in `static/art/atlas.json`. Neu laden reicht.

## Größen

| Was | Größe | Hinweis |
|---|---|---|
| Raum | Zellen × 16 breit, 64 hoch | Füße der Zwerge auf y = 58 |
| Zwerg | 20 × 32 fertig | Teile 18 × 26 + Umriss, Hüte 4 px höher; Füße (Umriss) in der untersten Reihe, Mitte x = 10 |
| Gang | 16 × 64 | |
| Treppe | 32 × 128 | zwei Stockwerke, nach rechts unten |
| Waren, Symbole | 16 × 16 | im Spiel ×2 gezeigt |
| Monster | ca. 26 × 22 | |

## Stil

Warm und freundlich: abgerundete Höhlenräume statt Kästen, Licht von oben links, weiche Laternen- und
Feuerschein-Effekte über das Licht im Spiel, kleine liebevolle Details (Katze am Kamin, Pflanzen, Spinnweben).
Kein Rauschen als Füller: jede Markierung auf einer Fläche braucht einen Grund (Fuge, Brett, Fleck).

## Zwerge

Großer runder Kopf, Augen mit Glanzpunkt, rote Wangen, buschige Brauen (gehören zur Frisur), Licht von oben links
in drei bis vier Tönen. Die Umrisse sind im Sheet dunkel (`k`); `sprites.js` (`softOutline`) färbt jedes Umriss-Pixel
beim Zusammensetzen in einen dunklen Ton der Farbe daneben, so wie in Stardew-artigen Figuren.

## Tiefe

- Der Fels ist die vordere Ebene: abgerundete Steine mit Licht oben links (`rock`), dazu im Spiel leichte Schichten,
  Wurzeln unter der Erde und nach unten dunkler, kühler werdendes Gestein (`depthLayers` in `hold.js`).
- Räume, Gänge, Treppen und Schacht sind hineingeschnitten: der Fels wirft einen weichen Schatten nach rechts unten
  hinein, die untere und rechte Kante jeder Öffnung fängt Licht. Beide Ebenen werden je Grundriss einmal gezeichnet.
- Am Himmel ziehen Berge (mit Schnee) und bewaldete Hügel beim Verschieben langsamer mit als die Welt (Parallaxe),
  dazu Dunst über dem Horizont.
- Zwerge werfen einen kleinen Schatten auf den Boden (`groundShadow` in `sprites.js`).
