// The Today dashboard pieces: greeting, hero banner, four number tiles, learning path and project cards.
import { h } from '../dom.js';
import { icon } from './icons.js';
import { heroArt } from './hero-art.js';
import { fmtLong, STATUS_LABEL } from '../format.js';
import { allTopics, countLevels, projectReady, parseDate, today, DEADLINE, PRIORITY, USER_NAME } from '../../core/index.js';
import { context } from '../../state/context.js';
import { store } from '../../state/store.js';
import { projState } from '../../state/selectors.js';

const pct = share => Math.round(share * 100);

function bar(share, label) {
  return h('div', { class: 'pbar', role: 'img', 'aria-label': label },
    h('span', { style: 'width:' + pct(share) + '%' }));
}

export function greeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return h('div', { class: 'greet' },
    h('h2', null, 'Good ' + part + ', ' + USER_NAME.split(' ')[0] + ' 👋'),
    h('p', { class: 'muted' }, 'Small steps today. Big dreams tomorrow.'));
}

export function daysLeft() {
  return Math.round((parseDate(DEADLINE) - parseDate(today())) / 86400000);
}

/** Blue banner. The button jumps to today's task card, when there is one. */
export function hero(hasTask) {
  const days = daysLeft();
  const goal = days >= 0 ? 'Ready to apply by ' + fmtLong(DEADLINE) + ' · ' + days + ' days left' : 'Target date ' + fmtLong(DEADLINE) + ' has passed';
  const go = () => {
    const el = document.getElementById('today-task');
    if (el) { el.scrollIntoView({ block: 'start' }); el.focus({ preventScroll: true }); }
  };
  return h('section', { class: 'hero', 'aria-label': 'Your goal' },
    h('div', { class: 'hero-text' },
      h('h2', null, 'Your next role ', h('span', null, 'starts here.')),
      h('p', null, goal),
      hasTask ? h('button', { class: 'btn light', type: 'button', id: 'hero-go', onclick: go }, 'Continue Learning', icon('arrow', 18)) : null),
    heroArt());
}

function streakNote(info) {
  if (!store.data.results.length) return 'Starts with your first saved test';
  if (info.studiedToday) return 'Studied today';
  if (info.missed > 0) return info.missed + (info.missed === 1 ? ' day' : ' days') + ' missed';
  return 'Not studied yet today';
}

function tile(chip, ic, label, value, sub) {
  return h('div', { class: 'tile' },
    h('span', { class: 'chipicon chip-' + chip }, icon(ic, 22)),
    h('div', null, h('p', { class: 'small muted' }, label), h('p', { class: 'tile-num' }, value), h('p', { class: 'small muted' }, sub)));
}

export function statTiles(st, info) {
  const core = allTopics(context.syllabus.phases, true);
  const done = countLevels(core, st).done;
  const days = daysLeft();
  return h('section', { class: 'tiles', 'aria-label': 'Your numbers' },
    tile('orange', 'flame', 'Streak', info.streak + (info.streak === 1 ? ' day' : ' days'), streakNote(info)),
    tile('green', 'check', 'Topics Completed', done + '/' + core.length, 'Core topics Done'),
    tile('purple', 'calendar', 'Studied This Week', info.weekDays + '/7 days', 'Days with a saved test'),
    tile('red', 'target', 'Job Target', fmtLong(DEADLINE), days >= 0 ? days + ' days left' : 'Date passed'));
}

function sectionHead(title, href, linkText) {
  return h('div', { class: 'sec-head' }, h('h3', null, title), h('a', { href }, linkText));
}

/** Core progress for the first six phases in study order. */
export function pathCard(st) {
  const rows = [];
  for (const number of PRIORITY) {
    const phase = context.syllabus.phases.find(p => p.number === number);
    const core = phase ? phase.topics.filter(x => x.core) : [];
    if (!core.length) continue;
    const c = countLevels(core, st);
    const share = (c.done + c.strong) / core.length;
    rows.push(h('li', null,
      h('div', { class: 'path-top' }, h('span', null, 'Phase ' + phase.number + ' · ' + phase.name), h('strong', null, pct(share) + '%')),
      bar(share, phase.name + ': ' + pct(share) + '% of core Strong or Done')));
  }
  return h('section', { class: 'card', 'aria-label': 'Your learning path' },
    sectionHead('Your Learning Path', '#syllabus', 'View all'),
    h('ul', { class: 'path-list' }, rows.slice(0, 6)));
}

export function projectCards(st) {
  const { phases, projects } = context.syllabus;
  return h('section', { 'aria-label': 'Your projects' },
    sectionHead('Your Projects', '#projects', 'View all'),
    h('div', { class: 'proj-row' }, projects.map(p => {
      const ready = projectReady(p, phases, st);
      const status = projState(p.id).status;
      return h('a', { class: 'proj', href: '#projects' },
        h('strong', null, p.name),
        h('span', { class: 'small muted' }, p.stack),
        h('span', { class: 'small' }, STATUS_LABEL[status] + ' · skills ' + pct(ready.share) + '%'),
        bar(ready.share, p.name + ': skills ' + pct(ready.share) + '% ready'));
    })));
}
