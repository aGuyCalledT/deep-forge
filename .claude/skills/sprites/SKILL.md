---
name: sprites
description: Pixelgrafik für Deep Forge in sprites.js und scene.js zeichnen oder ändern. Immer benutzen, bevor ein Erz, Barren, Gegenstand, Zwerg, Monster, Raum, eine Kachel oder ein Szenen-Element entsteht oder geändert wird.
---

# Pixelgrafik für Deep Forge

Alle Grafik entsteht im Browser aus Code in `src/main/resources/static/js/sprites.js`. Die Szene
(`scene.js`) setzt sie zusammen. Eigene PNGs im Ordner `sprites/` ersetzen Grafiken mit gleicher Id
(Liste: `docs/SPRITES.md`).

## Bausteine in `sprites.js`

- `cached(id, w, h, draw, outline = true)`: erzeugt einmal, cacht, prüft vorher auf ein eigenes PNG mit dieser Id.
  Mit `outline` bekommt alles automatisch den Umriss `#0c090e`.
- `rows(ctx, x, y, zeilen, palette)`: Sprite aus Zeichenzeilen. `.` und Leerzeichen sind durchsichtig.
- `shade(farbe, f)`: aufhellen (`f > 0`) oder abdunkeln (`f < 0`). `mix(a, b, t)` mischt.
- `rand(seed)`: fester Zufall, damit Grafik bei jedem Laden gleich aussieht.
- `lump(...)`: Gesteinsbrocken mit Licht von oben links.

## Regeln

- Licht von oben links, harte Kanten, keine Verläufe in Sprites (nur der Himmel hat einen).
- Metallteile immer aus `byId.metals[...].color` mit `shade` ableiten, damit jede Legierung passt.
- Größen aus `docs/SPRITES.md` einhalten. Neue Ids dort eintragen.
- Animation über `frame` (0/1, bei Fackeln 0–2), nie über Zufall pro Bild – der Cache-Schlüssel enthält den Frame.
- Zwerge: `dwarfSprite(d, pose, frame)`; Bart, Haare, Haut, Helm, Rüstung und Werkzeug kommen aus dem Zwerg.
- In der Szene Text nur mit `text()` (3×5-Pixelschrift). Großbuchstaben, Ziffern, `/ : . - + ! ? % '`.

## Prüfen

Nach jeder Änderung im Browser ansehen, bei Tag und Nacht (Uhrzeit des Rechners) und in Handy- und Desktopbreite.
Screenshot mit Playwright (`deviceScaleFactor: 2`), Szene über `#scene-wrap` scrollen, um die Mine zu sehen.
