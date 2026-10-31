// Shared test setup: the real syllabus (read from data/ like the browser does) and small result builders.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleSyllabus } from '../js/data/syllabus.js';
import { topicState } from '../js/core/index.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, 'data', file), 'utf8'));

const index = read('syllabus/index.json');
export const syllabus = assembleSyllabus(index, index.phases.map(f => read('syllabus/' + f)), read('projects.json'));

/** A saved result for tests. */
export const rr = (topicId, date, score, total, extra) => Object.assign(
  { id: topicId + date + score, topicId, date, mode: total >= 10 ? 'full' : 'quick', score, total, weakPoints: [], nextStep: '', edited: false, source: 'paste' },
  extra || {});

export const T = '2026-10-29';

/** Topic state for every topic in the real syllabus. */
export const realStates = (results, today) =>
  Object.fromEntries(syllabus.phases.flatMap(p => p.topics.map(t => [t.id, topicState(results, t.id, today)])));
