// Small read helpers that combine the syllabus and the saved data.
import { topicState, today, profileOf, USER_NAME, allProjects } from '../core/index.js';
import { cloud } from '../cloud/sync.js';
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

/** The profile with defaults, plus the name to show: the one typed in Profile, else the Google name, else the default. */
export function me() {
  const p = profileOf(store.data);
  const google = cloud.user && (cloud.user.displayName || cloud.user.email);
  const name = p.name || google || USER_NAME;
  return { ...p, name, first: name.split(/\s+/)[0], google: google || '' };
}

/** Built-in projects plus the ones you added. */
export function projectList() {
  return allProjects(context.syllabus.projects, store.data);
}

/** Topics you starred as Important. */
export const importantSet = () => store.data.important || {};
