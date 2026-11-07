// Analysis page: everything worked out from your saved tests, with a chooser (phase + Good / Needs work / Not started).
// Pre-tests are not scored here (see core/levels.js); they only count as activity.
import { h } from '../ui/dom.js';
import {
  allTopics, countLevels, weeklyTrend, modeMix, studyDays, recentAverage, phaseStats, topicRows, groupOf, pace, today, orderedPhases
} from '../core/index.js';
import { context } from '../state/context.js';
import { store } from '../state/store.js';
import { ui } from '../state/session.js';
import { states, me } from '../state/selectors.js';
import { badge } from '../ui/components/badge.js';
import { fmt, fmtLong } from '../ui/format.js';
import { render as redraw } from '../ui/render.js';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  kids.forEach(k => k != null && el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k));
  return el;
};
const pc = x => Math.round(x * 100) + '%';
const FILTERS = [['all', 'All'], ['good', 'Good'], ['work', 'Needs work'], ['new', 'Not started']];
const TREND = { up: ['▲', 'Improving'], down: ['▼', 'Dropping'], flat: ['–', 'Steady'], new: ['', 'One test'] };

/** Vertical bars for one value per week. `fmtVal` makes the label on top. Thin marks, one hue, a 0-line, a title tooltip on each bar. */
function weekBars(rows, key, max, fmtVal, unit) {
  const W = 560, H = 170, L = 8, B = 28, T = 20, n = rows.length, slot = (W - L * 2) / n, bw = Math.min(26, slot * 0.5);
  const kids = [svg('line', { x1: L, x2: W - L, y1: H - B, y2: H - B, class: 'ax' })];
  rows.forEach((r, i) => {
    const v = r[key], cx = L + slot * i + slot / 2;
    if (v != null) {
      const bh = max ? Math.max(3, (v / max) * (H - B - T)) : 0;
      kids.push(svg('rect', { x: cx - bw / 2, y: H - B - bh, width: bw, height: bh, rx: 4, class: 'mk' }, svg('title', null, r.label + ': ' + fmtVal(v) + unit)));
      kids.push(svg('text', { x: cx, y: H - B - bh - 5, 'text-anchor': 'middle', class: 'val' }, fmtVal(v)));
    }
    kids.push(svg('text', { x: cx, y: H - 8, 'text-anchor': 'middle', class: 'lab' }, i % 2 === (n - 1) % 2 || n <= 6 ? r.label : ''));
  });
  return svg('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart', role: 'img', 'aria-label': unit + ' per week, last ' + n + ' weeks' }, ...kids);
}

function chartCard(title, sub, chart, rows, cols) {
  return h('section', { class: 'card' }, h('h3', null, title), h('p', { class: 'small muted' }, sub), chart,
    h('details', { class: 'more' }, h('summary', null, 'Show as a table'),
      h('div', { class: 'inner' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, h('th', null, 'Week of'), cols.map(c => h('th', null, c[0])))),
        h('tbody', null, rows.map(r => h('tr', null, h('td', null, r.label), cols.map(c => h('td', null, c[1](r))))))))));
}

function chooser(phases) {
  const sel = h('select', { id: 'an-phase', 'aria-label': 'Phase' },
    h('option', { value: 'all' }, 'All phases'),
    orderedPhases(phases).map(p => h('option', { value: String(p.number) }, 'Phase ' + p.number + ' · ' + p.name)));
  sel.value = ui.anPhase;
  sel.addEventListener('change', () => { ui.anPhase = sel.value; redraw(); });
  return h('section', { class: 'card an-choose', 'aria-label': 'Choose what to look at' },
    h('label', { class: 'field', for: 'an-phase' }, 'Phase', sel),
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Show topics that are' },
      FILTERS.map(([k, label]) => h('button', { class: 'chip', type: 'button', 'data-f': k, 'aria-pressed': String(ui.anFilter === k),
        onclick: () => { ui.anFilter = k; redraw(); } }, label))));
}

function tiles(st, core, results) {
  const c = countLevels(core, st), good = c.done + c.strong;
  const recent = recentAverage(results, 10);
  const t = (num, label, sub) => h('div', { class: 'an-tile' }, h('strong', null, num), h('span', null, label), h('small', { class: 'muted' }, sub));
  return h('section', { class: 'an-tiles', 'aria-label': 'Headline numbers' },
    t(core.length ? pc(good / core.length) : '0%', 'Core Good', good + ' of ' + core.length + ' Strong or Done'),
    t(String(results.length), 'Tests saved', modeMix(results).pre + ' of them pre-tests'),
    t(String(studyDays(results)), 'Study days', 'days with at least one test'),
    t(recent == null ? '–' : pc(recent), 'Recent average', 'last 10 scored tests'));
}

function paceCard(p, deadline) {
  const line = {
    done: () => 'Every core topic is Strong or Done. You are ready on this measure.',
    passed: () => 'Your apply-by date (' + fmtLong(deadline) + ') has passed with ' + p.remaining + ' core topics not yet Strong. Move the date in Profile or push harder.',
    nopace: () => 'No core topic reached Strong in the last 4 weeks. At this pace you will not finish. You need ' + (p.needPerWeek || 0).toFixed(1) + ' topics a week.',
    ontrack: () => 'At your last 4 weeks pace (' + p.perWeek.toFixed(1) + ' a week) you finish around ' + fmtLong(p.projected) + ', before ' + fmtLong(deadline) + '.',
    behind: () => 'At your last 4 weeks pace (' + p.perWeek.toFixed(1) + ' a week) you finish around ' + fmtLong(p.projected) + ', AFTER ' + fmtLong(deadline) + '. You need ' + (p.needPerWeek || 0).toFixed(1) + ' topics a week.'
  }[p.verdict]();
  const bad = p.verdict === 'behind' || p.verdict === 'nopace' || p.verdict === 'passed';
  return h('section', { class: 'card', id: 'pace-card' }, h('h3', null, 'Pace to your date'),
    h('p', null, h('span', { class: 'lvl ' + (bad ? 'lvl-weak' : 'lvl-strong') }, h('i', { 'aria-hidden': 'true' }, bad ? '!' : '✓'), bad ? 'Behind' : 'On track')),
    h('p', null, line),
    h('p', { class: 'small muted' }, p.good + ' of ' + p.total + ' core topics Strong · ' + p.daysLeft + ' days left · counts the first Strong score per topic in the last 28 days.'));
}

function phaseCard(stats) {
  return h('section', { class: 'card' }, h('h3', null, 'Phase by phase'),
    h('p', { class: 'small muted' }, 'Share of core topics Strong or Done. Average is the latest score of topics you have tested.'),
    h('ul', { class: 'an-phases' }, stats.map(s => h('li', { class: ui.anPhase === String(s.phase.number) ? 'sel' : null },
      h('div', { class: 'small phasebar-top' }, h('span', null, 'Phase ' + s.phase.number + ' · ' + s.phase.name),
        h('span', { class: 'muted' }, s.good + '/' + s.core + (s.avg == null ? '' : ' · avg ' + pc(s.avg)))),
      h('div', { class: 'pbar', role: 'img', 'aria-label': s.phase.name + ': ' + pc(s.share) + ' of core Strong or Done' }, h('span', { style: 'width:' + Math.round(s.share * 100) + '%' }))))));
}

function mixCard(mix) {
  const total = mix.pre + mix.quick + mix.full;
  const row = (label, n, cls) => h('li', null, h('span', { class: 'swatch ' + cls, 'aria-hidden': 'true' }), h('span', null, label), h('strong', null, String(n)),
    h('span', { class: 'muted small' }, total ? pc(n / total) : '0%'));
  const w = n => (total ? n / total * 100 : 0).toFixed(2) + '%';
  return h('section', { class: 'card' }, h('h3', null, 'What kind of tests'),
    h('div', { class: 'bar', role: 'img', 'aria-label': mix.full + ' full, ' + mix.quick + ' quick, ' + mix.pre + ' pre-tests' },
      h('span', { class: 'mx-full', style: 'width:' + w(mix.full) }), h('span', { class: 'mx-quick', style: 'width:' + w(mix.quick) }), h('span', { class: 'mx-pre', style: 'width:' + w(mix.pre) })),
    h('ul', { class: 'an-legend' }, row('Full tests', mix.full, 'mx-full'), row('Quick tests', mix.quick, 'mx-quick'), row('Pre-tests', mix.pre, 'mx-pre')),
    h('p', { class: 'small muted' }, 'Done needs a Full test. If Full is low, topics cannot reach Done.'));
}

function listCard(rows) {
  const phase = ui.anPhase, f = ui.anFilter;
  const list = rows.filter(r => (phase === 'all' || String(r.phase.number) === phase) && (f === 'all' || groupOf(r.state.level) === f));
  const counts = { good: 0, work: 0, new: 0 };
  rows.filter(r => phase === 'all' || String(r.phase.number) === phase).forEach(r => counts[groupOf(r.state.level)]++);
  const order = { work: 0, new: 1, good: 2 };
  list.sort((a, b) => order[groupOf(a.state.level)] - order[groupOf(b.state.level)]);
  const shown = list.slice(0, 40);
  const card = h('section', { class: 'card', id: 'an-list' }, h('h3', null, list.length + ' topics'),
    h('p', { class: 'small muted' }, counts.good + ' good · ' + counts.work + ' need work · ' + counts.new + ' not started (in this phase choice).'));
  if (!list.length) { card.appendChild(h('p', { class: 'empty' }, 'No topics match this choice.')); return card; }
  card.appendChild(h('ul', { class: 'history' }, shown.map(r => h('li', null,
    h('a', { class: 'topic', href: '#t-' + r.topic.id, style: 'padding:0;min-height:44px' },
      h('span', { class: 'name' }, r.topic.name, h('span', { class: 'tag', style: 'display:block' }, 'Phase ' + r.phase.number + (r.daysSince == null ? '' : ' · last test ' + (r.daysSince === 0 ? 'today' : r.daysSince + ' d ago')))),
      h('span', { class: 'meta' },
        r.state.last ? h('span', { class: 'score' }, r.state.last.score + '/' + r.state.last.total) : null,
        r.trend !== 'new' ? h('span', { class: 'small trend-' + r.trend, title: TREND[r.trend][1] }, TREND[r.trend][0] + ' ' + TREND[r.trend][1]) : null,
        badge(r.state.level)))))));
  if (list.length > shown.length) card.appendChild(h('p', { class: 'small muted' }, 'Showing 40 of ' + list.length + '. Pick a phase to narrow it.'));
  return card;
}

function insights(st, stats, rows, trend, p, results) {
  const out = [];
  if (!results.length) return ['No tests yet. Take a pre-test on a topic you already know to get your first numbers.'];
  const tested = stats.filter(s => s.avg != null);
  if (tested.length) {
    const best = tested.slice().sort((a, b) => b.share - a.share)[0], worst = tested.slice().sort((a, b) => a.share - b.share)[0];
    out.push('Strongest phase: ' + best.phase.name + ' (' + best.good + '/' + best.core + ' core Good).');
    if (worst !== best) out.push('Weakest phase: ' + worst.phase.name + ' (' + worst.good + '/' + worst.core + ' core Good). Work here next.');
  }
  const down = rows.filter(r => r.trend === 'down');
  if (down.length) out.push(down.length + ' topic' + (down.length > 1 ? 's' : '') + ' dropped on the latest test: ' + down.slice(0, 3).map(r => r.topic.name).join(', ') + '.');
  const idle = rows.filter(r => r.daysSince != null && r.daysSince > 14 && groupOf(r.state.level) === 'work');
  if (idle.length) out.push(idle.length + ' topic' + (idle.length > 1 ? 's' : '') + ' still need work and were not tested for over 14 days. Stale weak topics get forgotten.');
  const real = trend.filter(w => w.avg != null);
  if (real.length >= 2) {
    const d = real[real.length - 1].avg - real[0].avg;
    out.push('Average score moved from ' + pc(real[0].avg) + ' to ' + pc(real[real.length - 1].avg) + ' over these weeks' + (d >= 0.05 ? ': going up.' : d <= -0.05 ? ': going down. Check if you are rushing.' : ': flat.'));
  }
  const quiet = trend.slice(-2).every(w => w.tests === 0);
  if (quiet) out.push('No tests in the last 2 weeks. Fix that before anything else.');
  if (p.verdict === 'behind' || p.verdict === 'nopace') out.push('You are behind your date. Be honest: shorten the date goal or add study time in Profile.');
  const mix = modeMix(results);
  if (mix.full === 0 && results.length >= 5) out.push('You have taken no Full tests, so no topic can be Done.');
  return out;
}

export function analysisPage() {
  const { phases } = context.syllabus;
  const st = states(), results = store.data.results, t = today(), deadline = me().deadline;
  if (!ui.anPhase) ui.anPhase = 'all';
  if (!ui.anFilter) ui.anFilter = 'all';
  const core = allTopics(phases, true);
  const trend = weeklyTrend(results, t, 8);
  const stats = phaseStats(phases, st);
  const rows = topicRows(phases, st, results, t);
  const p = pace(phases, st, results, t, deadline);
  const maxT = Math.max(1, ...trend.map(w => w.tests));

  const frag = document.createDocumentFragment();
  frag.appendChild(h('h2', null, 'Analysis'));
  frag.appendChild(h('p', { class: 'muted' }, 'Choose a phase and see what is good, what needs work and what you have not started.'));
  frag.appendChild(chooser(phases));
  frag.appendChild(tiles(st, core, results));
  frag.appendChild(h('section', { class: 'card', id: 'an-insights' }, h('h3', null, 'What this says'),
    h('ul', { class: 'an-ins' }, insights(st, stats, rows, trend, p, results).map(x => h('li', null, x)))));
  frag.appendChild(paceCard(p, deadline));
  frag.appendChild(phaseCard(stats));
  frag.appendChild(listCard(rows));
  frag.appendChild(chartCard('Tests per week', 'Every saved test counts, pre-tests too. Last 8 weeks, Monday start.',
    weekBars(trend, 'tests', maxT, v => String(v), ' tests'), trend, [['Tests', r => r.tests]]));
  frag.appendChild(chartCard('Average score per week', 'Scored tests only (pre-tests left out). A week with none has no bar.',
    weekBars(trend.map(w => ({ ...w, a: w.avg })), 'a', 1, v => pc(v), ''), trend, [['Average', r => r.avg == null ? '–' : pc(r.avg)], ['Scored tests', r => r.real]]));
  frag.appendChild(mixCard(modeMix(results)));
  frag.appendChild(h('p', { class: 'small muted' }, 'Pass line ' + pc(0.6) + ', Strong line ' + pc(0.8) + '. Need the full picture? ', h('a', { href: '#progress' }, 'Progress page')));
  return frag;
}
