import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateModes, cleanCustomProjects, allProjects, cleanProfile, profileOf, PROFILE_DEFAULTS, weeklyTrend, modeMix, pace, groupOf, exportBackup, validateBackup } from '../js/core/index.js';

const phases = [{ number: 1, name: 'Java', topics: [{ id: 'a', name: 'A', core: true }, { id: 'b', name: 'B', core: true }] }];
const res = (id, date, score, mode = 'quick') => ({ id: id + date + mode, topicId: id, date, score, total: 10, mode, weakPoints: [] });

test('profile keeps valid values and falls back to defaults', () => {
  assert.deepEqual(cleanProfile({ name: '  Raj ', deadline: '2027-02-30', dailyHours: 99, role: '' }), { name: 'Raj' });
  assert.equal(profileOf({}).deadline, PROFILE_DEFAULTS.deadline);
  assert.equal(profileOf({ profile: { deadline: '2027-03-01' } }).deadline, '2027-03-01');
});

test('profile travels in backup', () => {
  const text = exportBackup({ results: [], projects: {}, mocks: [], profile: { city: 'Pune' } }, '2026-11-07');
  assert.equal(validateBackup(text).data.profile.city, 'Pune');
});

test('weekly trend counts pre-tests as activity but not in the average', () => {
  const r = [res('a', '2026-11-03', 8), res('a', '2026-11-04', 2, 'pre')];
  const w = weeklyTrend(r, '2026-11-07', 2).pop();
  assert.equal(w.tests, 2); assert.equal(w.real, 1); assert.equal(w.avg, 0.8);
  assert.deepEqual(modeMix(r), { pre: 2, full: 0 });
});

test('pace verdicts', () => {
  const st = { a: { level: 'strong' }, b: { level: 'untested' } };
  const r = [res('a', '2026-11-01', 9)];
  const p = pace(phases, st, r, '2026-11-07', '2027-01-28');
  assert.equal(p.remaining, 1); assert.equal(p.verdict, 'ontrack');
  assert.equal(pace(phases, st, [], '2026-11-07', '2027-01-28').verdict, 'nopace');
  assert.equal(pace(phases, st, r, '2026-11-07', '2026-11-10').verdict, 'behind');
  assert.equal(groupOf('done'), 'good'); assert.equal(groupOf('ok'), 'work'); assert.equal(groupOf('untested'), 'new');
});

test('old quick results become pre-tests', () => {
  const d = { results: [res('a', '2026-11-01', 8, 'quick'), res('a', '2026-11-02', 8, 'full')] };
  assert.equal(migrateModes(d), true);
  assert.deepEqual(d.results.map(r => r.mode), ['pre', 'full']);
  assert.equal(migrateModes(d), false);
  const text = JSON.stringify({ results: [{ topicId: 'a', date: '2026-11-01', mode: 'quick', score: 3, total: 5 }] });
  assert.equal(validateBackup(text).data.results[0].mode, 'pre');
});

test('custom projects are cleaned and added after the built-in ones', () => {
  const list = cleanCustomProjects([{ id: 'my-1', name: ' Chat app ', stack: 'Node', needs: [2, 2, 'x', 7] }, { id: '', name: 'no id' }, { id: 'my-1', name: 'dup' }]);
  assert.deepEqual(list, [{ id: 'my-1', name: 'Chat app', stack: 'Node', needs: [2, 7], custom: true }]);
  assert.deepEqual(allProjects([{ id: 'b', name: 'B' }], { customProjects: list }).map(p => p.id), ['b', 'my-1']);
  const text = exportBackup({ results: [], projects: {}, mocks: [], customProjects: list }, '2026-11-08');
  assert.equal(validateBackup(text).data.customProjects.length, 1);
});

test('changelog: newest entry matches APP_VERSION and every entry has items', async () => {
  const { APP_VERSION, CHANGES } = await import('../js/data/changelog.js');
  assert.equal(CHANGES[0].version, APP_VERSION);
  CHANGES.forEach(c => assert.ok(c.items.length && /^\d{4}-\d{2}-\d{2}$/.test(c.date)));
});

test('syllabus: every topic has importance 1-5 and needs point at real topics', async () => {
  const fs = await import('node:fs');
  const dir = new URL('../data/syllabus/', import.meta.url);
  const phases = fs.readdirSync(dir).filter(f => f.startsWith('phase-')).map(f => JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')));
  const { validateSyllabus } = await import('../js/data/syllabus.js');
  validateSyllabus({ phases, projects: [] });
  const topics = phases.flatMap(p => p.topics);
  assert.equal(topics.length, 117);
  assert.ok(topics.every(t => t.importance >= 1 && t.importance <= 5));
  assert.ok(topics.filter(t => t.importance === 5).length >= 10);
  assert.throws(() => validateSyllabus({ phases: [{ id: 'p', number: 1, name: 'x', topics: [{ id: 'a', name: 'A', tag: 'UNSET', core: true, importance: 9 }] }], projects: [] }));
  assert.throws(() => validateSyllabus({ phases: [{ id: 'p', number: 1, name: 'x', topics: [{ id: 'a', name: 'A', tag: 'UNSET', core: true, importance: 3, needs: ['zzz'] }] }], projects: [] }));
});

test('prompt carries the prerequisite note and my level on them', async () => {
  const L = await import('../js/core/index.js');
  const topic = { id: 'j', name: 'Joins', before: 'Know SELECT and WHERE first.' }, phase = { name: 'SQL' };
  const needs = [{ topic: { name: 'SELECT' }, level: 'strong', last: { score: 9, total: 10 }, ready: true }, { topic: { name: 'WHERE' }, level: 'untested', last: null, ready: false }];
  const learn = L.buildPrompt(topic, phase, 'learn', [], needs);
  assert.ok(learn.includes('Know SELECT and WHERE first.') && learn.includes('SELECT (Strong, last test 9/10)') && learn.includes('WHERE (not tested yet)'));
  assert.ok(learn.includes('Do not test me on it') && learn.includes('add a two-line reminder first'));
  assert.ok(!learn.includes('quick questions'));
  assert.ok(L.buildPrompt(topic, phase, 'full', [], needs).includes('Do not ask questions about it'));
  assert.ok(!L.buildPrompt({ id: 'x', name: 'X' }, phase, 'full', [], []).includes('BEFORE THIS TOPIC'));
});
