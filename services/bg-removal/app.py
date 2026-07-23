"""Local background-removal sidecar for Fitcheck.

rembg can't run inside the Expo API routes (they bundle to one JS file with only
Node built-ins), so it lives here as a tiny standalone HTTP service. The Expo
backend POSTs a base64 JPEG and gets a base64 transparent PNG back.

Run:  python app.py       (listens on http://127.0.0.1:7000)
Then set BG_REMOVAL_URL=http://127.0.0.1:7000 in the app's .env.
"""

import base64
import io

from flask import Flask, jsonify, request
from rembg import remove
from PIL import Image

app = Flask(__name__)

# One session, reused across requests, so the u2net model loads once.
from rembg.session_factory import new_session  # noqa: E402

_session = new_session("u2net")


@app.get("/health")
def health():
    return jsonify(status="ok")


@app.post("/cutout")
def cutout():
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
    # 127.0.0.1 only: this is a dev-machine sidecar, never exposed to the LAN.
    app.run(host="127.0.0.1", port=7000)
