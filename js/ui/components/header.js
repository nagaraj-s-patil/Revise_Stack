import { h } from '../dom.js';
import { fmtLong } from '../format.js';
import { DEADLINE, parseDate, today } from '../../core/index.js';

/** App name, logo mark, days left to the target date, and the Backup link. */
export function header() {
  const days = Math.round((parseDate(DEADLINE) - parseDate(today())) / 86400000);
  const goal = days >= 0
    ? 'Ready to apply by ' + fmtLong(DEADLINE) + ' · ' + days + ' days left'
    : 'Target date ' + fmtLong(DEADLINE) + ' has passed';
  return h('header', { class: 'top' },
    h('div', { class: 'brand' },
      h('img', { class: 'brand-mark', src: 'assets/icons/mark-96.png', width: '40', height: '40', alt: '' }),
      h('h1', null, 'Revise Stack')),
    h('p', { class: 'goal' }, goal, ' · ', h('a', { href: '#backup', class: 'quiet' }, 'Backup')));
}
