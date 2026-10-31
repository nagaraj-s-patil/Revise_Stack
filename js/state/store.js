// Everything the user has saved. One JSON document in localStorage.
//   results   every saved test (levels and due dates are worked out from these, never stored)
//   projects  status, repository link and note per project id
//   mocks     mock interview scores
//   drafts    unsaved pasted AI replies, so an app switch does not lose them
//   lastExport  day of the last backup copy
// The storage key keeps its first name on purpose, so earlier progress is still found.

const KEY = 'jfs-tracker-v1';

export const store = { data: emptyData(), storageOk: true };

export function emptyData() {
  return { version: 1, results: [], projects: {}, mocks: [], drafts: {}, lastExport: null };
}

function probe() {
  try { localStorage.setItem('jfs-probe', '1'); localStorage.removeItem('jfs-probe'); return true; }
  catch (e) { return false; }
}

function read() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { store.storageOk = false; return emptyData(); }
  if (!raw) return emptyData();
  try {
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.results)) throw new Error('shape');
    d.drafts = d.drafts || {};
    d.projects = d.projects || {};
    d.mocks = Array.isArray(d.mocks) ? d.mocks : [];
    return d;
  } catch (e) {
    // keep the unreadable data instead of overwriting it
    try { localStorage.setItem(KEY + '-unreadable', raw); } catch (e2) { /* nothing more to do */ }
    return emptyData();
  }
}

/** Read saved data into the store. Call once at start. */
export function loadStore() {
  store.storageOk = probe();
  store.data = read();
}

/** Write the store to localStorage. Returns false if the browser refused. */
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store.data)); return true; }
  catch (e) { store.storageOk = false; return false; }
}

/** Replace everything (used by restore). Returns whether it could be saved. */
export function replaceData(next) {
  store.data = next;
  return save();
}
