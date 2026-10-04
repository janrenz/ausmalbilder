// Online ausmalen: Die Farbe liegt in einem Canvas, die Strichzeichnung als <img> darüber (mix-blend-mode: multiply),
// so bleiben die Linien immer sichtbar. Der Farbeimer füllt die Fläche, die die Linien umschließen.
// Nichts wird gespeichert oder hochgeladen; „Bild speichern“ erzeugt die PNG-Datei im Browser.
(() => {
  const dlg = document.getElementById("malen");
  if (!dlg) return;
  const leinwand = dlg.querySelector("canvas");
  const linien = dlg.querySelector(".malflaeche img");
  const ctx = leinwand.getContext("2d", { willReadFrequently: true });
  const W = leinwand.width, H = leinwand.height;
  const GROESSE = { klein: 6, mittel: 14, gross: 32 };
  const verlauf = [];
  const MAX_VERLAUF = 12;
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
        x.drawImage(linien, 0, 0, W, H);
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
    zurueck.disabled = false;
  }
  function rueckgaengig() {
    const d = verlauf.pop();
    if (d) ctx.putImageData(d, 0, 0);
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

  function strich(x0, y0, x1, y1) {
    const w = wert("werkzeug");
    let breite = GROESSE[wert("groesse")] || 14;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = "round";
    if (w === "radierer") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "#000";
      breite *= 1.5;
    } else if (w === "buntstift") {
      ctx.strokeStyle = koernung(farbe(), 32, 0.45, 0.35);
    } else if (w === "wachsmaler") {
      ctx.strokeStyle = koernung(farbe(), 48, 0.8, 0.7);
      breite *= 1.4;
    } else {
      ctx.strokeStyle = farbe();
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
    const start = (y | 0) * W + (x | 0);
    if (wand[start]) return false;
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
    const bild = ctx.getImageData(0, 0, W, H), d = bild.data;
    const [r, g, b] = rgb(hex);
    for (let p = 0; p < flaeche.length; p++) {
      if (!flaeche[p]) continue;
      d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; d[p * 4 + 3] = 255;
    }
    ctx.putImageData(bild, 0, 0);
    return true;
  }

  // ---------- Zeiger ----------
  const punkt = (e) => {
    const r = leinwand.getBoundingClientRect();
    return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
  };
  leinwand.addEventListener("pointerdown", (e) => {
    if (!wand || stift || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    const [x, y] = punkt(e);
    sichern();
    if (wert("werkzeug") === "fuellen") {
      if (fuellen(x, y, farbe())) geaendert = true;
      else rueckgaengig();
      return;
    }
    leinwand.setPointerCapture(e.pointerId);
    stift = { id: e.pointerId, x, y };
    strich(x, y, x, y);
    geaendert = true;
  });
  leinwand.addEventListener("pointermove", (e) => {
    if (!stift || e.pointerId !== stift.id) return;
    for (const ev of e.getCoalescedEvents?.() || [e]) {
      const [x, y] = punkt(ev);
      strich(stift.x, stift.y, x, y);
      stift.x = x; stift.y = y;
    }
  });
  const ende = (e) => { if (stift && e.pointerId === stift.id) stift = null; };
  leinwand.addEventListener("pointerup", ende);
  leinwand.addEventListener("pointercancel", ende);

  // ---------- Knöpfe ----------
  eigene.addEventListener("input", () => { dlg.querySelector('input[name="farbe"][value="eigene"]').checked = true; });
  zurueck.addEventListener("click", rueckgaengig);
  dlg.querySelector('[data-aktion="neu"]').addEventListener("click", (e) => {
    if (!confirm(e.currentTarget.dataset.frage)) return;
    sichern();
    ctx.clearRect(0, 0, W, H);
    geaendert = false;
  });
  dlg.querySelector('[data-aktion="speichern"]').addEventListener("click", () => {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    x.drawImage(leinwand, 0, 0);
    x.globalCompositeOperation = "multiply";
    x.drawImage(linien, 0, 0, W, H);
    c.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${dlg.dataset.datei}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      geaendert = false;
    }, "image/png");
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
