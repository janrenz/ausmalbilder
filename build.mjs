// Baut die statische Seite nach docs/ (GitHub Pages, Branch main, Ordner /docs).
// Aufruf: node build.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { themen } from "./katalog.mjs";

const SITE = "https://janrenz.github.io/ausmalbilder";
const BASE = "/ausmalbilder";
const NAME = "Malkiste";
const OUT = "docs";
const SRC = "src/bilder";
const HEUTE = new Date().toISOString().slice(0, 10);

const alle = themen.flatMap((t) => t.bilder.map((b) => ({ ...b, thema: t })));

// ---------- Bilder ----------
function veraltet(ziel, quelle) {
  return !existsSync(ziel) || statSync(ziel).mtimeMs < statSync(quelle).mtimeMs;
}
function magick(...args) {
  execFileSync("magick", args, { stdio: "inherit" });
}
const BILD = join(".cache"); // aufbereitete Bilder bleiben zwischen Builds erhalten
mkdirSync(BILD, { recursive: true });
for (const b of alle) {
  const q = join(SRC, `${b.slug}.png`);
  if (!existsSync(q)) throw new Error(`Bild fehlt: ${q}`);
  const druck = join(BILD, `${b.slug}.png`);
  if (veraltet(druck, q)) {
    magick(q, "-colorspace", "Gray", "-level", "15%,85%", "-strip",
      "-define", "png:color-type=0", "-define", "png:bit-depth=8", druck);
  }
  const vorschau = join(BILD, `${b.slug}.webp`);
  if (veraltet(vorschau, druck)) magick(druck, "-resize", "480x", "-quality", "78", vorschau);
  const gross = join(BILD, `${b.slug}-gross.webp`);
  if (veraltet(gross, druck)) magick(druck, "-quality", "82", gross);
  const og = join(BILD, `${b.slug}-og.jpg`);
  if (veraltet(og, druck)) {
    magick(druck, "-resize", "x630", "-background", "#fff7ec", "-gravity", "center",
      "-extent", "1200x630", "-quality", "80", og);
  }
  const pdf = join(BILD, `${b.slug}.pdf`);
  if (veraltet(pdf, druck)) {
    // A4 bei 150 dpi = 1240x1754, Bild mit Rand zentriert
    magick(druck, "-resize", "1120x1630", "-background", "white", "-gravity", "center",
      "-extent", "1240x1754", "-units", "PixelsPerInch", "-density", "150", "-compress", "Zip", pdf);
  }
}

// ---------- HTML-Bausteine ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (p) => `${BASE}/${p}`;

function seite({ pfad, titel, beschreibung, inhalt, ogBild, jsonld = [], robots }) {
  const kanon = `${SITE}/${pfad}`;
  const og = ogBild ? `${SITE}/${ogBild}` : `${SITE}/og.jpg`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
<link rel="canonical" href="${kanon}">
${robots ? `<meta name="robots" content="${robots}">` : ""}
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschreibung)}">
<meta property="og:url" content="${kanon}">
<meta property="og:image" content="${og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ff8a3d">
<link rel="icon" href="${url("favicon.svg")}" type="image/svg+xml">
<link rel="stylesheet" href="${url("stil.css")}">
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
<a class="skip" href="#inhalt">Zum Inhalt springen</a>
<header class="kopf">
  <a class="marke" href="${url("")}"><span class="klecks" aria-hidden="true">🖍️</span> ${NAME}</a>
  <nav aria-label="Themen"><ul>
    ${themen.slice(0, 8).map((t) => `<li><a href="${url(t.slug + "/")}">${esc(t.name)}</a></li>`).join("")}
    <li><a href="${url("#themen")}">Alle Themen</a></li>
  </ul></nav>
</header>
<main id="inhalt">
${inhalt}
</main>
<footer class="fuss">
  <p><strong>${NAME}</strong> – kostenlose Ausmalbilder zum Ausdrucken für Kinder, Eltern, Kita und Schule.</p>
  <nav aria-label="Rechtliches"><a href="${url("ueber/")}">Über die Bilder &amp; Nutzung</a> · <a href="${url("impressum/")}">Impressum</a> · <a href="${url("datenschutz/")}">Datenschutz</a></nav>
</footer>
</body>
</html>
`;
}

const krumen = (teile) => `<nav class="krumen" aria-label="Brotkrumen"><ol>${teile
  .map(([n, p], i) => (i === teile.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${url(p)}">${esc(n)}</a></li>`))
  .join("")}</ol></nav>`;
const krumenLd = (teile) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: teile.map(([n, p], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: `${SITE}/${p}` })),
});

const karte = (b, ladeSofort = false) => `<li class="karte"><a href="${url(`${b.thema.slug}/${b.slug}/`)}">
  <img src="${url(`bilder/${b.slug}.webp`)}" width="480" height="643" alt="Ausmalbild: ${esc(b.alt)}" ${ladeSofort ? "" : 'loading="lazy"'} decoding="async">
  <span>${esc(b.titel)}</span></a></li>`;

const themaKarte = (t) => `<li class="themakarte"><a href="${url(t.slug + "/")}">
  <img src="${url(`bilder/${t.bilder[0].slug}.webp`)}" width="480" height="643" alt="" loading="lazy" decoding="async">
  <span><strong>${esc(t.name)}</strong><small>${t.bilder.length} Ausmalbilder</small></span></a></li>`;

// ---------- Ausgabe ----------
rmSync(OUT, { recursive: true, force: true });
const schreibe = (p, inhalt) => {
  const ziel = join(OUT, p);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, inhalt);
};

mkdirSync(join(OUT, "bilder"), { recursive: true });
for (const f of readdirSync(BILD)) copyFileSync(join(BILD, f), join(OUT, "bilder", f));
for (const f of readdirSync("static")) copyFileSync(join("static", f), join(OUT, f));
copyFileSync(join(BILD, `${themen[0].bilder[0].slug}-og.jpg`), join(OUT, "og.jpg"));

// Startseite
const saison = ["halloween", "herbst", "sankt-martin", "weihnachten"].map((s) => themen.find((t) => t.slug === s));
schreibe("index.html", seite({
  pfad: "",
  titel: `Ausmalbilder kostenlos ausdrucken – ${alle.length} Motive für Kinder | ${NAME}`,
  beschreibung: `${alle.length} kostenlose Ausmalbilder für Kinder zum Ausdrucken: Einhorn, Dinosaurier, Pferde, Fahrzeuge, Halloween, Sankt Martin, Weihnachten, Mandalas und mehr. Als PDF in A4, ohne Anmeldung.`,
  jsonld: [{
    "@context": "https://schema.org", "@type": "WebSite", name: NAME, url: `${SITE}/`, inLanguage: "de",
    description: "Kostenlose Ausmalbilder für Kinder zum Ausdrucken",
  }],
  inhalt: `
<section class="held">
  <div>
    <h1>Kostenlose Ausmalbilder zum Ausdrucken</h1>
    <p class="lead">${alle.length} liebevoll gestaltete Ausmalbilder für Kinder von 3 bis 10 Jahren – in ${themen.length} Themen, vom Einhorn bis zum Feuerwehrauto. Jedes Bild gibt es als druckfertiges A4-PDF. Ohne Anmeldung, ohne Werbung, ohne Tracking.</p>
    <p><a class="knopf" href="#themen">Themen ansehen</a></p>
  </div>
  <img src="${url(`bilder/${themen[0].bilder[0].slug}.webp`)}" width="480" height="643" alt="Ausmalbild: ${esc(themen[0].bilder[0].alt)}" fetchpriority="high">
</section>

<section aria-labelledby="saison">
  <h2 id="saison">Passend zur Jahreszeit</h2>
  <ul class="raster">${saison.map((t) => karte({ ...t.bilder[0], thema: t })).join("")}</ul>
</section>

<section aria-labelledby="themen">
  <h2 id="themen">Alle Themen</h2>
  <ul class="raster themen">${themen.map(themaKarte).join("")}</ul>
</section>

<section class="text" aria-labelledby="tipps">
  <h2 id="tipps">So druckst du die Ausmalbilder</h2>
  <ol>
    <li>Motiv anklicken.</li>
    <li>Auf <strong>„PDF herunterladen“</strong> klicken oder direkt <strong>„Drucken“</strong> wählen.</li>
    <li>Im Druckdialog Papierformat <strong>A4</strong> und „An Seite anpassen“ einstellen. Graustufen reichen völlig.</li>
  </ol>
  <p>Alle Bilder sind eigene Motive, frei von bekannten Figuren und Marken. Du darfst sie kostenlos zu Hause, in der Kita, in der Schule und im Verein verwenden und kopieren. <a href="${url("ueber/")}">Mehr zur Nutzung</a>.</p>
</section>`,
}));

// Themenseiten und Bildseiten
for (const t of themen) {
  const tk = [["Ausmalbilder", ""], [t.name, `${t.slug}/`]];
  schreibe(`${t.slug}/index.html`, seite({
    pfad: `${t.slug}/`,
    titel: `${t.titel} – kostenlos ausdrucken | ${NAME}`,
    beschreibung: `${t.intro.slice(0, 150).replace(/\s+\S*$/, "")} … ${t.bilder.length} Motive als PDF.`,
    ogBild: `bilder/${t.bilder[0].slug}-og.jpg`,
    jsonld: [krumenLd(tk), {
      "@context": "https://schema.org", "@type": "CollectionPage", name: t.titel, url: `${SITE}/${t.slug}/`, inLanguage: "de",
      hasPart: t.bilder.map((b) => ({ "@type": "ImageObject", name: b.titel, contentUrl: `${SITE}/bilder/${b.slug}.png`, url: `${SITE}/${t.slug}/${b.slug}/` })),
    }],
    inhalt: `${krumen(tk)}
<h1>${esc(t.titel)}</h1>
<p class="lead">${esc(t.intro)}</p>
<ul class="raster">${t.bilder.map((b, i) => karte({ ...b, thema: t }, i < 3)).join("")}</ul>
<section aria-labelledby="mehr"><h2 id="mehr">Weitere Themen</h2>
<ul class="raster themen">${themen.filter((x) => x !== t).slice(0, 4).map(themaKarte).join("")}</ul></section>`,
  }));

  t.bilder.forEach((b, i) => {
    const bk = [...tk, [b.titel, `${t.slug}/${b.slug}/`]];
    const naechstes = t.bilder[(i + 1) % t.bilder.length];
    schreibe(`${t.slug}/${b.slug}/index.html`, seite({
      pfad: `${t.slug}/${b.slug}/`,
      titel: `Ausmalbild ${b.titel} – kostenlos als PDF | ${NAME}`,
      beschreibung: `Ausmalbild „${b.titel}“ kostenlos ausdrucken: ${b.alt}. Druckfertig in A4 als PDF, ideal für Kinder und Kita.`,
      ogBild: `bilder/${b.slug}-og.jpg`,
      jsonld: [krumenLd(bk), {
        "@context": "https://schema.org", "@type": "ImageObject", name: `Ausmalbild ${b.titel}`, description: b.alt,
        contentUrl: `${SITE}/bilder/${b.slug}.png`, thumbnailUrl: `${SITE}/bilder/${b.slug}.webp`,
        license: "https://creativecommons.org/publicdomain/zero/1.0/deed.de", acquireLicensePage: `${SITE}/ueber/`,
        creditText: NAME, copyrightNotice: "Gemeinfrei (CC0 1.0)", encodingFormat: "image/png", width: 896, height: 1200,
      }],
      inhalt: `${krumen(bk)}
<article class="bild">
  <figure>
    <img class="malbild" src="${url(`bilder/${b.slug}-gross.webp`)}" width="896" height="1200" alt="Ausmalbild zum Ausdrucken: ${esc(b.alt)}" fetchpriority="high">
  </figure>
  <div class="info">
    <h1>Ausmalbild: ${esc(b.titel)}</h1>
    <p>${esc(b.alt)}. Ein kostenloses Ausmalbild aus dem Thema <a href="${url(t.slug + "/")}">${esc(t.name)}</a> – zum Ausdrucken in A4.</p>
    <p class="knoepfe">
      <a class="knopf" href="${url(`bilder/${b.slug}.pdf`)}" download="ausmalbild-${b.slug}.pdf">PDF herunterladen</a>
      <button class="knopf zweit" type="button" onclick="window.print()">Drucken</button>
      <a class="knopf zweit" href="${url(`bilder/${b.slug}.png`)}" download="ausmalbild-${b.slug}.png">PNG</a>
    </p>
    <p class="klein">Frei verwendbar (CC0) – auch für Kita, Schule und Kopien. <a href="${url("ueber/")}">Zur Nutzung</a></p>
    <p><a href="${url(`${t.slug}/${naechstes.slug}/`)}">Nächstes Bild: ${esc(naechstes.titel)} →</a></p>
  </div>
</article>
<section aria-labelledby="aehnlich"><h2 id="aehnlich">Mehr ${esc(t.name)}-Ausmalbilder</h2>
<ul class="raster">${t.bilder.filter((x) => x !== b).map((x) => karte({ ...x, thema: t })).join("")}</ul></section>`,
    }));
  });
}

// Rechtliches
const textseite = (pfad, titel, beschreibung, html, robots) =>
  schreibe(`${pfad}index.html`, seite({ pfad, titel: `${titel} | ${NAME}`, beschreibung, robots, inhalt: `<section class="text">${html}</section>` }));

textseite("ueber/", "Über die Bilder und ihre Nutzung", "Woher die Ausmalbilder stammen und wie du sie verwenden darfst: kostenlos, gemeinfrei (CC0), auch für Kita und Schule.", `
<h1>Über die Bilder und ihre Nutzung</h1>
<h2>Darf ich die Bilder verwenden?</h2>
<p>Ja. Alle Ausmalbilder auf dieser Seite sind <strong>gemeinfrei</strong> und stehen unter <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.de" rel="license">CC0 1.0</a>. Du darfst sie ohne Nachfrage ausdrucken, kopieren, in der Kita, in der Schule oder im Verein verteilen, verändern und weitergeben – auch ohne Quellenangabe. Über einen Link freue ich mich trotzdem.</p>
<h2>Wie sind die Bilder entstanden?</h2>
<p>Die Motive wurden mit einem KI-Bildmodell (Google Gemini) nach eigenen Beschreibungen erzeugt, anschließend von Hand gesichtet, aussortiert und für den Druck aufbereitet. Bilder mit Schrift, Logos oder Ähnlichkeit zu bekannten Figuren wurden verworfen und neu erstellt.</p>
<p>Bewusst gibt es hier <strong>keine</strong> Figuren aus Filmen, Serien oder Büchern (etwa von Disney, Paw Patrol oder Pokémon): Diese sind urheber- und markenrechtlich geschützt und dürfen nicht frei als Ausmalbild verbreitet werden. Stattdessen findest du eigene, freundliche Figuren zu den Themen, die Kinder lieben.</p>
<h2>Fehler oder Wunschmotiv?</h2>
<p>Wenn dir ein Bild auffällt, das nicht passt, oder du dir ein Thema wünschst, schreib an <a href="mailto:kontakt@janrenz.de">kontakt@janrenz.de</a>.</p>`);

textseite("impressum/", "Impressum", "Impressum der Ausmalbilder-Seite Malkiste.", `
<h1>Impressum</h1>
<h2>Angaben gemäß § 5 DDG</h2>
<p>Jan Renz<br>Hans Thoma Str. 3<br>14467 Potsdam</p>
<h2>Kontakt</h2>
<p>E-Mail: <a href="mailto:kontakt@janrenz.de">kontakt@janrenz.de</a></p>
<h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>Jan Renz<br>Hans Thoma Str. 3<br>14467 Potsdam</p>
<h2>Haftung für Links</h2>
<p>Diese Seite enthält Links zu externen Websites Dritter, auf deren Inhalte ich keinen Einfluss habe. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden entsprechende Links umgehend entfernt.</p>`, "noindex, follow");

textseite("datenschutz/", "Datenschutz", "Datenschutzhinweise: kein Tracking, keine Cookies, nur technisch notwendige Server-Logs beim Hoster GitHub.", `
<h1>Datenschutzhinweise</h1>
<h2>Kurz gesagt</h2>
<p>Diese Seite setzt <strong>keine Cookies</strong>, verwendet <strong>kein Tracking</strong>, keine Werbung und lädt <strong>keine Inhalte von Drittanbietern</strong> (keine externen Schriften, keine Skripte). Es gibt keine Formulare und keine Anmeldung.</p>
<h2>Verantwortlicher</h2>
<p>Jan Renz, Hans Thoma Str. 3, 14467 Potsdam, <a href="mailto:kontakt@janrenz.de">kontakt@janrenz.de</a></p>
<h2>Hosting</h2>
<p>Diese Seite wird bei GitHub Pages gehostet: GitHub Inc., 88 Colin P Kelly Jr St, San Francisco, CA 94107, USA. Beim Aufruf der Seite verarbeitet der Hoster in sogenannten Logfiles Daten, die dein Browser übermittelt: IP-Adresse, Datum und Uhrzeit der Anfrage, aufgerufene Adresse, Referrer, HTTP-Statuscode, übertragene Datenmenge sowie Informationen zu Browser und Betriebssystem.</p>
<p>Das ist erforderlich, um die Seite auszuliefern und ihre Stabilität und Sicherheit zu gewährleisten. Rechtsgrundlage ist das berechtigte Interesse nach Art. 6 Abs. 1 lit. f DSGVO. Ich selbst habe keinen Zugriff auf diese Logdaten und führe sie nicht mit anderen Daten zusammen.</p>
<p>GitHub ist unter dem EU-US Data Privacy Framework zertifiziert und setzt zusätzlich EU-Standardvertragsklauseln ein. Weitere Informationen: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement">Datenschutzerklärung von GitHub</a>.</p>
<h2>E-Mail-Kontakt</h2>
<p>Wenn du mir eine E-Mail schreibst, verarbeite ich deine Angaben nur zur Beantwortung deiner Anfrage (Art. 6 Abs. 1 lit. f DSGVO) und lösche sie, sobald sie dafür nicht mehr nötig sind.</p>
<h2>Deine Rechte</h2>
<p>Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, etwa bei der Landesbeauftragten für den Datenschutz Brandenburg.</p>`, "noindex, follow");

// 404
schreibe("404.html", seite({
  pfad: "404.html", titel: `Seite nicht gefunden | ${NAME}`, beschreibung: "Diese Seite gibt es nicht.", robots: "noindex",
  inhalt: `<section class="text"><h1>Hoppla, diese Seite gibt es nicht</h1><p>Vielleicht findest du dein Motiv bei den <a href="${url("#themen")}">Themen</a>.</p></section>`,
}));

// SEO-Dateien
const urls = ["", "ueber/", ...themen.map((t) => `${t.slug}/`)];
const bildUrls = alle.map((b) => ({ loc: `${b.thema.slug}/${b.slug}/`, bild: b }));
schreibe("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `<url><loc>${SITE}/${u}</loc><lastmod>${HEUTE}</lastmod></url>`).join("\n")}
${bildUrls.map(({ loc, bild }) => `<url><loc>${SITE}/${loc}</loc><lastmod>${HEUTE}</lastmod><image:image><image:loc>${SITE}/bilder/${bild.slug}.png</image:loc></image:image></url>`).join("\n")}
</urlset>
`);
schreibe("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
schreibe(".nojekyll", "");

console.log(`fertig: ${themen.length} Themen, ${alle.length} Bilder → ${OUT}/`);
