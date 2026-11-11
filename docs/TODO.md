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
- [x] Bauen kostet: Gang 10 Münzen, Treppenhaus 40 + 20 Stein, Raum versetzen 30 + 10 Stein.
- [x] **Festung im Berg:** links ein Tal mit Straße, Händlerstand und Tor; die Festung liegt im Berg und reicht über
  den Talboden hinaus nach oben, der Eingangstunnel führt vom Tor zum Schacht.
- [x] **Treppenhäuser statt Treppen und Hintertüren:** Jeder Raum muss links oder rechts an einen Gang, ein
  Treppenhaus oder den Schacht grenzen. Ein Treppenhaus ist ein Gang, zwei Zellen breit, mit einem Bogen in der
  Rückwand; wer hineingeht, kommt aus einem Treppenhaus auf einer anderen Etage wieder heraus, je weiter weg, desto
  später. Alte Treppen werden zu Treppenhäusern auf beiden Etagen, Türen fallen weg, Räume ohne Gang bekommen einen.
- [x] **Graben, Höhlen und Bewuchs:** Fels wird mit dem Dig-Werkzeug markiert, Bergarbeiter graben ihn mit der
  Spitzhacke aus (5 min je Zelle, tiefer länger, Cheat „Dig now“). Räume, Gänge und Treppenhäuser nur auf
  ausgegrabenem Boden und alle frei versetzbar; ein Raum ohne Gang daneben steht still (gelbes Warndreieck). Der Berg
  ist grauer Naturstein, alle zwei Etagen eine andere Gesteinsart. Leere Höhlen überwuchern mit Moos, Pilzen und
  Wurzeln, nach 12 h ziehen Kriechtiere ein.
- [ ] Graben geht nur von einem offenen Ende aus, eine Zelle nach der anderen. Mehrere Bergarbeiter helfen erst, wenn
  mehrere Enden offen sind. Vielleicht später: zwei Zwerge an einer Zelle.
- [ ] Kriechtiere haben noch keine eigenen kleinen Sprites (es sind die Minen-Monster) und keine eigenen Sounds.
- [ ] Der freie Streifen rechts in jedem Raum (früher für die Hintertür) könnte wegfallen; dann würden alle Räume
  eine Zelle schmaler.
- [x] Die Leitern im Schacht sind weg: der Schacht ist auf jeder Etage ein Treppenhaus (Bogen, Gleise, gekreuzte
  Spitzhacken). Bergleute gehen auf ihrer Etage in den Bogen und kommen auf der Ziel-Etage wieder heraus.

## Zwergische Oberfläche

- [x] Eisenplatten als Hintergrund, geschmiedete Fenster mit Ecken, Wappen, Edelstein und Runen; Material und Stein je
  nach Inhalt (Werkstatt, Handel, Krieg, Zwerge, Erkunden). Knöpfe als geschmiedete Platten, die sich eindrücken.
- [x] Fenster und Schublade fahren mechanisch aus dem Bildschirmrand ein und wieder hinaus.
- [x] Expeditionen, Gerüchte und Berichte auf Papier mit Rissen, Flecken und Falten, Handschrift und Abhakliste.
- [x] Sanduhren statt Balken für Werkstatt-Aufträge und Expeditionen.
- [x] Keine Namensschilder mehr über den Räumen; beim Hovern fällt ein Metallschild an Ketten aus der Decke.
- [ ] Quests gibt es noch nicht als eigenes System; das Papier (`paper.js`) ist dafür vorbereitet.
- [ ] Felsgrafik aus den Referenzbildern des Nutzers für den Berg übernehmen (Bilder fehlen noch in `art-src/ref/`).
- [ ] Hover-Schild nur mit Maus; auf dem Handy öffnet ein Tipp gleich das Fenster.

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

## Markt, Handelsdepot und Eingangshalle

- [x] **Eingangshalle** im Tor-Tunnel: Wachen stationieren (`2 + 2 × Stufe`), sie verteidigen gegen Überfälle und gehen
      von selbst auf Kriechtiere los; daheim kämpfen sie besser und lernen langsam (Üben mit Holzstöcken).
- [x] **Tor statt Mauern,** in vier Stufen ausbaubar (Holztor bis Runentor mit Feuerschalen).
- [x] **Handelsdepot als Raum:** gespeicherte Karawanen, Regeln („If Battle Axes reach 100, send … to …“),
      Kauf-Aufträge mit Höchstpreis und Rücklage, Lieferungen bezahlt bei Ankunft.
- [x] **Marktübersicht** mit Kurs, Wochenlinie und Tagesänderung; Klick zeigt alle Städte mit Preisen und Verlauf.
- [x] **Schwankende Preise** um einen Grundwert (10 %–1000 %), Handel bewegt Stadt und Welt nach Marktanteil.
- [x] **Geld:** Gold Marks, Silver Talents, Copper Jots mit eigenen Münz-Symbolen; alte Spielstände umgerechnet.
- [ ] Hinweis-Chip, wenn eine Regel pausiert oder ein Kauf-Auftrag mangels Geld nicht ausgeführt wird.
- [ ] Sounds für Depot-Regel ausgelöst und Lieferung angekommen (`docs/AUDIO.md`).
- [ ] Balancing der Marktmacht nach einigen Tagen echtem Spiel prüfen.

## Status und Tal

- [x] **Status über Räumen:** rotes Achteck mit ! (steht still: abgeschnitten, Aufträge ohne Material oder Arbeiter,
      Lager voll), gelbes Dreieck (braucht dich: Beute abholen, Entscheidung, Kriechtier ohne Wache), graue Punkte
      (nichts zu tun), grüner Pfeil bleibt (könnte laufen). Dieselben Symbole in den Hinweis-Chips.
- [x] **Graue Punkte über untätigen Zwergen.**
- [x] **Beruf im Zwergenfenster** als Schild mit Symbol, der Beruf-Skill golden hervorgehoben.
- [x] **Tal aufgeräumt:** Zelt, Winde und Palisade weg; Abenteurergilde ist ein Raum im Berg; Marktstand größer mit
      flatterndem Vordach; zwei große Bäume, die sich im Wind wiegen.
- [ ] Login-Bild auf die neuen Bäume und den neuen Stand umstellen.
- [ ] Gelbes Dreieck auch für weitere Fälle (z. B. Regel wartet sehr lange, Lieferung kann nicht bezahlt werden).

## Zwerge aus PNG-Teilen

- [x] **Neue Zwerge aus Pixelwright:** PNG-Teile in `static/art/dwarf/`, gleiche Körpergröße für alle, Form Mann/Frau,
      6 Frisuren, 5 Bärte, Helm/Mütze/Kapuze, alle Posen (stehen, reden, sitzen, essen, trinken, gehen, arbeiten,
      klettern, schlafen), Umfärben von Haut, Haar, Augen, Kleidung, Metall.
- [ ] Wieder einbauen, was der alte Figuren-Baukasten konnte: Schürze, Brille, Ohrringe, Rüstung als eigenes Teil
      (jetzt nur Tunika in Metallfarbe), Kleidungs-Muster (Strick, Weste, Flicken), Nasen-, Brauen- und Mundformen.
- [ ] Mehr Frisuren und Bärte zeichnen, damit die 10 alten Frisuren und 8 Bärte wieder eigene Bilder haben.
- [ ] Werkzeuge als gezeichnete Teile statt Linien aus dem Code.
- [x] Übrige Grafik im neuen Stil: statt Pixelwright als Code in `art-src/props48/` (siehe „Grafik 48 px“).

## Zwerge 48 × 64

- [x] **Alle Zwerg-Teile im Stil des Basismodells** (`static/art/dwarf48/`, Quelle `art-src/dwarf48/`): Mann und Frau,
      drei Ansichten, gehen, stehen, reden, sitzen, essen, trinken, Hände, arbeiten (Seite), schlafen, 6 Stimmungen,
      6 Frisuren, 5 Bärte, Helm/Mütze/Kapuze, Krug, Löffel, Axt, Sack, umfärbbar. Reisende im Tal als Zwerge.
- [x] Eingebaut: die Festung zeichnet alle Zwerge, Wachen und Reisenden mit `dwarf48.js` (`look48()` in `hold.js`
      übersetzt Frisur, Bart, Haut-, Haar- und Kleiderfarben in Farbreihen).
- [ ] Porträts in den Panels und das Cheat-Fenster „Change looks“ noch mit dem alten Kit (`dwarfkit.js`).
- [ ] Werkzeug in der Hand bei der Arbeit (Hammer, Spitzhacke, Axt) in der Seitenansicht; heute arbeiten sie mit leeren Händen.
- [ ] Gesichter in der Seitenansicht deutlicher (Stimmungen kaum zu sehen).

## Grafik 48 px (Räume aus Teilen)

- [x] Blöcke 0–8 gezeichnet (`art-src/props48/`): Möbel, Raumhüllen und Wege, Wohnen, Werkstätten, Lager/Handel/Wache,
      Tal (Tag, Abend, Nacht), Fels je Minenschicht und Höhlen, 9 Monster, Kleintiere, Deko und Effekte.
- [x] Export: `python3 art-src/props48/export.py` schreibt `static/art/props48/sheet.png`, `glow.png`, `sheet.json`
      (prüft die Pixel danach); Lader `static/js/art48.js` (Bilder, Anker, Umfärben, Spiegeln, Kacheln).
- [x] Raumvorlagen-Editor (`tools/room-editor/serve.py`), Format und Zeichnen in `static/js/rooms48.js`, Vorlage
      „starter“ für alle 15 Raumtypen und 8 Erweiterungen, `Building.look` + Aktion `roomLook` (Server prüft).
- [x] Renderer: `hold.js` zeichnet Räume aus der Vorlage (`look`), Sitze, Betten, Arbeitsplätze, Lichter, Rauch und
      Klickflächen (Blasebalg, Abschreckfass) aus den Punkten; Auswahl der Vorlage im Raumfenster (`popups.js`).
- [x] Zweite Vorlage „furnished“ für alle 15 Räume und 8 Erweiterungen (Standard, weil alphabetisch zuerst).
- [x] Schacht im 48-px-Maßstab ohne Leitern: auf jeder Etage ein Treppenhaus aus der Vorlage (Tür in der Rückwand, wie
      die gebauten Treppenhäuser).
- [x] Fels ohne helle Linien an den Kachelkanten und ohne Helligkeitsverlauf je Etage (Voronoi oben/unten nahtlos,
      Steinfarben gut gemischt).
- [x] Tiefe: Schatten an allen vier Innenkanten jedes Raums; Säule mit Tür im Vordergrund zwischen Räumen, die Tür
      öffnet sich, wenn ein Zwerg hindurchgeht.
- [ ] Mehr Vorlagen je Raum (z. B. nach Stufe), Stufe 2/3 mit mehr Möbeln.
- [x] Raum-Editor im Spiel (Raumfenster → „Change look“): Liste aller Vorlagen mit Bild, Spieler-Vorlagen auf dem
      Server (`room_templates`), für alle sichtbar, nur vom Ersteller änderbar.
- [ ] Spieler-Vorlagen: Sortieren nach Beliebtheit.
- [x] Punkte mit Blickrichtung (vorne, links, rechts, Rücken) und sitzen; neue Zwerg-Posen sitzend/arbeitend in jeder Ansicht.
- [ ] Schlafende in Betten: liegender Zwerg ist höher als die Matratze, im oberen Stockbett stößt er an; Decke passend zum Bett.
- [x] Maßstab umgestellt (`hold.js`: `CELL 48`, `RH 144`, Boden 135), Tal, Fels, Gänge, Schacht, Treppenhäuser, Tor,
      Monster aus `props48`; Zoomstufen 0,5 (nur bei 2 Gerätepixeln) bis 4, Start bei 1.
- [ ] Feuer, Räder und Kessel laufen in der Vorlage immer; besser nur, wenn die Maschine arbeitet (Bild 0 = kalt).
- [x] Wege aus Vorlagen: Eingangshalle, Gänge und Treppenhäuser je in drei Stilen (`timber`, `stone`, `grand`), neue
      Teile in `art-src/props48/ways.py` (Treppenhaus-Türen mit 4 Bildern, Stützrahmen, Bögen, Statue, Runenschild,
      gehauene Wand). Der Stil folgt der Eingangshalle (Stufe 1 Holz, 2 Stein, ab 3 prächtig, oder die gewählte Vorlage).
      Treppenhaus-Türen gehen auf, wenn jemand hinein- oder herauskommt.
- [ ] Tor-Stufen haben noch kein eigenes Bild (nur Kohlebecken ab Stufe 3).
- [ ] Stil der Gänge und Treppenhäuser einzeln wählbar machen (heute folgt er der Eingangshalle).
- [ ] Login-Bild (`views.js`) und Minen-Screen noch im alten 24-px-Stil; alte Raumgrafik (`rooms.px.js`, `shared.js`) danach entfernen.
- [ ] Lichtschicht im Browser (Lichtkarte multipliziert, `glow.png` bleibt hell), ersetzt den Licht-Durchgang der Vorschauen.
- [ ] Später: Möbel verschiebbar, Katalog in `Content.java`, Platzierungen in `State.java`.
- [ ] Kleinigkeiten: Fächer-Muster im Fels glätten, größere Scheren der Magmakrabbe, zweiter Arm des Ogers,
      Lichtringe in Stufen statt Kreisen.
- [x] **Symmetrische Symbole:** Stoppschild (geprägtes Achteck), gelbes Dreieck, grüner Pfeil und X als gespiegelte
  Hälften neu gezeichnet.
- [x] **Grünes Abzeichen** (Smaragd mit !) statt rotem Punkt auf den Tabs.
- [x] **Neues Fenster-X** als Pixel-Platte, die sich eindrückt (Fenster und Schublade).
- [x] **Knopfplatten** in Eisen, Gold, Grün, Rot als dehnbares `border-image` für alle `.btn` und `.tool`.
- [x] Klick ins Tal öffnet nicht mehr die Mine; Logzeilen der Art `info` wurden vom Info-Knopf-Stil zerdrückt.
- [ ] Übrige Symbole noch nicht ganz symmetrisch: Totenkopf, Herz, Info, Schloss, Pfeile hoch/runter.
