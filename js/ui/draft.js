// Keeps the pasted AI reply safe. Phones often reload a tab while you copy from another app,
// so the box is saved a moment after you stop typing and again when the page is hidden.
import { store, save } from '../state/store.js';

const draft = { el: null, id: null, timer: null };

/** Save the bound box now, unless nothing changed (so a stale second tab cannot overwrite newer data). */
export function flushDraft() {
  if (draft.timer) { clearTimeout(draft.timer); draft.timer = null; }
  if (!draft.el || !draft.id) return;
  const value = draft.el.value;
  const drafts = store.data.drafts;
  if ((drafts[draft.id] || '') === value) return;
  if (value) drafts[draft.id] = value; else delete drafts[draft.id];
  save();
}

/** Watch this box. `id` is the topic id, or 'mock-interview'. */
export function bindDraft(el, id) {
  draft.el = el;
  draft.id = id;
  el.addEventListener('input', () => {
    if (draft.timer) clearTimeout(draft.timer);
    draft.timer = setTimeout(flushDraft, 400);
  });
}

export function releaseDraft() { draft.el = null; draft.id = null; }
export function currentDraftId() { return draft.id; }

/** Forget the saved draft and empty the box (after the result was saved). */
export function discardDraft() {
  if (draft.id) delete store.data.drafts[draft.id];
  if (draft.el) draft.el.value = '';
}

/** Flush when the page is hidden or closed. Call once at start. */
export function watchPageLifecycle() {
  window.addEventListener('pagehide', flushDraft);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushDraft(); });
}
