# YouTube-Shorts für den Kanal Malkiste

Die GitHub Action „YouTube“ (`.github/workflows/youtube.yml`) lädt täglich um 15:30 UTC ein Motiv als Short hoch. Sie läuft nach der Bilder-Automatik (08:00 UTC), sodass neue Motive dann schon gemergt und auf malkiste.eu sind. Claude ist dafür nicht nötig: Video, Titel und Beschreibung entstehen aus `katalog.mjs`.

- `video.mjs <slug>`: Short mit 1080×1920 Pixeln und 19 Sekunden Länge. Das Ausmalbild füllt sich Fläche für Fläche wie mit dem Farbeimer, am Ende erscheint eine Tafel mit „malkiste.eu“. Mandalas und Zentangles (`stil: "erwachsen"`) bekommen je Video eine abgestimmte Palette mit 5 Farben, alle anderen Motive bunte Farben. Gleiches Motiv ergibt immer dasselbe Video.
- `angaben.mjs <slug>`: Titel, Beschreibung mit Link zur Bildseite, Stichwörter und die Einstellung „speziell für Kinder“.
- `hochladen.mjs`: wählt das nächste Motiv aus, erzeugt das Video, lädt es hoch und trägt es in `automatik/youtube.json` ein. Die Action committet die Datei auf `main`.
  - `--liste` zeigt nur die nächsten Motive, `--trocken` erzeugt nur die Videos (nach `.pruef/youtube/`), `--slug x` nimmt ein bestimmtes Motiv.
  - Reihenfolge: zuerst Motive aus den letzten 14 Tagen, dann immer das Thema mit den wenigsten Videos, bei Gleichstand eines aus „Passend zur Jahreszeit“.
- `anmelden.mjs`: einmalige Anmeldung am Kanal, schreibt `~/.config/malkiste/youtube.env`.

**Speziell für Kinder:** Malkiste ist kein reiner Kinderkanal. Nur Themen ohne `stil` (Kinder ab 3) werden als „speziell für Kinder“ hochgeladen. `detail` (ab 8) und `erwachsen` bleiben „nicht speziell für Kinder“. Die Voreinstellung des Kanals in YouTube Studio steht deshalb auf „Nein“.

## Einrichten (einmalig, sobald der Kanal steht)

1. **Google-Cloud-Projekt** anlegen, z. B. `malkiste-youtube`, und dort die **YouTube Data API v3** aktivieren.
2. **OAuth-Zustimmungsbildschirm:** extern, App-Name „Malkiste“, Bereiche `youtube.upload` und `youtube.readonly`, eigene Adresse als Testnutzer. Danach **„App veröffentlichen“** (Status „In Produktion“). Im Status „Testen“ läuft der Refresh-Token nach 7 Tagen ab. Für das eigene Konto braucht es keine Google-Prüfung: Beim Anmelden auf „Erweitert → weiter zu Malkiste“ klicken.
3. **Anmeldedaten → OAuth-Client-ID → Desktop-App** anlegen und die JSON-Datei herunterladen.
4. `node automatik/youtube/anmelden.mjs ~/Downloads/client_secret_….json` ausführen. Im Browser den Kanal **Malkiste** wählen, nicht den persönlichen Kanal. Das Skript nennt danach den Kanal, für den die Anmeldung gilt.
5. Geheimnisse ins Repo:
   ```sh
   set -a; . ~/.config/malkiste/youtube.env; set +a
   for v in YOUTUBE_CLIENT_ID YOUTUBE_CLIENT_SECRET YOUTUBE_REFRESH_TOKEN; do printenv $v | gh secret set $v -R janrenz/ausmalbilder; done
   ```
6. **Testen:** Actions → YouTube → „Run workflow“ mit „trocken“ und das Video als Artefakt ansehen. Danach einmal mit `gh variable set YOUTUBE_SICHTBARKEIT -b private` hochladen.
7. **API-Prüfung (Audit) beantragen:** https://support.google.com/youtube/contact/yt_api_form. Solange ein Projekt nicht geprüft ist, sperrt YouTube jedes per API hochgeladene Video auf „privat“, und es lässt sich danach auch nicht mehr öffentlich schalten. Die Prüfung ist kostenlos und dauert erfahrungsgemäß einige Wochen.
8. Nach der Freigabe: `gh variable set YOUTUBE_SICHTBARKEIT -b public` und `gh variable set YOUTUBE_AKTIV -b 1`. Von da an läuft es täglich.

Kontingent: 10.000 Einheiten am Tag, ein Upload kostet rund 1.600. Mehr als 6 Videos am Tag gehen also nicht (`YOUTUBE_PRO_LAUF`).
