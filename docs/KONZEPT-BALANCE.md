# Konzept: Balance und Fortschritt

Stand: Entwurf, noch nichts davon ist umgesetzt. Alle Zahlen sind **Startwerte**; endgültig werden sie erst, wenn der
Balance-Bot (Abschnitt 12) die Kurve bestätigt. Was heute gilt, steht in `BALANCING.md`.

## 1. Ziele

1. **Kurze Besuche.** Das Spiel passt zu 1 bis 6 Besuchen am Tag von je 2–5 Minuten.
2. **Jeder Besuch lohnt sich.** Beim Öffnen wartet immer etwas zum Einsammeln oder Entscheiden.
3. **Es läuft von selbst.** Was der Spieler einrichtet, schafft im Hintergrund Wert.
4. **Liegenlassen lohnt sich nicht.** Ein Monat ohne Besuch bringt etwa so viel wie zwei Tage.
5. **Lineares Wachstum.** Das Tageseinkommen steigt mit jedem gespielten Tag um etwa denselben Betrag.
6. **Vier Hebel:** teurere Metalle, komplexere Waren, die richtige Stadt, geübte Zwerge. Jeder Hebel wirkt für sich.
7. **Alles hat seinen Platz.** Jedes Metall, jede Ware und jede Werkstatt lohnt sich zu irgendeinem Zeitpunkt, und
   Altes wird nie ganz wertlos.
8. **Leicht zu lernen, schwer zu meistern.** Der Kern bleibt: schürfen, schmelzen, schmieden, verkaufen.

## 2. Was heute nicht passt

- **Der Start ist zu schnell, das Ende zu flach.** Ein Bergarbeiter bringt heute in der ersten Schicht Erz für gut
  6 Marks je Stunde; die zweite Schicht kostet 80 Marks. Die teuersten Barren sind nur 12-mal so viel wert wie
  Kupfer. Nach etwa zwei Wochen gibt es kaum noch Ziele.
- **Kosten wachsen exponentiell** (×1,55 bis ×1,75 je Stufe), das Einkommen nicht. Das fühlt sich erst zu leicht und
  dann wie eine Wand an.
- **Liegenlassen wird kaum gebremst.** Sieben Tage laufen voll weiter; Depot-Regeln verkaufen ohne Ende.
- **Eine Ware reicht.** Wer das Wertvollste gefunden hat, braucht den Rest nicht mehr.
- **Spitzhacken** machen nur schneller. Kein Erz verlangt ein bestimmtes Metall.
- **Bauen dauert nichts**, Schmelzen und Schmieden dauern Sekunden. Es gibt nichts, das man „über Nacht“ anstößt.

## 3. Die Leitkurve

Maßstab ist ein Spieler mit drei Besuchen am Tag.

| Zeitalter | Tage | Zwerge | Einkommen pro Tag | Engpass, den man lösen muss |
|---|---|---|---|---|
| Kupfer und Bronze | 1–4 | 7–10 | 100–400 Marks | Kohle, Lagerplatz |
| Eisen | 5–12 | 10–15 | 500–1 200 | Bronze-Spitzhacken, zweite Werkstätten |
| Silber und Stahl | 13–30 | 15–22 | 1 300–3 000 | Stahl-Bauplan, Ruf in drei Städten |
| Gold | 31–60 | 22–30 | 3 000–6 000 | harte Spitzhacken, Verbundwaren |
| Abgrund | 61–120 | 30–40 | 6 000–12 000 | Meister, Nickelstahl, Aufträge |
| Sternstahl und Meisterwerke | ab 120 | 40–50 | +100 je Tag, ohne Ende | Breite über alle Städte |

Das sind etwa **+100 Marks Tageseinkommen je gespieltem Tag**.

### Die Preisformel

Wer alles wieder investiert, wächst nur dann linear, wenn sich eine Investition umso später auszahlt, je mehr man
schon verdient. Daraus folgt eine Regel für jeden Preis im Spiel:

> **Preis = Mehrertrag pro Tag × Amortisationstage**, und Amortisationstage = Einkommen des Zeitalters ÷ 100
> (mindestens ein halber Tag).

Ein Ausbau, der im Eisen-Zeitalter (1 000 Marks/Tag) 50 Marks mehr am Tag bringt, kostet also etwa 500 Marks.
Derselbe Mehrertrag im Gold-Zeitalter kostet 2 000. In Summe hat ein Spieler mit Einkommen E etwa E² ÷ 200 Marks
investiert. Für die Stufen heißt das: Kosten wachsen **mit dem Quadrat der Stufe**, nicht exponentiell
(`Grundpreis × Stufe²` statt `Grundpreis × 1,6^Stufe`).

### Warum das Einkommen von selbst linear bleibt

Preise allein reichen nicht, darum hat die Kurve zwei weitere Stützen:

- **Der Markt nimmt nur begrenzt viel ab** (Abschnitt 9). Jede Stadt kauft je Warengruppe nur eine bestimmte Menge
  am Tag zu gutem Preis. Diese Menge wächst mit dem Ruf, und der Ruf wächst mit dem, was man liefert: also linear.
- **Zwerge kommen einzeln** und brauchen Betten, Pilze, Bier, später Kleidung und Krüge. Mehr Zwerge heißt mehr
  Versorgung, nicht einfach mehr Geld.

## 4. Der Tag eines Spielers

### Der Tagesplan (neu) bremst das Liegenlassen

Die Zwerge arbeiten nach einem **Tagesplan**, den der Spieler bei jedem Besuch von selbst erneuert.

| Zeit seit dem letzten Besuch | Arbeitstempo der ganzen Festung |
|---|---|
| bis 24 h | 100 % |
| 24 h bis 72 h | fällt gleichmäßig auf 20 % |
| 72 h bis 7 Tage | 20 % |
| danach | die Festung ruht: keine Arbeit, kein Verbrauch, keine Überfälle |

- Ein Monat ohne Besuch bringt damit die Arbeit von etwa drei Tagen, und das Lager ist vorher voll.
- **Niemand verliert etwas.** In der Ruhe verhungert kein Zwerg, kein Überfall plündert.
- Ein **Vorarbeiter** (neue Rolle für einen Zwerg, ab Festungsstufe 5) verlängert die vollen 24 h auf 36 h, ein
  Meister-Vorarbeiter auf 48 h. Mehr geht nicht. Das Wochenende ist damit ein spätes, verdientes Ziel.

### Was Besuche bringen

Wer einmal am Tag kommt, bekommt die ganze Grundproduktion. Öfter kommen bringt **Zugaben**, die sich ansammeln und
nicht verfallen:

| Zugabe | Lädt sich auf | Sammelt bis | Nutzen |
|---|---|---|---|
| Schichtbericht mit Fundstück | 1 je 4 h | 3 | Zettel „While you were away“ mit einem Fund: Rohedelstein, alte Münzen, Gerücht, Bauplan-Stück |
| Erzader (Minispiel) | 1 je 4 h und Schicht | 3 | Erz direkt in den Wagen |
| Stücke am Amboss | laufend | 10, warten 8 h | bessere Qualität durch eigenes Schmieden |
| Dünger, Blasebalg, Fässer usw. | sofort | wirkt 2 h | Tempo oder Ertrag |
| Karawanen und Expeditionen | 2–12 h | – | Beute, Entscheidungen |
| Aufträge und Nachrichten der Städte | täglich | 3 offene | Prämien, Ruf |
| Bau fertig | je nach Bau | – | nächsten Bau anstoßen |

Zielwerte für das Einkommen gegenüber einem Besuch am Tag: drei Besuche etwa **+25 %**, sechs Besuche etwa
**+40 %**, alles ausgereizt höchstens **+60 %**. Mehr darf Fleiß nicht bringen, sonst wird das Spiel zur Pflicht.

Der Amboss wartet künftig 8 h statt 2 h, die Ader kommt alle 4 h statt alle 20 Minuten und ist dafür dreimal so
groß. So verpasst auch der Ein-Besuch-Spieler nichts Wesentliches.

## 5. Automatisieren

Automatik ist selbst Fortschritt: jede Stufe wird freigespielt.

| Automatik | Wo | Ab wann |
|---|---|---|
| Bestellung „dauernd“ | Werkstatt | von Anfang an (gibt es) |
| **Bestand halten** (neu): „immer 6 Stahl-Spitzhacken im Lager“ | Werkstatt | Werkstatt Stufe 2 |
| **Werkzeug von selbst tauschen** (neu): Zwerge nehmen das beste passende Stück | Lager | Lager Stufe 3 |
| Karawanen-Regeln und Kauf-Aufträge | Handelsdepot | gibt es, je Stufe eine mehr |
| **Münze** (neu): prägt Edelmetall zu Geld | neue Werkstatt | Silber-Zeitalter |
| Vorarbeiter | Rolle | Festungsstufe 5 |

„Bestand halten“ ist das wichtigste neue Werkzeug: damit greifen Ketten über mehrere Werkstätten ineinander, ohne
dass das Lager mit einer Sorte vollläuft.

## 6. Zeiten und Mengen

Drei Zeitklassen, damit es bei jedem Besuch etwas Fertiges und etwas Laufendes gibt.

| Klasse | Dauer | Was |
|---|---|---|
| Massenarbeit | Minuten | Schürfen, Schmelzen, Legieren, Brauen |
| Handwerk | 10–40 Minuten | Schmieden, Schleifen, Gravieren, Fassen, Nähen |
| Großes | 1–24 Stunden | Verbundwaren, Meisterwerke, Bauen, Karawanen, Expeditionen |

| Vorgang | Heute | Neu (Startwert) |
|---|---|---|
| Schürfen, erste Schicht | 12 Erz/h | 6 Erz/h, tiefere Schichten 5 / 4,5 / 4 / 3,5 |
| Schmelzen | 2 Erz + 1 Kohle → 2 Barren in 3 min | 2 Erz + 1 Kohle → 1 Barren in 6 min |
| Schmieden | 100 s je Barren | 10 min je Barren |
| Schleifen / Gravieren / Edelstein fassen | 1,5–2,5 min | 8 / 20 / 20 min |
| Edelstein schleifen | 3 min | 30 min |
| Verbundware zusammensetzen | – | 30–120 min |
| Meisterwerk | – | 4–8 h |
| Pilzfarm | 5 Pilze/h (versorgt 25 Zwerge) | 1,6 Pilze/h: ein Bauer versorgt 8 Zwerge |
| Brauerei | 5 Bier/h | 2 Bier/h: ein Brauer versorgt 10 Zwerge |
| Raum ausbauen | sofort | `10 min × Stufe^1,6`: Stufe 5 gut 2 h, Stufe 10 knapp 7 h, höchstens 24 h |
| Neuer Raum | sofort | 15 min |
| Schicht öffnen | sofort | Stollen treiben: 2 / 6 / 12 / 24 h |

**Bauen:** Es gibt einen Bautrupp, also läuft ein Bau zur Zeit. Ein zweiter Trupp ist eine späte Tradition. Der
Raum arbeitet während des Ausbaus weiter. Lange Bauten stößt man vor dem Schlafen an.

Etwa ein Fünftel der Zwerge versorgt damit die anderen. Das ist gewollt: Versorgung ist Teil des Balance-Akts.

## 7. Material: jedes Metall hat eine Rolle

### Sechs Wertstufen

Die Spanne wächst von heute 1:12 auf etwa 1:60.

| Stufe | Metalle | Wert je Barren (Marks) |
|---|---|---|
| 1 | Kupfer, Zinn, Zink, Blei | 0,4–0,6 |
| 2 | Eisen, Wismut, Nickel, Bronze, Messing, die drei Zinnlegierungen | 0,8–1,5 |
| 3 | Silber, Stahl, Wismutbronze, Billon, Neusilber, Sterlingsilber | 2–4 |
| 4 | Gold, Elektrum, Rotgold, Schwarzbronze | 6–10 |
| 5 | Platin, Aluminium, **Nickelstahl** (neu) | 14–22 |
| 6 | **Sternstahl** (neu) | 30 |

### Rollen

Kein Metall ist nur „dasselbe, aber teurer“.

| Metall | Wofür es gut ist |
|---|---|
| Kupfer | Grundstoff fast aller Legierungen, Baumaterial, erste Spitzhacke. Bleibt bis zum Ende gefragt |
| Zinn | Bronze und Zinngeschirr |
| Zink | Messing |
| Blei | fällt beim Bleiglanz mit ab: billiges Geschirr, Tresor-Ausbau |
| Wismut | Wismutbronze: die günstige harte Spitzhacke ohne Stahl-Bauplan |
| Eisen | Werkzeug, Ketten, Baumaterial, Stahl |
| Nickel | Neusilber und Nickelstahl |
| Bronze | erste harte Werkzeuge und Waffen, Beschläge für Verbundwaren |
| Messing | **Zahnräder**: Bauteil für Lift, Tor, Tresor, Schlösser, Spieluhren |
| Zinnlegierungen | Krüge und Becher: Fine pewter für die Taverne (Stimmung), Lay pewter als billige Massenware, Trifle als Mitte |
| Neusilber | „Silber des kleinen Mannes“: Besteck und Geschirr, zählt in Städten halb als Schmuck |
| Roheisen | Zwischenstufe zum Stahl, dazu Gusswaren (Anker, Kessel) für den Hafen |
| Stahl | bestes gewöhnliches Werkzeug, hält am längsten |
| Silber, Sterling | Schmuck und Kelche; Sterling lässt sich besser gravieren |
| Billon, Elektrum | **Münzmetall**: die Münze prägt daraus Geld |
| Gold, Rotgold | Schmuck, Einlagen, Goldfaden; Rotgold ist Mode: seltene, starke Nachfrage-Spitzen |
| Schwarzbronze | einziges Metall, das hart **und** edel ist: Prunkwaffen, die als Waffe und als Schmuck gelten |
| Platin | Fassungen: Edelsteine in Platin zählen mehr; Teil von Sternstahl |
| Aluminium | leichte Ausrüstung: Karawanen und Expeditionen sind schneller; Teil von Sternstahl |
| Nickelstahl (Stahl + Nickel) | Härte 7: Spitzhacken für den Abgrund |
| Sternstahl (Stahl + Platin + Aluminium) | Härte 8: beste Werkzeuge und Waffen, Stoff der Meisterwerke |

### Spitzhacken und Gesteinshärte

Jedes Erz hat eine Härte. Eine Spitzhacke baut nur ab, was höchstens so hart ist wie ihr Metall.

| Härte | Was | Mindestens nötig |
|---|---|---|
| 1 | Kohle, Stein, Kalk, gediegenes Kupfer, Zinnstein | bloße Hände und Steinhacke |
| 2 | Malachit, Zinkblende, Bleiglanz | Kupfer |
| 3 | Eisenerze, Fahlerz, Silbererze | Messing, Neusilber, Nickel |
| 4 | Magnetit, Nickelerz, Wismuterz, gediegenes Gold | Bronze, Eisen |
| 5 | Rohedelsteine | Wismutbronze |
| 6 | Platin, Edelsteine im Abgrund | Stahl |
| 7 | Aluminium | Nickelstahl |
| 8 | (späteres Erz) | Sternstahl |

- **Tempo:** `1 + 0,12 × (Härte der Hacke − Härte des Erzes)`, höchstens +60 %, mal Kraft der Qualität
  (Crude ×0,8 bis Masterwork ×2), geschärft +15 %.
- Ist die Hacke zu weich, bringt der Zwerg aus der Schicht nur, was er abbauen kann. Im Minen-Tab steht dann
  „Too hard for a copper pick. Forge bronze picks.“
- Schon in der ersten Stunde lernt man die Regel: Malachit braucht die erste Kupferhacke.
- **Abnutzung:** Werkzeug und Waffen nutzen sich ab. Eine Kupferhacke hält etwa 2 Tage Arbeit, Bronze 5, Eisen 6,
  Stahl 12, Nickelstahl 20, Sternstahl 40; bessere Qualität hält länger. Mit „Bestand halten“ und „von selbst
  tauschen“ läuft das ohne Handarbeit. So bleibt die Schmiede immer auch für die eigene Festung beschäftigt.

## 8. Waren: Tiefe lohnt sich

### Die Wertleiter

Jeder weitere Arbeitsschritt hebt den Ertrag je Zwergstunde um etwa 30 %, braucht aber eine weitere Werkstatt, ein
weiteres Material und Abstimmung.

| Schritt | Ertrag je Zwergstunde (Kupfer-Zeitalter) |
|---|---|
| Erz verkaufen | 0,5 Marks |
| Barren | 0,8 |
| einfache Ware (Kette, Spitzhacke) | 1,1 |
| veredelt (geschärft, graviert, gefasst) | 1,4 |
| Verbundware | 1,8 |
| Meisterwerk | 2,3 |

Dazu kommen die anderen Hebel: Wertstufe des Metalls ×1 bis ×12, Qualität ×0,7 bis ×2, passende Stadt +10 bis
+60 %. Die Hebel multiplizieren sich, aber jeder kostet etwas anderes: Tiefe kostet Zwerge, Metall kostet
Spitzhacken und Schichten, Qualität kostet Übung und eigene Zeit, die Stadt kostet Weg und Ruf.

### Waren aus mehreren Materialien (neu)

**Einlage** als vierte Veredelung (neben geschärft, graviert, gefasst): Der Graveur legt einen Barren Edelmetall in
ein beliebiges Stück ein („steel axe with gold inlay“). Wert plus das Doppelte des Einlage-Metalls, und das Stück
zählt zusätzlich als Schmuck.

**Verbundwaren** entstehen an der neuen **Feinmechaniker-Werkbank** aus fertigen Teilen:

| Ware | Aus | Gruppe | Wofür |
|---|---|---|---|
| Zahnräder | 2 Messing | Bauteil | Ausbau von Lift, Tor, Tresor; Teil anderer Waren |
| Grubenlampe | Messing + Kupfer | Werkzeug | zweiter Platz am Bergarbeiter: +10 % ab der dritten Schicht; Hafen |
| Schloss | Stahl + Zahnräder | Eisenwaren | Tresor-Ausbau; Stonebridge, Hafen |
| Schild | 2 Eisen oder Stahl + Bronze-Rand | Rüstung | neuer Ausrüstungsplatz |
| Krug-Satz | 2 Zinnlegierung + Messing | Geschirr | Taverne: Stimmung; Stonebridge |
| Kelch | 2 Silber + Gold + geschliffener Stein | Geschirr | Kloster Highcrag |
| Prunkaxt | Schwarzbronze oder Stahl + Gold-Einlage + Stein | Waffe und Schmuck | Ironmarch, Emberton, Amberfall |
| Goldfaden-Tunika | 3 Stoff + Gold | Kleidung | verbindet Schneiderei und Schmelze; Amberfall |
| Seekompass | Messing + Neusilber + Zahnräder | Werkzeug | Hafen |
| Spieluhr | Zahnräder + Silber + Gravur | Schmuck | Amberfall |
| Krone mit Ornat (Meisterwerk) | 3 Gold + Platin + 3 Steine | Schmuck | 6 h Arbeit, Artefakt-Chance |

Baupläne dafür kommen aus Expeditionen und aus dem Ruf bei Städten. Damit haben beide ein dauerhaftes Ziel.

## 9. Handel: die richtige Stadt, und Breite schlägt Monokultur

- **Aufnahme je Stadt und Warengruppe.** Jede Stadt nimmt je Gruppe am Tag nur eine bestimmte Menge zu gutem
  Preis; darüber fällt der Preis steil. Der Mechanismus existiert schon (Liquidität und Marktmacht) und wird so
  eingestellt, dass eine einzige Ware höchstens ein Viertel des Zieleinkommens tragen kann.
- **Sechs Städte × neun Gruppen = 54 Fächer.** Wer viel verdienen will, muss viele Fächer bedienen. Genau dadurch
  bleiben Kupferketten, Zinnkrüge und Eisenwerkzeug neben Goldkronen sinnvoll.
- **Ruf** (neu) je Stadt, Rang 0–10: steigt mit geliefertem Wert und erfüllten Aufträgen. Je Rang +25 % Aufnahme
  und +2 % Preis; bestimmte Ränge geben Baupläne. Ruf kostet nach der Preisformel immer mehr Lieferungen.
- **Aufträge** (neu): jede bekannte Stadt hängt täglich einen Auftrag aus („20 steel chains within 24 h“), Prämie
  +50 % und Ruf. Bis zu drei bleiben offen. Aufträge wandern durch **alle** Waren und Metalle und wachsen mit der
  Festung, sodass auch im Gold-Zeitalter ein Großauftrag Kupfergeschirr lohnt.
- **Nachfrage mit Vorschau:** Die Nachfrage wechselt nur noch alle 12 h statt alle 4 h, und die Nachricht kommt
  12 h vorher. So kann auch der Ein-Besuch-Spieler darauf hinarbeiten.
- **Münze** als sicherer Boden: prägt Billon, Elektrum und Gold zum festen Grundwert, ohne Markt und ohne Weg, aber
  langsam. Sie trägt nie mehr als etwa 15 % des Einkommens.

## 10. Zwerge: üben, aufsteigen, mehr wollen

| Rang | Fertigkeit | Wahl beim Aufstieg | Will zusätzlich |
|---|---|---|---|
| Lehrling | 0–7 | – | Pilze, Bier, Bett |
| Geselle | 8–14 | eine Spezialisierung, zum Beispiel Waffenschmied (+1 Qualität bei Waffen) oder Schnellschmied (+20 % Tempo) | Kleidung, Platz in der Taverne mit Krügen |
| Meister | 15–20 | eine zweite Spezialisierung | Werkzeug ab Fine, einen Ring oder ein Schmuckstück |

- **Lehre:** Arbeitet ein Meister oder Geselle im selben Raum, lernen die anderen dort 50 % schneller.
- **Lehrwerkstatt:** Jede Werkstatt lässt sich auf „Üben“ stellen: halber Ertrag, dreifaches Lernen. Das ist die
  bewusste Entscheidung „heute verdienen oder morgen besser sein“.
- **Bis zum Meister** dauert es etwa 60 Arbeitstage, mit Lehre und Üben etwa 25.
- Unerfüllte Wünsche drücken die Stimmung und damit das Tempo (gibt es schon: 0,6 bis 1,4). Die Wünsche verbrauchen
  eigene Waren und geben so Kleidung, Krügen und Schmuck einen Platz in der eigenen Festung.

## 11. Was sich an Bestehendem ändert

| Bereich | Änderung |
|---|---|
| Kosten | Ausbau `Grundpreis × Stufe²` statt exponentiell, ab Stufe 6 mit Zahnrädern |
| Werte | Metalle in sechs Stufen (1:60), Erz 35 % des Barrens statt 45 % |
| Zeiten | Tabelle in Abschnitt 6 |
| Spitzhacken | Härte entscheidet, was abbaubar ist; Kupfer wird als Hacken-Metall erlaubt |
| Offline | Tagesplan statt 7 Tage voll |
| Überfälle | nur, wenn der Spieler in den letzten 24 h da war |
| Amboss, Ader | 8 h Wartezeit; Ader alle 4 h, bis zu 3 gesammelt |
| Markt | Aufnahme je Fach, Ruf, Aufträge, Vorschau |
| Alte Spielstände | Münzen und Warenwerte werden einmal umgerechnet, Stufen bleiben |

## 12. Wie wir die Balance prüfen: der Balance-Bot

Ein Test (`BalanceTest`) spielt die Festung mit festen Strategien 120 Tage durch und schreibt das Tageseinkommen als
Tabelle. Geprüft wird:

- Besucht dreimal am Tag und investiert vernünftig: Einkommen bleibt im Band der Leitkurve (±25 %).
- Ein Besuch am Tag: mindestens 75 % davon. Sechs Besuche: höchstens 115 %.
- Ein Monat liegen lassen: höchstens der Ertrag von drei Tagen.
- Monokultur (nur die wertvollste Ware): höchstens 60 % der Leitkurve.
- Jede Ware und jedes Metall ist in mindestens einem Zeitalter Teil der besten Strategie.

Erst wenn der Bot grün ist, wandern die Zahlen nach `BALANCING.md`.

## 13. Reihenfolge der Umsetzung

1. **Balance-Bot und Preisformel**: Werte, Zeiten, quadratische Kosten. Ohne neues Feature, aber die Kurve stimmt.
2. **Tagesplan, Schichtbericht, Bauzeiten, „Bestand halten“.** Damit fühlt es sich wie ein Idle-Spiel an.
3. **Gesteinshärte, Abnutzung, neue Legierungen.**
4. **Ruf, Aufträge, Aufnahme je Fach, Münze.**
5. **Verbundwaren, Einlage, Feinmechaniker.**
6. **Ränge, Lehre, Wünsche der Zwerge.**

Jeder Schritt ist für sich spielbar und wird einzeln mit dem Bot geprüft.

## 14. Offene Entscheidungen

1. **Abnutzung von Werkzeug:** gibt der Schmiede Dauerarbeit, kann sich aber nach Pflicht anfühlen. Empfehlung:
   ja, aber erst zusammen mit „Bestand halten“ und „von selbst tauschen“.
2. **Wie hart die Bremse beim Liegenlassen ist:** vorgeschlagen sind 24 h voll, danach bis 20 %. Milder wäre 48 h.
3. **Tempo der Leitkurve:** +100 Marks Tageseinkommen je Tag heißt etwa vier Monate bis zum letzten Zeitalter.
4. **Alte Spielstände:** umrechnen (empfohlen) oder mit dem neuen Balancing neu anfangen.
5. **Neue Räume:** Feinmechaniker und Münze brauchen Grafik und Raumvorlagen.
