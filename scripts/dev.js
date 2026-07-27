// Dev launcher: bring up the background-removal sidecar, then start Expo.
//
// The sidecar (services/bg-removal) is a separate Python process that does the
// actual cutout work. When it isn't running, cutouts silently degrade to the
// original photo — easy to forget, and exactly the "bg stopped removing" trap.
// Starting it from the same command that starts Expo means it can't be
// forgotten. Idempotent: if a sidecar is already healthy on :7000 we reuse it
// instead of starting a second one that would fail to bind the port.
//
// Pass-through args go to `expo start`, e.g. `npm start -- --web`.
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SIDECAR_HEALTH = 'http://127.0.0.1:7000/health';
const PYTHON = path.join(ROOT, 'services', 'bg-removal', '.venv', 'Scripts', 'python.exe');
const APP_PY = path.join(ROOT, 'services', 'bg-removal', 'app.py');

function sidecarUp() {
  return new Promise((resolve) => {
    const req = http.get(SIDECAR_HEALTH, { timeout: 1500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const children = [];

  if (await sidecarUp()) {
    console.log('[dev] bg-removal sidecar already running on :7000 — reusing it');
  } else {
    console.log('[dev] starting bg-removal sidecar…');
    const bg = spawn(PYTHON, [APP_PY], { cwd: ROOT, stdio: 'inherit' });
    bg.on('error', (e) => console.log(`[dev] could not start sidecar: ${e.message}`));
    bg.on('exit', (code) => console.log(`[dev] bg-removal sidecar exited (${code})`));
    children.push(bg);
  }

  // shell:true so `npx` resolves on Windows; args after the script go to Expo.
  const expo = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  children.push(expo);

  // When Expo stops, take the sidecar down with it so no orphan lingers.
  expo.on('exit', (code) => {
    for (const c of children) if (c !== expo && !c.killed) c.kill();
    process.exit(code ?? 0);
  });

  const shutdown = () => {
    for (const c of children) if (!c.killed) c.kill();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
