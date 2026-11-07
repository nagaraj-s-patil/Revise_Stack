import { h } from '../dom.js';
import { icon } from './icons.js';
import { cloud, signOutNow, syncNow } from '../../cloud/sync.js';
import { cloudEnabled } from '../../cloud/config.js';

/** Top bar on phones: logo, name and the Backup link. On wide screens the sidebar replaces it, but the h1 stays for screen readers. */
export function header() {
  return h('header', { class: 'top' },
    h('div', { class: 'brand' },
      h('img', { class: 'brand-mark', src: 'assets/icons/mark-96.png?v=2', width: '40', height: '40', alt: '' }),
      h('h1', null, 'Revise Stack')),
    h('div', { class: 'top-actions' },
      h('a', { href: '#backup', class: 'top-action', 'aria-label': 'Backup and restore' }, icon('backup', 22)),
      cloudEnabled() && cloud.user
        ? h('button', { class: 'top-action', type: 'button', id: 'upload-top', onclick: syncNow, 'aria-label': 'Upload now' }, icon('cloudup', 22))
        : null,
      cloudEnabled() && cloud.user
        ? h('button', { class: 'top-action', type: 'button', id: 'signout-top', onclick: signOutNow, 'aria-label': 'Sign out' }, icon('logout', 22))
        : null));
}
