#!/usr/bin/env bash
# Legt alle Umgebungsvariablen der Cloud-Routine als fertigen .env-Block in die Zwischenablage, ohne sie
# anzuzeigen. Einfügen unter claude.ai/code → Umgebung „Default“ → Zahnrad → Environment variables.
# Nur im eigenen Terminal ausführen. Quellen: ~/.config/janrenz/gemini.env (inkl. Pfad zum
# Service-Account-Schlüssel) und ~/.config/malkiste/umami.env
set -euo pipefail
wert() { grep -m1 "^$1=" "$2" | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'; }
G="$HOME/.config/janrenz/gemini.env"; U="$HOME/.config/malkiste/umami.env"

block=$(
  # Der Schlüssel in einfachen Anführungszeichen: so bleiben die \n im private_key wörtlich stehen
  printf "GOOGLE_SA_KEY_JSON='%s'\n" "$(jq -c . "$(wert GOOGLE_APPLICATION_CREDENTIALS "$G")")"
  for n in GOOGLE_CLOUD_PROJECT GOOGLE_CLOUD_LOCATION GENAI_IMAGE_MODEL; do printf '%s=%s\n' "$n" "$(wert "$n" "$G")"; done
  for n in UMAMI_URL UMAMI_USER UMAMI_PASSWORD; do printf '%s=%s\n' "$n" "$(wert "$n" "$U")"; done
)
printf '%s\n' "$block" | wl-copy
echo "In der Zwischenablage: $(printf '%s\n' "$block" | cut -d= -f1 | tr '\n' ' ')"
echo "Jetzt ins Feld „Environment variables“ einfügen und speichern. Danach Enter, um die Zwischenablage zu leeren."
read -r || true
wl-copy --clear
echo "Zwischenablage geleert."
