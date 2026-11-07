// Cloud sync: Firebase Google sign-in plus one Firestore document per person (users/<uid>).
// The browser copy stays as a cache, so the app still opens offline. Firestore is the master copy.
import { FIREBASE_CONFIG, FIREBASE_DATABASE, FIREBASE_SDK, cloudEnabled } from './config.js';
import { store, setSaveHook, adoptData, wipeLocal } from '../state/store.js';
import { render } from '../ui/render.js';
import { toast } from '../ui/components/toast.js';

// status: off (local only) | loading | signedout | synced | saving | offline | error
export const cloud = { status: 'off', user: null, message: '', syncing: false, lastSync: null };

let fb = null;         // loaded SDK pieces
let timer = null;
const DIRTY = 'revise-stack-unsent';
let dirty = (() => { try { return localStorage.getItem(DIRTY) === '1'; } catch (e) { return false; } })();
function setDirty(v) { dirty = v; try { v ? localStorage.setItem(DIRTY, '1') : localStorage.removeItem(DIRTY); } catch (e) { /* ignore */ } }

// The screen is rebuilt only when it shows sync state (sign-in screen, Backup page). Otherwise saving would redraw the page while you type.
function set(status, message = '') {
  const before = needsLogin();
  cloud.status = status; cloud.message = message;
  if (before || needsLogin() || location.hash === '#backup') render();
}

// A flag remembers that this browser was signed in, so the app opens straight away from its saved copy
// while Firebase loads. The sign-in screen is only shown when nobody is signed in.
const HINT = 'revise-stack-signed-in';
const hint = (v) => { try { if (v === undefined) return localStorage.getItem(HINT) === '1'; v ? localStorage.setItem(HINT, '1') : localStorage.removeItem(HINT); } catch (e) { return false; } return v; };

// cloud.syncing: a device with nothing saved is waiting for its first download. Show a loading screen, not an empty dashboard.
export const needsLogin = () => cloud.status === 'signedout' || (cloud.status === 'loading' && !hint()) || (!!cloud.user && cloud.syncing);

let fsReady = null;   // the small Firestore code loads in the background; only saving and loading wait for it
function docRef() { return fb.doc(fb.db, 'users', cloud.user.uid); }

async function push() {
  if (!cloud.user || !fb) return;
  try {
    set('saving');
    await fsReady;
    await fb.setDoc(docRef(), { json: JSON.stringify(store.data), updatedAt: Date.now() });
    setDirty(false);
    cloud.lastSync = new Date();
    set('synced');
  } catch (e) {
    setDirty(true);
    set(navigator.onLine ? 'error' : 'offline', e.message);
  }
}

function pushSoon() {
  setDirty(true);
  if (!cloud.user) return;
  clearTimeout(timer);
  timer = setTimeout(push, 1500);
}

const byId = (a, b) => { const m = new Map(); for (const x of [...a, ...b]) m.set(x.id, x); return [...m.values()]; };
/** Unsent offline work plus the cloud copy: keep every result and mock from both, and this device's project edits. */
function merge(remote, local) {
  return { ...remote, results: byId(remote.results, local.results), mocks: byId(remote.mocks || [], local.mocks || []),
    projects: { ...(remote.projects || {}), ...(local.projects || {}) }, drafts: local.drafts || {}, profile: { ...(remote.profile || {}), ...(local.profile || {}) }, lastExport: local.lastExport || remote.lastExport || null };
}

/** After sign-in: the cloud copy wins, unless this device has changes not sent yet (then both are merged). If there is none yet, the browser copy is uploaded. */
async function pull() {
  await fsReady;
  const snap = await fb.getDoc(docRef());
  const local = store.data;
  if (snap.exists()) {
    let remote = null;
    try { remote = JSON.parse(snap.data().json); } catch (e) { remote = null; }
    if (remote && Array.isArray(remote.results)) {
      if (local.results.length && JSON.stringify(local.results) !== JSON.stringify(remote.results)) {
        // keep the browser copy aside so nothing is lost if the choice was wrong
        try { localStorage.setItem('jfs-tracker-v1-before-cloud', JSON.stringify(local)); } catch (e) { /* ignore */ }
      }
      remote.drafts = remote.drafts || {}; remote.projects = remote.projects || {}; remote.profile = remote.profile || {};
      remote.mocks = Array.isArray(remote.mocks) ? remote.mocks : [];
      if (dirty) { adoptData(merge(remote, local)); await push(); return; }
      adoptData(remote);
      return;
    }
  }
  await push();
}

export async function signIn() {
  try {
    set('loading');
    await fb.signInWithPopup(fb.auth, new fb.GoogleAuthProvider());
  } catch (e) {
    set('signedout', 'Sign-in did not finish: ' + e.message);
  }
}

/** Sign out. Unsent changes are uploaded first; if that fails, stay signed in so nothing is lost. Then the device copy is cleared. */
export async function signOutNow() {
  if (!cloud.user || !fb) return;
  if (!confirm('Sign out of Revise Stack? Your progress stays safe online.')) return;
  clearTimeout(timer);
  if (dirty) {
    await push();
    if (dirty) { alert('Some changes are not saved online yet. Connect to the internet and try again, so nothing is lost.'); return; }
  }
  await fb.signOut(fb.auth);
  wipeLocal();
  render();
}

/** "Upload now": send this device's data to Firebase right now. It replaces the online copy with this device's data. */
export async function syncNow() {
  if (!cloud.user || !fb) return;
  if (!navigator.onLine) { set('offline'); toast('No internet. Your data is safe on this device. Try again when you are online.', 'error'); return; }
  clearTimeout(timer);
  try {
    await fsReady;
    if (!store.data.results.length) {   // never wipe the online copy with an empty device
      const snap = await fb.getDoc(docRef());
      let online = null;
      try { online = snap.exists() ? JSON.parse(snap.data().json) : null; } catch (e) { online = null; }
      if (online && online.results && online.results.length) {
        toast('This device has no results, but your online copy has ' + online.results.length + '. Not uploaded, so nothing is erased. Sign out and sign in to download it.', 'error');
        return;
      }
    }
  } catch (e) { toast('Could not reach Firebase: ' + e.message, 'error'); return; }
  await push();
  if (dirty) toast('Could not upload: ' + (cloud.message || 'unknown error') + '. Your data is safe on this device.', 'error');
  else toast('Uploaded to Firebase (' + store.data.results.length + ' results).');
}

export const displayName = fallback => (cloud.user && (cloud.user.displayName || cloud.user.email)) || fallback;

/** Call once at start, after the browser copy is loaded. */
export async function startCloud() {
  if (!cloudEnabled()) return;
  setSaveHook(pushSoon);
  set('loading');
  try {
    // Sign-in needs only app + auth. Firestore (lite build: we only read and write one document) loads alongside.
    const fsLoad = import(FIREBASE_SDK + 'firebase-firestore-lite.js');
    fsLoad.catch(() => {});
    const [app, auth] = await Promise.all([import(FIREBASE_SDK + 'firebase-app.js'), import(FIREBASE_SDK + 'firebase-auth.js')]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    fb = { auth: auth.getAuth(a), GoogleAuthProvider: auth.GoogleAuthProvider, signInWithPopup: auth.signInWithPopup, signOut: auth.signOut };
    fsReady = fsLoad.then(fs => { fb.db = FIREBASE_DATABASE && FIREBASE_DATABASE !== '(default)' ? fs.getFirestore(a, FIREBASE_DATABASE) : fs.getFirestore(a); fb.doc = fs.doc; fb.getDoc = fs.getDoc; fb.setDoc = fs.setDoc; });
    auth.onAuthStateChanged(fb.auth, async user => {
      cloud.user = user;
      if (!user) { hint(false); cloud.syncing = false; set('signedout'); return; }
      hint(true);
      cloud.syncing = !store.data.results.length;
      if (cloud.syncing) render();
      try { await pull(); cloud.syncing = false; set('synced'); render(); }
      catch (e) { cloud.syncing = false; set(navigator.onLine ? 'error' : 'offline', e.message); render(); }
    });
  } catch (e) {
    // The Firebase code could not load (offline, or blocked). Keep working from the browser copy.
    set('offline', 'Could not reach Firebase: ' + e.message);
  }
  window.addEventListener('online', () => { if (dirty && cloud.user) push(); });
}
