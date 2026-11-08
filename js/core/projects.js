// Projects you add yourself, next to the three built-in ones. Same shape: id, name, stack, needs (phase numbers).
// Saved in the data document as customProjects, so Firebase and backups carry them.
export const MAX_CUSTOM = 20;

const text = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** Keep only well-formed custom projects. */
export function cleanCustomProjects(list) {
  var out = [], seen = {};
  (Array.isArray(list) ? list : []).forEach(function (p) {
    if (!p || typeof p !== 'object') return;
    var id = text(p.id, 40), name = text(p.name, 80);
    if (!id || !name || seen[id]) return;
    seen[id] = true;
    var needs = (Array.isArray(p.needs) ? p.needs : []).filter(function (n) { return Number.isInteger(n) && n > 0 && n < 100; });
    out.push({ id: id, name: name, stack: text(p.stack, 120), needs: needs.filter(function (n, i) { return needs.indexOf(n) === i; }), custom: true });
  });
  return out.slice(0, MAX_CUSTOM);
}

/** Built-in projects followed by your own. */
export function allProjects(builtIn, data) {
  return builtIn.concat(cleanCustomProjects(data && data.customProjects));
}

/** Old data had a Quick test (5 questions, counted). Quick is gone: those results become pre-tests. Returns true if anything changed. */
export function migrateModes(data) {
  var changed = false;
  (data && Array.isArray(data.results) ? data.results : []).forEach(function (r) {
    if (r && r.mode === 'quick') { r.mode = 'pre'; changed = true; }
  });
  return changed;
}
