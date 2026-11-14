---
name: sprites
description: Grafik für Deep Forge ändern oder ergänzen. Immer benutzen, bevor ein Raum, Zwerg, Erz, Gegenstand, Monster, Symbol oder Szenen-Element entsteht oder sich ändert. Zeigt, wo die Quellen liegen, wie die Bilder gebaut werden und wie das Spiel sie nutzt.
---

# Grafik für Deep Forge

Ausführlich in `docs/SPRITES.md`. Kurz:

| Was | Quelle | Bauen | Ergebnis |
|---|---|---|---|
| Symbole, Knöpfe, Waren, Erze, Edelsteine (16 px) | `art-src/icons/*.px.js` (pxl: vorher Skill `pxl-pixel-art` laden) | `node scripts/build-art.mjs --preview` | `static/art/icons/` |
| Räume aus Teilen, Möbel, Wände, Böden, Tal, Fels, Mine, Monster (48 px) | `art-src/scene/*.py` | `python3 art-src/scene/export.py` | `static/art/scene/` |
| Zwerge 48 × 64 | `art-src/dwarves/parts.py` | `python3 art-src/dwarves/build.py src/main/resources/static/art/dwarves` | `static/art/dwarves/<Teil>/` |
| Einrichtung der Räume | Raum-Editor (`python3 tools/room-editor/serve.py`) | speichert direkt | `static/art/rooms/<typ>/` |
| eigene PNGs | `art-src/png/<Satz>/<Ordner>/` | `python3 tools/sprites/sprites.py apply` | in die Bilder oben |

Vorschauen in `art-src/out/` ansehen, dann im Spiel prüfen (Playwright, Handy und Desktop, Tag und Nacht).

## Regeln

- Warm und freundlich, Licht von oben links, 5 Töne je Material, Umriss im dunkelsten Ton.
- Kein Rauschen als Füller; jede Markierung hat einen Grund (Fuge, Brett, Fleck).
- Umfärbbare Teile nutzen die Platzhalter: Atlas `SWAP` in `art-src/icons/shared.js`, Szene `placeholders`
  (`ingot`, `rockd`), Zwerge `ramps` in `kit.json`.
- Maßstab: Zelle 48 px, Raum 144 hoch, Boden bei y 135, Zwerge etwa 47 px hoch.
- Ein neues Möbel mit Licht, Feuer oder Sitz bringt seine Punkte über `PROP_SPOTS` (`static/js/art/rooms.js`) mit.

## Im Spiel

- `js/art/sprites.js`: Symbol-Atlas, `item()`, `gem()`, Umfärben, Porträts. `js/art/scene.js`: Szenen-Sheet.
  `js/art/dwarves.js`: Zwerge (`look48`, `draw`). `js/art/rooms.js`: Raumvorlagen zeichnen.
- `js/scene/hold.js`: Festung, `js/scene/mine.js`: Mine, `js/scene/login.js`: Login-Bild, `js/scene/canvas.js`: Kamera und Licht.
- Text im Canvas nur mit `js/art/pixfont.js`.
