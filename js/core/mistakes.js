// Groups weak points that repeat across tests of the same topic.
import { resultsFor } from './levels.js';

export function normPoint(s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

// Weak points grouped by wording (case and punctuation ignored). count = number of tests that listed it.
export function mistakeStats(list) {
  var map = {};
  list.forEach(function (r) {
    var seen = {};
    (r.weakPoints || []).forEach(function (w) {
      var k = normPoint(w);
      if (!k || seen[k]) return;
      seen[k] = 1;
      var m = map[k] || (map[k] = { key: k, text: w, count: 0, last: r.date });
      m.count++;
      if (r.date >= m.last) { m.last = r.date; m.text = w; }
    });
  });
  return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
    return (b.count - a.count) || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0);
  });
}

export function repeatedMistakes(phases, results, n) {
  var out = [];
  phases.forEach(function (p) {
    p.topics.forEach(function (t) {
      var list = resultsFor(results, t.id);
      if (list.length < 2) return;
      mistakeStats(list).forEach(function (m) {
        if (m.count >= 2) out.push({ topic: t, phase: p, text: m.text, count: m.count, last: m.last });
      });
    });
  });
  out.sort(function (a, b) { return (b.count - a.count) || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0); });
  return out.slice(0, n);
}

// Latest weak points for a topic, newest first, no repeats.
export function recentWeakPoints(results, topicId, n) {
  var list = resultsFor(results, topicId).slice().reverse(), seen = {}, out = [];
  list.forEach(function (r) {
    (r.weakPoints || []).forEach(function (w) {
      var k = normPoint(w);
      if (k && !seen[k] && out.length < n) { seen[k] = 1; out.push(w); }
    });
  });
  return out;
}
