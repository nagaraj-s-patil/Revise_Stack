// Profile page: your name, target role, city, apply-by date and daily hours, plus your account and quick numbers.
import { h } from '../ui/dom.js';
import { PROFILE_DEFAULTS, cleanProfile, studyDays, streakInfo, today } from '../core/index.js';
import { store, save } from '../state/store.js';
import { me } from '../state/selectors.js';
import { cloud, signOutNow, syncNow } from '../cloud/sync.js';
import { cloudEnabled } from '../cloud/config.js';
import { icon } from '../ui/components/icons.js';
import { fmtLong } from '../ui/format.js';
import { render } from '../ui/render.js';
import { ui } from '../state/session.js';
import { updatesCard } from '../ui/components/whats-new.js';

const initials = name => name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

function field(label, id, input, hint) {
  return h('label', { class: 'field', for: id }, label, input, hint ? h('span', { class: 'small muted' }, hint) : null);
}

function formCard() {
  const p = me();
  const stored = store.data.profile || {};
  const name = h('input', { id: 'pf-name', type: 'text', maxlength: '60', autocomplete: 'name', placeholder: p.google || PROFILE_DEFAULTS.role });
  name.value = stored.name || '';
  const role = h('input', { id: 'pf-role', type: 'text', maxlength: '80' }); role.value = p.role;
  const city = h('input', { id: 'pf-city', type: 'text', maxlength: '60' }); city.value = p.city;
  const deadline = h('input', { id: 'pf-deadline', type: 'date' }); deadline.value = p.deadline;
  const hours = h('select', { id: 'pf-hours' }, [0.5, 1, 1.5, 2, 3, 4, 6, 8].map(x => h('option', { value: String(x) }, x + (x === 1 ? ' hour' : ' hours'))));
  hours.value = String(p.dailyHours);
  if (hours.value !== String(p.dailyHours)) hours.appendChild(h('option', { value: String(p.dailyHours), selected: true }, p.dailyHours + ' hours'));
  const note = h('p', { class: 'small', role: 'status', 'aria-live': 'polite' });

  const form = h('form', { class: 'card', id: 'profile-form', novalidate: true },
    h('h3', null, 'About you'),
    field('Name', 'pf-name', name, 'Leave empty to use your Google name.'),
    field('Target role', 'pf-role', role),
    field('City', 'pf-city', city),
    field('Ready to apply by', 'pf-deadline', deadline, 'Drives the days-left count, the pace check and the AI summary.'),
    field('Study time per day', 'pf-hours', hours),
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'submit', id: 'pf-save' }, 'Save profile'),
      h('button', { class: 'btn small secondary', type: 'button', id: 'pf-cancel' }, 'Cancel'),
      h('button', { class: 'btn small secondary', type: 'button', id: 'pf-reset' }, 'Reset to defaults')),
    note);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const next = cleanProfile({ name: name.value, role: role.value, city: city.value, deadline: deadline.value, dailyHours: hours.value });
    if (deadline.value && !next.deadline) { note.textContent = 'That date is not valid. Pick the day from the calendar.'; note.className = 'small msg-bad'; return; }
    store.data.profile = { name: next.name || '', ...next };
    const ok = save();
    note.className = 'small';
    note.textContent = ok ? 'Saved.' : 'Could not save in this browser.';
    if (ok) { ui.pfEdit = false; render(); }
  });
  form.querySelector('#pf-cancel').addEventListener('click', () => { ui.pfEdit = false; render(); });
  form.querySelector('#pf-reset').addEventListener('click', () => {
    store.data.profile = {}; save(); ui.pfEdit = false;
    render();
  });
  return form;
}

/** Read-only view of the profile. The form only opens after Edit is clicked. */
function viewCard() {
  const p = me();
  const row = (k, v) => h('div', { class: 'pf-row' }, h('span', null, k), h('strong', null, v));
  return h('section', { class: 'card', id: 'profile-view' },
    h('div', { class: 'summary-head' }, h('h3', null, 'About you'),
      h('button', { class: 'btn small', type: 'button', id: 'pf-edit', onclick: () => { ui.pfEdit = true; render(); } }, 'Edit')),
    h('div', { class: 'pf-view' },
      row('Name', p.name), row('Target role', p.role), row('City', p.city),
      row('Ready to apply by', fmtLong(p.deadline)), row('Study time per day', p.dailyHours + (p.dailyHours === 1 ? ' hour' : ' hours'))));
}

function accountCard() {
  const online = cloudEnabled() && cloud.user;
  return h('section', { class: 'card', id: 'account-card' },
    h('h3', null, 'Account'),
    h('p', { class: 'small' }, online ? 'Signed in as ' + (cloud.user.email || 'your Google account') + '.' : 'Not signed in. Your progress is kept in this browser only.'),
    h('div', { class: 'btn-row' },
      online ? h('button', { class: 'btn small', type: 'button', id: 'upload-btn', onclick: syncNow }, icon('cloudup', 18), 'Upload now') : null,
      h('a', { class: 'btn small secondary', href: '#backup' }, icon('backup', 18), 'Backup and restore'),
      online ? h('button', { class: 'btn small secondary', type: 'button', id: 'signout-btn', onclick: signOutNow }, icon('logout', 18), 'Sign out') : null));
}

export function profilePage() {
  const p = me();
  const t = today();
  const s = streakInfo(store.data.results, t);
  const num = (n, label) => h('div', { class: 'pf-stat' }, h('strong', null, String(n)), h('span', { class: 'small muted' }, label));
  const frag = document.createDocumentFragment();
  frag.appendChild(h('h2', null, 'Profile'));
  frag.appendChild(h('section', { class: 'card pf-head' },
    h('span', { class: 'avatar avatar-lg', 'aria-hidden': 'true' }, initials(p.name)),
    h('div', null, h('h3', null, p.name), h('p', { class: 'small muted' }, p.role + ' · ' + p.city),
      h('p', { class: 'small muted' }, 'Apply by ' + fmtLong(p.deadline) + ' · ' + p.dailyHours + ' h/day'))));
  frag.appendChild(h('section', { class: 'pf-stats', 'aria-label': 'Your numbers' },
    num(store.data.results.length, 'tests saved'), num(studyDays(store.data.results), 'study days'),
    num(s.streak, 'day streak'), num((store.data.mocks || []).length, 'mock interviews')));
  frag.appendChild(ui.pfEdit ? formCard() : viewCard());
  frag.appendChild(accountCard());
  frag.appendChild(updatesCard());
  return frag;
}
