// Today page: streak, one task (a due revision first, then a new topic), the study cards, and what else is due.
import { h } from '../ui/dom.js';
import { buildQueue, streakInfo, shortTask, suggestMode, pickSurprise, projectReady, today } from '../core/index.js';
import { context } from '../state/context.js';
import { store } from '../state/store.js';
import { ui } from '../state/session.js';
import { states, projState } from '../state/selectors.js';
import { render } from '../ui/render.js';
import { fmt, LEVEL_LABEL } from '../ui/format.js';
import { badge } from '../ui/components/badge.js';
import { studyCards } from '../ui/components/study.js';
import { installCard } from '../ui/components/install-card.js';

const linkButton = 'display:inline-flex;align-items:center;text-decoration:none';

function streakCard(info) {
  let note;
  if (!store.data.results.length) note = 'Your streak starts with your first saved test.';
  else if (info.studiedToday) note = 'Studied today. Anything more is a bonus.';
  else if (info.missed > 0) note = info.missed + (info.missed === 1 ? ' day' : ' days') + ' missed. One short test today keeps you going.';
  else note = 'Not studied yet today.';
  return h('section', { class: 'summary', 'aria-label': 'Streak' },
    h('div', { class: 'summary-head' },
      h('h2', null, 'Streak: ' + info.streak + (info.streak === 1 ? ' day' : ' days')),
      h('span', { class: 'small muted' }, 'Studied this week: ' + info.weekDays + '/7 days')),
    h('p', { class: 'small muted' }, note));
}

/** Suggest starting a project once its skills are ready. */
function buildNudge(st) {
  const { phases, projects } = context.syllabus;
  const project = projects.find(p => projState(p.id).status === 'notstarted' && projectReady(p, phases, st).ready);
  if (!project) return null;
  return h('section', { class: 'card' },
    h('h3', null, 'Time to build: ' + project.name),
    h('p', { class: 'small' }, 'Your skills for this project are ready. A built project counts for more than another test.'),
    h('div', { class: 'btn-row' }, h('a', { class: 'btn small secondary', href: '#projects', style: linkButton }, 'Open Projects')));
}

/** Pick today's task: the pinned topic if there is one, otherwise the next in the queue. */
function pickTask(queue, st) {
  if (ui.todayId) {
    const pinned = queue.find(q => q.topic.id === ui.todayId);
    if (pinned) return pinned;
    const info = context.byId[ui.todayId];
    if (info) {   // just tested today: keep showing it, with its result
      return { topic: info.topic, phase: info.phase, state: st[ui.todayId], kind: st[ui.todayId].level === 'untested' ? 'new' : 'revision' };
    }
  }
  if (!queue.length) return null;
  const task = queue[ui.todayIdx % queue.length];
  ui.todayId = task.topic.id;
  ui.mode = suggestMode(task.topic, task.state);
  return task;
}

function taskCard(task, queue, dueList, st, t) {
  const { phases } = context.syllabus;
  const coreDone = phases.every(p => p.topics.every(x => !x.core || ['strong', 'done'].includes(st[x.id].level)));
  let intro = null;
  if (!store.data.results.length) intro = 'Welcome. Start with a Quick test (5 questions). It shows where you stand before you pick what to revise.';
  else if (ui.short) intro = 'Minimum day: one test is enough to keep your streak.';
  else if (task.kind === 'new' && !dueList.length) intro = coreDone ? 'Core is done. Next up: ' + task.topic.name + '.' : 'No revisions due. Here is a new topic.';

  const kind = task.kind === 'revision'
    ? 'Revision due' + (task.state.due && task.state.due < t ? ' since ' + fmt(task.state.due) : '')
    : 'New topic';

  const actions = [];
  if (!ui.short) {
    actions.push(h('button', {
      class: 'btn small secondary', type: 'button', id: 'short-btn', onclick: () => {
        const pick = shortTask(queue);
        if (!pick) return;
        ui.short = true; ui.todayId = pick.topic.id; ui.mode = 'quick'; ui.copied = false; ui.msg = null;
        render();
      }
    }, 'Short on time?'));
  }
  if (queue.length > 1) {
    actions.push(h('button', {
      class: 'btn small secondary', type: 'button', id: 'other-btn', onclick: () => {
        ui.todayIdx = (ui.todayIdx + 1) % queue.length; ui.todayId = null; ui.short = false; ui.copied = false; ui.msg = null;
        render();
      }
    }, 'Another topic'));
  }

  return h('section', { class: 'card task', 'aria-label': 'Today’s task' },
    intro ? h('p', { class: 'small muted' }, intro) : null,
    h('p', { class: 'kicker' }, kind),
    h('h2', null, task.topic.name),
    h('p', { class: 'small muted' }, 'Phase ' + task.phase.number + ' · ' + task.phase.name + (task.topic.tag !== 'UNSET' ? ' · ' + task.topic.tag : '')),
    h('div', { class: 'meta', style: 'justify-content:flex-start' },
      badge(task.state.level),
      task.state.last ? h('span', { class: 'score' }, 'Last ' + task.state.last.score + '/' + task.state.last.total + ' on ' + fmt(task.state.last.date)) : null,
      h('a', { href: '#t-' + task.topic.id, class: 'small', style: 'color:var(--accent)' }, 'Open topic page')),
    actions.length ? h('div', { class: 'btn-row' }, actions) : null);
}

function spotCheckCard(st, t) {
  const spot = pickSurprise(context.syllabus.phases, st, t);
  if (!spot) return null;
  return h('section', { class: 'card', 'aria-label': 'Spot check' },
    h('h3', null, 'Spot check (optional)'),
    h('p', { class: 'small' }, spot.topic.name + ' is ' + LEVEL_LABEL[spot.state.level][1] + ', last tested ' + fmt(spot.state.last.date) +
      '. A 5-minute Quick test checks that you have not started to forget it.'),
    h('div', { class: 'btn-row' }, h('a', {
      class: 'btn small secondary', href: '#t-' + spot.topic.id, style: linkButton,
      onclick: () => { ui.nextMode = 'quick'; }
    }, 'Test me')));
}

function dueListCard(others, total) {
  return h('section', { class: 'card' },
    h('h3', null, 'Revisions due (' + total + ')'),
    h('ul', { class: 'history' }, others.slice(0, 6).map(q =>
      h('li', null, h('a', { class: 'topic', href: '#t-' + q.topic.id, style: 'padding:0;min-height:44px' },
        h('span', { class: 'name' }, q.topic.name),
        h('span', { class: 'meta' }, h('span', { class: 'score' }, 'due ' + fmt(q.state.due)), badge(q.state.level)))))),
    others.length > 6 ? h('p', { class: 'small muted' }, 'And ' + (others.length - 6) + ' more in the Syllabus (Due filter).') : null);
}

export function todayPage() {
  const t = today();
  const st = states();
  const queue = buildQueue(context.syllabus.phases, st, t);
  const frag = document.createDocumentFragment();

  frag.appendChild(streakCard(streakInfo(store.data.results, t)));
  const install = installCard();
  if (install) frag.appendChild(install);
  const nudge = buildNudge(st);
  if (nudge) frag.appendChild(nudge);

  const task = pickTask(queue, st);
  if (!task) {
    frag.appendChild(h('section', { class: 'card' },
      h('h2', null, 'Nothing to study right now'),
      h('p', null, 'Every topic is either done for today or not due yet. Revisions appear here on their due date.'),
      h('p', { class: 'small muted' }, 'Want to look anyway? Open any topic from the Syllabus.')));
    return frag;
  }

  const dueList = queue.filter(q => q.kind === 'revision');
  frag.appendChild(taskCard(task, queue, dueList, st, t));
  frag.appendChild(studyCards(task.topic.id, true));

  if (!dueList.length) {
    const spot = spotCheckCard(st, t);
    if (spot) frag.appendChild(spot);
  }
  const others = dueList.filter(q => q.topic.id !== task.topic.id);
  if (others.length) frag.appendChild(dueListCard(others, dueList.length));
  return frag;
}
