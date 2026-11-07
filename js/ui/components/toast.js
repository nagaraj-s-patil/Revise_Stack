// A small message at the bottom of the screen that disappears by itself. For results of quick actions (like Upload now).
import { h } from '../dom.js';

export function toast(text, kind = 'ok') {
  const old = document.getElementById('toast');
  if (old) old.remove();
  const el = h('div', { id: 'toast', class: 'toast ' + kind, role: 'status', 'aria-live': 'polite' }, text);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), kind === 'ok' ? 3000 : 6000);
}
