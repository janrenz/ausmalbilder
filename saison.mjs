// Kalender für „Passend zur Jahreszeit“ und für Anlass-Themen der Automatik.
// Jeder Eintrag gehört zu einem Themen-slug aus katalog.mjs. `von`/`bis` ist das Fenster, in dem das Thema
// auf der Startseite erscheint. Fehlt das Thema noch im Katalog, legt die Automatik es ab VORLAUF Tagen vor
// `von` an (siehe automatik/lauf.sh); `ideen` ist dann der Auftrag für die Motive.
export const VORLAUF = 21;
const PLATZ = 4; // so viele Themen zeigt der Abschnitt auf der Startseite
const BALD = 60;  // aufgefüllt wird nur mit Themen, die in so vielen Tagen beginnen

// Ostersonntag (gregorianisch, Algorithmus nach Meeus/Jones/Butcher)
function ostern(j) {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return tag(j, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
}
const tag = (j, m, t) => new Date(Date.UTC(j, m - 1, t));
const plus = (d, n) => new Date(d.getTime() + n * 864e5);
const md = (s) => (j) => tag(j, +s.slice(0, 2), +s.slice(3, 5));
// n-ter Sonntag im Monat
const sonntag = (m, n) => (j) => { const d = tag(j, m, 1); return plus(d, (7 - d.getUTCDay()) % 7 + 7 * (n - 1)); };

export const kalender = [
  { slug: "silvester", name: "Silvester und Neujahr", von: md("12-27"), bis: (j) => md("01-06")(j + 1), ideen: "Feuerwerk über einer Stadt, Kinder mit Wunderkerzen, Glücksbringer (Kleeblatt, Schwein, Hufeisen), eine Uhr kurz vor zwölf, Luftschlangen und Konfetti" },
  { slug: "winter", von: md("12-01"), bis: (j) => md("02-28")(j + 1) },
  { slug: "valentinstag", name: "Valentinstag", von: (j) => plus(md("02-14")(j), -14), bis: md("02-14"), ideen: "Herzen mit Mustern, zwei Tiere teilen sich ein Herz, ein Blumenstrauß, eine Karte mit Herzen ohne Schrift, Herz-Mandala" },
  { slug: "fasching", name: "Fasching und Karneval", von: (j) => plus(ostern(j), -48 - 21), bis: (j) => plus(ostern(j), -46), ideen: "Kinder in Kostümen (Pirat, Prinzessin, Löwe, Astronaut), Clown mit Luftballons, Masken, Konfetti und Luftschlangen, ein Umzugswagen" },
  { slug: "ostern", von: (j) => plus(ostern(j), -28), bis: (j) => plus(ostern(j), 1) },
  { slug: "fruehling", name: "Frühling", von: md("03-15"), bis: md("05-15"), ideen: "Tulpen und Narzissen, ein Vogelnest mit Eiern, Lämmer auf der Wiese, ein Kind beim Pflanzen, Schmetterlinge an Blüten, ein blühender Baum" },
  { slug: "muttertag", name: "Muttertag", von: (j) => plus(sonntag(5, 2)(j), -14), bis: sonntag(5, 2), ideen: "ein Blumenstrauß, Herz mit Blumen, Tiermutter mit Kind (Katze, Bär, Ente), ein Frühstück am Bett, eine Karte mit Blumen ohne Schrift" },
  { slug: "sommer", von: md("06-01"), bis: md("08-31") },
  { slug: "schulanfang", name: "Schulanfang", von: md("08-01"), bis: md("09-15"), ideen: "Kind mit Schultüte, Schulranzen mit Stiften, ein Klassenzimmer, Schulweg mit Zebrastreifen, Federmäppchen, Tiere als Schulkinder" },
  { slug: "herbst", von: md("09-15"), bis: md("11-20") },
  { slug: "deutschland", name: "Deutschland", von: (j) => plus(md("10-03")(j), -14), bis: (j) => plus(md("10-03")(j), 2), ideen: "Brandenburger Tor, Umriss der Deutschlandkarte (muss erkennbar stimmen), Kölner Dom, Schloss Neuschwanstein, Holstentor in Lübeck, Leuchtturm an der Nordsee; keine Flaggen-Farben nötig, keine Wappen oder Hoheitszeichen" },
  { slug: "halloween", von: md("10-01"), bis: md("10-31") },
  { slug: "sankt-martin", von: md("10-20"), bis: md("11-11") },
  { slug: "weihnachten", von: md("11-20"), bis: md("12-26") },
];

// Fenster eines Eintrags, das `d` enthält oder als nächstes kommt
function fenster(e, d) {
  const j = d.getUTCFullYear();
  for (const jahr of [j - 1, j, j + 1]) {
    const von = e.von(jahr), bis = e.bis(jahr);
    if (bis >= d) return { von, bis };
  }
}
const heute = (d) => { const x = d ? new Date(d) : new Date(); return tag(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); };

// Themen für „Passend zur Jahreszeit“: erst die aktiven (kurze Anlässe vor langen Jahreszeiten),
// dann auffüllen mit denen, die in den nächsten BALD Tagen beginnen
export function saisonThemen(vorhanden, datum) {
  const d = heute(datum);
  const e = kalender.filter((k) => vorhanden.includes(k.slug)).map((k) => ({ ...k, f: fenster(k, d) }));
  const aktiv = e.filter((k) => k.f.von <= d).sort((a, b) => (a.f.bis - a.f.von) - (b.f.bis - b.f.von));
  const bald = e.filter((k) => k.f.von > d && k.f.von <= plus(d, BALD)).sort((a, b) => a.f.von - b.f.von);
  return [...aktiv, ...bald].slice(0, PLATZ).map((k) => k.slug);
}

// Anlässe, deren Thema fehlt und die in höchstens VORLAUF Tagen beginnen oder gerade laufen
export function fehlendeAnlaesse(vorhanden, datum) {
  const d = heute(datum);
  return kalender
    .filter((k) => k.ideen && !vorhanden.includes(k.slug))
    .map((k) => ({ ...k, f: fenster(k, d) }))
    .filter((k) => plus(k.f.von, -VORLAUF) <= d)
    .sort((a, b) => a.f.von - b.f.von)
    .map((k) => ({ slug: k.slug, name: k.name, ideen: k.ideen, von: k.f.von.toISOString().slice(0, 10), bis: k.f.bis.toISOString().slice(0, 10) }));
}

// Aufruf von der Kommandozeile für automatik/lauf.sh: node saison.mjs saison|anlaesse [JJJJ-MM-TT]
if (import.meta.url === `file://${process.argv[1]}`) {
  const { themen } = await import("./katalog.mjs");
  const vorhanden = themen.map((t) => t.slug);
  const [, , was, datum] = process.argv;
  if (was === "saison") console.log(saisonThemen(vorhanden, datum).join(" "));
  else if (was === "anlaesse") console.log(JSON.stringify(fehlendeAnlaesse(vorhanden, datum)));
  else { console.error("node saison.mjs saison|anlaesse [JJJJ-MM-TT]"); process.exit(2); }
}
