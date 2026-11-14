# Musik und Sounds

Alles Hörbare steckt in `src/main/resources/static/js/core/audio.js`. Dateien liegen in
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
  `audio-src/music/` und gehören nicht ins Spiel. Schleifen besser als OGG: MP3 hat am Anfang eine kurze Stille,
  die man beim Wiederholen hört.
- Musik und Lautstärke stellt jeder Spieler über den Musik-Knopf oben rechts ein (oder unter More → Settings).
  Taste **M** schaltet alles stumm. Die Einstellung merkt sich der Browser.

## Sound-Effekte

| Id | Datei | Wann |
|---|---|---|
| `click` | `click` | Tab wechseln, kleine Knöpfe |
| `open` / `close` | `pop` / `pop2` | Fenster auf/zu, Auftrag dazu/weg |
| `build` | `build` | Bauen, Ausbauen, Schicht öffnen |
| `levelup` | `level-up` | Festungsstufe |
| `fanfare` | `fanfare` | Meisterwerk, Expedition zurück, neue Schicht |
| `chime` | `table-chime` | Stück in Fine oder besser am Amboss, Tradition gekauft |
| `coinsLittle`, `coinsMedium`, `coinsMuch` | `coins-little`, `-medium`, `-much` | Geld kommt herein (Beute eingesammelt, Karawane zurück, Verkauf am Tor, an die besuchende Karawane, Auftrag geliefert). Welcher spielt, hängt davon ab, was der Betrag für diesen Spieler ist: verglichen mit seinem Einkommen pro Stunde (`Stats.incomeRate`, gleitender Schnitt über etwa einen Tag, `Sim.income`), unter einer halben Stunde wenig, unter drei Stunden mittel, sonst viel (`A.coins(betrag, rate)`) |
| `collect` | `collect` | „Collect“ gedrückt: die Beute fliegt ins Lager |
| `bell` | `bell2` | Zuwanderer |
| `alarm` | `bell` | Vorräte leer |
| `horn` | `goblin-horn` | Überfall angekündigt |
| `monster` | `monster-roar` | Monster in der Mine |
| `death` | `death-toll` | ein Zwerg stirbt, Expedition verloren |
| `cheer` | `dwarf-cheer` | Kampf gewonnen |
| `defeat` | `defeat` | Kampf verloren |
| `doorOpen`, `doorClose` | `door-creak-open`, `door-creak-close` | Treppenhaus-Tür auf dem Bildschirm geht auf oder fällt zu (`doorSound` in `hold.js`), nur nah genug herangezoomt, höchstens alle 2,5 s |
| `critter1`…`critter5` | `critter1`…`critter5` | ein Kriechtier in einer Höhle ist zu sehen: alle 15–45 s eins zufällig (`A.critter()`), und beim Anklicken |
| `depotRule` | `depot-rule` | eine Depot-Regel löst aus |
| `delivery` | `delivery` | Händler liefern eine Bestellung des Depots |
| `ignite` | `igniting-fire` | erster Blasebalg-Stoß in kaltem Ofen |
| `bellows` | `bellows-puff` | jeder Blasebalg-Stoß (Blasebalg-Spiel) |
| `quench` | `quench-hiss` | Abschrecken am Amboss |
| `beat` | `forge-beat` | Takt-Klick auf jedem Schlag im Amboss-Spiel |
| `anvilGood`, `anvilBad` | `anvil-good`, `anvil-bad` | Hammerschlag im Amboss-Spiel: gut oder besser / daneben |
| `cart` | `cart-roll` | Minen-Screen: der volle Wagen rollt in den Tunnel |
| `ore` | `ore-drop` | Minen-Screen: Erz fällt in den Wagen |
| `anvil` | `anvil-hit` | Ersatz für `build`, `anvilGood`, `anvilBad` |
| `pickaxe` | `pickaxe-hit` | Minen-Screen, solange gegraben wird |
| `slosh` | `barrel-slosh` | Fass geschüttelt (Brauerei-Spiel) |
| `grind` | `grind-scrape` | Klinge in der grünen Zone (Schleifstein-Spiel) |
| `rune` | `rune-tap` | Rune getroffen (Graveur-Spiel) |
| `shuttle` | `shuttle-clack` | Schiffchen gefangen (Webstuhl-Spiel) |
| `moo` | `cow-moo` | ab und zu in der Pilzfarm. Frag nicht. |
| `unsheathe` | `unsheathing-sword` | Zwerg wird Krieger, Kampfbeginn |
| `unsheathe2` | `unsheathing-sword2` | Axt ausrüsten |
| `march` | `armored-march` (4 s) | Krieger losschicken |
| `slash`, `slash2`, `slash3` | `sword-slash`, `medium-sword-slash`, `heavy-sword-slash` | Kämpfe |
| `parry`, `parry2` | `sword-parry`, `heavy-sword-parry` | Kämpfe |
| `hit`, `hit2` | `sword-armor-hit`, `heavy-sword-armor-hit` | Kämpfe |
| `caravan` | `caravan-depart` | Karawane bricht auf |
| `expedition` | `expedition-depart` | Expedition bricht auf |
| `error` | `error` | Aktion abgelehnt |

Ein Kampf (Überfall, Monster, Belagerung) spielt eine kurze Folge aus Schwert-Sounds und am Ende `cheer` oder
`defeat`.

## Hintergrund-Schleifen

Laufen in Schleife, solange der passende Screen offen ist.

| Id | Datei | Wo |
|---|---|---|
| `forge` | `anvil-hit-continuous` | Werkstatt-Screen der Schmiede, solange geschmiedet wird |
| `furnace` | `furnace-roar` | Schmelze in Betrieb |
| `grindstone` | `grindstone-loop` | Schleifstein in Betrieb |
| `brewing` | `brewing-bubbles` | Brauerei in Betrieb |
| `mine` | `mine-ambience` | Minen-Screen |
| `tavern` | `tavern-ambience` | Festungs-Screen und alle anderen Tabs |
| `night` | `night-ambience` | wie `tavern`, zwischen 21 und 6 Uhr deutscher Zeit |

## Platzhalter füllen

Datei mit dem fett gedruckten Namen in `static/sounds/` legen, z. B. `quench-hiss.mp3`, und das Spiel neu starten.
Das Musik-Fenster zeigt unten, welche Plätze noch leer sind.

## Neuen Sound einbauen

1. Eintrag in `SFX` (oder `LOOPS`) in `audio.js`: `id: { file, vol, fallback, cooldown, max }`.
2. Abspielen mit `A.sfx('id')`. Für Spieleraktionen in `soundForAction()`, für Ereignisse vom Server in
   `LOG_SOUNDS` (`main.js`), für Hintergrund in `ambience()`.
3. Diese Tabelle ergänzen.
