#!/usr/bin/env python3
"""Generate an image with a Gemini image model on Vertex AI.

Reads its configuration from ~/.config/janrenz/gemini.env so that no credential
path or project id has to be passed on the command line (and so nothing secret
ends up in shell history or an agent transcript).

Copy for the Malkiste automation: without that file (in the cloud) the same
variables come from the environment, and the service-account key itself can be
passed as JSON in GOOGLE_SA_KEY_JSON; it is written to a private temp file.

  gen-image --prompt "..." --out ~/pic.png
  gen-image --prompt "..." --out hero.png --aspect 16:9 --model gemini-3-pro-image
  gen-image --prompt "make the sky red" --ref before.png --out after.png

Exit codes: 0 ok, 1 usage/config error, 2 API error, 3 no image in response.
"""

import argparse
import os
import pathlib
import sys

CONFIG = pathlib.Path.home() / ".config" / "janrenz" / "gemini.env"
DEFAULT_MODEL = "gemini-3.1-flash-image"
ASPECTS = ("1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9")


def die(msg, code=1):
    print(f"gen-image: {msg}", file=sys.stderr)
    sys.exit(code)


def load_config():
    """Put KEY=VALUE lines from the config file into the environment.

    Existing environment variables win, so a one-off override still works.
    """
    # Aus einem .env-Feld kann der Wert noch in einfachen Anführungszeichen kommen
    key_json = os.environ.get("GOOGLE_SA_KEY_JSON", "").strip().strip("'")
    if key_json and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        import tempfile
        fd, path = tempfile.mkstemp(prefix="sa-", suffix=".json")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(key_json)
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = path
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
    if not CONFIG.exists() and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        die(f"missing config {CONFIG} and no GOOGLE_SA_KEY_JSON in the environment\n"
            f"  set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SA_KEY_JSON, GOOGLE_CLOUD_PROJECT,\n"
            f"  GOOGLE_CLOUD_LOCATION and GOOGLE_GENAI_USE_VERTEXAI=true")
    lines = CONFIG.read_text(encoding="utf-8").splitlines() if CONFIG.exists() else []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

    cred = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    if not cred:
        die("GOOGLE_APPLICATION_CREDENTIALS is not set in the config")
    if not pathlib.Path(cred).is_file():
        die(f"credential file not found: {cred}")
    if not os.environ.get("GOOGLE_CLOUD_PROJECT"):
        die("GOOGLE_CLOUD_PROJECT is not set in the config")


def main():
    ap = argparse.ArgumentParser(
        prog="gen-image",
        description="Generate an image with a Gemini image model on Vertex AI.",
    )
    ap.add_argument("--prompt", "-p", required=True, help="what to draw")
    ap.add_argument("--out", "-o", required=True, help="output file (.png)")
    ap.add_argument("--aspect", "-a", default="16:9", choices=ASPECTS,
                    help="aspect ratio (default: 16:9)")
    ap.add_argument("--model", "-m", default=None,
                    help=f"model id (default: $GENAI_IMAGE_MODEL or {DEFAULT_MODEL})")
    ap.add_argument("--ref", action="append", metavar="FILE", default=[],
                    help="reference image to edit or extend; repeatable")
    ap.add_argument("--force", "-f", action="store_true",
                    help="overwrite the output file if it exists")
    args = ap.parse_args()

    out = pathlib.Path(args.out).expanduser()
    if out.exists() and not args.force:
        die(f"{out} exists (use --force to overwrite)")
    if out.parent and not out.parent.exists():
        out.parent.mkdir(parents=True, exist_ok=True)

    load_config()
    model = args.model or os.environ.get("GENAI_IMAGE_MODEL") or DEFAULT_MODEL

    # The SDK logs an automatic-function-calling recommendation on every
    # generate_content call. It does not apply here (no tools) — keep it quiet.
    import logging
    logging.getLogger("google_genai.models").setLevel(logging.ERROR)

    from google import genai
    from google.genai import types

    try:
        client = genai.Client()
    except Exception as exc:  # noqa: BLE001 - surface the SDK's own message
        die(f"could not create client: {exc}", 2)

    parts = [args.prompt]
    for ref in args.ref:
        path = pathlib.Path(ref).expanduser()
        if not path.is_file():
            die(f"reference image not found: {path}")
        suffix = path.suffix.lower()
        mime = "image/jpeg" if suffix in (".jpg", ".jpeg") else f"image/{suffix.lstrip('.')}"
        parts.append(types.Part.from_bytes(data=path.read_bytes(), mime_type=mime))

    try:
        response = client.models.generate_content(
            model=model,
            contents=parts,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio=args.aspect),
            ),
        )
    except Exception as exc:  # noqa: BLE001
        die(f"{model} failed: {exc}", 2)

    written = 0
    for candidate in response.candidates or []:
        for part in candidate.content.parts or []:
            blob = getattr(part, "inline_data", None)
            if blob and blob.data:
                out.write_bytes(blob.data)
                written += 1
                break
        if written:
            break

    if not written:
        reason = ""
        for candidate in response.candidates or []:
            if getattr(candidate, "finish_reason", None):
                reason = f" (finish_reason: {candidate.finish_reason})"
            for part in candidate.content.parts or []:
                if getattr(part, "text", None):
                    reason += f"\n  model said: {part.text.strip()[:300]}"
        die(f"no image in the response{reason}", 3)

    size = out.stat().st_size
    print(f"{out}  {size // 1024} KiB  {args.aspect}  {model}")


if __name__ == "__main__":
    main()
