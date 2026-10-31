import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/core/index.js';
import { syllabus as S } from './helpers.js';

const phasesFixture = [
  { id: 'p1', number: 1, name: 'A', topics: [{ id: 'a1', name: 'A1', tag: 'REVISE', core: true }, { id: 'a2', name: 'A2', tag: 'LEARN', core: true }] },
  { id: 'p3', number: 3, name: 'Git', topics: [{ id: 'g1', name: 'G1', tag: 'UNSET', core: true }] },
  { id: 'p4', number: 4, name: 'SQL', topics: [{ id: 's1', name: 'S1', tag: 'REVISE', core: true }, { id: 's9', name: 'Oracle', tag: 'LEARN', core: false }] }
];
const res = (topicId, date, score, total) => ({ id: topicId + date + score, topicId, date, score, total });
const statesOf = (results, today) => Object.fromEntries(phasesFixture.flatMap(p => p.topics.map(t => [t.id, L.topicState(results, t.id, today)])));

test('queue: new topics follow study order (SQL before Git), later topics stay locked', () => {
  const q = L.buildQueue(phasesFixture, statesOf([], '2026-10-29'), '2026-10-29');
  assert.deepEqual(q.map(x => x.topic.id), ['a1', 'a2', 's1', 'g1']);
  assert.ok(q.every(x => x.kind === 'new'));
});
test('queue: due revisions come first, weak before ok', () => {
  const results = [res('s1', '2026-10-27', 6, 10), res('a1', '2026-10-27', 3, 10)];
  const q = L.buildQueue(phasesFixture, statesOf(results, '2026-10-29'), '2026-10-29');
  assert.deepEqual(q.slice(0, 2).map(x => x.topic.id), ['a1', 's1']);
  assert.equal(q[0].kind, 'revision');
  assert.equal(q[2].kind, 'new');
});
test('queue: topic tested today is skipped, and topics not yet due are left out', () => {
  const results = [res('a1', '2026-10-29', 3, 10), res('s1', '2026-10-28', 9, 10), res('s1', '2026-10-29', 9, 10)];
  const ids = L.buildQueue(phasesFixture, statesOf(results, '2026-10-29'), '2026-10-29').map(x => x.topic.id);
  assert.ok(!ids.includes('a1') && !ids.includes('s1'));
});
test('queue: later topics unlock when all core topics are strong or done', () => {
  const results = ['a1', 'a2', 'g1', 's1'].map(id => res(id, '2026-10-20', 9, 10));
  const st = statesOf(results, '2026-10-29');
  assert.equal(L.isUnlocked(phasesFixture, st), true);
  const ids = L.buildQueue(phasesFixture, st, '2026-10-29').map(x => x.topic.id);
  assert.ok(ids.includes('s9'));
});
test('suggestMode: strong quick result asks for a Full test', () => {
  const t = phasesFixture[0].topics[0];
  const st = L.topicState([res('a1', '2026-10-27', 5, 5)], 'a1', '2026-10-29');
  assert.equal(L.suggestMode(t, st), 'full');
  const st2 = L.topicState([res('a1', '2026-10-27', 6, 10)], 'a1', '2026-10-29');
  assert.equal(L.suggestMode(t, st2), 'quick');
  assert.equal(L.suggestMode(phasesFixture[0].topics[1], L.topicState([], 'a2', '2026-10-29')), 'learn');
});
test('shortTask: prefers a revision, then a new topic that is not LEARN', () => {
  const fresh = L.buildQueue(phasesFixture, statesOf([], '2026-10-29'), '2026-10-29');
  assert.equal(L.shortTask(fresh).topic.id, 'a1');
  const q2 = fresh.filter(x => x.topic.id !== 'a1');
  assert.equal(L.shortTask(q2).topic.id, 's1');
  const rev = L.buildQueue(phasesFixture, statesOf([res('g1', '2026-10-27', 6, 10)], '2026-10-29'), '2026-10-29');
  assert.equal(L.shortTask(rev).topic.id, 'g1');
  assert.equal(L.shortTask([]), null);
});

const days = (...d) => d.map(x => ({ id: x, topicId: 't', date: x, score: 5, total: 10 }));
test('weekStart is Monday', () => {
  assert.equal(L.weekStart('2026-10-29'), '2026-10-26');   // Thursday
  assert.equal(L.weekStart('2026-10-26'), '2026-10-26');   // Monday
  assert.equal(L.weekStart('2026-11-01'), '2026-10-26');   // Sunday
});
test('streak: no results', () => {
  assert.deepEqual(L.streakInfo([], '2026-10-29'), { streak: 0, studiedToday: false, missed: 0, weekDays: 0 });
});
test('streak: three days ending today', () => {
  const s = L.streakInfo(days('2026-10-27', '2026-10-28', '2026-10-29'), '2026-10-29');
  assert.equal(s.streak, 3); assert.equal(s.studiedToday, true); assert.equal(s.weekDays, 3);
});
test('streak: today not studied yet does not break it', () => {
  const s = L.streakInfo(days('2026-10-27', '2026-10-28'), '2026-10-29');
  assert.equal(s.streak, 2); assert.equal(s.missed, 0); assert.equal(s.studiedToday, false);
});
test('streak: one missed day in a week is forgiven', () => {
  const s = L.streakInfo(days('2026-10-26', '2026-10-28', '2026-10-29'), '2026-10-29');
  assert.equal(s.streak, 3);
});
test('streak: second missed day in the same week breaks it', () => {
  const s = L.streakInfo(days('2026-10-26', '2026-10-27', '2026-10-29'), '2026-10-29');
  // 29 studied, 28 missed (grace), 27 studied, 26 studied -> 3. Add an earlier gap in the same week:
  assert.equal(s.streak, 3);
  const s2 = L.streakInfo(days('2026-10-26', '2026-10-28', '2026-10-30'), '2026-10-30');
  // 30 ok, 29 missed (grace), 28 ok, 27 missed (same week) -> break
  assert.equal(s2.streak, 2);
});
test('streak: two missed days in a row break it', () => {
  const s = L.streakInfo(days('2026-10-20', '2026-10-21', '2026-10-22'), '2026-10-29');
  assert.equal(s.streak, 0);
  assert.equal(s.missed, 6);
});
test('streak: missed count is consecutive unstudied days ending yesterday', () => {
  const s = L.streakInfo(days('2026-10-27'), '2026-10-29');
  assert.equal(s.missed, 1);
  assert.equal(s.streak, 1);   // 28 missed (grace), 27 studied
});

