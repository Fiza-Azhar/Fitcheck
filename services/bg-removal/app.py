"""Background-removal sidecar for Fitcheck.

rembg can't run inside the Expo API routes (they bundle to one JS file with only
Node built-ins), so it lives here as a tiny standalone HTTP service. The Expo
backend POSTs a base64 JPEG and gets a base64 transparent PNG back.

The same file serves both ends:

  * locally, `python app.py` binds 127.0.0.1:7000 for `scripts/dev.js`;
  * in production a host (Hugging Face Spaces, Render, Fly) sets PORT, and the
    service binds 0.0.0.0 so the platform's proxy can reach it.

Once it is reachable from the public internet it needs a door: BG_REMOVAL_TOKEN
must match the caller's bearer token, so a leaked URL can't be used to burn a
free tier's CPU on strangers' images. The token is optional only when bound to
localhost, where there is nothing to protect against.
"""

import base64
import io
import os

from flask import Flask, jsonify, request
from rembg import remove
from rembg.session_factory import new_session
from PIL import Image

# u2net is the accurate default (~176 MB) but wants roughly a gigabyte of RAM at
# peak; u2netp is the same architecture pruned to ~4.7 MB and runs in a fraction
# of that, at a small cost in edge quality. Free tiers differ enough in what they
# tolerate that this is a deploy-time choice, not a code change.
MODEL = os.environ.get("BG_REMOVAL_MODEL", "u2net")
TOKEN = os.environ.get("BG_REMOVAL_TOKEN")

app = Flask(__name__)

# One session, reused across requests, so the model loads once and not per call.
_session = new_session(MODEL)


def _authorized() -> bool:
    if not TOKEN:
        return True  # no token configured — local dev, nothing to guard
    header = request.headers.get("Authorization", "")
    return header.startswith("Bearer ") and header[7:] == TOKEN


@app.get("/health")
def health():
    # Deliberately unauthenticated and cheap: platform health checks and the dev
    # launcher both poll it, and it reveals nothing beyond "the model loaded".
    return jsonify(status="ok", model=MODEL)


@app.post("/cutout")
def cutout():
    if not _authorized():
        return jsonify(error="unauthorized"), 401

    data = request.get_json(silent=True) or {}
    image_b64 = data.get("imageBase64")
    if not isinstance(image_b64, str) or not image_b64:
        return jsonify(error="imageBase64 required"), 400

    try:
        raw = base64.b64decode(image_b64)
        src = Image.open(io.BytesIO(raw)).convert("RGBA")
        out = remove(src, session=_session)  # transparent PNG (PIL Image)

        buf = io.BytesIO()
        out.save(buf, format="PNG")
        cutout_b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        return jsonify(cutoutBase64=cutout_b64)
    except Exception as exc:  # noqa: BLE001 — surface any decode/model failure
        return jsonify(error=str(exc)), 500


if __name__ == "__main__":
    # PORT is how every PaaS tells a service where to listen, so its presence is
    # a reliable "this is not my laptop" signal — and only then do we leave
    # localhost. The dev sidecar stays bound to 127.0.0.1 exactly as before.
    port = os.environ.get("PORT")
    if port:
        app.run(host="0.0.0.0", port=int(port))  # noqa: S104 — platform-facing
    else:
        app.run(host="127.0.0.1", port=7000)
