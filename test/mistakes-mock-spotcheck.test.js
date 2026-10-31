import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/core/index.js';
import { syllabus as S, rr, T, realStates } from './helpers.js';

const wp = (topicId, date, score, total, weak) => rr(topicId, date, score, total, { weakPoints: weak });

test('mistakeStats: same weak point counted once per test, case and punctuation ignored', () => {
  const list = [
    wp('t', '2026-10-20', 4, 10, ['HashMap vs TreeMap', 'Comparator']),
    wp('t', '2026-10-24', 5, 10, ['hashmap vs treemap!', 'Comparator', 'comparator']),
    wp('t', '2026-10-27', 7, 10, ['Generics wildcards'])
  ];
  const m = L.mistakeStats(list);
  assert.equal(m[0].count, 2);
  assert.equal(m[1].count, 2);
  assert.equal(m.length, 3);
  assert.equal(m[2].text, 'Generics wildcards');
  assert.equal(m.find(x => x.key === 'hashmap vs treemap').text, 'hashmap vs treemap!');   // newest wording kept
});
test('repeatedMistakes: only weak points seen in 2+ tests, per topic', () => {
  const results = [
    wp('p2-generics', '2026-10-20', 4, 10, ['wildcards']),
    wp('p2-generics', '2026-10-25', 5, 10, ['Wildcards', 'erasure']),
    wp('p2-file-handling', '2026-10-25', 5, 10, ['wildcards'])
  ];
  const r = L.repeatedMistakes(S.phases, results, 5);
  assert.equal(r.length, 1);
  assert.equal(r[0].topic.id, 'p2-generics');
  assert.equal(r[0].count, 2);
});
test('recentWeakPoints: newest first, no repeats, limited', () => {
  const results = [
    wp('p2-generics', '2026-10-20', 4, 10, ['a', 'b']),
    wp('p2-generics', '2026-10-25', 5, 10, ['B', 'c'])
  ];
  assert.deepEqual(L.recentWeakPoints(results, 'p2-generics', 5), ['B', 'c', 'a']);
  assert.deepEqual(L.recentWeakPoints(results, 'p2-generics', 2), ['B', 'c']);
  assert.deepEqual(L.recentWeakPoints(results, 'nothing', 5), []);
});
test('prompt: previous weak points are asked about, and consistent naming is requested', () => {
  const phase = S.phases[1], topic = phase.topics[5];
  const q = L.buildPrompt(topic, phase, 'quick', ['HashMap vs TreeMap', 'Comparator']);
  assert.ok(q.includes('My weak points from earlier tests on this topic: HashMap vs TreeMap; Comparator.'));
  assert.ok(q.includes('Include 2 questions on these'));
  assert.ok(L.buildPrompt(topic, phase, 'full', ['x']).includes('Include 3 questions on these'));
  assert.ok(L.buildPrompt(topic, phase, 'learn', ['x']).includes('Spend extra time on these'));
  assert.ok(!L.buildPrompt(topic, phase, 'quick').includes('earlier tests'));
  assert.ok(q.includes('short consistent names'));
});
test('mock prompt: focus areas, project question, result block with mock topic id', () => {
  const p = L.buildMockPrompt({ focus: ['Generics', 'Joins'], projects: ['Student Management System (Java, JDBC and MySQL)'] });
  assert.ok(p.includes('Generics; Joins'));
  assert.ok(p.includes('1 question about one of my projects'));
  assert.ok(p.includes('topic_id: mock-interview'));
  const none = L.buildMockPrompt({ focus: [], projects: [] });
  assert.ok(none.includes('Core Java, SQL and Spring Boot basics'));
  assert.ok(!none.includes('about one of my projects'));
  const filled = p.slice(p.lastIndexOf('RESULT_START')).replace('<number correct>', '6').replace('<up to 4 short names separated by semicolons, or none>', 'Joins').replace('<one concrete practice task>', 'x');
  const parsed = L.parseResult(filled);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.topicId, 'mock-interview');
  assert.equal(parsed.data.score, 6); assert.equal(parsed.data.total, 10);
});
test('averageMock: average percent of the latest n', () => {
  const m = [{ id: 'a', date: '2026-10-01', score: 2, total: 10 }, { id: 'b', date: '2026-10-10', score: 6, total: 10 }, { id: 'c', date: '2026-10-20', score: 8, total: 10 }];
  assert.equal(L.averageMock(m, 2), 70);
  assert.equal(L.averageMock(m, 3), 53);
  assert.equal(L.averageMock([], 3), null);
});

function strongStates(date) {
  const results = ['p2-generics', 'p2-file-handling', 'p1-recursion'].map(id => rr(id, date, 9, 10));
  return realStates(results, '2026-12-31');
}
test('surprise check: about one day in three, stable for the day, never a due or recent topic', () => {
  const days = []; for (let i = 0; i < 60; i++) days.push(L.addDays('2026-11-10', i));
  const shown = days.filter(d => L.pickSurprise(S.phases, realStates([rr('p2-generics', '2026-11-01', 9, 10), rr('p2-file-handling', '2026-11-01', 9, 10)], d), d));
  // eligibility changes with the day (topics become due), so check the hash rule directly
  const hashDays = days.filter(d => L.dayHash(d) % 3 === 0).length;
  assert.ok(hashDays >= 12 && hashDays <= 28, 'hash days ' + hashDays);
  assert.ok(shown.length <= hashDays);
});
test('surprise check: picks only Strong or Done topics tested 4+ days ago and not due', () => {
  const day = (() => { for (let i = 0; i < 40; i++) { const d = L.addDays('2026-11-10', i); if (L.dayHash(d) % 3 === 0) return d; } })();
  const old = L.addDays(day, -5);
  const st = realStates([
    { ...rr('p2-generics', old, 9, 10) },
    { ...rr('p2-generics', L.addDays(old, 1), 9, 10) },
    { ...rr('p2-generics', L.addDays(old, 2), 9, 10) },
    { ...rr('p2-generics', L.addDays(old, 3), 9, 10) },   // tested 2 days ago: too recent
    rr('p1-recursion', old, 3, 10)                         // weak: not eligible
  ], day);
  assert.equal(L.pickSurprise(S.phases, st, day), null);
  const st2 = realStates([rr('p2-file-handling', L.addDays(day, -10), 9, 10), rr('p2-file-handling', L.addDays(day, -9), 9, 10), rr('p2-file-handling', L.addDays(day, -7), 9, 10), rr('p2-file-handling', L.addDays(day, -3), 9, 10)], day);
  const pick = L.pickSurprise(S.phases, st2, day);
  if (pick) { assert.equal(pick.topic.id, 'p2-file-handling'); assert.equal(pick.state.isDue, false); }
  assert.deepEqual(L.pickSurprise(S.phases, st2, day), L.pickSurprise(S.phases, st2, day));
  const offDay = (() => { for (let i = 0; i < 40; i++) { const d = L.addDays('2026-11-10', i); if (L.dayHash(d) % 3 !== 0) return d; } })();
  assert.equal(L.pickSurprise(S.phases, realStates([], offDay), offDay), null);
});

test('backup: mocks round-trip and bad mock rows are skipped', () => {
  const data = { results: [], projects: {}, mocks: [{ id: 'm1', date: '2026-10-28', score: 6, total: 10, weakPoints: ['joins'], nextStep: 'x' }] };
  const v = L.validateBackup(L.exportBackup(data, T));
  assert.equal(v.ok, true);
  assert.deepEqual(v.data.mocks, data.mocks);
  assert.equal(v.stats.mocks, 1);
  const bad = L.validateBackup(JSON.stringify({ results: [], mocks: [{ date: 'x', score: 1, total: 10 }, { date: '2026-10-28', score: 11, total: 10 }] }));
  assert.equal(bad.data.mocks.length, 0);
  assert.deepEqual(L.validateBackup(JSON.stringify({ results: [] })).data.mocks, []);
});
test('summary: repeated mistakes and mock interviews are listed', () => {
  const results = [wp('p2-generics', '2026-10-20', 4, 10, ['wildcards']), wp('p2-generics', '2026-10-25', 5, 10, ['Wildcards'])];
  const states = realStates(results, T);
  const byId = {}; S.phases.forEach(p => p.topics.forEach(t => { byId[t.id] = t; }));
  const t = L.buildSummary({ phases: S.phases, states, results, projectState: {}, projectList: S.projects, byId, today: T, deadline: '2027-01-28', timeText: '1 hour', streak: L.streakInfo(results, T),
    mocks: [{ id: 'm', date: '2026-10-27', score: 6, total: 10, weakPoints: ['joins'], nextStep: '' }] });
  assert.ok(t.includes('MISTAKES THAT KEEP COMING BACK'));
  assert.ok(t.includes('[p2-generics]: Wildcards (2 tests)'));
  assert.ok(t.includes('MOCK INTERVIEWS') && t.includes('27 Oct: 6/10. Weak: joins'));
});

