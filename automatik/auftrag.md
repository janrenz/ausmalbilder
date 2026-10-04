# Auftrag: neue Ausmalbilder nach Nachfrage

Du arbeitest im Repo der Seite **Malkiste** (https://malkiste.eu), kostenlose CC0-Ausmalbilder in 8 Sprachen.
Ein Skript hat dich gestartet; Git, Build und Pull Request übernimmt es nach dir. **Du committest nicht, pushst nicht und baust nicht.**

## Eingaben

- `.pruef/statistik.json` – Umami-Auswertung seit dem letzten Lauf: Downloads/Drucke pro Bild (`bilder`), pro Thema (`themen`), pro Sprache (`sprachen`), meistbesuchte Seiten, Herkunft.
- `katalog.mjs` – alle Themen und Bilder (deutsche Texte, englische Motiv-Prompts, `stil`).
- `i18n/*.mjs` – Übersetzungen (en, fr, es, it, nl, pl, pt) mit eigenen URL-Pfaden.

## Ziel

Füge **höchstens 5 neue Bilder** hinzu, dort wo die Nachfrage am größten ist:

1. Lies die Statistik. Bestimme die 2–3 stärksten Themen und die Renner-Bilder darin.
   Eine Sprache, die auffällig stark ist, ist ein Hinweis auf Motive, die dort beliebt sind (z. B. regionale Feste) – nur aufgreifen, wenn es ohne Klischees geht.
2. Denk dir neue Motive aus, die zu den Rennern passen: **ähnlich, aber nicht gleich** (anderer Blickwinkel, andere Szene, verwandtes Tier/Fahrzeug, andere Jahreszeit). Keine Dubletten zu bestehenden Bildern – prüfe die Titel im Katalog.
3. Höchstens **ein neues Thema** pro Lauf, und nur wenn die Daten klar eine Lücke zeigen (z. B. ein Bild wird stark geladen, passt aber nur halb in sein Thema). Ein neues Thema bekommt mindestens 3 Bilder (die zählen zu den 5).
4. Achte auf die Saison: Läuft der Lauf in den 6 Wochen vor einem Fest (Halloween, Sankt Martin, Weihnachten, Ostern, Fasching), darf ein Bild dafür dabei sein, auch wenn die Statistik es noch nicht zeigt.

## Umsetzung

Erlaubt sind nur diese Befehle, **genau so, ohne Pipes, Umleitungen oder `&&`**: `./gen.sh` (mit Timeout 600000 aufrufen), `automatik/pruefbogen.sh <slugs…>`, `node i18n/pruefe.mjs <code>`, `rm src/bilder/<slug>.png`, `ls …`. Dateien liest und änderst du mit Read/Edit/Write/Grep.


1. **Katalog:** Neue Bilder im passenden Thema in `katalog.mjs` anhängen. Felder: `slug` (deutsch, kleingeschrieben, Bindestriche, eindeutig im ganzen Katalog), `titel`, `alt` (beschreibt, was auf dem Bild zu sehen ist), `prompt` (Englisch, nur das Motiv; der Stil kommt aus `gen.sh`). Ein neues Thema bekommt `slug`, `name`, `titel` (mit Suchbegriff „… Ausmalbilder“), `intro` (2 Sätze), ggf. `stil`/`alter` wie bei den bestehenden Themen für größere Kinder.
2. **Bilder erzeugen:** `./gen.sh` erzeugt alle fehlenden Bilder.
3. **Prüfen:** `automatik/pruefbogen.sh <slug> …` für alle neuen Bilder, dann `.pruef/bogen.jpg` **ansehen** (Read-Tool). Verwirf ein Bild (`rm src/bilder/<slug>.png`), präzisiere den Prompt und erzeuge neu, wenn:
   - Schrift, Buchstaben, Zahlen, Schilder oder Etiketten im Bild sind (häufig: Töpfe, Läden, Kisten, Fahrzeuge),
   - der Farbtest anschlägt oder sichtbar Flächen gefüllt sind,
   - es wie ein Foto einer Buchseite aussieht statt wie eine flache Zeichnung,
   - ein Fahrzeug, Produkt oder eine Figur einem echten Modell, einer Marke oder einer bekannten Figur ähnelt (Autos: Lamborghini, Porsche, VW-Käfer, Jeep, Land Rover, Chevrolet – lieber klar erfunden oder sehr alt),
   - das Motiv zu klein auf der Seite sitzt oder nicht zum Titel passt,
   - ein rundes oder freistehendes Motiv (Mandala, Kranz, Figur) am Rand angeschnitten ist. Solche Prompts brauchen von Anfang an „the complete … fully visible inside the page with a wide white margin on all four sides, nothing cut off at the edges“, weil der Stil in `gen.sh` sonst die ganze Seite füllt,
   - der Stil nicht zum Thema passt (kleine Kinder: dicke Linien, große Flächen; `detail`: feiner und realistischer; `erwachsen`: sehr fein).
   Höchstens 3 Versuche pro Bild; klappt es dann nicht, nimm das Bild wieder aus dem Katalog.
   Wenn du einen Prompt änderst, passe auch `alt` an das an, was das Bild **tatsächlich** zeigt.
4. **Übersetzen:** Für jedes neue Bild (und ggf. Thema) Einträge in **allen sieben** `i18n/<code>.mjs` ergänzen: `bilder.<slug> = { titel, alt, pfad }` bzw. `themen.<slug> = { name, titel, intro, pfad }`. Natürliche Sprache, wie eine muttersprachliche Redakteurin für Eltern schreiben würde; `pfad` ist ein kurzer URL-Slug in der jeweiligen Sprache (nur a–z, 0–9, Bindestriche, ohne Akzente), eindeutig innerhalb des Themas. Halte dich an die Schreibweise der jeweiligen Datei.
5. **Kontrolle:** `node i18n/pruefe.mjs <code>` für alle sieben Sprachen muss „ok“ melden.

## Abschluss

Schreib `.pruef/zusammenfassung.md` (Deutsch, kurz, wird zum Text des Pull Requests):

- **Was die Zahlen zeigen** – Zeitraum, Downloads gesamt, die 3 stärksten Themen und Renner-Bilder mit Zahlen.
- **Was neu ist** – je Bild eine Zeile: Thema, Titel, `slug`, warum (welcher Renner, welche Lücke).
- **Was verworfen wurde** – Bilder, die nach 3 Versuchen nicht gut wurden, mit Grund.
- **Auffälligkeiten**, falls es welche gibt (z. B. ein Thema ganz ohne Downloads, eine Sprache, die wächst).

Wenn die Statistik keine sinnvolle Erweiterung hergibt, füge nichts hinzu und schreib das in die Zusammenfassung. Lieber kein Bild als ein schwaches.
