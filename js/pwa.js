// Install support: registers the service worker (offline use) and tracks whether the app can be installed.
// Android and desktop Chrome offer a real install prompt. iPhone has none, so we show the manual steps.
import { render } from './ui/render.js';

const DISMISS_KEY = 'revise-stack-install-dismissed';
let deferredPrompt = null;

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIos() {
  const ua = navigator.userAgent || '';
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** What the install card should offer right now. */
export function installOptions() {
  return { installed: isStandalone(), canPrompt: !!deferredPrompt, ios: isIos() && !isStandalone() };
}

export function installDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
}

export function dismissInstall() {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* the card just comes back next visit */ }
}

/** Show the browser's install dialog. Resolves 'accepted', 'dismissed' or 'unavailable'. */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  deferredPrompt = null;
  event.prompt();
  const choice = await event.userChoice.catch(() => ({ outcome: 'dismissed' }));
  render();
  return choice.outcome;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('Offline support is off:', err.message));
}

/** Call once at start. */
export function startPwa() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();   // keep the event so our own button can use it
    deferredPrompt = event;
    render();
  });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; render(); });
  registerServiceWorker();
}
