import test from 'node:test';
import assert from 'node:assert/strict';
import { lastDays, progressSeries, dueLabel, nextGoal } from '../js/core/index.js';

const r = (date, score, mode) => ({ date, score, total: 10, mode: mode || 'full', topicId: 'a' });

test('lastDays counts tests per day, oldest first', () => {
  const d = lastDays([r('2026-11-16', 5), r('2026-11-16', 6), r('2026-11-14', 7)], '2026-11-16', 3);
  assert.deepEqual(d.map(x => x.count), [1, 0, 2]);
});

test('progressSeries ignores pre-tests and old days, averages per day', () => {
  const s = progressSeries([r('2026-11-16', 6), r('2026-11-16', 8), r('2026-11-16', 1, 'pre'), r('2026-10-01', 9)], '2026-11-16', 7);
  assert.equal(s.length, 1);
  assert.equal(s[0].avg, 0.7);
  assert.equal(s[0].n, 2);
});

test('dueLabel', () => {
  assert.equal(dueLabel('2026-11-15', '2026-11-16'), 'Overdue');
  assert.equal(dueLabel('2026-11-16', '2026-11-16'), 'Today');
  assert.equal(dueLabel('2026-11-17', '2026-11-16'), 'Tomorrow');
});

test('nextGoal finds the first phase under the target', () => {
  const phases = [{ number: 1, id: 'p1', name: 'P1', topics: [{ id: 'a', core: true }, { id: 'b', core: true }] }];
  const g = nextGoal(phases, { a: { level: 'strong' }, b: { level: 'weak' } }, 0.7);
  assert.equal(g.need, 1);
  assert.equal(nextGoal(phases, { a: { level: 'done' }, b: { level: 'strong' } }, 0.7), null);
});
