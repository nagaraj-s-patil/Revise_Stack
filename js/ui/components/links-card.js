// Your other apps (EXTERNAL_LINKS in core/config.js) as buttons that open in a new tab.
import { h } from '../dom.js';
import { icon } from './icons.js';
import { EXTERNAL_LINKS } from '../../core/index.js';

export function linksCard() {
  return h('section', { class: 'card', id: 'my-apps', 'aria-label': 'My other apps' },
    h('h3', null, 'My other apps'),
    EXTERNAL_LINKS.map(l => h('div', { class: 'ext-row' },
      h('div', null, h('strong', null, l.label), h('p', { class: 'small muted' }, l.note)),
      h('a', { class: 'btn small', href: l.url, target: '_blank', rel: 'noopener noreferrer', id: 'ext-' + l.id }, 'Open', icon('external', 18)))));
}
