# Deep Forge – Regeln

Idle-Spiel mit Zwergenfestung. Spieltexte auf **Englisch**, Doku und Gespräche auf Deutsch.

## Werkzeuge

- **Grafik:** Vor jedem neuen oder geänderten Sprite, Raum, Monster oder Szenen-Element den Skill `sprites` laden.
- **Oberfläche:** Vor Arbeit an Panels, Layout oder CSS den Skill `impeccable:impeccable` laden, falls vorhanden.
  Der Abschnitt „Design“ unten geht vor.
- Fehlt ein Skill, das dem Nutzer sagen.

## Regeln

- **Keine Geheimnisse im Repo:** keine Passwörter, Tokens, Einladungscodes oder Domains in Code, Doku, Commits.
  Umgebungsvariablen nur mit Namen nennen. `.env` wird nie committet.
- **Der Server ist die Wahrheit.** Jede Spielregel steht im Java-Code. Der Client rechnet nur zur Anzeige
  (Preisschätzung, Fortschrittsbalken) und bekommt abgeleitete Werte über `View.java`.
- **Balancing-Zahlen** stehen in `Content.java`/`Rules.java`. Wer eine ändert, passt `docs/BALANCING.md` an.
- **Spielstand-Felder:** neue Felder in `State.java` bekommen einen Standardwert, damit alte Spielstände laden
  (Jackson ignoriert unbekannte Felder, fehlende bekommen den Feld-Initialwert).
- **Keine Abhängigkeiten im Frontend:** kein npm, kein Build-Schritt. ES-Module direkt aus `static/js/`.
- **Spieltexte** kurz, freundlich, englisch. Warnungen sagen immer, was zu tun ist.

## Aufbau

| Datei | Inhalt |
|---|---|
| `game/Content.java` | alle Inhalte: Metalle, Legierungen, Erze, Waren, Schichten, Monster, Gebäude, Eigenschaften, Städte, Traditionen |
| `game/State.java` | Spielstand (eine JSON-Zeile pro Spieler) und die gemeinsame Welt (Markt) |
| `game/Rules.java` | Formeln: Tempo, Kraft, Kapazitäten, Kosten, Kampf, Tod |
| `game/Sim.java` | Zeitschritt: Bedürfnisse, Stimmung, Mine, Werkstätten, Monster, Überfälle, Karawanen, Zuwanderung |
| `game/Recipes.java` | was jede Werkstatt kann und braucht |
| `game/Expeditions.java` | Gerüchte, Etappen, Entscheidungen, Beute |
| `game/Market.java` | globale Kurse, Stadt-Nachfrage, Kauf und Verkauf mit Preiseinfluss |
| `game/Actions.java` | alle Spieleraktionen mit Prüfung |
| `game/View.java` | was der Client sieht (Spielstand + abgeleitete Zahlen) |
| `game/GameService.java` | Laden, Weiterrechnen, Speichern, Minuten-Takt für alle Festungen |
| `auth/` | Name + Passwort (BCrypt), Token-Sitzungen, Einladungscode, Admins |
| `static/js/scene.js` | Canvas-Screens: Festung (Oberfläche + Hallen), Minen, eine Werkstatt groß (`G.screen`, `G.ws`) |
| `static/js/halls.js` | Werkstatt-Räume aus Code: `hall()` zeichnet, `anchors()` sagt, wo Feuer, Dampf, Funken und Arbeiter hingehören |
| `static/js/sprites.js` | Pixelgrafik aus Code + eigene PNGs |
| `static/js/panels-*.js` | die Tabs (Hold, Mines, Work, Dwarves, Trade, Explore, War, More); Formulare laufen in Bottom-Sheets (`openSheet`) |
| `static/js/data.js` → `contextResources()` | welche Vorräte jeder Tab in der Übersicht zeigt (Seitenleiste am Desktop, aufklappbar am Handy) |

## Rezepte

- **Neues Metall oder neue Legierung:** `metal(...)` in `Content.java` (Farbe, Wert, Härte, edel, Hitzefaktor,
  Schmelz- und Abschreck-Text, Abschreck-Fenster). Legierung zusätzlich `alloy(...)`. Wert so wählen, dass die
  Legierung mehr wert ist als ihre Zutaten. Balancing-Doku ergänzen.
- **Neue Ware:** `ITEMS` in `Content.java` (Barren, Faktor, Kategorie, Metall-Regel, Slot, erlaubte Veredelungen,
  optional Bauplan). Pixel-Art in `sprites.js` → `item()`. Wenn ausrüstbar: Wirkung in `Rules.power`/`toolBonus`.
- **Neues Gebäude:** `building(...)` in `Content.java`. Werkstatt (`queue`): Rezepte in `Recipes.java`
  (`BY_BUILDING`, `validate`, `inputs`, `start`) und Bestell-Sheet in `panels-work.js`. Passiv: Wirkung in
  `Rules`/`Sim`, Text in `EFFECT` (`panels-base.js`), Raum in `halls.js` (`WALLS`, `anchors`, `hall`), Breite in `ROOM_W` und
  Reihenfolge in `HALL_ORDER` (`scene.js`), Vorräte für den Tab in `contextResources()`.
- **Neue Eigenschaft:** `trait(...)` in `Content.java`, Wirkung in `Rules.workSpeed`, `Rules.power`,
  `Sim.happinessTarget` oder `Expeditions`.
- **Neues Expeditions-Ereignis:** in `Expeditions.choice()` (Text + Optionen) und `applyChoice()` (Wirkung).
- **Neue Aktion:** `Actions.apply` + eigene Methode mit `check(...)`, Aufruf im Client mit `bus.act({type: ...})`.
- **Neue Schicht:** `LAYERS` in `Content.java` (Erze, Rate, Monster, Kosten), Erkundungs-Expedition in
  `Expeditions.refreshOffers`.

## Design

- Pixel-Look: eckige Rahmen, harte Schatten (`0 4px 0 var(--line)`), kein weicher Glow.
- Schriften: Silkscreen nur für Überschriften und kurze Anzeigen, Poppins für alles Lesbare.
  In der Canvas-Szene die 3×5-Pixelschrift `text()` aus `scene.js`.
- Farben aus den CSS-Variablen in `style.css`.
- Immer in Handybreite (390 px) prüfen: kein horizontales Scrollen, Knöpfe mindestens 40 px hoch.
- Breite Bildschirme nutzen den Platz: ab 900 px Szene und Panel nebeneinander, ab 1240 px dazu die Seitenleiste
  mit Vorräten, Hinweisen und Chronik.
- Kosten immer mit `costChips`/`costBtn` zeigen: jede Zutat mit Symbol, fehlende rot als „habe/brauche“.
- Keine Unicode-Zeichen als Symbole (☠ ♥ ✕): gezeichnete Icons über `ico()` aus `ui.js`.

## Testen

- **Backend:** `mvn test` (Simulation über eine Woche, Markt, Karawane, Schmiede, Legierung, Expedition, Überfall, API).
- **IntelliJ:** Startkonfigurationen in `.run/` („Deep Forge“ startet das Spiel mit H2 und liefert das Frontend
  direkt aus `src/main/resources/static/`, „Deep Forge tests“ führt alle Tests aus).
- **JS-Syntax:** `for f in src/main/resources/static/js/*.js; do node --check "$f"; done`
- **Im Browser:** `mvn -DskipTests package && java -jar target/deep-forge.jar` (H2 in `./data`), dann Playwright gegen
  `http://localhost:8080`: registrieren, alle Tabs öffnen, Screenshots am Handy (iPhone 13) und Desktop ansehen,
  `pageerror` sammeln. `window.__deepforge` gibt Zugriff auf den Client-Zustand.
- Ehrlich sagen, was nicht getestet wurde (z. B. Docker-Build, echte HTTPS-Domain).

## Git

- Ein Branch pro Etappe oder Feature, PR nur auf Wunsch.
- Keine Modellnamen in Commits, PRs oder Code.
