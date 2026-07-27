# Background-removal sidecar

A tiny local Python service that strips the background from a clothing photo with
[`rembg`](https://github.com/danielgatis/rembg) and returns a transparent PNG.

It runs as a **separate process** from Expo on purpose: `rembg` is a native
Python library and cannot be bundled into an Expo Router API route (those bundle
to a single JS file with only Node built-ins). The Expo backend
(`lib/server/bg.ts`) reaches it over HTTP.

## Setup (one time)

```bash
cd services/bg-removal
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
```

The first request downloads the `u2net` model (~170 MB) into `~/.u2net/`.

## Run

You normally don't start this by hand. `npm start` (and `npm run web`) launch it
automatically via `scripts/dev.js` — that script checks `:7000/health` first and
reuses an already-running sidecar, so cutouts can't silently break just because
you forgot to start it. It shuts down when Expo does.

To run it standalone (e.g. debugging just the sidecar):

```bash
python app.py         # listens on http://127.0.0.1:7000
```

`npm run start:expo-only` starts Expo without the sidecar if you ever need that.

## Point the app at it

Add to the app's `.env`:

```
BG_REMOVAL_URL=http://127.0.0.1:7000
```

If `BG_REMOVAL_URL` is **unset**, cutouts are skipped entirely — garments save
with their original photo and the app still works. Background removal is a
best-effort enhancement, never a hard dependency.

## API

`POST /cutout`  →  `{ "imageBase64": "<jpeg>" }`  →  `{ "cutoutBase64": "<png>" }`

`GET /health`   →  `{ "status": "ok" }`
