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
const saveView = () => { try { localStorage.setItem(KEY, JSON.stringify({ open: ui.open, filter: ui.filter, view: ui.lpView })); } catch (e) { /* ignore */ } };

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

const PH = n => ((n - 1) % 6) + 1;

/** A topic as a card: coloured top edge by level, status icon, name, stars, score and level. */
function topicCard(topic, s, locked) {
  const body = [
    h('span', { class: 'tc-top' },
      h('span', { class: 'tp-ic tp-' + s.level, 'aria-hidden': 'true' }, icon(LEVEL_ICON[s.level] || 'play', 18)),
      s.isDue ? h('span', { class: 'duepill' }, 'Due') : null,
      s.last ? h('span', { class: 'score' }, s.last.score + '/' + s.last.total) : s.pre ? h('span', { class: 'score' }, s.pre.last.score + '/' + s.pre.last.total) : null),
    h('strong', { class: 'tc-name' }, topic.name),
    h('span', { class: 'tc-foot' }, stars(topic.importance), s.pre ? preBadge(s.pre) : badge(s.level))
  ];
  return locked ? h('div', { class: 'tcard locked lvb-' + s.level }, body) : h('a', { class: 'tcard lvb-' + s.level, href: '#t-' + topic.id }, body);
}

function topicsView(rows, st, locked) {
  return ui.lpView === 'list'
    ? h('ul', { class: 'topics' }, rows.map(t => topicRow(t, st[t.id], locked)))
    : h('div', { class: 'tgrid' }, rows.map(t => topicCard(t, st[t.id], locked)));
}

function viewToggle() {
  return h('div', { class: 'pills', role: 'group', 'aria-label': 'Layout' }, [['cards', 'Cards'], ['list', 'List']].map(([k, label]) =>
    h('button', { class: 'pill', type: 'button', 'aria-pressed': String(ui.lpView === k), onclick: () => { ui.lpView = k; saveView(); render(); } }, label)));
}

/** Jump bar: one pill per phase with its progress, sticky under the top. */
function phaseNav(phases, st) {
  return h('nav', { class: 'ph-nav', 'aria-label': 'Jump to a phase' }, phases.map(phase => {
    const core = phase.topics.filter(t => t.core);
    if (!core.length) return null;
    const done = core.filter(t => st[t.id].level === 'done').length;
    return h('button', { class: 'ph-jump', type: 'button', onclick: () => {
      const el = document.getElementById('phase-' + phase.id);
      if (el) { if (!ui.open[phase.id]) { ui.open[phase.id] = true; saveView(); render(); } document.getElementById('phase-' + phase.id).scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    } }, h('span', { class: 'ph-dot ph-bg-' + PH(phase.number) }, String(phase.number)), h('span', { class: 'ph-jump-t' }, phase.name), h('b', null, done + '/' + core.length));
  }));
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
  frag.appendChild(h('div', { class: 'lp-bar' }, searchBox(), filterChips(), viewToggle()));
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
      if (saved.view === 'list' || saved.view === 'cards') ui.lpView = saved.view;
    } else {
      ui.open = {};
      const next = phases.find(p => p.topics.some(t => t.core && st[t.id].level !== 'done'));
      if (next) ui.open[next.id] = true;
    }
  }

  let shown = 0;
  frag.insertBefore(phaseNav(phases, st), list);
  for (const phase of phases) {
    const coreTopics = phase.topics.filter(t => t.core);
    if (!coreTopics.length) continue;
    const rows = coreTopics.filter(matches);
    if (!rows.length) continue;
    shown += rows.length;
    const doneCount = coreTopics.filter(t => st[t.id].level === 'done').length;
    const pshare = doneCount / coreTopics.length;
    const status = doneCount === coreTopics.length ? ['Complete', 'done'] : coreTopics.some(t => st[t.id].level !== 'untested') ? ['In progress', 'prog'] : ['Not started', 'none'];
    const isOpen = ui.filter !== 'all' || !!ui.q || !!ui.open[phase.id];
    const head = h('button', { class: 'ph-head ph-tint-' + PH(phase.number), type: 'button', 'aria-expanded': String(isOpen), onclick: () => {
      if (ui.filter !== 'all' || ui.q) return;
      ui.open[phase.id] = !isOpen; saveView(); render();
    } },
      h('span', { class: 'ph-num ph-bg-' + PH(phase.number) }, String(phase.number)),
      h('span', { class: 'phase-title' },
        h('h3', null, phase.name),
        h('small', null, doneCount + ' of ' + coreTopics.length + ' Done'),
        h('span', { class: 'pbar ph-mini', role: 'img', 'aria-label': Math.round(pshare * 100) + '% of core topics Done' }, h('span', { style: 'width:' + Math.round(pshare * 100) + '%' })),
        isOpen ? null : h('span', { class: 'ph-strip', 'aria-hidden': 'true' }, coreTopics.map(t => h('i', { class: 'sd-' + st[t.id].level })))),
      h('span', { class: 'ph-status ps-' + status[1] }, status[0]),
      h('span', { class: 'ph-chev', 'aria-hidden': 'true' }, isOpen ? '\u2212' : '+'));
    list.appendChild(h('section', { class: 'phase-sec' + (isOpen ? ' open' : ''), id: 'phase-' + phase.id }, head, isOpen ? topicsView(rows, st, false) : null));
  }

  // topics that wait until the core is Strong or Done
  const later = phases
    .map(phase => ({ phase, rows: phase.topics.filter(t => !t.core && matches(t)) }))
    .filter(x => x.rows.length);
  if (later.length) {
    const count = later.reduce((n, x) => n + x.rows.length, 0);
    const isOpen = ui.filter !== 'all' || !!ui.open.later;
    const head = h('button', { class: 'ph-head ph-tint-0', type: 'button', 'aria-expanded': String(isOpen), onclick: () => { ui.open.later = !isOpen; saveView(); render(); } },
      h('span', { class: 'ph-num ph-bg-0' }, icon('clock', 20)),
      h('span', { class: 'phase-title' }, h('h3', null, 'Later'), h('small', null, count + ' topics \u00b7 ' + (unlocked ? 'unlocked' : 'locked'))),
      h('span', { class: 'ph-status ps-none' }, unlocked ? 'Unlocked' : 'Locked'),
      h('span', { class: 'ph-chev', 'aria-hidden': 'true' }, isOpen ? '\u2212' : '+'));
    const sec = h('section', { class: 'phase-sec' + (isOpen ? ' open' : ''), id: 'phase-later' }, head);
    if (isOpen) {
      if (!unlocked) sec.appendChild(h('p', { class: 'locknote' }, 'These unlock when every core topic is Strong or Done. Security, DevOps, microservices and the rest wait until the core is solid.'));
      for (const x of later) {
        sec.appendChild(h('p', { class: 'locknote', style: 'font-weight:600;color:var(--fg)' }, 'Phase ' + x.phase.number + ' \u00b7 ' + x.phase.name));
        sec.appendChild(topicsView(x.rows, st, !unlocked));
      }
    }
    list.appendChild(sec);
    shown += count;
  }

  if (!shown) frag.appendChild(h('p', { class: 'empty' }, 'No topics match this filter.'));
  return frag;
}
