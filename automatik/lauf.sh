#!/usr/bin/env bash
# Täglicher Lauf auf dem Laptop (Reserve zur Cloud-Routine, siehe automatik/cloud.md):
# vorbereiten.sh → Claude erweitert Katalog und Bilder → abschliessen.sh → Pull Request.
# Von Hand: automatik/lauf.sh [--min N] [--weiter]   (--weiter: ab der Prüfung fortsetzen, ohne neuen Claude-Lauf)
set -euo pipefail

export PATH="$HOME/.local/share/mise/shims:/usr/local/bin:/usr/bin:$HOME/.local/bin"
# Claude direkt aufrufen: ~/.local/bin/claude ist ein mise-Wrapper, der sich über den PATH selbst wieder aufruft
CLAUDE="$HOME/.local/share/mise/installs/claude/latest/claude"
REPO="$HOME/code/ausmalbilder"
WT="$HOME/.local/share/malkiste/automatik-worktree"   # eigener Arbeitsbaum, berührt deine Arbeitskopie nicht
STAND="$HOME/.local/state/malkiste"
MIN="${MIN:-50}"; WEITER=0
while [ $# -gt 0 ]; do case "$1" in
  --min) MIN="$2"; shift 2;;
  --weiter) WEITER=1; shift;;
  *) echo "unbekannte Option $1"; exit 2;;
esac; done
HEUTE=$(date +%F)
BRANCH="auto/neue-bilder-$HEUTE"
mkdir -p "$STAND/logs"
LOG="$STAND/logs/$HEUTE.log"
exec > >(tee -a "$LOG") 2>&1
echo "== $(date -Is) Lauf startet (Schwelle $MIN)"
melde() { notify-send -a Malkiste "Malkiste" "$1" 2>/dev/null || true; echo "$1"; }

if [ $WEITER -eq 1 ]; then
  cd "$WT"
  echo "Setze Lauf im bestehenden Arbeitsbaum fort ($(git branch --show-current))"
else
  # Nicht stapeln: solange ein automatischer PR offen ist, nichts Neues anfangen
  offen=$(gh pr list -R janrenz/ausmalbilder --state open --json headRefName,body \
    --jq '[.[] | select((.headRefName | startswith("auto/")) or (.body | contains("<!-- malkiste-automatik -->")))] | length')
  if [ "$offen" != "0" ]; then echo "Es ist noch ein automatischer PR offen – Lauf übersprungen."; exit 0; fi

  # Arbeitsbaum auf den Stand von origin/main bringen
  git -C "$REPO" fetch -q origin
  if [ ! -d "$WT" ]; then mkdir -p "$(dirname "$WT")"; git -C "$REPO" worktree add -q --detach "$WT" origin/main; fi
  cd "$WT"
  git checkout -q -B "$BRANCH" origin/main
  git reset -q --hard origin/main
  git clean -qfd -e .cache -e .pruef

  automatik/vorbereiten.sh --min "$MIN" || { melde "Vorbereitung fehlgeschlagen (siehe $LOG)"; exit 1; }
  case "$(cat .pruef/entscheidung)" in
    nichts) echo "Nichts zu tun."; exit 0;;
    claude)
      # Claude: nur Katalog, Übersetzungen, Bilder – kein Git, kein Build, kein Netz außer gen-image
      "$CLAUDE" -p "$(cat .pruef/auftrag.md)" \
        --max-turns 150 \
        --allowedTools "Read" "Edit" "Write" "Glob" "Grep" \
          "Bash(./gen.sh)" "Bash(automatik/pruefbogen.sh:*)" "Bash(node i18n/pruefe.mjs:*)" \
          "Bash(rm src/bilder/:*)" "Bash(ls:*)" \
        --disallowedTools "Bash(git:*)" "Bash(gh:*)" "Bash(curl:*)" "WebFetch" "WebSearch" \
        > .pruef/claude-ausgabe.txt || { melde "Claude-Lauf fehlgeschlagen (siehe $LOG)"; cat .pruef/claude-ausgabe.txt; exit 1; }
      cat .pruef/claude-ausgabe.txt;;
  esac
fi

set +e
automatik/abschliessen.sh "$BRANCH"
status=$?
set -e
[ $status -eq 10 ] && exit 0
[ $status -ne 0 ] && { melde "Lauf abgebrochen (siehe $LOG)"; exit 1; }

git push -q -f origin "$BRANCH"
url=$(gh pr create -R janrenz/ausmalbilder --head "$BRANCH" --base main \
  --title "$(cat .pruef/titel.txt)" --body-file .pruef/pr.md)
melde "Neuer PR: $url (wird bei grüner Prüfung automatisch gemergt)"
