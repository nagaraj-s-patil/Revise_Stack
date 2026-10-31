// Writes the list of app files and a version into sw.js (between the GENERATED markers).
// Run after any change to the app files:  npm run precache
// `npm test` fails if this was forgotten, because phones would keep an out-of-date copy.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FOLDERS = ['css', 'js', 'data', 'assets/icons', 'assets/fonts'];   // brand/ is for the README and icon tool, not the app
const ROOT_FILES = ['index.html', 'manifest.webmanifest', 'favicon.ico'];

function walk(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap(entry => {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return walk(rel);
    return /\.(txt|md)$/i.test(entry.name) ? [] : [rel];   // licence notes are not part of the app
  });
}

/** Every file the app needs offline, as paths relative to the site root. "./" is the start page. */
export function appFiles() {
  return ['./', ...ROOT_FILES, ...FOLDERS.flatMap(walk)].sort((a, b) => (a === './' ? -1 : b === './' ? 1 : a.localeCompare(b)));
}

export function versionOf(files) {
  const hash = crypto.createHash('sha1');
  for (const f of files) {
    hash.update(f);
    if (f !== './') hash.update(fs.readFileSync(path.join(root, f)));
  }
  return hash.digest('hex').slice(0, 10);
}

export function generatedBlock() {
  const files = appFiles();
  return '// BEGIN GENERATED\nconst VERSION = ' + JSON.stringify(versionOf(files)) + ';\nconst PRECACHE = ' + JSON.stringify(files, null, 2) + ';\n// END GENERATED';
}

export function swSource(current) {
  return current.replace(/\/\/ BEGIN GENERATED[\s\S]*?\/\/ END GENERATED/, generatedBlock());
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(root, 'sw.js');
  const next = swSource(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, next);
  console.log('sw.js updated: ' + appFiles().length + ' files');
}
