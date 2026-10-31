// Per-topic lists: the test history, and the weak points that keep repeating.
import { h } from '../dom.js';
import { resultsFor, mistakeStats, levelFromPct, pct } from '../../core/index.js';
import { store } from '../../state/store.js';
import { badge } from './badge.js';
import { fmt, MODE_LABEL } from '../format.js';
import { setMsg, clearMsg } from '../messages.js';
import { startEdit, removeResult } from './result-flow.js';

/** Weak points that showed up in 2 or more tests of this topic. Null when the topic has no results. */
export function mistakesCard(id) {
  const list = resultsFor(store.data.results, id);
  if (!list.length) return null;
  const stats = mistakeStats(list);
  const repeated = stats.filter(m => m.count >= 2);
  const once = stats.filter(m => m.count < 2);
  const card = h('section', { class: 'card' }, h('h3', null, 'Mistakes'));
  if (!stats.length) { card.appendChild(h('p', { class: 'empty' }, 'No weak points recorded for this topic yet.')); return card; }
  if (repeated.length) {
    card.appendChild(h('p', { class: 'small muted' }, 'These weak points showed up in 2 or more tests.'));
    card.appendChild(h('ul', { class: 'history' }, repeated.map(m =>
      h('li', null, h('strong', null, m.text), h('span', { class: 'small muted' }, 'in ' + m.count + ' tests, last ' + fmt(m.last))))));
  } else {
    card.appendChild(h('p', { class: 'empty' }, 'No repeats yet. A weak point shows here when it appears in 2 or more tests.'));
  }
  if (once.length) card.appendChild(h('p', { class: 'small muted' }, 'Seen once: ' + once.map(m => m.text).join('; ')));
  card.appendChild(h('p', { class: 'small muted' }, 'Matching works on the wording the AI used. A reworded mistake counts as a new one.'));
  return card;
}

/** Every saved result of one topic, newest first, with Edit and Delete. */
export function historyCard(id) {
  const list = resultsFor(store.data.results, id).slice().reverse();
  const card = h('section', { class: 'card' }, h('h3', null, 'History'));
  if (!list.length) { card.appendChild(h('p', { class: 'empty' }, 'No results yet. Your first test will show here.')); return card; }
  card.appendChild(h('ul', { class: 'history' }, list.map(r =>
    h('li', null,
      h('div', { class: 'hist-top' },
        h('strong', null, fmt(r.date)),
        h('span', { class: 'score' }, r.score + '/' + r.total),
        badge(levelFromPct(pct(r))),
        h('span', { class: 'small muted' }, MODE_LABEL[r.mode] || r.mode),
        r.edited ? h('span', { class: 'edited' }, 'edited') : null),
      r.weakPoints.length ? h('p', { class: 'small' }, 'Weak: ' + r.weakPoints.join('; ')) : null,
      r.nextStep ? h('p', { class: 'small' }, 'Next: ' + r.nextStep) : null,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn small secondary', type: 'button', onclick: () => startEdit(r.id) }, 'Edit'),
        h('button', {
          class: 'btn small danger', type: 'button', onclick: () => setMsg({
            type: 'warn',
            lines: ['Delete the ' + fmt(r.date) + ' result (' + r.score + '/' + r.total + ')? This cannot be undone.'],
            actions: [{ label: 'Delete', kind: 'danger', fn: () => { removeResult(r.id); clearMsg(); } }, { label: 'Cancel', kind: 'secondary', fn: clearMsg }]
          })
        }, 'Delete'))))));
  return card;
}
