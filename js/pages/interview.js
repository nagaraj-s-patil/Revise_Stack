// Interview Prep page: a mock interview on your weakest topics. The AI interviews you, you paste the reply back.
// It does not change topic levels. It gives a separate score to watch.
import { h, copyText } from '../ui/dom.js';
import { weakestTopics, buildMockPrompt, averageMock, parseResult, today } from '../core/index.js';
import { context } from '../state/context.js';
import { store, save } from '../state/store.js';
import { states, projState } from '../state/selectors.js';
import { bindDraft, discardDraft } from '../ui/draft.js';
import { fmt, uid } from '../ui/format.js';
import { setMsg, clearMsg, msgArea } from '../ui/messages.js';

function saveMock(text, box) {
  const p = parseResult(text);
  if (!p.ok) { setMsg({ type: 'error', lines: [p.error] }); return; }
  if (p.data.topicId && p.data.topicId !== 'mock-interview') {
    setMsg({ type: 'error', lines: ['This result is for a topic test (' + p.data.topicId + '), not a mock interview. Save it from that topic’s page.'] });
    return;
  }
  const rec = { id: uid(), date: today(), score: p.data.score, total: p.data.total, weakPoints: p.data.weakPoints, nextStep: p.data.nextStep };
  store.data.mocks.push(rec);
  discardDraft();
  box.value = '';
  const ok = save();
  const lines = ['Mock interview saved: ' + rec.score + '/' + rec.total + '.'];
  if (rec.weakPoints.length) lines.push('Weak: ' + rec.weakPoints.join('; '));
  if (rec.nextStep) lines.push('Next step: ' + rec.nextStep);
  if (!ok) lines.push('Could not save to this browser. It will be lost when you close the page.');
  setMsg({
    type: ok ? 'success' : 'error', lines,
    actions: [{ label: 'Undo', kind: 'secondary', fn: () => { store.data.mocks = store.data.mocks.filter(m => m.id !== rec.id); save(); clearMsg(); } }]
  });
}

function mockList(mocks) {
  if (!mocks.length) return h('p', { class: 'empty' }, 'No mock interviews saved yet.');
  return h('ul', { class: 'history' }, mocks.slice(0, 5).map(m =>
    h('li', null,
      h('div', { class: 'hist-top' },
        h('strong', null, fmt(m.date)),
        h('span', { class: 'score' }, m.score + '/' + m.total),
        h('span', { class: 'grow' }),
        h('button', {
          class: 'btn small danger', type: 'button', onclick: () => setMsg({
            type: 'warn',
            lines: ['Delete the ' + fmt(m.date) + ' mock result (' + m.score + '/' + m.total + ')? This cannot be undone.'],
            actions: [
              { label: 'Delete', kind: 'danger', fn: () => { store.data.mocks = store.data.mocks.filter(x => x.id !== m.id); save(); clearMsg(); } },
              { label: 'Cancel', kind: 'secondary', fn: clearMsg }
            ]
          })
        }, 'Delete')),
      m.weakPoints.length ? h('p', { class: 'small' }, 'Weak: ' + m.weakPoints.join('; ')) : null)));
}

function mockCard(weakest) {
  const { projects } = context.syllabus;
  const focus = weakest.map(x => x.topic.name);
  const started = projects.filter(p => projState(p.id).status !== 'notstarted').map(p => p.name + ' (' + p.stack + ')');
  const promptText = buildMockPrompt({ focus, projects: started });

  const promptEl = h('textarea', { id: 'mockprompt', class: 'promptbox mono', readonly: true, 'aria-label': 'Mock interview prompt' });
  promptEl.value = promptText;
  const details = h('details', { class: 'more' }, h('summary', null, 'Show the prompt'), h('div', { class: 'inner' }, promptEl));
  const note = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' });
  const copyBtn = h('button', { class: 'btn', type: 'button', id: 'mock-copy' }, 'Copy mock interview prompt');
  copyBtn.addEventListener('click', () => {
    copyText(promptText).then(ok => {
      if (ok) {
        copyBtn.textContent = 'Copied';
        note.textContent = 'Copied. Paste it into ChatGPT or Claude and answer like a real interview.';
        setTimeout(() => { copyBtn.textContent = 'Copy mock interview prompt'; }, 2500);
      } else {
        details.open = true; promptEl.focus(); promptEl.select();
        note.textContent = 'Copy was blocked here. The prompt is open below and selected. Copy it by hand.';
      }
    });
  });

  const pasteEl = h('textarea', { id: 'mockpaste', placeholder: 'Paste the whole AI reply here after the interview', 'aria-label': 'Mock interview reply' });
  pasteEl.value = store.data.drafts['mock-interview'] || '';
  bindDraft(pasteEl, 'mock-interview');
  const saveBtn = h('button', { class: 'btn secondary', type: 'button', id: 'mock-save', onclick: () => saveMock(pasteEl.value, pasteEl) }, 'Save mock result');

  const mocks = store.data.mocks.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1)));
  const avg = averageMock(mocks, 3);
  return h('section', { class: 'card' },
    h('h3', null, 'Mock interview'),
    h('p', { class: 'small muted' }, 'The AI interviews you for about 30 minutes on your weakest topics' + (started.length ? ' and one of your projects' : '') +
      '. It does not change topic levels. It gives you a separate score to watch.'),
    copyBtn, note, details, msgArea(),
    h('label', { class: 'field', for: 'mockpaste' }, 'Paste the interview reply'), pasteEl,
    h('div', { class: 'btn-row' }, saveBtn),
    avg !== null ? h('p', { class: 'small' }, 'Average of your last ' + Math.min(3, mocks.length) + ': ' + avg + '%') : null,
    mockList(mocks));
}

export function interviewPage() {
  const weakest = weakestTopics(context.syllabus.phases, states(), 5);
  const frag = document.createDocumentFragment();
  frag.appendChild(h('h2', null, 'Interview Prep'));
  frag.appendChild(mockCard(weakest));
  return frag;
}
