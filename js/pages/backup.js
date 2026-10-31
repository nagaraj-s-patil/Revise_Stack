// Backup page: copy your data as text, restore it from text, and install the app.
import { h, copyText } from '../ui/dom.js';
import { exportBackup, validateBackup, today, parseDate } from '../core/index.js';
import { store, save, replaceData } from '../state/store.js';
import { ui } from '../state/session.js';
import { fmt } from '../ui/format.js';
import { setMsg, clearMsg, msgArea } from '../ui/messages.js';
import { installCard } from '../ui/components/install-card.js';
import { cloud, signOutNow } from '../cloud/sync.js';
import { cloudEnabled } from '../cloud/config.js';

const CLOUD_TEXT = { synced: 'Saved online', saving: 'Saving…', offline: 'Offline. Changes are kept here and sent when you are back online.', error: 'Could not save online. Your data is safe in this browser. Retrying on the next change.' };

function cloudCard() {
  if (!cloudEnabled() || !cloud.user) return null;
  return h('section', { class: 'card', id: 'cloud-card' },
    h('h3', null, 'Online storage (Firebase)'),
    h('p', { class: 'small' }, 'Signed in as ' + (cloud.user.email || 'your Google account') + '.'),
    h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' }, (CLOUD_TEXT[cloud.status] || '') + (cloud.message && cloud.status !== 'synced' ? ' (' + cloud.message + ')' : '')),
    h('div', { class: 'btn-row' }, h('button', { class: 'btn small secondary', type: 'button', id: 'signout-btn', onclick: signOutNow }, 'Sign out')));
}

function daysAgoText(day) {
  if (!day) return 'You have not copied a backup yet.';
  const n = Math.round((parseDate(today()) - parseDate(day)) / 86400000);
  return 'Last backup copied ' + (n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago') + '.';
}

function backupCard() {
  const json = exportBackup(store.data, today());
  const out = h('textarea', { id: 'backupbox', class: 'promptbox mono', readonly: true, 'aria-label': 'Backup text' });
  out.value = json;
  const note = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' }, daysAgoText(store.data.lastExport));
  const btn = h('button', { class: 'btn', type: 'button', id: 'backup-btn' }, 'Copy backup');
  const details = h('details', { class: 'more' }, h('summary', null, 'Show the backup text'), h('div', { class: 'inner' }, out));
  btn.addEventListener('click', () => {
    copyText(json).then(ok => {
      if (ok) {
        store.data.lastExport = today();
        save();
        btn.textContent = 'Copied';
        note.textContent = 'Backup copied (' + store.data.results.length + ' results). Paste it somewhere safe. ' + daysAgoText(store.data.lastExport);
        setTimeout(() => { btn.textContent = 'Copy backup'; }, 2500);
      } else {
        details.open = true; out.focus(); out.select();
        note.textContent = 'Copy was blocked here. The backup is open below and selected. Copy it by hand.';
      }
    });
  });
  return h('section', { class: 'card' }, h('h3', null, 'Back up'), btn, note, details);
}

function restoreCard() {
  const input = h('textarea', { id: 'importbox', placeholder: 'Paste the backup text here', 'aria-label': 'Backup text to restore' });
  input.value = ui.importText || '';
  input.addEventListener('input', () => { ui.importText = input.value; });

  const check = () => {
    const v = validateBackup(input.value);
    if (!v.ok) { setMsg({ type: 'error', lines: [v.error] }); return; }
    const lines = [
      'Found ' + v.stats.results + ' results, ' + v.stats.mocks + ' mock interviews and ' + v.stats.projects + ' projects' +
        (v.stats.exportedOn ? ' (backed up ' + fmt(v.stats.exportedOn) + ')' : '') + '.',
      'This replaces everything saved in this browser (' + store.data.results.length + ' results now).'
    ];
    if (v.stats.dropped) lines.push(v.stats.dropped + ' rows were unreadable and will be skipped.');
    setMsg({
      type: 'warn', lines,
      actions: [
        {
          label: 'Replace my data', kind: 'danger', fn: () => {
            ui.importText = '';
            const ok = replaceData(v.data);
            setMsg({
              type: ok ? 'success' : 'error',
              lines: [ok ? 'Backup restored: ' + v.stats.results + ' results.' : 'Restored for now, but this browser would not save it. It will be lost when you close the page.']
            });
          }
        },
        { label: 'Cancel', kind: 'secondary', fn: clearMsg }
      ]
    });
  };

  return h('section', { class: 'card' },
    h('h3', null, 'Restore'),
    h('p', { class: 'small muted' }, 'Nothing changes until you confirm.'),
    h('label', { class: 'field', for: 'importbox' }, 'Backup text'),
    input,
    h('div', { class: 'btn-row' }, h('button', { class: 'btn secondary', type: 'button', id: 'check-btn', onclick: check }, 'Check backup')));
}

export function backupPage() {
  const frag = document.createDocumentFragment();
  frag.appendChild(h('a', { class: 'back', href: '#today' }, '← Today'));
  frag.appendChild(h('div', null,
    h('h2', null, 'Backup and restore'),
    h('p', { class: 'small muted' }, cloudEnabled()
      ? 'Your progress is saved online in Firebase and kept in this browser as an offline copy. A manual backup is still a good extra safety copy.'
      : 'Your progress lives in this browser only. Clearing site data or switching phone or browser erases it. Copy a backup now and then and keep the text in a notes app or a message to yourself.')));
  const cl = cloudCard();
  if (cl) frag.appendChild(cl);
  const install = installCard({ always: true });
  if (install) frag.appendChild(install);
  frag.appendChild(backupCard());
  frag.appendChild(msgArea());
  frag.appendChild(restoreCard());
  return frag;
}
