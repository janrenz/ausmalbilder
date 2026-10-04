// Fragt Umami nach Downloads/Drucken seit dem letzten Lauf und gibt eine Zusammenfassung als JSON aus.
// Aufruf: node automatik/statistik.mjs [--min 50] [--seit <ms>]
// Exit 0 = genug Daten, 3 = zu wenig neue Downloads (Lauf überspringen), 1 = Fehler.
// Zugang aus den Umgebungsvariablen UMAMI_URL/UMAMI_USER/UMAMI_PASSWORD (Cloud) oder ~/.config/malkiste/umami.env (Laptop),
// Website-ID aus umami.json, Stand aus automatik/stand.json (früher ~/.local/state/malkiste/letzter-lauf).
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { themen } from "../katalog.mjs";

const arg = (name, standard) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : standard;
};
const MIN = Number(arg("--min", 50));
const STAND = new URL("stand.json", import.meta.url);
const STAND_ALT = join(homedir(), ".local/state/malkiste/letzter-lauf");
const START_DER_SEITE = Date.parse("2026-10-04T00:00:00Z");

const DATEI = join(homedir(), ".config/malkiste/umami.env");
const env = process.env.UMAMI_URL ? process.env : Object.fromEntries(
  readFileSync(DATEI, "utf8")
    .split("\n").filter((z) => z.includes("=")).map((z) => [z.slice(0, z.indexOf("=")), z.slice(z.indexOf("=") + 1)]),
);
const { id: WEBSITE } = JSON.parse(readFileSync(new URL("../umami.json", import.meta.url), "utf8"));
const seit = Number(arg("--seit",
  existsSync(STAND) ? JSON.parse(readFileSync(STAND, "utf8")).nachfrageBis
  : existsSync(STAND_ALT) ? readFileSync(STAND_ALT, "utf8").trim() : START_DER_SEITE));
const bis = Date.now();

const login = await fetch(`${env.UMAMI_URL}/api/auth/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: env.UMAMI_USER, password: env.UMAMI_PASSWORD }),
});
if (!login.ok) { console.error(`Umami-Login fehlgeschlagen: ${login.status}`); process.exit(1); }
const { token } = await login.json();
async function api(pfad, params = {}) {
  const q = new URLSearchParams({ startAt: seit, endAt: bis, ...params });
  const r = await fetch(`${env.UMAMI_URL}/api/websites/${WEBSITE}/${pfad}?${q}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`${pfad}: ${r.status}`);
  return r.json();
}
const liste = (rows) => rows.map((r) => ({ wert: r.x ?? r.value, n: Number(r.y ?? r.total ?? r.count ?? 0) })).filter((r) => r.wert != null);

const ereignisse = Object.fromEntries(liste(await api("metrics", { type: "event" })).map((r) => [r.wert, r.n]));
const downloads = (ereignisse.pdf || 0) + (ereignisse.drucken || 0) + (ereignisse.png || 0) + (ereignisse.ausgemalt || 0);

// Pro Eigenschaft über alle Download-Ereignisse summieren (ausgemalt = online ausgemaltes Bild gespeichert)
async function summe(eigenschaft) {
  const z = {};
  for (const ev of ["pdf", "drucken", "png", "ausgemalt"]) {
    if (!ereignisse[ev]) continue;
    for (const r of liste(await api("event-data/values", { event: ev, propertyName: eigenschaft }))) z[r.wert] = (z[r.wert] || 0) + r.n;
  }
  return Object.entries(z).map(([wert, n]) => ({ wert, n })).sort((a, b) => b.n - a.n);
}

const themaVon = Object.fromEntries(themen.flatMap((t) => t.bilder.map((b) => [b.slug, t.slug])));
const ergebnis = {
  zeitraum: { von: new Date(seit).toISOString(), bis: new Date(bis).toISOString() },
  schwelle: MIN,
  downloads,
  ereignisse,
  besuch: await api("stats"),
  bilder: (await summe("bild")).map((r) => ({ bild: r.wert, thema: themaVon[r.wert] || "?", n: r.n })),
  themen: await summe("thema"),
  sprachen: await summe("sprache"),
  seiten: liste(await api("metrics", { type: "path" })).slice(0, 30),
  herkunft: liste(await api("metrics", { type: "referrer" })).slice(0, 15),
  // Themen ohne einen einzigen Download: Kandidaten, die man eher nicht ausbaut
  ohne_downloads: [],
};
const mitDownloads = new Set(ergebnis.themen.map((t) => t.wert));
ergebnis.ohne_downloads = themen.map((t) => t.slug).filter((s) => !mitDownloads.has(s));

console.log(JSON.stringify(ergebnis, null, 2));
if (downloads < MIN) {
  console.error(`Nur ${downloads} Downloads seit ${ergebnis.zeitraum.von} (Schwelle ${MIN}) – Lauf wird übersprungen.`);
  process.exit(3);
}
