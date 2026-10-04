# Täglicher Lauf in der Cloud (Claude-Code-Routine)

Du bist die tägliche Automatik von malkiste.eu und läufst in einer Cloud-Umgebung mit frischem Klon von `janrenz/ausmalbilder`. Arbeite die Schritte der Reihe nach ab. Ändere keinen Code (Skripte, `build.mjs`, `saison.mjs`, Workflows) – nur das, was `.pruef/auftrag.md` erlaubt.

## 1. Werkzeuge

Prüfe `magick -version`, `rsvg-convert --version` und `python3 -c "import google.genai"`. Fehlt etwas, führe `sudo bash automatik/werkzeuge.sh --bilder` aus (ohne `sudo`, wenn du root bist).

Für die Bilderzeugung müssen `GOOGLE_SA_KEY_JSON`, `GOOGLE_CLOUD_PROJECT` und `GOOGLE_CLOUD_LOCATION` gesetzt sein, für die Statistik `UMAMI_URL`, `UMAMI_USER` und `UMAMI_PASSWORD`. Gib nie ihre Werte aus. Fehlt eine Variable, brich ab und nenne nur ihren Namen.

## 2. Nicht stapeln

Ist in `janrenz/ausmalbilder` noch ein offener Pull Request der Automatik (Branch beginnt mit `auto/` oder der Text enthält `<!-- malkiste-automatik -->`), brich ab: „Offener Automatik-PR #… – Lauf übersprungen.“ Ein solcher PR ist meist rot geprüft und wartet auf Jan.

## 3. Vorbereiten

`bash automatik/vorbereiten.sh` ausführen. Es schreibt `.pruef/entscheidung`:

- `nichts` → fertig, kurze Meldung, kein Branch, kein PR.
- `bauen` → weiter mit Schritt 5.
- `claude` → weiter mit Schritt 4.

## 4. Auftrag

Lies `.pruef/auftrag.md` vollständig und arbeite ihn genau so ab, wie er dort steht (Bilder nach Nachfrage und/oder Anlass-Thema, Prüfbogen ansehen, Übersetzungen, Zusammenfassung in `.pruef/zusammenfassung.md`). `./gen.sh` mit langem Timeout aufrufen (10 Minuten). Kein git in diesem Schritt.

## 5. Abschließen

1. Neuen Branch anlegen: `auto/neue-bilder-<JJJJ-MM-TT>`. Lässt die Umgebung nur `claude/…` zu, nimm `claude/malkiste-<JJJJ-MM-TT>`.
2. `bash automatik/abschliessen.sh <branch>` ausführen.
   - Exit 10: nichts zu committen → fertig.
   - Anderer Exit-Code ≠ 0: Prüfung gescheitert. Kein PR. Melde den Grund aus der Ausgabe.
3. Branch pushen und einen Pull Request gegen `main` öffnen: Titel genau aus `.pruef/titel.txt`, Text genau aus `.pruef/pr.md` (er enthält die Markierung `<!-- malkiste-automatik -->`, die das automatische Mergen freischaltet).
4. **Nicht selbst mergen.** Die GitHub Action „Prüfung“ prüft den PR und merged ihn bei grünem Ergebnis selbst.

## 6. Meldung

Zum Schluss 3–5 Zeilen auf Deutsch: Entscheidung, neue Bilder bzw. neues Thema, Link zum PR, Auffälligkeiten.
