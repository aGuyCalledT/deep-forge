# Balancing

Alle Zahlen stehen im Code: Inhalte in `Content.java`, Formeln in `Rules.java`, Abläufe in `Sim.java`,
`Expeditions.java` und `Market.java`. Diese Seite fasst sie zusammen. Wer eine Zahl ändert, ändert sie im Code
und hier.

## Zeit

| Was | Wert | Gedanke |
|---|---|---|
| Simulationsschritt | 60 s | Server rechnet jede Minute alle Festungen weiter |
| Offline-Nachholen | max. 7 Tage | danach friert die Festung ein |
| Lager voll (Start) | ca. 6 h | 4 Miner × 12 Erz/h gegen 500 Plätze |
| Karawane | 2–8 h hin und zurück | Stonebridge 1 h pro Weg … Emberton 4 h |
| Expedition | 2–12 h | lange Touren über Nacht |
| Überfall-Warnung | 3 h | passt zu 3–5 Besuchen am Tag |
| Erster Überfall | nach 48 h, dann alle 20–40 h | |
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
| Miner | Schicht-Grundwert (12 / 10 / 8 / 6,5 / 5 Erz/h) × Tempo × Schacht (+20 %/Stufe) × Spitzhacke (`1 + Härte × 0,05 × Qualität`, +15 % geschärft) |
| Lift | `80 × 1,35^(Stufe−1)` Erz/h |
| Lager | `500 × 1,4^(Stufe−1)` (Pilze und Bier zählen nicht) |
| Gebäudestufe | `+25 %` Tempo pro Stufe |
| Schmelzen | 180 s × Hitzefaktor des Metalls, Blasebalg bis ×2 (+7 Hitze pro Tipp, −4 pro Sekunde) |
| Legierung | 120 s × Hitzefaktor × max(1, Ausbeute/2) |
| Schmieden | 100 s × Barren × √Hitzefaktor |
| Schleifen / Gravieren / Edelstein | 90 / 150 / 150 s, Edelstein schleifen 180 s |
| Pilzfarm | 5 Pilze/h × Tempo × Stufe |
| Brauerei | 5 Bier/h aus 2,5 Pilzen |
| Verbrauch | 0,2 Pilze und 0,2 Bier pro Zwerg und Stunde (Ale Lover doppelt, Teetotaler kein Bier) |

## Qualität (Abschrecken)

`Wert = Zufall 0–45 + 1,5 × Schmieden + 3 × (Schmiedestufe − 1) + 4 × Master Smiths + 8 (Nimble Fingers) + 18 (perfekt abgeschreckt)`

| Wert | < 12 | < 32 | < 52 | < 70 | < 86 | sonst |
|---|---|---|---|---|---|---|
| Qualität | Crude ×0,6 | Common ×1 | Fine ×1,4 | Superior ×1,9 | Exceptional ×2,6 | Masterwork ×4 |

Das Abschreck-Fenster dauert 12 s. Jedes Metall hat Start und Breite des perfekten Moments (z. B. Zinn 1,5 s / 6 s,
Stahl 6 s / 3,5 s), mit 0,5 s Spielraum für Netzwerk-Verzögerung.

## Werte

- Warenwert = `Metallwert × Barren × Typfaktor × Qualität × Veredelung` (geschärft ×1,3, graviert ×1,4, Edelstein ×1,8).
- Erz ist 45 % eines Barrens wert. Legierungen sind immer mehr wert als ihre Zutaten.
- Verkauf: `Grundwert × globaler Kurs × Stadt-Nachfrage × Händlerbonus`.
  Menge: `Erlös = q × Preis × (1 − e^(−q/L)) / (q/L)`, danach Kurs × `e^(−q/L)`.
  Liquidität `L = 2000 / √Grundwert` (Kupferbarren ≈ 630, Gold ≈ 260), Waren-Kategorien 180.
- Einkauf: 25 % teurer als Verkauf, hebt den Kurs.
- Kurs: Ornstein-Uhlenbeck im Log-Raum, Rückkehr-Halbwertszeit ca. 8 h, Grenzen 0,35–3.

## Kampf

- Kraft eines Zwergs = `(4 + 1,5 × Kampf) × (1 + Angriff/8) × (1 + Rüstung/10) × Gesundheit × Stimmung × Eigenschaften`.
  Axt: `Härte × 1,6 × Qualität` (+25 % geschärft). Helm `Härte × 0,8 × Q`, Kettenhemd `Härte × 1,8 × Q`.
- Siegchance = `r² / (r² + 1)` mit `r = eigene Kraft / Gegner`, begrenzt auf 3–98 %.
- Verletzungen und Tod hängen von `r` ab; auch Sieger können sterben.
- Überfall: `15 × 1,3^(Festungsstufe−1)`. Mauern +15 pro Stufe. Tresor schützt 10 % (ohne) bis 80 %.
- Banditen: `10 + 160 × Gefahr × (1 + 0,08 × (Stufe−1))`.
- Expeditions-Gegner: `Gefahr × 12 × 0,7–1,25`. Empfohlene Trupp-Kraft: `Gefahr × 14`.

## Kosten

- Aufwerten: `Grundpreis × Wachstum^(Stufe−1)` Münzen, Stein × 1,3^(Stufe−1), dazu `4 + 3 × Stufe` Barren
  (bis Stufe 3 Kupfer, 4–5 Bronze, 6–8 Eisen, ab 9 Stahl).
  Wachstum: Lager, Lift, Kaserne, Mauern, Tresor, Handelsposten 1,7 · Expeditionshalle 1,75 · Taverne 1,65 · Rest 1,55–1,6.
- Weitere Werkstatt gleicher Art: Baupreis × 2,2 je vorhandener Werkstatt dieser Art.
- Schichten: Grey Veins 800 Münzen, Silver Halls 4 000, Golden Deep 15 000 + Erkundung, Crystal Abyss 50 000 + Erkundung.
- Festungsstufe: `150 × 1,5^(Stufe−1)` xp. Xp aus Verkäufen (1 pro 10 Münzen), Schmelzen, Schmieden, Expeditionen,
  Kämpfen, Ausbau.
