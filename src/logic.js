// Pure logic. No page code here, so Node can test it.
// Works as a normal <script> in the browser (global TrackerLogic) and as a CommonJS module in Node.
var TrackerLogic = (function () {
  'use strict';

  var INTERVALS = [1, 3, 7, 14];   // revision days after the first test of a passing run
  var PASS = 0.6;                  // 6/10 or better = OK
  var STRONG = 0.8;                // 8/10 or better = Strong

  // ---------- dates (local calendar days as YYYY-MM-DD) ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function localDate(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseDate(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function addDays(s, n) {
    var d = parseDate(s);
    d.setDate(d.getDate() + n);   // calendar arithmetic, safe across clock changes
    return localDate(d);
  }

  // ---------- levels ----------
  function pct(r) { return r.score / r.total; }
  function levelFromPct(p) {
    if (p >= STRONG) return 'strong';
    if (p >= PASS) return 'ok';
    return 'weak';
  }

  function resultsFor(results, topicId) {
    return results
      .filter(function (r) { return r.topicId === topicId; })
      .sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
  }

  // Done = latest result >= 80%, and the latest result from an earlier day is >= 80% too,
  // and at least one of the two was a Full test (10+ questions).
  function isDone(list) {
    if (!list.length) return false;
    var last = list[list.length - 1];
    if (pct(last) < STRONG) return false;
    var prev = null;
    for (var i = list.length - 2; i >= 0; i--) {
      if (list[i].date < last.date) { prev = list[i]; break; }
    }
    if (!prev || pct(prev) < STRONG) return false;
    return last.total >= 10 || prev.total >= 10;
  }

  // Revision schedule: days after the first test of the current passing run.
  // A result under 60% breaks the run, and the topic is due again the next day.
  function nextDue(list) {
    if (!list.length) return null;
    var last = list[list.length - 1];
    if (pct(last) < PASS) return addDays(last.date, 1);
    var dates = [];
    for (var i = list.length - 1; i >= 0 && pct(list[i]) >= PASS; i--) {
      if (dates[0] !== list[i].date) dates.unshift(list[i].date);
    }
    var idx = dates.length - 1;
    if (idx < INTERVALS.length) return addDays(dates[0], INTERVALS[idx]);
    return addDays(last.date, 14);
  }

  // State of one topic, calculated from results (nothing is stored).
  function topicState(results, topicId, today) {
    var list = resultsFor(results, topicId);
    if (!list.length) return { level: 'untested', last: null, count: 0, due: null, isDue: false, doneProgress: 0 };
    var last = list[list.length - 1];
    var done = isDone(list);
    var due = nextDue(list);
    return {
      level: done ? 'done' : levelFromPct(pct(last)),
      last: last,
      count: list.length,
      due: due,
      isDue: !!today && due <= today,
      doneProgress: doneProgress(list)
    };
  }

  // How many of the 2 passing tests are in place (for the "Done: 1 of 2" label).
  function doneProgress(list) {
    if (!list.length) return 0;
    var last = list[list.length - 1];
    if (pct(last) < STRONG) return 0;
    if (isDone(list)) return 2;
    return 1;
  }

  // ---------- result parser ----------
  function stripMd(s) {
    return s.replace(/\*+/g, '').replace(/`/g, '').replace(/^[\s>\-•]+/, '').trim();
  }

  function parseResult(text) {
    if (!text || !text.trim()) return { ok: false, error: "Paste the AI's full reply first." };

    var re = /RESULT_START([\s\S]*?)(?:RESULT_END|$)/gi;
    var blocks = [], m;
    while ((m = re.exec(text)) !== null) { blocks.push(m[1]); if (m[0].length === 0) re.lastIndex++; }
    if (!blocks.length) {
      return { ok: false, error: "No result block found. Ask the AI: 'Give the final result in the RESULT_START format.'" };
    }

    // The AI may print the empty template first, so try the last block first.
    var firstError = null;
    for (var b = blocks.length - 1; b >= 0; b--) {
      var res = parseBlock(blocks[b]);
      if (res.ok) return res;
      if (!firstError) firstError = res;
    }
    return firstError;
  }

  function parseBlock(body) {
    var fields = {};
    body.split(/\r?\n/).forEach(function (raw) {
      var line = stripMd(raw);
      var i = line.indexOf(':');
      if (i < 1) return;
      var key = line.slice(0, i).trim().toLowerCase().replace(/[\s\-]+/g, '_');
      fields[key] = line.slice(i + 1).trim();
    });

    var scoreText = fields.score;
    if (scoreText === undefined) return { ok: false, error: 'The result block has no score line (example: score: 6/10).' };
    var sm = scoreText.match(/(\d+)\s*(?:\/|out\s+of)\s*(\d+)/i);
    if (!sm) return { ok: false, error: 'Could not read the score "' + scoreText + '". It should look like 6/10.' };
    var score = +sm[1], total = +sm[2];
    if (total < 1 || total > 50 || score > total) {
      return { ok: false, error: 'Score looks wrong (' + score + '/' + total + '). Check the AI reply and paste again.' };
    }

    var weak = splitList(fields.weak_points || fields.weakpoints || '');
    var mode = /full/i.test(fields.mode || '') ? 'full' : /quick/i.test(fields.mode || '') ? 'quick' : (total >= 10 ? 'full' : 'quick');
    return {
      ok: true,
      data: {
        topicId: (fields.topic_id || fields.topic || '').trim() || null,
        mode: mode,
        score: score,
        total: total,
        weakPoints: weak,
        nextStep: clean(fields.next_step || '')
      }
    };
  }

  function clean(s) { return /^(none|n\/a|-|nil)\.?$/i.test(s.trim()) ? '' : s.trim(); }
  function splitList(s) {
    s = clean(s);
    if (!s) return [];
    var parts = s.indexOf(';') >= 0 ? s.split(';') : s.split(',');
    return parts.map(function (x) { return x.trim(); }).filter(Boolean);
  }

  // ---------- prompts ----------
  var FORMAT_RULES =
    'Do not write a level such as Weak, OK or Strong. My tracker works that out from the score.\n' +
    'If an answer is unclear or incomplete, mark it wrong. Be strict, like a real interviewer.\n' +
    'In weak_points, use short consistent names (for example "HashMap vs TreeMap"). Use the same name every time for the same mistake.';

  function block(topic, mode, total) {
    return 'RESULT_START\n' +
      'topic_id: ' + topic.id + '\n' +
      'mode: ' + mode + '\n' +
      'score: <number correct>/' + total + '\n' +
      'weak_points: <short list separated by semicolons, or none>\n' +
      'next_step: <one concrete practice task>\n' +
      'RESULT_END';
  }

  function buildPrompt(topic, phase, mode, prevWeak) {
    var head =
      'You are a strict interviewer for Java Full Stack fresher jobs in Bengaluru. ' +
      'I studied this a year ago and forgot part of it. Help me find the gaps.\n\n' +
      'Topic: ' + topic.name + '\n' +
      'Area: ' + phase.name + '\n' +
      'Topic ID (copy this exactly into the result): ' + topic.id + '\n\n';

    if (prevWeak && prevWeak.length) {
      head += 'My weak points from earlier tests on this topic: ' + prevWeak.join('; ') + '.\n' +
        (mode === 'learn' ? 'Spend extra time on these.\n\n'
          : 'Include ' + (mode === 'full' ? 3 : 2) + ' questions on these, and the rest on other parts of the topic.\n\n');
    }

    var rules =
      'RULES\n' +
      '- Ask ONE question at a time. Wait for my answer before the next one.\n' +
      '- Do not give hints or the answer before I reply.\n' +
      '- After each answer, say correct or wrong and give a one-line reason.\n' +
      '- No half marks.\n' +
      '- Keep questions in the style that Indian service and product companies ask freshers.\n' +
      '- If I type FINISH, stop and score only the questions already asked.\n\n';

    var ending =
      'AT THE END\n' +
      '1. List the questions I got wrong with the correct answers.\n' +
      '2. Then print this block exactly once, filled in, as the last thing in your reply:\n\n';

    if (mode === 'learn') {
      return head +
        'Mode: LEARN. I need to learn this topic again before being tested.\n\n' +
        'STEP 1 (about 20 minutes): Teach the topic in small parts. For each part give a short explanation and one small Java or SQL or JavaScript example, ' +
        'then ask me one quick question to check I understood. Wait for my answer before moving on.\n' +
        'STEP 2: When I type TEST, ask me 5 questions on what we covered (3 interview-style concept questions and 2 small code or output questions).\n\n' +
        rules.replace('- Ask ONE question at a time.', '- During the test, ask ONE question at a time.') +
        FORMAT_RULES + '\n\n' + ending + block(topic, 'quick', 5);
    }
    if (mode === 'full') {
      return head +
        'Mode: FULL TEST. Ask exactly 10 questions: 6 interview-style concept questions, ' +
        '2 output-prediction questions, and 2 short coding tasks. Start easy and finish hard.\n\n' +
        rules + FORMAT_RULES + '\n\n' + ending + block(topic, 'full', 10);
    }
    return head +
      'Mode: QUICK TEST. Ask exactly 5 questions: 3 interview-style concept questions and 2 small code or output questions. ' +
      'Start easy and finish harder.\n\n' +
      rules + FORMAT_RULES + '\n\n' + ending + block(topic, 'quick', 5);
  }

  // REVISE topics start with a Quick test, LEARN topics start with teaching, TEST topics start with a Full test.
  function suggestedMode(tag) {
    if (tag === 'LEARN') return 'learn';
    if (tag === 'TEST') return 'full';
    return 'quick';
  }

  // ---------- what to study today ----------
  // Study order follows your "Must Learn First" line: Java, SQL, Git, JDBC/JPA, Spring Boot + REST, JavaScript, React, Testing.
  var PRIORITY = [1, 2, 4, 3, 6, 7, 5, 9, 8, 11, 12];

  function orderedPhases(phases) {
    return phases.slice().sort(function (a, b) {
      var ia = PRIORITY.indexOf(a.number), ib = PRIORITY.indexOf(b.number);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }

  // Later topics unlock when every core topic is Strong or Done.
  function isUnlocked(phases, states) {
    return phases.every(function (p) {
      return p.topics.every(function (t) {
        if (!t.core) return true;
        var l = states[t.id].level;
        return l === 'strong' || l === 'done';
      });
    });
  }

  // Queue: due revisions first (weak before ok before strong, oldest due first), then new topics in study order.
  // A topic tested today is skipped, so you never get the same topic twice in one day.
  function buildQueue(phases, states, today) {
    var unlocked = isUnlocked(phases, states);
    var due = [], fresh = [];
    orderedPhases(phases).forEach(function (p) {
      p.topics.forEach(function (t) {
        if (!t.core && !unlocked) return;
        var s = states[t.id];
        if (s.last && s.last.date === today) return;
        if (s.level === 'untested') fresh.push({ topic: t, phase: p, state: s, kind: 'new' });
        else if (s.isDue) due.push({ topic: t, phase: p, state: s, kind: 'revision' });
      });
    });
    var rank = { weak: 0, ok: 1, strong: 2, done: 3 };
    due.sort(function (a, b) {
      return (rank[a.state.level] - rank[b.state.level]) || (a.state.due < b.state.due ? -1 : a.state.due > b.state.due ? 1 : 0);
    });
    return due.concat(fresh);
  }

  // A strong result from a Quick test needs a Full test to reach Done, so suggest Full then.
  function suggestMode(topic, state) {
    if (!state || !state.last) return suggestedMode(topic.tag);
    if (pct(state.last) >= STRONG && state.last.total < 10) return 'full';
    return 'quick';
  }

  // Minimum day: one revision, else a new topic that does not need teaching first.
  function shortTask(queue) {
    var rev = queue.filter(function (q) { return q.kind === 'revision'; });
    if (rev.length) return rev[0];
    var easy = queue.filter(function (q) { return q.topic.tag !== 'LEARN'; });
    return easy[0] || queue[0] || null;
  }

  // ---------- streak ----------
  function weekStart(s) {                 // Monday of the week that contains s
    var dow = (parseDate(s).getDay() + 6) % 7;
    return addDays(s, -dow);
  }

  // Any saved test or revision counts as a study day. One missed day per week is forgiven
  // (it does not add to the streak, but it does not break it). Two missed days in a row break it.
  function streakInfo(results, today) {
    var days = {}, min = null;
    results.forEach(function (r) { days[r.date] = true; if (min === null || r.date < min) min = r.date; });
    var info = { streak: 0, studiedToday: !!days[today], missed: 0, weekDays: 0 };
    var ws = weekStart(today);
    for (var i = 0; i < 7; i++) if (days[addDays(ws, i)]) info.weekDays++;
    if (min === null) return info;

    var d = addDays(today, -1);
    while (d >= min && !days[d]) { info.missed++; d = addDays(d, -1); }

    var cur = info.studiedToday ? today : addDays(today, -1);
    var usedWeek = {}, prevMissed = false;
    while (cur >= min) {
      if (days[cur]) { info.streak++; prevMissed = false; }
      else {
        var wk = weekStart(cur);
        if (prevMissed || usedWeek[wk]) break;
        usedWeek[wk] = true; prevMissed = true;
      }
      cur = addDays(cur, -1);
    }
    return info;
  }

  // ---------- progress, projects, summary, backup ----------
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function shortDate(s) { var d = parseDate(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }

  function allTopics(phases, coreOnly) {
    var out = [];
    phases.forEach(function (p) { p.topics.forEach(function (t) { if (!coreOnly || t.core) out.push(t); }); });
    return out;
  }
  function countLevels(topics, states) {
    var c = { done: 0, strong: 0, ok: 0, weak: 0, untested: 0 };
    topics.forEach(function (t) { c[states[t.id].level]++; });
    return c;
  }

  // Tested topics that are still Weak or OK, lowest score first, oldest test first on ties.
  function weakestTopics(phases, states, n) {
    var list = [];
    phases.forEach(function (p) {
      p.topics.forEach(function (t) {
        var s = states[t.id];
        if (s.level === 'weak' || s.level === 'ok') list.push({ topic: t, phase: p, state: s });
      });
    });
    list.sort(function (a, b) {
      return (pct(a.state.last) - pct(b.state.last)) ||
        (a.state.last.date < b.state.last.date ? -1 : a.state.last.date > b.state.last.date ? 1 : 0);
    });
    return list.slice(0, n);
  }

  // Share of core topics in the given phases that are Strong or Done.
  function skillShare(phases, states, numbers) {
    var total = 0, good = 0;
    phases.forEach(function (p) {
      if (numbers.indexOf(p.number) < 0) return;
      p.topics.forEach(function (t) {
        if (!t.core) return;
        total++;
        var l = states[t.id].level;
        if (l === 'strong' || l === 'done') good++;
      });
    });
    return total ? good / total : 0;
  }
  var BUILD_READY = 0.7;      // assumption: start a project when 70% of its skills are Strong or Done
  function projectReady(project, phases, states) {
    var share = skillShare(phases, states, project.needs || []);
    return { share: share, ready: share >= BUILD_READY };
  }

  // Simple apply-readiness checks. These are suggested thresholds, not facts.
  function applyChecks(phases, states, projectState, projectList) {
    var core = allTopics(phases, true);
    var good = core.filter(function (t) { var l = states[t.id].level; return l === 'strong' || l === 'done'; }).length;
    var share = core.length ? good / core.length : 0;
    var doneProjects = projectList.filter(function (p) {
      var ps = projectState[p.id];
      return ps && ps.status === 'done' && ps.link;
    }).length;
    var weak = [];
    phases.forEach(function (p) {
      if ([2, 4, 7].indexOf(p.number) < 0) return;
      p.topics.forEach(function (t) { if (t.core && states[t.id].level === 'weak') weak.push(t.name); });
    });
    return [
      { id: 'project', ok: doneProjects >= 1, label: 'At least 1 project Done with a repository link', detail: doneProjects + ' of ' + projectList.length + ' done' },
      { id: 'core', ok: share >= 0.7, label: '70% of core topics Strong or Done', detail: Math.round(share * 100) + '% now' },
      { id: 'weak', ok: weak.length === 0, label: 'No Weak topic in Java, SQL or Spring Boot', detail: weak.length ? weak.length + ' Weak now' : 'none Weak' }
    ];
  }

  // Text to paste into ChatGPT or Claude so the AI can plan the session and write the next test.
  function buildSummary(c) {
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

  // Backup text and restore check.
  function exportBackup(data, today) {
    return JSON.stringify({ version: 1, exportedOn: today, results: data.results, projects: data.projects, mocks: data.mocks || [] }, null, 1);
  }
  var PROJECT_STATUS = ['notstarted', 'building', 'done'];
  function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && localDate(parseDate(s)) === s; }
  function validateBackup(text) {
    var obj;
    try { obj = JSON.parse(text); }
    catch (e) { return { ok: false, error: 'This is not a valid backup. Paste the whole backup text, from the first { to the last }.' }; }
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.results)) return { ok: false, error: 'This is not a valid backup: no results list found.' };
    var results = [], dropped = 0;
    obj.results.forEach(function (r, i) {
      if (!r || typeof r.topicId !== 'string' || !validDate(r.date) || !Number.isInteger(r.score) || !Number.isInteger(r.total) ||
          r.total < 1 || r.total > 50 || r.score < 0 || r.score > r.total) { dropped++; return; }
      results.push({
        id: typeof r.id === 'string' && r.id ? r.id : 'imp' + i + r.date,
        topicId: r.topicId, date: r.date, mode: r.mode === 'full' ? 'full' : 'quick', score: r.score, total: r.total,
        weakPoints: Array.isArray(r.weakPoints) ? r.weakPoints.filter(function (x) { return typeof x === 'string'; }) : [],
        nextStep: typeof r.nextStep === 'string' ? r.nextStep : '', edited: !!r.edited, source: typeof r.source === 'string' ? r.source : 'import'
      });
    });
    var mocks = [];
    (Array.isArray(obj.mocks) ? obj.mocks : []).forEach(function (m, i) {
      if (!m || !validDate(m.date) || !Number.isInteger(m.score) || !Number.isInteger(m.total) || m.total < 1 || m.total > 50 || m.score < 0 || m.score > m.total) return;
      mocks.push({ id: typeof m.id === 'string' && m.id ? m.id : 'mock' + i + m.date, date: m.date, score: m.score, total: m.total,
        weakPoints: Array.isArray(m.weakPoints) ? m.weakPoints.filter(function (x) { return typeof x === 'string'; }) : [],
        nextStep: typeof m.nextStep === 'string' ? m.nextStep : '' });
    });
    var projects = {};
    if (obj.projects && typeof obj.projects === 'object') {
      Object.keys(obj.projects).forEach(function (k) {
        var p = obj.projects[k];
        if (!p || typeof p !== 'object') return;
        projects[k] = {
          status: PROJECT_STATUS.indexOf(p.status) >= 0 ? p.status : 'notstarted',
          link: typeof p.link === 'string' ? p.link : '', note: typeof p.note === 'string' ? p.note : ''
        };
      });
    }
    return { ok: true, data: { version: 1, results: results, projects: projects, mocks: mocks, drafts: {}, lastExport: null },
      stats: { results: results.length, mocks: mocks.length, dropped: dropped, projects: Object.keys(projects).length, exportedOn: typeof obj.exportedOn === 'string' ? obj.exportedOn : null } };
  }

  // ---------- Version 2: mistakes, mock interview, spot check ----------
  function normPoint(s) { return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  // Weak points grouped by wording (case and punctuation ignored). count = number of tests that listed it.
  function mistakeStats(list) {
    var map = {};
    list.forEach(function (r) {
      var seen = {};
      (r.weakPoints || []).forEach(function (w) {
        var k = normPoint(w);
        if (!k || seen[k]) return;
        seen[k] = 1;
        var m = map[k] || (map[k] = { key: k, text: w, count: 0, last: r.date });
        m.count++;
        if (r.date >= m.last) { m.last = r.date; m.text = w; }
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
      return (b.count - a.count) || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0);
    });
  }

  function repeatedMistakes(phases, results, n) {
    var out = [];
    phases.forEach(function (p) {
      p.topics.forEach(function (t) {
        var list = resultsFor(results, t.id);
        if (list.length < 2) return;
        mistakeStats(list).forEach(function (m) {
          if (m.count >= 2) out.push({ topic: t, phase: p, text: m.text, count: m.count, last: m.last });
        });
      });
    });
    out.sort(function (a, b) { return (b.count - a.count) || (a.last < b.last ? 1 : a.last > b.last ? -1 : 0); });
    return out.slice(0, n);
  }

  // Latest weak points for a topic, newest first, no repeats.
  function recentWeakPoints(results, topicId, n) {
    var list = resultsFor(results, topicId).slice().reverse(), seen = {}, out = [];
    list.forEach(function (r) {
      (r.weakPoints || []).forEach(function (w) {
        var k = normPoint(w);
        if (k && !seen[k] && out.length < n) { seen[k] = 1; out.push(w); }
      });
    });
    return out;
  }

  function buildMockPrompt(c) {
    var focus = c.focus && c.focus.length ? c.focus.join('; ') : 'Core Java, SQL and Spring Boot basics';
    var hasProject = c.projects && c.projects.length;
    return 'You are a strict technical interviewer for Java Full Stack fresher jobs in Bengaluru. Run a mock interview with me.\n\n' +
      'My focus areas (weakest first): ' + focus + '\n' +
      (hasProject ? 'My projects: ' + c.projects.join('; ') + '\n' : '') + '\n' +
      'Mode: MOCK INTERVIEW. Ask exactly 10 questions:\n' +
      '- 6 technical questions on my focus areas (concepts, output prediction, or a short code task)\n' +
      '- 2 scenario questions (for example: design a small REST API, or find the bug in a snippet)\n' +
      (hasProject ? '- 1 question about one of my projects (ask me to explain a design choice)\n' : '- 1 more technical question\n') +
      '- 1 short behavioural question\n\n' +
      'RULES\n' +
      '- Ask ONE question at a time. Wait for my answer before the next one.\n' +
      '- Do not give hints or the answer before I reply.\n' +
      '- After each answer, say correct, partly correct or wrong, with a one-line reason.\n' +
      '- Be strict, like a real interviewer. If an answer is unclear, mark it wrong.\n' +
      '- If I type FINISH, stop and score only the questions already asked.\n\n' +
      'AT THE END\n' +
      '1. Give my score out of 10 and say honestly whether I am ready for fresher interviews.\n' +
      '2. List my 3 weakest areas with the correct answers to what I got wrong.\n' +
      '3. Then print this block exactly once, filled in, as the last thing in your reply. Count partly correct as wrong. Do not write a level.\n\n' +
      'RESULT_START\n' +
      'topic_id: mock-interview\n' +
      'mode: full\n' +
      'score: <number correct>/10\n' +
      'weak_points: <up to 4 short names separated by semicolons, or none>\n' +
      'next_step: <one concrete practice task>\n' +
      'RESULT_END';
  }

  // Spot check: an extra early retest of a Strong or Done topic. Stable for the whole day, shown about every third day.
  function dayHash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) + s.charCodeAt(i)) >>> 0; return h; }
  function pickSurprise(phases, states, today) {
    if (dayHash(today) % 3 !== 0) return null;
    var best = null, bestH = null, cutoff = addDays(today, -3);
    phases.forEach(function (p) {
      p.topics.forEach(function (t) {
        var s = states[t.id];
        if (s.level !== 'strong' && s.level !== 'done') return;
        if (s.isDue || s.last.date > cutoff) return;
        var hh = dayHash(today + t.id);
        if (bestH === null || hh < bestH) { bestH = hh; best = { topic: t, phase: p, state: s }; }
      });
    });
    return best;
  }

  function averageMock(mocks, n) {
    var last = mocks.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1); }).slice(0, n);
    if (!last.length) return null;
    var sum = 0; last.forEach(function (m) { sum += m.score / m.total; });
    return Math.round(sum / last.length * 100);
  }

  var api = {
    INTERVALS: INTERVALS, PASS: PASS, STRONG: STRONG,
    localDate: localDate, parseDate: parseDate, addDays: addDays,
    pct: pct, levelFromPct: levelFromPct, resultsFor: resultsFor,
    isDone: isDone, nextDue: nextDue, topicState: topicState,
    parseResult: parseResult, buildPrompt: buildPrompt, suggestedMode: suggestedMode, splitList: splitList,
    PRIORITY: PRIORITY, orderedPhases: orderedPhases, isUnlocked: isUnlocked, buildQueue: buildQueue,
    suggestMode: suggestMode, shortTask: shortTask, weekStart: weekStart, streakInfo: streakInfo,
    shortDate: shortDate, allTopics: allTopics, countLevels: countLevels, weakestTopics: weakestTopics, skillShare: skillShare,
    BUILD_READY: BUILD_READY, projectReady: projectReady, applyChecks: applyChecks, buildSummary: buildSummary,
    exportBackup: exportBackup, validateBackup: validateBackup, PROJECT_STATUS: PROJECT_STATUS,
    normPoint: normPoint, mistakeStats: mistakeStats, repeatedMistakes: repeatedMistakes, recentWeakPoints: recentWeakPoints,
    buildMockPrompt: buildMockPrompt, dayHash: dayHash, pickSurprise: pickSurprise, averageMock: averageMock
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
