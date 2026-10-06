# Malkiste – kostenlose Ausmalbilder

Statische Seite mit gemeinfreien (CC0) Ausmalbildern in 8 Sprachen: https://malkiste.eu/

- `katalog.mjs` – Themen, Motive, deutsche Texte und Bild-Prompts (`stil`: fehlt = kleine Kinder, `detail` = ab 8, `erwachsen`)
- `i18n/de.mjs` – deutsche Oberfläche und Rechtstexte; `i18n/<code>.mjs` – Übersetzungen (en, fr, es, it, nl, pl, pt) mit eigenen URL-Pfaden
- `i18n/pruefe.mjs <code>` – prüft eine Übersetzung auf Vollständigkeit, Platzhalter und gültige Pfade
- `gen.sh` – erzeugt fehlende Bilder mit `gen-image` (Gemini) in zwei Schritten: erst ein buntes Bild des Motivs (`src/farben/<slug>.jpg`), daraus die Strichzeichnung (`src/bilder/<slug>.png`, Graustufen, Linien deckungsgleich). Das bunte Bild liefert die Farben für das YouTube-Video
- `static/ausmalen.js` – Online-Ausmalen im Browser (Dialog auf jeder Bildseite, `#ausmalen` öffnet ihn direkt): Farbeimer, Filz-, Bunt-, Wachsmalstift, Radierer, Rückgängig, Speichern als PNG; nichts wird gespeichert oder hochgeladen
- `saison.mjs` – Kalender für „Passend zur Jahreszeit“ (Zeitfenster je Thema, bewegliche Feste berechnet) und für Anlass-Themen, die die Automatik anlegt, wenn sie fehlen; `node saison.mjs saison|anlaesse [JJJJ-MM-TT]` zum Nachsehen
- `logo/erzeuge.mjs` – erzeugt `static/logo.svg`, `static/favicon.svg` und `logo/stempel.svg` (Fredoka Bold als Pfade, keine Webfont); Anleitung im Kopf der Datei
- `build.mjs` – bereitet Bilder auf (WebP, A4-PDF, OG-Bild) und schreibt die Seite nach `docs/` (Deutsch in der Wurzel, andere Sprachen unter `/<code>/`, hreflang + Sitemap). Die Startseite `/` leitet Besucher von außen per Skript in ihre Browsersprache um (nicht unterstützt → Englisch), Crawler und Klicks innerhalb der Seite nicht
- GitHub Pages liefert `docs/` vom Branch `main` aus. Eigene Domain: Datei `CNAME` mit dem Domainnamen anlegen, neu bauen.

Neues Motiv: Eintrag in `katalog.mjs` und in jeder `i18n/<code>.mjs`, `./gen.sh`, Bild ansehen (keine Schrift, keine Farbe, keine echten Marken/Figuren), `node build.mjs`, committen.

## YouTube

Die GitHub Action „YouTube“ lädt täglich ein Motiv als Short auf den Kanal Malkiste hoch, das Video zeigt, wie sich das Bild Fläche für Fläche füllt. Einrichtung und Ablauf: `automatik/youtube/README.md`. Aus, bis die Repo-Variable `YOUTUBE_AKTIV` auf 1 steht.

## Automatik: neue Bilder nach Nachfrage

Läuft täglich als **Claude-Code-Routine in der Cloud** (Ablauf: `automatik/cloud.md`), der Laptop muss nicht an sein. Die PRs prüft die GitHub Action „Prüfung“ (`automatik/pruefe-pr.sh`) und merged sie bei grünem Ergebnis automatisch, sofern sie nur Inhalte ändern. Umgebung der Routine: Setup installiert ImageMagick, rsvg und google-genai; Variablen `GOOGLE_SA_KEY_JSON`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GENAI_IMAGE_MODEL`, `UMAMI_URL`, `UMAMI_USER`, `UMAMI_PASSWORD`; Netzwerk „Custom“ mit der Umami-Domain.

Reserve auf dem Laptop (gleiche Schritte):

Ein systemd-User-Timer (`automatik/systemd/`, verlinkt nach `~/.config/systemd/user/`) startet täglich `automatik/lauf.sh`:

1. `automatik/vorbereiten.sh` mit `automatik/statistik.mjs` fragt Umami nach Downloads/Drucken seit dem letzten Lauf. Unter 50 passiert nichts – außer die Jahreszeit auf der Startseite muss wechseln (dann nur neu bauen) oder ein Anlass aus `saison.mjs` steht in den nächsten 3 Wochen an und sein Thema fehlt (dann legt Claude es an).
2. `claude -p` arbeitet `automatik/auftrag.md` ab: höchstens 5 neue Motive in den gefragtesten Themen, Bilder erzeugen und prüfen, alle Sprachen ergänzen.
3. Das Skript prüft (keine entfernten Bilder, Übersetzungen vollständig, keine Farbe), baut und öffnet einen Pull Request mit Vorschau. Live erst nach dem Merge.

Läuft in einem eigenen Worktree (`~/.local/share/malkiste/automatik-worktree`), solange ein `auto/`-PR offen ist, wird übersprungen.
Logs: `~/.local/state/malkiste/logs/`. Von Hand: `automatik/lauf.sh --min 10`. Status: `systemctl --user list-timers malkiste-automatik.timer`.
