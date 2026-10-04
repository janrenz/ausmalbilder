// Lädt die nächsten Motive als YouTube-Short hoch und trägt sie in automatik/youtube.json ein.
// Reihenfolge: zuerst Motive, die in den letzten 14 Tagen dazugekommen sind (neuester Tag zuerst), dann das Thema
// mit den wenigsten Videos, damit es abwechslungsreich bleibt, bei Gleichstand „Passend zur Jahreszeit“
// (docs/saison.txt).
// Hochgeladen wird privat; öffentlich wird ein Video erst nach Jans Freigabe (freigeben.mjs, freigabe.md).
// Umgebung: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN (aus anmelden.mjs);
// optional YOUTUBE_PRO_LAUF (Standard 1), YOUTUBE_SICHTBARKEIT (private|unlisted|public, Standard private).
// Aufruf: node automatik/youtube/hochladen.mjs [--liste] [--trocken] [--ordner <pfad>] [--slug <slug>]
//   --liste     nur zeigen, welche Motive als Nächstes drankommen
//   --trocken   nur Video und <slug>.txt (Titel, Beschreibung, Stichwörter) erzeugen, nichts hochladen
//   --ordner    wohin die Videos kommen (Standard .pruef/youtube/)
//   --eintragen <slug> <video-id>   ein von Hand hochgeladenes Video eintragen, damit es nicht doppelt kommt
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { katalog, angaben } from "./angaben.mjs";
import { video } from "./video.mjs";
import { zugang, ladeStand, speichereStand } from "./zugang.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const TROCKEN = args.includes("--trocken");
const LISTE = args.includes("--liste");
const wert = (n, i = 1) => (args.includes(n) ? args[args.indexOf(n) + i] : null);
const NUR = wert("--slug");
const ANZAHL = Number(process.env.YOUTUBE_PRO_LAUF || 1);

const stand = ladeStand();

if (wert("--eintragen")) {
  const [slug, id] = [wert("--eintragen"), wert("--eintragen", 2)];
  if (!id) { console.error("Aufruf: --eintragen <slug> <video-id>"); process.exit(2); }
  await angaben(slug); // prüft, dass es das Motiv gibt
  stand.videos[slug] = { id, datum: new Date().toISOString().slice(0, 10), sichtbarkeit: "public", freigabe: "ja", vonHand: true };
  speichereStand(stand);
  console.log(`${slug} eingetragen: https://youtube.com/shorts/${id}`);
  process.exit(0);
}

async function auswahl() {
  const themen = await katalog();
  const offen = themen.flatMap((t) => t.bilder.map((b, i) => ({ slug: b.slug, thema: t.slug, i }))).filter((b) => !stand.videos[b.slug]);
  // Wann kam jedes Quellbild dazu? (ein git-Aufruf für alle)
  const neu = new Map();
  let datum = null;
  for (const z of execFileSync("git", ["-C", WURZEL, "log", "--diff-filter=A", "--name-only", "--format=@%cI", "--", "src/bilder"]).toString().split("\n")) {
    if (z.startsWith("@")) datum = Date.parse(z.slice(1));
    else if (z.startsWith("src/bilder/")) { const s = z.slice(11, -4); if (!neu.has(s)) neu.set(s, datum); }
  }
  const saison = new Set((existsSync(join(WURZEL, "docs/saison.txt")) ? readFileSync(join(WURZEL, "docs/saison.txt"), "utf8") : "").trim().split(/\s+/));
  const jeThema = {};
  for (const s of Object.keys(stand.videos)) { const t = themen.find((x) => x.bilder.some((b) => b.slug === s)); if (t) jeThema[t.slug] = (jeThema[t.slug] || 0) + 1; }
  const frisch = (b) => (neu.get(b.slug) || 0) > Date.now() - 14 * 864e5;
  const gewaehlt = [];
  for (let n = 0; n < ANZAHL && offen.length; n++) {
    const tag = (b) => (frisch(b) ? Math.floor(neu.get(b.slug) / 864e5) : 0);
    offen.sort((a, b) =>
      tag(b) - tag(a) || (jeThema[a.thema] || 0) - (jeThema[b.thema] || 0) ||
      saison.has(b.thema) - saison.has(a.thema) || a.i - b.i);
    const b = offen.shift();
    gewaehlt.push(b.slug);
    jeThema[b.thema] = (jeThema[b.thema] || 0) + 1;
  }
  return gewaehlt;
}

// Fortsetzbarer Upload (resumable): erst Angaben schicken, dann die Datei an die zurückgegebene Adresse
async function hochladen(token, datei, a) {
  const groesse = statSync(datei).size;
  const start = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(groesse) },
    body: JSON.stringify({ snippet: a.snippet, status: a.status }),
  });
  if (!start.ok) throw new Error(`Upload-Start abgelehnt (${start.status}): ${await start.text()}`);
  const ort = start.headers.get("location");
  const r = await fetch(ort, { method: "PUT", headers: { "Content-Type": "video/mp4", "Content-Length": String(groesse) }, body: readFileSync(datei) });
  const j = await r.json();
  if (!r.ok) throw new Error(`Upload abgelehnt (${r.status}): ${JSON.stringify(j.error || j)}`);
  return j;
}

const slugs = NUR ? [NUR] : await auswahl();
if (!slugs.length) { console.log("Alle Motive sind schon auf YouTube."); process.exit(0); }
if (LISTE) { console.log(slugs.join("\n")); process.exit(0); }
const ordner = wert("--ordner") ? resolve(wert("--ordner")) : join(WURZEL, ".pruef/youtube");
mkdirSync(ordner, { recursive: true });
const token = TROCKEN ? null : await zugang();
for (const slug of slugs) {
  const a = await angaben(slug);
  const datei = join(ordner, `${slug}.mp4`);
  await video(slug, datei);
  console.log(`${slug}: „${a.snippet.title}“ · ${a.status.selfDeclaredMadeForKids ? "für Kinder" : "nicht speziell für Kinder"} · ${a.status.privacyStatus}`);
  if (TROCKEN) {
    writeFileSync(join(ordner, `${slug}.txt`), [
      `TITEL\n${a.snippet.title}`, `BESCHREIBUNG\n${a.snippet.description}`, `TAGS\n${a.snippet.tags.join(", ")}`,
      `SPEZIELL FÜR KINDER\n${a.status.selfDeclaredMadeForKids ? "Ja" : "Nein"}`,
      `NACH DEM HOCHLADEN\nnode automatik/youtube/hochladen.mjs --eintragen ${slug} <video-id>`,
    ].join("\n\n") + "\n");
    console.log(`  trocken: ${datei} und ${slug}.txt`);
    continue;
  }
  const v = await hochladen(token, datei, a);
  if (v.status?.uploadStatus === "rejected") throw new Error(`YouTube hat ${slug} abgelehnt: ${v.status.rejectionReason}`);
  const sichtbarkeit = v.status?.privacyStatus;
  stand.videos[slug] = { id: v.id, datum: new Date().toISOString().slice(0, 10), sichtbarkeit, freigabe: sichtbarkeit === "public" ? "ja" : "offen" };
  speichereStand(stand);
  rmSync(datei);
  console.log(`  hochgeladen: https://youtube.com/shorts/${v.id}`);
}
