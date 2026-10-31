import { h } from '../dom.js';
import { icon } from './icons.js';

/** Top bar on phones: logo, name and the Backup link. On wide screens the sidebar replaces it, but the h1 stays for screen readers. */
export function header() {
  return h('header', { class: 'top' },
    h('div', { class: 'brand' },
      h('img', { class: 'brand-mark', src: 'assets/icons/mark-96.png', width: '40', height: '40', alt: '' }),
      h('h1', null, 'Revise Stack')),
    h('a', { href: '#backup', class: 'top-action', 'aria-label': 'Backup and restore' }, icon('backup', 22)));
}
