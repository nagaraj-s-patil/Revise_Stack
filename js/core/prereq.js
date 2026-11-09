// Prerequisites: what to complete before a topic. Each topic lists `needs` (topic ids) and may have a `before` note,
// both in the syllabus files. A prerequisite counts as ready when its level is Strong or Done.

const READY = { strong: true, done: true };

export function importanceOf(topic) { return topic && topic.importance || 3; }

/** One row per prerequisite: its topic, its current level, last real score, and whether it is ready. */
export function prereqStatus(topic, byId, states) {
  return (topic.needs || []).filter(function (id) { return byId[id]; }).map(function (id) {
    var t = byId[id].topic, s = states[id];
    return { topic: t, level: s.level, last: s.last || null, pre: s.pre || null, ready: !!READY[s.level] };
  });
}

/** Short text for one prerequisite, used in the prompt. */
export function prereqText(p) {
  var lvl = { done: 'Done', strong: 'Strong', ok: 'OK', weak: 'Weak', untested: 'not tested yet' }[p.level];
  var score = p.last ? ' (last test ' + p.last.score + '/' + p.last.total + ')' : p.pre ? ' (pre-test ' + p.pre.last.score + '/' + p.pre.last.total + ')' : '';
  return p.topic.name + ': ' + lvl + score;
}
