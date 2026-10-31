// Progress page: core progress by phase, readiness checks, weakest topics, repeated mistakes,
// the mock interview, and the progress summary to paste into an AI chat.
import { h, copyText } from '../ui/dom.js';
import {
  allTopics, countLevels, applyChecks, weakestTopics, repeatedMistakes, buildSummary, buildMockPrompt,
  averageMock, parseResult, streakInfo, today, DEADLINE
} from '../core/index.js';
import { context } from '../state/context.js';
import { store, save } from '../state/store.js';
import { ui } from '../state/session.js';
import { states, projState } from '../state/selectors.js';
import { bindDraft, discardDraft } from '../ui/draft.js';
import { fmt, uid } from '../ui/format.js';
import { setMsg, clearMsg, msgArea } from '../ui/messages.js';
import { badge } from '../ui/components/badge.js';

const SUMMARY_TIMES = ['30 minutes', '1 hour', '2 hours', '3 hours or more'];
const rowLink = 'padding:0;min-height:44px';

function phaseBars(st) {
  return h('div', { class: 'phasebars' }, context.syllabus.phases.map(phase => {
    const core = phase.topics.filter(x => x.core);
    if (!core.length) return null;
    const c = countLevels(core, st);
    const w = n => (n / core.length * 100).toFixed(2) + '%';
    return h('div', { class: 'phasebar' },
      h('div', { class: 'small phasebar-top' },
        h('span', null, 'Phase ' + phase.number + ' · ' + phase.name),
        h('span', { class: 'muted' }, (c.done + c.strong) + '/' + core.length)),
      h('div', {
        class: 'bar', role: 'img',
        'aria-label': phase.name + ': ' + c.done + ' done, ' + c.strong + ' strong, ' + c.ok + ' OK, ' + c.weak + ' weak, ' + c.untested + ' untested'
      },
      h('span', { class: 'b-done', style: 'width:' + w(c.done) }),
      h('span', { class: 'b-strong', style: 'width:' + w(c.strong) }),
      h('span', { class: 'b-ok', style: 'width:' + w(c.ok) }),
      h('span', { class: 'b-weak', style: 'width:' + w(c.weak) })));
  }));
}

function overviewCard(st) {
  const core = allTopics(context.syllabus.phases, true);
  const counts = countLevels(core, st);
  const share = core.length ? Math.round((counts.done + counts.strong) / core.length * 100) : 0;
  return h('section', { class: 'summary' },
    h('div', { class: 'summary-head' },
      h('h2', null, share + '% of core Strong or Done'),
      h('span', { class: 'small muted' }, counts.done + ' Done · ' + counts.strong + ' Strong')),
    phaseBars(st));
}

function readinessCard(st) {
  const { phases, projects } = context.syllabus;
  const checks = applyChecks(phases, st, store.data.projects, projects);
  const allOk = checks.every(c => c.ok);
  return h('section', { class: 'card' },
    h('h3', null, allOk ? 'You pass all three apply checks' : 'Ready to apply?'),
    h('p', { class: 'small muted' }, 'My suggested checks, not a rule from any employer. Change them if you disagree.'),
    h('ul', { class: 'checks' }, checks.map(c =>
      h('li', null,
        h('span', { class: 'lvl ' + (c.ok ? 'lvl-strong' : 'lvl-untested') }, h('i', { 'aria-hidden': 'true' }, c.ok ? '✓' : '–'), c.ok ? 'Yes' : 'Not yet'),
        h('span', null, c.label, h('span', { class: 'small muted', style: 'display:block' }, c.detail))))));
}

function weakestCard(weakest) {
  const card = h('section', { class: 'card' }, h('h3', null, 'Weakest 5'));
  if (!weakest.length) {
    card.appendChild(h('p', { class: 'empty' }, store.data.results.length ? 'No Weak or OK topics right now.' : 'Take a few tests and your weakest topics will show here.'));
    return card;
  }
  card.appendChild(h('ul', { class: 'history' }, weakest.map(x =>
    h('li', null,
      h('a', { class: 'topic', href: '#t-' + x.topic.id, style: rowLink },
        h('span', { class: 'name' }, x.topic.name),
        h('span', { class: 'meta' }, h('span', { class: 'score' }, x.state.last.score + '/' + x.state.last.total), badge(x.state.level))),
      x.state.last.weakPoints.length ? h('p', { class: 'small muted' }, 'Weak: ' + x.state.last.weakPoints.join('; ')) : null))));
  return card;
}

function repeatedCard() {
  const repeated = repeatedMistakes(context.syllabus.phases, store.data.results, 5);
  const card = h('section', { class: 'card' }, h('h3', null, 'Mistakes that keep coming back'));
  if (!repeated.length) {
    card.appendChild(h('p', { class: 'empty' }, 'None yet. A weak point shows here when the same one appears in 2 or more tests of a topic.'));
    return card;
  }
  card.appendChild(h('ul', { class: 'history' }, repeated.map(m =>
    h('li', null, h('a', { class: 'topic', href: '#t-' + m.topic.id, style: rowLink },
      h('span', { class: 'name' }, m.text, h('span', { class: 'tag', style: 'display:block' }, m.topic.name)),
      h('span', { class: 'meta' }, h('span', { class: 'score' }, m.count + ' tests')))))));
  return card;
}

// ---------- mock interview ----------
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

// ---------- progress summary for the AI ----------
function summaryCard(st) {
  const { phases, projects, } = context.syllabus;
  const t = today();
  const topics = {};
  for (const id of Object.keys(context.byId)) topics[id] = context.byId[id].topic;

  const timeSel = h('select', { id: 'sum-time' }, SUMMARY_TIMES.map(x => h('option', { value: x }, x)));
  timeSel.value = ui.summaryTime || '1 hour';
  const sumEl = h('textarea', { id: 'sumbox', class: 'promptbox mono', readonly: true, 'aria-label': 'Progress summary' });
  const text = () => buildSummary({
    phases, states: st, results: store.data.results, projectState: store.data.projects, projectList: projects, byId: topics,
    today: t, deadline: DEADLINE, timeText: timeSel.value, streak: streakInfo(store.data.results, t), mocks: store.data.mocks
  });
  sumEl.value = text();
  timeSel.addEventListener('change', () => { ui.summaryTime = timeSel.value; sumEl.value = text(); });

  const note = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn', type: 'button', id: 'sum-btn' }, 'Copy progress summary');
  const details = h('details', { class: 'more' }, h('summary', null, 'Show the summary'), h('div', { class: 'inner' }, sumEl));
  btn.addEventListener('click', () => {
    copyText(sumEl.value).then(ok => {
      if (ok) {
        btn.textContent = 'Copied';
        note.textContent = 'Summary copied. Paste it into ChatGPT or Claude. It will plan your session and start the first test.';
        setTimeout(() => { btn.textContent = 'Copy progress summary'; }, 2500);
      } else {
        details.open = true; sumEl.focus(); sumEl.select();
        note.textContent = 'Copy was blocked here. The summary is open below and selected. Copy it by hand.';
      }
    });
  });
  return h('section', { class: 'card' },
    h('h3', null, 'Ask the AI what to do next'),
    h('p', { class: 'small muted' }, 'Copies your levels, weak points, due revisions and projects, then asks the AI to plan your session and start the first test.'),
    h('label', { class: 'field', for: 'sum-time' }, 'Time I have today', timeSel),
    btn, note, details);
}

export function progressPage() {
  const st = states();
  const weakest = weakestTopics(context.syllabus.phases, st, 5);
  const frag = document.createDocumentFragment();
  frag.appendChild(h('h2', null, 'Progress'));
  frag.appendChild(overviewCard(st));
  frag.appendChild(readinessCard(st));
  frag.appendChild(weakestCard(weakest));
  frag.appendChild(repeatedCard());
  frag.appendChild(mockCard(weakest));
  frag.appendChild(summaryCard(st));
  return frag;
}
