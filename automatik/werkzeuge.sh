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
  # Über python3 -m pip: In der Cloud ist python3 ein 3.11 unter /usr/local/bin, das nackte pip gehört aber zu
  # /usr/bin/python3 (3.13) und installierte am python3 von gen-image.py vorbei. cryptography/cffi braucht 3.11
  # als eigene Kopie, sonst greift es auf das Debian-Paket für 3.13 zu (_cffi_backend fehlt, Anmeldung bricht ab).
  python3 -m pip --version >/dev/null 2>&1 || apt-get install -y -qq python3-pip >/dev/null
  python3 -m pip install -q --break-system-packages google-genai 2>/dev/null || python3 -m pip install -q google-genai
  python3 -m pip install -q --break-system-packages --ignore-installed cryptography cffi 2>/dev/null ||
    python3 -m pip install -q --ignore-installed cryptography cffi
  python3 -c 'import google.genai, cryptography.hazmat.bindings._rust' || { echo "google-genai für $(command -v python3) fehlt"; exit 1; }
fi
magick -version | head -1
