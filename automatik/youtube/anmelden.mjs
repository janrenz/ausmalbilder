// Einmalige Anmeldung am YouTube-Kanal (OAuth für Desktop-Apps, mit PKCE). Öffnet den Browser; dort mit dem
// Google-Konto anmelden und den Kanal „Malkiste“ auswählen. Schreibt Client-ID, Client-Secret und Refresh-Token
// nach ~/.config/malkiste/youtube.env (Rechte 600) und gibt keinen der Werte aus.
// Aufruf: node automatik/youtube/anmelden.mjs <client_secret_….json>
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const datei = process.argv[2];
if (!datei) { console.error("Aufruf: node automatik/youtube/anmelden.mjs <client_secret_….json>"); process.exit(2); }
const c = JSON.parse(readFileSync(datei, "utf8")).installed;
if (!c) { console.error("Die JSON-Datei ist kein OAuth-Client vom Typ „Desktop-App“."); process.exit(2); }

const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];
const pruefer = randomBytes(32).toString("base64url");
const zustand = randomBytes(16).toString("hex");

const server = createServer();
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const ruecksprung = `http://127.0.0.1:${server.address().port}`;
const url = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
  client_id: c.client_id, redirect_uri: ruecksprung, response_type: "code", scope: SCOPES.join(" "),
  access_type: "offline", prompt: "consent", state: zustand,
  code_challenge: createHash("sha256").update(pruefer).digest("base64url"), code_challenge_method: "S256",
});
console.log("Browser öffnet sich. Falls nicht, diese Adresse öffnen:\n" + url);
spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();

const code = await new Promise((ok, nein) => server.on("request", (req, res) => {
  const q = new URL(req.url, ruecksprung).searchParams;
  if (!q.get("code") && !q.get("error")) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("Fertig, das Fenster kann zu.");
  server.close();
  if (q.get("state") !== zustand) nein(new Error("state passt nicht"));
  else if (q.get("error")) nein(new Error(q.get("error")));
  else ok(q.get("code"));
}));

const r = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  body: new URLSearchParams({ code, client_id: c.client_id, client_secret: c.client_secret, redirect_uri: ruecksprung, grant_type: "authorization_code", code_verifier: pruefer }),
});
const t = await r.json();
if (!r.ok || !t.refresh_token) { console.error("Kein Refresh-Token erhalten:", t.error, t.error_description || ""); process.exit(1); }

const k = await (await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
const kanal = k.items?.[0];
console.log(kanal ? `Angemeldet für Kanal: ${kanal.snippet.title} (${kanal.snippet.customUrl || kanal.id})` : "Achtung: kein Kanal zu dieser Anmeldung gefunden.");

const ziel = join(homedir(), ".config/malkiste");
mkdirSync(ziel, { recursive: true });
writeFileSync(join(ziel, "youtube.env"),
  `YOUTUBE_CLIENT_ID=${c.client_id}\nYOUTUBE_CLIENT_SECRET=${c.client_secret}\nYOUTUBE_REFRESH_TOKEN=${t.refresh_token}\n${kanal ? `YOUTUBE_KANAL_ID=${kanal.id}\n` : ""}`,
  { mode: 0o600 });
console.log(`Gespeichert: ${join(ziel, "youtube.env")}`);
