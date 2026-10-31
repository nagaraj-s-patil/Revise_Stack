// Topic page: status, the copy-and-paste study cards, repeated mistakes and the result history.
import { h } from '../ui/dom.js';
import { topicState, today } from '../core/index.js';
import { context } from '../state/context.js';
import { store } from '../state/store.js';
import { ui } from '../state/session.js';
import { fmt } from '../ui/format.js';
import { badge } from '../ui/components/badge.js';
import { studyCards } from '../ui/components/study.js';
import { mistakesCard, historyCard } from '../ui/components/history.js';

export function topicPage(id) {
  const { topic, phase } = context.byId[id];
  const st = topicState(store.data.results, id, today());
  const frag = document.createDocumentFragment();

  frag.appendChild(h('a', { class: 'back', href: '#' + ui.from }, ui.from === 'today' ? '← Today' : '← Syllabus'));
  frag.appendChild(h('div', null,
    h('h2', null, topic.name),
    h('p', { class: 'muted small' }, 'Phase ' + phase.number + ' · ' + phase.name + (topic.tag !== 'UNSET' ? ' · ' + topic.tag : ''))));

  const status = st.last
    ? [
      h('span', { class: 'score' }, 'Last test ' + fmt(st.last.date) + ': ' + st.last.score + '/' + st.last.total),
      h('span', { class: 'small muted' }, 'Done progress: ' + st.doneProgress + ' of 2 passing tests'),
      h('span', { class: 'small muted' }, st.isDue ? 'Revision due now' : 'Next revision: ' + fmt(st.due))
    ]
    : [h('span', { class: 'small muted' }, 'No test yet.')];
  frag.appendChild(h('section', { class: 'card', 'aria-label': 'Status' },
    h('div', { class: 'meta', style: 'justify-content:flex-start' }, badge(st.level), status)));

  frag.appendChild(studyCards(id, false));
  const mistakes = mistakesCard(id);
  if (mistakes) frag.appendChild(mistakes);
  frag.appendChild(historyCard(id));
  return frag;
}
