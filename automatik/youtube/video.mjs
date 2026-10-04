// Erzeugt ein YouTube-Short (1080×1920, 30 fps, ~19 s) zu einem Motiv: Das Ausmalbild füllt sich Fläche für
// Fläche wie mit dem Farbeimer beim Online-Ausmalen, am Ende ein Hinweis auf malkiste.eu.
// Braucht nur ImageMagick (magick), rsvg-convert, ffmpeg und eine fette Schrift (fc-match "Noto Sans:bold").
// Aufruf: node automatik/youtube/video.mjs <slug> [ausgabe.mp4]
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { motiv } from "./angaben.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");
const B = 1080, H = 1920, FPS = 30;
const BILD_B = 880, BILD_H = 1179, BILD_X = (B - BILD_B) / 2, BILD_Y = 380; // unten bleibt Platz für die Shorts-Leiste
const PAPIER = "#fff9f1", TINTE = "#2a2320", AKZENT = "#c4520f";
const INTRO = 30, MALEN = 330, HALTEN = 60, ENDE = 150, EINBLENDEN = 12;

// Kräftige Farben für kleine Flächen, helle für große (Himmel, Wiese), damit das Bild ruhig bleibt
const KRAEFTIG = ["#ff8a3d", "#ffc94a", "#7cc96b", "#4fb3d9", "#e86a92", "#9b7ede", "#f25f4c", "#3fbf9f", "#ffa8c5", "#b5d86a", "#6c9cf0", "#ffb36b"];
const HELL = ["#cfeaff", "#d9f2c9", "#fff1b8", "#ffe0cc", "#eadcff", "#ffd6e4", "#c9f0e6"];
// Mandalas und Zentangles (stil „erwachsen“): je Video eine abgestimmte Palette statt aller Farben
const PALETTEN = [
  ["#1f6f78", "#3fa7a3", "#f2c14e", "#f78154", "#fbe8c8"],
  ["#2d3a8c", "#5b6ee1", "#a78bfa", "#f0abfc", "#fdf2f8"],
  ["#7a2e3b", "#c75146", "#e9a03b", "#f6d186", "#fcf5e5"],
  ["#264653", "#2a9d8f", "#8ab17d", "#e9c46a", "#f4a261"],
  ["#3d405b", "#e07a5f", "#81b29a", "#f2cc8f", "#f4f1de"],
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const roh = (args) => execFileSync("magick", args, { maxBuffer: 64 << 20 });
const schrift = () => execFileSync("fc-match", ["-f", "%{file}", "Noto Sans:bold"]).toString().trim();

// Kleiner deterministischer Zufall, damit dasselbe Motiv immer dasselbe Video ergibt
function zufall(text) {
  let s = [...text].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);
  return () => ((s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0) / 4294967296);
}

// Zusammenhängende helle Flächen (4er-Nachbarschaft) finden; Linien (dunkel) gehören zu keiner Fläche
function flaechen(grau) {
  const n = grau.length, marke = new Int32Array(n).fill(-1), liste = [];
  const stapel = new Int32Array(n);
  for (let start = 0; start < n; start++) {
    if (marke[start] !== -1 || grau[start] < 200) continue;
    const id = liste.length; let oben = 0, anzahl = 0, sx = 0, sy = 0, raender = 0;
    stapel[oben++] = start; marke[start] = id;
    while (oben) {
      const p = stapel[--oben], x = p % BILD_B, y = (p / BILD_B) | 0;
      anzahl++; sx += x; sy += y;
      raender |= (x === 0) | ((x === BILD_B - 1) << 1) | ((y === 0) << 2) | ((y === BILD_H - 1) << 3);
      for (const q of [x > 0 ? p - 1 : -1, x < BILD_B - 1 ? p + 1 : -1, y > 0 ? p - BILD_B : -1, y < BILD_H - 1 ? p + BILD_B : -1])
        if (q >= 0 && marke[q] === -1 && grau[q] >= 200) { marke[q] = id; stapel[oben++] = q; }
    }
    liste.push({ id, anzahl, cx: sx / anzahl, cy: sy / anzahl, rand: raender === 15, pixel: null });
  }
  // Pixel je Fläche einsammeln (Zählsortierung)
  const start = new Int32Array(liste.length + 1);
  for (let p = 0; p < n; p++) if (marke[p] >= 0) start[marke[p] + 1]++;
  for (let i = 0; i < liste.length; i++) start[i + 1] += start[i];
  const alle = new Int32Array(start[liste.length]), pos = start.slice();
  for (let p = 0; p < n; p++) if (marke[p] >= 0) alle[pos[marke[p]]++] = p;
  for (const f of liste) f.pixel = alle.subarray(start[f.id], start[f.id + 1]);
  return liste;
}

export async function video(slug, ziel) {
  const m = await motiv(slug);
  const quelle = join(WURZEL, "src/bilder", `${slug}.png`);
  if (!existsSync(quelle)) throw new Error(`Quellbild fehlt: ${quelle}`);
  const tmp = mkdtempSync(join(tmpdir(), "malkiste-video-"));
  try {
    const font = schrift();
    // Grundbild: Papier, Logo, Titel, weißes Blatt mit Schatten, Linienzeichnung
    execFileSync("rsvg-convert", ["-w", "620", join(WURZEL, "docs/logo.svg"), "-o", join(tmp, "logo.png")]);
    roh(["-background", "none", "-fill", TINTE, "-font", font, "-pointsize", "58", "-size", `${BILD_B}x`, "-gravity", "center", `caption:${m.titel}`, join(tmp, "titel.png")]);
    roh([quelle, "-colorspace", "gray", "-resize", `${BILD_B}x${BILD_H}!`, join(tmp, "linien.png")]);
    roh(["-size", `${B}x${H}`, `xc:${PAPIER}`,
      "(", "-size", `${BILD_B + 24}x${BILD_H + 24}`, "xc:white", "(", "+clone", "-background", TINTE, "-shadow", "25x14+0+10", ")", "+swap", "-background", "none", "-layers", "merge", "+repage", ")",
      "-geometry", `+${BILD_X - 12 - 28}+${BILD_Y - 12 - 28}`, "-composite",
      join(tmp, "logo.png"), "-gravity", "north", "-geometry", "+0+70", "-composite",
      join(tmp, "titel.png"), "-gravity", "north", "-geometry", "+0+250", "-composite",
      join(tmp, "linien.png"), "-gravity", "northwest", "-geometry", `+${BILD_X}+${BILD_Y}`, "-composite",
      "-depth", "8", join(tmp, "grund.png")]);
    const grund = roh([join(tmp, "grund.png"), "rgb:-"]);
    const grau = roh([join(tmp, "linien.png"), "-depth", "8", "gray:-"]);

    // Schlusstafel (RGBA über dem Bild)
    roh(["-size", "900x330", "xc:none", "-fill", AKZENT, "-draw", "roundrectangle 0,0 899,329 48,48",
      "-fill", "white", "-font", font, "-gravity", "north", "-pointsize", "54", "-annotate", "+0+52", "Kostenlos ausdrucken\noder online ausmalen",
      "-pointsize", "76", "-annotate", "+0+200", "malkiste.eu", "-depth", "8", join(tmp, "ende.png")]);
    const ende = roh([join(tmp, "ende.png"), "rgba:-"]);
    const EX = (B - 900) / 2, EY = BILD_Y + Math.floor((BILD_H - 330) / 2);

    // Reihenfolge: von oben nach unten mit etwas Zufall, große Flächen zuerst in ihrer Zeile
    const rnd = zufall(slug);
    // Eine Fläche, die alle vier Bildränder berührt, ist der Papierrand um den Bildrahmen: bleibt weiß
    const liste = flaechen(grau).filter((f) => !f.rand);
    const palette = m.stil === "erwachsen" ? PALETTEN[Math.floor(rnd() * PALETTEN.length)] : null;
    const waehle = (l) => hex(l[Math.floor(rnd() * l.length)]);
    for (const f of liste) {
      const gross = f.anzahl > BILD_B * BILD_H * 0.02;
      f.farbe = palette ? waehle(palette) : waehle(gross ? HELL : KRAEFTIG);
      f.schluessel = f.cy / BILD_H + f.cx / BILD_B * 0.25 + (rnd() - 0.5) * 0.15 - (gross ? 0.05 : 0);
    }
    liste.sort((a, b) => a.schluessel - b.schluessel);

    const bild = Buffer.from(grund);
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${B}x${H}`, "-r", String(FPS), "-i", "-",
      "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", ziel],
      { stdio: ["pipe", "inherit", "inherit"] });
    const fertig = new Promise((ok, nein) => ff.on("close", (c) => (c === 0 ? ok() : nein(new Error(`ffmpeg Exit ${c}`)))));
    const schreibe = (buf) => (ff.stdin.write(buf) ? Promise.resolve() : new Promise((ok) => ff.stdin.once("drain", ok)));

    for (let i = 0; i < INTRO; i++) await schreibe(bild);
    // Fortschritt nach gefärbter Fläche, sanft am Anfang und am Schluss
    const summe = liste.reduce((s, f) => s + f.anzahl, 0);
    let naechste = 0, gefaerbt = 0;
    for (let i = 1; i <= MALEN; i++) {
      const t = i / MALEN, ziel = summe * (t * t * (3 - 2 * t));
      for (; naechste < liste.length && (gefaerbt < ziel || i === MALEN); naechste++) {
        gefaerbt += liste[naechste].anzahl;
        const { pixel, farbe } = liste[naechste];
        for (const p of pixel) {
          const g = grau[p] / 255, o = ((BILD_Y + ((p / BILD_B) | 0)) * B + BILD_X + (p % BILD_B)) * 3;
          bild[o] = farbe[0] * g; bild[o + 1] = farbe[1] * g; bild[o + 2] = farbe[2] * g;
        }
      }
      await schreibe(bild);
    }
    for (let i = 0; i < HALTEN; i++) await schreibe(bild);
    const mit = Buffer.from(bild);
    for (let i = 1; i <= ENDE; i++) {
      if (i <= EINBLENDEN) {
        const s = i / EINBLENDEN;
        for (let y = 0; y < 330; y++) for (let x = 0; x < 900; x++) {
          const q = (y * 900 + x) * 4, a = (ende[q + 3] / 255) * s, o = ((EY + y) * B + EX + x) * 3;
          for (let k = 0; k < 3; k++) mit[o + k] = bild[o + k] * (1 - a) + ende[q + k] * a;
        }
      }
      await schreibe(mit);
    }
    ff.stdin.end();
    await fertig;
    return { flaechen: liste.length, sekunden: (INTRO + MALEN + HALTEN + ENDE) / FPS };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [slug, ziel = `${process.argv[2]}.mp4`] = process.argv.slice(2);
  if (!slug) { console.error("Aufruf: node automatik/youtube/video.mjs <slug> [ausgabe.mp4]"); process.exit(2); }
  const r = await video(slug, ziel);
  console.log(`${ziel}: ${r.sekunden} s, ${r.flaechen} Flächen`);
}
