// The app shell: picks the page for the current route, wraps it with the sidebar, header and tab bar, and draws it.
import { h } from './ui/dom.js';
import { route } from './ui/router.js';
import { ui } from './state/session.js';
import { store } from './state/store.js';
import { context } from './state/context.js';
import { suggestMode, topicState, today } from './core/index.js';
import { flushDraft, releaseDraft } from './ui/draft.js';
import { header } from './ui/components/header.js';
import { navBar, sideBar } from './ui/components/nav.js';
import { todayPage } from './pages/today.js';
import { syllabusPage } from './pages/syllabus.js';
import { topicPage } from './pages/topic.js';
import { projectsPage } from './pages/projects.js';
import { progressPage } from './pages/progress.js';
import { interviewPage } from './pages/interview.js';
import { backupPage } from './pages/backup.js';
import { signInScreen } from './pages/signin.js';
import { needsLogin } from './cloud/sync.js';

const PAGES = {
  today: todayPage,
  syllabus: syllabusPage,
  interview: interviewPage,
  projects: projectsPage,
  progress: progressPage,
  backup: backupPage
};

let lastRouteKey = null;

/** Reset the one-off screen state when the person moves to a different page. */
function onRouteChange(r) {
  const key = r.name + ':' + (r.id || '');
  if (key === lastRouteKey) return;
  const previous = lastRouteKey ? lastRouteKey.split(':')[0] : null;
  lastRouteKey = key;
  ui.msg = null; ui.editing = null; ui.manualOpen = false; ui.promptOpen = false; ui.copied = false;
  if (r.name === 'topic') {
    ui.from = previous === 'today' ? 'today' : 'syllabus';
    ui.mode = ui.nextMode || suggestMode(context.byId[r.id].topic, topicState(store.data.results, r.id, today()));
    ui.nextMode = null;
  }
  if (r.name === 'today') { ui.todayId = null; ui.todayIdx = 0; ui.short = false; }
  window.scrollTo(0, 0);
}

export function renderApp() {
  flushDraft();      // keep what was typed before the screen is rebuilt
  releaseDraft();    // the page being built binds its own box again
  const r = route();
  const app = document.getElementById('app');
  if (needsLogin()) {   // Firebase is on and nobody is signed in yet
    app.textContent = ''; app.removeAttribute('data-loading'); app.appendChild(signInScreen());
    return;
  }
  onRouteChange(r);

  const active = r.name === 'topic' ? ui.from : r.name;
  const wrap = h('main', { class: 'wrap' }, header());
  if (!store.storageOk) {
    wrap.appendChild(h('div', { class: 'banner', role: 'alert' },
      'Your browser is blocking storage. Progress will NOT be saved. Open the site in a normal window.'));
  }
  wrap.appendChild(r.name === 'topic' ? topicPage(r.id) : PAGES[r.name]());

  app.textContent = '';
  app.removeAttribute('data-loading');
  app.appendChild(h('div', { class: 'shell' }, sideBar(active), wrap));
  app.appendChild(navBar(active));
  if (ui.msg) {
    const box = document.getElementById('msg');
    if (box && box.scrollIntoView) box.scrollIntoView({ block: 'nearest' });
  }
}
