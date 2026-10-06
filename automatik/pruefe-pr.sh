#!/usr/bin/env bash
# Prüfungen für jeden Pull Request (GitHub Action „Prüfung“). Grün ist Voraussetzung für das automatische Mergen.
# Aufruf: automatik/pruefe-pr.sh <basis>   z. B. origin/main
set -euo pipefail
cd "$(dirname "$0")/.."
BASIS="${1:?Basis fehlt, z. B. origin/main}"
fehler=0
schlecht() { echo "✗ $1"; fehler=1; }
gut() { echo "✓ $1"; }

# Keine Bilder entfernen
weg=$(git diff --name-only --diff-filter=D "$BASIS"...HEAD -- src/bilder)
[ -z "$weg" ] && gut "keine Quellbilder entfernt" || schlecht "Quellbilder entfernt: $weg"

# Neue oder geänderte Quellbilder: Graustufen, 896×1200
for f in $(git diff --name-only --diff-filter=AM "$BASIS"...HEAD -- 'src/bilder/*.png'); do
  info=$(magick identify -format '%[colorspace] %wx%h' "$f")
  case "$info" in
    "Gray 896x1200") gut "$f ($info)";;
    *) schlecht "$f: $info statt Gray 896x1200";;
  esac
done

# Übersetzungen vollständig
for l in en fr es it nl pl pt sv da; do node i18n/pruefe.mjs "$l" >/dev/null && gut "Übersetzung $l" || { node i18n/pruefe.mjs "$l" || true; schlecht "Übersetzung $l"; }; done

# Skripte lassen sich laden
for f in build.mjs saison.mjs katalog.mjs static/ausmalen.js static/ausmalen-video.mjs automatik/statistik.mjs automatik/youtube/*.mjs; do node --check "$f" && gut "Syntax $f" || schlecht "Syntax $f"; done

# Bauen und vergleichen: docs/ im PR muss genau dem entsprechen, was der Build aus den Quellen macht
if node build.mjs >/dev/null; then
  gut "Build läuft"
  geaendert=$(git status --porcelain -- docs | head -20 || true) # head beendet die Pipe früh, pipefail darf hier nicht abbrechen
  [ -z "$geaendert" ] && gut "docs/ ist aktuell" || schlecht "docs/ passt nicht zu den Quellen (node build.mjs vergessen?):
$geaendert"
else
  schlecht "Build schlägt fehl"
fi

exit $fehler
