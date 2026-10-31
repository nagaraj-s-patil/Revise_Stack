// Roll-ups for the Progress and Projects pages: counts, weakest topics, project readiness, apply checks.
import { BUILD_READY } from './config.js';
import { pct } from './levels.js';

export function allTopics(phases, coreOnly) {
  var out = [];
  phases.forEach(function (p) { p.topics.forEach(function (t) { if (!coreOnly || t.core) out.push(t); }); });
  return out;
}

export function countLevels(topics, states) {
  var c = { done: 0, strong: 0, ok: 0, weak: 0, untested: 0 };
  topics.forEach(function (t) { c[states[t.id].level]++; });
  return c;
}

// Tested topics that are still Weak or OK, lowest score first, oldest test first on ties.
export function weakestTopics(phases, states, n) {
  var list = [];
  phases.forEach(function (p) {
    p.topics.forEach(function (t) {
      var s = states[t.id];
      if (s.level === 'weak' || s.level === 'ok') list.push({ topic: t, phase: p, state: s });
    });
  });
  list.sort(function (a, b) {
    return (pct(a.state.last) - pct(b.state.last)) ||
      (a.state.last.date < b.state.last.date ? -1 : a.state.last.date > b.state.last.date ? 1 : 0);
  });
  return list.slice(0, n);
}

// Share of core topics in the given phases that are Strong or Done.
export function skillShare(phases, states, numbers) {
  var total = 0, good = 0;
  phases.forEach(function (p) {
    if (numbers.indexOf(p.number) < 0) return;
    p.topics.forEach(function (t) {
      if (!t.core) return;
      total++;
      var l = states[t.id].level;
      if (l === 'strong' || l === 'done') good++;
    });
  });
  return total ? good / total : 0;
}

export function projectReady(project, phases, states) {
  var share = skillShare(phases, states, project.needs || []);
  return { share: share, ready: share >= BUILD_READY };
}

// Simple apply-readiness checks. These are suggested thresholds, not facts.
export function applyChecks(phases, states, projectState, projectList) {
  var core = allTopics(phases, true);
  var good = core.filter(function (t) { var l = states[t.id].level; return l === 'strong' || l === 'done'; }).length;
  var share = core.length ? good / core.length : 0;
  var doneProjects = projectList.filter(function (p) {
    var ps = projectState[p.id];
    return ps && ps.status === 'done' && ps.link;
  }).length;
  var weak = [];
  phases.forEach(function (p) {
    if ([2, 4, 7].indexOf(p.number) < 0) return;
    p.topics.forEach(function (t) { if (t.core && states[t.id].level === 'weak') weak.push(t.name); });
  });
  return [
    { id: 'project', ok: doneProjects >= 1, label: 'At least 1 project Done with a repository link', detail: doneProjects + ' of ' + projectList.length + ' done' },
    { id: 'core', ok: share >= 0.7, label: '70% of core topics Strong or Done', detail: Math.round(share * 100) + '% now' },
    { id: 'weak', ok: weak.length === 0, label: 'No Weak topic in Java, SQL or Spring Boot', detail: weak.length ? weak.length + ' Weak now' : 'none Weak' }
  ];
}
