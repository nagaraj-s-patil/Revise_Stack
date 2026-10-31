// "Install the app" card. Android: a button. iPhone: the Share steps. Hidden once installed.
import { h } from '../dom.js';
import { installOptions, installDismissed, dismissInstall, promptInstall } from '../../pwa.js';
import { render } from '../render.js';

/**
 * Today shows the card until it is dismissed. The Backup page always shows it (always: true),
 * with a note when there is nothing to install from (already installed, or the browser offers no install).
 */
export function installCard({ always = false } = {}) {
  const opt = installOptions();
  if (opt.installed) return always ? h('section', { class: 'card' }, h('h3', null, 'Install the app'), h('p', { class: 'small muted' }, 'Revise Stack is installed on this device.')) : null;
  if (!always && installDismissed()) return null;
  if (!opt.canPrompt && !opt.ios) {
    return always
      ? h('section', { class: 'card' }, h('h3', null, 'Install the app'),
        h('p', { class: 'small muted' }, 'Open the browser menu and choose Install app or Add to Home screen. If the option is missing, open the site in Chrome (Android) or Safari (iPhone).'))
      : null;
  }

  const card = h('section', { class: 'card', 'aria-label': 'Install the app' },
    h('h3', null, 'Install Revise Stack on your phone'),
    h('p', { class: 'small muted' }, 'Opens like an app from your home screen, in full screen, and works offline.'));
  const buttons = [];
  if (opt.canPrompt) {
    buttons.push(h('button', { class: 'btn small', type: 'button', id: 'install-btn', onclick: () => promptInstall() }, 'Install app'));
  } else {
    card.appendChild(h('ol', { class: 'plain small', id: 'install-ios' },
      h('li', null, 'Tap the Share button in Safari.'),
      h('li', null, 'Scroll down and tap Add to Home Screen.'),
      h('li', null, 'Tap Add.')));
  }
  if (!always) {
    buttons.push(h('button', {
      class: 'btn small secondary', type: 'button', id: 'install-dismiss', onclick: () => { dismissInstall(); render(); }
    }, 'Not now'));
  }
  if (buttons.length) card.appendChild(h('div', { class: 'btn-row' }, buttons));
  return card;
}
