# Malkiste – kostenlose Ausmalbilder

Statische Seite mit gemeinfreien (CC0) Ausmalbildern in 8 Sprachen: https://malkiste.eu/

- `katalog.mjs` – Themen, Motive, deutsche Texte und Bild-Prompts (`stil`: fehlt = kleine Kinder, `detail` = ab 8, `erwachsen`)
- `i18n/de.mjs` – deutsche Oberfläche und Rechtstexte; `i18n/<code>.mjs` – Übersetzungen (en, fr, es, it, nl, pl, pt) mit eigenen URL-Pfaden
- `i18n/pruefe.mjs <code>` – prüft eine Übersetzung auf Vollständigkeit, Platzhalter und gültige Pfade
- `gen.sh` – erzeugt fehlende Bilder in `src/bilder/` mit `gen-image` (Gemini) und speichert sie als Graustufen
- `static/ausmalen.js` – Online-Ausmalen im Browser (Dialog auf jeder Bildseite, `#ausmalen` öffnet ihn direkt): Farbeimer, Filz-, Bunt-, Wachsmalstift, Radierer, Rückgängig, Speichern als PNG; nichts wird gespeichert oder hochgeladen
- `build.mjs` – bereitet Bilder auf (WebP, A4-PDF, OG-Bild) und schreibt die Seite nach `docs/` (Deutsch in der Wurzel, andere Sprachen unter `/<code>/`, hreflang + Sitemap). Die Startseite `/` leitet Besucher von außen per Skript in ihre Browsersprache um (nicht unterstützt → Englisch), Crawler und Klicks innerhalb der Seite nicht
- GitHub Pages liefert `docs/` vom Branch `main` aus. Eigene Domain: Datei `CNAME` mit dem Domainnamen anlegen, neu bauen.

Neues Motiv: Eintrag in `katalog.mjs` und in jeder `i18n/<code>.mjs`, `./gen.sh`, Bild ansehen (keine Schrift, keine Farbe, keine echten Marken/Figuren), `node build.mjs`, committen.

## Automatik: neue Bilder nach Nachfrage

Ein systemd-User-Timer (`automatik/systemd/`, verlinkt nach `~/.config/systemd/user/`) startet täglich `automatik/lauf.sh`:

1. `automatik/statistik.mjs` fragt Umami nach Downloads/Drucken seit dem letzten Lauf. Unter 50 passiert nichts.
2. `claude -p` arbeitet `automatik/auftrag.md` ab: höchstens 5 neue Motive in den gefragtesten Themen, Bilder erzeugen und prüfen, alle Sprachen ergänzen.
3. Das Skript prüft (keine entfernten Bilder, Übersetzungen vollständig, keine Farbe), baut und öffnet einen Pull Request mit Vorschau. Live erst nach dem Merge.

Läuft in einem eigenen Worktree (`~/.local/share/malkiste/automatik-worktree`), solange ein `auto/`-PR offen ist, wird übersprungen.
Logs: `~/.local/state/malkiste/logs/`. Von Hand: `automatik/lauf.sh --min 10`. Status: `systemctl --user list-timers malkiste-automatik.timer`.
