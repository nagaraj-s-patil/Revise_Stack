// What changed in the app, newest first. Add a new entry at the top for every update and raise APP_VERSION.
// The Overview shows the newest entry once after an update; the Profile page keeps the full list.
export const APP_VERSION = '1.9';

export const CHANGES = [
  { version: '1.9', date: '2026-11-09', title: 'Learning Path remembers where you were', items: [
    'The phases you left open (and the filter you picked) in the Learning Path stay the same after a refresh or reopening the app.'
  ] },
  { version: '1.8', date: '2026-11-09', title: 'Star importance and prerequisites', items: [
    'Every topic has an importance from 1 to 5, kept in the syllabus files and shown as stars. 5 = must know.',
    'The Learning Path shows the stars and has a 5★ Must know filter.',
    'New "Before this topic" card: what to complete first (for example SELECT before Joins) and whether you are ready.',
    'The same note and your level on the prerequisites are added to the copied prompt, so the AI checks your basics first.'
  ] },
  { version: '1.7', date: '2026-11-08', title: 'I don\'t know this topic', items: [
    'New button on a topic you never studied: it skips the pre-test questions and saves a 0/5 pre-test, so the topic goes to Learn first.',
    'It is not counted in your level or revision, and Undo removes it.'
  ] },
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
