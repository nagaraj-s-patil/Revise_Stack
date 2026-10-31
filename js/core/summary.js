// Builds the progress summary text that you paste into an AI chat to plan your session.
import { parseDate, shortDate } from './dates.js';
import { repeatedMistakes } from './mistakes.js';
import { buildQueue } from './plan.js';
import { allTopics, countLevels } from './progress.js';

// Text to paste into ChatGPT or Claude so the AI can plan the session and write the next test.
export function buildSummary(c) {
  var days = Math.round((parseDate(c.deadline) - parseDate(c.today)) / 86400000);
  var core = allTopics(c.phases, true);
  var counts = countLevels(core, c.states);
  var queue = buildQueue(c.phases, c.states, c.today);
  var L2 = [];
  function entry(t, s) {
    var l = s.last;
    var line = '- ' + t.name + ' [' + t.id + ']: ' + l.score + '/' + l.total + ' on ' + shortDate(l.date);
    if (l.weakPoints && l.weakPoints.length) line += '. Weak points: ' + l.weakPoints.join('; ');
    if (l.nextStep) line += '. Next step: ' + l.nextStep;
    return line;
  }
  function section(title, items, max) {
    if (!items.length) return;
    L2.push('', title + ' (' + items.length + '):');
    items.slice(0, max).forEach(function (x) { L2.push(x); });
    if (items.length > max) L2.push('- and ' + (items.length - max) + ' more');
  }
  var all = [];
  c.phases.forEach(function (p) { p.topics.forEach(function (t) { all.push({ t: t, p: p, s: c.states[t.id] }); }); });

  L2.push('MY JAVA FULL STACK PROGRESS (' + shortDate(c.today) + ')');
  L2.push('Goal: Java Full Stack fresher job in Bengaluru. Ready to apply by ' + shortDate(c.deadline) + ' (' + Math.max(days, 0) + ' days left).');
  L2.push('Time I have today: ' + c.timeText + '.');
  L2.push('Streak: ' + c.streak.streak + ' days. Studied this week: ' + c.streak.weekDays + '/7.' + (c.streak.missed ? ' Days missed in a row: ' + c.streak.missed + '.' : ''));
  L2.push('', 'CORE TOPICS (' + core.length + '): ' + counts.done + ' Done, ' + counts.strong + ' Strong, ' + counts.ok + ' OK, ' + counts.weak + ' Weak, ' + counts.untested + ' Untested.');

  section('WEAK', all.filter(function (x) { return x.s.level === 'weak'; }).map(function (x) { return entry(x.t, x.s); }), 10);
  section('OK', all.filter(function (x) { return x.s.level === 'ok'; }).map(function (x) { return entry(x.t, x.s); }), 8);
  section('DUE FOR REVISION TODAY', queue.filter(function (q) { return q.kind === 'revision'; })
    .map(function (q) { return '- ' + q.topic.name + ' [' + q.topic.id + '] (' + q.state.level + ', due ' + shortDate(q.state.due) + ')'; }), 10);
  section('DONE', all.filter(function (x) { return x.s.level === 'done'; }).map(function (x) { return '- ' + x.t.name; }), 20);

  var untested = [];
  c.phases.forEach(function (p) {
    var n = p.topics.filter(function (t) { return t.core && c.states[t.id].level === 'untested'; }).length;
    if (n) untested.push('- Phase ' + p.number + ' ' + p.name + ': ' + n + ' topics');
  });
  section('NOT TESTED YET (core)', untested, 12);

  section('MISTAKES THAT KEEP COMING BACK', repeatedMistakes(c.phases, c.results, 8).map(function (m) {
    return '- ' + m.topic.name + ' [' + m.topic.id + ']: ' + m.text + ' (' + m.count + ' tests)';
  }), 8);

  var projLines = c.projectList.map(function (p) {
    var ps = c.projectState[p.id] || { status: 'notstarted' };
    var label = ps.status === 'done' ? 'done' : ps.status === 'building' ? 'building' : 'not started';
    return '- ' + p.name + ' (' + p.stack + '): ' + label;
  });
  section('PROJECTS', projLines, 5);

  var recent = c.results.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1); }).slice(0, 5)
    .map(function (r) {
      var info = c.byId[r.topicId];
      return '- ' + shortDate(r.date) + ': ' + (info ? info.name : r.topicId) + ' ' + r.score + '/' + r.total;
    });
  section('RECENT TESTS', recent, 5);
  section('MOCK INTERVIEWS', (c.mocks || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).slice(0, 3).map(function (m) {
    return '- ' + shortDate(m.date) + ': ' + m.score + '/' + m.total + (m.weakPoints && m.weakPoints.length ? '. Weak: ' + m.weakPoints.join('; ') : '');
  }), 3);

  L2.push('', 'WHAT I WANT FROM YOU',
    '1. Plan my session for the time I have today. Order: revisions due first, then Weak topics, then new topics in this order: Java, SQL, Git, JDBC/JPA, Spring Boot, JavaScript, React, Testing.',
    '2. Tell me which topics to do and roughly how long each one takes.',
    '3. Start the first one now: ask ONE question at a time, grade strictly, give no hints before I answer.',
    '4. When that test ends, print this block exactly once, filled in, as the last thing in your reply (use the topic ID in square brackets above). Do not write a level; my tracker works that out.',
    '',
    'RESULT_START',
    'topic_id: <topic id>',
    'mode: <quick or full>',
    'score: <number correct>/<total questions>',
    'weak_points: <short list separated by semicolons, or none>',
    'next_step: <one concrete practice task>',
    'RESULT_END');
  return L2.join('\n');
}
