import { mkdirSync, readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from '@/lib/server/db';

const IMAGE_DIR = path.join(DATA_DIR, 'images');

function ensureDir(): void {
  mkdirSync(IMAGE_DIR, { recursive: true });
}

// Filenames are derived from ids we generate, never from client input, so a
// request can't escape the image directory with a crafted name.
function filenameFor(id: string): string {
  return `${id}.jpg`;
}

function cutoutFilenameFor(id: string): string {
  return `${id}.png`;
}

function pathForFilename(filename: string): string | null {
  const resolved = path.join(IMAGE_DIR, path.basename(filename));
  return resolved.startsWith(IMAGE_DIR) ? resolved : null;
}

export function saveImage(id: string, base64: string): string {
  ensureDir();
  const filename = filenameFor(id);
  const target = pathForFilename(filename);
  if (!target) throw new Error('invalid image path');
  writeFileSync(target, Buffer.from(base64, 'base64'));
  return filename;
}

export function readImage(filename: string): Buffer | null {
  const target = pathForFilename(filename);
  if (!target || !existsSync(target)) return null;
  return readFileSync(target);
}

export function deleteImage(filename: string): void {
  const target = pathForFilename(filename);
  if (target && existsSync(target)) unlinkSync(target);
}

// Transparent PNG cutout, stored next to the JPG under the same id. Same
// derived-filename rule as saveImage: never built from client input.
export function saveCutout(id: string, base64: string): string {
  ensureDir();
  const filename = cutoutFilenameFor(id);
  const target = pathForFilename(filename);
  if (!target) throw new Error('invalid cutout path');
  writeFileSync(target, Buffer.from(base64, 'base64'));
  return filename;
}

export function readCutout(filename: string): Buffer | null {
  return readImage(filename);
}

export function deleteCutout(filename: string): void {
  deleteImage(filename);
}
