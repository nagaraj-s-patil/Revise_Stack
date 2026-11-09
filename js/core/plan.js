// Decides what to study today: due revisions first, then new topics in study order.
import { PRIORITY, STRONG } from './config.js';
import { pct } from './levels.js';

// Tag-based starting mode. The app no longer uses it for a first attempt (see suggestMode), only as a reference.
export function suggestedMode(tag) {
  if (tag === 'LEARN') return 'learn';
  return 'full';
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

// Topics you marked Important (star) go first inside each group.
// Queue: due revisions first (weak before ok before strong, oldest due first), then new topics in study order.
// A topic tested today is skipped, so you never get the same topic twice in one day.
export function buildQueue(phases, states, today, important) {
  important = important || {};
  var unlocked = isUnlocked(phases, states);
  var due = [], fresh = [];
  orderedPhases(phases).forEach(function (p) {
    p.topics.forEach(function (t) {
      if (!t.core && !unlocked) return;
      var s = states[t.id];
      if (s.last && s.last.date === today) return;
      if (s.pre && s.pre.last.date === today) return;   // pre-tested today: next topic
      if (s.level === 'untested') fresh.push({ topic: t, phase: p, state: s, kind: 'new' });
      else if (s.isDue) due.push({ topic: t, phase: p, state: s, kind: 'revision' });
    });
  });
  var rank = { weak: 0, ok: 1, strong: 2, done: 3 };
  var imp = function (q) { return important[q.topic.id] ? 0 : 1; };
  due.sort(function (a, b) {
    return (imp(a) - imp(b)) || (rank[a.state.level] - rank[b.state.level]) || (a.state.due < b.state.due ? -1 : a.state.due > b.state.due ? 1 : 0);
  });
  // New topics: what the pre-test says to learn first (Weak), then not pre-tested yet, then OK, then Strong (needs a real test to confirm).
  var preRank = { weak: 0, none: 1, ok: 2, strong: 3 };
  var rankOf = function (q) { return q.state.pre ? preRank[q.state.pre.level] : preRank.none; };
  fresh.forEach(function (q, i) { q.order = i; });
  fresh.sort(function (a, b) { return (imp(a) - imp(b)) || (rankOf(a) - rankOf(b)) || (a.order - b.order); });
  return due.concat(fresh);
}

// Topics whose pre-test was Weak or OK and that have no real test yet: what to learn first, lowest score first.
export function learnFirst(phases, states) {
  var out = [];
  orderedPhases(phases).forEach(function (p) {
    p.topics.forEach(function (t) {
      var s = states[t.id];
      if (s.level === 'untested' && s.pre && s.pre.level !== 'strong') out.push({ topic: t, phase: p, state: s, order: out.length });
    });
  });
  return out.sort(function (a, b) { return (pct(a.state.pre.last) - pct(b.state.pre.last)) || (a.order - b.order); });
}

// A topic never tested starts with a pre-test (5 questions) whatever its tag. After a pre-test: Weak or OK means
// learn first, Strong means a Full test to confirm. Once a topic has a real test, the next one is always a Full test (10 questions).
export function suggestMode(topic, state) {
  if (!state || !state.last) {
    if (state && state.pre) return state.pre.level === 'strong' ? 'full' : 'learn';
    return 'pre';
  }
  return 'full';
}

// A pre-test is taken once per topic: only a topic with no saved result at all can still be pre-tested.
// (Undo a pre-test and the topic can be pre-tested again.)
export function canPreTest(results, topicId) {
  return !results.some(function (r) { return r.topicId === topicId; });
}

// The next topic in study order, after this one, that has no saved result yet (so it can still be pre-tested).
export function nextPreTopic(phases, results, topicId) {
  var seen = false, found = null;
  orderedPhases(phases).forEach(function (p) {
    p.topics.forEach(function (t) {
      if (found) return;
      if (t.id === topicId) { seen = true; return; }
      if (seen && canPreTest(results, t.id)) found = { topic: t, phase: p };
    });
  });
  return found;
}

// Minimum day: one revision, else a new topic that does not need teaching first.
export function shortTask(queue) {
  var rev = queue.filter(function (q) { return q.kind === 'revision'; });
  if (rev.length) return rev[0];
  var easy = queue.filter(function (q) { return q.topic.tag !== 'LEARN'; });
  return easy[0] || queue[0] || null;
}
