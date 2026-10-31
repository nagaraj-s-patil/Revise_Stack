// Hash routes: #today (default), #syllabus, #projects, #progress, #backup, #t-<topic id>.
import { context } from '../state/context.js';

const PAGES = ['syllabus', 'projects', 'progress', 'backup'];

export function route() {
  const hash = location.hash.slice(1);
  if (hash.startsWith('t-') && context.byId[hash.slice(2)]) return { name: 'topic', id: hash.slice(2) };
  if (PAGES.includes(hash)) return { name: hash };
  return { name: 'today' };
}
