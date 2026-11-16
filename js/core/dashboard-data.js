// Numbers for the dashboard widgets. Pure functions over saved results and topic states; nothing is stored.
import { addDays, shortDate } from './dates.js';
import { pct } from './levels.js';
import { orderedPhases } from './plan.js';

/** Tests per day for the last `n` days, oldest first. */
export function lastDays(results, today, n) {
  var out = [];
  for (var i = n - 1; i >= 0; i--) {
    var d = addDays(today, -i);
    out.push({ date: d, count: results.filter(function (r) { return r.date === d; }).length });
  }
  return out;
}

/** Average score (0-1) per day that has a real (non pre) test, within the last `days` days. Oldest first. */
export function progressSeries(results, today, days) {
  var from = addDays(today, -(days - 1)), by = {};
  results.forEach(function (r) {
    if (r.mode === 'pre' || r.date < from || r.date > today) return;
    (by[r.date] = by[r.date] || []).push(pct(r));
  });
  return Object.keys(by).sort().map(function (d) {
    var list = by[d];
    return { date: d, avg: list.reduce(function (a, b) { return a + b; }, 0) / list.length, n: list.length };
  });
}

/** 'Today', 'Tomorrow', 'Overdue' or a short date. */
export function dueLabel(date, today) {
  if (date < today) return 'Overdue';
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  return shortDate(date);
}

/** Next revisions by due date (topics that have been tested at least once). */
export function upcoming(phases, states, limit) {
  var rows = [];
  orderedPhases(phases).forEach(function (p) {
    p.topics.forEach(function (t) {
      var s = states[t.id];
      if (s && s.due && s.level !== 'done') rows.push({ topic: t, phase: p, state: s });
    });
  });
  rows.sort(function (a, b) { return a.state.due < b.state.due ? -1 : a.state.due > b.state.due ? 1 : 0; });
  return rows.slice(0, limit);
}

/** The first phase (study order) whose core is not yet 70% Strong/Done, with the share reached so far. Null when all phases pass. */
export function nextGoal(phases, states, target) {
  target = target || 0.7;
  var list = orderedPhases(phases);
  for (var i = 0; i < list.length; i++) {
    var core = list[i].topics.filter(function (t) { return t.core; });
    if (!core.length) continue;
    var good = core.filter(function (t) { return states[t.id].level === 'strong' || states[t.id].level === 'done'; }).length;
    var share = good / core.length;
    if (share < target) return { phase: list[i], core: core.length, good: good, share: share, target: target, need: Math.ceil(target * core.length) - good };
  }
  return null;
}
