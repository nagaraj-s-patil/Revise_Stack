// Dashboard cards: study plan, progress chart, next goal, subjects donut, upcoming revisions and the Level Up banner.
// Everything here is worked out from saved results. Nothing is invented.
import { h } from '../dom.js';
import { render } from '../render.js';
import { icon } from './icons.js';
import { svg, donut } from './charts.js';
import { fmt, fmtLong } from '../format.js';
import { progressSeries, dueLabel, upcoming, nextGoal, phaseStats, shortDate, today } from '../../core/index.js';
import { context } from '../../state/context.js';
import { store } from '../../state/store.js';
import { ui } from '../../state/session.js';

const pc = x => Math.round(x * 100) + '%';
const head = (title, right) => h('div', { class: 'sec-head' }, h('h3', null, title), right || null);
const goBtn = (href, text, cls) => h('a', { class: 'btn small ' + (cls || 'secondary'), href }, text);

/** Timeline: what you studied today, what is next, then the rest of the queue. */
export function studyPlanCard(task, queue) {
  const t = today();
  const doneIds = [];
  store.data.results.forEach(r => { if (r.date === t && !doneIds.includes(r.topicId)) doneIds.push(r.topicId); });
  const rows = [];
  doneIds.slice(-2).forEach(id => {
    const info = context.byId[id];
    if (info) rows.push({ kind: 'done', topic: info.topic, phase: info.phase });
  });
  if (task) rows.push({ kind: 'now', topic: task.topic, phase: task.phase, note: task.kind === 'revision' ? 'Revision due' : 'New topic' });
  queue.filter(q => !task || q.topic.id !== task.topic.id).slice(0, 3).forEach(q =>
    rows.push({ kind: 'next', topic: q.topic, phase: q.phase, note: q.kind === 'revision' ? 'Revision due' : 'New topic' }));
  const ic = { done: ['check', 'Done today'], now: ['play', 'Start now'], next: ['clock', 'Up next'] };
  return h('section', { class: 'card w-plan', 'aria-label': 'Your study plan' },
    head('Your Study Plan', goBtn('#syllabus', 'View all')),
    rows.length ? h('ol', { class: 'timeline' }, rows.map(r => h('li', { class: 'tl-' + r.kind },
      h('span', { class: 'tl-dot', title: ic[r.kind][1] }, icon(ic[r.kind][0], 20), h('span', { class: 'sr' }, ic[r.kind][1])),
      h('div', { class: 'tl-body' },
        h('strong', null, r.topic.name),
        h('span', { class: 'small muted' }, 'Phase ' + r.phase.number + (r.note ? ' · ' + r.note : ''))),
      r.kind === 'done'
        ? h('span', { class: 'tl-tag' }, 'Done')
        : h('a', { class: 'btn small ' + (r.kind === 'now' ? '' : 'secondary'), href: '#t-' + r.topic.id }, r.kind === 'now' ? 'Start' : 'Open'))))
      : h('p', { class: 'empty' }, 'Nothing queued. Revisions appear here on their due date.'));
}

const RANGES = [[7, '7D'], [30, '30D'], [90, '90D']];

function lineChart(points, days) {
  const W = 320, H = 160, L = 34, R = 10, T = 10, B = 24;
  const x0 = shortDate(points[0].date), x1 = shortDate(points[points.length - 1].date);
  const kids = [];
  [0, 50, 100].forEach(v => {
    const y = T + (H - T - B) * (1 - v / 100);
    kids.push(svg('line', { x1: L, x2: W - R, y1: y, y2: y, class: 'lc-grid' }), svg('text', { x: L - 6, y: y + 4, 'text-anchor': 'end', class: 'lc-axis' }, v + '%'));
  });
  const first = new Date(points[0].date).getTime(), last = new Date(points[points.length - 1].date).getTime();
  const span = Math.max(last - first, 1);
  const xy = p => [L + (points.length === 1 ? (W - L - R) / 2 : (new Date(p.date).getTime() - first) / span * (W - L - R)), T + (H - T - B) * (1 - p.avg)];
  const pts = points.map(xy);
  if (points.length > 1) {
    const line = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    kids.push(svg('path', { d: line + ' L' + pts[pts.length - 1][0] + ' ' + (H - B) + ' L' + pts[0][0] + ' ' + (H - B) + ' Z', class: 'lc-area' }), svg('path', { d: line, class: 'lc-line', fill: 'none' }));
  }
  kids.push(svg('text', { x: L, y: H - 6, class: 'lc-axis' }, x0), svg('text', { x: W - R, y: H - 6, 'text-anchor': 'end', class: 'lc-axis' }, x1));
  return { pts, kids, W, H };
}

export function progressCard() {
  const days = ui.pgRange || 30;
  const points = progressSeries(store.data.results, today(), days);
  const readout = h('p', { class: 'lc-read small', 'aria-live': 'polite' });
  const say = p => { readout.textContent = pc(p.avg) + ' average on ' + fmt(p.date) + ' (' + p.n + (p.n === 1 ? ' test' : ' tests') + ')'; };
  let body;
  if (!points.length) {
    body = h('p', { class: 'empty' }, 'No Full or Learn-check tests in the last ' + days + ' days. Save a Full test to start your trend line.');
  } else {
    const { pts, kids, W, H } = lineChart(points, days);
    const dots = points.map((p, i) => {
      const c = svg('circle', { cx: pts[i][0], cy: pts[i][1], r: 5, class: 'lc-dot', tabindex: '0', role: 'img', 'aria-label': pc(p.avg) + ' on ' + fmt(p.date) }, svg('title', null, fmt(p.date) + ': ' + pc(p.avg)));
      c.addEventListener('pointerenter', () => say(p)); c.addEventListener('focus', () => say(p));
      return c;
    });
    say(points[points.length - 1]);
    body = h('div', { class: 'lc-wrap' }, svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'linechart', role: 'group', 'aria-label': 'Average score per study day, last ' + days + ' days' }, ...kids, ...dots), readout);
  }
  return h('section', { class: 'card w-progress', 'aria-label': 'Your progress' },
    head('Your Progress', h('div', { class: 'pills', role: 'group', 'aria-label': 'Time range' }, RANGES.map(([n, label]) =>
      h('button', { class: 'pill', type: 'button', 'aria-pressed': String(days === n), onclick: () => { ui.pgRange = n; render(); } }, label)))),
    h('p', { class: 'small muted' }, 'Average score of your Full tests, per study day'),
    body);
}

export function nextGoalCard(st) {
  const g = nextGoal(context.syllabus.phases, st);
  if (!g) {
    return h('section', { class: 'card w-goal', 'aria-label': 'Next goal' }, head('Next Goal'),
      h('div', { class: 'goal-row' }, h('span', { class: 'chipicon chip-green' }, icon('target', 22)),
        h('div', null, h('strong', null, 'Every phase is above 70%'), h('p', { class: 'small muted' }, 'Next target: move core topics from Strong to Done.'))),
      goBtn('#syllabus', 'Open Learning Path'));
  }
  const bar = h('div', { class: 'pbar', role: 'img', 'aria-label': pc(g.share) + ' of the way to ' + pc(g.target) }, h('span', { style: 'width:' + Math.min(100, Math.round(g.share / g.target * 100)) + '%' }));
  return h('section', { class: 'card w-goal', 'aria-label': 'Next goal' }, head('Next Goal'),
    h('div', { class: 'goal-row' }, h('span', { class: 'chipicon chip-orange' }, icon('target', 22)),
      h('div', null, h('strong', null, 'Get ' + pc(g.target) + ' Strong in ' + g.phase.name), h('p', { class: 'small muted' }, 'Core topics of Phase ' + g.phase.number))),
    h('div', { class: 'goal-bar' }, bar, h('strong', null, pc(g.share))),
    h('p', { class: 'goal-need small' }, h('b', null, g.need + (g.need === 1 ? ' more topic' : ' more topics')), ' to reach Strong or Done (' + g.good + ' of ' + g.core + ' now).'),
    h('a', { class: 'btn small', href: '#syllabus', onclick: () => { ui.open = ui.open || {}; ui.open[g.phase.id] = true; ui.filter = 'all'; } }, 'Open this phase', icon('arrow', 16)));
}

export function subjectsCard(st) {
  const stats = phaseStats(context.syllabus.phases, st).slice(0, 6);
  const total = stats.reduce((a, s) => a + s.core, 0), good = stats.reduce((a, s) => a + s.good, 0);
  const parts = stats.map((s, i) => ({ label: s.phase.name, n: s.good, cls: 'ph-' + (i + 1), s }));
  return h('section', { class: 'card w-subjects', 'aria-label': 'Subjects overview' }, head('Subjects Overview', goBtn('#analysis', 'Analysis')),
    h('div', { class: 'an-donut-row' },
      donut(parts, total ? pc(good / total) : '0%', 'Strong or Done', 'Core topics Strong or Done by phase: ' + parts.map(x => x.label + ' ' + x.n).join(', ')),
      h('ul', { class: 'an-legend sub-legend' }, parts.map(x => h('li', null,
        h('span', { class: 'swatch ' + x.cls, 'aria-hidden': 'true' }), h('span', null, x.label), h('strong', null, pc(x.s.share)))))));
}

export function upcomingCard(st) {
  const t = today();
  const rows = upcoming(context.syllabus.phases, st, 5);
  return h('section', { class: 'card w-upcoming', 'aria-label': 'Upcoming revisions' }, head('Upcoming Revisions', goBtn('#syllabus', 'View all')),
    rows.length ? h('ul', { class: 'up-list' }, rows.map(r => {
      const label = dueLabel(r.state.due, t);
      return h('li', null, h('a', { href: '#t-' + r.topic.id },
        h('span', { class: 'chipicon chip-' + (label === 'Overdue' ? 'red' : label === 'Today' ? 'orange' : 'purple') }, icon(label === 'Overdue' ? 'flame' : 'calendar', 20)),
        h('span', { class: 'up-name' }, h('strong', null, r.topic.name), h('span', { class: 'small muted' }, 'Phase ' + r.phase.number + ' · due ' + fmtLong(r.state.due))),
        h('span', { class: 'due-chip due-' + label.toLowerCase().replace(/[^a-z]/g, '') }, label)));
    })) : h('p', { class: 'empty' }, 'Nothing scheduled yet. Revisions are planned after your first Full test.'));
}

export function levelUpBanner(st, hasTask) {
  const g = nextGoal(context.syllabus.phases, st);
  const text = g ? g.need + (g.need === 1 ? ' more Strong topic' : ' more Strong topics') + ' in ' + g.phase.name + ' and you reach ' + pc(g.target) + '.'
    : 'Every phase is above 70%. Push the core topics to Done.';
  const go = () => {
    const el = document.getElementById('today-task');
    if (el) { el.scrollIntoView({ block: 'start' }); el.focus({ preventScroll: true }); } else location.hash = '#syllabus';
  };
  return h('section', { class: 'levelup', 'aria-label': 'Level up' },
    h('span', { class: 'lu-icon' }, icon('medal', 34)),
    h('div', { class: 'lu-text' }, h('h3', null, 'Level Up!'), h('p', null, text)),
    h('button', { class: 'btn', type: 'button', onclick: go }, hasTask ? 'Start Now' : 'Open Path'));
}
