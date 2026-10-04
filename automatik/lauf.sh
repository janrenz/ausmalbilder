#!/usr/bin/env bash
# Täglicher Lauf: Statistik prüfen → Claude erweitert Katalog und Bilder → prüfen, bauen → Pull Request.
# Gestartet vom systemd-User-Timer malkiste-automatik.timer, läuft aber auch von Hand: automatik/lauf.sh [--min N]
set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$HOME/.local/share/mise/installs/claude/latest:/usr/local/bin:/usr/bin"
REPO="$HOME/code/ausmalbilder"
WT="$HOME/.local/share/malkiste/automatik-worktree"   # eigener Arbeitsbaum, berührt deine Arbeitskopie nicht
STAND="$HOME/.local/state/malkiste"
MIN="${MIN:-50}"; WEITER=0
while [ $# -gt 0 ]; do case "$1" in
  --min) MIN="$2"; shift 2;;
  --weiter) WEITER=1; shift;;   # abgebrochenen Lauf ab der Prüfung fortsetzen, ohne neuen Claude-Lauf
  *) echo "unbekannte Option $1"; exit 2;;
esac; done
export LC_ALL=C   # comm braucht Byte-Sortierung
MAX_BILDER=5
HEUTE=$(date +%F)
BRANCH="auto/neue-bilder-$HEUTE"
mkdir -p "$STAND/logs"
LOG="$STAND/logs/$HEUTE.log"
exec > >(tee -a "$LOG") 2>&1
echo "== $(date -Is) Lauf startet (Schwelle $MIN)"

melde() { notify-send -a Malkiste "Malkiste" "$1" 2>/dev/null || true; echo "$1"; }

slugs() { node -e 'import("./katalog.mjs").then(({themen})=>console.log(themen.flatMap(t=>t.bilder.map(b=>b.slug)).join("\n")))' | sort; }

if [ $WEITER -eq 1 ]; then
  cd "$WT"
  BIS=$(node -e 'console.log(Date.parse(JSON.parse(require("fs").readFileSync(".pruef/statistik.json","utf8")).zeitraum.bis))')
  sort -o .pruef/vorher.txt .pruef/vorher.txt
  echo "Setze Lauf im bestehenden Arbeitsbaum fort ($(git branch --show-current))"
else

# Nicht stapeln: solange ein automatischer PR offen ist, nichts Neues anfangen
offen=$(gh pr list -R janrenz/ausmalbilder --state open --json headRefName --jq '[.[] | select(.headRefName | startswith("auto/"))] | length')
if [ "$offen" != "0" ]; then echo "Es ist noch ein automatischer PR offen – Lauf übersprungen."; exit 0; fi

# Arbeitsbaum auf den Stand von origin/main bringen
git -C "$REPO" fetch -q origin
if [ ! -d "$WT" ]; then mkdir -p "$(dirname "$WT")"; git -C "$REPO" worktree add -q --detach "$WT" origin/main; fi
cd "$WT"
git checkout -q -B "$BRANCH" origin/main
git reset -q --hard origin/main
git clean -qfd -e .cache -e .pruef
mkdir -p .pruef && rm -f .pruef/zusammenfassung.md .pruef/bogen.jpg

# 1. Statistik – zu wenig Daten heißt: kein Claude-Lauf, keine Kosten
set +e
node automatik/statistik.mjs --min "$MIN" > .pruef/statistik.json
status=$?
set -e
if [ $status -eq 3 ]; then echo "Zu wenig neue Downloads – nichts zu tun."; exit 0; fi
[ $status -ne 0 ] && { melde "Statistik-Abfrage fehlgeschlagen (siehe $LOG)"; exit 1; }
BIS=$(date +%s000)

slugs > .pruef/vorher.txt

# 2. Claude: nur Katalog, Übersetzungen, Bilder – kein Git, kein Build, kein Netz außer gen-image
claude -p "$(cat automatik/auftrag.md)" \
  --max-turns 150 \
  --allowedTools "Read" "Edit" "Write" "Glob" "Grep" \
    "Bash(./gen.sh)" "Bash(automatik/pruefbogen.sh:*)" "Bash(node i18n/pruefe.mjs:*)" \
    "Bash(rm src/bilder/:*)" "Bash(ls:*)" \
  --disallowedTools "Bash(git:*)" "Bash(gh:*)" "Bash(curl:*)" "WebFetch" "WebSearch" \
  > .pruef/claude-ausgabe.txt || { melde "Claude-Lauf fehlgeschlagen (siehe $LOG)"; cat .pruef/claude-ausgabe.txt; exit 1; }
cat .pruef/claude-ausgabe.txt
fi

# 3. Ergebnis prüfen
slugs > .pruef/nachher.txt
mapfile -t NEU < <(comm -13 .pruef/vorher.txt .pruef/nachher.txt)
WEG=$(comm -23 .pruef/vorher.txt .pruef/nachher.txt | wc -l)
echo "Neue Bilder: ${#NEU[@]} (${NEU[*]:-})"
if [ "$WEG" -ne 0 ]; then melde "Lauf abgebrochen: Claude hat bestehende Bilder entfernt."; exit 1; fi
if [ ${#NEU[@]} -eq 0 ]; then
  echo "Keine neuen Bilder – Stand wird trotzdem fortgeschrieben."; echo "$BIS" > "$STAND/letzter-lauf"; exit 0
fi
if [ ${#NEU[@]} -gt $MAX_BILDER ]; then melde "Lauf abgebrochen: ${#NEU[@]} neue Bilder statt höchstens $MAX_BILDER."; exit 1; fi
for s in "${NEU[@]}"; do [ -f "src/bilder/$s.png" ] || { melde "Lauf abgebrochen: Bild $s fehlt."; exit 1; }; done
for l in en fr es it nl pl pt; do node i18n/pruefe.mjs "$l" || { melde "Lauf abgebrochen: Übersetzung $l unvollständig."; exit 1; }; done
automatik/pruefbogen.sh "${NEU[@]}" | tee .pruef/farbe-neu.txt
if grep -q 'FARBE IM ORIGINAL' .pruef/farbe-neu.txt; then melde "Lauf abgebrochen: Farbe in einem neuen Bild."; exit 1; fi

# 4. Bauen
node build.mjs

# 5. Pull Request
git add -A
git commit -q -m "Neue Ausmalbilder nach Nachfrage ($HEUTE): ${NEU[*]}

Automatischer Lauf, siehe Pull Request.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q -f origin "$BRANCH"

{
  [ -f .pruef/zusammenfassung.md ] && cat .pruef/zusammenfassung.md || echo "_Keine Zusammenfassung geschrieben._"
  echo
  echo "## Neue Bilder"
  echo
  for s in "${NEU[@]}"; do
    titel=$(node -e "import('./katalog.mjs').then(({themen})=>{for(const t of themen)for(const b of t.bilder)if(b.slug==='$s')console.log(t.slug+' · '+b.titel)})")
    echo "**$titel** (\`$s\`)"
    echo
    echo "<img src=\"https://github.com/janrenz/ausmalbilder/blob/$BRANCH/src/bilder/$s.png?raw=true\" width=\"300\">"
    echo
  done
  echo "---"
  echo "Prüfen: keine Schrift, keine Farbe, keine echten Marken/Figuren, passt zum Thema. Mergen veröffentlicht die Bilder auf malkiste.eu."
  echo
  echo "🤖 Generated with [Claude Code](https://claude.com/claude-code)"
} > .pruef/pr.md

url=$(gh pr create -R janrenz/ausmalbilder --head "$BRANCH" --base main \
  --title "Neue Ausmalbilder nach Nachfrage ($HEUTE, ${#NEU[@]} Bilder)" --body-file .pruef/pr.md)
echo "$BIS" > "$STAND/letzter-lauf"
melde "Neuer PR mit ${#NEU[@]} Bildern: $url"
