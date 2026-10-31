// Backup export and safe restore. Pasted backups are validated before anything is replaced.
import { PROJECT_STATUS } from './config.js';
import { localDate, parseDate } from './dates.js';

// Backup text and restore check.
export function exportBackup(data, today) {
  return JSON.stringify({ version: 1, exportedOn: today, results: data.results, projects: data.projects, mocks: data.mocks || [] }, null, 1);
}

export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && localDate(parseDate(s)) === s; }

export function validateBackup(text) {
  var obj;
  try { obj = JSON.parse(text); }
  catch (e) { return { ok: false, error: 'This is not a valid backup. Paste the whole backup text, from the first { to the last }.' }; }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.results)) return { ok: false, error: 'This is not a valid backup: no results list found.' };
  var results = [], dropped = 0;
  obj.results.forEach(function (r, i) {
    if (!r || typeof r.topicId !== 'string' || !validDate(r.date) || !Number.isInteger(r.score) || !Number.isInteger(r.total) ||
        r.total < 1 || r.total > 50 || r.score < 0 || r.score > r.total) { dropped++; return; }
    results.push({
      id: typeof r.id === 'string' && r.id ? r.id : 'imp' + i + r.date,
      topicId: r.topicId, date: r.date, mode: r.mode === 'full' ? 'full' : 'quick', score: r.score, total: r.total,
      weakPoints: Array.isArray(r.weakPoints) ? r.weakPoints.filter(function (x) { return typeof x === 'string'; }) : [],
      nextStep: typeof r.nextStep === 'string' ? r.nextStep : '', edited: !!r.edited, source: typeof r.source === 'string' ? r.source : 'import'
    });
  });
  var mocks = [];
  (Array.isArray(obj.mocks) ? obj.mocks : []).forEach(function (m, i) {
    if (!m || !validDate(m.date) || !Number.isInteger(m.score) || !Number.isInteger(m.total) || m.total < 1 || m.total > 50 || m.score < 0 || m.score > m.total) return;
    mocks.push({ id: typeof m.id === 'string' && m.id ? m.id : 'mock' + i + m.date, date: m.date, score: m.score, total: m.total,
      weakPoints: Array.isArray(m.weakPoints) ? m.weakPoints.filter(function (x) { return typeof x === 'string'; }) : [],
      nextStep: typeof m.nextStep === 'string' ? m.nextStep : '' });
  });
  var projects = {};
  if (obj.projects && typeof obj.projects === 'object') {
    Object.keys(obj.projects).forEach(function (k) {
      var p = obj.projects[k];
      if (!p || typeof p !== 'object') return;
      projects[k] = {
        status: PROJECT_STATUS.indexOf(p.status) >= 0 ? p.status : 'notstarted',
        link: typeof p.link === 'string' ? p.link : '', note: typeof p.note === 'string' ? p.note : ''
      };
    });
  }
  return { ok: true, data: { version: 1, results: results, projects: projects, mocks: mocks, drafts: {}, lastExport: null },
    stats: { results: results.length, mocks: mocks.length, dropped: dropped, projects: Object.keys(projects).length, exportedOn: typeof obj.exportedOn === 'string' ? obj.exportedOn : null } };
}
