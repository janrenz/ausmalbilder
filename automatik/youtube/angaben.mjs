// Titel, Beschreibung, Stichwörter und Kinder-Einstellung für das YouTube-Video eines Motivs – alles aus
// katalog.mjs, ohne Claude. „Speziell für Kinder“ nur bei Themen ohne `stil` (Kinder ab 3); `detail` (ab 8)
// und `erwachsen` richten sich auch an Erwachsene und bleiben „nicht speziell für Kinder“.
// Aufruf: node automatik/youtube/angaben.mjs <slug>   (gibt die Angaben als JSON aus)
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SITE = existsSync(join(WURZEL, "CNAME")) ? `https://${readFileSync(join(WURZEL, "CNAME"), "utf8").trim()}` : "https://malkiste.eu";

export async function katalog() {
  return (await import(pathToFileURL(join(WURZEL, "katalog.mjs")).href)).themen;
}

export async function motiv(slug) {
  for (const t of await katalog()) {
    const b = t.bilder.find((x) => x.slug === slug);
    if (b) return {
      slug, titel: b.titel, alt: b.alt, thema: t.slug, themaName: t.name, stil: t.stil || "",
      url: `${SITE}/${t.slug}/${b.slug}/`, themaUrl: `${SITE}/${t.slug}/`, fuerKinder: !t.stil,
    };
  }
  throw new Error(`Motiv ${slug} steht nicht in katalog.mjs`);
}

const kuerzen = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
const hashtag = (s) => "#" + s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]/g, "");

export async function angaben(slug) {
  const m = await motiv(slug);
  const zielgruppe = m.stil === "erwachsen" ? "für Erwachsene" : m.stil === "detail" ? "für größere Kinder und Erwachsene" : "für Kinder";
  const beschreibung = [
    `${m.alt}.`,
    "",
    `Kostenlos als A4-PDF ausdrucken oder direkt im Browser ausmalen: ${m.url}`,
    `Alle Motive im Thema ${m.themaName}: ${m.themaUrl}`,
    "",
    "Malkiste: kostenlose Ausmalbilder ohne Anmeldung, ohne Werbung, ohne Cookies. Frei nutzbar zu Hause, in Kita, Schule und Verein (CC0).",
    "",
    ["#ausmalbilder", "#ausmalen", hashtag(m.themaName), m.stil === "erwachsen" ? "#ausmalbilderfuererwachsene" : "#malen"].join(" "),
  ].join("\n");
  return {
    slug,
    snippet: {
      title: kuerzen(`${m.titel} – Ausmalbild ${zielgruppe} zum Ausdrucken`, 100),
      description: kuerzen(beschreibung, 4900),
      tags: [...new Set(["Ausmalbilder", "Ausmalbild", m.themaName, m.titel, `Ausmalbilder ${zielgruppe}`, "kostenlos ausdrucken", "online ausmalen", "Malkiste"])],
      categoryId: "26", // Praktische Tipps & Styling
      defaultLanguage: "de",
      defaultAudioLanguage: "de",
    },
    status: {
      privacyStatus: process.env.YOUTUBE_SICHTBARKEIT || "public",
      selfDeclaredMadeForKids: m.fuerKinder,
      embeddable: true,
      license: "youtube",
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slug = process.argv[2];
  if (!slug) { console.error("Aufruf: node automatik/youtube/angaben.mjs <slug>"); process.exit(2); }
  console.log(JSON.stringify(await angaben(slug), null, 2));
}
