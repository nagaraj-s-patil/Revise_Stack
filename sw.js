// Service worker: keeps a copy of the app on the phone so it opens offline.
// Strategy: network first (you always get the newest files when online), cache as the fallback.
// The file list and the version are written by `npm run precache`. Do not edit between the markers.

// BEGIN GENERATED
const VERSION = "012ba1d895";
const PRECACHE = [
  "./",
  "assets/fonts/jetbrains-mono-latin-400-normal.woff2",
  "assets/fonts/jetbrains-mono-latin-600-normal.woff2",
  "assets/fonts/plus-jakarta-sans-latin-400-normal.woff2",
  "assets/fonts/plus-jakarta-sans-latin-600-normal.woff2",
  "assets/fonts/plus-jakarta-sans-latin-700-normal.woff2",
  "assets/fonts/plus-jakarta-sans-latin-800-normal.woff2",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/favicon-16.png",
  "assets/icons/favicon-32.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/mark-96.png",
  "css/base.css",
  "css/components.css",
  "css/dashboard.css",
  "css/fonts.css",
  "css/layout.css",
  "css/pages.css",
  "css/tokens.css",
  "data/projects.json",
  "data/syllabus/index.json",
  "data/syllabus/phase-01-programming-fundamentals.json",
  "data/syllabus/phase-02-core-java.json",
  "data/syllabus/phase-03-git-and-software-development-workflow.json",
  "data/syllabus/phase-04-sql-and-databases.json",
  "data/syllabus/phase-05-html-css-and-javascript.json",
  "data/syllabus/phase-06-jdbc-hibernate-and-jpa.json",
  "data/syllabus/phase-07-spring-boot-and-rest-apis.json",
  "data/syllabus/phase-08-security-and-testing.json",
  "data/syllabus/phase-09-react-and-typescript.json",
  "data/syllabus/phase-11-devops-and-cloud.json",
  "data/syllabus/phase-12-advanced-skills.json",
  "favicon.ico",
  "index.html",
  "js/app.js",
  "js/boot-guard.js",
  "js/cloud/config.js",
  "js/cloud/sync.js",
  "js/core/backup.js",
  "js/core/config.js",
  "js/core/dates.js",
  "js/core/index.js",
  "js/core/levels.js",
  "js/core/mistakes.js",
  "js/core/mock.js",
  "js/core/parser.js",
  "js/core/plan.js",
  "js/core/progress.js",
  "js/core/prompts.js",
  "js/core/spotcheck.js",
  "js/core/streak.js",
  "js/core/summary.js",
  "js/data/syllabus.js",
  "js/pages/backup.js",
  "js/pages/interview.js",
  "js/pages/progress.js",
  "js/pages/projects.js",
  "js/pages/signin.js",
  "js/pages/syllabus.js",
  "js/pages/today.js",
  "js/pages/topic.js",
  "js/pwa.js",
  "js/shell.js",
  "js/state/context.js",
  "js/state/selectors.js",
  "js/state/session.js",
  "js/state/store.js",
  "js/ui/components/badge.js",
  "js/ui/components/dashboard.js",
  "js/ui/components/header.js",
  "js/ui/components/hero-art.js",
  "js/ui/components/history.js",
  "js/ui/components/icons.js",
  "js/ui/components/install-card.js",
  "js/ui/components/nav.js",
  "js/ui/components/result-flow.js",
  "js/ui/components/study.js",
  "js/ui/dom.js",
  "js/ui/draft.js",
  "js/ui/format.js",
  "js/ui/messages.js",
  "js/ui/render.js",
  "js/ui/router.js",
  "manifest.webmanifest"
];
// END GENERATED

const CACHE = 'revise-stack-' + VERSION;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('revise-stack-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then(hit => {
          if (hit) return hit;
          // opening the app offline from the home screen: serve the page itself
          if (request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
  );
});
