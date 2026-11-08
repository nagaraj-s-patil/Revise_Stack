// What changed in the app, newest first. Add a new entry at the top for every update and raise APP_VERSION.
// The Overview shows the newest entry once after an update; the Profile page keeps the full list.
export const APP_VERSION = '1.6';

export const CHANGES = [
  { version: '1.6', date: '2026-11-08', title: 'Cleaner tests, your own projects', items: [
    'Quick test is gone. Old Quick results were converted to pre-tests, so those topics need a Full test to count again.',
    'A pre-test can be taken only once per topic.',
    'Add your own project on the Projects page.',
    'Prompt, score entry and tables now have Show / Hide buttons.',
    'This What\'s new section.'
  ] },
  { version: '1.5', date: '2026-11-08', title: 'Profile and Analysis', items: [
    'Profile page: name, role, city, apply-by date, study hours. Click Edit to change them.',
    'Analysis page: completion donut, pace to your date, phase bars, weekly trends and test mix.'
  ] },
  { version: '1.4', date: '2026-11-07', title: 'Online storage and pre-tests', items: [
    'Progress is saved online with Firebase, with an offline copy on the device. Upload now sends it by hand.',
    'Pre-tests do not count in level, Done or revision. Weak ones show under Learn first.',
    'New orange and black logo and theme, animations, sign out.'
  ] }
];
