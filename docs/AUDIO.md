# Musik und Sounds

Alles Hörbare steckt in `src/main/resources/static/js/audio.js`. Dateien liegen in
`src/main/resources/static/sounds/` und `src/main/resources/static/music/`. Erlaubt sind `mp3`, `ogg`, `m4a` und
`wav`. Gibt es eine Datei in mehreren Formaten, nimmt das Spiel `mp3`, dann `ogg`, `m4a`, `wav`.

Das Spiel fragt beim Start `GET /api/audio`, welche Dateien es gibt. Fehlt eine Datei, spielt es den
Ersatz-Sound oder gar nichts. So kann jeder Platzhalter jetzt schon im Code stehen.

## Musik

- Jede Datei in `music/` ist ein Titel. Der Teil vor dem ersten `-` ist die **Stimmung**: `chill-track1.mp3` gehört
  zu „chill“.
- „Music fits the screen“ (Standard): **chill** in der Festung, bei den Zwergen, Expeditionen und im More-Tab,
  **industry** in Minen, Werkstätten und im Krieg, **market** beim Handel. Ist ein Titel zu Ende, kommt der nächste
  derselben Stimmung.
- Wer im Musik-Fenster einen Titel wählt, schaltet das ab. Dann laufen alle Titel der Reihe nach.
- Neue Titel: Datei mit passender Vorsilbe in `music/` legen, z. B. `chill-track2.mp3` oder `war-drums.mp3`. Eine
  neue Stimmung („war“) wird automatisch erkannt, gespielt wird sie im Automatik-Modus aber erst, wenn ein Tab sie
  in `MOOD` (`main.js`) bekommt.
- Für das Spiel bitte MP3 oder OGG verwenden: WAV ist rund achtmal so groß. Die WAV-Originale liegen in
  `audio-src/music/` und gehören nicht ins Spiel.
- Musik und Lautstärke stellt jeder Spieler über den Musik-Knopf oben rechts ein (oder unter More → Settings).
  Taste **M** schaltet alles stumm. Die Einstellung merkt sich der Browser.

## Sound-Effekte

| Id | Datei | Wann |
|---|---|---|
| `click` | `click` | Tab wechseln, kleine Knöpfe |
| `open` / `close` | `pop` / `pop2` | Fenster auf/zu, Auftrag dazu/weg |
| `build` | **`build`** (fehlt, sonst `anvil-hit`) | Bauen, Ausbauen, Schicht öffnen |
| `levelup` | **`level-up`** (fehlt, sonst `fanfare`) | Festungsstufe |
| `fanfare` | `fanfare` | Meisterwerk, Expedition zurück, neue Schicht |
| `chime` | `table-chime` | perfektes Abschrecken, Tradition gekauft |
| `coins` | **`coins`** (fehlt, sonst `table-chime`) | Karawane zurück |
| `bell` | `bell2` | Zuwanderer |
| `alarm` | `bell` | Vorräte leer |
| `horn` | **`goblin-horn`** (fehlt, sonst `bell`) | Überfall angekündigt |
| `monster` | **`monster-roar`** (fehlt, sonst `heavy-sword-parry`) | Monster in der Mine |
| `death` | **`death-toll`** (fehlt, still) | ein Zwerg stirbt, Expedition verloren |
| `cheer` | **`dwarf-cheer`** (fehlt, still) | Kampf gewonnen |
| `defeat` | **`defeat`** (fehlt, sonst `heavy-sword-armor-hit`) | Kampf verloren |
| `door` | **`door-creak`** (fehlt, still) | noch nicht benutzt |
| `ignite` | `igniting-fire` | erster Blasebalg-Stoß in kaltem Ofen |
| `bellows` | **`bellows-puff`** (fehlt, still) | jeder Blasebalg-Stoß |
| `quench` | **`quench-hiss`** (fehlt, still) | Abschrecken |
| `anvil` | `anvil-hit` | Ersatz für `build` |
| `pickaxe` | `pickaxe-hit` | Minen-Screen, solange gegraben wird |
| `moo` | `cow-moo` | ab und zu in der Pilzfarm. Frag nicht. |
| `unsheathe` | `unsheathing-sword` | Zwerg wird Krieger, Kampfbeginn |
| `unsheathe2` | `unsheathing-sword2` | Axt ausrüsten |
| `march` | `armored-march` (4 s) | Krieger losschicken |
| `slash`, `slash2`, `slash3` | `sword-slash`, `medium-sword-slash`, `heavy-sword-slash` | Kämpfe |
| `parry`, `parry2` | `sword-parry`, `heavy-sword-parry` | Kämpfe |
| `hit`, `hit2` | `sword-armor-hit`, `heavy-sword-armor-hit` | Kämpfe |
| `caravan` | **`caravan-depart`** (fehlt, sonst `bell2`) | Karawane bricht auf |
| `expedition` | **`expedition-depart`** (fehlt, sonst `armored-march`) | Expedition bricht auf |
| `error` | **`error`** (fehlt, still) | Aktion abgelehnt |

Ein Kampf (Überfall, Monster, Belagerung) spielt eine kurze Folge aus Schwert-Sounds und am Ende `cheer` oder
`defeat`.

## Hintergrund-Schleifen

Laufen in Schleife, solange der passende Screen offen ist.

| Id | Datei | Wo |
|---|---|---|
| `forge` | `anvil-hit-continuous` | Werkstatt-Screen der Schmiede, solange geschmiedet wird |
| `furnace` | **`furnace-roar`** (fehlt) | Schmelze in Betrieb |
| `grindstone` | **`grindstone-loop`** (fehlt) | Schleifstein in Betrieb |
| `brewing` | **`brewing-bubbles`** (fehlt) | Brauerei in Betrieb |
| `mine` | **`mine-ambience`** (fehlt) | Minen-Screen |
| `tavern` | **`tavern-ambience`** (fehlt) | Festungs-Screen und alle anderen Tabs |
| `night` | **`night-ambience`** (fehlt) | wie `tavern`, zwischen 21 und 6 Uhr deutscher Zeit |

## Platzhalter füllen

Datei mit dem fett gedruckten Namen in `static/sounds/` legen, z. B. `quench-hiss.mp3`, und das Spiel neu starten.
Das Musik-Fenster zeigt unten, welche Plätze noch leer sind.

## Neuen Sound einbauen

1. Eintrag in `SFX` (oder `LOOPS`) in `audio.js`: `id: { file, vol, fallback, cooldown, max }`.
2. Abspielen mit `A.sfx('id')`. Für Spieleraktionen in `soundForAction()`, für Ereignisse vom Server in
   `LOG_SOUNDS` (`main.js`), für Hintergrund in `ambience()`.
3. Diese Tabelle ergänzen.
