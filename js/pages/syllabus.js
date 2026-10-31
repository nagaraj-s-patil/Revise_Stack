// Syllabus page: core progress, filter chips, phases with their topics, and the locked "Later" group.
import { h } from '../ui/dom.js';
import { allTopics, countLevels, isUnlocked } from '../core/index.js';
import { context } from '../state/context.js';
import { states } from '../state/selectors.js';
import { ui } from '../state/session.js';
import { render } from '../ui/render.js';
import { badge } from '../ui/components/badge.js';

const FILTERS = [['all', 'All'], ['weak', 'Weak'], ['due', 'Due'], ['untested', 'Untested']];

function topicRow(topic, s, locked) {
  const meta = h('span', { class: 'meta' },
    s.isDue ? h('span', { class: 'duepill' }, 'Due') : null,
    s.last ? h('span', { class: 'score' }, s.last.score + '/' + s.last.total) : null,
    badge(s.level));
  const name = h('span', { class: 'name' }, topic.name,
    h('span', { class: 'tag', style: 'display:block' }, topic.tag === 'UNSET' ? '' : topic.tag));
  return h('li', null, locked
    ? h('div', { class: 'topic locked' }, name, meta)
    : h('a', { class: 'topic', href: '#t-' + topic.id }, name, meta));
}

function summaryCard(core, st, dueCount) {
  const counts = countLevels(core, st);
  const width = n => (n / core.length * 100).toFixed(2) + '%';
  return h('section', { class: 'summary', 'aria-label': 'Core progress' },
    h('div', { class: 'summary-head' },
      h('h2', null, counts.done + ' of ' + core.length + ' core topics Done'),
      h('span', { class: 'small muted' }, dueCount ? dueCount + ' due for revision' : 'Nothing due')),
    h('div', {
      class: 'bar', role: 'img',
      'aria-label': counts.done + ' done, ' + counts.strong + ' strong, ' + counts.ok + ' OK, ' + counts.weak + ' weak, ' + counts.untested + ' untested'
    },
    h('span', { class: 'b-done', style: 'width:' + width(counts.done) }),
    h('span', { class: 'b-strong', style: 'width:' + width(counts.strong) }),
    h('span', { class: 'b-ok', style: 'width:' + width(counts.ok) }),
    h('span', { class: 'b-weak', style: 'width:' + width(counts.weak) })),
    h('div', { class: 'counts' },
      h('span', null, h('b', null, counts.done), ' Done'),
      h('span', null, h('b', null, counts.strong), ' Strong'),
      h('span', null, h('b', null, counts.ok), ' OK'),
      h('span', null, h('b', null, counts.weak), ' Weak'),
      h('span', null, h('b', null, counts.untested), ' Untested')));
}

function filterChips() {
  return h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter topics' }, FILTERS.map(([value, label]) =>
    h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(ui.filter === value),
      onclick: () => { ui.filter = value; render(); }
    }, label)));
}

export function syllabusPage() {
  const { phases } = context.syllabus;
  const st = states();
  const core = allTopics(phases, true);
  const all = allTopics(phases, false);
  const dueCount = all.filter(t => st[t.id].isDue).length;
  const unlocked = isUnlocked(phases, st);
  const frag = document.createDocumentFragment();

  frag.appendChild(summaryCard(core, st, dueCount));
  frag.appendChild(filterChips());

  const matches = t => {
    const s = st[t.id];
    if (ui.filter === 'weak') return s.level === 'weak';
    if (ui.filter === 'due') return s.isDue;
    if (ui.filter === 'untested') return s.level === 'untested';
    return true;
  };

  // the first core phase that is not finished starts open
  if (ui.open === null) {
    ui.open = {};
    const next = phases.find(p => p.topics.some(t => t.core && st[t.id].level !== 'done'));
    if (next) ui.open[next.id] = true;
  }

  let shown = 0;
  for (const phase of phases) {
    const coreTopics = phase.topics.filter(t => t.core);
    if (!coreTopics.length) continue;
    const rows = coreTopics.filter(matches);
    if (!rows.length) continue;
    shown += rows.length;
    const doneCount = coreTopics.filter(t => st[t.id].level === 'done').length;
    const details = h('details', { class: 'phase' },
      h('summary', null,
        h('span', { class: 'phase-title' },
          h('h3', null, 'Phase ' + phase.number + ' · ' + phase.name),
          h('small', null, doneCount + ' of ' + coreTopics.length + ' Done')),
        h('span', { class: 'phase-right' })),
      h('ul', { class: 'topics' }, rows.map(t => topicRow(t, st[t.id], false))));
    details.open = ui.filter !== 'all' || !!ui.open[phase.id];
    details.addEventListener('toggle', () => { ui.open[phase.id] = details.open; });
    frag.appendChild(details);
  }

  // topics that wait until the core is Strong or Done
  const later = phases
    .map(phase => ({ phase, rows: phase.topics.filter(t => !t.core && matches(t)) }))
    .filter(x => x.rows.length);
  if (later.length) {
    const count = later.reduce((n, x) => n + x.rows.length, 0);
    const details = h('details', { class: 'phase' },
      h('summary', null,
        h('span', { class: 'phase-title' },
          h('h3', null, 'Later'),
          h('small', null, count + ' topics · ' + (unlocked ? 'unlocked' : 'locked'))),
        h('span', { class: 'phase-right' })));
    if (!unlocked) {
      details.appendChild(h('p', { class: 'locknote' },
        'These unlock when every core topic is Strong or Done. Security, DevOps, microservices and the rest wait until the core is solid.'));
    }
    for (const x of later) {
      details.appendChild(h('p', { class: 'locknote', style: 'font-weight:600;color:var(--fg)' }, 'Phase ' + x.phase.number + ' · ' + x.phase.name));
      details.appendChild(h('ul', { class: 'topics' }, x.rows.map(t => topicRow(t, st[t.id], !unlocked))));
    }
    details.open = ui.filter !== 'all';
    frag.appendChild(details);
    shown += count;
  }

  if (!shown) frag.appendChild(h('p', { class: 'empty' }, 'No topics match this filter.'));
  return frag;
}
