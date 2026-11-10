---
name: sprites
description: Grafik für Deep Forge ändern oder ergänzen. Immer benutzen, bevor ein Raum, Zwerg, Erz, Gegenstand, Monster, Symbol oder Szenen-Element entsteht oder sich ändert. Zeigt, wo die pxl-Quellen liegen, wie das Sprite-Sheet gebaut wird und wie das Spiel es nutzt.
---

# Grafik für Deep Forge

Gezeichnet wird mit **pxl**: vorher den Skill `pxl-pixel-art` laden (Repo-Kopie: `.claude/skills/pixel-art/`).

1. Quelle in `art-src/*.px.js` ändern. Gemeinsame Zahlen (Raum-Anker, Posen, Palette) stehen in
   `art-src/shared.js`; das Spiel liest sie über `static/art/meta.json`.
2. Bauen: `node scripts/build-art.mjs --preview` und die Vorschau in `art-src/out/_preview/` ansehen.
3. Im Spiel prüfen (Playwright, Handy und Desktop, Tag und Nacht).

## Regeln

- Warm und freundlich, abgerundet, keine kastigen Rahmen. Räume sind Höhlen mit Gewölbe (`carve()` in `rooms.px.js`).
- Farben nur aus der Palette in `shared.js`. Umfärbbare Teile nutzen die Platzhalter aus `SWAP`.
- Kein Rauschen als Füller; jede Markierung hat einen Grund.
- Neue Raum-Möbel mit Licht oder Feuer: Anker in `ROOMS` (`shared.js`) eintragen, damit Licht und Animation stimmen.
- Zwergen-Teile sind 18 × 26 (+ Umriss), alle an derselben Stelle; Hüte 4 px höher (Leinwand 18 × 30). Zwei Ansichten
  (`front`, `side`), siehe `VIEW` in `dwarves.px.js` und `sprites.js`. Fertiger Zwerg 20 × 32, gezeichnet bei (Füße x − 10, Füße y − 31).
- Tiefe (Fels-Schatten, Kanten, Parallaxe) entsteht im Spiel, nicht im Sheet: `depthLayers` und `drawSky` in `hold.js`.

## Im Spiel

- `sprites.js`: lädt das Sheet, `draw(ctx, name, x, y)`, `sprite(name)`, Umfärben (`bar`, `item`), `dwarfSprite(d, pose, frame, tool)`.
- `hold.js`: Festung (Plan, Räume, Zwerge, Licht), `views.js`: Minen, Werkstatt, Login-Bild.
- `canvas.js`: Kamera, Licht-Durchgang, Hover-Umriss. Text im Canvas nur mit `pixfont.js`.
