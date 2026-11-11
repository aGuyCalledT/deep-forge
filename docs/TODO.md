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

- [x] **Ergebnis-Meldungen zum Abholen:** Wenn etwas Wartendes fertig ist (Expeditionen, Händler/Karawanen), gibt es
      eine Benachrichtigung und im jeweiligen Menü eine Übersicht, was passiert ist und welche Beute mitkam. Sie bleibt,
      bis man sie anklickt: ein „Einsammeln“-Knopf mit befriedigender Animation und Sound. Umgesetzt als Berichte
      (`Fortress.reports`, höchstens 20, der älteste wird sonst von selbst eingesammelt), Karten oben in Trade und Explore,
      Chip auf der Szene, Beute fliegt in die Vorräte (`collect.js`).

- [x] **Zwerge neu gezeichnet** im Stil der Vorlagen: großer Kopf, Augen mit Glanz, rote Wangen, weiche farbige
      Umrisse, Vorder- und Seitenansicht.
- [x] **Mehr Tiefe im Hintergrund:** runde Felssteine, Schatten des Felsens in Räumen und Gängen, beleuchtete Kanten,
      nach unten dunkleres Gestein, Wurzeln, Parallaxe mit Bergen und Wald, Schatten unter Zwergen.
- [x] Rückansicht der Zwerge beim Klettern, Werkzeuge in der Hand.
- [x] **Größere Welt:** Raster-Zelle 24 × 96 statt 16 × 64, alle Räume, Gänge, Treppen, Schacht und die Oberfläche neu
  in Zwergengröße, Treppen werden die Stufen entlang gegangen, Raster 48 statt 40 Spalten.
- [x] Kleidung selbst herstellen und mit Karawanen handeln: Schneiderei webt Stoff aus Pilzfasern (3 Pilze → 2 Stoff)
  und näht gefärbte Kleidung (1–3 Stoff); Kleidung ist eine eigene Markt-Kategorie (`clothing`).
- [x] NPCs an der Oberfläche (Händlerin am Stand, Reisende) mit `Figure.person`; nachts nur ein Pilger.
- [x] **Maschinen:** jede Werkstatt lässt sich um Maschinen erweitern (bis Stufe + 1, höchstens 5), jede mit eigenem
  Zwerg und eigener Bestellung; der Raum wird breiter.
- [x] **Räume sehen nach Ausbau anders aus:** drei Stufen (ausgehöhlt, eingerichtet, prächtig), je zwei Varianten,
  Spinnweben, Risse, andersfarbige Steine.
- [x] Köpfe im Profil: Schädel, flaches Gesicht, Brauenwulst, Kinn und Nacken statt Kugel; Haare und Hüte folgen der Form.
- [x] Vierte Raum-Stufe ab Gebäudestufe 5: die Königshalle (dunkler Stein, Marmor, Gold, Kristall-Lampen).
- [x] Maschinen einzeln einem Zwerg zuweisen, einzeln abbauen (nur ohne laufenden Auftrag) und wieder aufstellen.
- [x] **Festung als einziger Screen:** keine Werkstatt-Screens mehr, Werkstätten wachsen beim Ausbau (eine Maschine pro
  Stufe, höchstens 5) und ziehen um, wenn kein Platz ist. Blasebalg und Abschreckfass direkt in der Festung anklicken.
- [x] **Kleine Menüs:** Szene im Vollbild, Tabs öffnen eine Schublade, Fenster öffnen sich neben dem angeklickten Raum
  oder Zwerg, Erklärungen hinter Info-Knöpfen (abschaltbar unter More), Hinweise als Chips auf der Szene.
- [x] **Hintertüren:** jeder Raum hat eine Tür zum Treppenhaus dahinter, Türen lassen sich in Gänge setzen (Bau-Werkzeug
  „Door“). Türen verbinden sich mit Türen der Etage darüber/darunter, deren Raum sich überschneidet; Zwerge nehmen
  lieber Türen als Seitenwände.
- [x] Treppe passt zum Gang: gleiche Bretterwand, Deckenbalken entlang der Schräge, Pfosten an beiden Öffnungen, Laterne.
- [x] Alle Räume eine Zelle breiter: rechts ein freier Streifen für die Hintertür (Haken mit Umhang, Laufspur am Boden),
  damit die Tür nie vor Möbeln steht. Alte Spielstände: Räume, die dadurch überlappen, suchen sich einen neuen Platz.
- [x] Am Handy überdeckt das Fenster die untere Hälfte der Szene; der Raum wird darüber gezeigt, aber Zwerge darunter
  sind dann verdeckt. Jetzt: Fenster höchstens 42 % hoch, ein Tipp auf die Szene klappt es auf einen Griff zusammen.
- [x] Die Steine im Fels wiederholen sich alle 32 px sichtbar: jetzt vier Kacheln (schlicht, dunkel, ungleich, gerissen).

- [x] Gänge per Ziehen am Stück graben und zuschütten (eine Aktion, Kosten werden vorher angezeigt).
- [x] Zwerge liegen beim Schlafen jetzt richtig im Bett (Liege-Pose).
- [x] Bauen kostet: Gang 10 Münzen, Treppe 40 + 20 Stein, Tür 15 + 5 Stein, Raum versetzen 30 + 10 Stein.
- [x] **Festung im Berg:** links ein Tal mit Straße, Händlerstand und Tor; die Festung liegt im Berg und reicht über
  den Talboden hinaus nach oben, der Eingangstunnel führt vom Tor zum Schacht.

## Aus früheren Runden

- [ ] **M3 – PvP:** Angriffe auf andere Festungen (Schnappschuss-Kampf, Reisezeit, Schild, Machtbereich), Überfälle
      auf fremde Karawanen.
- [ ] **M4:** Saisons und Prestige, Push-Benachrichtigungen, Besuchsansicht anderer Festungen.
- [x] **Schnellmodus zum Testen:** als Cheat „Skip time“ (1–12 h vorspulen).
- [ ] **Offene Fragen:** Lager-Füllzeit (6 h oder 8 h), Härte der Monster (alle 4 h ein Toter), Abschrecken optional.

## Sounds (Platzhalter, Dateien fehlen noch)

Siehe die fett gedruckten Namen in `docs/AUDIO.md`: `collect`, `build`, `level-up`, `coins`, `goblin-horn`, `monster-roar`,
`death-toll`, `dwarf-cheer`, `defeat`, `door-creak`, `bellows-puff`, `quench-hiss`, `caravan-depart`,
`expedition-depart`, `error`, `furnace-roar`, `grindstone-loop`, `brewing-bubbles`, `mine-ambience`,
`tavern-ambience`, `night-ambience`.
