// Erzeugt die Logo-Dateien (Vorschlag 3 „Ausmal-Schrift“): umrissenes, halb ausgemaltes M plus Schriftzug
// als Umriss. Die Schrift wird in Pfade umgewandelt, damit die Seite keine fremden Schriften lädt.
// Einmalig nötig: Fredoka Bold (OFL, Google Fonts) als TTF und opentype.js, z. B.
//   cd /tmp && npm i opentype.js && curl -o fredoka-700.ttf "<ttf-URL aus fonts.googleapis.com/css2?family=Fredoka:wght@700>"
//   NODE_PATH=/tmp/node_modules node logo/erzeuge.mjs /tmp/fredoka-700.ttf
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const opentype = createRequire(import.meta.url)("opentype.js");
const font = opentype.parse(readFileSync(process.argv[2]).buffer);

const M = "M10 54V12H21L32 30L43 12H54V54H44V29L35 43H29L20 29V54Z";
const KRITZEL = "M4 50L22 8M8 58L30 10M16 58L36 14M24 60L40 24";
// Weitere Striche, die das M beim Überfahren mit der Maus fertig ausmalen (stil.css, .marke:hover).
// Ohne CSS (Favicon, <img> im Footer) bleiben sie über stroke-dashoffset unsichtbar.
const NACHMALEN = ["M30 62L46 22", "M36 64L52 24", "M40 34L56 2", "M44 64L60 26", "M50 64L64 34", "M46 36L62 4"];
// Symbol im 64er-Raster; `linie` ist die Umrissfarbe, `farbe` die Ausmalfarbe
const symbol = (id, linie, farbe, nachmalen = false) => `<clipPath id="${id}"><path d="${M}"/></clipPath>
<path d="${M}" fill="#fff"/>
${nachmalen
  ? `<g clip-path="url(#${id})" stroke="${farbe}" stroke-width="5.5" stroke-linecap="round" fill="none"><path d="${KRITZEL}"/>${
    NACHMALEN.map((d, i) => `<path class="nachmalen" style="--i:${i}" d="${d}" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`).join("")}</g>`
  : `<g clip-path="url(#${id})"><path d="${KRITZEL}" stroke="${farbe}" stroke-width="5.5" stroke-linecap="round" fill="none"/></g>`}
<path d="${M}" fill="none" stroke="${linie}" stroke-width="3" stroke-linejoin="round"/>`;

// Pfaddaten selbst schreiben: toPathData() von opentype.js gibt bei manchen Koordinaten „NaN“ aus
const n = (v) => +v.toFixed(2);
const pfad = (befehle) => befehle.map((c) =>
  c.type === "Z" ? "Z" : c.type === "Q" ? `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`
  : c.type === "C" ? `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}` : `${c.type}${n(c.x)} ${n(c.y)}`).join("");

// Schriftzug als Umriss, Grundlinie so, dass die Großbuchstaben mittig zum Symbol stehen
function wort(text, x, groesse, strich, farbe, gefuellt = false) {
  const p = font.getPath(text, x, 0, groesse);
  const b = p.getBoundingBox();
  const dy = 32 - (b.y1 + b.y2) / 2;
  const q = font.getPath(text, x, dy, groesse);
  // Erst der doppelt breite Strich, dann die weiße Füllung darüber: so bleibt nur der äußere Umriss sichtbar,
  // die Überlappungen innerhalb der Buchstaben (Fredoka hat überlappende Konturen) verschwinden
  const d = pfad(q.commands);
  if (gefuellt) return { svg: `<path d="${d}" fill="${farbe}"/>`, ende: b.x2 };
  return { svg: `<path d="${d}" fill="none" stroke="${farbe}" stroke-width="${strich * 2}" stroke-linejoin="round"/>
<path d="${d}" fill="#fff"/>`, ende: b.x2 + strich };
}

// Kopf der Website: weiße Buchstaben mit dunklem Umriss wie das M, passt so auf hellen und dunklen Grund
const w = wort("Malkiste", 76, 46, 2.2, "#2a2320");
const breite = Math.ceil(w.ende + 3);
writeFileSync("static/logo.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} 64" aria-hidden="true">
${symbol("logo-m", "#2a2320", "#ff8a3d", true)}
${w.svg}
</svg>
`);
writeFileSync("static/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
${symbol("fav-m", "#2a2320", "#ff8a3d")}
</svg>
`);
// Stempel unter den Ausdrucken: alles grau, so wie es aus dem Drucker kommt
// Gefüllt statt Umriss: in Stempelgröße laufen die Innenräume der Umrissbuchstaben sonst zu
const s = wort("malkiste.eu", 74, 40, 0, "#8a8a8a", true);
writeFileSync("logo/stempel.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(s.ende + 3)} 64">
${symbol("st-m", "#8a8a8a", "#c8c8c8")}
${s.svg}
</svg>
`);
console.log(`logo.svg ${breite}×64, favicon.svg, logo/stempel.svg`);
