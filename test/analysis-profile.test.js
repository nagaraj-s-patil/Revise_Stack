import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProfile, profileOf, PROFILE_DEFAULTS, weeklyTrend, modeMix, pace, groupOf, exportBackup, validateBackup } from '../js/core/index.js';

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
  assert.deepEqual(modeMix(r), { pre: 1, quick: 1, full: 0 });
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
