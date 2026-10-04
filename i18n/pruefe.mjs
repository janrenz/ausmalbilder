// Prüft eine Sprachdatei gegen de.mjs und katalog.mjs: node i18n/pruefe.mjs en
import de from "./de.mjs";
import { themen } from "../katalog.mjs";
const code = process.argv[2];
const { default: l } = await import(`./${code}.mjs`);
const fehler = [];
const slugOk = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
for (const k of Object.keys(de.ui)) {
  if (typeof l.ui?.[k] !== "string") { fehler.push(`ui.${k} fehlt`); continue; }
  for (const p of de.ui[k].match(/\{\w+\}/g) || []) if (!l.ui[k].includes(p)) fehler.push(`ui.${k}: Platzhalter ${p} fehlt`);
}
for (const k of Object.keys(de.seiten)) {
  const s = l.seiten?.[k];
  if (!s) { fehler.push(`seiten.${k} fehlt`); continue; }
  for (const f of ["pfad", "nav", "titel", "beschreibung", "html"]) if (!s[f]) fehler.push(`seiten.${k}.${f} fehlt`);
  if (s.pfad && !slugOk(s.pfad)) fehler.push(`seiten.${k}.pfad ungültig: ${s.pfad}`);
}
const pfade = new Set();
for (const t of themen) {
  const x = l.themen?.[t.slug];
  if (!x) { fehler.push(`themen.${t.slug} fehlt`); continue; }
  for (const f of ["name", "titel", "intro", "pfad"]) if (!x[f]) fehler.push(`themen.${t.slug}.${f} fehlt`);
  if (!slugOk(x.pfad || "")) fehler.push(`themen.${t.slug}.pfad ungültig: ${x.pfad}`);
  if (pfade.has(x.pfad)) fehler.push(`Themenpfad doppelt: ${x.pfad}`);
  pfade.add(x.pfad);
  const bp = new Set();
  for (const b of t.bilder) {
    const y = l.bilder?.[b.slug];
    if (!y) { fehler.push(`bilder.${b.slug} fehlt`); continue; }
    for (const f of ["titel", "alt", "pfad"]) if (!y[f]) fehler.push(`bilder.${b.slug}.${f} fehlt`);
    if (!slugOk(y.pfad || "")) fehler.push(`bilder.${b.slug}.pfad ungültig: ${y.pfad}`);
    if (bp.has(y.pfad)) fehler.push(`Bildpfad doppelt in ${t.slug}: ${y.pfad}`);
    bp.add(y.pfad);
  }
}
for (const s of Object.values(l.seiten || {})) if (pfade.has(s.pfad)) fehler.push(`Seitenpfad kollidiert mit Thema: ${s.pfad}`);
console.log(fehler.length ? fehler.join("\n") : `${code}: ok`);
process.exit(fehler.length ? 1 : 0);
