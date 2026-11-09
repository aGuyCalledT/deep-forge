# Grafik und eigene Sprites

Alle Grafik wird im Browser aus Code erzeugt (`src/main/resources/static/js/sprites.js`). Jede Grafik hat eine **Id**.
Liegt im Ordner `sprites/` (im Docker-Setup neben `docker-compose.yml`) eine PNG-Datei mit dieser Id, wird sie
stattdessen benutzt. Unterordner gehören zur Id: `sprites/ore/galena.png` hat die Id `ore/galena`.

Nach dem Hinzufügen reicht ein Neuladen der Seite. Dateien werden 5 Minuten gecacht.

## Ids und Größen

| Id | Größe (px) | Was |
|---|---|---|
| `ore/<erz>` | 14×13 | Erz, z. B. `ore/galena`, `ore/native_copper` |
| `bar/<metall>` | 16×10 | Barren, z. B. `bar/steel`, `bar/rose_gold` |
| `raw/<id>` | 14×14 | `coal`, `limestone`, `stone`, `rough_gem`, `cut_gem`, `food`, `ale` |
| `item/<typ>` | 16×16 | `pickaxe`, `axe`, `helm`, `mail`, `chain`, `goblet`, `ring`, `crown` – ersetzt den Typ für alle Metalle |
| `dwarf` | 14×17 | ersetzt **alle** Zwerge (ohne Bart- und Rüstungsfarben) |
| `monster/<id>/<frame>` | 20×16 | `giant_rat`, `cave_crawler`, `cave_spider`, `goblin_scouts`, `rock_troll`, `magma_crab`, `blind_ogre`, `crystal_golem`, `deep_wyrm`; Frame `0` und `1` |
| `room/<gebäude>` | 44×28 (Draußen: 22×16) | Raum in der Festung: `tavern`, `quarters`, `warehouse`, `vault`, `smelter`, `forge`, `grindstone`, `engraver`, `jeweler`, `farm`, `brewery`, `barracks`, `trading_post`, `expedition_hall` |
| `tile/layer<n>` | 48×48, kachelbar | Gestein der Schicht 0–4 |
| `prop/wagon/<frame>` | 20×13 | Karawane |
| `prop/torch/<frame>` | 5×8 | Fackel, Frames 0–2 |
| `ui/coin`, `ui/artifact` | 9×9, 14×14 | |
| `ui/<icon>` | 14×14 | Tab-Symbole `fortress`, `dwarves`, `work`, `trade`, `explore`, `war`, `more` und `warn`, `skull`, `heart`, `mood`, `box`, `dwarf` |

Die Szene rechnet in Pixeln dieser Größe und vergrößert ganzzahlig (×2 am Handy, ×3 am Desktop).
Größere Bilder werden nicht skaliert – sie werden einfach größer gezeichnet.

## Stil

- Dunkler Umriss `#0c090e` um jede Figur (der Generator macht das automatisch).
- Licht von oben links, harte Schatten, keine weichen Verläufe.
- Metallfarben stehen in `Content.java` (`color`), so passen eigene Sprites zu den erzeugten.
