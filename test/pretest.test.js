import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/core/index.js';

const phases = [
  { id: 'p1', number: 1, name: 'A', topics: [{ id: 'a1', name: 'A1', tag: 'REVISE', core: true }, { id: 'a2', name: 'A2', tag: 'LEARN', core: true }, { id: 'a3', name: 'A3', tag: 'REVISE', core: true }] },
  { id: 'p4', number: 4, name: 'SQL', topics: [{ id: 's1', name: 'S1', tag: 'REVISE', core: true }, { id: 's2', name: 'S2', tag: 'REVISE', core: true }] }
];
const r = (topicId, date, score, total, mode) => ({ id: topicId + date + score + mode, topicId, date, score, total, mode });
const statesOf = (results, today) => Object.fromEntries(phases.flatMap(p => p.topics.map(t => [t.id, L.topicState(results, t.id, today)])));
const TODAY = '2026-11-07';

test('a pre-test never sets the level, never makes a topic due, and is kept in `pre`', () => {
  const st = L.topicState([r('a1', '2026-11-01', 2, 5, 'pre')], 'a1', TODAY);
  assert.equal(st.level, 'untested');
  assert.equal(st.due, null);
  assert.equal(st.isDue, false);
  assert.equal(st.last, null);
  assert.equal(st.pre.level, 'weak');
  assert.equal(st.pre.last.score, 2);
});
test('100 old pre-tests add nothing to the revision list', () => {
  const results = ['a1', 'a2', 'a3', 's1', 's2'].map(id => r(id, '2026-10-01', 1, 5, 'pre'));
  const q = L.buildQueue(phases, statesOf(results, TODAY), TODAY);
  assert.ok(q.every(x => x.kind === 'new'));
});
test('after a real test the topic follows the normal schedule and ignores the pre-test', () => {
  const results = [r('a1', '2026-11-01', 1, 5, 'pre'), r('a1', '2026-11-05', 4, 5, 'quick')];
  const st = L.topicState(results, 'a1', TODAY);
  assert.equal(st.level, 'strong');
  assert.equal(st.count, 1);
  assert.equal(st.due, '2026-11-06');       // 1 day after the first real test
  assert.equal(st.pre, null);
});
test('a pre-test does not count towards Done', () => {
  const results = [r('a1', '2026-11-01', 5, 5, 'pre'), r('a1', '2026-11-05', 10, 10, 'full')];
  assert.equal(L.topicState(results, 'a1', TODAY).level, 'strong');   // needs a second real test
});
test('new topics: Weak pre-test first, then not pre-tested, then OK, then Strong', () => {
  const results = [r('a1', '2026-11-01', 4, 5, 'pre'), r('a2', '2026-11-01', 1, 5, 'pre'), r('s1', '2026-11-01', 3, 5, 'pre'), r('s2', '2026-11-01', 5, 5, 'pre')];
  const ids = L.buildQueue(phases, statesOf(results, TODAY), TODAY).map(x => x.topic.id);
  // a2 weak (1/5), a1 strong (4/5), s1 ok (3/5), s2 strong (5/5), a3 not pre-tested
  assert.deepEqual(ids, ['a2', 'a3', 's1', 'a1', 's2']);
});
test('a topic pre-tested today is skipped for the rest of the day', () => {
  const ids = L.buildQueue(phases, statesOf([r('a1', TODAY, 2, 5, 'pre')], TODAY), TODAY).map(x => x.topic.id);
  assert.ok(!ids.includes('a1'));
});
test('suggested mode: untested pre, then learn (weak/ok) or full (strong)', () => {
  const t = phases[0].topics[0];
  assert.equal(L.suggestMode(t, statesOf([], TODAY).a1), 'pre');
  assert.equal(L.suggestMode(t, statesOf([r('a1', '2026-11-01', 2, 5, 'pre')], TODAY).a1), 'learn');
  assert.equal(L.suggestMode(t, statesOf([r('a1', '2026-11-01', 3, 5, 'pre')], TODAY).a1), 'learn');
  assert.equal(L.suggestMode(t, statesOf([r('a1', '2026-11-01', 5, 5, 'pre')], TODAY).a1), 'full');
});
test('learnFirst lists Weak and OK pre-tests, lowest score first, not strong ones', () => {
  const results = [r('a1', '2026-11-01', 3, 5, 'pre'), r('a2', '2026-11-01', 1, 5, 'pre'), r('s1', '2026-11-01', 5, 5, 'pre')];
  assert.deepEqual(L.learnFirst(phases, statesOf(results, TODAY)).map(x => x.topic.id), ['a2', 'a1']);
});
test('parser reads mode: pre and the pre-test prompt asks for it', () => {
  const text = 'RESULT_START\ntopic_id: a1\nmode: pre\nscore: 2/5\nweak_points: none\nnext_step: x\nRESULT_END';
  const p = L.parseResult(text);
  assert.equal(p.data.mode, 'pre');
  const prompt = L.buildPrompt(phases[0].topics[0], phases[0], 'pre', []);
  assert.match(prompt, /PRE-TEST/);
  assert.match(prompt, /mode: pre/);
});
test('backup keeps mode pre', () => {
  const data = { version: 1, results: [r('a1', '2026-11-01', 2, 5, 'pre')], projects: {}, mocks: [] };
  const v = L.validateBackup(L.exportBackup(data, TODAY));
  assert.equal(v.ok, true);
  assert.equal(v.data.results[0].mode, 'pre');
});

test('canPreTest: only a topic with no saved result', () => {
  assert.equal(L.canPreTest([], 'a1'), true);
  assert.equal(L.canPreTest([r('a1', '2026-11-01', 2, 5, 'pre')], 'a1'), false);
  assert.equal(L.canPreTest([r('a1', '2026-11-01', 8, 10, 'full')], 'a1'), false);
  assert.equal(L.canPreTest([r('a2', '2026-11-01', 2, 5, 'pre')], 'a1'), true);
});
