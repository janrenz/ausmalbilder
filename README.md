# Malkiste – kostenlose Ausmalbilder

Statische Seite mit gemeinfreien (CC0) Ausmalbildern in 8 Sprachen: https://janrenz.github.io/ausmalbilder/

- `katalog.mjs` – Themen, Motive, deutsche Texte und Bild-Prompts (`stil`: fehlt = kleine Kinder, `detail` = ab 8, `erwachsen`)
- `i18n/de.mjs` – deutsche Oberfläche und Rechtstexte; `i18n/<code>.mjs` – Übersetzungen (en, fr, es, it, nl, pl, pt) mit eigenen URL-Pfaden
- `i18n/pruefe.mjs <code>` – prüft eine Übersetzung auf Vollständigkeit, Platzhalter und gültige Pfade
- `gen.sh` – erzeugt fehlende Bilder in `src/bilder/` mit `gen-image` (Gemini) und speichert sie als Graustufen
- `build.mjs` – bereitet Bilder auf (WebP, A4-PDF, OG-Bild) und schreibt die Seite nach `docs/` (Deutsch in der Wurzel, andere Sprachen unter `/<code>/`, hreflang + Sitemap)
- GitHub Pages liefert `docs/` vom Branch `main` aus. Eigene Domain: Datei `CNAME` mit dem Domainnamen anlegen, neu bauen.

Neues Motiv: Eintrag in `katalog.mjs` und in jeder `i18n/<code>.mjs`, `./gen.sh`, Bild ansehen (keine Schrift, keine Farbe, keine echten Marken/Figuren), `node build.mjs`, committen.
