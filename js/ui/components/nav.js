// Navigation: a sidebar on wide screens and a bottom bar on phones. Both list the same pages.
import { h } from '../dom.js';
import { icon } from './icons.js';
import { me } from '../../state/selectors.js';
import { cloud, signOutNow, syncNow } from '../../cloud/sync.js';
import { cloudEnabled } from '../../cloud/config.js';

const SIDE = [
  ['today', 'Overview', 'home'], ['syllabus', 'Learning Path', 'path'], ['interview', 'Interview Prep', 'interview'],
  ['projects', 'Projects', 'projects'], ['progress', 'Progress', 'progress'], ['analysis', 'Analysis', 'analysis'], ['backup', 'Backup', 'backup']
];
const TABS = [['today', 'Home', 'home'], ['syllabus', 'Learning', 'path'], ['interview', 'Interview', 'interview'], ['projects', 'Projects', 'projects'], ['progress', 'Progress', 'progress']];

const link = (active, [name, label, ic]) =>
  h('a', { href: '#' + name, 'aria-current': active === name ? 'page' : null }, icon(ic, 22), h('span', null, label));

const initials = name => name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

/** Left sidebar (wide screens). `active` is the page name, or the page a topic was opened from. */
export function sideBar(active) {
  return h('aside', { class: 'side' },
    h('div', { class: 'side-brand' },
      h('img', { src: 'assets/icons/mark-96.png?v=2', width: '40', height: '40', alt: '' }),
      h('span', null, 'Revise Stack')),
    h('nav', { class: 'side-nav', 'aria-label': 'Main' }, SIDE.map(item => link(active, item))),
    h('div', { class: 'side-note' },
      icon('lightbulb', 20),
      h('strong', null, 'Keep going!'),
      h('span', null, 'Every test you take today is one less topic to forget.')),
    h('div', { class: 'side-user' },
      h('a', { class: 'side-me', href: '#profile', 'aria-label': 'Open your profile', 'aria-current': active === 'profile' ? 'page' : null },
        h('span', { class: 'avatar', 'aria-hidden': 'true' }, initials(me().name)),
        h('span', null, h('strong', null, me().name), h('small', null, me().role))),
      cloudEnabled() && cloud.user
        ? h('div', { class: 'side-actions' },
          h('button', { class: 'signout', type: 'button', id: 'upload-side', onclick: syncNow, title: 'Upload now' }, icon('cloudup', 20), h('span', null, 'Upload now')),
          h('button', { class: 'signout', type: 'button', id: 'signout-side', onclick: signOutNow, title: 'Sign out', 'aria-label': 'Sign out' }, icon('logout', 20)))
        : null));
}

/** Bottom tab bar (phones). */
export function navBar(active) {
  return h('nav', { class: 'tabs', 'aria-label': 'Main' },
    h('div', { class: 'tabs-in' }, TABS.map(item => link(active, item))));
}
