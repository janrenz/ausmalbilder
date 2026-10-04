# Malkiste – kostenlose Ausmalbilder

Statische Seite mit gemeinfreien (CC0) Ausmalbildern für Kinder: https://janrenz.github.io/ausmalbilder/

- `katalog.mjs` – Themen, Motive, Texte und Bild-Prompts
- `gen.sh` – erzeugt fehlende Bilder in `src/bilder/` mit `gen-image` (Gemini)
- `build.mjs` – bereitet Bilder auf (Graustufen, WebP, A4-PDF, OG-Bild) und schreibt die Seite nach `docs/`
- GitHub Pages liefert `docs/` vom Branch `main` aus.

Neues Motiv: Eintrag in `katalog.mjs`, `./gen.sh`, Bild ansehen, `node build.mjs`, committen.
