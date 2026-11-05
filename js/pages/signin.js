// Shown instead of the app until the person signs in with Google (only when Firebase is configured).
import { h } from '../ui/dom.js';
import { icon } from '../ui/components/icons.js';
import { heroArt } from '../ui/components/hero-art.js';
import { cloud, signIn } from '../cloud/sync.js';

const FEATURES = [
  ['green', 'check', 'Pre-test every topic', 'Find what you forgot before you spend time learning.'],
  ['purple', 'calendar', 'Revision on schedule', 'Topics come back after 1, 3, 7 and 14 days.'],
  ['orange', 'backup', 'Saved online', 'Your progress follows you to every device.']
];

export function signInScreen() {
  const loading = cloud.status === 'loading';
  return h('main', { class: 'signin' },
    h('span', { class: 'blob b1', 'aria-hidden': 'true' }), h('span', { class: 'blob b2', 'aria-hidden': 'true' }), h('span', { class: 'blob b3', 'aria-hidden': 'true' }),
    h('section', { class: 'signin-card' },
      h('div', { class: 'signin-art' },
        h('img', { src: 'assets/icons/mark-96.png', width: '56', height: '56', alt: '' }),
        h('h1', null, 'Revise Stack'),
        h('p', null, 'Revise what you forgot. Practice what you need. Be ready for your next role.'),
        heroArt()),
      h('div', { class: 'signin-form' },
        h('h2', null, 'Welcome 👋'),
        h('p', { class: 'muted' }, 'Sign in to start. It takes one tap.'),
        h('ul', { class: 'features' }, FEATURES.map(([chip, ic, title, text]) =>
          h('li', null,
            h('span', { class: 'chipicon chip-' + chip }, icon(ic, 20)),
            h('span', null, h('strong', null, title), h('small', { class: 'muted' }, text))))),
        cloud.message ? h('p', { class: 'small', style: 'color:var(--weak)', role: 'alert' }, cloud.message) : null,
        h('button', { class: 'btn big', type: 'button', id: 'signin-btn', disabled: loading, onclick: signIn },
          loading ? h('span', { class: 'spin', 'aria-hidden': 'true' }) : icon('arrow', 20), loading ? 'Loading…' : 'Continue with Google'),
        h('p', { class: 'small muted' }, 'Your Google account is only used to keep your progress private to you.'))));
}
