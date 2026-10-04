// Deutsche Oberfläche. Vorlage für alle anderen Sprachen.
// Platzhalter: {n} Anzahl Bilder, {t} Anzahl Themen, {titel} Bildtitel, {alt} Bildbeschreibung,
// {thema} Themenname, {link} Link zum Thema (HTML), {ueber} Pfad der Nutzungsseite.
// Themen- und Bildtexte kommen bei Deutsch aus katalog.mjs, die URL-Teile sind dort die slugs.
export default {
  code: "de",
  ogLocale: "de_DE",
  sprachname: "Deutsch",
  ui: {
    skip: "Zum Inhalt springen",
    navThemen: "Themen",
    alleThemen: "Alle Themen",
    sprache: "Sprache",
    startTitel: "Ausmalbilder kostenlos ausdrucken – {n} Motive für Kinder und Erwachsene",
    startBeschreibung: "{n} kostenlose Ausmalbilder zum Ausdrucken: Einhorn, Dinosaurier, Pferde, Fahrzeuge, Halloween, Weihnachten, Mandalas für Erwachsene, Autos und Mode für größere Kinder. Als A4-PDF, ohne Anmeldung.",
    heldH1: "Kostenlose Ausmalbilder zum Ausdrucken",
    heldLead: "{n} liebevoll gestaltete Ausmalbilder in {t} Themen – vom Einhorn für die Kleinsten über Autos und Raumfahrt für größere Kinder bis zu feinen Mandalas für Erwachsene. Jedes Bild gibt es als druckfertiges A4-PDF. Ohne Anmeldung, ohne Werbung, ohne Cookies.",
    themenAnsehen: "Themen ansehen",
    saison: "Passend zur Jahreszeit",
    kleineKinder: "Für Kinder von 3 bis 8",
    groessereKinder: "Für größere Kinder und Erwachsene",
    anzahl: "{n} Ausmalbilder",
    ab8: "ab 8 Jahren",
    erwachsene: "für Erwachsene",
    tippsH2: "So druckst du die Ausmalbilder",
    tipp1: "Motiv anklicken.",
    tipp2: "Auf <strong>„PDF herunterladen“</strong> klicken oder direkt <strong>„Drucken“</strong> wählen.",
    tipp3: "Im Druckdialog Papierformat <strong>A4</strong> und „An Seite anpassen“ einstellen. Graustufen reichen völlig.",
    tippsNutzung: "Alle Bilder sind eigene Motive, frei von bekannten Figuren und Marken. Du darfst sie kostenlos zu Hause, in der Kita, in der Schule und im Verein verwenden und kopieren. <a href=\"{ueber}\">Mehr zur Nutzung</a>.",
    krumenStart: "Ausmalbilder",
    themaTitel: "{titel} – kostenlos ausdrucken",
    themaBeschreibungEnde: "{n} Motive als PDF.",
    weitereThemen: "Weitere Themen",
    bildTitel: "Ausmalbild {titel} – kostenlos als PDF",
    bildBeschreibung: "Ausmalbild „{titel}“ kostenlos ausdrucken: {alt}. Druckfertig in A4 als PDF.",
    bildAlt: "Ausmalbild: {alt}",
    bildH1: "Ausmalbild: {titel}",
    bildText: "{alt}. Ein kostenloses Ausmalbild aus dem Thema {link} – zum Ausdrucken in A4.",
    pdf: "PDF herunterladen",
    drucken: "Drucken",
    cc0: "Frei verwendbar (CC0) – auch für Kita, Schule und Kopien.",
    zurNutzung: "Zur Nutzung",
    naechstes: "Nächstes Bild: {titel} →",
    mehrVon: "Mehr {thema}-Ausmalbilder",
    dateiname: "ausmalbild",
    fussText: "kostenlose Ausmalbilder zum Ausdrucken für Kinder, Eltern, Kita und Schule.",
    rechtliches: "Rechtliches",
    krumenLabel: "Brotkrumen",
    nichtGefundenTitel: "Seite nicht gefunden",
    nichtGefundenH1: "Hoppla, diese Seite gibt es nicht",
    nichtGefundenText: "Vielleicht findest du dein Motiv bei den <a href=\"{start}\">Themen</a>.",
  },
  // Rechtliche Seiten: pfad = URL-Teil, html = Inhalt. {cc0} = Link zur CC0-Lizenz in dieser Sprache.
  seiten: {
    ueber: {
      pfad: "ueber",
      nav: "Über die Bilder & Nutzung",
      titel: "Über die Bilder und ihre Nutzung",
      beschreibung: "Woher die Ausmalbilder stammen und wie du sie verwenden darfst: kostenlos, gemeinfrei (CC0), auch für Kita und Schule.",
      html: `<h1>Über die Bilder und ihre Nutzung</h1>
<h2>Darf ich die Bilder verwenden?</h2>
<p>Ja. Alle Ausmalbilder auf dieser Seite sind <strong>gemeinfrei</strong> und stehen unter <a href="{cc0}" rel="license">CC0 1.0</a>. Du darfst sie ohne Nachfrage ausdrucken, kopieren, in der Kita, in der Schule oder im Verein verteilen, verändern und weitergeben – auch ohne Quellenangabe. Über einen Link freue ich mich trotzdem.</p>
<h2>Wie sind die Bilder entstanden?</h2>
<p>Die Motive wurden mit einem KI-Bildmodell (Google Gemini) nach eigenen Beschreibungen erzeugt, anschließend von Hand gesichtet, aussortiert und für den Druck aufbereitet. Bilder mit Schrift, Logos oder Ähnlichkeit zu bekannten Figuren wurden verworfen und neu erstellt.</p>
<p>Bewusst gibt es hier <strong>keine</strong> Figuren aus Filmen, Serien oder Büchern (etwa von Disney, Paw Patrol oder Pokémon) und keine echten Automarken: Diese sind urheber- und markenrechtlich geschützt und dürfen nicht frei als Ausmalbild verbreitet werden. Stattdessen findest du eigene Figuren und frei erfundene Fahrzeuge.</p>
<h2>Für welches Alter?</h2>
<p>Die meisten Themen sind für Kinder von 3 bis 8 Jahren gezeichnet: dicke Linien, große Flächen. Mode, Autos, Raumfahrt und Technik sind detaillierter und für Kinder ab etwa 8 Jahren gedacht. Die Mandalas für Erwachsene sind sehr fein und eignen sich zum Entspannen.</p>
<h2>Fehler oder Wunschmotiv?</h2>
<p>Wenn dir ein Bild auffällt, das nicht passt, oder du dir ein Thema wünschst, schreib an <a href="mailto:kontakt@janrenz.de">kontakt@janrenz.de</a>.</p>`,
    },
    impressum: {
      pfad: "impressum",
      nav: "Impressum",
      titel: "Impressum",
      beschreibung: "Impressum der Ausmalbilder-Seite Malkiste.",
      html: `<h1>Impressum</h1>
<h2>Angaben gemäß § 5 DDG</h2>
<p>Jan Renz<br>Hans Thoma Str. 3<br>14467 Potsdam<br>Deutschland</p>
<h2>Kontakt</h2>
<p>E-Mail: <a href="mailto:kontakt@janrenz.de">kontakt@janrenz.de</a></p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>Jan Renz<br>Hans Thoma Str. 3<br>14467 Potsdam</p>
<h2>Haftung für Links</h2>
<p>Diese Seite enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden entsprechende Links umgehend entfernt.</p>`,
    },
    datenschutz: {
      pfad: "datenschutz",
      nav: "Datenschutz",
      titel: "Datenschutz",
      beschreibung: "Datenschutzhinweise: keine Cookies, anonyme Reichweitenmessung mit selbst gehostetem Umami, technisch notwendige Server-Logs beim Hoster.",
      html: `<h1>Datenschutzhinweise</h1>
<h2>Kurz gesagt</h2>
<p>Diese Seite setzt <strong>keine Cookies</strong>, zeigt keine Werbung und lädt <strong>keine Inhalte von Drittanbietern</strong> (keine externen Schriften). Für eine anonyme Reichweitenmessung nutze ich ein selbst gehostetes, cookieloses Zählskript (siehe unten). Es gibt keine Formulare und keine Anmeldung.</p>
<h2>Verantwortlicher</h2>
<p>Jan Renz, Hans Thoma Str. 3, 14467 Potsdam, Deutschland, <a href="mailto:kontakt@janrenz.de">kontakt@janrenz.de</a></p>
<h2>Hosting</h2>
<p>Diese Seite wird bei GitHub Pages gehostet: GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA. Beim Aufruf der Seite verarbeitet der Hoster in sogenannten Logfiles Daten, die dein Browser übermittelt: IP-Adresse, Datum und Uhrzeit der Anfrage, aufgerufene Adresse, Referrer, HTTP-Statuscode, übertragene Datenmenge sowie Informationen zu Browser und Betriebssystem.</p>
<p>Das ist erforderlich, um die Seite auszuliefern und ihre Stabilität und Sicherheit zu gewährleisten. Rechtsgrundlage ist das berechtigte Interesse nach Art. 6 Abs. 1 lit. f DSGVO. Ich selbst habe keinen Zugriff auf diese Logdaten und führe sie nicht mit anderen Daten zusammen.</p>
<p>GitHub ist unter dem EU-US Data Privacy Framework zertifiziert und setzt zusätzlich EU-Standardvertragsklauseln ein. Weitere Informationen: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement">Datenschutzerklärung von GitHub</a>.</p>
<h2>Reichweitenmessung mit Umami</h2>
<p>Um zu erfahren, welche Ausmalbilder gefragt sind, zähle ich Seitenaufrufe und Klicks auf „PDF herunterladen“, „Drucken“ und „PNG“ mit der Open-Source-Software Umami. Umami läuft auf einem eigenen Server (umami-wwuskowincn5xs0nx5pucyc0.uds.university), setzt <strong>keine Cookies</strong>, speichert nichts auf deinem Gerät und bildet keine Profile über mehrere Websites hinweg.</p>
<p>Erfasst werden: aufgerufene Seite, verweisende Seite, Browser, Betriebssystem, Gerätetyp, Bildschirmgröße, Sprache sowie das aus der IP-Adresse abgeleitete Land, die Region und die Stadt. Die IP-Adresse selbst wird nicht gespeichert; wiederkehrende Besuche werden nur über eine monatlich wechselnde, nicht umkehrbare Prüfsumme erkannt. Sendet dein Browser das Signal „Do Not Track“, wird nichts erfasst.</p>
<p>Rechtsgrundlage ist mein berechtigtes Interesse an einer datensparsamen Reichweitenmessung (Art. 6 Abs. 1 lit. f DSGVO). Der Statistik-Server ist über Cloudflare angebunden (Cloudflare Inc., 101 Townsend St, San Francisco, CA 94107, USA). Cloudflare verarbeitet dabei die Verbindungsdaten als Auftragsverarbeiter und ist unter dem EU-US Data Privacy Framework zertifiziert.</p>
<h2>E-Mail-Kontakt</h2>
<p>Wenn du mir eine E-Mail schreibst, verarbeite ich deine Angaben nur zur Beantwortung deiner Anfrage (Art. 6 Abs. 1 lit. f DSGVO) und lösche sie, sobald sie dafür nicht mehr nötig sind.</p>
<h2>Deine Rechte</h2>
<p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, etwa bei der Landesbeauftragten für den Datenschutz Brandenburg.</p>`,
    },
  },
};
