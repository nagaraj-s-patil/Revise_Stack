// Labels and date formatting shared by all screens.
import { parseDate } from '../core/index.js';

/** Level badge text: [icon, label]. The icon means a level is never shown by colour alone. */
export const LEVEL_LABEL = {
  weak: ['!', 'Weak'],
  ok: ['~', 'OK'],
  strong: ['✓', 'Strong'],
  done: ['✓✓', 'Done'],
  untested: ['–', 'Untested']
};

export const MODE_LABEL = { learn: 'Learn first', quick: 'Quick test', full: 'Full test' };

export const TAG_HINT = {
  REVISE: 'You studied this before, so a Quick test is suggested.',
  LEARN: 'Marked LEARN in your syllabus, so start by learning it.',
  TEST: 'Marked TEST in your syllabus, so a Full test is suggested.',
  BUILD: 'Marked BUILD in your syllabus. A Quick test checks the basics first.',
  UNSET: 'Not tagged in your syllabus. A Quick test works as a first check.'
};

export const fmt = s => parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const fmtLong = s => parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** A short unique id for a saved result. */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
