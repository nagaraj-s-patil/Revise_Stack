import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/core/index.js';
import { syllabus as S, rr, T, realStates } from './helpers.js';


test('weakestTopics: lowest score first, only Weak or OK topics', () => {
  const results = [
    rr('p2-generics', '2026-10-27', 6, 10),
    rr('p2-exception-handling', '2026-10-26', 2, 10),
    rr('p2-file-handling', '2026-10-28', 9, 10),
    rr('p1-recursion', '2026-10-25', 2, 10)
  ];
  const w = L.weakestTopics(S.phases, realStates(results, T), 5);
  assert.deepEqual(w.map(x => x.topic.id), ['p1-recursion', 'p2-exception-handling', 'p2-generics']);
  assert.equal(L.weakestTopics(S.phases, realStates(results, T), 2).length, 2);
});

test('skillShare and projectReady use only core topics of the needed phases', () => {
  const p2 = S.phases.find(p => p.number === 2).topics.filter(t => t.core);
  const results = p2.map(t => rr(t.id, '2026-10-20', 9, 10));
  const st = realStates(results, T);
  assert.equal(L.skillShare(S.phases, st, [2]), 1);
  assert.ok(L.skillShare(S.phases, st, [2, 4, 6]) > 0 && L.skillShare(S.phases, st, [2, 4, 6]) < 0.7);
  assert.equal(L.projectReady(S.projects[0], S.phases, st).ready, false);
  assert.equal(L.projectReady({ needs: [2] }, S.phases, st).ready, true);
  assert.equal(L.skillShare(S.phases, realStates([], T), [2]), 0);
});

test('applyChecks: project needs Done status and a link; weak key topics fail the third check', () => {
  const st0 = realStates([], T);
  let c = L.applyChecks(S.phases, st0, {}, S.projects);
  assert.deepEqual(c.map(x => x.ok), [false, false, true]);
  c = L.applyChecks(S.phases, st0, { 'student-mgmt': { status: 'done', link: '' } }, S.projects);
  assert.equal(c[0].ok, false);
  c = L.applyChecks(S.phases, st0, { 'student-mgmt': { status: 'done', link: 'https://github.com/x/y' } }, S.projects);
  assert.equal(c[0].ok, true);
  const st1 = realStates([rr('p4-joins-subqueries-and-aggregate-functions', '2026-10-28', 2, 10)], T);
  assert.equal(L.applyChecks(S.phases, st1, {}, S.projects)[2].ok, false);
});

function summaryFor(results, projectState, timeText) {
  const states = realStates(results, T);
  const byId = {};
  S.phases.forEach(p => p.topics.forEach(t => { byId[t.id] = t; }));
  return L.buildSummary({ phases: S.phases, states, results, projectState: projectState || {}, projectList: S.projects, byId, today: T, deadline: '2027-01-28', timeText: timeText || '1 hour', streak: L.streakInfo(results, T) });
}
test('summary: has goal, time, counts, topic ids, due list and the result block', () => {
  const results = [
    rr('p2-generics', '2026-10-27', 3, 10, { weakPoints: ['wildcards', 'bounded types'], nextStep: 'Write 3 generic methods' }),
    rr('p2-exception-handling', '2026-10-28', 4, 5)
  ];
  const t = summaryFor(results, { 'student-mgmt': { status: 'building', link: '', note: '' } }, '2 hours');
  assert.ok(t.includes('Time I have today: 2 hours.'));
  assert.ok(t.includes('91 days left') || t.includes('90 days left'));
  assert.ok(t.includes('[p2-generics]: 3/10 on 27 Oct. Weak points: wildcards; bounded types. Next step: Write 3 generic methods'));
  assert.ok(t.includes('DUE FOR REVISION TODAY'));
  assert.ok(t.includes('Student Management System (Java, JDBC and MySQL): building'));
  assert.ok(t.includes('RESULT_START') && t.includes('RESULT_END') && t.includes('topic_id: <topic id>'));
  assert.ok(t.includes('Streak: 2 days'));
});
test('summary: a block filled in from the summary prompt parses back', () => {
  const t = summaryFor([], {}, '1 hour');
  const filled = t.slice(t.lastIndexOf('RESULT_START'))
    .replace('<topic id>', 'p1-recursion').replace('<quick or full>', 'quick').replace('<number correct>/<total questions>', '4/5')
    .replace('<short list separated by semicolons, or none>', 'none').replace('<one concrete practice task>', 'Practice');
  const p = L.parseResult(filled);
  assert.equal(p.ok, true);
  assert.equal(p.data.topicId, 'p1-recursion');
});
test('summary: stays a sensible size with many results', () => {
  const results = [];
  S.phases.forEach(p => p.topics.forEach(tp => results.push(rr(tp.id, '2026-10-27', 3, 10, { weakPoints: ['a long weak point text here'], nextStep: 'a long next step sentence' }))));
  const t = summaryFor(results, {}, '3 hours or more');
  assert.ok(t.length < 6000, 'summary length ' + t.length);
  assert.ok(t.includes('and ') && t.includes('more'));
});

test('backup: export then validate round-trips results and projects', () => {
  const data = { results: [rr('p2-generics', '2026-10-27', 6, 10, { weakPoints: ['x'], nextStep: 'y' })], projects: { 'student-mgmt': { status: 'done', link: 'https://github.com/a/b', note: 'ok' } } };
  const v = L.validateBackup(L.exportBackup(data, T));
  assert.equal(v.ok, true);
  assert.deepEqual(v.data.results, data.results);
  assert.deepEqual(v.data.projects, data.projects);
  assert.equal(v.stats.exportedOn, T);
});
test('backup: invalid text, wrong shape, bad rows dropped', () => {
  assert.equal(L.validateBackup('hello').ok, false);
  assert.equal(L.validateBackup('{"a":1}').ok, false);
  assert.equal(L.validateBackup('[]').ok, false);
  const text = JSON.stringify({ results: [
    rr('p2-generics', '2026-10-27', 6, 10),
    { topicId: 'x', date: '2026-02-31', score: 1, total: 5 },
    { topicId: 'x', date: '2026-10-27', score: 12, total: 10 },
    { topicId: 7, date: '2026-10-27', score: 1, total: 5 },
    null
  ], projects: { a: { status: 'weird', link: 5, note: 'n' } } });
  const v = L.validateBackup(text);
  assert.equal(v.ok, true);
  assert.equal(v.stats.results, 1);
  assert.equal(v.stats.dropped, 4);
  assert.deepEqual(v.data.projects.a, { status: 'notstarted', link: '', note: 'n' });
});
test('shortDate', () => { assert.equal(L.shortDate('2026-10-05'), '5 Oct'); });

