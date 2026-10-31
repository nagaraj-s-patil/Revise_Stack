// The message box that shows results, warnings and errors (with Undo, Edit, Cancel buttons).
import { h } from './dom.js';
import { ui } from '../state/session.js';
import { render } from './render.js';

/** The message container. Always rendered (so screen readers hear changes), filled when ui.msg is set. */
export function msgArea() {
  const box = h('div', { id: 'msg', role: 'status', 'aria-live': 'polite' });
  if (!ui.msg) return box;
  const m = ui.msg;
  const el = h('div', { class: 'msg ' + (m.type || '') }, (m.lines || []).map(line => h('p', null, line)));
  if (m.actions && m.actions.length) {
    el.appendChild(h('div', { class: 'btn-row' }, m.actions.map(a =>
      h('button', { class: 'btn small ' + (a.kind || 'secondary'), type: 'button', onclick: a.fn }, a.label))));
  }
  box.appendChild(el);
  return box;
}

export function setMsg(m) { ui.msg = m; render(); }
export function clearMsg() { ui.msg = null; render(); }
