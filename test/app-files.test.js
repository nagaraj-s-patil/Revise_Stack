// Checks the files that make the app installable and offline-ready, so a broken path or a forgotten
// `npm run precache` is caught here and not on a phone.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, syllabus } from './helpers.js';
import { appFiles, swSource } from '../tools/update-precache.mjs';

const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

function pngSize(rel) {
  const b = fs.readFileSync(path.join(root, rel));
  assert.equal(b.toString('latin1', 1, 4), 'PNG', rel + ' is not a PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('manifest: installable fields and real icon files with the declared sizes', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.name, 'Revise Stack');
  assert.equal(m.display, 'standalone');
  assert.ok(m.start_url && m.scope);
  assert.match(m.theme_color, /^#[0-9a-f]{6}$/i);
  const sizes = m.icons.map(i => i.sizes + ':' + i.purpose);
  assert.ok(sizes.includes('192x192:any') && sizes.includes('512x512:any') && sizes.includes('512x512:maskable'));
  for (const icon of m.icons) {
    assert.ok(exists(icon.src), icon.src + ' is missing');
    const [w, h] = icon.sizes.split('x').map(Number);
    assert.deepEqual(pngSize(icon.src), [w, h], icon.src + ' has the wrong size');
  }
  for (const s of m.shortcuts || []) assert.ok(s.url.startsWith('./'));
});

test('index.html: every local file it links to exists', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map(x => x[1]).filter(x => !/^(https?:)?\/\//.test(x));
  assert.ok(refs.length >= 10);
  for (const ref of refs) assert.ok(exists(ref), ref + ' is missing');
  assert.match(html, /<meta name="viewport"[^>]*viewport-fit=cover/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /<script type="module" src="js\/app\.js">/);
});

test('css: every url() and font file exists', () => {
  for (const file of fs.readdirSync(path.join(root, 'css'))) {
    const css = read('css/' + file);
    for (const m of css.matchAll(/url\("?([^")]+)"?\)/g)) {
      const target = path.posix.normalize(path.posix.join('css', m[1]));
      assert.ok(exists(target), file + ' points to missing ' + target);
    }
  }
});

test('js: every relative import resolves to a file', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(path.posix.join(dir, e.name)) : e.name.endsWith('.js') ? [path.posix.join(dir, e.name)] : []);
  const files = walk('js');
  assert.ok(files.length > 30);
  for (const file of files) {
    const src = read(file);
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
      assert.ok(exists(target), file + ' imports missing ' + target);
    }
  }
});

test('js: no single source file is a dumping ground (keeps the code split by purpose)', () => {
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(path.posix.join(dir, e.name)) : e.name.endsWith('.js') ? [path.posix.join(dir, e.name)] : []);
  for (const file of walk('js')) {
    const lines = read(file).split('\n').length;
    assert.ok(lines <= 260, file + ' has ' + lines + ' lines. Split it by purpose.');
  }
});

test('service worker: file list and version are up to date (run npm run precache)', () => {
  const current = read('sw.js');
  assert.equal(swSource(current), current, 'sw.js is out of date. Run: npm run precache');
  const listed = JSON.parse(current.match(/const PRECACHE = (\[[\s\S]*?\]);/)[1]);
  assert.deepEqual(listed, appFiles());
  for (const f of ['./', 'index.html', 'manifest.webmanifest', 'js/app.js', 'css/tokens.css', 'data/syllabus/index.json', 'assets/icons/icon-192.png']) {
    assert.ok(listed.includes(f), f + ' is not cached for offline use');
  }
});

test('syllabus data: every phase file is listed, and the ids from the first version still exist', () => {
  const index = JSON.parse(read('data/syllabus/index.json'));
  const onDisk = fs.readdirSync(path.join(root, 'data/syllabus')).filter(f => f.startsWith('phase-')).sort();
  assert.deepEqual([...index.phases].sort(), onDisk);
  const ids = new Set(syllabus.phases.flatMap(p => p.topics.map(t => t.id)));
  const first = JSON.parse(read('test/fixtures/topic-ids.json'));
  assert.equal(first.length, 117);
  for (const id of first) assert.ok(ids.has(id), 'topic id ' + id + ' was removed or renamed. Saved progress would disconnect.');
});

test('syllabus data: small files by phase, in phase order', () => {
  const nums = syllabus.phases.map(p => p.number);
  assert.deepEqual(nums, [...nums].sort((a, b) => a - b));
  assert.equal(syllabus.projects.length, 3);
});
