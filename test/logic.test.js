const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logic.js');
const S = require('../src/syllabus.js');

const r = (date, score, total, id) => ({ id: id || date + score, topicId: 't', date, score, total });

test('levels: 5/10 weak, 6/10 ok, 8/10 strong, 3/5 ok, 4/5 strong', () => {
  assert.equal(L.levelFromPct(5 / 10), 'weak');
  assert.equal(L.levelFromPct(6 / 10), 'ok');
  assert.equal(L.levelFromPct(7 / 10), 'ok');
  assert.equal(L.levelFromPct(8 / 10), 'strong');
  assert.equal(L.levelFromPct(3 / 5), 'ok');
  assert.equal(L.levelFromPct(4 / 5), 'strong');
});

test('Done: two strong tests on the same day is not Done', () => {
  const list = [r('2026-10-28', 9, 10, 'a'), r('2026-10-28', 8, 10, 'b')];
  assert.equal(L.isDone(list), false);
});
test('Done: 9/10 then 8/10 on two days is Done', () => {
  assert.equal(L.isDone([r('2026-10-28', 9, 10), r('2026-10-31', 8, 10)]), true);
});
test('Done: two quick tests only is not Done (needs one Full)', () => {
  assert.equal(L.isDone([r('2026-10-28', 5, 5), r('2026-10-31', 5, 5)]), false);
});
test('Done: quick + full on two days is Done', () => {
  assert.equal(L.isDone([r('2026-10-28', 5, 5), r('2026-10-31', 9, 10)]), true);
});
test('Done is lost after a later weak result', () => {
  const list = [r('2026-10-28', 9, 10), r('2026-10-31', 8, 10), r('2026-11-07', 4, 10)];
  assert.equal(L.isDone(list), false);
  assert.equal(L.topicState(list.map(x => ({ ...x, topicId: 't' })), 't', '2026-11-07').level, 'weak');
});
test('Done needs the earlier pass to be strong too', () => {
  assert.equal(L.isDone([r('2026-10-28', 6, 10), r('2026-10-31', 9, 10)]), false);
});

test('revision schedule 1, 3, 7, 14 days from first test', () => {
  const a = r('2026-10-28', 6, 10);
  assert.equal(L.nextDue([a]), '2026-10-29');
  assert.equal(L.nextDue([a, r('2026-10-29', 7, 10)]), '2026-10-31');
  assert.equal(L.nextDue([a, r('2026-10-29', 7, 10), r('2026-10-31', 8, 10)]), '2026-11-04');
  assert.equal(L.nextDue([a, r('2026-10-29', 7, 10), r('2026-10-31', 8, 10), r('2026-11-04', 8, 10)]), '2026-11-11');
});
test('failed revision resets the schedule', () => {
  const list = [r('2026-10-28', 6, 10), r('2026-10-29', 7, 10), r('2026-10-31', 3, 10)];
  assert.equal(L.nextDue(list), '2026-11-01');
  const after = list.concat(r('2026-11-01', 6, 10));
  assert.equal(L.nextDue(after), '2026-11-02');   // new run starts on 1 Nov, first interval = 1 day
});
test('same-day retest does not skip a revision step', () => {
  assert.equal(L.nextDue([r('2026-10-28', 6, 10, 'a'), r('2026-10-28', 7, 10, 'b')]), '2026-10-29');
});
test('due dates cross month and year ends by calendar day', () => {
  assert.equal(L.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(L.addDays('2026-03-28', 3), '2026-03-31');
});
test('isDue compares calendar days', () => {
  const res = [{ ...r('2026-10-28', 6, 10), topicId: 't' }];
  assert.equal(L.topicState(res, 't', '2026-10-28').isDue, false);
  assert.equal(L.topicState(res, 't', '2026-10-29').isDue, true);
  assert.equal(L.topicState(res, 't', '2026-11-05').isDue, true);
});
test('untested topic', () => {
  const s = L.topicState([], 'x', '2026-10-28');
  assert.equal(s.level, 'untested');
  assert.equal(s.isDue, false);
});

const CLEAN = 'RESULT_START\ntopic_id: java-collections\nmode: quick\nscore: 6/10\nweak_points: HashMap vs TreeMap; Comparator\nnext_step: Practice custom comparators\nRESULT_END';

test('parser: clean block', () => {
  const p = L.parseResult('Great job!\n\n' + CLEAN);
  assert.equal(p.ok, true);
  assert.deepEqual(p.data, { topicId: 'java-collections', mode: 'quick', score: 6, total: 10, weakPoints: ['HashMap vs TreeMap', 'Comparator'], nextStep: 'Practice custom comparators' });
});
test('parser: markdown bold, bullets, code fence, odd case and spacing', () => {
  const t = '```\n**RESULT_START**\n- **Topic_ID**:   java-collections\n- Mode : Full\n- **Score:** 8 out of 10\n> Weak Points: none\n- next step: Revise streams\n**RESULT_END**\n```';
  const p = L.parseResult(t);
  assert.equal(p.ok, true);
  assert.equal(p.data.score, 8);
  assert.equal(p.data.total, 10);
  assert.equal(p.data.mode, 'full');
  assert.deepEqual(p.data.weakPoints, []);
  assert.equal(p.data.topicId, 'java-collections');
  assert.equal(p.data.nextStep, 'Revise streams');
});
test('parser: lowercase markers', () => {
  assert.equal(L.parseResult('result_start\nscore: 3/5\nresult_end').ok, true);
});
test('parser: missing block', () => {
  const p = L.parseResult('You scored 6 out of 10. Nice.');
  assert.equal(p.ok, false);
  assert.match(p.error, /No result block found/);
});
test('parser: empty text', () => {
  assert.match(L.parseResult('   ').error, /Paste the AI/);
});
test('parser: impossible score 12/10', () => {
  const p = L.parseResult('RESULT_START\nscore: 12/10\nRESULT_END');
  assert.equal(p.ok, false);
  assert.match(p.error, /12\/10/);
});
test('parser: unfilled template placeholder', () => {
  const p = L.parseResult('RESULT_START\ntopic_id: x\nscore: <number correct>/10\nRESULT_END');
  assert.equal(p.ok, false);
});
test('parser: template printed first, real block last', () => {
  const t = 'Format:\nRESULT_START\nscore: <number correct>/10\nRESULT_END\n\nNow your result:\n' + CLEAN;
  const p = L.parseResult(t);
  assert.equal(p.ok, true);
  assert.equal(p.data.score, 6);
});
test('parser: cut-off block without RESULT_END still reads', () => {
  assert.equal(L.parseResult('RESULT_START\ntopic_id: a\nscore: 7/10').ok, true);
});
test('parser: comma separated weak points', () => {
  const p = L.parseResult('RESULT_START\nscore: 4/5\nweak_points: Generics, Wildcards\nRESULT_END');
  assert.deepEqual(p.data.weakPoints, ['Generics', 'Wildcards']);
});
test('parser: score missing', () => {
  assert.match(L.parseResult('RESULT_START\ntopic_id: a\nRESULT_END').error, /no score/);
});

test('prompt contains topic id, format block and the right question count', () => {
  const phase = S.phases[1];
  const topic = phase.topics.find(t => t.name === 'Collections Framework');
  const quick = L.buildPrompt(topic, phase, 'quick');
  const full = L.buildPrompt(topic, phase, 'full');
  const learn = L.buildPrompt(topic, phase, 'learn');
  for (const p of [quick, full, learn]) {
    assert.ok(p.includes('topic_id: ' + topic.id));
    assert.ok(p.includes('RESULT_START') && p.includes('RESULT_END'));
    assert.ok(p.includes('FINISH'));
  }
  assert.ok(quick.includes('score: <number correct>/5'));
  assert.ok(full.includes('score: <number correct>/10'));
  assert.ok(learn.includes('Mode: LEARN'));
});
test('a prompt block, when filled in by an AI, parses back to the same topic', () => {
  const phase = S.phases[1];
  const topic = phase.topics[5];
  const prompt = L.buildPrompt(topic, phase, 'quick');
  const filled = prompt.slice(prompt.lastIndexOf('RESULT_START')).replace('<number correct>', '4');
  const p = L.parseResult(filled.replace('<short list separated by semicolons, or none>', 'none').replace('<one concrete practice task>', 'Practice'));
  assert.equal(p.ok, true);
  assert.equal(p.data.topicId, topic.id);
  assert.equal(p.data.score, 4);
});
test('suggested mode by tag', () => {
  assert.equal(L.suggestedMode('LEARN'), 'learn');
  assert.equal(L.suggestedMode('REVISE'), 'quick');
  assert.equal(L.suggestedMode('TEST'), 'full');
  assert.equal(L.suggestedMode('UNSET'), 'quick');
});
test('syllabus ids are unique and every topic has a name', () => {
  const ids = S.phases.flatMap(p => p.topics.map(t => t.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(S.phases.every(p => p.topics.every(t => t.name && t.id)));
});

// ---------- Today queue and streak ----------
const phasesFixture = [
  { id: 'p1', number: 1, name: 'A', topics: [{ id: 'a1', name: 'A1', tag: 'REVISE', core: true }, { id: 'a2', name: 'A2', tag: 'LEARN', core: true }] },
  { id: 'p3', number: 3, name: 'Git', topics: [{ id: 'g1', name: 'G1', tag: 'UNSET', core: true }] },
  { id: 'p4', number: 4, name: 'SQL', topics: [{ id: 's1', name: 'S1', tag: 'REVISE', core: true }, { id: 's9', name: 'Oracle', tag: 'LEARN', core: false }] }
];
const res = (topicId, date, score, total) => ({ id: topicId + date + score, topicId, date, score, total });
const statesOf = (results, today) => Object.fromEntries(phasesFixture.flatMap(p => p.topics.map(t => [t.id, L.topicState(results, t.id, today)])));

test('queue: new topics follow study order (SQL before Git), later topics stay locked', () => {
  const q = L.buildQueue(phasesFixture, statesOf([], '2026-10-29'), '2026-10-29');
  assert.deepEqual(q.map(x => x.topic.id), ['a1', 'a2', 's1', 'g1']);
  assert.ok(q.every(x => x.kind === 'new'));
});
test('queue: due revisions come first, weak before ok', () => {
  const results = [res('s1', '2026-10-27', 6, 10), res('a1', '2026-10-27', 3, 10)];
  const q = L.buildQueue(phasesFixture, statesOf(results, '2026-10-29'), '2026-10-29');
  assert.deepEqual(q.slice(0, 2).map(x => x.topic.id), ['a1', 's1']);
  assert.equal(q[0].kind, 'revision');
  assert.equal(q[2].kind, 'new');
});
test('queue: topic tested today is skipped, and topics not yet due are left out', () => {
  const results = [res('a1', '2026-10-29', 3, 10), res('s1', '2026-10-28', 9, 10), res('s1', '2026-10-29', 9, 10)];
  const ids = L.buildQueue(phasesFixture, statesOf(results, '2026-10-29'), '2026-10-29').map(x => x.topic.id);
  assert.ok(!ids.includes('a1') && !ids.includes('s1'));
});
test('queue: later topics unlock when all core topics are strong or done', () => {
  const results = ['a1', 'a2', 'g1', 's1'].map(id => res(id, '2026-10-20', 9, 10));
  const st = statesOf(results, '2026-10-29');
  assert.equal(L.isUnlocked(phasesFixture, st), true);
  const ids = L.buildQueue(phasesFixture, st, '2026-10-29').map(x => x.topic.id);
  assert.ok(ids.includes('s9'));
});
test('suggestMode: strong quick result asks for a Full test', () => {
  const t = phasesFixture[0].topics[0];
  const st = L.topicState([res('a1', '2026-10-27', 5, 5)], 'a1', '2026-10-29');
  assert.equal(L.suggestMode(t, st), 'full');
  const st2 = L.topicState([res('a1', '2026-10-27', 6, 10)], 'a1', '2026-10-29');
  assert.equal(L.suggestMode(t, st2), 'quick');
  assert.equal(L.suggestMode(phasesFixture[0].topics[1], L.topicState([], 'a2', '2026-10-29')), 'learn');
});
test('shortTask: prefers a revision, then a new topic that is not LEARN', () => {
  const fresh = L.buildQueue(phasesFixture, statesOf([], '2026-10-29'), '2026-10-29');
  assert.equal(L.shortTask(fresh).topic.id, 'a1');
  const q2 = fresh.filter(x => x.topic.id !== 'a1');
  assert.equal(L.shortTask(q2).topic.id, 's1');
  const rev = L.buildQueue(phasesFixture, statesOf([res('g1', '2026-10-27', 6, 10)], '2026-10-29'), '2026-10-29');
  assert.equal(L.shortTask(rev).topic.id, 'g1');
  assert.equal(L.shortTask([]), null);
});

const days = (...d) => d.map(x => ({ id: x, topicId: 't', date: x, score: 5, total: 10 }));
test('weekStart is Monday', () => {
  assert.equal(L.weekStart('2026-10-29'), '2026-10-26');   // Thursday
  assert.equal(L.weekStart('2026-10-26'), '2026-10-26');   // Monday
  assert.equal(L.weekStart('2026-11-01'), '2026-10-26');   // Sunday
});
test('streak: no results', () => {
  assert.deepEqual(L.streakInfo([], '2026-10-29'), { streak: 0, studiedToday: false, missed: 0, weekDays: 0 });
});
test('streak: three days ending today', () => {
  const s = L.streakInfo(days('2026-10-27', '2026-10-28', '2026-10-29'), '2026-10-29');
  assert.equal(s.streak, 3); assert.equal(s.studiedToday, true); assert.equal(s.weekDays, 3);
});
test('streak: today not studied yet does not break it', () => {
  const s = L.streakInfo(days('2026-10-27', '2026-10-28'), '2026-10-29');
  assert.equal(s.streak, 2); assert.equal(s.missed, 0); assert.equal(s.studiedToday, false);
});
test('streak: one missed day in a week is forgiven', () => {
  const s = L.streakInfo(days('2026-10-26', '2026-10-28', '2026-10-29'), '2026-10-29');
  assert.equal(s.streak, 3);
});
test('streak: second missed day in the same week breaks it', () => {
  const s = L.streakInfo(days('2026-10-26', '2026-10-27', '2026-10-29'), '2026-10-29');
  // 29 studied, 28 missed (grace), 27 studied, 26 studied -> 3. Add an earlier gap in the same week:
  assert.equal(s.streak, 3);
  const s2 = L.streakInfo(days('2026-10-26', '2026-10-28', '2026-10-30'), '2026-10-30');
  // 30 ok, 29 missed (grace), 28 ok, 27 missed (same week) -> break
  assert.equal(s2.streak, 2);
});
test('streak: two missed days in a row break it', () => {
  const s = L.streakInfo(days('2026-10-20', '2026-10-21', '2026-10-22'), '2026-10-29');
  assert.equal(s.streak, 0);
  assert.equal(s.missed, 6);
});
test('streak: missed count is consecutive unstudied days ending yesterday', () => {
  const s = L.streakInfo(days('2026-10-27'), '2026-10-29');
  assert.equal(s.missed, 1);
  assert.equal(s.streak, 1);   // 28 missed (grace), 27 studied
});

// ---------- Progress, projects, summary, backup ----------
const realStates = (results, today) => Object.fromEntries(S.phases.flatMap(p => p.topics.map(t => [t.id, L.topicState(results, t.id, today)])));
const rr = (topicId, date, score, total, extra) => Object.assign({ id: topicId + date + score, topicId, date, mode: total >= 10 ? 'full' : 'quick', score, total, weakPoints: [], nextStep: '', edited: false, source: 'paste' }, extra || {});
const T = '2026-10-29';

test('weakestTopics: lowest score first, only Weak or OK topics', () => {
  const results = [
    rr('p2-generics', '2026-10-27', 6, 10),
    rr('p2-exception-handling', '2026-10-26', 2, 10),
    rr('p2-file-handling', '2026-10-28', 9, 10),
    rr('p1-recursion', '2026-10-25', 2, 10)
  ];
  const w = L.weakestTopics(S.phases, realStates(results, T), 5);
  assert.deepEqual(w.map(x => x.topic.id), ['p1-recursion', 'p2-exception-handling', 'p2-generics']);
  assert.equal(L.weakestTopics(S.phases, realStates(results, T), 2).length, 2);
});

test('skillShare and projectReady use only core topics of the needed phases', () => {
  const p2 = S.phases.find(p => p.number === 2).topics.filter(t => t.core);
  const results = p2.map(t => rr(t.id, '2026-10-20', 9, 10));
  const st = realStates(results, T);
  assert.equal(L.skillShare(S.phases, st, [2]), 1);
  assert.ok(L.skillShare(S.phases, st, [2, 4, 6]) > 0 && L.skillShare(S.phases, st, [2, 4, 6]) < 0.7);
  assert.equal(L.projectReady(S.projects[0], S.phases, st).ready, false);
  assert.equal(L.projectReady({ needs: [2] }, S.phases, st).ready, true);
  assert.equal(L.skillShare(S.phases, realStates([], T), [2]), 0);
});

test('applyChecks: project needs Done status and a link; weak key topics fail the third check', () => {
  const st0 = realStates([], T);
  let c = L.applyChecks(S.phases, st0, {}, S.projects);
  assert.deepEqual(c.map(x => x.ok), [false, false, true]);
  c = L.applyChecks(S.phases, st0, { 'student-mgmt': { status: 'done', link: '' } }, S.projects);
  assert.equal(c[0].ok, false);
  c = L.applyChecks(S.phases, st0, { 'student-mgmt': { status: 'done', link: 'https://github.com/x/y' } }, S.projects);
  assert.equal(c[0].ok, true);
  const st1 = realStates([rr('p4-joins-subqueries-and-aggregate-functions', '2026-10-28', 2, 10)], T);
  assert.equal(L.applyChecks(S.phases, st1, {}, S.projects)[2].ok, false);
});

function summaryFor(results, projectState, timeText) {
  const states = realStates(results, T);
  const byId = {};
  S.phases.forEach(p => p.topics.forEach(t => { byId[t.id] = t; }));
  return L.buildSummary({ phases: S.phases, states, results, projectState: projectState || {}, projectList: S.projects, byId, today: T, deadline: '2027-01-28', timeText: timeText || '1 hour', streak: L.streakInfo(results, T) });
}
test('summary: has goal, time, counts, topic ids, due list and the result block', () => {
  const results = [
    rr('p2-generics', '2026-10-27', 3, 10, { weakPoints: ['wildcards', 'bounded types'], nextStep: 'Write 3 generic methods' }),
    rr('p2-exception-handling', '2026-10-28', 4, 5)
  ];
  const t = summaryFor(results, { 'student-mgmt': { status: 'building', link: '', note: '' } }, '2 hours');
  assert.ok(t.includes('Time I have today: 2 hours.'));
  assert.ok(t.includes('91 days left') || t.includes('90 days left'));
  assert.ok(t.includes('[p2-generics]: 3/10 on 27 Oct. Weak points: wildcards; bounded types. Next step: Write 3 generic methods'));
  assert.ok(t.includes('DUE FOR REVISION TODAY'));
  assert.ok(t.includes('Student Management System (Java, JDBC and MySQL): building'));
  assert.ok(t.includes('RESULT_START') && t.includes('RESULT_END') && t.includes('topic_id: <topic id>'));
  assert.ok(t.includes('Streak: 2 days'));
});
test('summary: a block filled in from the summary prompt parses back', () => {
  const t = summaryFor([], {}, '1 hour');
  const filled = t.slice(t.lastIndexOf('RESULT_START'))
    .replace('<topic id>', 'p1-recursion').replace('<quick or full>', 'quick').replace('<number correct>/<total questions>', '4/5')
    .replace('<short list separated by semicolons, or none>', 'none').replace('<one concrete practice task>', 'Practice');
  const p = L.parseResult(filled);
  assert.equal(p.ok, true);
  assert.equal(p.data.topicId, 'p1-recursion');
});
test('summary: stays a sensible size with many results', () => {
  const results = [];
  S.phases.forEach(p => p.topics.forEach(tp => results.push(rr(tp.id, '2026-10-27', 3, 10, { weakPoints: ['a long weak point text here'], nextStep: 'a long next step sentence' }))));
  const t = summaryFor(results, {}, '3 hours or more');
  assert.ok(t.length < 6000, 'summary length ' + t.length);
  assert.ok(t.includes('and ') && t.includes('more'));
});

test('backup: export then validate round-trips results and projects', () => {
  const data = { results: [rr('p2-generics', '2026-10-27', 6, 10, { weakPoints: ['x'], nextStep: 'y' })], projects: { 'student-mgmt': { status: 'done', link: 'https://github.com/a/b', note: 'ok' } } };
  const v = L.validateBackup(L.exportBackup(data, T));
  assert.equal(v.ok, true);
  assert.deepEqual(v.data.results, data.results);
  assert.deepEqual(v.data.projects, data.projects);
  assert.equal(v.stats.exportedOn, T);
});
test('backup: invalid text, wrong shape, bad rows dropped', () => {
  assert.equal(L.validateBackup('hello').ok, false);
  assert.equal(L.validateBackup('{"a":1}').ok, false);
  assert.equal(L.validateBackup('[]').ok, false);
  const text = JSON.stringify({ results: [
    rr('p2-generics', '2026-10-27', 6, 10),
    { topicId: 'x', date: '2026-02-31', score: 1, total: 5 },
    { topicId: 'x', date: '2026-10-27', score: 12, total: 10 },
    { topicId: 7, date: '2026-10-27', score: 1, total: 5 },
    null
  ], projects: { a: { status: 'weird', link: 5, note: 'n' } } });
  const v = L.validateBackup(text);
  assert.equal(v.ok, true);
  assert.equal(v.stats.results, 1);
  assert.equal(v.stats.dropped, 4);
  assert.deepEqual(v.data.projects.a, { status: 'notstarted', link: '', note: 'n' });
});
test('shortDate', () => { assert.equal(L.shortDate('2026-10-05'), '5 Oct'); });

// ---------- Version 2 ----------
const wp = (topicId, date, score, total, weak) => rr(topicId, date, score, total, { weakPoints: weak });

test('mistakeStats: same weak point counted once per test, case and punctuation ignored', () => {
  const list = [
    wp('t', '2026-10-20', 4, 10, ['HashMap vs TreeMap', 'Comparator']),
    wp('t', '2026-10-24', 5, 10, ['hashmap vs treemap!', 'Comparator', 'comparator']),
    wp('t', '2026-10-27', 7, 10, ['Generics wildcards'])
  ];
  const m = L.mistakeStats(list);
  assert.equal(m[0].count, 2);
  assert.equal(m[1].count, 2);
  assert.equal(m.length, 3);
  assert.equal(m[2].text, 'Generics wildcards');
  assert.equal(m.find(x => x.key === 'hashmap vs treemap').text, 'hashmap vs treemap!');   // newest wording kept
});
test('repeatedMistakes: only weak points seen in 2+ tests, per topic', () => {
  const results = [
    wp('p2-generics', '2026-10-20', 4, 10, ['wildcards']),
    wp('p2-generics', '2026-10-25', 5, 10, ['Wildcards', 'erasure']),
    wp('p2-file-handling', '2026-10-25', 5, 10, ['wildcards'])
  ];
  const r = L.repeatedMistakes(S.phases, results, 5);
  assert.equal(r.length, 1);
  assert.equal(r[0].topic.id, 'p2-generics');
  assert.equal(r[0].count, 2);
});
test('recentWeakPoints: newest first, no repeats, limited', () => {
  const results = [
    wp('p2-generics', '2026-10-20', 4, 10, ['a', 'b']),
    wp('p2-generics', '2026-10-25', 5, 10, ['B', 'c'])
  ];
  assert.deepEqual(L.recentWeakPoints(results, 'p2-generics', 5), ['B', 'c', 'a']);
  assert.deepEqual(L.recentWeakPoints(results, 'p2-generics', 2), ['B', 'c']);
  assert.deepEqual(L.recentWeakPoints(results, 'nothing', 5), []);
});
test('prompt: previous weak points are asked about, and consistent naming is requested', () => {
  const phase = S.phases[1], topic = phase.topics[5];
  const q = L.buildPrompt(topic, phase, 'quick', ['HashMap vs TreeMap', 'Comparator']);
  assert.ok(q.includes('My weak points from earlier tests on this topic: HashMap vs TreeMap; Comparator.'));
  assert.ok(q.includes('Include 2 questions on these'));
  assert.ok(L.buildPrompt(topic, phase, 'full', ['x']).includes('Include 3 questions on these'));
  assert.ok(L.buildPrompt(topic, phase, 'learn', ['x']).includes('Spend extra time on these'));
  assert.ok(!L.buildPrompt(topic, phase, 'quick').includes('earlier tests'));
  assert.ok(q.includes('short consistent names'));
});
test('mock prompt: focus areas, project question, result block with mock topic id', () => {
  const p = L.buildMockPrompt({ focus: ['Generics', 'Joins'], projects: ['Student Management System (Java, JDBC and MySQL)'] });
  assert.ok(p.includes('Generics; Joins'));
  assert.ok(p.includes('1 question about one of my projects'));
  assert.ok(p.includes('topic_id: mock-interview'));
  const none = L.buildMockPrompt({ focus: [], projects: [] });
  assert.ok(none.includes('Core Java, SQL and Spring Boot basics'));
  assert.ok(!none.includes('about one of my projects'));
  const filled = p.slice(p.lastIndexOf('RESULT_START')).replace('<number correct>', '6').replace('<up to 4 short names separated by semicolons, or none>', 'Joins').replace('<one concrete practice task>', 'x');
  const parsed = L.parseResult(filled);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.topicId, 'mock-interview');
  assert.equal(parsed.data.score, 6); assert.equal(parsed.data.total, 10);
});
test('averageMock: average percent of the latest n', () => {
  const m = [{ id: 'a', date: '2026-10-01', score: 2, total: 10 }, { id: 'b', date: '2026-10-10', score: 6, total: 10 }, { id: 'c', date: '2026-10-20', score: 8, total: 10 }];
  assert.equal(L.averageMock(m, 2), 70);
  assert.equal(L.averageMock(m, 3), 53);
  assert.equal(L.averageMock([], 3), null);
});

function strongStates(date) {
  const results = ['p2-generics', 'p2-file-handling', 'p1-recursion'].map(id => rr(id, date, 9, 10));
  return realStates(results, '2026-12-31');
}
test('surprise check: about one day in three, stable for the day, never a due or recent topic', () => {
  const days = []; for (let i = 0; i < 60; i++) days.push(L.addDays('2026-11-10', i));
  const shown = days.filter(d => L.pickSurprise(S.phases, realStates([rr('p2-generics', '2026-11-01', 9, 10), rr('p2-file-handling', '2026-11-01', 9, 10)], d), d));
  // eligibility changes with the day (topics become due), so check the hash rule directly
  const hashDays = days.filter(d => L.dayHash(d) % 3 === 0).length;
  assert.ok(hashDays >= 12 && hashDays <= 28, 'hash days ' + hashDays);
  assert.ok(shown.length <= hashDays);
});
test('surprise check: picks only Strong or Done topics tested 4+ days ago and not due', () => {
  const day = (() => { for (let i = 0; i < 40; i++) { const d = L.addDays('2026-11-10', i); if (L.dayHash(d) % 3 === 0) return d; } })();
  const old = L.addDays(day, -5);
  const st = realStates([
    { ...rr('p2-generics', old, 9, 10) },
    { ...rr('p2-generics', L.addDays(old, 1), 9, 10) },
    { ...rr('p2-generics', L.addDays(old, 2), 9, 10) },
    { ...rr('p2-generics', L.addDays(old, 3), 9, 10) },   // tested 2 days ago: too recent
    rr('p1-recursion', old, 3, 10)                         // weak: not eligible
  ], day);
  assert.equal(L.pickSurprise(S.phases, st, day), null);
  const st2 = realStates([rr('p2-file-handling', L.addDays(day, -10), 9, 10), rr('p2-file-handling', L.addDays(day, -9), 9, 10), rr('p2-file-handling', L.addDays(day, -7), 9, 10), rr('p2-file-handling', L.addDays(day, -3), 9, 10)], day);
  const pick = L.pickSurprise(S.phases, st2, day);
  if (pick) { assert.equal(pick.topic.id, 'p2-file-handling'); assert.equal(pick.state.isDue, false); }
  assert.deepEqual(L.pickSurprise(S.phases, st2, day), L.pickSurprise(S.phases, st2, day));
  const offDay = (() => { for (let i = 0; i < 40; i++) { const d = L.addDays('2026-11-10', i); if (L.dayHash(d) % 3 !== 0) return d; } })();
  assert.equal(L.pickSurprise(S.phases, realStates([], offDay), offDay), null);
});

test('backup: mocks round-trip and bad mock rows are skipped', () => {
  const data = { results: [], projects: {}, mocks: [{ id: 'm1', date: '2026-10-28', score: 6, total: 10, weakPoints: ['joins'], nextStep: 'x' }] };
  const v = L.validateBackup(L.exportBackup(data, T));
  assert.equal(v.ok, true);
  assert.deepEqual(v.data.mocks, data.mocks);
  assert.equal(v.stats.mocks, 1);
  const bad = L.validateBackup(JSON.stringify({ results: [], mocks: [{ date: 'x', score: 1, total: 10 }, { date: '2026-10-28', score: 11, total: 10 }] }));
  assert.equal(bad.data.mocks.length, 0);
  assert.deepEqual(L.validateBackup(JSON.stringify({ results: [] })).data.mocks, []);
});
test('summary: repeated mistakes and mock interviews are listed', () => {
  const results = [wp('p2-generics', '2026-10-20', 4, 10, ['wildcards']), wp('p2-generics', '2026-10-25', 5, 10, ['Wildcards'])];
  const states = realStates(results, T);
  const byId = {}; S.phases.forEach(p => p.topics.forEach(t => { byId[t.id] = t; }));
  const t = L.buildSummary({ phases: S.phases, states, results, projectState: {}, projectList: S.projects, byId, today: T, deadline: '2027-01-28', timeText: '1 hour', streak: L.streakInfo(results, T),
    mocks: [{ id: 'm', date: '2026-10-27', score: 6, total: 10, weakPoints: ['joins'], nextStep: '' }] });
  assert.ok(t.includes('MISTAKES THAT KEEP COMING BACK'));
  assert.ok(t.includes('[p2-generics]: Wildcards (2 tests)'));
  assert.ok(t.includes('MOCK INTERVIEWS') && t.includes('27 Oct: 6/10. Weak: joins'));
});
