// Reads docs/syllabus.md and writes the data files the app loads:
//   data/syllabus/index.json            list of phase files, in order
//   data/syllabus/phase-NN-<slug>.json  one file per phase
//   data/projects.json                  the portfolio projects (from Phase 10)
// Topic ids are permanent. Run this only when the syllabus text changes, and check that no existing id changed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'docs', 'syllabus.md');
const outDir = path.join(root, 'data', 'syllabus');

// Phases a project needs before it is worth starting. Used for the "Time to build" hint.
const PROJECT_NEEDS = {
  'Student Management System': [2, 4, 6],
  'Employee Management REST API': [4, 6, 7],
  'Full Stack Job Portal': [4, 7, 9]
};

// Project ids are permanent too: saved project status is stored under them.
const PROJECT_IDS = {
  'Student Management System': 'student-mgmt',
  'Employee Management REST API': 'employee-api',
  'Full Stack Job Portal': 'job-portal'
};

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42).replace(/-$/, '');
const pad2 = n => String(n).padStart(2, '0');

// Which topics count as "core" (needed before applying). Later phases and a few extras are locked until the core is solid.
function isCore(phase, topic) {
  if (phase.n >= 11) return false;
  if (phase.n === 8) return topic.n >= 7;    // testing is core, security is "learn next"
  if (phase.n === 4) return topic.n <= 8;    // Oracle, MongoDB and Redis come later
  return true;
}

function parse(text) {
  const phases = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    const ph = line.match(/^## Phase (\d+): (.+)$/);
    if (ph) { cur = { n: +ph[1], name: ph[2].trim(), topics: [] }; phases.push(cur); continue; }
    if (/^## /.test(line)) { cur = null; continue; }
    const it = line.match(/^(\d+)\. (.+)$/);
    if (!it || !cur) continue;
    const m = it[2].match(/^(.*?) — (REVISE|LEARN|TEST|BUILD)(.*)$/);
    cur.topics.push({
      n: +it[1],
      id: '',
      name: m ? m[1].trim() : it[2].trim(),
      tag: m ? m[2] : 'UNSET',
      note: m ? m[3].trim() : ''
    });
  }
  for (const p of phases) for (const t of p.topics) t.id = `p${p.n}-${slug(t.name)}`;
  return phases;
}

const phases = parse(fs.readFileSync(source, 'utf8'));
const ids = phases.flatMap(p => p.topics.map(t => t.id));
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dup.length) { console.error('Duplicate topic ids:', dup); process.exit(1); }

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const files = [];
let projects = [];
for (const p of phases) {
  if (p.n === 10) {   // Phase 10 is the project list, not a study phase
    projects = p.topics.slice(0, 3).map(t => {
      const [name, stack] = t.name.split(' — ');
      const key = name.trim();
      if (!PROJECT_IDS[key] || !PROJECT_NEEDS[key]) throw new Error('Unknown project in Phase 10: ' + key);
      return { id: PROJECT_IDS[key], name: key, stack: (stack || '').trim(), needs: PROJECT_NEEDS[key] };
    });
    continue;
  }
  const file = `phase-${pad2(p.n)}-${slug(p.name)}.json`;
  const doc = {
    id: `p${p.n}`,
    number: p.n,
    name: p.name,
    topics: p.topics.map(t => {
      const topic = { id: t.id, name: t.name, tag: t.tag, core: isCore(p, t) };
      if (t.note) topic.note = t.note;
      return topic;
    })
  };
  fs.writeFileSync(path.join(outDir, file), JSON.stringify(doc, null, 2) + '\n');
  files.push(file);
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({ version: 1, phases: files }, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'data', 'projects.json'), JSON.stringify({ version: 1, projects }, null, 2) + '\n');
const studyTopics = phases.filter(p => p.n !== 10).reduce((n, p) => n + p.topics.length, 0);
console.log(files.length, 'phase files,', studyTopics, 'topics,', projects.length, 'projects');
