// Shown instead of the app until the person signs in with Google (only when Firebase is configured).
import { h } from '../ui/dom.js';
import { cloud, signIn } from '../cloud/sync.js';

export function signInScreen() {
  const loading = cloud.status === 'loading';
  return h('main', { class: 'signin' },
    h('section', { class: 'card' },
      h('img', { src: 'assets/icons/mark-96.png', width: '56', height: '56', alt: '', style: 'border-radius:14px' }),
      h('h1', null, 'Revise Stack'),
      h('p', { class: 'muted' }, 'Sign in so your progress is saved online and follows you to every device.'),
      cloud.message ? h('p', { class: 'small', style: 'color:var(--weak)', role: 'alert' }, cloud.message) : null,
      h('button', { class: 'btn', type: 'button', id: 'signin-btn', disabled: loading, onclick: signIn }, loading ? 'Loading…' : 'Sign in with Google')));
}
