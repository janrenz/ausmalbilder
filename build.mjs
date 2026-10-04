// Baut die statische Seite nach docs/ (GitHub Pages, Branch main, Ordner /docs).
// Aufruf: node build.mjs   (SITE_URL=https://example.org node build.mjs für eine eigene Domain)
// Deutsch liegt im Wurzelverzeichnis, alle anderen Sprachen unter /<code>/ mit übersetzten Pfaden.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync, copyFileSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { themen } from "./katalog.mjs";
import de from "./i18n/de.mjs";
import { saisonThemen } from "./saison.mjs";

const SITE = (process.env.SITE_URL || (existsSync("CNAME") ? `https://${readFileSync("CNAME", "utf8").trim()}` : "https://janrenz.github.io/ausmalbilder")).replace(/\/$/, "");
const BASE = new URL(SITE).pathname.replace(/\/$/, "");
const NAME = "Malkiste";
const OUT = "docs";
const SRC = "src/bilder";
const HEUTE = new Date().toISOString().slice(0, 10);
const CODES = ["de", "en", "fr", "es", "it", "nl", "pl", "pt"];
// Reichweitenmessung (Umami, selbst gehostet, cookielos). Ohne umami.json wird kein Skript eingebunden.
const UMAMI = existsSync("umami.json") ? JSON.parse(readFileSync("umami.json", "utf8")) : null;

// „Passend zur Jahreszeit“ kommt aus dem Kalender in saison.mjs, nach dem Datum des Builds
const SAISON = saisonThemen(themen.map((t) => t.slug), HEUTE);
const alleBilder = themen.flatMap((t) => t.bilder.map((b) => ({ ...b, thema: t })));

// lastmod für die Sitemap: letzter Commit des Quellbilds statt Build-Datum, sonst ignoriert Google das Feld
const bildDatum = {};
try {
  let d = HEUTE;
  for (const z of execFileSync("git", ["log", "--format=%cs", "--name-only", "--", SRC], { encoding: "utf8" }).split("\n")) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(z)) d = z;
    else if (z.startsWith(`${SRC}/`)) bildDatum[z.slice(SRC.length + 1, -4)] ??= d;
  }
} catch { /* kein git: alles bekommt das Build-Datum */ }
const datum = (bilder) => bilder.map((b) => bildDatum[b.slug] || HEUTE).sort().at(-1);

// ---------- Sprachen ----------
const sprachen = [];
for (const code of CODES) {
  if (code === "de") {
    sprachen.push({
      ...de,
      themen: Object.fromEntries(themen.map((t) => [t.slug, { name: t.name, titel: t.titel, intro: t.intro, pfad: t.slug }])),
      bilder: Object.fromEntries(alleBilder.map((b) => [b.slug, { titel: b.titel, alt: b.alt, pfad: b.slug }])),
    });
  } else if (existsSync(`i18n/${code}.mjs`)) {
    sprachen.push((await import(`./i18n/${code}.mjs`)).default);
  } else {
    console.warn(`Sprache ${code} fehlt noch, wird übersprungen`);
  }
}
const prefix = (L) => (L.code === "de" ? "" : `${L.code}/`);
// Pfade relativ zur Site-Wurzel, immer mit abschließendem Schrägstrich
const pfadStart = (L) => prefix(L);
const pfadThema = (L, t) => `${prefix(L)}${L.themen[t.slug].pfad}/`;
const pfadBild = (L, t, b) => `${pfadThema(L, t)}${L.bilder[b.slug].pfad}/`;
const pfadSeite = (L, k) => `${prefix(L)}${L.seiten[k].pfad}/`;

// ---------- Bilder ----------
// Lokal liegt ImageMagick 7 („magick“), in der Cloud und auf GitHub nur ImageMagick 6 („convert“)
const IM = spawnSync("magick", ["-version"]).status === 0 ? "magick" : "convert";
const magick = (...args) => execFileSync(IM, args, { stdio: "inherit" });
const rsvg = (...args) => execFileSync("rsvg-convert", args, { stdio: "inherit" });
const veraltet = (ziel, quelle) => !existsSync(ziel) || statSync(ziel).mtimeMs < statSync(quelle).mtimeMs;
const sha = (...teile) => { const h = createHash("sha256"); for (const t of teile) h.update(t); return h.digest("hex").slice(0, 16); };
const MARKE_HOEHE = 44;
// Logo (logo/erzeuge.mjs): im Kopf direkt eingebettet, der Stempel landet als Bild unter jedem Download
const LOGO = readFileSync("static/logo.svg", "utf8").trim();
const CACHE = ".cache"; // aufbereitete Bilder bleiben zwischen Builds erhalten
const STEMPEL = join(CACHE, "stempel.png");
mkdirSync(CACHE, { recursive: true });
if (veraltet(STEMPEL, "logo/stempel.svg")) rsvg("-h", "30", "logo/stempel.svg", "-o", STEMPEL);

// PDF-Metadaten: ImageMagick trägt nur sich selbst ein. Titel, Quelle (Bildseite auf malkiste.eu) und Autor kommen
// als inkrementelle Aktualisierung ans Dateiende: neues Info-Objekt, neue Querverweistabelle, Trailer mit /Prev.
// Kein Zusatzprogramm nötig, und ohne Datumsangaben bleibt die Datei bei gleichem Bild byte-gleich.
const pdfAngaben = (b) => {
  const L = sprachen.find((S) => S.code === "de");
  return {
    Title: `${L.bilder[b.slug].titel} – Ausmalbild`,
    Author: `${NAME} – ${new URL(SITE).hostname}`,
    Subject: `Kostenloses Ausmalbild von ${SITE}/${pfadBild(L, b.thema, b)}`,
    Keywords: `Ausmalbild, Malvorlage, ${L.themen[b.thema.slug].name}, ${new URL(SITE).hostname}`,
    Creator: SITE, Producer: SITE,
  };
};
const pdfText = (t) => "<FEFF" + [...t].map((z) => { const c = z.codePointAt(0);
  const e = c > 0xffff ? [0xd800 + ((c - 0x10000) >> 10), 0xdc00 + ((c - 0x10000) & 0x3ff)] : [c];
  return e.map((u) => u.toString(16).padStart(4, "0").toUpperCase()).join(""); }).join("") + ">";
function pdfMitAngaben(daten, meta) {
  const text = daten.toString("latin1");
  const prev = Number(text.match(/startxref\s+(\d+)\s+%%EOF\s*$/)[1]);
  const trailer = text.slice(text.lastIndexOf("trailer"));
  const groesse = Number(trailer.match(/\/Size\s+(\d+)/)[1]), wurzel = trailer.match(/\/Root\s+(\d+ \d+ R)/)[1];
  const kopf = text.endsWith("\n") ? "" : "\n";
  const objekt = `${groesse} 0 obj\n<< ${Object.entries(meta).map(([k, v]) => `/${k} ${pdfText(v)}`).join(" ")} >>\nendobj\n`;
  const start = daten.length + kopf.length, xref = start + objekt.length;
  const nachtrag = `${kopf}${objekt}xref\n${groesse} 1\n${String(start).padStart(10, "0")} 00000 n \ntrailer\n` +
    `<< /Size ${groesse + 1} /Root ${wurzel} /Info ${groesse} 0 R /Prev ${prev} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.concat([daten, Buffer.from(nachtrag, "latin1")]);
}

// Fingerabdruck je Bild: Quelle + Stempel + Verarbeitung. docs/bilder/quellen.json hält fest, woraus die
// veröffentlichten Dateien entstanden sind. Ein frischer Klon ohne .cache (Cloud, GitHub) übernimmt sie von dort,
// statt alle Bilder neu zu rechnen – sonst wären nach jedem Lauf alle Bilddateien geändert.
const VERARBEITUNG = sha("2", readFileSync("logo/stempel.svg"), String(MARKE_HOEHE));
const QUELLEN = join(OUT, "bilder", "quellen.json");
const veroeffentlicht = existsSync(QUELLEN) ? JSON.parse(readFileSync(QUELLEN, "utf8")) : {};
const fingerabdruck = {};
const ausgaben = (slug) => [[`${slug}.webp`, `${slug}.webp`], [`${slug}-gross.webp`, `${slug}-gross.webp`],
  [`${slug}-og.jpg`, `${slug}-og.jpg`], [`${slug}-marke.png`, `${slug}.png`], [`${slug}.pdf`, `${slug}.pdf`]]; // [Cache, docs/bilder]
for (const b of alleBilder) {
  const q = join(SRC, `${b.slug}.png`);
  if (!existsSync(q)) throw new Error(`Bild fehlt: ${q}`);
  const meta = pdfAngaben(b);
  const fp = (fingerabdruck[b.slug] = sha(readFileSync(q), VERARBEITUNG, JSON.stringify(meta)));
  const fertig = ausgaben(b.slug);
  // Unverändertes Bild: die veröffentlichte Fassung gilt, auch wenn der Cache fehlt oder anders ist
  if (veroeffentlicht[b.slug] === fp && fertig.every(([, d]) => existsSync(join(OUT, "bilder", d)))) {
    for (const [c, d] of fertig) copyFileSync(join(OUT, "bilder", d), join(CACHE, c));
    continue;
  }
  const druck = join(CACHE, `${b.slug}.png`);
  if (veraltet(druck, q)) {
    magick(q, "-colorspace", "Gray", "-level", "15%,85%", "-strip",
      "-define", "png:color-type=0", "-define", "png:bit-depth=8", druck);
  }
  const vorschau = join(CACHE, `${b.slug}.webp`);
  if (veraltet(vorschau, druck)) magick(druck, "-resize", "480x", "-quality", "78", vorschau);
  const gross = join(CACHE, `${b.slug}-gross.webp`);
  if (veraltet(gross, druck)) magick(druck, "-quality", "82", gross);
  const og = join(CACHE, `${b.slug}-og.jpg`);
  if (veraltet(og, druck)) {
    magick(druck, "-resize", "x630", "-background", "#fff7ec", "-gravity", "center",
      "-extent", "1200x630", "-quality", "80", og);
  }
  // Download-Fassung: weißer Streifen unten mit dem Stempel, damit der Hinweis nie im Motiv liegt
  const marke = join(CACHE, `${b.slug}-marke.png`);
  if (veraltet(marke, druck) || veraltet(marke, STEMPEL)) {
    magick(druck, "-background", "white", "-gravity", "south", "-splice", `0x${MARKE_HOEHE}`,
      STEMPEL, "-gravity", "south", "-geometry", "+0+7", "-composite",
      "-colorspace", "Gray", "-strip", "-define", "png:color-type=0", "-define", "png:bit-depth=8", marke);
  }
  const pdf = join(CACHE, `${b.slug}.pdf`);
  const pdfMetaDatei = join(CACHE, `${b.slug}.pdf.json`);
  if (veraltet(pdf, marke) || !existsSync(pdfMetaDatei) || readFileSync(pdfMetaDatei, "utf8") !== JSON.stringify(meta)) {
    // Ohne Neuberechnen: Bild auf A4-Seitenverhältnis auffüllen, Dichte so, dass die Breite A4 füllt
    magick(marke, "-bordercolor", "white", "-border", "40", "-background", "white", "-gravity", "center",
      "-extent", "976x1380", "-units", "PixelsPerInch", "-density", "118", "-compress", "Zip", pdf);
    writeFileSync(pdf, pdfMitAngaben(readFileSync(pdf), meta));
    writeFileSync(pdfMetaDatei, JSON.stringify(meta));
  }
}

// ---------- HTML-Bausteine ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (p) => `${BASE}/${p}`;
const fuelle = (s, werte) => s.replace(/\{(\w+)\}/g, (m, k) => (k in werte ? werte[k] : m));

// `varianten`: Funktion L -> Pfad dieser Seite in Sprache L (für hreflang und Sprachwahl)
// Nur die deutsche Startseite (zugleich x-default): wer von außen kommt, landet in seiner Browsersprache.
// Kein Speichern auf dem Gerät: wer innerhalb der Seite auf „/“ klickt (Referrer von hier), bleibt.
// Crawler werden nicht umgeleitet, damit die deutsche Startseite indexiert bleibt.
const sprachweiche = () => `<script>(function(){var z=${JSON.stringify(Object.fromEntries(sprachen.map((S) => [S.code, url(pfadStart(S))])))};
try{if(document.referrer&&new URL(document.referrer).host===location.host)return}catch(e){}
if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent))return;
var l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||""],c="en";
for(var i=0;i<l.length;i++){var k=String(l[i]).slice(0,2).toLowerCase();if(z[k]){c=k;break}}
if(c!=="de")location.replace(z[c]+location.hash)})()</script>`;

function seite(L, { pfad, titel, beschreibung, inhalt, ogBild, jsonld = [], robots, varianten, skript }) {
  const u = L.ui;
  const kanon = `${SITE}/${pfad}`;
  const og = ogBild ? `${SITE}/${ogBild}` : `${SITE}/og.jpg`;
  const alternativen = varianten ? sprachen.map((S) => [S, varianten(S)]) : [];
  return `<!doctype html>
<html lang="${L.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${L.code === "de" && pfad === "" ? sprachweiche() : ""}
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
<link rel="canonical" href="${kanon}">
${alternativen.map(([S, p]) => `<link rel="alternate" hreflang="${S.code}" href="${SITE}/${p}">`).join("\n")}
${alternativen.length ? `<link rel="alternate" hreflang="x-default" href="${SITE}/${varianten(sprachen[0])}">` : ""}
${robots ? `<meta name="robots" content="${robots}">` : ""}
<meta property="og:type" content="website">
<meta property="og:locale" content="${L.ogLocale}">
${alternativen.filter(([S]) => S !== L).map(([S]) => `<meta property="og:locale:alternate" content="${S.ogLocale}">`).join("\n")}
<meta property="og:site_name" content="${NAME}">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschreibung)}">
<meta property="og:url" content="${kanon}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(titel)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#ff8a3d">
<link rel="icon" href="${url("favicon.svg")}" type="image/svg+xml">
<link rel="icon" href="${url("favicon-32.png")}" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="${url("apple-touch-icon.png")}">
<link rel="stylesheet" href="${url("stil.css")}">
${skript ? `<script defer src="${url(skript)}"></script>` : ""}
${UMAMI ? `<script defer src="${UMAMI.url}/script.js" data-website-id="${UMAMI.id}" data-domains="${new URL(SITE).hostname}" data-do-not-track="true"></script>` : ""}
${jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
</head>
<body>
<a class="skip" href="#inhalt">${esc(u.skip)}</a>
<header class="kopf">
  <a class="marke" href="${url(pfadStart(L))}" aria-label="${NAME}">${LOGO}</a>
  <nav aria-label="${esc(u.navThemen)}"><ul>
    ${themen.slice(0, 7).map((t) => `<li><a href="${url(pfadThema(L, t))}">${esc(L.themen[t.slug].name)}</a></li>`).join("")}
    <li><a href="${url(pfadStart(L) + "#themen")}">${esc(u.alleThemen)}</a></li>
  </ul></nav>
  ${alternativen.length > 1 ? `<details class="sprachwahl"><summary><span aria-hidden="true">🌐</span> ${L.code.toUpperCase()}<span class="sr"> – ${esc(u.sprache)}</span></summary><ul>
    ${alternativen.map(([S, p]) => `<li><a href="${url(p)}" hreflang="${S.code}" lang="${S.code}"${S === L ? ' aria-current="true"' : ""}>${esc(S.sprachname)}</a></li>`).join("")}
  </ul></details>` : ""}
</header>
<main id="inhalt">
${inhalt}
</main>
<footer class="fuss">
  <p class="fusskopf"><a class="fusslogo" href="${url(pfadStart(L))}" aria-label="${NAME}">${LOGO.replaceAll("logo-m", "fuss-m")}</a> <span>${esc(u.fussText)}</span></p>
  <nav aria-label="${esc(u.rechtliches)}">${["ueber", "impressum", "datenschutz"].map((k) => `<a href="${url(pfadSeite(L, k))}">${esc(L.seiten[k].nav)}</a>`).join(" · ")}</nav>
  ${alternativen.length > 1 ? `<p class="sprachen">${alternativen.map(([S, p]) => `<a href="${url(p)}" hreflang="${S.code}" lang="${S.code}">${esc(S.sprachname)}</a>`).join(" · ")}</p>` : ""}
</footer>
</body>
</html>
`;
}

const krumen = (L, teile) => `<nav class="krumen" aria-label="${esc(L.ui.krumenLabel)}"><ol>${teile
  .map(([n, p], i) => (i === teile.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${url(p)}">${esc(n)}</a></li>`))
  .join("")}</ol></nav>`;
const krumenLd = (teile) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: teile.map(([n, p], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: `${SITE}/${p}` })),
});

// Online ausmalen: Vollbild-Dialog auf jeder Bildseite, Logik in static/ausmalen.js
const FARBEN = ["#e53935", "#fb8c00", "#fdd835", "#7cb342", "#2e7d32", "#26a69a", "#4fc3f7", "#1e88e5",
  "#283593", "#8e24aa", "#f48fb1", "#8d6e63", "#f5cba7", "#9e9e9e", "#212121", "#ffffff"];
const WERKZEUGE = [["fuellen", "🪣"], ["filzstift", "🖊️"], ["buntstift", "✏️"], ["wachsmaler", "🖍️"], ["radierer", "🧽"], ["verschieben", "✋"]];
const malDialog = (L, b, datei, ereignis, seitenUrl) => {
  const u = L.ui;
  const titel = L.bilder[b.slug].titel;
  const namen = u.farbnamen.split("|");
  const wahl = (name, wert, inhalt, an) => `<label><input type="radio" name="${name}" value="${wert}"${an ? " checked" : ""}>${inhalt}</label>`;
  return `<dialog class="malen" id="malen" aria-labelledby="malen-titel" data-bild="${url(`bilder/${b.slug}.png`)}" data-datei="${esc(`${datei}-${u.ausmalenDatei}`)}"
  data-titel="${esc(titel)}" data-seite="${esc(new URL(SITE).hostname)}" data-teilentext="${esc(fuelle(u.teilenText, { titel, url: seitenUrl }))}"
  data-videoschluss="${esc(u.videoSchluss)}" data-videoleer="${esc(u.videoLeer)}" data-videoerstellen="${esc(u.videoErstellen)}"
  data-videofertig="${esc(u.videoFertig)}" data-videofehler="${esc(u.videoFehler)}">
<div class="buehne"><div class="malflaeche"><canvas width="896" height="1200" aria-label="${esc(fuelle(u.bildAlt, { alt: L.bilder[b.slug].alt }))}"></canvas><img alt="" width="896" height="1200" draggable="false"></div>
  <div class="zoom"><button type="button" data-zoom="rein" title="${esc(u.zoomRein)}" aria-label="${esc(u.zoomRein)}">+</button><button type="button" data-zoom="raus" title="${esc(u.zoomRaus)}" aria-label="${esc(u.zoomRaus)}">−</button><button type="button" data-zoom="ganz" title="${esc(u.zoomGanz)}" aria-label="${esc(u.zoomGanz)}">⤢</button></div></div>
<form class="malleiste" method="dialog">
  <h2 id="malen-titel">${esc(u.ausmalen)}</h2>
  <fieldset class="werkzeuge"><legend class="sr">${esc(u.werkzeuge)}</legend>
    ${WERKZEUGE.map(([k, i], n) => wahl("werkzeug", k, `<span><span aria-hidden="true">${i}</span> <span class="wort">${esc(u[k])}</span></span>`, n === 0)).join("")}
  </fieldset>
  <fieldset class="groessen"><legend class="sr">${esc(u.groesse)}</legend>
    ${["klein", "mittel", "gross"].map((k) => wahl("groesse", k, `<span class="${k}" title="${esc(u[k])}"><span class="sr">${esc(u[k])}</span></span>`, k === "mittel")).join("")}
  </fieldset>
  <fieldset class="farben"><legend class="sr">${esc(u.farben)}</legend>
    ${FARBEN.map((f, i) => wahl("farbe", f, `<span style="--f:${f}" title="${esc(namen[i])}"><span class="sr">${esc(namen[i])}</span></span>`, i === 0)).join("")}
    <label class="eigene"><input type="radio" name="farbe" value="eigene"><input type="color" value="#ff8a3d" aria-label="${esc(u.eigeneFarbe)}" title="${esc(u.eigeneFarbe)}"></label>
  </fieldset>
  <div class="aktionen">
    <button class="knopf zweit" type="button" data-aktion="zurueck" disabled>↶ ${esc(u.rueckgaengig)}</button>
    <button class="knopf zweit" type="button" data-aktion="neu" data-frage="${esc(u.neuFrage)}">${esc(u.neuAnfangen)}</button>
    <button class="knopf" type="button" data-aktion="speichern" data-umami-event="ausgemalt" ${ereignis}>${esc(u.speichern)}</button>
    <button class="knopf" type="button" data-aktion="teilen" data-umami-event="bild-teilen" ${ereignis} hidden>${esc(u.teilen)}</button>
    <button class="knopf" type="button" data-aktion="video" data-umami-event="mal-video" ${ereignis}>🎬 ${esc(u.video)}</button>
    <button class="knopf zweit" value="zu">✕ ${esc(u.schliessen)}</button>
  </div>
</form>
<div class="videofenster" hidden><div class="videokarte" role="status" aria-live="polite">
  <p class="videotext"></p><progress max="1" value="0"></progress>
  <video playsinline controls hidden></video>
  <div class="videoknoepfe" hidden><button class="knopf" type="button" data-video="teilen" data-umami-event="video-teilen" ${ereignis}>${esc(u.teilen)}</button><button class="knopf zweit" type="button" data-video="speichern" data-umami-event="video-speichern" ${ereignis}>${esc(u.videoSpeichern)}</button></div>
  <button class="knopf zweit" type="button" data-video="zu">✕ ${esc(u.schliessen)}</button>
</div></div>
</dialog>`;
};

const alterLabel = (L, t) => (t.stil === "erwachsen" ? L.ui.erwachsene : t.stil ? L.ui.ab8 : "");

const karte = (L, t, b, ladeSofort = false) => `<li class="karte"><a href="${url(pfadBild(L, t, b))}">
  <img src="${url(`bilder/${b.slug}.webp`)}" width="480" height="643" alt="${esc(fuelle(L.ui.bildAlt, { alt: L.bilder[b.slug].alt }))}" ${ladeSofort ? "" : 'loading="lazy"'} decoding="async">
  <span>${esc(L.bilder[b.slug].titel)}</span></a></li>`;

const themaKarte = (L, t) => `<li class="themakarte"><a href="${url(pfadThema(L, t))}">
  <img src="${url(`bilder/${t.bilder[0].slug}.webp`)}" width="480" height="643" alt="" loading="lazy" decoding="async">
  <span><strong>${esc(L.themen[t.slug].name)}</strong><small>${esc(fuelle(L.ui.anzahl, { n: t.bilder.length }))}${alterLabel(L, t) ? ` · ${esc(alterLabel(L, t))}` : ""}</small></span></a></li>`;

// ---------- Ausgabe ----------
rmSync(OUT, { recursive: true, force: true });
const schreibe = (p, inhalt) => {
  const ziel = join(OUT, p.endsWith("/") || p === "" ? `${p}index.html` : p);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, inhalt);
};

mkdirSync(join(OUT, "bilder"), { recursive: true });
// bilder/<slug>.png ist die Download-Fassung mit Hinweis, die unmarkierte Druckvorlage bleibt im Cache
for (const b of alleBilder) for (const [c, d] of ausgaben(b.slug)) copyFileSync(join(CACHE, c), join(OUT, "bilder", d));
writeFileSync(QUELLEN, `${JSON.stringify(fingerabdruck, null, 1)}\n`);
for (const f of readdirSync("static")) copyFileSync(join("static", f), join(OUT, f));
if (existsSync("CNAME")) copyFileSync("CNAME", join(OUT, "CNAME"));
copyFileSync(join(CACHE, `${themen[0].bilder[0].slug}-og.jpg`), join(OUT, "og.jpg"));
rsvg("-w", "140", "-h", "140", "-b", "white", join("static", "favicon.svg"), "-o", join(CACHE, "apple-touch-140.png"));
magick(join(CACHE, "apple-touch-140.png"), "-background", "white", "-gravity", "center", "-extent", "180x180", "-strip", join(OUT, "apple-touch-icon.png"));
rsvg("-w", "32", "-h", "32", join("static", "favicon.svg"), "-o", join(OUT, "favicon-32.png"));
copyFileSync("logo/stempel.svg", join(OUT, "stempel.svg"));

const sitemap = []; // [varianten-Funktion, lastmod]
const kleine = themen.filter((t) => !t.stil);
const groessere = themen.filter((t) => t.stil);

for (const L of sprachen) {
  const u = L.ui;
  const n = alleBilder.length;
  const ueberPfad = url(pfadSeite(L, "ueber"));

  // Startseite
  const startV = (S) => pfadStart(S);
  schreibe(pfadStart(L), seite(L, {
    pfad: pfadStart(L), varianten: startV,
    titel: `${fuelle(u.startTitel, { n })} | ${NAME}`,
    beschreibung: fuelle(u.startBeschreibung, { n }),
    jsonld: [{ "@context": "https://schema.org", "@type": "WebSite", name: NAME, url: `${SITE}/${pfadStart(L)}`, inLanguage: L.code, description: u.heldH1 }],
    inhalt: `
<section class="held">
  <div>
    <h1>${esc(u.heldH1)}</h1>
    <p class="lead">${esc(fuelle(u.heldLead, { n, t: themen.length }))}</p>
    <p><a class="knopf" href="#themen">${esc(u.themenAnsehen)}</a></p>
  </div>
  <a class="heldbild" href="${url(pfadBild(L, themen[0], themen[0].bilder[0]))}"><img src="${url(`bilder/${themen[0].bilder[0].slug}.webp`)}" width="480" height="643" alt="${esc(fuelle(u.bildAlt, { alt: L.bilder[themen[0].bilder[0].slug].alt }))}" fetchpriority="high"></a>
</section>

${SAISON.length ? `<section aria-labelledby="saison">
  <h2 id="saison">${esc(u.saison)}</h2>
  <ul class="raster">${SAISON.map((s) => themen.find((t) => t.slug === s)).map((t) => karte(L, t, t.bilder[0])).join("")}</ul>
</section>` : ""}

<section aria-labelledby="themen">
  <h2 id="themen">${esc(u.kleineKinder)}</h2>
  <ul class="raster themen">${kleine.map((t) => themaKarte(L, t)).join("")}</ul>
</section>

<section aria-labelledby="groessere">
  <h2 id="groessere">${esc(u.groessereKinder)}</h2>
  <ul class="raster themen">${groessere.map((t) => themaKarte(L, t)).join("")}</ul>
</section>

<section class="text" aria-labelledby="tipps">
  <h2 id="tipps">${esc(u.tippsH2)}</h2>
  <ol><li>${u.tipp1}</li><li>${u.tipp2}</li><li>${u.tipp3}</li></ol>
  <p>${fuelle(u.tippsNutzung, { ueber: ueberPfad })}</p>
</section>`,
  }));
  if (L.code === "de") sitemap.push([startV, datum(alleBilder)]);

  // Themen- und Bildseiten
  for (const t of themen) {
    const T = L.themen[t.slug];
    const tk = [[u.krumenStart, pfadStart(L)], [T.name, pfadThema(L, t)]];
    const themaV = (S) => pfadThema(S, t);
    const verwandt = themen.filter((x) => x !== t && !!x.stil === !!t.stil).slice(0, 4);
    schreibe(pfadThema(L, t), seite(L, {
      pfad: pfadThema(L, t), varianten: themaV,
      titel: `${fuelle(u.themaTitel, { titel: T.titel })} | ${NAME}`,
      beschreibung: `${T.intro.length > 150 ? T.intro.slice(0, 150).replace(/\s+\S*$/, "") + " …" : T.intro} ${fuelle(u.themaBeschreibungEnde, { n: t.bilder.length })}`,
      ogBild: `bilder/${t.bilder[0].slug}-og.jpg`,
      jsonld: [krumenLd(tk), {
        "@context": "https://schema.org", "@type": "CollectionPage", name: T.titel, url: `${SITE}/${pfadThema(L, t)}`, inLanguage: L.code,
        hasPart: t.bilder.map((b) => ({ "@type": "ImageObject", name: L.bilder[b.slug].titel, contentUrl: `${SITE}/bilder/${b.slug}.png`, url: `${SITE}/${pfadBild(L, t, b)}` })),
      }],
      inhalt: `${krumen(L, tk)}
<h1>${esc(T.titel)}</h1>
<p class="lead">${esc(T.intro)}</p>
<ul class="raster">${t.bilder.map((b, i) => karte(L, t, b, i < 4)).join("")}</ul>
<section aria-labelledby="mehr"><h2 id="mehr">${esc(u.weitereThemen)}</h2>
<ul class="raster themen">${verwandt.map((x) => themaKarte(L, x)).join("")}</ul></section>`,
    }));
    if (L.code === "de") sitemap.push([themaV, datum(t.bilder)]);

    t.bilder.forEach((b, i) => {
      const B = L.bilder[b.slug];
      const bk = [...tk, [B.titel, pfadBild(L, t, b)]];
      const naechstes = t.bilder[(i + 1) % t.bilder.length];
      const bildV = (S) => pfadBild(S, t, b);
      const datei = `${u.dateiname}-${B.pfad}`;
      const ereignis = `data-umami-event-bild="${b.slug}" data-umami-event-thema="${t.slug}" data-umami-event-sprache="${L.code}"`;
      schreibe(pfadBild(L, t, b), seite(L, {
        pfad: pfadBild(L, t, b), varianten: bildV,
        titel: `${fuelle(u.bildTitel, { titel: B.titel })} | ${NAME}`,
        beschreibung: fuelle(u.bildBeschreibung, { titel: B.titel, alt: B.alt }),
        ogBild: `bilder/${b.slug}-og.jpg`, skript: "ausmalen.js",
        jsonld: [krumenLd(bk), {
          "@context": "https://schema.org", "@type": "ImageObject", name: fuelle(u.bildH1, { titel: B.titel }), description: B.alt, inLanguage: L.code,
          contentUrl: `${SITE}/bilder/${b.slug}.png`, thumbnailUrl: `${SITE}/bilder/${b.slug}.webp`,
          license: "https://creativecommons.org/publicdomain/zero/1.0/", acquireLicensePage: `${SITE}/${pfadSeite(L, "ueber")}`,
          creditText: NAME, copyrightNotice: "CC0 1.0", encodingFormat: "image/png", width: 896, height: 1200 + MARKE_HOEHE,
        }],
        inhalt: `${krumen(L, bk)}
<article class="bild">
  <figure>
    <img class="malbild" src="${url(`bilder/${b.slug}-gross.webp`)}" width="896" height="1200" alt="${esc(fuelle(u.bildAlt, { alt: B.alt }))}" fetchpriority="high">
  </figure>
  <div class="info">
    <h1>${esc(fuelle(u.bildH1, { titel: B.titel }))}</h1>
    ${alterLabel(L, t) ? `<p class="alter">${esc(alterLabel(L, t))}</p>` : ""}
    <p>${fuelle(esc(u.bildText), { alt: esc(B.alt), link: `<a href="${url(pfadThema(L, t))}">${esc(T.name)}</a>` })}</p>
    <p class="knoepfe">
      <button class="knopf" type="button" data-ausmalen data-umami-event="ausmalen" ${ereignis}>🎨 ${esc(u.ausmalen)}</button>
      <a class="knopf" href="${url(`bilder/${b.slug}.pdf`)}" download="${datei}.pdf" data-umami-event="pdf" ${ereignis}>${esc(u.pdf)}</a>
      <button class="knopf zweit" type="button" onclick="window.print()" data-umami-event="drucken" ${ereignis}>${esc(u.drucken)}</button>
      <a class="knopf zweit" href="${url(`bilder/${b.slug}.png`)}" download="${datei}.png" data-umami-event="png" ${ereignis}>PNG</a>
    </p>
    <p class="klein">${esc(u.cc0)} <a href="${ueberPfad}">${esc(u.zurNutzung)}</a></p>
    <p><a href="${url(pfadBild(L, t, naechstes))}">${esc(fuelle(u.naechstes, { titel: L.bilder[naechstes.slug].titel }))}</a></p>
  </div>
</article>
<section aria-labelledby="aehnlich"><h2 id="aehnlich">${esc(fuelle(u.mehrVon, { thema: T.name }))}</h2>
<ul class="raster">${t.bilder.filter((x) => x !== b).map((x) => karte(L, t, x)).join("")}</ul></section>
${malDialog(L, b, datei, ereignis, `${SITE}/${pfadBild(L, t, b)}`)}`,
      }));
      if (L.code === "de") sitemap.push([bildV, datum([b])]);
    });
  }

  // Rechtliches
  for (const k of ["ueber", "impressum", "datenschutz"]) {
    const s = L.seiten[k];
    const seitenV = (S) => pfadSeite(S, k);
    const html = fuelle(s.html, {
      cc0: `https://creativecommons.org/publicdomain/zero/1.0/deed.${L.code}`,
      impressum_de: url(pfadSeite(sprachen[0], "impressum")),
    });
    schreibe(pfadSeite(L, k), seite(L, {
      pfad: pfadSeite(L, k), varianten: seitenV, titel: `${s.titel} | ${NAME}`, beschreibung: s.beschreibung,
      robots: k === "ueber" ? undefined : "noindex, follow", inhalt: `<section class="text">${html}</section>`,
    }));
    if (L.code === "de" && k === "ueber") sitemap.push([seitenV, null]);
  }
}

// 404 (GitHub Pages liefert docs/404.html für alle unbekannten Pfade)
schreibe("404.html", seite(sprachen[0], {
  pfad: "404.html", titel: `${de.ui.nichtGefundenTitel} | ${NAME}`, beschreibung: de.ui.nichtGefundenTitel, robots: "noindex",
  inhalt: `<section class="text"><h1>${esc(de.ui.nichtGefundenH1)}</h1><p>${fuelle(de.ui.nichtGefundenText, { start: url("#themen") })}</p>
<ul>${sprachen.map((S) => `<li lang="${S.code}"><a href="${url(pfadStart(S))}">${esc(S.sprachname)}</a></li>`).join("")}</ul></section>`,
}));

// Sitemap mit hreflang-Alternativen: jede Sprachvariante als eigener Eintrag
schreibe("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${sitemap.flatMap(([v, lastmod]) => {
  const alt = sprachen.map((S) => `<xhtml:link rel="alternate" hreflang="${S.code}" href="${SITE}/${v(S)}"/>`).join("") +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/${v(sprachen[0])}"/>`;
  const bild = alleBilder.find((b) => v(sprachen[0]).endsWith(`/${b.slug}/`));
  const img = bild ? `<image:image><image:loc>${SITE}/bilder/${bild.slug}.png</image:loc></image:image>` : "";
  return sprachen.map((S) => `<url><loc>${SITE}/${v(S)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${alt}${img}</url>`);
}).join("\n")}
</urlset>
`);
schreibe("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
schreibe(".nojekyll", "");
schreibe("saison.txt", `${SAISON.join(" ")}\n`); // automatik/lauf.sh vergleicht damit, ob die Startseite neu gebaut werden muss

console.log(`fertig: ${sprachen.map((s) => s.code).join(", ")} · ${themen.length} Themen · ${alleBilder.length} Bilder → ${OUT}/ (${SITE})`);
