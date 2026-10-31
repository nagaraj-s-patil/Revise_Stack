// Calendar-day helpers. Every date is a local YYYY-MM-DD string, never a timestamp.

export function pad(n) { return (n < 10 ? '0' : '') + n; }

export function localDate(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

export function parseDate(s) {
  var p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

export function addDays(s, n) {
  var d = parseDate(s);
  d.setDate(d.getDate() + n);   // calendar arithmetic, safe across clock changes
  return localDate(d);
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(s) { var d = parseDate(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }

// Today's local calendar day. Everything that depends on "now" goes through this one function.
export function today() { return localDate(); }
