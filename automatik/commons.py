"""Gemeinfreie Fotos von Wikimedia Commons als Vorlage für echte Bauwerke und Orte.

  python3 automatik/commons.py suche "Tower Bridge London"     listet passende Dateien (nur gemeinfrei/CC0)
  python3 automatik/commons.py hole "File:…jpg" <ziel.png>    lädt die Datei als RGB-PNG (prüft die Lizenz erneut)

Nur gemeinfrei oder CC0: Bei CC-BY-SA könnte die Strichzeichnung als Bearbeitung gelten und müsste dann
unter derselben Lizenz stehen. Die Datei kommt in katalog.mjs als `vorlage: "File:…"` zum Bild."""
import json, subprocess, sys, urllib.parse, urllib.request

API = "https://commons.wikimedia.org/w/api.php?"
UA = {"User-Agent": "malkiste-ausmalbilder/1.0 (https://malkiste.eu)"}


def api(**p):
    p |= {"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 1400}
    return json.load(urllib.request.urlopen(urllib.request.Request(API + urllib.parse.urlencode(p), headers=UA), timeout=30))


def frei(ii):
    lic = ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value", "")
    l = lic.lower()
    return ("public domain" in l or "cc0" in l or l.startswith("pd")) and "by" not in l, lic


def suche(begriff, n=8):
    seiten = api(generator="search", gsrsearch=f"filetype:bitmap {begriff}", gsrnamespace=6, gsrlimit=50)
    seiten = sorted(seiten.get("query", {}).get("pages", {}).values(), key=lambda p: p["index"])
    treffer = []
    for p in seiten:
        ii = p["imageinfo"][0]; ok, lic = frei(ii)
        if ok and ii["width"] >= 1000:
            treffer.append({"vorlage": p["title"], "lizenz": lic, "groesse": f'{ii["width"]}x{ii["height"]}',
                            "vorschau": ii["thumburl"], "seite": ii["descriptionurl"]})
    print(json.dumps(treffer[:n], ensure_ascii=False, indent=1))


def hole(titel, ziel):
    p = next(iter(api(titles=titel)["query"]["pages"].values()))
    if "imageinfo" not in p: sys.exit(f"nicht gefunden: {titel}")
    ii = p["imageinfo"][0]; ok, lic = frei(ii)
    if not ok: sys.exit(f"Lizenz nicht gemeinfrei/CC0: {titel} ({lic})")
    daten = urllib.request.urlopen(urllib.request.Request(ii["thumburl"], headers=UA), timeout=60).read()
    # Graustufen-JPEGs mit einem Kanal nimmt die Bild-API nicht an, deshalb immer als RGB speichern
    subprocess.run(["magick", "-", "-strip", "-colorspace", "sRGB", "-type", "TrueColor", "PNG24:" + ziel], input=daten, check=True)
    print(f"{titel} ({lic}) → {ziel}")


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "suche": suche(" ".join(sys.argv[2:]))
    elif len(sys.argv) == 4 and sys.argv[1] == "hole": hole(sys.argv[2], sys.argv[3])
    else: print(__doc__); sys.exit(2)
