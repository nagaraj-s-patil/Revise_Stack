// Streak counting. One missed day per week is forgiven, two in a row break it.
import { addDays, parseDate } from './dates.js';

export function weekStart(s) {                 // Monday of the week that contains s
  var dow = (parseDate(s).getDay() + 6) % 7;
  return addDays(s, -dow);
}

// Any saved test or revision counts as a study day. One missed day per week is forgiven
// (it does not add to the streak, but it does not break it). Two missed days in a row break it.
export function streakInfo(results, today) {
  var days = {}, min = null;
  results.forEach(function (r) { days[r.date] = true; if (min === null || r.date < min) min = r.date; });
  var info = { streak: 0, studiedToday: !!days[today], missed: 0, weekDays: 0 };
  var ws = weekStart(today);
  for (var i = 0; i < 7; i++) if (days[addDays(ws, i)]) info.weekDays++;
  if (min === null) return info;

  var d = addDays(today, -1);
  while (d >= min && !days[d]) { info.missed++; d = addDays(d, -1); }

  var cur = info.studiedToday ? today : addDays(today, -1);
  var usedWeek = {}, prevMissed = false;
  while (cur >= min) {
    if (days[cur]) { info.streak++; prevMissed = false; }
    else {
      var wk = weekStart(cur);
      if (prevMissed || usedWeek[wk]) break;
      usedWeek[wk] = true; prevMissed = true;
    }
    cur = addDays(cur, -1);
  }
  return info;
}
