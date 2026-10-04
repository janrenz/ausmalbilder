// Online ausmalen: Die Farbe liegt in einem Canvas, die Strichzeichnung als <img> darüber (mix-blend-mode: multiply),
// so bleiben die Linien immer sichtbar. Der Farbeimer füllt die Fläche, die die Linien umschließen.
// Nichts wird gespeichert oder hochgeladen; „Bild speichern“ erzeugt die PNG-Datei im Browser, „Teilen“ und das
// Mal-Video (ausmalen-video.mjs) nutzen das Teilen-Menü des Geräts.
(() => {
  const SKRIPT = document.currentScript?.src || location.href;
  const dlg = document.getElementById("malen");
  if (!dlg) return;
  const leinwand = dlg.querySelector("canvas");
  const linien = dlg.querySelector(".malflaeche img");
  const ctx = leinwand.getContext("2d", { willReadFrequently: true });
  const W = leinwand.width, H = leinwand.height;
  const GROESSE = { klein: 6, mittel: 14, gross: 32 };
  const verlauf = [];
  const MAX_VERLAUF = 12;
  // Jede Aktion für das Mal-Video: {a:"f",x,y,c} Füllung, {a:"s",w,g,c,p:[x,y,…]} Strich, {a:"n"} neu anfangen.
  // sichern() legt einen Platz an, rueckgaengig() nimmt die letzte Aktion mit zurück.
  const aktionen = [];
  let wand = null; // 1 = Linie der Zeichnung, dort hört der Farbeimer auf
  let laden = null;
  let stift = null;
  let geaendert = false;
  let gepusht = false;

  const wert = (n) => dlg.querySelector(`input[name="${n}"]:checked`)?.value;
  const eigene = dlg.querySelector('input[type="color"]');
  const farbe = () => (wert("farbe") === "eigene" ? eigene.value : wert("farbe"));
  const zurueck = dlg.querySelector('[data-aktion="zurueck"]');

  function ladeLinien() {
    laden ??= new Promise((ok, fehler) => {
      linien.onload = () => {
        const c = document.createElement("canvas");
        c.width = W; c.height = H;
        const x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
        x.drawImage(linien, 0, 0, W, H, 0, 0, W, H); // nur die Zeichnung, ohne den Streifen mit „malkiste.eu“ darunter
        const d = x.getImageData(0, 0, W, H).data;
        wand = new Uint8Array(W * H);
        for (let i = 0; i < wand.length; i++) wand[i] = d[i * 4] < 160 ? 1 : 0;
        ok();
      };
      linien.onerror = fehler;
      linien.src = dlg.dataset.bild;
    });
    return laden;
  }

  // ---------- Verlauf ----------
  function sichern() {
    verlauf.push(ctx.getImageData(0, 0, W, H));
    if (verlauf.length > MAX_VERLAUF) verlauf.shift();
    aktionen.push(null);
    zurueck.disabled = false;
  }
  function rueckgaengig() {
    const d = verlauf.pop();
    if (d) { ctx.putImageData(d, 0, 0); aktionen.pop(); }
    zurueck.disabled = !verlauf.length;
  }

  // ---------- Stifte ----------
  // Bunt- und Wachsmalstift malen mit einem gekörnten Muster, Überstreichen deckt nach und nach mehr.
  const muster = new Map();
  function koernung(hex, groesse, dichte, deckung) {
    const k = `${hex}|${groesse}`;
    if (!muster.has(k)) {
      const c = document.createElement("canvas");
      c.width = c.height = groesse;
      const x = c.getContext("2d");
      const d = x.createImageData(groesse, groesse);
      const [r, g, b] = rgb(hex);
      for (let i = 0; i < d.data.length; i += 4) {
        d.data[i] = r; d.data[i + 1] = g; d.data[i + 2] = b;
        d.data[i + 3] = Math.random() < dichte ? 255 * (deckung + Math.random() * (1 - deckung)) : 0;
      }
      x.putImageData(d, 0, 0);
      muster.set(k, ctx.createPattern(c, "repeat"));
    }
    return muster.get(k);
  }
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  const merke = (a) => { aktionen[aktionen.length - 1] = a; };
  const r1 = (v) => Math.round(v * 10) / 10;
  const strich = (x0, y0, x1, y1) => zeichneStrich(ctx, wert("werkzeug"), wert("groesse"), farbe(), x0, y0, x1, y1);
  function zeichneStrich(ctx, w, g, hex, x0, y0, x1, y1) {
    let breite = GROESSE[g] || 14;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = "round";
    if (w === "radierer") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
      breite *= 1.5;
    } else if (w === "buntstift") {
      ctx.strokeStyle = koernung(hex, 32, 0.45, 0.35);
    } else if (w === "wachsmaler") {
      ctx.strokeStyle = koernung(hex, 48, 0.8, 0.7);
      breite *= 1.4;
    } else {
      ctx.strokeStyle = hex;
    }
    ctx.lineWidth = breite;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 + (x1 === x0 && y1 === y0 ? 0.01 : 0), y1);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- Farbeimer ----------
  function fuellen(x, y, hex) {
    const flaeche = maskeVon(x, y);
    if (!flaeche) return false;
    const bild = ctx.getImageData(0, 0, W, H), d = bild.data;
    const [r, g, b] = rgb(hex);
    for (let p = 0; p < flaeche.length; p++) {
      if (!flaeche[p]) continue;
      d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; d[p * 4 + 3] = 255;
    }
    ctx.putImageData(bild, 0, 0);
    return true;
  }
  // Die Fläche, die der Farbeimer an (x, y) füllt, als Maske (1 = gehört dazu); null auf einer Linie
  function maskeVon(x, y) {
    const start = (y | 0) * W + (x | 0);
    if (wand[start]) return null;
    const flaeche = new Uint8Array(W * H);
    const stapel = [start];
    flaeche[start] = 1;
    const weiter = (p) => { if (!flaeche[p] && !wand[p]) { flaeche[p] = 1; stapel.push(p); } };
    while (stapel.length) {
      const p = stapel.pop(), px = p % W;
      if (px > 0) weiter(p - 1);
      if (px < W - 1) weiter(p + 1);
      if (p >= W) weiter(p - W);
      if (p < W * (H - 1)) weiter(p + W);
    }
    // Zwei Pixel unter die Linien ausdehnen, damit an den weichen Kanten kein weißer Saum bleibt
    for (let runde = 0; runde < 2; runde++) {
      const neu = [];
      for (let p = 0; p < flaeche.length; p++) {
        if (flaeche[p] || !wand[p]) continue;
        const px = p % W;
        if ((px > 0 && flaeche[p - 1]) || (px < W - 1 && flaeche[p + 1]) || (p >= W && flaeche[p - W]) || (p < W * (H - 1) && flaeche[p + W])) neu.push(p);
      }
      for (const p of neu) flaeche[p] = 1;
    }
    return flaeche;
  }

  // ---------- Zoom ----------
  // Die Malfläche wird per CSS-Transform vergrößert; punkt() rechnet über getBoundingClientRect, malt also weiter genau.
  const buehne = dlg.querySelector(".buehne");
  const flaeche = dlg.querySelector(".malflaeche");
  const ZOOM_MAX = 6;
  let zoom = 1, tx = 0, ty = 0;
  function ansicht() {
    const w = flaeche.offsetWidth, h = flaeche.offsetHeight;
    zoom = Math.min(ZOOM_MAX, Math.max(1, zoom));
    // Das vergrößerte Bild deckt immer die ganze Malfläche ab
    tx = Math.min(0, Math.max(w * (1 - zoom), tx));
    ty = Math.min(0, Math.max(h * (1 - zoom), ty));
    flaeche.style.transform = zoom === 1 ? "" : `translate(${tx}px, ${ty}px) scale(${zoom})`;
    dlg.classList.toggle("gezoomt", zoom > 1);
  }
  // Zoomt so, dass der Punkt unter (cx, cy) auf dem Bildschirm dort bleibt
  function zoomeAuf(neu, cx, cy) {
    const r = flaeche.getBoundingClientRect();
    const lx = (cx - r.left) / zoom, ly = (cy - r.top) / zoom; // Punkt in unvergrößerten Pixeln
    const z = Math.min(ZOOM_MAX, Math.max(1, neu));
    tx = cx - (r.left - tx) - lx * z;
    ty = cy - (r.top - ty) - ly * z;
    zoom = z;
    ansicht();
  }
  const mitte = () => { const r = buehne.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  dlg.querySelector('[data-zoom="rein"]').addEventListener("click", () => zoomeAuf(zoom * 1.5, ...mitte()));
  dlg.querySelector('[data-zoom="raus"]').addEventListener("click", () => zoomeAuf(zoom / 1.5, ...mitte()));
  dlg.querySelector('[data-zoom="ganz"]').addEventListener("click", () => { zoom = 1; tx = ty = 0; ansicht(); });
  buehne.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) zoomeAuf(zoom * Math.exp(-Math.max(-100, Math.min(100, e.deltaY)) * 0.002), e.clientX, e.clientY); // Trackpad-Geste kommt als Strg+Rad, eine Mausrast ≈ ×1,2
    else if (zoom > 1) { tx -= e.deltaX; ty -= e.deltaY; ansicht(); }
  }, { passive: false });
  addEventListener("resize", () => { zoom = 1; tx = ty = 0; ansicht(); });

  // ---------- Zeiger ----------
  // Ein Finger malt, zwei Finger zoomen und verschieben. Kommt der zweite Finger dazu, wird der angefangene Strich zurückgenommen.
  // Der Farbeimer füllt erst beim Loslassen, damit der erste Finger einer Zoom-Geste nichts einfärbt.
  const punkt = (e) => {
    const r = leinwand.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  };
  const finger = new Map();
  let geste = null;   // { abstand, z, mx, my } während zwei Finger liegen
  let schieben = null; // Hand-Werkzeug: letzter Punkt
  let tippen = null;  // Farbeimer: Startpunkt
  const imBild = (e) => { const r = leinwand.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  function zweiFinger() {
    const [a, b] = [...finger.values()];
    return { abstand: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
  buehne.addEventListener("pointerdown", (e) => {
    if (!wand || e.target.closest(".zoom") || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    buehne.setPointerCapture(e.pointerId);
    finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (finger.size === 2) {
      if (stift) { rueckgaengig(); stift = null; }
      tippen = schieben = null;
      geste = { ...zweiFinger(), z: zoom };
      return;
    }
    if (finger.size > 2 || geste) return;
    const w = wert("werkzeug");
    if (w === "verschieben") { schieben = { x: e.clientX, y: e.clientY }; return; }
    if (!imBild(e)) return;
    const [x, y] = punkt(e);
    if (w === "fuellen") { tippen = { id: e.pointerId, x: e.clientX, y: e.clientY, px: x, py: y }; return; }
    sichern();
    stift = { id: e.pointerId, x, y };
    merke({ a: "s", w, g: wert("groesse"), c: farbe(), p: [r1(x), r1(y)] });
    strich(x, y, x, y);
    geaendert = true;
  });
  buehne.addEventListener("pointermove", (e) => {
    if (!finger.has(e.pointerId)) return;
    finger.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (geste && finger.size === 2) {
      const g = zweiFinger();
      tx += g.mx - geste.mx; ty += g.my - geste.my;
      geste.mx = g.mx; geste.my = g.my;
      ansicht();
      zoomeAuf(geste.z * g.abstand / geste.abstand, g.mx, g.my);
      return;
    }
    if (schieben) {
      tx += e.clientX - schieben.x; ty += e.clientY - schieben.y;
      schieben = { x: e.clientX, y: e.clientY };
      ansicht();
      return;
    }
    if (tippen && Math.hypot(e.clientX - tippen.x, e.clientY - tippen.y) > 12) tippen = null;
    if (!stift || e.pointerId !== stift.id) return;
    for (const ev of e.getCoalescedEvents?.() || [e]) {
      const [x, y] = punkt(ev);
      strich(stift.x, stift.y, x, y);
      stift.x = x; stift.y = y;
      aktionen[aktionen.length - 1]?.p?.push(r1(x), r1(y));
    }
  });
  const ende = (e) => {
    if (!finger.delete(e.pointerId)) return;
    if (e.type === "pointerup" && tippen?.id === e.pointerId && !geste) {
      sichern();
      const hex = farbe();
      if (fuellen(tippen.px, tippen.py, hex)) { geaendert = true; merke({ a: "f", x: tippen.px | 0, y: tippen.py | 0, c: hex }); }
      else rueckgaengig();
    }
    tippen = null;
    if (stift?.id === e.pointerId) stift = null;
    if (!finger.size) { geste = null; schieben = null; } // erst wenn alle Finger weg sind, wieder malen
  };
  buehne.addEventListener("pointerup", ende);
  buehne.addEventListener("pointercancel", ende);

  // ---------- Knöpfe ----------
  eigene.addEventListener("input", () => { dlg.querySelector('input[name="farbe"][value="eigene"]').checked = true; });
  zurueck.addEventListener("click", rueckgaengig);
  dlg.querySelector('[data-aktion="neu"]').addEventListener("click", (e) => {
    if (!confirm(e.currentTarget.dataset.frage)) return;
    sichern();
    merke({ a: "n" });
    ctx.clearRect(0, 0, W, H);
    geaendert = false;
  });
  // Die Vorlage ist höher als die Leinwand: Der Streifen mit „malkiste.eu“ kommt mit ins gespeicherte Bild
  const bildDatei = () => new Promise((ok) => {
    const c = document.createElement("canvas");
    c.width = W; c.height = Math.max(H, linien.naturalHeight);
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(leinwand, 0, 0);
    x.globalCompositeOperation = "multiply";
    x.drawImage(linien, 0, 0);
    c.toBlob((blob) => ok(new File([blob], `${dlg.dataset.datei}.png`, { type: "image/png" })), "image/png");
  });
  function herunterladen(datei) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(datei);
    a.download = datei.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }
  // Teilen-Menü des Geräts (Handy, Tablet, manche Desktop-Browser); ohne Web Share bleibt nur Speichern
  const kannTeilen = (datei) => !!navigator.canShare?.({ files: [datei] });
  async function teilen(datei) {
    try {
      await navigator.share({ files: [datei], title: dlg.dataset.titel, text: dlg.dataset.teilentext });
      return true;
    } catch (e) {
      if (e.name !== "AbortError") herunterladen(datei);
      return false;
    }
  }
  dlg.querySelector('[data-aktion="speichern"]').addEventListener("click", async () => {
    herunterladen(await bildDatei());
    geaendert = false;
  });
  const teilenKnopf = dlg.querySelector('[data-aktion="teilen"]');
  teilenKnopf.hidden = !kannTeilen(new File([""], "x.png", { type: "image/png" }));
  teilenKnopf.addEventListener("click", async () => { if (await teilen(await bildDatei())) geaendert = false; });

  // ---------- Mal-Video ----------
  const fenster = dlg.querySelector(".videofenster");
  const vtext = fenster.querySelector(".videotext"), balken = fenster.querySelector("progress");
  const vorschau = fenster.querySelector("video"), vknoepfe = fenster.querySelector(".videoknoepfe");
  const warten = [fenster.querySelector(".malt"), balken, fenster.querySelector(".videodauer")];
  const wartend = (an) => { for (const el of warten) el.hidden = !an; };
  let videoDatei = null, abbruch = false;
  dlg.querySelector('[data-aktion="video"]').addEventListener("click", async () => {
    if (!aktionen.some(Boolean)) { alert(dlg.dataset.videoleer); return; }
    abbruch = false; videoDatei = null;
    fenster.hidden = false; vorschau.hidden = vknoepfe.hidden = true; wartend(true); balken.value = 0;
    vtext.textContent = dlg.dataset.videoerstellen;
    try {
      const { erstelleVideo } = await import(new URL("ausmalen-video.mjs", SKRIPT));
      const { blob, endung } = await erstelleVideo({
        W, H, aktionen, maskeVon, zeichneStrich, linien, logo: new URL("logo.svg", SKRIPT).href,
        titel: dlg.dataset.titel, schluss: dlg.dataset.videoschluss, seite: dlg.dataset.seite,
      }, (a) => { balken.value = a; vtext.textContent = `${dlg.dataset.videoerstellen} ${Math.round(a * 100)} %`; });
      if (abbruch) return;
      videoDatei = new File([blob], `${dlg.dataset.datei}.${endung}`, { type: blob.type });
      vorschau.src = URL.createObjectURL(videoDatei);
      vorschau.onloadedmetadata = () => { vorschau.currentTime = Math.max(0, vorschau.duration - 0.3); }; // fertiges Bild als Vorschau
      vorschau.hidden = vknoepfe.hidden = false; wartend(false);
      vtext.textContent = dlg.dataset.videofertig;
      fenster.querySelector('[data-video="teilen"]').hidden = !kannTeilen(videoDatei);
    } catch (e) {
      console.error(e);
      vtext.textContent = dlg.dataset.videofehler; wartend(false);
    }
  });
  fenster.querySelector('[data-video="teilen"]').addEventListener("click", () => videoDatei && teilen(videoDatei));
  fenster.querySelector('[data-video="speichern"]').addEventListener("click", () => videoDatei && herunterladen(videoDatei));
  fenster.querySelector('[data-video="zu"]').addEventListener("click", () => {
    abbruch = true; fenster.hidden = true; vorschau.pause();
    if (vorschau.src) { URL.revokeObjectURL(vorschau.src); vorschau.removeAttribute("src"); }
  });
  dlg.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); rueckgaengig(); }
  });

  // ---------- Öffnen und Schließen ----------
  // #ausmalen in der Adresse: Link direkt in den Malmodus, und „Zurück“ auf dem Handy schließt ihn.
  function oeffnen(push) {
    if (dlg.open) return;
    if (push) { history.pushState({ malen: true }, "", "#ausmalen"); gepusht = true; }
    dlg.showModal();
    ladeLinien();
  }
  document.querySelectorAll("[data-ausmalen]").forEach((k) => k.addEventListener("click", () => oeffnen(true)));
  dlg.addEventListener("close", () => {
    if (location.hash !== "#ausmalen") return;
    if (gepusht) history.back();
    else history.replaceState(null, "", location.pathname + location.search);
    gepusht = false;
  });
  addEventListener("popstate", () => { if (dlg.open && location.hash !== "#ausmalen") { gepusht = false; dlg.close(); } });
  addEventListener("beforeunload", (e) => { if (geaendert) e.preventDefault(); });
  if (location.hash === "#ausmalen") oeffnen(false);
})();
