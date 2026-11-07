// Analysis: numbers and trends worked out from saved results. Pure functions, nothing is stored.
// Pre-tests are left out of scores and levels (see levels.js). They only count as activity.
import { PASS, STRONG } from './config.js';
import { addDays, parseDate, shortDate } from './dates.js';
import { pct, resultsFor } from './levels.js';
import { weekStart } from './streak.js';
import { orderedPhases } from './plan.js';

const real = results => results.filter(function (r) { return r.mode !== 'pre'; });
const avg = list => list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : null;

/** Last `weeks` calendar weeks (Monday start): tests taken (all modes) and average score of real tests. */
export function weeklyTrend(results, today, weeks) {
  var out = [], start = weekStart(today);
  for (var i = weeks - 1; i >= 0; i--) {
    var from = addDays(start, -7 * i), to = addDays(from, 6);
    var inWeek = results.filter(function (r) { return r.date >= from && r.date <= to; });
    var scores = real(inWeek).map(pct);
    out.push({ from: from, label: shortDate(from), tests: inWeek.length, avg: avg(scores), real: scores.length });
  }
  return out;
}

export function modeMix(results) {
  var m = { pre: 0, quick: 0, full: 0 };
  results.forEach(function (r) { m[r.mode === 'pre' ? 'pre' : r.mode === 'full' ? 'full' : 'quick']++; });
  return m;
}

export function studyDays(results) {
  var d = {};
  results.forEach(function (r) { d[r.date] = true; });
  return Object.keys(d).length;
}

/** Average of the most recent `n` real tests (as a 0-1 share), or null. */
export function recentAverage(results, n) {
  var list = real(results).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return avg(list.slice(-n).map(pct));
}

/** Per phase (in study order): core topics, how many are Strong or Done, and the average of the latest real score of tested core topics. */
export function phaseStats(phases, states) {
  return orderedPhases(phases).map(function (p) {
    var core = p.topics.filter(function (t) { return t.core; });
    var good = core.filter(function (t) { return states[t.id].level === 'strong' || states[t.id].level === 'done'; }).length;
    var tested = core.filter(function (t) { return states[t.id].last; });
    return { phase: p, core: core.length, good: good, share: core.length ? good / core.length : 0, tested: tested.length,
      avg: avg(tested.map(function (t) { return pct(states[t.id].last); })) };
  }).filter(function (s) { return s.core > 0; });
}

/** One row per topic with its trend: compares the last real score with the one before it. */
export function topicRows(phases, states, results, today) {
  var rows = [];
  orderedPhases(phases).forEach(function (p) {
    p.topics.forEach(function (t) {
      var s = states[t.id];
      var list = resultsFor(results, t.id).filter(function (r) { return r.mode !== 'pre'; });
      var trend = 'new';
      if (list.length >= 2) {
        var d = pct(list[list.length - 1]) - pct(list[list.length - 2]);
        trend = d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat';
      }
      var days = s.last ? Math.round((parseDate(today) - parseDate(s.last.date)) / 86400000) : null;
      rows.push({ topic: t, phase: p, state: s, trend: trend, daysSince: days });
    });
  });
  return rows;
}

/** Is this topic good (Strong/Done), needing work (Weak/OK) or not started? */
export function groupOf(level) {
  return level === 'strong' || level === 'done' ? 'good' : level === 'untested' ? 'new' : 'work';
}

/**
 * Pace to the apply-by date: how many core topics must reach Strong per week, and how many did in the last 4 weeks.
 * A topic "reached Strong" on the date of its first real score at or above the Strong line.
 */
export function pace(phases, states, results, today, deadline) {
  var core = [];
  phases.forEach(function (p) { p.topics.forEach(function (t) { if (t.core) core.push(t); }); });
  var good = core.filter(function (t) { return states[t.id].level === 'strong' || states[t.id].level === 'done'; });
  var remaining = core.length - good.length;
  var daysLeft = Math.round((parseDate(deadline) - parseDate(today)) / 86400000);
  var since = addDays(today, -27), recent = 0;
  good.forEach(function (t) {
    var first = resultsFor(results, t.id).filter(function (r) { return r.mode !== 'pre' && pct(r) >= STRONG; })[0];
    if (first && first.date >= since) recent++;
  });
  var perWeek = recent / 4;
  var weeksLeft = Math.max(daysLeft, 0) / 7;
  var out = { total: core.length, good: good.length, remaining: remaining, daysLeft: daysLeft, needPerWeek: weeksLeft > 0 ? remaining / weeksLeft : null,
    perWeek: perWeek, projected: null, verdict: 'ok' };
  if (remaining === 0) out.verdict = 'done';
  else if (daysLeft <= 0) out.verdict = 'passed';
  else if (perWeek === 0) out.verdict = 'nopace';
  else {
    out.projected = addDays(today, Math.ceil((remaining / perWeek) * 7));
    out.verdict = out.projected <= deadline ? 'ontrack' : 'behind';
  }
  return out;
}

export { PASS, STRONG };
