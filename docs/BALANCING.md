# Balancing

Alle Zahlen stehen im Code: Inhalte in `Content.java`, Formeln in `Rules.java`, Abläufe in `Sim.java`,
`Expeditions.java` und `Market.java`. Diese Seite fasst sie zusammen. Wer eine Zahl ändert, ändert sie im Code
und hier.

## Zeit

| Was | Wert | Gedanke |
|---|---|---|
| Simulationsschritt | 60 s | Server rechnet jede Minute alle Festungen weiter |
| Offline-Nachholen | max. 7 Tage | danach friert die Festung ein |
| Lager voll (Start) | ca. 20 h | 4 Miner × 6 Erz/h gegen 500 Plätze |
| Karawane | 2–8 h hin und zurück | Stonebridge 1 h pro Weg … Emberton 4 h |
| Expedition | 2–12 h | lange Touren über Nacht |
| Überfall-Warnung | 3 h | passt zu 3–5 Besuchen am Tag |
| Erster Überfall | nach 5 Tagen, dann alle 20–40 h (`Rules.FIRST_RAID_DAYS`) | |
| Belagerung | 8 h oder bis gebrochen | |
| Monster | 0,25–1 pro Tag und Schicht | erst ab 6 h Spielzeit |
| Zuwanderung | alle 8 h | nur mit freien Betten und Stimmung ≥ 45 |
| Stadt-Nachfrage | wechselt alle 4 h | |
| Neue Expeditions-Gerüchte | alle 6 h, gültig 12 h | |

## Produktion

| Formel | Wert |
|---|---|
| Arbeitstempo | `(1 + 0,06 × Fertigkeit) × Stimmung (0,6–1,4) × Eigenschaften × Traditionen`, verletzt (< 40 HP) halbiert |
| Fertigkeitsstufe | `floor(sqrt(xp / 40))`, max. 20. Arbeit gibt 10–12 xp pro Stunde |
| Miner | Schicht-Grundwert (6 / 5 / 4,5 / 4 / 3,5 Erz/h) × Tempo × Schacht (+20 %/Stufe) × Spitzhacke (siehe „Spitzhacken“) |
| Lift | `80 × 1,35^(Stufe−1)` Erz/h |
| Erzwagen | fasst `10 + 5 × (Schachtstufe−1)` Erz je Schicht; Erz kommt erst ins Lager, wenn der Wagen voll ist und losfährt. Ist das Lager voll, wartet der volle Wagen. Der Spieler kann ihn früher schicken (`cartRule`): schon bei 25/50/75 % Füllung (`cartFill`, `Rules.cartTarget`) oder nach 5–60 Minuten ab dem ersten Erz (`cartMinutes`) |
| Lager | `500 × 1,4^(Stufe−1)` (Pilze und Bier zählen nicht) |
| Gebäudestufe | `+25 %` Tempo pro Stufe |
| Maschinen | jede Werkstatt hat `min(5, Stufe)` Maschinen, jede braucht einen eigenen Zwerg und arbeitet ihre eigene Bestellung ab (gemeinsame Warteschlange, gemeinsame Hitze im Schmelzofen) |
| Maschine | kommt mit jedem Ausbau dazu (keine eigenen Kosten). Abgebaute Maschinen wieder aufstellen kostet `6 × Stufe` Marks + `15 × Stufe` Stein (`Rules.machineCost`); der Raum wird um `MACHINE_CELLS` Zellen breiter. Ist rechts kein Platz, rückt er nach links oder zieht an die nächste freie Stelle (gleiche Etage zuerst) |
| Schmelzen | 2 Erz + 1 Kohle → 1 Barren in 360 s × Hitzefaktor des Metalls (ein Bonuswurf auf einen zweiten), Blasebalg bis ×2 (siehe Minispiele) |
| Legierung | 120 s × Hitzefaktor × max(1, Ausbeute/2) |
| Schmieden | 300 s × Barren × √Hitzefaktor (`Recipes.FORGE_SECONDS`) |
| Zusammensetzen (Feinmechaniker) | 600 s × (Barren + Teile), Krone mit Regalien doppelt |
| Schleifen / Gravieren, Edelstein fassen, Einlage | 480 / 600 s, Edelstein schleifen 1 800 s |
| Schneiderei | Weben 120 s: 3 Pilze → 2 Stoff. Nähen 80 s je Stoff: Hüte 1, Hemden, Hosen, Stiefel 2, bestickte Tunika 3 Stoff |
| Pilzfarm | 3 Pilze/h × Tempo × Stufe (`Rules.FARM_PER_H`): ein Bauer versorgt etwa 10 Zwerge samt Brauer |
| Brauerei | 2 Bier/h × Tempo × Stufe aus halb so vielen Pilzen (`Rules.BREW_PER_H`) |
| Verbrauch | 0,2 Pilze und 0,2 Bier pro Zwerg und Stunde (Ale Lover doppelt, Teetotaler kein Bier) |

## Qualität (Amboss: Schmieden und Abschrecken)

Jedes geschmiedete Stück wartet am Amboss (`Rules.ANVIL_MAX` = 10 Stück, `ANVIL_WAIT` = 8 h). Der Spieler spielt
zwei Minispiele (Takt am Amboss, 8 Schläge; Abschrecken an der goldenen Mitte). Nach 8 h machen die Zwerge es allein
fertig (Spielwert 0). Ist der Amboss voll, verdrängt ein wertvolleres Stück das billigste; das billigste machen die
Zwerge sofort fertig.

Jede Ware hat ein **Skill-Level** 1–5 (`ItemType.skill`): Spitzhacke und Kette 1, Axt, Helm und Kelch 2,
Kettenhemd 3, Ring 4, Krone 5. Barren haben keins. Eine Qualitätsstufe multipliziert den Wert immer um denselben
**Schritt** `s = 1,2 + 0,1 × Skill` (`Content.qualityStep`), Normal ist ×1, Stufe q ist `s^(q − 1)`, ein Artefakt
fünf Meisterwerke (`5 × s³`):

| Skill | Schritt | Crude | Normal | Fine | Exceptional | Masterwork | Artifact |
|---|---|---|---|---|---|---|---|
| 1 | ×1,3 | 0,77 | 1 | 1,3 | 1,69 | 2,2 | 11 |
| 2 | ×1,4 | 0,71 | 1 | 1,4 | 1,96 | 2,74 | 13,7 |
| 3 | ×1,5 | 0,67 | 1 | 1,5 | 2,25 | 3,38 | 16,9 |
| 4 | ×1,6 | 0,62 | 1 | 1,6 | 2,56 | 4,1 | 20,5 |
| 5 | ×1,7 | 0,59 | 1 | 1,7 | 2,89 | 4,91 | 24,6 |

Die Kraft (Werkzeug, Waffe, Rüstung) hängt nur an der Stufe: Crude ×0,8, Normal 1, Fine 1,4, Exceptional 1,8,
Masterwork 2, Artifact 3.

- Spielwert `p = 0,55 × Takt + 0,45 × Abschrecken` (je 0–1). Ein Schlag zählt voll bis 30 ms neben dem Takt und
  nichts mehr ab 250 ms; Schläge ohne Takt kosten 0,04. Abschrecken zählt voll in der goldenen Mitte und fällt bis zum
  Rand der Leiste auf 0; nach 9 s ist das Stück kalt (0).
- Mittlere Stufe `m = −0,3 + 0,18 × Schmieden + 0,2 × (Schmiedestufe − 1) + 1,2 × p + 0,3 (Nimble Fingers) + 0,2 × Master Smiths`,
  `− 0,35 × (Skill der Ware − 1)` (`Rules.ITEM_SKILL_PENALTY`), Stufe = `runden(m + Normalverteilung × 0,6)`, begrenzt
  auf Crude bis Masterwork. Mittlerer Wertfaktor (Test `metalsAndQualitiesChangeEveryItemsValueAlike`):

  | Schmied | Skill 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|
  | Anfänger (Schmieden 3, Stufe 1, ohne Spiel) | ×0,85 | ×0,76 | ×0,68 | ×0,63 | ×0,59 |
  | Geselle (10, Stufe 3, ohne Spiel) | ×1,29 | ×1,23 | ×1,13 | ×0,98 | ×0,83 |
  | Geselle mit gutem Spiel (p = 0,8) | ×1,65 | ×1,71 | ×1,66 | ×1,54 | ×1,36 |
  | Meister (20, Stufe 5, ohne Spiel) | ×2,11 | ×2,47 | ×2,68 | ×2,73 | ×2,60 |
  | Meister, perfektes Spiel | ×2,20 | ×2,74 | ×3,34 | ×3,93 | ×4,39 |

  Anfänger machen am besten einfache Stücke, Meister mit gutem Spiel die schweren.
  Anfänger allein: fast nur Crude; Meister (Schmieden 20) allein: meist Exceptional; Meister mit gutem Spiel: meist Masterwork.
- Artefakt-Chance je Stück = `0,009 × Arbeitsstunden × (Schmieden/20)⁴ × (1 + 0,15 × (Stufe − 1)) × (1 + 4 × p⁴)`.
  Ein Meister im Dauerbetrieb schafft etwa 1,5 Artefakte pro Woche; perfektes Spiel macht sie fünfmal so häufig.
  Artefakte landen in `f.artifacts` (unbenannt, der Spieler gibt den Namen), Wert = Normalwert × 5 × s³.
- Alte Spielstände (vor Version 3) werden umgestellt: Crude, Common, Fine bleiben; Superior und Exceptional werden
  Exceptional, Masterwork bleibt Masterwork (`Factory.toVersion3`).

## Spitzhacken (Gesteinshärte, Tempo, Abnutzung)

- Jedes Erz hat eine **Härte** 1–8 (`Content.ROCK_HARDNESS`). Eine Spitzhacke bricht, was höchstens so hart ist wie ihr
  Metall (`Metal.hardness`). Ein Bergarbeiter bringt nur, was seine Hacke bricht, sein Tempo bleibt.

  | Härte | Gestein | Mindestens |
  |---|---|---|
  | 1 | Kohle, Stein, Kalk, gediegenes Kupfer, Zinnstein | Notfall-Hacke |
  | 2 | Malachit, Zinkblende, Bleiglanz | Kupfer |
  | 3 | Roteisenstein, Brauneisenstein, Fahlerz, gediegenes Silber, Hornsilber | Messing, Nickel, Neusilber |
  | 4 | Magnetit, Garnierit, Wismutglanz, gediegenes Gold | Bronze, Eisen |
  | 5 | Rohedelstein | Wismutbronze |
  | 6 | gediegenes Platin | Stahl |
  | 7 | gediegenes Aluminium | Nickelstahl (neu: 2 Stahl + 1 Nickel → 2, Bauplan Steelmaking) |

- **Notfall-Hacke** (`tool == null`): kostenlos, bricht nie, Härte 1, Tempo ×0,75 (`Rules.MAKESHIFT_SPEED`).
- Spitzhacken aus Metall mit Härte ≥ 2, nicht edel, kein Roheisen (Regel `tool`).
- Tempo = `(1 + min(0,6; 0,12 × (Härte der Hacke − mittlere Härte des Gebrochenen))) × Kraft der Qualität`, geschärft ×1,15.
- **Abnutzung:** Lebensdauer = `(24 + 6 × Härte²) Arbeitsstunden × Kraft der Qualität` (`Rules.toolLife`):
  Kupfer 48 h, Messing 78 h, Bronze und Eisen 120 h, Wismutbronze 174 h, Stahl 240 h, Nickelstahl 318 h.
  Gezählt wird beim Schürfen und beim Graben in der Festung. Bricht die Hacke, nimmt der Zwerg die beste aus dem Lager
  (Härte vor Tempo, `Rules.pickScore`), wenn „Miners take a new pick“ an ist (`Fortress.autoPicks`, Standard an),
  sonst gräbt er mit der Notfall-Hacke weiter.
- **Waffen und Rüstung** nutzen sich je Kampf ab: Lebensdauer `(10 + 3 × Härte²) Kämpfe × Kraft der Qualität`
  (`Rules.gearLife`: Bronze 58, Stahl 118, Nickelstahl 157, Sternstahl 202). Kaputt heißt weg; mit „take new gear“ nimmt der
  Zwerg das beste Stück für den Platz aus dem Lager.
- **Sternstahl** (Härte 8, 16 Marks je Barren): 2 Stahl + 1 Platin + 1 Aluminium → 2, Bauplan `starsteel` (Expeditionen,
  Schichtbericht). Bestes Metall für Hacken, Waffen und Rüstung.
- Wer ein benutztes Stück (Hacke mit mehr als 15 min Arbeit, Waffe oder Rüstung nach einem Kampf) abnimmt, verschrottet es. So setzt Tauschen die Abnutzung nicht zurück.

## Werte

- Warenwert = `Barrenwert des Metalls × Barren × Typfaktor × Qualität × Veredelung` (geschärft ×1,3, graviert ×1,4,
  Edelstein ×1,8). Ein Metall verändert also jede Ware um denselben Faktor, sein Barrenwert geteilt durch den eines
  anderen Metalls (Stahl ist 3,2-mal so viel wert wie Kupfer, auch als Axt, Kette oder Spitzhacke).
- Kleidung: Stoff 4 Marks, Kleidung 6–26 Marks (Flickenhemd 6, Strickpullover 16, bestickte Tunika 26); also etwa das
  Doppelte bis Dreifache des Stoffs. Eigene Markt-Sorte `cat:clothing` mit einem gemeinsamen Kurs. Brille, Ohrringe und Grubenhelm lassen sich nicht nähen.
- Schicht 1 bringt jetzt 27 % Stein und 2 % Rohedelstein, Schicht 2 17 % Stein und 2 % Rohedelstein.
- Erz ist 30 % eines Barrens wert (`Content.ORE_SHARE`), Kohle 50, Kalk 60, Stein 30 Jots. Legierungen sind immer mehr wert als ihre Zutaten.
- Barrenwerte in sechs Stufen (Jots): Blei 400, Kupfer 450, Zinn 500, Zink 550 · Kalt-Zinn 850, Eisen 900, Flitter-Zinn 900,
  Messing 1 000, Fein-Zinn 1 000, Bismut 1 100, Bronze 1 100, Roheisen 1 200, Nickel 1 300 · Billon 2 000, Neusilber 2 000,
  Bismutbronze 2 200, Silber 2 500, Stahl 3 000, Sterlingsilber 3 200 · Elektrum 6 000, Gold 7 000, Rotgold 7 500,
  Schwarzbronze 8 000 · Platin 15 000, Aluminium 16 000, Nickelstahl 18 000 · Sternstahl 30 000.
- Typfaktoren: Spitzhacke 1,6, Kette 1,6, Helm 1,7, Kelch 1,7, Kettenhemd 1,8, Axt 1,9, Krone 2,2, Ring 2,5.
- **Wertleiter** (`BalanceTest`): aus Schichtrate, Arbeitszeiten und Werten wird ausgerechnet, was eine Zwergenstunde auf
  jeder Stufe bringt (Nebenfunde wie Kohle kosten so viel Zeit, wie ein Bergarbeiter in der Schicht für denselben Wert
  bräuchte). Für jedes Metall gilt: Barren > 1,05 × Erz, Ware > 1,1 × Barren, gravierte Ware > 1,03 × Ware. Jede
  Verbundware schlägt in mindestens einem Metall alle leichteren einfachen Waren (Teile haben feste Werte, darum lohnen
  sie sich in mittleren Metallen: Lampe und Kompass in Messing, Schloss, Schild und Prunkaxt in Eisen, Krugset in
  Kalt-Zinn, Kelch und Spieluhr in Silber, Regalien in Gold). Beispiel Kupfer: Erz 0,81, Barren 0,91, Ware 1,20,
  graviert 1,46 Marks je Zwergenstunde; Gold: 8,4 / 10,4 / 21,3 / 25,8.
- **Balance-Bot** (`BalanceBotTest`): spielt eine neue Festung 120 Tage mit drei Besuchen am Tag. Keine feste
  Einkommenskurve mehr (Wunsch: Spaß statt Ziel), geprüft wird: jeder Monat bringt mehr als der davor. Stand: Tage 1–10
  zusammen 360 Marks, 21–30 645, 111–120 2 680; Tag 120 rund 500 Marks am Tag und 30 Zwerge.

## Geld

- Gold Mark = 100 Silver Talents, Silver Talent = 10 Copper Jots. Intern rechnet alles in Jots (`Rules.JOTS_PER_MARK` = 1000).
- Alte Spielstände (`Fortress.version` < 2): Münzen und Artefakte × 100 (`Factory.toVersion2`), eine alte Münze = 100 Jots.
  Ein Kupferbarren ist 1 Mark wert. Neue Festungen starten mit 30 Marks.

## Markt (`Market.java`)

- Sorten: jede Ware hat ihren Schlüssel; Gegenstände eines Typs teilen sich `type:<typ>`, alle Kleidung `cat:clothing`.
  Der Kurs gilt für eine Bezugsware (Typ aus Bronze, Edles aus Silber, sonst Kupfer; Kleidung: Leinenhemd).
- Stadtpreis = `Grundwert × e^(g + c)`, begrenzt auf 10 %–1000 % des Grundwerts (`Market.MIN/MAX`).
  `g` ist der Weltkurs (Rückkehr zum Grundwert in etwa 24 h, Streuung 0,25), `c` der Stadtkurs (Rückkehr zu ln(Nachfrage)
  in etwa 6 h, Streuung 0,15). Die Nachfrage jeder Stadt wechselt alle 12 h (`DEMAND_EPOCH`); die Nachricht für die nächsten 12 h steht schon
  vorher da (`nextNews`).
- NPC-Städte handeln nicht untereinander; Preise bewegen sich nur durch Zufall und Spieler.
- Handel: `x = q / L × Macht`. Die gehandelte Stadt bewegt sich um x (Verkauf runter, Kauf rauf), der Weltkurs um
  `x × Stadtanteil`, also bewegen sich alle anderen Städte um den Anteil der Stadt mit. Stadtanteile: Stonebridge 22 %,
  Ironmarch 20 %, Amberfall 18 %, Saltreach 16 %, Highcrag 12 %, Emberton 12 %.
  Erlös: `q × Preis × (1 − e^(−x)) / x`. Liquidität `L = 2000 / √(Grundwert / 100)` (Kupferbarren 2000), Typen und
  Kleidung 150.
- Einkauf: 25 % teurer als Verkauf (`BUY_SPREAD`), hebt den Kurs.
- Verlauf: Weltkurs alle 30 min, Städte alle 2 h, je 7 Tage.
- Marktanteil je Sorte: gehandelter Wert (Kauf und Verkauf, Jots) als gleitender Wert mit 7 Tagen Zeitkonstante
  (`Rules.SHARE_DAYS`). `Anteil = (V + B) / (V + B + W)`, `W = L × 7 × Bezugswert`, `B` so, dass man mit 1 % startet.
  Marktmacht `= √(Anteil / 1 %)`, begrenzt auf 1–5: wer viel handelt, bewegt den Preis stärker.

## Tagesplan, Bauen, Schichtberichte, Bestand halten

- **Tagesplan** (`Rules.pace`): Jeder Besuch (Laden des Spielstands oder eine Aktion, `Fortress.lastVisit`) startet ihn
  neu. Bis 24 h nach dem Besuch volles Tempo, dann in 48 h gleichmäßig auf 20 %, bis 7 Tage 20 %, danach Ruhe (0).
  Das Tempo multipliziert die Zeit für Bedürfnisse, Stimmung, Graben, Mine, Werkstätten, Training und
  Schichtberichte; Karawanen, Expeditionen, Bauen und der Amboss laufen nach der Uhr. Ein Monat ohne Besuch bringt
  etwa 3 Tage Arbeit. Überfälle, Monster und Kriechtiere kommen nur, wenn der letzte Besuch höchstens 24 h her ist
  (`Rules.watched`).
- **Vorarbeiter** (Beruf `foreman`, ab Festungsstufe 5, einer): volles Tempo 36 h, ist eine seiner Fertigkeiten ≥ 15,
  48 h (`Rules.planFull`).
- **Bauen** (`Rules.buildTime`): ein Bautrupp, ein Ausbau zur Zeit. Ausbau auf Stufe n dauert `10 min × n^1,6`
  (Stufe 2: 30 min, 5: 2 h 10 min, 10: 6 h 38 min), höchstens 24 h. Der Raum arbeitet währenddessen auf der alten Stufe
  weiter. Neue Räume (Stufe 0 → 1) stehen sofort. Schichten öffnen und Schächte ausbauen geht weiterhin sofort.
- **Schichtbericht** (`Sim.shiftReports`): alle 4 h Arbeit einer, bis zu 3 warten. Fund: 40 % Erz der tiefsten offenen
  Schicht (`6 + 4 × Schicht` bis +4), 20 % Rohedelsteine (`1 + Schicht/2`), 20 % alte Münzen (`(3 + 2 × Festungsstufe)`
  Marks × 0,8–1,4), 15 % Barren (`2 + Schicht`), 5 % ein fehlender Bauplan (sonst ein geschliffener Stein).
- **Bestand halten** (`QueueEntry.keep`, ab Werkstattstufe 2): Der Auftrag läuft nur, solange weniger als `keep`
  Stück im Lager sind (Stücke am Amboss zählen mit, `Recipes.productCount`).

## Sofortverkauf und besuchende Karawanen

- **Sell at the gate** (Aktion `quickSell`): jede Ware sofort für 10 % des Grundwerts (`Rules.QUICK_SALE`), ohne
  Markt, ohne Weg. Zum Lager-Leeren, nicht zum Verdienen.
- **Besuchende Karawane** (`Fortress.visitor`, `Sim.visitors`): alle 8–16 h (die erste nach 2–6 h) kommt eine Karawane
  aus einer bekannten Stadt ans Tor und will 40–120 % des Bestands einer Sorte, die die Festung hat. Sie zahlt den
  Stadtkurs × 1,05–1,3 sofort, ohne Risiko und ohne Preiseinfluss, und wartet 6 h (`VISITOR_STAY`). Aktion
  `sellVisitor`, wegschicken mit `sendVisitor`. Was man ihr verkauft, zählt für den Ruf.

## Ruf, Aufträge, Münze

- **Ruf** je Stadt (`Fortress.rep`, Punkte = gelieferte Marks): Rang `r = ⌊√(Punkte / 100)⌋`, höchstens 10
  (Rang 1: 100, 5: 2 500, 10: 10 000 Marks). Es zählen Karawanen-Verkäufe, die besuchende Karawane und Aufträge
  (doppelt). Je Rang +2 % Preis in der Stadt (`REP_PRICE`) und 25 % mehr Abnahme, bevor der Preis fällt: die
  Marktmacht wird durch `1 + 0,25 × Rang` geteilt (`Rules.cityPower`, `REP_TAKE`). Bei Rang 5 gibt die Stadt einen
  fehlenden Bauplan.
- **Aufträge** (`Fortress.contracts`, `Sim.contracts`): alle 8 h ± 20 % hängt eine bekannte Stadt einen aus, bis zu
  3 offen. Ware: ein beliebiger Gegenstand aus einem Metall, das die Festung bekommen kann (Erze offener Schichten,
  Barren im Lager, Legierungen daraus, mit Bauplan). Menge so, dass der Grundwert etwa `(30 + 20 × Festungsstufe)`
  Marks × 0,7–1,3 ergibt (2–40 Stück). Prämie: Grundwert (Normal) × 1,5. Zeit 24 h. Es zählen Stücke ab Normal mit
  jeder Veredelung; geliefert wird am Tor (Aktion `fillContract`).
- **Münze** im Tresor (`Fortress.mint`, `Sim.minting`): Billon, Elektrum und Gold werden zum Grundwert zu Geld, ohne
  Markt und ohne Weg, eine Barre je Stunde und Tresorstufe (läuft mit dem Tagesplan). Aktion `mint` (`amount` < 0
  holt Barren zurück).

## Feinmechaniker, Verbundwaren, Einlage

- **Fine mechanic's bench** (`mechanic`, 80 Marks + 30 Stein + 10 Messing, Fertigkeit crafting, Maschinen wie die
  Graveurbank). Zahnräder (`gears`, Rohware, Grundwert 4,5 Marks): 2 Messing → 1, 120 s Arbeit.
- **Verbundwaren** (`Content.assembled`, Teile in `Content.PARTS`): Wert = `(Metallwert × Barren + Grundwert der Teile) ×
  Faktor × Qualität × Veredelungen`. Das eigene Metall verändert also nur seinen Anteil; Qualitätsstufen wirken wie bei
  jeder Ware. Arbeit `150 s × (Barren + Teile)`, Krone mit Ornat doppelt. Kein Amboss: die Qualität würfelt der Server
  sofort mit der crafting-Fertigkeit des Arbeiters (`Rules.smithMean`, Spiel 0), Artefakte möglich.

| Ware | Metall | Barren | Teile | Faktor | Skill | Gruppe |
|---|---|---|---|---|---|---|
| Miner's lamp | Messing | 1 | 1 Kupfer | 2,5 | 2 | tools |
| Lock | hart | 1 | 1 Zahnräder | 1,8 | 3 | hardware |
| Shield | hart | 2 | 1 Bronze | 1,9 | 2 | armor |
| Tankard set | Zinnlegierung | 2 | 1 Messing | 1,9 | 2 | tableware |
| Chalice | edel | 2 | 1 Gold, 1 geschliffener Stein | 2,2 | 3 | tableware |
| Parade axe | hart | 2 | 1 Gold, 1 geschliffener Stein | 2,0 | 4 | weapons (Waffe) |
| Sea compass (Bauplan clockwork) | Messing | 1 | 1 Neusilber, 1 Zahnräder | 2,0 | 3 | tools |
| Music box (Bauplan clockwork) | edel | 1 | 1 Zahnräder | 2,6 | 4 | jewelry |
| Crown and regalia (Bauplan regalia) | Gold | 3 | 1 Platin, 3 geschliffene Steine | 3,6 | 5 | jewelry |

- **Goldeinlage** (Veredelung `i`, Graveur, 1 Goldbarren): Wert + 2 × Goldwert vor Faktor und Qualität. Erlaubt auf
  Streitaxt, Helm, Kettenhemd, Kelch (goblet), Schild, Chalice, Parade axe.

## Ränge, Lehre, Üben, Wünsche

- **Rang** nach der besten Fertigkeit (`Rules.rank`): Lehrling 0–7, Geselle ab 8, Meister ab 15 (`JOURNEYMAN`, `MASTER`).
- **Spezialisierung** (Aktion `specialize`, `Dwarf.specs`): eine als Geselle, eine zweite als Meister. Quick hands +20 %
  Tempo, Weaponsmith +1 mittlere Qualität bei Waffen und Rüstung, Fine hand +0,5 Qualität bei jedem Stück,
  Deep delver +20 % Bergbau, Teacher: Lehre +100 % statt +50 %.
- **Lehre** (`Rules.learnMult`): arbeitet im selben Raum ein Geselle oder Meister, der in dieser Fertigkeit besser ist,
  lernen die anderen +50 % (Teacher +100 %).
- **Üben** (`Building.practice`, Aktion `practice`): Werkstatt arbeitet mit halbem Tempo (halber Ertrag), Lernen ×3.
- **Wünsche** (`Rules.wishes`, je erfüllt +3, je offen −6 Stimmungsziel): Gesellen wollen etwas zum Anziehen und Kelche
  oder Krug-Sätze im Lager (mit Taverne); Meister zusätzlich ein eigenes Werkzeug oder eine Waffe ab Fine und ein
  Schmuckstück. Das Schmuckstück nimmt sich der Meister selbst: das billigste aus der Gruppe jewelry (`Dwarf.trinket`).

## Handelsdepot (`Depot.java`)

- Gespeicherte Karawanen: `1 + Stufe`; Regeln (WENN Vorrat ≥ N DANN schicke Karawane nach Stadt): `Stufe`, eine Regel
  feuert erst wieder, wenn ihre Karawane zurück ist; Kauf-Aufträge: `Stufe`.
- Kauf-Auftrag: fällt der Preis einer Stadt auf den Höchstpreis, kaufen ihre Händler eine Ladung (`10 + 10 × Stufe`),
  solange nach dem Kauf noch die Rücklage bleibt. Bezahlt wird bei Ankunft; reicht das Geld dann nicht, ziehen sie ab.

## Kampf

- Kraft eines Zwergs = `(4 + 1,5 × Kampf) × (1 + Angriff/8) × (1 + Rüstung/10) × Gesundheit × Stimmung × Eigenschaften`.
  Axt: `Härte × 1,6 × Kraft der Qualität` (+25 % geschärft). Helm `Härte × 0,8 × Q`, Kettenhemd `Härte × 1,8 × Q`.
- Siegchance = `r² / (r² + 1)` mit `r = eigene Kraft / Gegner`, begrenzt auf 3–98 %.
- Verletzungen und Tod hängen von `r` ab; auch Sieger können sterben.
- Überfall: `15 × (1 + 0,08 × Tage seit Tag 5) × 0,8–1,25` (`Rules.RAID_GROWTH`), gebrochen nimmt er 15 % von Geld und Lager (`RAID_TAKE`, weniger mit Tresor). Verteidigt von den Wachen der Eingangshalle × Hallenbonus + Tor.
  Tor: `15 × (Stufe − 1)` (Stufe 1 ist das Holztor; alte Mauern Stufe n werden Tor Stufe n + 1). Tresor schützt 10 % (ohne) bis 80 %.
- Eingangshalle: `2 + 2 × Stufe` Wachen, Bonus `+8 % × Stufe` beim Kampf daheim. Wachen lernen beim Wachestehen und
  Üben mit Holzstöcken `1,5 xp/h` Kampf (`Rules.GUARD_XP_PER_H`), zusätzlich zur Kaserne.
- Kriechtiere: bis zu 3 Wachen (die stärksten) laufen von selbst hin, Weg 3 min (`Rules.CRITTER_WALK`); verlieren sie,
  versuchen sie es nach 1 h wieder.
- Banditen: `10 + 160 × Gefahr × (1 + 0,08 × (Stufe−1))`.
- Expeditions-Gegner: `Gefahr × 12 × 0,7–1,25`. Empfohlene Trupp-Kraft: `Gefahr × 14`.

## Magie (`Magic.java`)

- **Schliff** beim Juwelier (`cutgem`, Rohedelstein → `gem:<Schliff>`): Mittel `−0,2 + 0,14 × crafting + 0,25 × (Stufe − 1)`,
  Streuung 0,8 (gauß), gerundet auf 0–4 = Rough cut, Fair cut, Fine cut, Brilliant, Flawless. Wert 4 000 / 6 000 / 9 000 /
  14 000 / 22 000 Jots; verzaubert × `(1 + 0,4 × Wort)`. Steine handeln unter „cut_gem“, kaufen kann man sie nicht.
  Juwelier: Bau 50 Marks + 30 Stein + 10 Bronze.
- **Verzaubern** im Turm des Zauberers (`enchant`, 30 min, Fertigkeit arcana, steht ab Stufe 1 ohne Arbeiter): Schule
  wählen, Wirkung der Schule gleich verteilt. Wort-Chancen je Schliff (Rough → Flawless):
  greatly 0 / 3 / 8 / 15 / 25 %, a lot 5 / 15 / 25 / 35 / 40 %, better 35 / 40 / 40 / 35 / 30 %, Rest slightly.
  Arcana gibt bis zu 50 % Chance auf eine Stufe mehr (`arcana / 20 × 0,5`); ab Turmstufe 3 zwei Würfe, der bessere zählt.
  Ohne geschliffenen Stein nimmt der Zauberer einen Rohedelstein als Rough cut.
- **Wirkungen** (Grundwert je Wortstufe, Obergrenze je Zwerg):

| Schule | Wirkung | Grundwert | Grenze |
|---|---|---|---|
| Earth | mining speed / gem finds / tool wear | 5 % / 3 % / −4 % | 200 % / 100 % / −80 % |
| Fire | smelting speed / smithing quality / forging speed | je 5 % | 200 % |
| Steel | combat power / defence / healing | je 5 % | 200 % |
| Hearth | farming and brewing / mood / food and ale | 5 % / 2 Punkte / −4 % | 200 % / 40 / −80 % |
| Gold | trade prices / learning / crafting speed | 2 % / 5 % / 5 % | 50 % / 200 % / 200 % |

- **Zahl** = Grundwert × Wort (slightly 1, better 2, a lot 3, greatly 4) × Fassung × Passung.
  Fassungen je Qualität: Crude 0, Normal 1, Fine 1, Exceptional 2, Masterwork 3, Artifact 3.
  Fassung nach Metall-Zeitalter (Wert ≤ 600 / 1 300 / 3 200 / 8 000 / 18 000 / darüber): ×1 / 1,5 / 2 / 3 / 4 / 5,
  Artefakte zusätzlich ×1,5. Passt die Wirkung zum Stück (`Magic.FITS`): ×2; Schmuck (Platz trinket) ×1,5 für alles.
  Beispiel: „a lot better smithing quality“ im Stahlhammer: 5 % × 3 × 2 × 2 = +60 %.
- **Einsetzen** und **Herausnehmen** am Turm, sofort; heraus bricht der Stein zu 25 %. Ein Stück, das kaputtgeht
  oder verschrottet wird, gibt seine Steine zurück.
- **Werkzeug je Beruf** (Platz tool): pickaxe mining, hammer smithing, ladle smelting, sickle farming, chisel crafting,
  scales trading, staff arcana. Tempo +5 % × Zeitalter × Kraft der Qualität; die Waage +2 % Preis je Zeitalter.
  Abnutzung wie Spitzhacken, nur bei der eigenen Arbeit.
- **Legendär** (Qualität Artifact): nie kaputt, nie im Lager, eine orange Wirkung (je Festung einmal):
  Heart of the Mountain (Bergarbeiter der Schicht +15 %), Forgefather (+1 Qualitätsstufe, höchstens Meisterwerk),
  Bottomless Tankard (Bier ×0,75), Gatekeeper (Überfälle ×0,7, wenn der Träger Wache steht), Golden Touch (Verkauf ×1,15),
  Deepsight (Adern alle 6/7 der Zeit), Undying (einmal am Tag fällt der Träger nur, statt zu sterben),
  Voice of the Clans (Zuwanderer alle 4 h statt 8 h).
- Balance-Bot (120 Tage, drei Besuche): verzaubert Earth-Steine aus Rohedelsteinen und setzt sie in die Spitzhacken,
  jagt Monster in der Mine. Tag 111–120: rund 7 300 Marks (vorher, ohne Monsterjagd und Magie, 2 600, weil Monster
  die Schichten dauerhaft sperrten).

## Kosten

- Aufwerten auf Stufe n: `Grundpreis × n² / 4` Jots und `Grundstein × n² / 4` Stein (`Rules.levelSquare`, Stufe 2 ×1,
  Stufe 5 ×6,25, Stufe 10 ×25; Stein nur zur Hälfte, `Rules.STONE_SHARE`), dazu `4 + 3 × Stufe` Barren (bis Stufe 3 Kupfer, 4–5 Bronze, 6–8 Eisen, ab 9 Stahl).
- Weitere Werkstatt gleicher Art: Baupreis × 2,2 je vorhandener Werkstatt dieser Art.
- Schichten: Freischalten in Marks: Grey Veins 80 (+75 Stein), Silver Halls 400 (+150 Stein), Golden Deep 1 500 + Erkundung, Crystal Abyss 5 000 + Erkundung.
  Schicht ausbauen: `25 Marks × (Schicht + 1) × 1,6^(Stufe−1)`.
  Eine neue Schicht braucht nach dem Bezahlen Zeit, bis die Stollen offen sind (`Rules.LAYER_OPEN_HOURS`): Grey Veins 2 h,
  Silver Halls 6 h, Golden Deep 12 h, Crystal Abyss 24 h (`LayerState.openAt`, Sanduhr im Minen-Tab).
- Graben (`Rules.DIG_SECONDS`, `DIG_DEPTH`, `DIG_STONE`): Fels markieren ist frei. Ein Bergarbeiter gräbt eine Zelle
  in `300 s × Tiefenfaktor / (Arbeitstempo × Werkzeug)`; Faktor je zwei Etagen ×1 · ×1,5 · ×2,25 · ×3,25. Eine Zelle
  gräbt nur ein Zwerg, und nur, wenn links oder rechts schon offen ist (Schacht, Höhle, Gang, Raum). Jede Zelle gibt
  4 Stein. Wer gräbt, schürft in der Zeit kein Erz.
- Bauen in der Festung (`Rules.HALL_COST` usw.): Gang 1 Mark je Zelle, Treppenhaus (2 Zellen) 4 Marks + 20 Stein,
  Raum versetzen 3 Marks + 10 Stein, Gang und Treppenhaus versetzen frei. Alles nur auf ausgegrabenem Boden.
  Zuschütten ist frei (Gang → leere Höhle → Fels). Zieht ein Raum beim Ausbau um, weil er wächst, kostet das nichts extra.
- Räume ohne Gang, Treppenhaus oder Schacht daneben stehen still (`Rules.active`): sie arbeiten nicht und zählen nicht
  zur Stufe (Lager, Betten usw.).
- Leere Höhlen (`Rules.OVERGROW_HOURS`, `CRITTER_AFTER_HOURS`, `CRITTERS_PER_DAY`, `MAX_CRITTERS`): Moos nach 2 h,
  Pilze und Wurzeln nach 8 h, wild nach 24 h. Ab 12 h kann in jedem zusammenhängenden Höhlenstück ein Kriechtier
  einziehen (1,5 pro Tag, höchstens 5): Ratten (Etage 1–2), Höhlenkriecher (3–4), Spinnen (ab 5), Stärke 60 % des
  Minen-Monsters. Die Wachen der Eingangshalle gehen von selbst hin (siehe Kampf); sonst frisst es 1–3 Pilze und beißt vielleicht einen
  Zwerg (6–14 Gesundheit, nie unter 10). Es verschwindet, wenn seine Höhle bebaut oder zugeschüttet wird.
- Weg durchs Treppenhaus (nur Anzeige im Client): `0,6 s + (Abstand waagrecht + senkrecht in px) / 60 px/s`;
  Laufen sind 34 px/s.
- Beute-Berichte (`Rules.MAX_REPORTS`): höchstens 20 warten aufs Einsammeln, sonst wird der älteste von selbst eingesammelt.
- Festungsstufe: `150 × 1,5^(Stufe−1)` xp. Xp aus Verkäufen (1 pro Mark), Schmelzen, Schmieden, Expeditionen,
  Kämpfen, Ausbau.

## Minispiele der Werkstätten (`games.js`, `Rules.BOOSTED`)

| Was | Wert |
|---|---|
| Hitze | Schmelze, Brauerei, Schleifstein, Graveur, Juwelier, Schneiderei: Tempo × `(1 + Hitze/100)`, also bis ×2. +7 Hitze je guter Bewegung (`BOOST_PER_TAP`), −4 pro Sekunde |
| Obergrenze | der Server gibt je Aufruf höchstens `2 + 2,5 × Sekunden seit dem letzten` Bewegungen (höchstens 4 s angespart), also etwa 2,5 pro Sekunde (`BOOST_TAPS_PER_SEC`) |
| Blasebalg | füllt sich in 0,5 s: voll gedrückt 1, ab 80 % 0,6, sonst fast nichts |
| Fässer | ein Fass gibt nach 1,2 s Ruhe wieder voll, drei Fässer im Wechsel |
| Schleifstein | 2,2 je Sekunde in der grünen Zone |
| Runen, Edelstein, Webstuhl | je Treffer bis 1 (Runen: schneller getippt mehr; Edelstein und Schiffchen nach Abstand zur Marke) |
| Dünger (Pilzfarm) | alle 2 h einmal: +60 % × Anteil der bedüngten Pilze (`FERT_MAX`, `FERT_TIME`); der Sack reicht für 10 s Streuen |
| Ader (Mine) | je Schicht alle 4 h eine (`VEIN_WAIT`), bis zu 3 warten (`VEINS_MAX`, `Rules.veins`): `24 + 6 × Schachtstufe` Erz (`Rules.veinOre`) nach den Erz-Gewichten der Schicht direkt in den Wagen. Ausdauer 100, ein Schlag kostet 20 und erholt sich mit 45/s ab 0,25 s nach dem Schlag; Schlagkraft `0,4 + 0,6 × Ausdauer` (müde 0,15); Fels um die Ader hält `1 + ⌊Schicht/2⌋` Treffer (+1 innen) |
