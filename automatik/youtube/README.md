# YouTube-Shorts für den Kanal Malkiste

Die GitHub Action „YouTube“ (`.github/workflows/youtube.yml`) lädt täglich um 15:30 UTC ein Motiv als **privates** Short hoch. Öffentlich wird es erst nach Jans Freigabe (siehe unten). Sie läuft nach der Bilder-Automatik (08:00 UTC), sodass neue Motive dann schon gemergt und auf malkiste.eu sind. Claude ist dafür nicht nötig: Video, Titel und Beschreibung entstehen aus `katalog.mjs`.

- `video.mjs <slug>`: Short mit 1080×1920 Pixeln und 30 Sekunden Länge. Das Ausmalbild füllt sich Fläche für Fläche wie mit dem Farbeimer, dazu ruhige, im Skript erzeugte Musik und ein leiser Ton je gefüllter Fläche. Am Ende ersetzt eine englische Tafel („Free to print or colour online · malkiste.eu“) oben den Titel, das Bild bleibt frei. Mandalas und Zentangles (`stil: "erwachsen"`) bekommen je Video eine abgestimmte Palette mit 5 Farben, alle anderen Motive bunte Farben. Gleiches Motiv ergibt immer dasselbe Video.
- `angaben.mjs <slug>`: Titel, Beschreibung mit Link zur Bildseite, Stichwörter und die Einstellung „speziell für Kinder“.
- `hochladen.mjs`: wählt das nächste Motiv aus, erzeugt das Video, lädt es hoch und trägt es in `automatik/youtube.json` ein. Die Action committet die Datei auf `main`.
  - `--liste` zeigt nur die nächsten Motive, `--trocken` erzeugt nur die Videos (nach `.pruef/youtube/`), `--slug x` nimmt ein bestimmtes Motiv.
  - Reihenfolge: zuerst Motive aus den letzten 14 Tagen, dann immer das Thema mit den wenigsten Videos, bei Gleichstand eines aus „Passend zur Jahreszeit“.
  - `--eintragen <slug> <video-id>` trägt ein von Hand hochgeladenes Video ein, damit es nicht doppelt kommt.
- `freigeben.mjs`: `--offen` listet wartende Videos, `<slug> ja|nein [grund]` trägt eine Entscheidung in `youtube.json` ein, `--anwenden` stellt alle freigegebenen Videos öffentlich.
- `anmelden.mjs`: einmalige Anmeldung am Kanal (Bereich `youtube`, nötig für das Öffentlichstellen), schreibt `~/.config/malkiste/youtube.env`.
- `zugang.mjs`: Token und Stand, gemeinsam für die Skripte.

## Freigabe

Die Entscheidung ist ein Feld in `automatik/youtube.json`: `"freigabe": "offen" | "ja" | "nein"`. Bei jedem Push auf `main`, der die Datei ändert, stellt die Action „YouTube-Freigabe“ (`.github/workflows/youtube-freigabe.yml`) alle Videos mit `"ja"` öffentlich. Die YouTube-Zugangsdaten liegen nur in GitHub. Freigeben kann man so:

- **Cowork-Aufgabe**, z. B. täglich um 18:00: Anweisung ist `automatik/youtube/freigabe.md`. Sie zeigt die wartenden Videos, fragt Jan und trägt seine Antwort ein. Sie braucht Schreibzugriff auf das Repo, aber keine YouTube-Zugangsdaten.
- **Von Hand**: `youtube.json` auf GitHub bearbeiten (geht auch am Handy) oder `node automatik/youtube/freigeben.mjs <slug> ja`, committen, pushen.

## Bis das Audit durch ist

Hochgeladene Videos würden dauerhaft privat gesperrt (siehe Schritt 7), deshalb bleibt `YOUTUBE_AKTIV` bis dahin aus. Für den Übergang Videos von Hand hochladen:

```sh
YOUTUBE_PRO_LAUF=5 node automatik/youtube/hochladen.mjs --trocken --ordner ~/Downloads/malkiste-youtube/neu
```

Das erzeugt die nächsten 5 Videos und daneben je eine `<slug>.txt` mit Titel, Beschreibung, Stichwörtern und der Einstellung „speziell für Kinder“ zum Hineinkopieren. Hochladen über YouTube Studio oder die YouTube-App, danach `node automatik/youtube/hochladen.mjs --eintragen <slug> <video-id>`, committen und pushen, damit die Automatik das Motiv später nicht noch einmal nimmt.

**Speziell für Kinder:** Malkiste ist kein reiner Kinderkanal. Nur Themen ohne `stil` (Kinder ab 3) werden als „speziell für Kinder“ hochgeladen. `detail` (ab 8) und `erwachsen` bleiben „nicht speziell für Kinder“. Die Voreinstellung des Kanals in YouTube Studio steht deshalb auf „Nein“.

## Einrichten (einmalig, sobald der Kanal steht)

1. **Google-Cloud-Projekt** anlegen, z. B. `malkiste-youtube`, und dort die **YouTube Data API v3** aktivieren.
2. **OAuth-Zustimmungsbildschirm:** extern, App-Name „Malkiste“, Bereich `youtube` (Hochladen und Öffentlichstellen), eigene Adresse als Testnutzer. Danach **„App veröffentlichen“** (Status „In Produktion“). Im Status „Testen“ läuft der Refresh-Token nach 7 Tagen ab. Für das eigene Konto braucht es keine Google-Prüfung: Beim Anmelden auf „Erweitert → weiter zu Malkiste“ klicken.
3. **Anmeldedaten → OAuth-Client-ID → Desktop-App** anlegen und die JSON-Datei herunterladen.
4. `node automatik/youtube/anmelden.mjs ~/Downloads/client_secret_….json` ausführen. Im Browser den Kanal **malkiste_eu** (@malkiste_eu) wählen, nicht den persönlichen Kanal. Das Skript nennt danach den Kanal, für den die Anmeldung gilt.
5. Geheimnisse ins Repo:
   ```sh
   set -a; . ~/.config/malkiste/youtube.env; set +a
   for v in YOUTUBE_CLIENT_ID YOUTUBE_CLIENT_SECRET YOUTUBE_REFRESH_TOKEN; do printenv $v | gh secret set $v -R janrenz/ausmalbilder; done
   ```
6. **Testen:** Actions → YouTube → „Run workflow“ mit „trocken“ und das Video als Artefakt ansehen.
7. **API-Prüfung (Audit) beantragen:** https://support.google.com/youtube/contact/yt_api_form. Solange ein Projekt nicht geprüft ist, sperrt YouTube jedes per API hochgeladene Video auf „privat“, und es lässt sich danach auch nicht mehr öffentlich schalten. Die Prüfung ist kostenlos und dauert erfahrungsgemäß einige Wochen.
8. Nach dem Audit: `gh variable set YOUTUBE_AKTIV -b 1 -R janrenz/ausmalbilder` und die Cowork-Aufgabe für die Freigabe anlegen. Von da an kommt täglich ein privates Video, das nach deinem Ja öffentlich wird. Ohne Freigabe-Schritt ginge `gh variable set YOUTUBE_SICHTBARKEIT -b public`.

Kontingent: 10.000 Einheiten am Tag, ein Upload kostet rund 1.600. Mehr als 6 Videos am Tag gehen also nicht (`YOUTUBE_PRO_LAUF`).
