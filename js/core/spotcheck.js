// Optional spot check: picks an old Strong or Done topic to retest, about one day in three.
import { addDays } from './dates.js';

// Spot check: an extra early retest of a Strong or Done topic. Stable for the whole day, shown about every third day.
export function dayHash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) + s.charCodeAt(i)) >>> 0; return h; }

export function pickSurprise(phases, states, today) {
  if (dayHash(today) % 3 !== 0) return null;
  var best = null, bestH = null, cutoff = addDays(today, -3);
  phases.forEach(function (p) {
    p.topics.forEach(function (t) {
      var s = states[t.id];
      if (s.level !== 'strong' && s.level !== 'done') return;
      if (s.isDue || s.last.date > cutoff) return;
      var hh = dayHash(today + t.id);
      if (bestH === null || hh < bestH) { bestH = hh; best = { topic: t, phase: p, state: s }; }
    });
  });
  return best;
}
