# Container image for the background-removal sidecar.
#
# Works unchanged on Hugging Face Spaces (Docker SDK), Render, Fly and anything
# else that speaks Docker: the platform hands us PORT, gunicorn binds it.
#
# The model is downloaded at BUILD time, not first request. rembg otherwise pulls
# ~176 MB on the first cutout, which on a free tier that sleeps means every cold
# start pays it again — and the app's 60s timeout would expire long before the
# first user ever saw a cutout.

FROM python:3.11-slim

# onnxruntime and Pillow need these; the slim base ships neither.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# rembg caches models under U2NET_HOME. Pinning it means the build-time download
# and the runtime lookup agree regardless of which user the platform runs us as —
# the default (~/.u2net) does not survive a changing HOME.
ENV U2NET_HOME=/app/models

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Override at build time for a low-RAM host: --build-arg BG_REMOVAL_MODEL=u2netp
ARG BG_REMOVAL_MODEL=u2net
ENV BG_REMOVAL_MODEL=${BG_REMOVAL_MODEL}
RUN python -c "from rembg.session_factory import new_session; new_session('${BG_REMOVAL_MODEL}')" \
    && chmod -R a+rX /app/models

COPY app.py .

# Hugging Face Spaces expects 7860; Render and Fly inject their own PORT, which
# overrides this at runtime.
ENV PORT=7860
EXPOSE 7860

# One worker only — each would load its own copy of the model, and two copies is
# how a 512 MB box dies. Threads give concurrency without that cost. The long
# timeout covers a slow first inference on a throttled free CPU.
CMD gunicorn --bind "0.0.0.0:${PORT}" --workers 1 --threads 4 --timeout 120 app:app
