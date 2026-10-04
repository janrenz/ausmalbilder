#!/usr/bin/env bash
# Richtet ein frisches Ubuntu für Build und Automatik ein (GitHub-Prüfung und Cloud-Routine, als root).
# Aufruf: automatik/werkzeuge.sh [--bilder]   (--bilder installiert zusätzlich das Gemini-SDK für gen-image)
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq imagemagick librsvg2-bin >/dev/null

# Ubuntu liefert ImageMagick 6 mit gesperrter PDF-Ausgabe; der Build schreibt aber die A4-PDFs
for p in /etc/ImageMagick-6/policy.xml /etc/ImageMagick-7/policy.xml; do
  [ -f "$p" ] && sed -i -E 's#<policy domain="coder" rights="none" pattern="(PDF|PS|EPS|XPS)" ?/>##' "$p"
done

# ImageMagick 6 kennt den Befehl „magick“ nicht; gen.sh und pruefbogen.sh rufen ihn auf wie bei Version 7
if ! command -v magick >/dev/null; then
  cat > /usr/local/bin/magick <<'X'
#!/bin/sh
case "$1" in identify|montage|compare|composite|mogrify) c="$1"; shift; exec "$c" "$@";; esac
exec convert "$@"
X
  chmod +x /usr/local/bin/magick
fi

if [ "${1:-}" = "--bilder" ]; then
  pip install -q --break-system-packages google-genai 2>/dev/null || pip install -q google-genai
fi
magick -version | head -1
