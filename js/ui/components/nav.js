import { h } from '../dom.js';

const TABS = [['today', 'Today'], ['syllabus', 'Syllabus'], ['projects', 'Projects'], ['progress', 'Progress']];

/** Bottom tab bar. `active` is the page name, or the page a topic was opened from. */
export function navBar(active) {
  return h('nav', { class: 'tabs', 'aria-label': 'Main' },
    h('div', { class: 'tabs-in' }, TABS.map(([name, label]) =>
      h('a', { href: '#' + name, 'aria-current': active === name ? 'page' : null }, label))));
}
