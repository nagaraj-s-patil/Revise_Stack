// Decides what to study today: due revisions first, then new topics in study order.
import { PRIORITY, STRONG } from './config.js';
import { pct } from './levels.js';

// REVISE topics start with a Quick test, LEARN topics start with teaching, TEST topics start with a Full test.
export function suggestedMode(tag) {
  if (tag === 'LEARN') return 'learn';
  if (tag === 'TEST') return 'full';
  return 'quick';
}

export function orderedPhases(phases) {
  return phases.slice().sort(function (a, b) {
    var ia = PRIORITY.indexOf(a.number), ib = PRIORITY.indexOf(b.number);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

// Later topics unlock when every core topic is Strong or Done.
export function isUnlocked(phases, states) {
  return phases.every(function (p) {
    return p.topics.every(function (t) {
      if (!t.core) return true;
      var l = states[t.id].level;
      return l === 'strong' || l === 'done';
    });
  });
}

// Queue: due revisions first (weak before ok before strong, oldest due first), then new topics in study order.
// A topic tested today is skipped, so you never get the same topic twice in one day.
export function buildQueue(phases, states, today) {
  var unlocked = isUnlocked(phases, states);
  var due = [], fresh = [];
  orderedPhases(phases).forEach(function (p) {
    p.topics.forEach(function (t) {
      if (!t.core && !unlocked) return;
      var s = states[t.id];
      if (s.last && s.last.date === today) return;
      if (s.level === 'untested') fresh.push({ topic: t, phase: p, state: s, kind: 'new' });
      else if (s.isDue) due.push({ topic: t, phase: p, state: s, kind: 'revision' });
    });
  });
  var rank = { weak: 0, ok: 1, strong: 2, done: 3 };
  due.sort(function (a, b) {
    return (rank[a.state.level] - rank[b.state.level]) || (a.state.due < b.state.due ? -1 : a.state.due > b.state.due ? 1 : 0);
  });
  return due.concat(fresh);
}

// A strong result from a Quick test needs a Full test to reach Done, so suggest Full then.
export function suggestMode(topic, state) {
  if (!state || !state.last) return suggestedMode(topic.tag);
  if (pct(state.last) >= STRONG && state.last.total < 10) return 'full';
  return 'quick';
}

// Minimum day: one revision, else a new topic that does not need teaching first.
export function shortTask(queue) {
  var rev = queue.filter(function (q) { return q.kind === 'revision'; });
  if (rev.length) return rev[0];
  var easy = queue.filter(function (q) { return q.topic.tag !== 'LEARN'; });
  return easy[0] || queue[0] || null;
}
