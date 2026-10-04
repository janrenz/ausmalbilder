// Freigabe der privat hochgeladenen Videos. Die Entscheidung steht in automatik/youtube.json
// („freigabe“: "offen" | "ja" | "nein", optional „grund“); diese Datei setzt sie auf YouTube um.
// Aufruf:
//   node automatik/youtube/freigeben.mjs --offen               wartende Videos als JSON (ohne Zugangsdaten)
//   node automatik/youtube/freigeben.mjs <slug> ja|nein [grund] Entscheidung eintragen (ohne Zugangsdaten)
//   node automatik/youtube/freigeben.mjs --anwenden            alle „ja“, die noch privat sind, auf öffentlich stellen
import { fileURLToPath } from "node:url";
import { angaben, motiv } from "./angaben.mjs";
import { zugang, ladeStand, speichereStand } from "./zugang.mjs";

const stand = ladeStand();
const [a1, a2, ...rest] = process.argv.slice(2);

if (a1 === "--offen") {
  const offen = [];
  for (const [slug, v] of Object.entries(stand.videos)) {
    if (v.freigabe !== "offen") continue;
    const m = await motiv(slug), a = await angaben(slug);
    offen.push({ slug, titel: a.snippet.title, video: `https://youtube.com/shorts/${v.id}`, studio: `https://studio.youtube.com/video/${v.id}/edit`,
      bildseite: m.url, fuerKinder: m.fuerKinder, hochgeladen: v.datum });
  }
  console.log(JSON.stringify(offen, null, 2));
} else if (a1 === "--anwenden") {
  const faellig = Object.entries(stand.videos).filter(([, v]) => v.freigabe === "ja" && v.sichtbarkeit !== "public");
  if (!faellig.length) { console.log("Nichts freizugeben."); process.exit(0); }
  const token = await zugang();
  const api = (pfad, init = {}) => fetch(`https://www.googleapis.com/youtube/v3/${pfad}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers } });
  let fehler = 0;
  for (const [slug, v] of faellig) {
    // videos.update ersetzt den ganzen status-Teil: die übrigen Felder vom aktuellen Stand übernehmen
    const jetzt = (await (await api(`videos?part=status&id=${v.id}`)).json()).items?.[0];
    if (!jetzt) { console.log(`✗ ${slug}: Video ${v.id} nicht gefunden`); fehler = 1; continue; }
    const { privacyStatus, selfDeclaredMadeForKids, embeddable, license, publicStatsViewable } = jetzt.status;
    const r = await api("videos?part=status", { method: "PUT", body: JSON.stringify({ id: v.id, status: { privacyStatus: "public", selfDeclaredMadeForKids, embeddable, license, publicStatsViewable } }) });
    const j = await r.json();
    if (!r.ok || j.status?.privacyStatus !== "public") {
      console.log(`✗ ${slug}: bleibt ${privacyStatus} (${j.error?.message || j.status?.privacyStatus}). Ohne bestandenes API-Audit sperrt YouTube Uploads auf privat.`);
      fehler = 1; continue;
    }
    v.sichtbarkeit = "public";
    v.oeffentlichAm = new Date().toISOString().slice(0, 10);
    console.log(`✓ ${slug} öffentlich: https://youtube.com/shorts/${v.id}`);
  }
  speichereStand(stand);
  process.exit(fehler);
} else if (a1 && ["ja", "nein"].includes(a2)) {
  const v = stand.videos[a1];
  if (!v) { console.error(`${a1} ist nicht in automatik/youtube.json`); process.exit(2); }
  v.freigabe = a2;
  if (rest.length) v.grund = rest.join(" "); else delete v.grund;
  speichereStand(stand);
  console.log(`${a1}: freigabe ${a2}`);
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.error("Aufruf: freigeben.mjs --offen | --anwenden | <slug> ja|nein [grund]");
  process.exit(2);
}
