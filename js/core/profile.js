// Profile: the few personal settings (name, target role, city, apply-by date, daily study hours).
// Saved inside the one data document, so Firebase and backups carry it. Missing values fall back to the defaults.
import { DEADLINE } from './config.js';
import { localDate, parseDate } from './dates.js';

export const PROFILE_DEFAULTS = {
  name: '',                                   // empty = use the Google name
  role: 'Java Full Stack Developer (fresher)',
  city: 'Bengaluru',
  deadline: DEADLINE,
  dailyHours: 1
};

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isDay = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && localDate(parseDate(s)) === s;

/** Keep only valid values from saved or imported data. */
export function cleanProfile(p) {
  var out = {};
  if (!p || typeof p !== 'object') return out;
  if (typeof p.name === 'string') out.name = text(p.name, 60);
  if (typeof p.role === 'string' && text(p.role, 80)) out.role = text(p.role, 80);
  if (typeof p.city === 'string' && text(p.city, 60)) out.city = text(p.city, 60);
  if (isDay(p.deadline)) out.deadline = p.deadline;
  var h = Number(p.dailyHours);
  if (isFinite(h) && h >= 0.25 && h <= 16) out.dailyHours = Math.round(h * 4) / 4;
  return out;
}

/** The profile with defaults filled in. */
export function profileOf(data) {
  return Object.assign({}, PROFILE_DEFAULTS, cleanProfile(data && data.profile));
}

export const deadlineOf = data => profileOf(data).deadline;

/** Topics you marked Important: { topicId: true }. Keeps only valid keys. */
export function cleanImportant(o) {
  var out = {}, n = 0;
  if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
  Object.keys(o).forEach(function (k) {
    if (o[k] === true && k.length > 0 && k.length <= 80 && n < 1000) { out[k] = true; n++; }
  });
  return out;
}
