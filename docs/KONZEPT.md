# Deep Forge – Spielkonzept

Ein Idle-Aufbauspiel für Browser und Handy, für einen kleinen Kreis von Freunden. Sprache im Spiel: Englisch.
Man führt eine Zwergenfestung, die Erz abbaut, schmilzt, schmiedet, verkauft und immer tiefer gräbt.
Die Zwerge arbeiten von selbst, die wichtigen Entscheidungen trifft der Spieler.

## Rahmen

| Punkt | Entscheidung |
|---|---|
| Plattform | Browser, Handy zuerst (Daumen-Bedienung), Desktop mit Szene links und Menü rechts |
| Spieler | Freunde, Registrierung optional mit Einladungscode |
| Rhythmus | 3–5 Besuche am Tag. Lager, Karawanen, Expeditionen und Bedrohungen sind auf 2–8 Stunden ausgelegt |
| Geld | Keine Einnahmen, kein Pay-to-Win |
| PvP | Hart, mit echten Verlusten (kommt nach M2) |
| Grafik | Pixelgrafik aus Code, jede Grafik lässt sich durch ein eigenes PNG ersetzen (`docs/SPRITES.md`) |
| Technik | Java 21, Spring Boot 3, PostgreSQL, Docker Compose, statisches Frontend ohne Build-Schritt |

## Kernkreislauf

```
Mine → Lift → Lager → Schmelze → Barren → Legierung → Schmiede → Abschrecken → Ware
  → Werkstatt (schleifen, gravieren, Edelsteine) → Karawane → Stadt → Münzen → Ausbau → tiefer graben
```

1. **Mine.** Zwerge mit dem Beruf „Miner“ graben in einer freigeschalteten Schicht. Jede Schicht hat eigene Erze.
   Der **Lift** begrenzt, wie viel Erz pro Stunde nach oben kommt, das **Lager** begrenzt den Vorrat.
   Ist das Lager voll, ruht die Mine – ein Grund, regelmäßig vorbeizuschauen.
2. **Schmelze.** 2 Erz + 1 Kohle → 2 Barren. Läuft im Idle von selbst. Der **Blasebalg** heizt bis zu doppelt so
   schnell, solange man pumpt. Bleiglanz und Fahlerz liefern nebenbei Silber.
3. **Legierungen.** Barren werden erneut geschmolzen: 14 Legierungen aus den Tabellen (Bronze, Messing, Elektrum,
   Stahl …). Roheisen und Stahl brauchen Kalkstein als Flussmittel und den Bauplan „Steelmaking“.
4. **Schmiede.** Man wählt, was entsteht: Spitzhacke, Axt, Helm, Kettenhemd, Kette, Kelch, Ring, Krone.
   Nicht jedes Metall passt (Waffen brauchen harte Metalle, Schmuck Edelmetalle).
   Danach wird **abgeschreckt**: Tippt man im richtigen Glühmoment, steigt die Qualität. Sonst erledigt es der Schmied.
   Jedes Metall hat dabei eine kleine Eigenheit (Zinn früh, Stahl spät) – nur Flair, keine Hürde.
5. **Werkstätten.** Schleifstein (schärfen), Graveur, Juwelier (Edelsteine schleifen und einsetzen). Jede Stufe
   macht die Ware wertvoller oder besser.
6. **Handel.** Händler-Zwerge ziehen mit Karawanen in Städte. Man sieht beim Losschicken, was dort gesucht ist,
   aber bis zur Ankunft können sich die Preise ändern. Unterwegs drohen Banditen.
7. **Ausbau.** Alles lässt sich viele Male aufwerten. Zentrale Gebäude (Lager, Lift, Quartiere) sind teuer und
   brauchen ab Stufe 4 Bronze, ab 6 Eisen, ab 9 Stahl.

## Zwerge

- Werden mit Namen, Clan, Alter, Bart, Haut und **zwei Eigenschaften** erzeugt (z. B. *Strong Back*, *Ale Lover*,
  *Claustrophobic*, *Greedy*). Die Eigenschaften wirken sich spürbar aus.
- Sieben Fertigkeiten (Bergbau, Schmelzen, Schmieden, Handwerk, Landwirtschaft, Kampf, Handel), die durch Arbeit wachsen.
- **Berufe:** Miner, Werkstatt-Arbeiter, Krieger (Tor oder Minen-Patrouille), Händler, untätig.
  Am Anfang graben fast alle, später wandern immer mehr in Werkstätten und Wache.
- **Glück** hängt ab von Betten, Taverne, Pilzen, Bier, schönen Kelchen im Lager, Artefakten, Trauer und Belagerung.
  Glückliche Zwerge arbeiten bis zu 40 % schneller. Wer lange unglücklich ist, verlässt die Festung.
- **Zuwanderung** alle 8 Stunden, wenn Betten frei sind und die Stimmung gut ist.
- **Tod:** Verhungern, Monster in der Mine, verlorene Kämpfe, Expeditionen, Überfälle. Immer mit Vorwarnung.
  Gefallene landen in der Gedenkliste.

## Expeditionen (Schwerpunkt)

- Ein Trupp von 1–6 Zwergen zieht für 2–12 Stunden los, mit Pilzen und Bier als Proviant.
- Unterwegs passieren 3–5 Ereignisse: Kämpfe, Gefahren (Einsturz, Wasser, Schlagwetter), Funde, Stimmung –
  und **Entscheidungen** (Ader ausgraben? Seltsamen Lichtern folgen? Dem Fremden helfen?). Antwortet der Spieler
  nicht rechtzeitig, entscheidet der Anführer nach seiner Persönlichkeit.
- Ziele: Erznester (auch Erz aus tieferen Schichten), Pilzhaine, Monsterhöhlen, Ruinen (Artefakte, Baupläne),
  verschollene Bergleute (neue Zwerge), Spähtrupps zu neuen Schichten, neue Handelsrouten.
- Feste Story-Expeditionen: „The Old Smith's Cellar“ (Stahl-Bauplan), Erkundung der Schichten 4 und 5, Wege zu
  drei weiteren Städten.
- Alle 6 Stunden neue Gerüchte, sie verfallen nach 12 Stunden.

## Bedrohungen

- **Monster in der Mine** blockieren eine Schicht, bis Krieger sie töten. Krieger auf Minen-Patrouille kämpfen sofort.
  Alle 4 Stunden kann ein versteckter Bergmann sterben.
- **Überfälle** werden 3 Stunden vorher angekündigt. Verteidigung = Krieger am Tor + Mauern. Verloren:
  Diebstahl (außer was im Tresor geschützt ist), Tote und eine **Belagerung**, die alle Werkstätten stilllegt,
  bis man sie bricht oder sie nach 8 Stunden abzieht.
- **Banditen** auf jeder Karawanen-Strecke, Risiko je nach Stadt. Wachen helfen.

## Markt

- Ein globaler Kurs pro Ware für alle Spieler, der langsam schwankt und zum Normalwert zurückkehrt.
- Verkaufen drückt den Kurs, Kaufen hebt ihn. Er erholt sich über Stunden.
- Jede Stadt multipliziert mit ihrer eigenen Nachfrage, die alle 4 Stunden wechselt (2 Wünsche, 1 Überangebot).
- Waren desselben Typs teilen sich einen Kategorie-Kurs (alle Waffen, aller Schmuck …).

## Spezialisierung

Jede Festungsstufe gibt einen **Traditionspunkt** (8 Traditionen à 5 Ränge): Bergbau, Schmelzen, Schmieden, Handel,
Kampf, Expeditionen, Brauen, Transport. Frei wählbar.

## Etappen

| | Inhalt | Stand |
|---|---|---|
| M0 | Konzept, Balancing, Datenmodell, Regeln für Claude, Sprite-System | fertig |
| M1 | Login, Festung, Mine, Lift, Lager, Schmelze + Blasebalg, Legierungen, Schmiede + Abschrecken, Warteschlangen, Zwerge, Karawanen und Markt, Offline-Fortschritt, Docker | fertig |
| M2 | Expeditionen, Werkstätten und Veredelung, Glück, Wohnen, Taverne, Krieger und Ausrüstung, Monster, Überfälle und Belagerung, Banditen, Tod und Zuwanderung, Traditionen | fertig |
| M3 | PvP: Angriffe auf andere Festungen (Schnappschuss-Kampf, Reisezeit, Schild, Machtbereich), Überfälle auf fremde Karawanen | offen |
| M4 | Saisons und Prestige, Push-Benachrichtigungen, Besuchsansicht anderer Festungen | offen |
