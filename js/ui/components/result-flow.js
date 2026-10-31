// Saving a test result: read the pasted AI reply (or the manual form), warn about wrong topic or duplicates,
// save, then show the outcome with Undo and Edit. Also the manual score form, which doubles as the edit form.
import { h } from '../dom.js';
import { parseResult, splitList, topicState, today } from '../../core/index.js';
import { context } from '../../state/context.js';
import { store, save } from '../../state/store.js';
import { ui, resetToday } from '../../state/session.js';
import { currentDraftId, discardDraft } from '../draft.js';
import { fmt, uid, LEVEL_LABEL } from '../format.js';
import { setMsg, clearMsg } from '../messages.js';
import { render } from '../render.js';
import { route } from '../router.js';

/** Remove one saved result. */
export function removeResult(id) {
  store.data.results = store.data.results.filter(r => r.id !== id);
  save();
}

/** Open the edit form for a saved result. */
export function startEdit(id) {
  ui.editing = id; ui.manualOpen = true; ui.msg = null;
  render();
  const d = document.getElementById('manual');
  if (d && d.scrollIntoView) d.scrollIntoView({ block: 'center' });
  const s = document.getElementById('m-score');
  if (s) s.focus();
}

/** "Save result" on the paste box. `currentTopicId` is the topic whose page or card is open. */
export function onSavePaste(currentTopicId, text) {
  const p = parseResult(text);
  if (!p.ok) { setMsg({ type: 'error', lines: [p.error] }); return; }
  const d = p.data;
  d.source = 'paste';
  const here = context.byId[currentTopicId].topic.name;
  if (d.topicId && d.topicId !== currentTopicId) {
    const other = context.byId[d.topicId];
    const actions = [];
    if (other) actions.push({ label: 'Save for ' + other.topic.name, kind: '', fn: () => checkDuplicate(d.topicId, d) });
    actions.push({ label: 'Save for ' + here, kind: other ? 'secondary' : '', fn: () => checkDuplicate(currentTopicId, d) });
    actions.push({ label: 'Cancel', kind: 'secondary', fn: clearMsg });
    setMsg({
      type: 'warn',
      lines: [other
        ? 'This result is for ' + other.topic.name + ', but you opened ' + here + '.'
        : 'This result names a topic ID that is not in your syllabus (' + d.topicId + ').'],
      actions
    });
    return;
  }
  checkDuplicate(currentTopicId, d);
}

function checkDuplicate(topicId, d) {
  const t = today();
  const dup = store.data.results.some(r =>
    r.topicId === topicId && r.date === t && r.score === d.score && r.total === d.total && r.mode === d.mode);
  if (dup) {
    setMsg({
      type: 'warn',
      lines: ['A result with the same score was already saved today for this topic. Save another anyway?'],
      actions: [{ label: 'Save anyway', kind: '', fn: () => commit(topicId, d) }, { label: 'Cancel', kind: 'secondary', fn: clearMsg }]
    });
    return;
  }
  commit(topicId, d);
}

function commit(topicId, d) {
  const rec = {
    id: uid(), topicId, date: today(), mode: d.mode, score: d.score, total: d.total,
    weakPoints: d.weakPoints || [], nextStep: d.nextStep || '', edited: false, source: d.source || 'paste'
  };
  store.data.results.push(rec);
  if (d.source === 'paste' && topicId === currentDraftId()) discardDraft();
  showSaved(topicId, rec, save(), false);
}

function showSaved(topicId, rec, ok, wasEdit) {
  const st = topicState(store.data.results, topicId, today());
  const name = context.byId[topicId].topic.name;
  const lines = [name + ': ' + rec.score + '/' + rec.total + ', ' + LEVEL_LABEL[st.level][1] + (wasEdit ? ' (edited)' : '') + '.'];
  if (rec.weakPoints.length) lines.push('Weak points: ' + rec.weakPoints.join('; '));
  if (rec.nextStep) lines.push('Next step: ' + rec.nextStep);
  lines.push(st.level === 'done' ? 'Done. Revision continues on ' + fmt(st.due) + '.' : 'Next revision: ' + fmt(st.due) + '.');
  if (!ok) lines.push('Could not save to this browser. Progress will be lost when you close the page.');
  if (topicId !== currentDraftId()) lines.push('Saved under ' + name + '. Open it from the syllabus to see its history.');
  const actions = [];
  if (!wasEdit) actions.push({ label: 'Undo', kind: 'secondary', fn: () => { removeResult(rec.id); clearMsg(); } });
  actions.push({ label: 'Edit score', kind: 'secondary', fn: () => startEdit(rec.id) });
  if (route().name === 'today') actions.unshift({ label: 'Next task', kind: '', fn: () => { resetToday(); render(); } });
  setMsg({ type: ok ? 'success' : 'error', lines, actions });
}

/** "Enter score by hand" form. When a result is being edited (ui.editing) it edits that result instead. */
export function manualForm(topicId) {
  const rec = ui.editing ? store.data.results.find(r => r.id === ui.editing) : null;
  const score = h('input', { type: 'number', id: 'm-score', inputmode: 'numeric', min: '0', step: '1' });
  const total = h('select', { id: 'm-total' }, h('option', { value: '5' }, '5 (Quick)'), h('option', { value: '10' }, '10 (Full)'));
  const weak = h('input', { type: 'text', id: 'm-weak', placeholder: 'HashMap vs TreeMap; Comparator' });
  const next = h('input', { type: 'text', id: 'm-next', placeholder: 'Practice custom comparators' });
  if (rec) {
    score.value = rec.score;
    if (rec.total !== 5 && rec.total !== 10) total.appendChild(h('option', { value: String(rec.total) }, String(rec.total)));
    total.value = String(rec.total);
    weak.value = rec.weakPoints.join('; ');
    next.value = rec.nextStep;
  } else total.value = ui.mode === 'full' ? '10' : '5';

  const err = h('p', { class: 'small', style: 'color:var(--weak)', role: 'alert', id: 'm-err' });
  const form = h('form', { class: 'inner', novalidate: true },
    h('p', { class: 'small muted' }, rec ? 'Editing a saved result. It will be marked as edited.' : 'Use this if the AI did not give a result block. Type the numbers it gave you.'),
    h('div', { class: 'row2' },
      h('label', { class: 'field', for: 'm-score' }, 'Score (correct answers)', score),
      h('label', { class: 'field', for: 'm-total' }, 'Out of', total)),
    h('label', { class: 'field', for: 'm-weak' }, 'Weak points (separate with ;)', weak),
    h('label', { class: 'field', for: 'm-next' }, 'Next step', next),
    err,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'submit' }, rec ? 'Update result' : 'Save score'),
      rec ? h('button', { class: 'btn secondary', type: 'button', onclick: () => { ui.editing = null; ui.manualOpen = false; clearMsg(); } }, 'Cancel edit') : null));

  form.addEventListener('submit', e => {
    e.preventDefault();
    const s = score.value.trim();
    const tt = +total.value;
    if (!/^\d+$/.test(s)) { err.textContent = 'Enter the score as a whole number, for example 6.'; score.focus(); return; }
    const sc = +s;
    if (sc > tt) { err.textContent = 'Score looks wrong (' + sc + '/' + tt + '). The score cannot be more than the total.'; score.focus(); return; }
    const wp = splitList(weak.value);
    const ns = next.value.trim();
    if (rec) {
      rec.score = sc; rec.total = tt; rec.weakPoints = wp; rec.nextStep = ns; rec.edited = true;
      const ok = save();
      ui.editing = null; ui.manualOpen = false;
      showSaved(rec.topicId, rec, ok, true);
    } else {
      ui.manualOpen = false;
      commit(topicId, { source: 'manual', mode: tt >= 10 ? 'full' : 'quick', score: sc, total: tt, weakPoints: wp, nextStep: ns });
    }
  });

  const d = h('details', { class: 'more', id: 'manual' }, h('summary', null, rec ? 'Edit result' : 'Enter score by hand'), form);
  d.open = ui.manualOpen || !!rec;
  d.addEventListener('toggle', () => { ui.manualOpen = d.open; });
  return d;
}
