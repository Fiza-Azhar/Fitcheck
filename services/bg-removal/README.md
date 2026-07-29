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

## Deploying it (required for the built app)

Locally the sidecar lives at `127.0.0.1:7000`, which the *deployed* Expo server
cannot reach — it runs on Expo's hosting, not your laptop. So in the shipped app
cutouts stay off until this service is hosted somewhere public.

**Render (free tier).** Its free web service gives 0.1 CPU and 512 MB, which the
default `u2net` (~1 GB at peak) will not fit in — so Render **must** run the
pruned model. New → Web Service → point it at this directory's `Dockerfile`, then:

1. Set env var `BG_REMOVAL_MODEL=u2netp` (~4.7 MB, fits the 512 MB box; edges are
   a little rougher than u2net).
2. Set env var `BG_REMOVAL_TOKEN` to a long random string.
3. Render injects `PORT` itself — leave it alone.
4. The service serves at `https://<name>.onrender.com`.

Expect ~10–20s per cutout on 0.1 CPU, plus a cold start after 15 minutes idle.

**Hugging Face Spaces** is the faster free alternative if the quality or speed
disappoints: 2 vCPU and 16 GB on the free CPU tier, enough for full `u2net`.
Create a Space → SDK **Docker** → public, push the same three files, and add
`BG_REMOVAL_TOKEN` under Settings → Variables and secrets.

Free tiers sleep when idle. The first cutout after a sleep pays the wake-up,
which is why the app allows 60s for it; the model itself is baked into the image
at build time so a cold start never re-downloads 176 MB.

## Point the app at it

Local development — add to the app's `.env`:

```
BG_REMOVAL_URL=http://127.0.0.1:7000
```

Production — set both on the deployed server (`eas env:create --environment production`):

```
BG_REMOVAL_URL=https://<user>-<space>.hf.space
BG_REMOVAL_TOKEN=<the same random string as the Space secret>
```

Neither takes an `EXPO_PUBLIC_` prefix: these are server-only, and the token
must never reach the app bundle.

If `BG_REMOVAL_URL` is **unset**, cutouts are skipped entirely — garments save
with their original photo and the app still works. Background removal is a
best-effort enhancement, never a hard dependency.

## API

`POST /cutout`  →  `{ "imageBase64": "<jpeg>" }`  →  `{ "cutoutBase64": "<png>" }`

`GET /health`   →  `{ "status": "ok" }`
