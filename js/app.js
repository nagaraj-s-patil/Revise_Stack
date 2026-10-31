// Entry point. Loads the syllabus and saved data, then draws the app.
import { loadSyllabus } from './data/syllabus.js';
import { setSyllabus } from './state/context.js';
import { loadStore } from './state/store.js';
import { watchPageLifecycle } from './ui/draft.js';
import { setRenderer } from './ui/render.js';
import { renderApp } from './shell.js';
import { startPwa } from './pwa.js';

async function start() {
  try {
    setSyllabus(await loadSyllabus('data/'));
  } catch (err) {
    const app = document.getElementById('app');
    app.removeAttribute('data-loading');
    app.textContent = 'Could not load the syllabus. Refresh the page. If it keeps failing, check your connection once, then try again. (' + err.message + ')';
    return;
  }
  loadStore();
  watchPageLifecycle();
  setRenderer(renderApp);
  window.addEventListener('hashchange', renderApp);
  renderApp();
  startPwa();
}

start();
