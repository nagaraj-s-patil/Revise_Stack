// Top bar on wide screens: topic search, streak and your avatar. On phones the header and bottom tabs do this job.
import { h } from '../dom.js';
import { icon } from './icons.js';
import { render } from '../render.js';
import { ui } from '../../state/session.js';
import { store } from '../../state/store.js';
import { me } from '../../state/selectors.js';
import { streakInfo, today } from '../../core/index.js';

const initials = name => name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

export function topBar() {
  const info = streakInfo(store.data.results, today());
  const input = h('input', { type: 'search', id: 'topic-search', placeholder: 'Search topics, e.g. Java, SQL, Spring…', 'aria-label': 'Search topics', autocomplete: 'off' });
  const form = h('form', { class: 'tb-search', role: 'search', onsubmit: e => {
    e.preventDefault();
    ui.q = input.value.trim(); ui.filter = 'all';
    if (location.hash === '#syllabus') render(); else location.hash = '#syllabus';
  } }, icon('search', 20), input);
  return h('div', { class: 'topbar' }, form,
    h('a', { class: 'tb-streak', href: '#progress', 'aria-label': 'Streak: ' + info.streak + ' days. Open progress' }, icon('flame', 20), h('strong', null, String(info.streak))),
    h('a', { class: 'avatar tb-avatar', href: '#profile', 'aria-label': 'Open your profile' }, initials(me().name)));
}
