import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/core/index.js';
import { syllabus as S } from './helpers.js';

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

