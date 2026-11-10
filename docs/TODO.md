# Offene Aufgaben

Stand: Grafik, Festungs-Plan, Zwergen-Leben und Bedienung im Spiel sind eingebaut. Offen ist, was nicht abgehakt ist.

## Grafik und Festung

- [x] **Höher aufgelöster Grafikstil.** Mehr Pixel pro Figur und Raum (z. B. doppelte Auflösung der Sprites),
      dabei Pixel-Look und harte Kanten behalten. Eigene PNGs über `sprites/` bleiben möglich.
- [x] **Mehr Abwechslung bei Zwergen:** mehr Bart- und Haarformen, Frisuren, Hüte und Kapuzen, Kleidung, Körperbau,
      Gesichter, Accessoires.
- [x] **Cheat-Modus** (nur für Admins oder eine eigene Einstellung): Zwerge und Ressourcen hinzufügen, Aussehen von
      Zwergen ändern.
- [x] **Mit der Maus im HOLD-Screen bewegen:** Ansicht ziehen bzw. scrollen, evtl. zoomen.
- [x] **Räume selbst platzieren:** Position jedes Raums frei wählen.
- [x] **Gänge und Treppen frei bauen:** Flure und Treppenhäuser setzen, die Räume verbinden.
- [x] **Zwerge stehen auf dem Boden:** Füße auf der Bodenlinie, nicht schwebend.
- [x] **Zwerge bewegen sich frei,** wenn sie nicht arbeiten: laufen durch Gänge und Treppen zu Zielen.
- [x] **Arbeitszyklus von ca. 12 Minuten:** Zwerge arbeiten, gehen dann in der Freizeit in die Taverne oder machen
      anderes, danach zurück an die Arbeit. Umgesetzt als Optik (9 min Arbeit, 3 min Pause, je Zwerg versetzt; nachts schlafen Freie in den
      Quartieren). Offen: soll die Pause die Produktion senken?
- [x] **Tageszeit wie in echt (Deutschland, Essen):** Tag-Nacht-Zyklus nach der echten Uhrzeit in `Europe/Berlin`,
      unabhängig von der Zeitzone des Geräts. Sonnenauf- und -untergang passend zur Jahreszeit.

## Bedienung im Spiel statt über Menüs

- [x] **Auf Spiel-Elemente klicken:** z. B. die Schmiede anklicken, dann öffnet sich direkt ein Popup zum
      Schmelzen/Schmieden, Aufträge, Arbeiter.
- [x] **Hover-Hervorhebung:** grüne Umrandung beim Überfahren mit der Maus.
- [x] **Grüner Pfeil über Werkstätten,** die gerade stillstehen, für die aber Ressourcen da sind.

## Neu aufgefallen

- [ ] **Ergebnis-Meldungen zum Abholen:** Wenn etwas Wartendes fertig ist (Expeditionen, Händler/Karawanen), gibt es
      eine Benachrichtigung und im jeweiligen Menü eine Übersicht, was passiert ist und welche Beute mitkam. Sie bleibt,
      bis man sie anklickt: ein „Einsammeln“-Knopf mit befriedigender Animation und Sound.

- [x] **Zwerge neu gezeichnet** im Stil der Vorlagen: großer Kopf, Augen mit Glanz, rote Wangen, weiche farbige
      Umrisse, Vorder- und Seitenansicht.
- [x] **Mehr Tiefe im Hintergrund:** runde Felssteine, Schatten des Felsens in Räumen und Gängen, beleuchtete Kanten,
      nach unten dunkleres Gestein, Wurzeln, Parallaxe mit Bergen und Wald, Schatten unter Zwergen.
- [x] Rückansicht der Zwerge beim Klettern, Werkzeuge in der Hand.
- [x] **Größere Welt:** Raster-Zelle 24 × 96 statt 16 × 64, alle Räume, Gänge, Treppen, Schacht und die Oberfläche neu
  in Zwergengröße, Treppen werden die Stufen entlang gegangen, Raster 48 statt 40 Spalten.
- [ ] Kleidung selbst herstellen (Schneiderei/Weberei) und mit Karawanen handeln.
- [ ] NPCs an der Oberfläche (Händlerin am Stand, Reisende) mit `Figure.person`.
- [x] **Maschinen:** jede Werkstatt lässt sich um Maschinen erweitern (bis Stufe + 1, höchstens 5), jede mit eigenem
  Zwerg und eigener Bestellung; der Raum wird breiter.
- [x] **Räume sehen nach Ausbau anders aus:** drei Stufen (ausgehöhlt, eingerichtet, prächtig), je zwei Varianten,
  Spinnweben, Risse, andersfarbige Steine.
- [x] Köpfe im Profil: Schädel, flaches Gesicht, Brauenwulst, Kinn und Nacken statt Kugel; Haare und Hüte folgen der Form.
- [ ] Ab Gebäudestufe 4 ändert sich das Aussehen nicht mehr; eine vierte Stufe wäre möglich.
- [ ] Maschinen einzeln einem Zwerg zuweisen (jetzt: Reihenfolge nach Zwergen-ID) und einzeln abbauen.
- [ ] Werkstatt-Bild am Handy: Räume mit 4–5 Maschinen werden kleiner als ×2 gezeigt (krumme Pixel); besser seitlich wischen.
- [ ] Die Steine im Fels wiederholen sich alle 32 px sichtbar; eine zweite, passende Kachel würde helfen.

- [ ] Gänge per Ziehen am Stück graben (jetzt: Klick pro Zelle).
- [x] Zwerge liegen beim Schlafen jetzt richtig im Bett (Liege-Pose).
- [ ] Raum-Bau kostet nichts, Gänge und Treppen auch nicht. Kosten (Stein) einführen?

## Aus früheren Runden

- [ ] **M3 – PvP:** Angriffe auf andere Festungen (Schnappschuss-Kampf, Reisezeit, Schild, Machtbereich), Überfälle
      auf fremde Karawanen.
- [ ] **M4:** Saisons und Prestige, Push-Benachrichtigungen, Besuchsansicht anderer Festungen.
- [x] **Schnellmodus zum Testen:** als Cheat „Skip time“ (1–12 h vorspulen).
- [ ] **Offene Fragen:** Lager-Füllzeit (6 h oder 8 h), Härte der Monster (alle 4 h ein Toter), Abschrecken optional.

## Sounds (Platzhalter, Dateien fehlen noch)

Siehe die fett gedruckten Namen in `docs/AUDIO.md`: `build`, `level-up`, `coins`, `goblin-horn`, `monster-roar`,
`death-toll`, `dwarf-cheer`, `defeat`, `door-creak`, `bellows-puff`, `quench-hiss`, `caravan-depart`,
`expedition-depart`, `error`, `furnace-roar`, `grindstone-loop`, `brewing-bubbles`, `mine-ambience`,
`tavern-ambience`, `night-ambience`.
