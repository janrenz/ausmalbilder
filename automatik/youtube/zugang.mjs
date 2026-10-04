// Zugriffstoken aus dem Refresh-Token (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN aus anmelden.mjs)
// und gemeinsame Hilfen für den Stand in automatik/youtube.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const STAND = join(dirname(fileURLToPath(import.meta.url)), "../youtube.json");
export const ladeStand = () => (existsSync(STAND) ? JSON.parse(readFileSync(STAND, "utf8")) : { videos: {} });
export const speichereStand = (s) => writeFileSync(STAND, JSON.stringify(s, null, 1) + "\n");

export async function zugang() {
  for (const v of ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"])
    if (!process.env[v]) throw new Error(`Umgebungsvariable ${v} fehlt (siehe automatik/youtube/README.md)`);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID, client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN, grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Token abgelehnt: ${j.error} ${j.error_description || ""} (Refresh-Token abgelaufen? anmelden.mjs neu ausführen)`);
  return j.access_token;
}
