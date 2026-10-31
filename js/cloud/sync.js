// Cloud sync: Firebase Google sign-in plus one Firestore document per person (users/<uid>).
// The browser copy stays as a cache, so the app still opens offline. Firestore is the master copy.
import { FIREBASE_CONFIG, FIREBASE_SDK, cloudEnabled } from './config.js';
import { store, setSaveHook, adoptData } from '../state/store.js';
import { render } from '../ui/render.js';

// status: off (local only) | loading | signedout | synced | saving | offline | error
export const cloud = { status: 'off', user: null, message: '' };

let fb = null;         // loaded SDK pieces
let timer = null;
let dirty = false;

function set(status, message = '') { cloud.status = status; cloud.message = message; render(); }

// A flag remembers that this browser was signed in, so the app opens straight away from its saved copy
// while Firebase loads. The sign-in screen is only shown when nobody is signed in.
const HINT = 'revise-stack-signed-in';
const hint = (v) => { try { if (v === undefined) return localStorage.getItem(HINT) === '1'; v ? localStorage.setItem(HINT, '1') : localStorage.removeItem(HINT); } catch (e) { return false; } return v; };

export const needsLogin = () => cloud.status === 'signedout' || (cloud.status === 'loading' && !hint());

function docRef() { return fb.doc(fb.db, 'users', cloud.user.uid); }

async function push() {
  if (!cloud.user || !fb) return;
  try {
    set('saving');
    await fb.setDoc(docRef(), { json: JSON.stringify(store.data), updatedAt: Date.now() });
    dirty = false;
    set('synced');
  } catch (e) {
    dirty = true;
    set(navigator.onLine ? 'error' : 'offline', e.message);
  }
}

function pushSoon() {
  dirty = true;
  if (!cloud.user) return;
  clearTimeout(timer);
  timer = setTimeout(push, 1500);
}

/** After sign-in: the cloud copy wins. If there is none yet, the browser copy is uploaded. */
async function pull() {
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
      remote.drafts = remote.drafts || {}; remote.projects = remote.projects || {};
      remote.mocks = Array.isArray(remote.mocks) ? remote.mocks : [];
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

export async function signOutNow() { await fb.signOut(fb.auth); }

/** Call once at start, after the browser copy is loaded. */
export async function startCloud() {
  if (!cloudEnabled()) return;
  setSaveHook(pushSoon);
  set('loading');
  try {
    const [app, auth, fs] = await Promise.all([
      import(FIREBASE_SDK + 'firebase-app.js'), import(FIREBASE_SDK + 'firebase-auth.js'), import(FIREBASE_SDK + 'firebase-firestore.js')
    ]);
    const a = app.initializeApp(FIREBASE_CONFIG);
    fb = { auth: auth.getAuth(a), db: fs.getFirestore(a), doc: fs.doc, getDoc: fs.getDoc, setDoc: fs.setDoc,
      GoogleAuthProvider: auth.GoogleAuthProvider, signInWithPopup: auth.signInWithPopup, signOut: auth.signOut };
    auth.onAuthStateChanged(fb.auth, async user => {
      cloud.user = user;
      if (!user) { hint(false); set('signedout'); return; }
      hint(true);
      try { await pull(); set('synced'); } catch (e) { set(navigator.onLine ? 'error' : 'offline', e.message); }
    });
  } catch (e) {
    // The Firebase code could not load (offline, or blocked). Keep working from the browser copy.
    set('offline', 'Could not reach Firebase: ' + e.message);
  }
  window.addEventListener('online', () => { if (dirty && cloud.user) push(); });
}
