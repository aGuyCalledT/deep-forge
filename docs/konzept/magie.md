# Konzept: Magie, Edelsteine, Fassungen und legendäre Artefakte

Mit dem Nutzer abgestimmt und umgesetzt; die Zahlen stehen in `BALANCING.md` („Magie“).

Abweichungen bei der Umsetzung: Einsetzen und Herausnehmen am **Turm des Zauberers** (sofort), nicht beim Juwelier;
der Juwelier schleift nur. Hearth hat „farming and brewing“ als eine Wirkung, dazu mood und „food and ale“ (weniger
Verbrauch); Steel heilt („healing“). Der Turm würfelt ab Stufe 3 zweimal und nimmt den besseren Wurf.

Entschieden: Fassungen nach Qualität (Anzahl) und Metall-Zeitalter (Güte); ein Werkzeug je Beruf; Schule wählen,
Wirkung und Stärke würfeln, Schliff bestimmt die Chancen; jeder Stein nur einmal verzaubert; Herausnehmen frei mit
25 % Bruch; Schmuck tragbar (Platz trinket); die Veredelung „Gem-set“ geht in den Fassungen auf; Stärke wie unten;
alle acht orangen Wirkungen, je Festung einmal; Grafik mit pxl; keine feste Einkommenskurve, Hauptsache stetiges
Wachstum und Spaß.

## 1. Ziel

- Wer sich schlau anstellt, hat es **leicht**: gute Ausrüstung mit guten Steinen macht Zwerge viel stärker.
- Magie fühlt sich **mächtig** an: Zahlen wie „+100 % smithing quality“ sind möglich, aber nur mit gutem Stück,
  gutem Stein und passendem Werkzeug.
- Einfache Regel: **Der Stein bringt die Art der Wirkung, die Fassung bringt die Zahl.**

## 2. Ablauf

1. **Rohedelstein** kommt aus der Mine (neu auch Schicht 1, 2 %) und aus Schichtberichten.
2. **Schleifen** beim Juwelier: der Stein bekommt einen **Schliff** (wie Qualität beim Schmieden, gewürfelt nach
   Fertigkeit „crafting“ und Raumstufe): Crude, Fair, Fine, Brilliant, Flawless. Dazu eine zufällige **Form** aus
   Dwarf Fortress (Rose, Table, Pear …), die nur auf dem Markt zählt (Mode). Die **Art** des Steins (127 aus Dwarf
   Fortress, von Achat bis Diamant) kommt aus der Mine: tiefere Schichten geben wertvollere. Siehe `Gems.java`.
3. **Verzaubern** beim Zauberer: der Spieler wählt eine von fünf **Schulen**. Gewürfelt werden die Wirkung innerhalb
   der Schule und ihre **Stärke** (ein Wort, keine Zahl). Ein besserer Schliff und mehr „Arcana“ würfeln höher.
   Jeder Stein wird nur **einmal** verzaubert.
4. **Einsetzen** in eine freie **Fassung** eines Stücks (Juwelier, kurz). Erst die Fassung macht aus dem Wort eine Zahl.
5. **Herausnehmen** ist frei, aber der Stein zerbricht mit 25 % Chance.

## 3. Schulen und Wirkungen

| Schule | Wirkungen |
|---|---|
| Earth | mining speed, gem finds, tool wear (weniger) |
| Fire | smelting speed, smithing quality, forging speed |
| Steel | combat power, defence, health regeneration |
| Hearth | farming, brewing, mood, eats and drinks less |
| Gold | trade prices, learning, crafting speed |

Stärke-Wörter (gewürfelt): **slightly** ×1, **better** ×2, **a lot** ×3, **greatly** ×4.
Chancen je Güte des Steins (0,6 × Stufe der Art + 0,5 × Schliff, 0 → 4): greatly 0 / 3 / 8 / 15 / 25 %, a lot 5 / 15 / 25 / 35 / 40 %, Rest verteilt
auf better und slightly. Arcana verschiebt bis zu einer Stufe nach oben (Meister).

Name des Steins: „Fire gem: a lot better smithing quality“.

## 4. Fassungen

- **Anzahl aus der Qualität:** Crude 0, Normal 1, Fine 1, Exceptional 2, Masterwork 3, Artifact 3.
- **Güte aus dem Metall-Zeitalter** (die sechs Wertstufen aus Schritt 1):

| Zeitalter | Metalle (Beispiele) | Faktor der Fassung |
|---|---|---|
| 1 | Kupfer, Zinn, Zink, Blei | ×1 |
| 2 | Eisen, Bronze, Messing, Zinnlegierungen, Nickel | ×1,5 |
| 3 | Silber, Stahl, Billon, Neusilber | ×2 |
| 4 | Gold, Elektrum, Rotgold, Schwarzbronze | ×3 |
| 5 | Platin, Aluminium, Nickelstahl | ×4 |
| 6 | Sternstahl | ×5 |

- **Passt der Stein zum Stück**, zählt er doppelt (×2): Bergbau in der Spitzhacke, Schmieden im Hammer, Kampf in der
  Waffe, Schutz in Helm und Rüstung, Handel in der Waage. Schmuck (Ringe, Kronen, Spieluhr) passt zu allem, aber nur ×1,5.
- **Zahl = Grundwert der Wirkung × Stärke-Wort × Fassung × Passung.** Grundwerte: Tempo- und Qualitätswirkungen 5 %,
  Kraft und Schutz 5 %, Stimmung 2 Punkte, Abnutzung und Verbrauch −4 %, Funde +3 %.
  Beispiel: „a lot better smithing quality“ (×3) in einem Gold-Hammer (×3), passend (×2): 5 % × 3 × 3 × 2 = **+90 %**.
  Derselbe Stein in einem Kupferring: 5 % × 3 × 1 × 1,5 = +22 %.
- **Obergrenze je Zwerg und Wirkung:** +200 % (Tempo, Qualität, Kraft), +40 Stimmung, −80 % Verbrauch und Abnutzung.

## 5. Werkzeuge für jeden Beruf (neue Waren)

Jede Arbeit bekommt ihr Werkzeug, Platz **tool** (wie heute die Spitzhacke); ein Zwerg trägt das Werkzeug seiner Arbeit.
Werkzeuge nutzen sich ab wie Spitzhacken. Ohne Werkzeug arbeitet man wie heute (Notfall-Werkzeug, kein Malus).

| Werkzeug | Beruf | Barren | Skill | Wirkung ohne Stein |
|---|---|---|---|---|
| Pickaxe (gibt es) | Bergbau | 2 | 1 | Härte und Tempo wie heute |
| Smith's hammer | Schmieden | 2 | 2 | +5 % Tempo je Metall-Zeitalter |
| Ladle | Schmelzen | 1 | 1 | wie oben |
| Sickle | Pilzfarm, Brauerei | 1 | 1 | wie oben |
| Chisel | Schleifen, Gravieren, Juwelier, Feinmechaniker, Schneider | 1 | 2 | wie oben |
| Scales | Handel (Händler) | 1 | 3 | +2 % Preis je Zeitalter |
| Staff | Zauberer | 2 | 3 | wie oben |

## 6. Schmuck als Ausrüstung

Neuer Platz **trinket** (Ringe, Kronen, Spieluhr, Krone mit Regalien). Die Wünsche der Meister („ein Schmuckstück“)
nutzen diesen Platz schon.

## 7. Legendäre Artefakte

- Qualität **Artifact** ist legendär: 3 Fassungen mit **zusätzlich ×1,5**, und das Stück **geht nie kaputt**.
- Dazu eine **orange Wirkung**, die man sonst nicht bekommt (beim Entstehen gewürfelt, passend zum Platz):

| Orange Wirkung | Was sie tut |
|---|---|
| Heart of the Mountain | alle Bergarbeiter der Schicht des Trägers +15 % |
| Forgefather's Blessing | jedes Stück des Trägers eine Qualitätsstufe besser (höchstens Meisterwerk) |
| Bottomless Tankard | die ganze Festung braucht 25 % weniger Bier |
| Gatekeeper | Überfälle −30 % Stärke, solange der Träger Wache steht |
| Golden Touch | Karawanen des Trägers verkaufen 15 % teurer |
| Deepsight | in jeder Schicht eine Erzader mehr am Tag |
| Undying | der Träger stirbt nicht, er fällt nur (einmal am Tag) |
| Voice of the Clans | Zuwanderer kommen doppelt so oft |

Jede orange Wirkung zählt in der Festung nur einmal, auch wenn mehrere Träger sie haben.

## 8. Anzeige

- Klick auf ein Stück (Lager, Zwerg, Amboss, Karawane): unter dem Namen die Fassungen als kleine Symbole, darunter jede
  Wirkung in **grün** mit Zahl („+90 % smithing quality“), die legendäre in **orange**. Freie Fassungen grau.
- Steine im Lager zeigen ihr Wort („a lot better smithing quality“) und daneben, was er im gewählten Stück bringen würde.
- Im Zwergen-Fenster die Summen je Wirkung, Info-Knopf mit den Obergrenzen.

## 9. Der Zauberer

- Neuer Raum **Wizard's tower** ab Festungsstufe 1 (steht beim Start wie Schmelze und Schmiede, ohne Arbeiter).
  Neue Fertigkeit **arcana**. Rezept „Enchant“: ein geschliffener Stein und eine Schule, Dauer 30 min.
- Ausbau: +25 % Tempo, ab Stufe 3 darf man bei schlechtem Wurf einmal je Stein neu würfeln (der Stein bleibt einmal
  verzaubert, nur der Wurf wiederholt sich).

## 10. Leichter spielen (Schwierigkeit)

Der Nutzer will keine feste Kurve, sondern Spaß: die Festung soll stetig wachsen und nie hängen bleiben.

| Was | heute | neu |
|---|---|---|
| Pilzfarm | 1,6 Pilze/h | 3 Pilze/h |
| Erster Überfall | nach 48 h | nach 5 Tagen |
| Stärke der Überfälle | ×1,3 je Festungsstufe | +8 % je Spieltag seit dem ersten, Diebstahl 15 % statt 30 % |
| Stein | 10 % der Funde in Schicht 1, 2 je Zelle | 20 %, 4 je Zelle, Ausbauten brauchen halb so viel Stein |
| Rohedelstein | ab Schicht 2 | auch Schicht 1 (2 %) |

Der Balance-Bot prüft danach: Einkommen wächst über 120 Tage stetig, keine Hungersnot, kein Stillstand; mit Steinen
in passenden Werkzeugen verdient er deutlich mehr als ohne.
