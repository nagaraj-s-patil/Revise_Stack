// Revisions page: when each topic is due next, and the history of every test you saved.
// Pre-tests and fix practice are left out (they never count towards revision).
import { h } from '../ui/dom.js';
import { levelFromPct, pct, dueLabel, today, orderedPhases } from '../core/index.js';
import { context } from '../state/context.js';
import { store } from '../state/store.js';
import { ui } from '../state/session.js';
import { states } from '../state/selectors.js';
import { fmtLong } from '../ui/format.js';
import { render } from '../ui/render.js';
import { badge } from '../ui/components/badge.js';
import { icon } from '../ui/components/icons.js';

const real = r => r.mode !== 'pre';
const weekday = s => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' });

function dueChip(label) { return h('span', { class: 'due-chip due-' + label.toLowerCase().replace(/[^a-z]/g, '') }, label); }

function nextTab(st) {
  const t = today();
  const rows = [];
  orderedPhases(context.syllabus.phases).forEach(p => p.topics.forEach(topic => {
    const s = st[topic.id];
    if (s && s.due) rows.push({ topic, phase: p, s });
  }));
  rows.sort((a, b) => (a.s.due < b.s.due ? -1 : a.s.due > b.s.due ? 1 : 0));
  if (!rows.length) return h('p', { class: 'empty' }, 'No revisions planned yet. After your first Full test on a topic, its next revision date shows here.');
  const groups = [['Overdue', r => r.s.due < t], ['Today', r => r.s.due === t], ['Coming up', r => r.s.due > t]];
  return h('div', { class: 'rev-stack' }, groups.map(([title, test]) => {
    const list = rows.filter(test);
    if (!list.length) return null;
    return h('section', { class: 'card' }, h('h3', null, title + ' (' + list.length + ')'),
      h('ul', { class: 'up-list' }, list.map(r => h('li', null, h('a', { href: '#t-' + r.topic.id },
        h('span', { class: 'up-name' },
          h('strong', null, r.topic.name),
          h('span', { class: 'small muted' }, 'Phase ' + r.phase.number + ' · last tested ' + fmtLong(r.s.last.date) + ' · ' + r.s.last.score + '/' + r.s.last.total),
          h('span', { class: 'small' }, 'Next revision: ', h('strong', null, weekday(r.s.due) + ', ' + fmtLong(r.s.due)))),
        badge(r.s.level), dueChip(dueLabel(r.s.due, t)))))));
  }));
}

function historyTab(st) {
  const all = store.data.results.filter(real).slice().sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : 0));
  if (!all.length) return h('p', { class: 'empty' }, 'No tests saved yet. Every Full test you save shows here, newest first.');
  const days = [];
  all.forEach(r => {
    let d = days[days.length - 1];
    if (!d || d.date !== r.date) { d = { date: r.date, list: [] }; days.push(d); }
    d.list.push(r);
  });
  const newest = {};   // the latest result per topic, to show its next revision date
  store.data.results.filter(real).forEach(r => { if (!newest[r.topicId] || r.date >= newest[r.topicId].date) newest[r.topicId] = r; });
  return h('div', { class: 'rev-stack' }, days.map(d => h('section', { class: 'card' },
    h('h3', null, weekday(d.date) + ', ' + fmtLong(d.date)),
    h('ul', { class: 'up-list' }, d.list.map(r => {
      const info = context.byId[r.topicId], s = st[r.topicId];
      const isNewest = newest[r.topicId] === r && s && s.due;
      return h('li', null, h('a', { href: '#t-' + r.topicId },
        h('span', { class: 'up-name' },
          h('strong', null, info ? info.topic.name : r.topicId),
          h('span', { class: 'small muted' }, r.score + '/' + r.total + ' · ' + Math.round(pct(r) * 100) + '%'),
          isNewest ? h('span', { class: 'small' }, 'Next revision: ', h('strong', null, fmtLong(s.due))) : null),
        badge(levelFromPct(pct(r)))));
    })))));
}

export function revisionsPage() {
  const frag = document.createDocumentFragment();
  const tab = ui.revTab || 'next';
  const st = states();
  frag.appendChild(h('h2', null, 'Revisions'));
  frag.appendChild(h('p', { class: 'small muted' }, 'A topic is revised 1, 3, 7 and 14 days after it first passes. A score under 60% brings it back the next day.'));
  frag.appendChild(h('div', { class: 'pills', role: 'group', 'aria-label': 'Revisions view' },
    [['next', 'Next dates'], ['history', 'History']].map(([k, label]) =>
      h('button', { class: 'pill', type: 'button', 'aria-pressed': String(tab === k), onclick: () => { ui.revTab = k; render(); } }, label))));
  frag.appendChild(tab === 'next' ? nextTab(st) : historyTab(st));
  return frag;
}
