// Baut die statische Seite nach docs/ (GitHub Pages, Branch main, Ordner /docs).
// Aufruf: node build.mjs   (SITE_URL=https://example.org node build.mjs für eine eigene Domain)
// Deutsch liegt im Wurzelverzeichnis, alle anderen Sprachen unter /<code>/ mit übersetzten Pfaden.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync, copyFileSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { themen } from "./katalog.mjs";
import de from "./i18n/de.mjs";

const SITE = (process.env.SITE_URL || (existsSync("CNAME") ? `https://${readFileSync("CNAME", "utf8").trim()}` : "https://janrenz.github.io/ausmalbilder")).replace(/\/$/, "");
const BASE = new URL(SITE).pathname.replace(/\/$/, "");
const NAME = "Malkiste";
const OUT = "docs";
const SRC = "src/bilder";
const HEUTE = new Date().toISOString().slice(0, 10);
const CODES = ["de", "en", "fr", "es", "it", "nl", "pl", "pt"];
const SAISON = ["halloween", "herbst", "sankt-martin", "weihnachten"];

const alleBilder = themen.flatMap((t) => t.bilder.map((b) => ({ ...b, thema: t })));

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
const veraltet = (ziel, quelle) => !existsSync(ziel) || statSync(ziel).mtimeMs < statSync(quelle).mtimeMs;
const magick = (...args) => execFileSync("magick", args, { stdio: "inherit" });
const CACHE = ".cache"; // aufbereitete Bilder bleiben zwischen Builds erhalten
mkdirSync(CACHE, { recursive: true });
for (const b of alleBilder) {
  const q = join(SRC, `${b.slug}.png`);
  if (!existsSync(q)) throw new Error(`Bild fehlt: ${q}`);
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
  const pdf = join(CACHE, `${b.slug}.pdf`);
  if (veraltet(pdf, druck)) {
    // Ohne Neuberechnen: Bild auf A4-Seitenverhältnis auffüllen, Dichte so, dass die Breite A4 füllt
    magick(druck, "-bordercolor", "white", "-border", "40", "-background", "white", "-gravity", "center",
      "-extent", "976x1380", "-units", "PixelsPerInch", "-density", "118", "-compress", "Zip", pdf);
  }
}

// ---------- HTML-Bausteine ----------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (p) => `${BASE}/${p}`;
const fuelle = (s, werte) => s.replace(/\{(\w+)\}/g, (m, k) => (k in werte ? werte[k] : m));

// `varianten`: Funktion L -> Pfad dieser Seite in Sprache L (für hreflang und Sprachwahl)
function seite(L, { pfad, titel, beschreibung, inhalt, ogBild, jsonld = [], robots, varianten }) {
  const u = L.ui;
  const kanon = `${SITE}/${pfad}`;
  const og = ogBild ? `${SITE}/${ogBild}` : `${SITE}/og.jpg`;
  const alternativen = varianten ? sprachen.map((S) => [S, varianten(S)]) : [];
  return `<!doctype html>
<html lang="${L.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<meta name="description" content="${esc(beschreibung)}">
<link rel="canonical" href="${kanon}">
${alternativen.map(([S, p]) => `<link rel="alternate" hreflang="${S.code}" href="${SITE}/${p}">`).join("\n")}
${alternativen.length ? `<link rel="alternate" hreflang="x-default" href="${SITE}/${varianten(sprachen[0])}">` : ""}
${robots ? `<meta name="robots" content="${robots}">` : ""}
<meta property="og:type" content="website">
<meta property="og:locale" content="${L.ogLocale}">
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
<a class="skip" href="#inhalt">${esc(u.skip)}</a>
<header class="kopf">
  <a class="marke" href="${url(pfadStart(L))}"><span class="klecks" aria-hidden="true">🖍️</span> ${NAME}</a>
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
  <p><strong>${NAME}</strong> – ${esc(u.fussText)}</p>
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
for (const f of readdirSync(CACHE)) copyFileSync(join(CACHE, f), join(OUT, "bilder", f));
for (const f of readdirSync("static")) copyFileSync(join("static", f), join(OUT, f));
if (existsSync("CNAME")) copyFileSync("CNAME", join(OUT, "CNAME"));
copyFileSync(join(CACHE, `${themen[0].bilder[0].slug}-og.jpg`), join(OUT, "og.jpg"));

const sitemap = []; // [varianten-Funktion]
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
  <img src="${url(`bilder/${themen[0].bilder[0].slug}.webp`)}" width="480" height="643" alt="${esc(fuelle(u.bildAlt, { alt: L.bilder[themen[0].bilder[0].slug].alt }))}" fetchpriority="high">
</section>

<section aria-labelledby="saison">
  <h2 id="saison">${esc(u.saison)}</h2>
  <ul class="raster">${SAISON.map((s) => themen.find((t) => t.slug === s)).map((t) => karte(L, t, t.bilder[0])).join("")}</ul>
</section>

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
  if (L.code === "de") sitemap.push(startV);

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
    if (L.code === "de") sitemap.push(themaV);

    t.bilder.forEach((b, i) => {
      const B = L.bilder[b.slug];
      const bk = [...tk, [B.titel, pfadBild(L, t, b)]];
      const naechstes = t.bilder[(i + 1) % t.bilder.length];
      const bildV = (S) => pfadBild(S, t, b);
      const datei = `${u.dateiname}-${B.pfad}`;
      schreibe(pfadBild(L, t, b), seite(L, {
        pfad: pfadBild(L, t, b), varianten: bildV,
        titel: `${fuelle(u.bildTitel, { titel: B.titel })} | ${NAME}`,
        beschreibung: fuelle(u.bildBeschreibung, { titel: B.titel, alt: B.alt }),
        ogBild: `bilder/${b.slug}-og.jpg`,
        jsonld: [krumenLd(bk), {
          "@context": "https://schema.org", "@type": "ImageObject", name: fuelle(u.bildH1, { titel: B.titel }), description: B.alt, inLanguage: L.code,
          contentUrl: `${SITE}/bilder/${b.slug}.png`, thumbnailUrl: `${SITE}/bilder/${b.slug}.webp`,
          license: "https://creativecommons.org/publicdomain/zero/1.0/", acquireLicensePage: `${SITE}/${pfadSeite(L, "ueber")}`,
          creditText: NAME, copyrightNotice: "CC0 1.0", encodingFormat: "image/png", width: 896, height: 1200,
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
      <a class="knopf" href="${url(`bilder/${b.slug}.pdf`)}" download="${datei}.pdf">${esc(u.pdf)}</a>
      <button class="knopf zweit" type="button" onclick="window.print()">${esc(u.drucken)}</button>
      <a class="knopf zweit" href="${url(`bilder/${b.slug}.png`)}" download="${datei}.png">PNG</a>
    </p>
    <p class="klein">${esc(u.cc0)} <a href="${ueberPfad}">${esc(u.zurNutzung)}</a></p>
    <p><a href="${url(pfadBild(L, t, naechstes))}">${esc(fuelle(u.naechstes, { titel: L.bilder[naechstes.slug].titel }))}</a></p>
  </div>
</article>
<section aria-labelledby="aehnlich"><h2 id="aehnlich">${esc(fuelle(u.mehrVon, { thema: T.name }))}</h2>
<ul class="raster">${t.bilder.filter((x) => x !== b).map((x) => karte(L, t, x)).join("")}</ul></section>`,
      }));
      if (L.code === "de") sitemap.push(bildV);
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
    if (L.code === "de" && k === "ueber") sitemap.push(seitenV);
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
${sitemap.flatMap((v) => {
  const alt = sprachen.map((S) => `<xhtml:link rel="alternate" hreflang="${S.code}" href="${SITE}/${v(S)}"/>`).join("") +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/${v(sprachen[0])}"/>`;
  const bild = alleBilder.find((b) => v(sprachen[0]).endsWith(`/${b.slug}/`));
  const img = bild ? `<image:image><image:loc>${SITE}/bilder/${bild.slug}.png</image:loc></image:image>` : "";
  return sprachen.map((S) => `<url><loc>${SITE}/${v(S)}</loc><lastmod>${HEUTE}</lastmod>${alt}${img}</url>`);
}).join("\n")}
</urlset>
`);
schreibe("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
schreibe(".nojekyll", "");

console.log(`fertig: ${sprachen.map((s) => s.code).join(", ")} · ${themen.length} Themen · ${alleBilder.length} Bilder → ${OUT}/ (${SITE})`);
