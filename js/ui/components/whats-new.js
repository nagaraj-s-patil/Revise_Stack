// "What's new": a card on the Overview after an update (shown on the first visit after an update only), and the full list for the Profile page.
import { h } from '../dom.js';
import { APP_VERSION, CHANGES } from '../../data/changelog.js';
import { fmtLong } from '../format.js';
import { render } from '../render.js';

const SEEN = 'revise-stack-seen-version';
const seen = () => { try { return localStorage.getItem(SEEN); } catch (e) { return APP_VERSION; } };
const markSeen = () => { try { localStorage.setItem(SEEN, APP_VERSION); } catch (e) { /* ignore */ } };

const items = c => h('ul', { class: 'plain' }, c.items.map(x => h('li', null, x)));

let shownThisVisit = false, dismissed = false;

/** Overview card for the newest update. Shown on the first visit after an update (it stays while you use the app, even when the page redraws), then never again. */
export function whatsNewCard() {
  if (dismissed || (seen() === APP_VERSION && !shownThisVisit)) return null;
  shownThisVisit = true;
  markSeen();
  const c = CHANGES[0];
  return h('section', { class: 'card whats-new', id: 'whats-new', 'aria-label': 'What is new' },
    h('p', { class: 'kicker' }, 'Updated to version ' + c.version),
    h('h3', null, c.title), items(c),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn small', type: 'button', id: 'wn-ok', onclick: () => { dismissed = true; render(); } }, 'Got it'),
      h('a', { class: 'btn small secondary', href: '#profile' }, 'All updates')));
}

/** Full history, for the Profile page. */
export function updatesCard() {
  return h('section', { class: 'card', id: 'updates-card' }, h('h3', null, 'What\'s new'),
    h('p', { class: 'small muted' }, 'You are on version ' + APP_VERSION + '. The app updates itself when you open it online.'),
    CHANGES.map(c => h('div', { class: 'update' }, h('strong', null, 'Version ' + c.version + ' · ' + c.title),
      h('span', { class: 'small muted', style: 'display:block' }, fmtLong(c.date)), items(c))));
}
