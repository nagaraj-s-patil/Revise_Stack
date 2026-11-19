// Syllabus page: core progress, filter chips, phases with their topics, and the locked "Later" group.
import { h } from '../ui/dom.js';
import { allTopics, countLevels, isUnlocked, buildQueue, today } from '../core/index.js';
import { context } from '../state/context.js';
import { states } from '../state/selectors.js';
import { ui } from '../state/session.js';
import { render } from '../ui/render.js';
import { badge, preBadge, stars } from '../ui/components/badge.js';
import { icon } from '../ui/components/icons.js';
import { donut } from '../ui/components/charts.js';

// Which phases are open and which filter is chosen are remembered on this device, so a refresh puts you back where you were.
const KEY = 'revise-stack-syllabus-view';
const loadView = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
const saveView = () => { try { localStorage.setItem(KEY, JSON.stringify({ open: ui.open, filter: ui.filter })); } catch (e) { /* ignore */ } };

const FILTERS = [['all', 'All'], ['weak', 'Weak'], ['due', 'Due'], ['untested', 'Untested'], ['must', '5★ Must know']];

const LEVEL_ICON = { done: 'check', strong: 'check', ok: 'clock', weak: 'flame', untested: 'play' };

function topicRow(topic, s, locked) {
  const meta = h('span', { class: 'meta' },
    s.isDue ? h('span', { class: 'duepill' }, 'Due') : null,
    s.last ? h('span', { class: 'score' }, s.last.score + '/' + s.last.total) : s.pre ? h('span', { class: 'score' }, s.pre.last.score + '/' + s.pre.last.total) : null,
    s.pre ? preBadge(s.pre) : badge(s.level));
  const name = h('span', { class: 'name' }, topic.name,
    h('span', { class: 'tag', style: 'display:block' }, stars(topic.importance), topic.tag === 'UNSET' ? '' : '  ' + topic.tag));
  const lead = h('span', { class: 'tp-ic tp-' + s.level, 'aria-hidden': 'true' }, icon(LEVEL_ICON[s.level] || 'play', 18));
  return h('li', null, locked
    ? h('div', { class: 'topic locked' }, lead, name, meta)
    : h('a', { class: 'topic', href: '#t-' + topic.id }, lead, name, meta, icon('arrow', 16)));
}

function summaryCard(core, st, dueCount, next) {
  const counts = countLevels(core, st);
  const parts = [['done', 'Done'], ['strong', 'Strong'], ['ok', 'OK'], ['weak', 'Weak'], ['untested', 'Untested']].map(([k, label]) => ({ label, n: counts[k], cls: 'lv-' + k }));
  const share = core.length ? Math.round(counts.done / core.length * 100) : 0;
  return h('section', { class: 'lp-top card', 'aria-label': 'Core progress' },
    donut(parts, share + '%', 'Done', counts.done + ' of ' + core.length + ' core topics Done'),
    h('div', { class: 'lp-top-main' },
      h('h2', null, counts.done + ' of ' + core.length + ' core topics Done'),
      h('p', { class: 'small muted' }, dueCount ? dueCount + ' due for revision' : 'Nothing due for revision'),
      h('div', { class: 'lp-counts' }, [['done', 'Done'], ['strong', 'Strong'], ['ok', 'OK'], ['weak', 'Weak'], ['untested', 'Untested']].map(([k, label]) =>
        h('span', { class: 'lp-count lc-' + k }, h('b', null, counts[k]), ' ' + label))),
      next ? h('div', { class: 'lp-next' },
        h('span', { class: 'small muted' }, next.kind === 'revision' ? 'Revision due' : 'Up next'),
        h('strong', null, next.topic.name),
        h('a', { class: 'btn small', href: '#t-' + next.topic.id }, 'Start', icon('arrow', 16))) : null));
}

function searchBox() {
  const input = h('input', { type: 'search', id: 'syl-search', value: ui.q, placeholder: 'Search topics', 'aria-label': 'Search topics', autocomplete: 'off' });
  input.addEventListener('input', () => { ui.q = input.value.trim(); render(); const el = document.getElementById('syl-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } });
  return h('div', { class: 'syl-search' }, input,
    ui.q ? h('button', { class: 'btn small secondary', type: 'button', onclick: () => { ui.q = ''; render(); } }, 'Clear') : null);
}

function filterChips() {
  return h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter topics' }, FILTERS.map(([value, label]) =>
    h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(ui.filter === value),
      onclick: () => { ui.filter = value; saveView(); render(); }
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

  frag.appendChild(h('h2', { class: 'lp-title' }, 'Learning Path'));
  frag.appendChild(summaryCard(core, st, dueCount, buildQueue(phases, st, today())[0]));
  frag.appendChild(h('div', { class: 'lp-bar' }, searchBox(), filterChips()));
  const list = h('div', { class: 'lp-phases' });
  frag.appendChild(list);

  const matches = t => {
    const s = st[t.id];
    if (ui.q && !t.name.toLowerCase().includes(ui.q.toLowerCase())) return false;
    if (ui.filter === 'weak') return s.level === 'weak';
    if (ui.filter === 'due') return s.isDue;
    if (ui.filter === 'untested') return s.level === 'untested';
    if (ui.filter === 'must') return t.importance >= 5;
    return true;
  };

  // first visit in this tab: restore the saved view, else the first core phase that is not finished starts open
  if (ui.open === null) {
    const saved = loadView();
    if (saved && saved.open && typeof saved.open === 'object') {
      ui.open = saved.open;
      if (FILTERS.some(f => f[0] === saved.filter)) ui.filter = saved.filter;
    } else {
      ui.open = {};
      const next = phases.find(p => p.topics.some(t => t.core && st[t.id].level !== 'done'));
      if (next) ui.open[next.id] = true;
    }
  }

  let shown = 0;
  for (const phase of phases) {
    const coreTopics = phase.topics.filter(t => t.core);
    if (!coreTopics.length) continue;
    const rows = coreTopics.filter(matches);
    if (!rows.length) continue;
    shown += rows.length;
    const doneCount = coreTopics.filter(t => st[t.id].level === 'done').length;
    const pshare = doneCount / coreTopics.length;
    const status = doneCount === coreTopics.length ? ['Complete', 'done'] : coreTopics.some(t => st[t.id].level !== 'untested') ? ['In progress', 'prog'] : ['Not started', 'none'];
    const details = h('details', { class: 'phase' },
      h('summary', null,
        h('span', { class: 'ph-num ph-bg-' + (((phase.number - 1) % 6) + 1) }, String(phase.number)),
        h('span', { class: 'phase-title' },
          h('h3', null, phase.name),
          h('small', null, doneCount + ' of ' + coreTopics.length + ' Done'),
          h('span', { class: 'pbar ph-mini', role: 'img', 'aria-label': Math.round(pshare * 100) + '% of core topics Done' }, h('span', { style: 'width:' + Math.round(pshare * 100) + '%' }))),
        h('span', { class: 'phase-right' }, h('span', { class: 'ph-status ps-' + status[1] }, status[0]))),
      h('ul', { class: 'topics' }, rows.map(t => topicRow(t, st[t.id], false))));
    details.open = ui.filter !== 'all' || !!ui.q || !!ui.open[phase.id];
    details.addEventListener('toggle', () => { if (ui.filter === 'all') { ui.open[phase.id] = details.open; saveView(); } });
    list.appendChild(details);
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
    list.appendChild(details);
    shown += count;
  }

  if (!shown) frag.appendChild(h('p', { class: 'empty' }, 'No topics match this filter.'));
  return frag;
}
