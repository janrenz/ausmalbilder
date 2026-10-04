// Mal-Video: spielt das Ausmalen als Zeitraffer im Hochformat ab (1080×1920, wie ein Short), mit Musik, die hier im
// Browser entsteht (keine fremden Stücke, keine Rechte Dritter). Alles passiert auf dem Gerät, nichts wird hochgeladen.
// Kodiert wird mit WebCodecs über Mediabunny zu MP4, schneller als Echtzeit; ohne WebCodecs nimmt MediaRecorder in Echtzeit auf.
const FPS = 30, VW = 1080, VH = 1920;
const INTRO = 1, OUTRO = 3.5;
const PAPIER = "#fff9f1", TINTE = "#2a2320", LEISE = "#6b5f58", AKZENT = "#c4520f";
const SCHRIFT = 'ui-rounded, "SF Pro Rounded", "Nunito", "Segoe UI", system-ui, sans-serif';
const BILD = { x: 60, y: 300, w: 960, h: 1286 }; // Malfläche im Video (896×1200 skaliert)

/** q: { W, H, aktionen, maskeVon(x, y), zeichneStrich(ctx, w, g, hex, x0, y0, x1, y1), linien: HTMLImageElement,
 *       logo: URL, titel, schluss, seite } – fortschritt(0…1) */
export async function erstelleVideo(q, fortschritt = () => {}) {
  const plan = planen(q);
  const gesamt = INTRO + plan.dauer + OUTRO;
  const logo = await bildLaden(q.logo).catch(() => null);
  const ton = await musik(gesamt, plan.fuellZeiten.map((t) => INTRO + t));
  const v = Object.assign(document.createElement("canvas"), { width: VW, height: VH });
  const bild = abspielen(q, plan, v, logo, gesamt);
  const frames = Math.round(gesamt * FPS);
  try {
    const mb = await import(new URL("mediabunny.mjs", import.meta.url));
    const vcodec = await erste(["avc", "vp9", "av1"], (c) => mb.canEncodeVideo(c, { width: VW, height: VH, bitrate: 4e6 }));
    if (vcodec) {
      const acodec = await erste(["aac", "opus"], (c) => mb.canEncodeAudio(c, { numberOfChannels: 2, sampleRate: ton.sampleRate, bitrate: 128e3 }));
      const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
      const vs = new mb.CanvasSource(v, { codec: vcodec, bitrate: 4e6, keyFrameInterval: 2 });
      output.addVideoTrack(vs, { frameRate: FPS });
      const as = acodec ? new mb.AudioBufferSource({ codec: acodec, bitrate: 128e3 }) : null;
      if (as) output.addAudioTrack(as);
      await output.start();
      if (as) { await as.add(ton); as.close(); }
      for (let i = 0; i < frames; i++) {
        bild(i / FPS);
        await vs.add(i / FPS, 1 / FPS);
        if (i % 10 === 0) { fortschritt(i / frames); await new Promise((r) => setTimeout(r)); }
      }
      vs.close();
      await output.finalize();
      fortschritt(1);
      return { blob: new Blob([output.target.buffer], { type: "video/mp4" }), endung: "mp4" };
    }
  } catch (e) {
    console.warn("WebCodecs nicht nutzbar, nehme in Echtzeit auf", e);
  }
  return echtzeit(v, bild, ton, gesamt, fortschritt);
}

const erste = async (liste, ok) => { for (const c of liste) if (await ok(c).catch(() => false)) return c; return null; };
const bildLaden = (src) => new Promise((ok, fehler) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fehler; i.src = src; });

// ---------- Zeitplan ----------
// Jede Aktion bekommt eine Dauer; zusammen werden sie auf 6–18 Sekunden gestreckt oder gestaucht.
function planen(q) {
  const ops = q.aktionen.filter(Boolean);
  const roh = ops.map((o) => (o.a === "f" ? 0.45 : o.a === "n" ? 0.3 : Math.min(2.5, Math.max(0.4, o.p.length / 2 * 0.02))));
  const summe = roh.reduce((a, b) => a + b, 0) || 1;
  const dauer = Math.min(18, Math.max(6, summe));
  let t = 0;
  const schritte = ops.map((o, i) => { const d = roh[i] * dauer / summe; const s = { o, start: t, ende: t + d }; t += d; return s; });
  return { schritte, dauer, fuellZeiten: schritte.filter((s) => s.o.a === "f").map((s) => s.start) };
}

// ---------- Bilder ----------
// Liefert bild(t), das das Video-Canvas für Zeitpunkt t zeichnet. Die Farbe wächst nur, daher wird jede Aktion
// fortlaufend auf die Farbebene gemalt: Füllungen breiten sich rund vom Klickpunkt aus, Striche entstehen Punkt für Punkt.
function abspielen(q, plan, v, logo, gesamt) {
  const { W, H } = q;
  const farbe = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const fc = farbe.getContext("2d", { willReadFrequently: true });
  const vc = v.getContext("2d");
  let k = 0;          // aktueller Schritt
  let laufend = null; // Zustand des aktuellen Schritts
  const titelGroesse = passend(vc, q.titel, 980, 72, 800);

  function weiter(t) {
    while (k < plan.schritte.length) {
      const s = plan.schritte[k];
      if (t < s.start) return;
      const anteil = Math.min(1, (t - s.start) / (s.ende - s.start));
      if (!laufend) laufend = beginne(s.o);
      if (laufend) laufend(anteil);
      if (anteil < 1) return;
      laufend = null; k++;
    }
  }
  function beginne(o) {
    if (o.a === "n") { fc.clearRect(0, 0, W, H); return null; }
    if (o.a === "s") {
      let n = 0; // schon gezeichnete Punkte
      const punkte = o.p.length / 2;
      return (anteil) => {
        const bis = Math.max(1, Math.round(punkte * anteil));
        for (; n < bis; n++) {
          const i = Math.max(0, n - 1) * 2, j = n * 2;
          q.zeichneStrich(fc, o.w, o.g, o.c, o.p[i], o.p[i + 1], o.p[j], o.p[j + 1]);
        }
      };
    }
    // Füllung: Pixel der Fläche nach Abstand vom Klickpunkt ordnen (Zählsortierung), dann ringweise einfärben
    const maske = q.maskeVon(o.x, o.y);
    if (!maske) return null;
    let anzahl = 0;
    for (let p = 0; p < maske.length; p++) anzahl += maske[p];
    const abstand = new Uint16Array(anzahl), index = new Uint32Array(anzahl);
    let m = 0, max = 0;
    for (let p = 0; p < maske.length; p++) {
      if (!maske[p]) continue;
      const d = Math.hypot((p % W) - o.x, ((p / W) | 0) - o.y) | 0;
      abstand[m] = d; index[m++] = p; if (d > max) max = d;
    }
    const zaehler = new Uint32Array(max + 2);
    for (let i = 0; i < anzahl; i++) zaehler[abstand[i] + 1]++;
    for (let d = 1; d <= max + 1; d++) zaehler[d] += zaehler[d - 1];
    const sortiert = new Uint32Array(anzahl);
    for (let i = 0; i < anzahl; i++) sortiert[zaehler[abstand[i]]++] = index[i];
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(o.c.slice(i, i + 2), 16));
    let fertig = 0;
    return (anteil) => {
      const bis = Math.round(anzahl * (1 - (1 - anteil) ** 2)); // schnell los, sanft auslaufen
      if (bis <= fertig) return;
      const bild = fc.getImageData(0, 0, W, H), d = bild.data;
      for (; fertig < bis; fertig++) { const p = sortiert[fertig] * 4; d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255; }
      fc.putImageData(bild, 0, 0);
    };
  }

  return (t) => {
    weiter(t - INTRO);
    vc.globalCompositeOperation = "source-over";
    vc.fillStyle = PAPIER; vc.fillRect(0, 0, VW, VH);
    // Kopf: Logo und Titel
    if (logo) { const h = 84, w = h * logo.width / logo.height; vc.drawImage(logo, (VW - w) / 2, 70, w, h); }
    vc.fillStyle = TINTE; vc.textAlign = "center"; vc.textBaseline = "alphabetic";
    vc.font = `800 ${titelGroesse}px ${SCHRIFT}`; vc.fillText(q.titel, VW / 2, 245);
    // Malfläche: weiße Karte, Farbe, Linien darüber (multiplizieren, wie auf der Seite)
    vc.save();
    vc.shadowColor = "rgba(0,0,0,.12)"; vc.shadowBlur = 24; vc.shadowOffsetY = 6;
    vc.fillStyle = "#fff"; rund(vc, BILD.x - 12, BILD.y - 12, BILD.w + 24, BILD.h + 24, 28); vc.fill();
    vc.restore();
    vc.drawImage(farbe, BILD.x, BILD.y, BILD.w, BILD.h);
    vc.globalCompositeOperation = "multiply";
    vc.drawImage(q.linien, 0, 0, W, H, BILD.x, BILD.y, BILD.w, BILD.h);
    vc.globalCompositeOperation = "source-over";
    // Fuß und Schlusskarte
    vc.fillStyle = LEISE; vc.font = `700 40px ${SCHRIFT}`; vc.fillText(q.seite, VW / 2, 1690);
    const a = Math.min(1, Math.max(0, (t - (gesamt - OUTRO + 0.4)) / 0.6));
    if (a > 0) {
      vc.globalAlpha = a;
      vc.fillStyle = "rgba(255,255,255,.96)"; rund(vc, 150, 1290, 780, 250, 32); vc.fill();
      vc.strokeStyle = AKZENT; vc.lineWidth = 6; vc.stroke();
      vc.fillStyle = TINTE; vc.font = `800 ${passend(vc, q.schluss, 700, 60, 800)}px ${SCHRIFT}`; vc.fillText(q.schluss, VW / 2, 1395);
      vc.fillStyle = AKZENT; vc.font = `800 76px ${SCHRIFT}`; vc.fillText(q.seite, VW / 2, 1490);
      vc.globalAlpha = 1;
    }
  };
}
function passend(c, text, breite, groesse, gewicht) {
  for (; groesse > 28; groesse -= 2) { c.font = `${gewicht} ${groesse}px ${SCHRIFT}`; if (c.measureText(text).width <= breite) break; }
  return groesse;
}
function rund(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// ---------- Musik ----------
// Fröhliches Stück aus Bass, Flächenklang, Arpeggio und Pentatonik-Melodie; jede Füllung klingt als kleine Glocke.
// Zufällige Tonart, Akkordfolge und Melodie, damit nicht jedes Video gleich klingt.
async function musik(dauer, glocken) {
  const sr = 48000;
  const ac = new OfflineAudioContext(2, Math.ceil(dauer * sr), sr);
  let s = (Math.random() * 2 ** 32) >>> 0;
  const zufall = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; };
  const wahl = (l) => l[Math.floor(zufall() * l.length)];
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);

  const komp = ac.createDynamicsCompressor(); komp.threshold.value = -18; komp.ratio.value = 3;
  const haupt = ac.createGain(); haupt.connect(komp); komp.connect(ac.destination);
  haupt.gain.setValueAtTime(0, 0); haupt.gain.linearRampToValueAtTime(1.4, 0.5);
  haupt.gain.setValueAtTime(1.4, Math.max(0.6, dauer - 2)); haupt.gain.linearRampToValueAtTime(0, dauer);
  const weich = ac.createBiquadFilter(); weich.type = "lowpass"; weich.frequency.value = 2400; weich.connect(haupt);

  function ton(t, midi, d, { typ = "sine", laut = 0.1, an = 0.01, aus = 0.3, ziel = weich, verstimmt = 0 } = {}) {
    if (t >= dauer) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = typ; o.frequency.value = hz(midi); o.detune.value = verstimmt;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(laut, t + an);
    g.gain.setValueAtTime(laut, t + Math.max(an, d - aus)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(ziel); o.start(t); o.stop(t + d + 0.05);
  }

  const grund = wahl([60, 62, 65, 67]);                      // C, D, F oder G
  const folge = wahl([[0, 7, 9, 5], [0, 5, 7, 5], [0, 9, 5, 7], [0, 5, 9, 7]]); // I–V–vi–IV und Verwandte
  const moll = (stufe) => stufe === 9 || stufe === 2 || stufe === 4;
  const schlag = 60 / (100 + zufall() * 20), takt = 4 * schlag;
  const penta = [0, 2, 4, 7, 9];
  let melodie = 2;
  const akkordBei = (t) => folge[Math.floor(t / takt) % folge.length];

  for (let t0 = 0, n = 0; t0 < dauer; t0 += takt, n++) {
    const stufe = folge[n % folge.length], w = grund + stufe;
    const akkord = [w, w + (moll(stufe) ? 3 : 4), w + 7];
    for (const m of akkord) ton(t0, m - 12, takt, { typ: "triangle", laut: 0.035, an: 0.25, aus: 0.4 });
    for (const b of [0, 2]) ton(t0 + b * schlag, w - 24, schlag * 0.9, { laut: 0.2, aus: 0.2 });
    for (let a = 0; a < 8; a++) ton(t0 + a * schlag / 2, akkord[[0, 1, 2, 1][a % 4]] + 12, schlag * 0.45, { typ: "triangle", laut: 0.04, aus: 0.2 });
    for (let b = 0; b < 4; b += zufall() < 0.5 ? 1 : 2) {
      if (zufall() < 0.22) continue; // Pause
      melodie = Math.max(0, Math.min(9, melodie + wahl([-2, -1, -1, 0, 1, 1, 2])));
      const m = grund + 12 + Math.floor(melodie / 5) * 12 + penta[melodie % 5];
      ton(t0 + b * schlag, m, schlag * 1.6, { laut: 0.07, an: 0.02, aus: 0.5 });
      ton(t0 + b * schlag, m, schlag * 1.6, { typ: "triangle", laut: 0.025, an: 0.02, aus: 0.5, verstimmt: 6 });
    }
  }
  // Glocke je Füllung: hoher Akkordton mit unharmonischem Oberton
  for (const t of glocken) {
    const st = akkordBei(t), w = grund + st;
    const m = wahl([w, w + (moll(st) ? 3 : 4), w + 7]) + 24;
    ton(t, m, 0.7, { laut: 0.09, an: 0.005, aus: 0.65, ziel: haupt });
    ton(t, m + 28, 0.35, { laut: 0.02, an: 0.005, aus: 0.3, ziel: haupt });
  }
  return ac.startRendering();
}

// ---------- Ersatz: Echtzeit-Aufnahme ----------
function echtzeit(v, bild, ton, gesamt, fortschritt) {
  const typ = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((t) => window.MediaRecorder?.isTypeSupported(t));
  if (!typ) return Promise.reject(new Error("Kein Videoformat verfügbar"));
  const strom = v.captureStream(FPS);
  const ac = new AudioContext(), quelle = ac.createBufferSource(), ziel = ac.createMediaStreamDestination();
  quelle.buffer = ton; quelle.connect(ziel);
  strom.addTrack(ziel.stream.getAudioTracks()[0]);
  const rec = new MediaRecorder(strom, { mimeType: typ, videoBitsPerSecond: 4e6 });
  const teile = [];
  rec.ondataavailable = (e) => e.data.size && teile.push(e.data);
  return new Promise((ok) => {
    rec.onstop = () => { ac.close(); ok({ blob: new Blob(teile, { type: typ.split(";")[0] }), endung: typ.startsWith("video/mp4") ? "mp4" : "webm" }); };
    bild(0); rec.start(); quelle.start();
    const t0 = performance.now();
    const schritt = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= gesamt) { fortschritt(1); rec.stop(); return; }
      bild(t); fortschritt(t / gesamt);
      requestAnimationFrame(schritt);
    };
    requestAnimationFrame(schritt);
  });
}
