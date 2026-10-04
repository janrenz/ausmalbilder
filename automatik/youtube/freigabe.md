# Freigabe der YouTube-Videos (Anweisung für die Cowork-Aufgabe)

Du fragst Jan, ob die privat hochgeladenen Malkiste-Shorts öffentlich werden dürfen. Du änderst nichts anderes als die Freigabe-Felder in `automatik/youtube.json`.

1. Hol den aktuellen Stand von `janrenz/ausmalbilder` (Branch `main`) und führe `node automatik/youtube/freigeben.mjs --offen` aus. Ist die Liste leer, melde kurz „Keine Videos warten auf Freigabe.“ und hör auf.
2. Zeig Jan jedes wartende Video in einer Zeile: Titel, Link zum Video, Link zur Bildseite, „für Kinder“ ja/nein. Frag ihn, welche öffentlich werden sollen. Er kann das Video privat ansehen, weil es auf seinem Kanal liegt.
3. Warte auf seine Antwort. Rate nie und gib nichts von dir aus frei, auch nicht, wenn er länger nicht antwortet.
4. Trag seine Entscheidung je Video ein:
   - Freigegeben: `node automatik/youtube/freigeben.mjs <slug> ja`
   - Abgelehnt: `node automatik/youtube/freigeben.mjs <slug> nein <Grund in seinen Worten>`
5. Committe nur `automatik/youtube.json` mit der Nachricht „YouTube-Freigabe: <slugs>“ auf `main` und pushe. Die Action „YouTube-Freigabe“ stellt die freigegebenen Videos dann innerhalb weniger Minuten öffentlich.
6. Hat Jan bei einer Ablehnung gesagt, was am Bild nicht stimmt (zum Beispiel ein Fehler im Motiv), sag ihm, dass das Bild auch auf malkiste.eu so ist, und frag, ob es dort ersetzt werden soll. Ändere es nicht selbst.
