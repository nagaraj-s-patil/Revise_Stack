// The copy-prompt card, the message box and the paste card. Shared by the Today page and the topic page.
import { h, copyText } from '../dom.js';
import { buildPrompt, recentWeakPoints } from '../../core/index.js';
import { context } from '../../state/context.js';
import { store } from '../../state/store.js';
import { ui } from '../../state/session.js';
import { bindDraft } from '../draft.js';
import { TAG_HINT } from '../format.js';
import { msgArea } from '../messages.js';
import { onSavePaste, manualForm } from './result-flow.js';

const MODES = [['learn', 'Learn first (about 20 min)'], ['quick', 'Quick test (5 questions)'], ['full', 'Full test (10 questions)']];

/**
 * twoStep (Today): the paste card stays hidden until the prompt has been copied,
 * or until "I already have the AI reply" is tapped.
 */
export function studyCards(id, twoStep) {
  const { topic, phase } = context.byId[id];
  const frag = document.createDocumentFragment();
  let step2 = null;
  let haveBtn = null;
  function reveal() { ui.copied = true; if (step2) step2.hidden = false; if (haveBtn) haveBtn.hidden = true; }

  // step 1: pick a mode, copy the prompt
  const promptEl = h('textarea', { id: 'promptbox', class: 'promptbox mono', readonly: true, 'aria-label': 'Test prompt' });
  const currentPrompt = () => buildPrompt(topic, phase, ui.mode, recentWeakPoints(store.data.results, id, 4));
  promptEl.value = currentPrompt();

  const copyNote = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' });
  const copyBtn = h('button', { class: 'btn', type: 'button', id: 'copy-btn' }, 'Copy test prompt');
  const details = h('details', { class: 'more' }, h('summary', null, 'Show the prompt'), h('div', { class: 'inner' }, promptEl));
  details.open = ui.promptOpen;
  details.addEventListener('toggle', () => { ui.promptOpen = details.open; });

  copyBtn.addEventListener('click', () => {
    copyText(currentPrompt()).then(ok => {
      if (ok) {
        copyBtn.textContent = 'Copied';
        copyNote.textContent = 'Prompt copied. Paste it into ChatGPT or Claude, take the test, then come back.';
        setTimeout(() => { copyBtn.textContent = 'Copy test prompt'; }, 2500);
      } else {
        details.open = true; ui.promptOpen = true; promptEl.focus(); promptEl.select();
        copyNote.textContent = 'Copy was blocked here. The prompt is open below and selected. Copy it by hand.';
      }
      reveal();
    });
  });

  const modes = h('fieldset', { class: 'modes' }, h('legend', null, 'Mode'));
  for (const [value, label] of MODES) {
    const input = h('input', { type: 'radio', name: 'mode', value, id: 'mode-' + value });
    input.checked = ui.mode === value;
    input.addEventListener('change', () => { ui.mode = value; promptEl.value = currentPrompt(); });
    modes.appendChild(h('label', { for: 'mode-' + value }, input, label));
  }

  frag.appendChild(h('section', { class: 'card' },
    h('h3', null, h('span', { class: 'stepno', 'aria-hidden': 'true' }, '1'), 'Copy the prompt'),
    h('p', { class: 'small muted' }, TAG_HINT[topic.tag] || TAG_HINT.UNSET),
    modes, copyBtn, copyNote, details));

  frag.appendChild(msgArea());

  // step 2: paste the AI reply and save
  const pasteEl = h('textarea', { id: 'paste', placeholder: 'Paste the whole AI reply here. The result block is picked out automatically.', 'aria-label': 'AI reply' });
  pasteEl.value = store.data.drafts[id] || '';
  bindDraft(pasteEl, id);
  const saveBtn = h('button', { class: 'btn', type: 'button', id: 'save-btn', onclick: () => onSavePaste(id, pasteEl.value) }, 'Save result');
  step2 = h('section', { class: 'card', id: 'step2' },
    h('h3', null, h('span', { class: 'stepno', 'aria-hidden': 'true' }, '2'), 'Paste the AI reply'),
    h('label', { class: 'field', for: 'paste' }, 'AI reply'),
    pasteEl,
    h('div', { class: 'btn-row' }, saveBtn),
    manualForm(id));

  if (twoStep && !(ui.copied || store.data.drafts[id] || ui.msg || ui.editing)) {
    step2.hidden = true;
    haveBtn = h('button', { class: 'btn secondary', type: 'button', id: 'have-reply', onclick: () => { reveal(); pasteEl.focus(); } }, 'I already have the AI reply');
    frag.appendChild(haveBtn);
  }
  frag.appendChild(step2);
  return frag;
}
