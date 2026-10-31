// Turns saved results into a level, Done status and revision due date for one topic.
import { INTERVALS, PASS, STRONG } from './config.js';
import { addDays } from './dates.js';

export function pct(r) { return r.score / r.total; }

export function levelFromPct(p) {
  if (p >= STRONG) return 'strong';
  if (p >= PASS) return 'ok';
  return 'weak';
}

export function resultsFor(results, topicId) {
  return results
    .filter(function (r) { return r.topicId === topicId; })
    .sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

// Done = latest result >= 80%, and the latest result from an earlier day is >= 80% too,
// and at least one of the two was a Full test (10+ questions).
export function isDone(list) {
  if (!list.length) return false;
  var last = list[list.length - 1];
  if (pct(last) < STRONG) return false;
  var prev = null;
  for (var i = list.length - 2; i >= 0; i--) {
    if (list[i].date < last.date) { prev = list[i]; break; }
  }
  if (!prev || pct(prev) < STRONG) return false;
  return last.total >= 10 || prev.total >= 10;
}

// Revision schedule: days after the first test of the current passing run.
// A result under 60% breaks the run, and the topic is due again the next day.
export function nextDue(list) {
  if (!list.length) return null;
  var last = list[list.length - 1];
  if (pct(last) < PASS) return addDays(last.date, 1);
  var dates = [];
  for (var i = list.length - 1; i >= 0 && pct(list[i]) >= PASS; i--) {
    if (dates[0] !== list[i].date) dates.unshift(list[i].date);
  }
  var idx = dates.length - 1;
  if (idx < INTERVALS.length) return addDays(dates[0], INTERVALS[idx]);
  return addDays(last.date, 14);
}

// State of one topic, calculated from results (nothing is stored).
export function topicState(results, topicId, today) {
  var list = resultsFor(results, topicId);
  if (!list.length) return { level: 'untested', last: null, count: 0, due: null, isDue: false, doneProgress: 0 };
  var last = list[list.length - 1];
  var done = isDone(list);
  var due = nextDue(list);
  return {
    level: done ? 'done' : levelFromPct(pct(last)),
    last: last,
    count: list.length,
    due: due,
    isDue: !!today && due <= today,
    doneProgress: doneProgress(list)
  };
}

// How many of the 2 passing tests are in place (for the "Done: 1 of 2" label).
export function doneProgress(list) {
  if (!list.length) return 0;
  var last = list[list.length - 1];
  if (pct(last) < STRONG) return 0;
  if (isDone(list)) return 2;
  return 1;
}
