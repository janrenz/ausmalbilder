// Erzeugt ein YouTube-Short (1080×1920, 30 fps, ~30 s) zu einem Motiv: Das Ausmalbild füllt sich Fläche für
// Fläche wie mit dem Farbeimer beim Online-Ausmalen, am Ende ersetzt ein englischer Hinweis auf malkiste.eu den Titel.
// Farben: aus dem bunten Original src/farben/<slug>.jpg (gen.sh), aus dem die Strichzeichnung entstanden ist –
// je Fläche ihre Farbe dort. Ältere Motive ohne buntes Original bekommen Farben aus festen Paletten.
// Ton: ruhige Akkorde und ein leiser Ton je gefüllter Fläche, im Skript erzeugt (keine fremde Musik, keine Lizenzfrage).
// Braucht nur ImageMagick (magick), rsvg-convert, ffmpeg und eine fette Schrift (fc-match "Noto Sans:bold").
// Aufruf: node automatik/youtube/video.mjs <slug> [ausgabe.mp4]
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { motiv } from "./angaben.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "../..");
const B = 1080, H = 1920, FPS = 30;
const BILD_B = 880, BILD_H = 1179, BILD_X = (B - BILD_B) / 2, BILD_Y = 380; // unten bleibt Platz für die Shorts-Leiste
const PAPIER = "#fff9f1", TINTE = "#2a2320", AKZENT = "#c4520f";
const INTRO = 45, MALEN = 600, HALTEN = 90, ENDE = 165, EINBLENDEN = 15;
const RATE = 48000;

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

// Farbe je Fläche aus dem bunten Original: Median der Pixel, ohne die schwarzen Linien des Originals. Ist eine große
// Fläche dort deutlich mehrfarbig (Lücke in einer Linie, durch die der Hintergrund ins Motiv läuft), bekommt sie
// die Farben des Originals Pixel für Pixel.
function farbenAusOriginal(liste, rgb) {
  const DUNKEL = 45;
  for (const f of liste) {
    const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
    let n = 0;
    for (const p of f.pixel) {
      const o = p * 3;
      if (Math.max(rgb[o], rgb[o + 1], rgb[o + 2]) < DUNKEL) continue;
      for (let k = 0; k < 3; k++) hist[k][rgb[o + k]]++;
      n++;
    }
    if (n < 5) { f.farbe = [...rgb.subarray(f.pixel[0] * 3, f.pixel[0] * 3 + 3)]; continue; } // im Original fast nur Linie
    f.farbe = hist.map((h) => { let s = 0, i = 0; for (; i < 255 && (s += h[i]) * 2 < n; i++); return i; });
    if (f.anzahl > BILD_B * BILD_H * 0.01) {
      let weit = 0;
      for (const p of f.pixel) {
        const o = p * 3;
        if (Math.hypot(rgb[o] - f.farbe[0], rgb[o + 1] - f.farbe[1], rgb[o + 2] - f.farbe[2]) > 60) weit++;
      }
      if (weit > 0.2 * f.anzahl) f.jePixel = true;
    }
  }
}

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

// Ton: weiche Akkordflächen (C-Dur-Umfeld, je 4 s), dazu ein kurzer, glockenartiger Ton aus der C-Dur-Pentatonik,
// wenn sich Flächen füllen (höchstens alle 0,2 s, Tonhöhe wandert zufällig), und ein Dreiklang, wenn die Tafel kommt.
function ton(toene, frames, endeFrame, rnd) {
  const n = Math.ceil(frames / FPS * RATE), l = new Float32Array(n), r = new Float32Array(n);
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const AKKORDE = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]]; // Cmaj7, Am7, Fmaj7, G
  const TAKT = 4 * RATE;
  for (let i = 0; i < n; i++) {
    const a = AKKORDE[Math.floor(i / TAKT) % 4], b = AKKORDE[(Math.floor(i / TAKT) + 1) % 4];
    const im = (i % TAKT) / TAKT, ueber = im > 0.85 ? (im - 0.85) / 0.15 : 0; // weicher Übergang zum nächsten Akkord
    let s = 0;
    for (let k = 0; k < 4; k++) {
      const f = hz(a[k]) * (1 - ueber) + hz(b[k]) * ueber, t = i / RATE;
      s += (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * (0.6 + 0.4 * Math.sin(2 * Math.PI * (0.1 + k * 0.03) * t));
    }
    s *= 0.035;
    l[i] += s; r[i] += s;
  }
  const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
  const glocke = (start, midi, laut, pan) => {
    const f = hz(midi), len = Math.floor(1.6 * RATE);
    for (let j = 0; j < len && start + j < n; j++) {
      const t = j / RATE, huelle = Math.min(1, t * 200) * Math.exp(-t * 3.2);
      const s = laut * huelle * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6));
      l[start + j] += s * (1 - pan); r[start + j] += s * pan;
    }
  };
  let stufe = 4, zuletzt = -1e9;
  for (const fr of toene) {
    const start = Math.floor(fr / FPS * RATE);
    if (start - zuletzt < 0.2 * RATE) continue;
    zuletzt = start;
    stufe = Math.max(0, Math.min(PENTA.length - 1, stufe + Math.floor(rnd() * 5) - 2));
    glocke(start, PENTA[stufe], 0.09 + rnd() * 0.04, 0.3 + rnd() * 0.4);
  }
  const e = Math.floor(endeFrame / FPS * RATE);
  [72, 76, 79, 84].forEach((m, k) => glocke(e + k * Math.floor(0.12 * RATE), m, 0.14, 0.35 + k * 0.1));
  // Ein- und Ausblenden, Spitzen begrenzen
  const out = new Float32Array(n * 2), ein = 0.8 * RATE, aus = 1.5 * RATE;
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, i / ein, (n - i) / aus);
    out[2 * i] = Math.tanh(l[i] * g * 2.4); out[2 * i + 1] = Math.tanh(r[i] * g * 2.4);
  }
  return Buffer.from(out.buffer);
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
    const original = join(WURZEL, "src/farben", `${slug}.jpg`);
    const rgb = existsSync(original) ? roh([original, "-resize", `${BILD_B}x${BILD_H}!`, "-depth", "8", "rgb:-"]) : null;

    // Schlusstafel: ersetzt oben den Titel, das Bild bleibt frei. Englisch, weil die Shorts international laufen
    // und malkiste.eu Besucher in ihre Sprache weiterleitet.
    const EW = B, EH = 300, EX = 0, EY = 40;
    roh(["-size", `${EW}x${EH}`, `xc:${PAPIER}`, "-fill", AKZENT, "-draw", `roundrectangle 70,20 ${EW - 71},${EH - 21} 48,48`,
      "-fill", "white", "-font", font, "-gravity", "north", "-pointsize", "52", "-annotate", "+0+58", "Free to print or colour online",
      "-pointsize", "104", "-annotate", "+0+124", "malkiste.eu", "-alpha", "set", "-depth", "8", join(tmp, "ende.png")]);
    const ende = roh([join(tmp, "ende.png"), "rgba:-"]);

    // Reihenfolge: von oben nach unten mit etwas Zufall, große Flächen zuerst in ihrer Zeile
    const rnd = zufall(slug);
    // Eine Fläche, die alle vier Bildränder berührt, ist der Papierrand um den Bildrahmen: bleibt weiß
    const liste = flaechen(grau).filter((f) => !f.rand);
    const palette = !rgb && m.stil === "erwachsen" ? PALETTEN[Math.floor(rnd() * PALETTEN.length)] : null;
    const waehle = (l) => hex(l[Math.floor(rnd() * l.length)]);
    if (rgb) farbenAusOriginal(liste, rgb);
    for (const f of liste) {
      const gross = f.anzahl > BILD_B * BILD_H * 0.02;
      if (!rgb) f.farbe = palette ? waehle(palette) : waehle(gross ? HELL : KRAEFTIG);
      f.schluessel = f.cy / BILD_H + f.cx / BILD_B * 0.25 + (rnd() - 0.5) * 0.15 - (gross ? 0.05 : 0);
    }
    liste.sort((a, b) => a.schluessel - b.schluessel);

    const bild = Buffer.from(grund);
    const nurBild = join(tmp, "bild.mp4"), tonDatei = join(tmp, "ton.f32");
    const ff = spawn("ffmpeg", ["-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", `${B}x${H}`, "-r", String(FPS), "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", nurBild],
      { stdio: ["pipe", "inherit", "inherit"] });
    const fertig = new Promise((ok, nein) => ff.on("close", (c) => (c === 0 ? ok() : nein(new Error(`ffmpeg Exit ${c}`)))));
    const schreibe = (buf) => (ff.stdin.write(buf) ? Promise.resolve() : new Promise((ok) => ff.stdin.once("drain", ok)));

    for (let i = 0; i < INTRO; i++) await schreibe(bild);
    // Fortschritt nach gefärbter Fläche, sanft am Anfang und am Schluss
    const summe = liste.reduce((s, f) => s + f.anzahl, 0);
    let naechste = 0, gefaerbt = 0;
    const toene = []; // Zeitpunkte (Frame) mit neu gefüllten Flächen, für den Ton
    for (let i = 1; i <= MALEN; i++) {
      if (naechste < liste.length) toene.push(INTRO + i);
      const t = i / MALEN, ziel = summe * (t * t * (3 - 2 * t));
      for (; naechste < liste.length && (gefaerbt < ziel || i === MALEN); naechste++) {
        gefaerbt += liste[naechste].anzahl;
        const { pixel, farbe, jePixel } = liste[naechste];
        for (const p of pixel) {
          const g = grau[p] / 255, o = ((BILD_Y + ((p / BILD_B) | 0)) * B + BILD_X + (p % BILD_B)) * 3;
          const c = jePixel && Math.max(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]) >= 45 ? rgb.subarray(p * 3, p * 3 + 3) : farbe;
          bild[o] = c[0] * g; bild[o + 1] = c[1] * g; bild[o + 2] = c[2] * g;
        }
      }
      await schreibe(bild);
    }
    for (let i = 0; i < HALTEN; i++) await schreibe(bild);
    const mit = Buffer.from(bild);
    for (let i = 1; i <= ENDE; i++) {
      if (i <= EINBLENDEN) {
        const s = i / EINBLENDEN;
        for (let y = 0; y < EH; y++) for (let x = 0; x < EW; x++) {
          const q = (y * EW + x) * 4, a = (ende[q + 3] / 255) * s, o = ((EY + y) * B + EX + x) * 3;
          for (let k = 0; k < 3; k++) mit[o + k] = bild[o + k] * (1 - a) + ende[q + k] * a;
        }
      }
      await schreibe(mit);
    }
    ff.stdin.end();
    await fertig;
    const gesamt = INTRO + MALEN + HALTEN + ENDE;
    writeFileSync(tonDatei, ton(toene, gesamt, INTRO + MALEN + HALTEN, rnd));
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", nurBild, "-f", "f32le", "-ar", String(RATE), "-ac", "2", "-i", tonDatei,
      "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", ziel]);
    return { flaechen: liste.length, original: !!rgb, sekunden: (INTRO + MALEN + HALTEN + ENDE) / FPS };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [slug, ziel = `${process.argv[2]}.mp4`] = process.argv.slice(2);
  if (!slug) { console.error("Aufruf: node automatik/youtube/video.mjs <slug> [ausgabe.mp4]"); process.exit(2); }
  const r = await video(slug, ziel);
  console.log(`${ziel}: ${r.sekunden} s, ${r.flaechen} Flächen, Farben ${r.original ? "aus src/farben" : "aus Paletten"}`);
}
