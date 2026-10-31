// Small read helpers that combine the syllabus and the saved data.
import { topicState, today } from '../core/index.js';
import { context } from './context.js';
import { store } from './store.js';

/** Level, last result and due date for every topic, as of today. */
export function states() {
  const t = today();
  const out = {};
  for (const id of Object.keys(context.byId)) out[id] = topicState(store.data.results, id, t);
  return out;
}

/** Saved state of one project, with defaults for a project you have not touched. */
export function projState(id) {
  return store.data.projects[id] || { status: 'notstarted', link: '', note: '' };
}
