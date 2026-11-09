// Topic page: status, the copy-and-paste study cards, repeated mistakes and the result history.
import { h } from '../ui/dom.js';
import { topicState, today } from '../core/index.js';
import { context } from '../state/context.js';
import { store } from '../state/store.js';
import { ui } from '../state/session.js';
import { fmt } from '../ui/format.js';
import { badge, preBadge, stars } from '../ui/components/badge.js';
import { prereqStatus } from '../core/index.js';
import { states } from '../state/selectors.js';
import { studyCards } from '../ui/components/study.js';
import { mistakesCard, historyCard } from '../ui/components/history.js';

/** "Before this topic": the note from the syllabus file and a ready check on each prerequisite. Nothing when the topic has neither. */
function beforeCard(topic) {
  const needs = prereqStatus(topic, context.byId, states());
  if (!needs.length && !topic.before) return document.createDocumentFragment();
  const ready = needs.filter(n => n.ready).length;
  return h('section', { class: 'card before-card', id: 'before-card', 'aria-label': 'Before this topic' },
    h('h3', null, 'Before this topic'),
    topic.before ? h('p', null, topic.before) : null,
    needs.length ? h('p', { class: 'small ' + (ready === needs.length ? 'muted' : ''), role: 'status' },
      ready === needs.length ? 'All ' + needs.length + ' prerequisites are Strong or Done. You are ready.'
        : ready + ' of ' + needs.length + ' prerequisites ready. Finish the ones marked below first.') : null,
    needs.length ? h('ul', { class: 'history' }, needs.map(n => h('li', null,
      h('a', { class: 'topic', href: '#t-' + n.topic.id, style: 'padding:0;min-height:44px' },
        h('span', { class: 'name' }, n.topic.name),
        h('span', { class: 'meta' }, n.last ? h('span', { class: 'score' }, n.last.score + '/' + n.last.total) : null, n.pre && !n.last ? preBadge(n.pre) : badge(n.level)))))) : null,
    h('p', { class: 'small muted' }, 'The same information goes into the copied prompt as background. It does not add any test questions.'));
}

export function topicPage(id) {
  const { topic, phase } = context.byId[id];
  const st = topicState(store.data.results, id, today());
  const frag = document.createDocumentFragment();

  frag.appendChild(h('a', { class: 'back', href: '#' + ui.from }, ui.from === 'today' ? '← Today' : '← Learning Path'));
  frag.appendChild(h('div', null,
    h('h2', null, topic.name),
    h('p', null, stars(topic.importance, true)),
    h('p', { class: 'muted small' }, 'Phase ' + phase.number + ' · ' + phase.name + (topic.tag !== 'UNSET' ? ' · ' + topic.tag : ''))));

  const status = st.last
    ? [
      h('span', { class: 'score' }, 'Last test ' + fmt(st.last.date) + ': ' + st.last.score + '/' + st.last.total),
      h('span', { class: 'small muted' }, 'Done progress: ' + st.doneProgress + ' of 2 passing tests'),
      h('span', { class: 'small muted' }, st.isDue ? 'Revision due now' : 'Next revision: ' + fmt(st.due))
    ]
    : [h('span', { class: 'small muted' }, 'No test yet.')];
  frag.appendChild(h('section', { class: 'card', 'aria-label': 'Status' },
    h('div', { class: 'meta', style: 'justify-content:flex-start' }, st.pre ? preBadge(st.pre) : badge(st.level), status)));

  frag.appendChild(beforeCard(topic));
  frag.appendChild(studyCards(id, false));
  const mistakes = mistakesCard(id);
  if (mistakes) frag.appendChild(mistakes);
  frag.appendChild(historyCard(id));
  return frag;
}
