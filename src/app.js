(function () {
  'use strict';
  var L = TrackerLogic, S = SYLLABUS;
  var KEY = 'jfs-tracker-v1';
  var DEADLINE = '2027-01-28';
  var storageOk = true;

  // ---------- storage ----------
  function emptyData() { return { version: 1, results: [], projects: {}, mocks: [], drafts: {}, lastExport: null }; }
  function probeStorage() {
    try { localStorage.setItem('jfs-probe', '1'); localStorage.removeItem('jfs-probe'); } catch (e) { storageOk = false; }
  }
  function load() {
    probeStorage();
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { storageOk = false; return emptyData(); }
    if (!raw) return emptyData();
    try {
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.results)) throw new Error('shape');
      d.drafts = d.drafts || {}; d.projects = d.projects || {}; d.mocks = Array.isArray(d.mocks) ? d.mocks : [];
      return d;
    } catch (e) {
      // keep the unreadable data instead of overwriting it
      try { localStorage.setItem(KEY + '-unreadable', raw); } catch (e2) { /* ignore */ }
      return emptyData();
    }
  }
  var data = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { storageOk = false; return false; }
  }

  // ---------- helpers ----------
  var byId = {};
  S.phases.forEach(function (p) { p.topics.forEach(function (t) { byId[t.id] = { topic: t, phase: p }; }); });
  var LV = { weak: ['!', 'Weak'], ok: ['~', 'OK'], strong: ['✓', 'Strong'], done: ['✓✓', 'Done'], untested: ['–', 'Untested'] };
  var MODE_LABEL = { learn: 'Learn first', quick: 'Quick test', full: 'Full test' };
  function today() { return L.localDate(); }
  function fmt(s) { return L.parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function fmtLong(s) { return L.parseDate(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
    else if (c.nodeType) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'value') el.value = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function badge(level) {
    return h('span', { class: 'lvl lvl-' + level }, h('i', { 'aria-hidden': 'true' }, LV[level][0]), LV[level][1]);
  }
  function states() {
    var t = today(), out = {};
    Object.keys(byId).forEach(function (id) { out[id] = L.topicState(data.results, id, t); });
    return out;
  }

  // ---------- ui state ----------
  var ui = { filter: 'all', open: null, mode: 'quick', msg: null, editing: null, manualOpen: false, promptOpen: false,
    todayId: null, todayIdx: 0, short: false, copied: false, from: 'today', nextMode: null };
  var app = document.getElementById('app');

  function route() {
    var hash = location.hash.slice(1);
    if (hash.indexOf('t-') === 0 && byId[hash.slice(2)]) return { name: 'topic', id: hash.slice(2) };
    if (hash === 'syllabus' || hash === 'projects' || hash === 'progress' || hash === 'backup') return { name: hash };
    return { name: 'today' };
  }
  var lastRouteKey = null;
  function render() {
    flushDraft();
    var r = route();
    var key = r.name + ':' + (r.id || '');
    if (key !== lastRouteKey) {
      var prev = lastRouteKey ? lastRouteKey.split(':')[0] : null;
      lastRouteKey = key;
      ui.msg = null; ui.editing = null; ui.manualOpen = false; ui.promptOpen = false; ui.copied = false;
      if (r.name === 'topic') {
        ui.from = prev === 'today' ? 'today' : 'syllabus';
        ui.mode = ui.nextMode || L.suggestMode(byId[r.id].topic, L.topicState(data.results, r.id, today()));
        ui.nextMode = null;
      }
      if (r.name === 'today') { ui.todayId = null; ui.todayIdx = 0; ui.short = false; }
      window.scrollTo(0, 0);
    }
    if (r.name !== 'topic' && r.name !== 'today') { pasteEl = null; curId = null; }
    app.textContent = '';
    var wrap = h('div', { class: 'wrap' }, header());
    if (!storageOk) {
      wrap.appendChild(h('div', { class: 'banner', role: 'alert' },
        'Your browser is blocking storage. Progress will NOT be saved. Open the site in a normal window.'));
    }
    wrap.appendChild(r.name === 'topic' ? topicPage(r.id) : r.name === 'today' ? todayPage() : r.name === 'projects' ? projectsPage() : r.name === 'progress' ? progressPage() : r.name === 'backup' ? backupPage() : syllabusPage());
    app.appendChild(wrap);
    app.appendChild(navBar(r.name === 'topic' ? ui.from : r.name));
    if (ui.msg) { var m = document.getElementById('msg'); if (m && m.scrollIntoView) m.scrollIntoView({ block: 'nearest' }); }
  }

  function navBar(active) {
    function tab(name, label) {
      return h('a', { href: '#' + name, 'aria-current': active === name ? 'page' : null }, label);
    }
    return h('nav', { class: 'tabs', 'aria-label': 'Main' }, h('div', { class: 'tabs-in' }, tab('today', 'Today'), tab('syllabus', 'Syllabus'), tab('projects', 'Projects'), tab('progress', 'Progress')));
  }

  function header() {
    var days = Math.round((L.parseDate(DEADLINE) - L.parseDate(today())) / 86400000);
    var goal = days >= 0 ? 'Ready to apply by ' + fmtLong(DEADLINE) + ' · ' + days + ' days left' : 'Target date ' + fmtLong(DEADLINE) + ' has passed';
    return h('header', { class: 'top' }, h('h1', null, 'Java Full Stack Tracker'),
      h('p', { class: 'goal' }, goal, ' \u00b7 ', h('a', { href: '#backup', class: 'quiet' }, 'Backup')));
  }

  // ---------- syllabus page ----------
  function syllabusPage() {
    var st = states();
    var core = [], all = [];
    S.phases.forEach(function (p) { p.topics.forEach(function (t) { all.push(t); if (t.core) core.push(t); }); });
    var counts = { done: 0, strong: 0, ok: 0, weak: 0, untested: 0 };
    core.forEach(function (t) { counts[st[t.id].level]++; });
    var dueCount = all.filter(function (t) { return st[t.id].isDue; }).length;
    var unlocked = L.isUnlocked(S.phases, st);
    var frag = document.createDocumentFragment();

    function pc(n) { return (n / core.length * 100).toFixed(2) + '%'; }
    frag.appendChild(h('section', { class: 'summary', 'aria-label': 'Core progress' },
      h('div', { class: 'summary-head' },
        h('h2', null, counts.done + ' of ' + core.length + ' core topics Done'),
        h('span', { class: 'small muted' }, dueCount ? dueCount + ' due for revision' : 'Nothing due')),
      h('div', { class: 'bar', role: 'img', 'aria-label': counts.done + ' done, ' + counts.strong + ' strong, ' + counts.ok + ' OK, ' + counts.weak + ' weak, ' + counts.untested + ' untested' },
        h('span', { class: 'b-done', style: 'width:' + pc(counts.done) }),
        h('span', { class: 'b-strong', style: 'width:' + pc(counts.strong) }),
        h('span', { class: 'b-ok', style: 'width:' + pc(counts.ok) }),
        h('span', { class: 'b-weak', style: 'width:' + pc(counts.weak) })),
      h('div', { class: 'counts' },
        h('span', null, h('b', null, counts.done), ' Done'),
        h('span', null, h('b', null, counts.strong), ' Strong'),
        h('span', null, h('b', null, counts.ok), ' OK'),
        h('span', null, h('b', null, counts.weak), ' Weak'),
        h('span', null, h('b', null, counts.untested), ' Untested'))));

    var filters = h('div', { class: 'filters', role: 'group', 'aria-label': 'Filter topics' });
    [['all', 'All'], ['weak', 'Weak'], ['due', 'Due'], ['untested', 'Untested']].forEach(function (f) {
      filters.appendChild(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(ui.filter === f[0]),
        onclick: function () { ui.filter = f[0]; render(); } }, f[1]));
    });
    frag.appendChild(filters);

    function match(t) {
      var s = st[t.id];
      if (ui.filter === 'weak') return s.level === 'weak';
      if (ui.filter === 'due') return s.isDue;
      if (ui.filter === 'untested') return s.level === 'untested';
      return true;
    }

    // which phase starts open: the first core phase that is not finished
    if (ui.open === null) {
      ui.open = {};
      for (var i = 0; i < S.phases.length; i++) {
        var p = S.phases[i];
        var ct = p.topics.filter(function (t) { return t.core; });
        if (ct.length && ct.some(function (t) { return st[t.id].level !== 'done'; })) { ui.open[p.id] = true; break; }
      }
    }

    var shown = 0;
    S.phases.forEach(function (p) {
      var ct = p.topics.filter(function (t) { return t.core; });
      if (!ct.length) return;
      var rows = ct.filter(match);
      if (!rows.length) return;
      shown += rows.length;
      var doneN = ct.filter(function (t) { return st[t.id].level === 'done'; }).length;
      var d = h('details', { class: 'phase' },
        h('summary', null,
          h('span', { class: 'phase-title' }, h('h3', null, 'Phase ' + p.number + ' · ' + p.name), h('small', null, doneN + ' of ' + ct.length + ' Done')),
          h('span', { class: 'phase-right' })),
        h('ul', { class: 'topics' }, rows.map(function (t) { return topicRow(t, st[t.id], false); })));
      d.open = ui.filter !== 'all' || !!ui.open[p.id];
      d.addEventListener('toggle', function () { ui.open[p.id] = d.open; });
      frag.appendChild(d);
    });

    // later (locked until core is Strong or Done)
    var laterPhases = S.phases.map(function (p) { return { p: p, rows: p.topics.filter(function (t) { return !t.core && match(t); }) }; })
      .filter(function (x) { return x.rows.length; });
    if (laterPhases.length) {
      var laterCount = laterPhases.reduce(function (n, x) { return n + x.rows.length; }, 0);
      var later = h('details', { class: 'phase' },
        h('summary', null,
          h('span', { class: 'phase-title' }, h('h3', null, 'Later'), h('small', null, laterCount + ' topics · ' + (unlocked ? 'unlocked' : 'locked'))),
          h('span', { class: 'phase-right' })));
      if (!unlocked) later.appendChild(h('p', { class: 'locknote' }, 'These unlock when every core topic is Strong or Done. Security, DevOps, microservices and the rest wait until the core is solid.'));
      laterPhases.forEach(function (x) {
        later.appendChild(h('p', { class: 'locknote', style: 'font-weight:600;color:var(--fg)' }, 'Phase ' + x.p.number + ' · ' + x.p.name));
        later.appendChild(h('ul', { class: 'topics' }, x.rows.map(function (t) { return topicRow(t, st[t.id], !unlocked); })));
      });
      later.open = ui.filter !== 'all';
      frag.appendChild(later);
      shown += laterCount;
    }

    if (!shown) frag.appendChild(h('p', { class: 'empty' }, 'No topics match this filter.'));
    return frag;
  }

  function topicRow(t, s, locked) {
    var meta = h('span', { class: 'meta' },
      s.isDue ? h('span', { class: 'duepill' }, 'Due') : null,
      s.last ? h('span', { class: 'score' }, s.last.score + '/' + s.last.total) : null,
      badge(s.level));
    var name = h('span', { class: 'name' }, t.name, h('span', { class: 'tag', style: 'display:block' }, t.tag === 'UNSET' ? '' : t.tag));
    var inner = [name, meta];
    var li = h('li', null, locked
      ? h('div', { class: 'topic locked' }, inner)
      : h('a', { class: 'topic', href: '#t-' + t.id }, inner));
    return li;
  }

  // ---------- topic page ----------
  var TAG_HINT = {
    REVISE: 'You studied this before, so a Quick test is suggested.',
    LEARN: 'Marked LEARN in your syllabus, so start by learning it.',
    TEST: 'Marked TEST in your syllabus, so a Full test is suggested.',
    BUILD: 'Marked BUILD in your syllabus. A Quick test checks the basics first.',
    UNSET: 'Not tagged in your syllabus. A Quick test works as a first check.'
  };

  var draftTimer = null, pasteEl = null, curId = null;
  function flushDraft() {
    if (draftTimer) { clearTimeout(draftTimer); draftTimer = null; }
    if (pasteEl && curId) {
      var v = pasteEl.value;
      if ((data.drafts[curId] || '') === v) return;   // nothing changed, so do not rewrite storage (another tab may have newer data)
      if (v) data.drafts[curId] = v; else delete data.drafts[curId];
      save();
    }
  }
  window.addEventListener('pagehide', flushDraft);
  document.addEventListener('visibilitychange', function () { if (document.hidden) flushDraft(); });

  function topicPage(id) {
    var info = byId[id], topic = info.topic, phase = info.phase;
    var st = L.topicState(data.results, id, today());
    var frag = document.createDocumentFragment();

    frag.appendChild(h('a', { class: 'back', href: '#' + ui.from }, ui.from === 'today' ? '← Today' : '← Syllabus'));
    frag.appendChild(h('div', null,
      h('h1', null, topic.name),
      h('p', { class: 'muted small' }, 'Phase ' + phase.number + ' · ' + phase.name + (topic.tag !== 'UNSET' ? ' · ' + topic.tag : ''))));

    var statusLines = [];
    if (st.last) {
      statusLines.push(h('span', { class: 'score' }, 'Last test ' + fmt(st.last.date) + ': ' + st.last.score + '/' + st.last.total));
      statusLines.push(h('span', { class: 'small muted' }, 'Done progress: ' + st.doneProgress + ' of 2 passing tests'));
      statusLines.push(h('span', { class: 'small muted' }, st.isDue ? 'Revision due now' : 'Next revision: ' + fmt(st.due)));
    } else {
      statusLines.push(h('span', { class: 'small muted' }, 'No test yet.'));
    }
    frag.appendChild(h('section', { class: 'card', 'aria-label': 'Status' },
      h('div', { class: 'meta', style: 'justify-content:flex-start' }, badge(st.level), statusLines)));

    frag.appendChild(studyCards(id, false));
    var mc = mistakesCard(id);
    if (mc) frag.appendChild(mc);
    frag.appendChild(historyCard(id));
    return frag;
  }

  // Weak points that repeat across tests of this topic.
  function mistakesCard(id) {
    var list = L.resultsFor(data.results, id);
    if (!list.length) return null;
    var stats = L.mistakeStats(list);
    var rep = stats.filter(function (m) { return m.count >= 2; });
    var once = stats.filter(function (m) { return m.count < 2; });
    var card = h('section', { class: 'card' }, h('h3', null, 'Mistakes'));
    if (!stats.length) { card.appendChild(h('p', { class: 'empty' }, 'No weak points recorded for this topic yet.')); return card; }
    if (rep.length) {
      card.appendChild(h('p', { class: 'small muted' }, 'These weak points showed up in 2 or more tests.'));
      card.appendChild(h('ul', { class: 'history' }, rep.map(function (m) {
        return h('li', null, h('strong', null, m.text), h('span', { class: 'small muted' }, 'in ' + m.count + ' tests, last ' + fmt(m.last)));
      })));
    } else {
      card.appendChild(h('p', { class: 'empty' }, 'No repeats yet. A weak point shows here when it appears in 2 or more tests.'));
    }
    if (once.length) card.appendChild(h('p', { class: 'small muted' }, 'Seen once: ' + once.map(function (m) { return m.text; }).join('; ')));
    card.appendChild(h('p', { class: 'small muted' }, 'Matching works on the wording the AI used. A reworded mistake counts as a new one.'));
    return card;
  }

  // Copy card, message area and paste card. Shared by the Today page and the topic page.
  // twoStep (Today): the paste card stays hidden until the prompt has been copied.
  function studyCards(id, twoStep) {
    var info = byId[id], topic = info.topic, phase = info.phase;
    curId = id;
    var frag = document.createDocumentFragment();
    var step2 = null, haveBtn = null;
    function reveal() { ui.copied = true; if (step2) step2.hidden = false; if (haveBtn) haveBtn.hidden = true; }

    var promptEl = h('textarea', { id: 'promptbox', class: 'promptbox mono', readonly: true, 'aria-label': 'Test prompt' });
    function currentPrompt() { return L.buildPrompt(topic, phase, ui.mode, L.recentWeakPoints(data.results, id, 4)); }
    promptEl.value = currentPrompt();
    var copyNote = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' });
    var copyBtn = h('button', { class: 'btn', type: 'button', id: 'copy-btn' }, 'Copy test prompt');
    copyBtn.addEventListener('click', function () {
      copyText(currentPrompt()).then(function (ok) {
        if (ok) { copyBtn.textContent = 'Copied'; copyNote.textContent = 'Prompt copied. Paste it into ChatGPT or Claude, take the test, then come back.'; setTimeout(function () { copyBtn.textContent = 'Copy test prompt'; }, 2500); }
        else { details.open = true; ui.promptOpen = true; promptEl.focus(); promptEl.select(); copyNote.textContent = 'Copy was blocked here. The prompt is open below and selected. Copy it by hand.'; }
        reveal();
      });
    });
    var modes = h('fieldset', { class: 'modes' }, h('legend', null, 'Mode'));
    [['learn', 'Learn first (about 20 min)'], ['quick', 'Quick test (5 questions)'], ['full', 'Full test (10 questions)']].forEach(function (m) {
      var inp = h('input', { type: 'radio', name: 'mode', value: m[0], id: 'mode-' + m[0] });
      inp.checked = ui.mode === m[0];
      inp.addEventListener('change', function () { ui.mode = m[0]; promptEl.value = currentPrompt(); });
      modes.appendChild(h('label', { for: 'mode-' + m[0] }, inp, m[1]));
    });
    var details = h('details', { class: 'more' }, h('summary', null, 'Show the prompt'), h('div', { class: 'inner' }, promptEl));
    details.open = ui.promptOpen;
    details.addEventListener('toggle', function () { ui.promptOpen = details.open; });
    frag.appendChild(h('section', { class: 'card' },
      h('h3', null, h('span', { class: 'stepno', 'aria-hidden': 'true' }, '1'), 'Copy the prompt'),
      h('p', { class: 'small muted' }, TAG_HINT[topic.tag] || TAG_HINT.UNSET),
      modes, copyBtn, copyNote, details));

    frag.appendChild(msgArea());

    pasteEl = h('textarea', { id: 'paste', placeholder: 'Paste the whole AI reply here. The result block is picked out automatically.', 'aria-label': 'AI reply' });
    pasteEl.value = data.drafts[id] || '';
    pasteEl.addEventListener('input', function () {
      if (draftTimer) clearTimeout(draftTimer);
      draftTimer = setTimeout(flushDraft, 400);
    });
    var saveBtn = h('button', { class: 'btn', type: 'button', id: 'save-btn', onclick: function () { onSavePaste(id); } }, 'Save result');
    step2 = h('section', { class: 'card', id: 'step2' },
      h('h3', null, h('span', { class: 'stepno', 'aria-hidden': 'true' }, '2'), 'Paste the AI reply'),
      h('label', { class: 'field', for: 'paste' }, 'AI reply'),
      pasteEl, h('div', { class: 'btn-row' }, saveBtn),
      manualForm(id));
    if (twoStep && !(ui.copied || data.drafts[id] || ui.msg || ui.editing)) {
      step2.hidden = true;
      haveBtn = h('button', { class: 'btn secondary', type: 'button', id: 'have-reply', onclick: function () { reveal(); pasteEl.focus(); } }, 'I already have the AI reply');
      frag.appendChild(haveBtn);
    }
    frag.appendChild(step2);
    return frag;
  }

  // ---------- projects ----------
  var STATUS_LABEL = { notstarted: 'Not started', building: 'Building', done: 'Done' };
  function projState(id) { return data.projects[id] || { status: 'notstarted', link: '', note: '' }; }

  function projectsPage() {
    var st = states();
    var frag = document.createDocumentFragment();
    frag.appendChild(h('div', null, h('h2', null, 'Projects'),
      h('p', { class: 'small muted' }, 'Fresher roles are scarce, so a project you can explain counts for more than a topic score.')));
    frag.appendChild(h('section', { class: 'card' },
      h('h3', null, 'Before you mark a project Done'),
      h('ul', { class: 'plain' },
        h('li', null, 'Authentication, validation and error handling are in.'),
        h('li', null, 'Unit and integration tests are written.'),
        h('li', null, 'It is on GitHub with a clear README, and you can explain every part of the code.'))));
    S.projects.forEach(function (proj) {
      var ps = projState(proj.id);
      var ready = L.projectReady(proj, S.phases, st);
      var pctText = Math.round(ready.share * 100) + '%';
      var status = h('select', { id: 'st-' + proj.id },
        ['notstarted', 'building', 'done'].map(function (k) { return h('option', { value: k }, STATUS_LABEL[k]); }));
      status.value = ps.status;
      var link = h('input', { type: 'text', id: 'ln-' + proj.id, inputmode: 'url', placeholder: 'https://github.com/you/project', value: ps.link });
      var note = h('input', { type: 'text', id: 'nt-' + proj.id, placeholder: 'One line: what is built, what is next', value: ps.note });
      var err = h('p', { class: 'small', style: 'color:var(--weak)', role: 'alert' });
      var ok = h('p', { class: 'small', style: 'color:var(--strong)', role: 'status', 'aria-live': 'polite' });
      var form = h('form', { class: 'inner', novalidate: true },
        h('label', { class: 'field', for: 'st-' + proj.id }, 'Status', status),
        h('label', { class: 'field', for: 'ln-' + proj.id }, 'Repository link', link),
        h('label', { class: 'field', for: 'nt-' + proj.id }, 'Note', note),
        err, ok, h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'submit' }, 'Save project')));
      form.style.display = 'flex'; form.style.flexDirection = 'column'; form.style.gap = '12px';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        err.textContent = ''; ok.textContent = '';
        var l = link.value.trim();
        if (l && !/^https:\/\/\S+\.\S+/i.test(l)) { err.textContent = 'The link should start with https:// (for example https://github.com/you/project).'; link.focus(); return; }
        if (status.value === 'done' && !l) { err.textContent = 'Add the repository link before marking this project Done.'; link.focus(); return; }
        data.projects[proj.id] = { status: status.value, link: l, note: note.value.trim() };
        ok.textContent = save() ? 'Saved.' : 'Could not save to this browser.';
      });
      frag.appendChild(h('section', { class: 'card' },
        h('div', null, h('h3', null, proj.name), h('p', { class: 'small muted' }, proj.stack)),
        h('p', { class: 'small ' + (ready.ready ? '' : 'muted') }, ready.ready
          ? 'Skills ready: ' + pctText + ' of the needed core topics are Strong or Done. You can start building.'
          : 'Skills ready: ' + pctText + ' of the needed core topics are Strong or Done. Building works best from ' + Math.round(L.BUILD_READY * 100) + '%.'),
        form));
    });
    return frag;
  }

  // ---------- progress ----------
  var SUMMARY_TIMES = ['30 minutes', '1 hour', '2 hours', '3 hours or more'];
  function progressPage() {
    var st = states(), t = today();
    var frag = document.createDocumentFragment();
    var core = L.allTopics(S.phases, true);
    var counts = L.countLevels(core, st);
    var good = counts.done + counts.strong;
    var share = core.length ? Math.round(good / core.length * 100) : 0;

    frag.appendChild(h('div', null, h('h2', null, 'Progress')));
    frag.appendChild(h('section', { class: 'summary' },
      h('div', { class: 'summary-head' }, h('h2', null, share + '% of core Strong or Done'), h('span', { class: 'small muted' }, counts.done + ' Done · ' + counts.strong + ' Strong')),
      h('div', { class: 'phasebars' }, S.phases.map(function (p) {
        var ct = p.topics.filter(function (x) { return x.core; });
        if (!ct.length) return null;
        var c = L.countLevels(ct, st);
        function w(n) { return (n / ct.length * 100).toFixed(2) + '%'; }
        return h('div', { class: 'phasebar' },
          h('div', { class: 'small phasebar-top' }, h('span', null, 'Phase ' + p.number + ' · ' + p.name), h('span', { class: 'muted' }, (c.done + c.strong) + '/' + ct.length)),
          h('div', { class: 'bar', role: 'img', 'aria-label': p.name + ': ' + c.done + ' done, ' + c.strong + ' strong, ' + c.ok + ' OK, ' + c.weak + ' weak, ' + c.untested + ' untested' },
            h('span', { class: 'b-done', style: 'width:' + w(c.done) }), h('span', { class: 'b-strong', style: 'width:' + w(c.strong) }),
            h('span', { class: 'b-ok', style: 'width:' + w(c.ok) }), h('span', { class: 'b-weak', style: 'width:' + w(c.weak) })));
      }))));

    var checks = L.applyChecks(S.phases, st, data.projects, S.projects);
    var allOk = checks.every(function (c) { return c.ok; });
    frag.appendChild(h('section', { class: 'card' },
      h('h3', null, allOk ? 'You pass all three apply checks' : 'Ready to apply?'),
      h('p', { class: 'small muted' }, 'My suggested checks, not a rule from any employer. Change them if you disagree.'),
      h('ul', { class: 'checks' }, checks.map(function (c) {
        return h('li', null, h('span', { class: 'lvl ' + (c.ok ? 'lvl-strong' : 'lvl-untested') }, h('i', { 'aria-hidden': 'true' }, c.ok ? '✓' : '–'), c.ok ? 'Yes' : 'Not yet'),
          h('span', null, c.label, h('span', { class: 'small muted', style: 'display:block' }, c.detail)));
      }))));

    var weakest = L.weakestTopics(S.phases, st, 5);
    var wk = h('section', { class: 'card' }, h('h3', null, 'Weakest 5'));
    if (!weakest.length) wk.appendChild(h('p', { class: 'empty' }, data.results.length ? 'No Weak or OK topics right now.' : 'Take a few tests and your weakest topics will show here.'));
    else wk.appendChild(h('ul', { class: 'history' }, weakest.map(function (x) {
      return h('li', null,
        h('a', { class: 'topic', href: '#t-' + x.topic.id, style: 'padding:0;min-height:44px' },
          h('span', { class: 'name' }, x.topic.name), h('span', { class: 'meta' }, h('span', { class: 'score' }, x.state.last.score + '/' + x.state.last.total), badge(x.state.level))),
        x.state.last.weakPoints.length ? h('p', { class: 'small muted' }, 'Weak: ' + x.state.last.weakPoints.join('; ')) : null);
    })));
    frag.appendChild(wk);

    var rep = L.repeatedMistakes(S.phases, data.results, 5);
    var rc = h('section', { class: 'card' }, h('h3', null, 'Mistakes that keep coming back'));
    if (!rep.length) rc.appendChild(h('p', { class: 'empty' }, 'None yet. A weak point shows here when the same one appears in 2 or more tests of a topic.'));
    else rc.appendChild(h('ul', { class: 'history' }, rep.map(function (m) {
      return h('li', null, h('a', { class: 'topic', href: '#t-' + m.topic.id, style: 'padding:0;min-height:44px' },
        h('span', { class: 'name' }, m.text, h('span', { class: 'tag', style: 'display:block' }, m.topic.name)),
        h('span', { class: 'meta' }, h('span', { class: 'score' }, m.count + ' tests'))));
    })));
    frag.appendChild(rc);

    frag.appendChild(mockCard(weakest));

    // progress summary for the AI
    var timeSel = h('select', { id: 'sum-time' }, SUMMARY_TIMES.map(function (x) { return h('option', { value: x }, x); }));
    timeSel.value = ui.summaryTime || '1 hour';
    var sumEl = h('textarea', { id: 'sumbox', class: 'promptbox mono', readonly: true, 'aria-label': 'Progress summary' });
    function summaryText() {
      var byIdTopic = {};
      Object.keys(byId).forEach(function (k) { byIdTopic[k] = byId[k].topic; });
      return L.buildSummary({ phases: S.phases, states: st, results: data.results, projectState: data.projects, projectList: S.projects, byId: byIdTopic,
        today: t, deadline: DEADLINE, timeText: timeSel.value, streak: L.streakInfo(data.results, t), mocks: data.mocks });
    }
    sumEl.value = summaryText();
    timeSel.addEventListener('change', function () { ui.summaryTime = timeSel.value; sumEl.value = summaryText(); });
    var sumNote = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' });
    var sumBtn = h('button', { class: 'btn', type: 'button', id: 'sum-btn' }, 'Copy progress summary');
    var sumDetails = h('details', { class: 'more' }, h('summary', null, 'Show the summary'), h('div', { class: 'inner' }, sumEl));
    sumBtn.addEventListener('click', function () {
      copyText(sumEl.value).then(function (ok) {
        if (ok) { sumBtn.textContent = 'Copied'; sumNote.textContent = 'Summary copied. Paste it into ChatGPT or Claude. It will plan your session and start the first test.'; setTimeout(function () { sumBtn.textContent = 'Copy progress summary'; }, 2500); }
        else { sumDetails.open = true; sumEl.focus(); sumEl.select(); sumNote.textContent = 'Copy was blocked here. The summary is open below and selected. Copy it by hand.'; }
      });
    });
    frag.appendChild(h('section', { class: 'card' },
      h('h3', null, 'Ask the AI what to do next'),
      h('p', { class: 'small muted' }, 'Copies your levels, weak points, due revisions and projects, then asks the AI to plan your session and start the first test.'),
      h('label', { class: 'field', for: 'sum-time' }, 'Time I have today', timeSel),
      sumBtn, sumNote, sumDetails));
    return frag;
  }

  // ---------- mock interview ----------
  function mockCard(weakest) {
    var focus = weakest.map(function (x) { return x.topic.name; });
    var projects = S.projects.filter(function (p) { return projState(p.id).status !== 'notstarted'; }).map(function (p) { return p.name + ' (' + p.stack + ')'; });
    var promptText = L.buildMockPrompt({ focus: focus, projects: projects });
    var promptEl = h('textarea', { id: 'mockprompt', class: 'promptbox mono', readonly: true, 'aria-label': 'Mock interview prompt' });
    promptEl.value = promptText;
    var det = h('details', { class: 'more' }, h('summary', null, 'Show the prompt'), h('div', { class: 'inner' }, promptEl));
    var note = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' });
    var copyBtn = h('button', { class: 'btn', type: 'button', id: 'mock-copy' }, 'Copy mock interview prompt');
    copyBtn.addEventListener('click', function () {
      copyText(promptText).then(function (ok) {
        if (ok) { copyBtn.textContent = 'Copied'; note.textContent = 'Copied. Paste it into ChatGPT or Claude and answer like a real interview.'; setTimeout(function () { copyBtn.textContent = 'Copy mock interview prompt'; }, 2500); }
        else { det.open = true; promptEl.focus(); promptEl.select(); note.textContent = 'Copy was blocked here. The prompt is open below and selected. Copy it by hand.'; }
      });
    });

    var mockEl = h('textarea', { id: 'mockpaste', placeholder: 'Paste the whole AI reply here after the interview', 'aria-label': 'Mock interview reply' });
    mockEl.value = data.drafts['mock-interview'] || '';
    pasteEl = mockEl; curId = 'mock-interview';
    mockEl.addEventListener('input', function () { if (draftTimer) clearTimeout(draftTimer); draftTimer = setTimeout(flushDraft, 400); });
    var saveBtn = h('button', { class: 'btn secondary', type: 'button', id: 'mock-save', onclick: function () {
      var p = L.parseResult(mockEl.value);
      if (!p.ok) { setMsg({ type: 'error', lines: [p.error] }); return; }
      if (p.data.topicId && p.data.topicId !== 'mock-interview') {
        setMsg({ type: 'error', lines: ['This result is for a topic test (' + p.data.topicId + '), not a mock interview. Save it from that topic’s page.'] }); return;
      }
      var rec = { id: uid(), date: today(), score: p.data.score, total: p.data.total, weakPoints: p.data.weakPoints, nextStep: p.data.nextStep };
      data.mocks.push(rec);
      delete data.drafts['mock-interview']; mockEl.value = '';
      var ok = save();
      var lines = ['Mock interview saved: ' + rec.score + '/' + rec.total + '.'];
      if (rec.weakPoints.length) lines.push('Weak: ' + rec.weakPoints.join('; '));
      if (rec.nextStep) lines.push('Next step: ' + rec.nextStep);
      if (!ok) lines.push('Could not save to this browser. It will be lost when you close the page.');
      setMsg({ type: ok ? 'success' : 'error', lines: lines, actions: [{ label: 'Undo', kind: 'secondary', fn: function () {
        data.mocks = data.mocks.filter(function (m) { return m.id !== rec.id; }); save(); clearMsg(); } }] });
    } }, 'Save mock result');

    var mocks = data.mocks.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1); });
    var avg = L.averageMock(mocks, 3);
    var list = mocks.length ? h('ul', { class: 'history' }, mocks.slice(0, 5).map(function (m) {
      return h('li', null,
        h('div', { class: 'hist-top' }, h('strong', null, fmt(m.date)), h('span', { class: 'score' }, m.score + '/' + m.total), h('span', { class: 'grow' }),
          h('button', { class: 'btn small danger', type: 'button', onclick: function () {
            setMsg({ type: 'warn', lines: ['Delete the ' + fmt(m.date) + ' mock result (' + m.score + '/' + m.total + ')? This cannot be undone.'],
              actions: [{ label: 'Delete', kind: 'danger', fn: function () { data.mocks = data.mocks.filter(function (x) { return x.id !== m.id; }); save(); clearMsg(); } }, { label: 'Cancel', kind: 'secondary', fn: clearMsg }] });
          } }, 'Delete')),
        m.weakPoints.length ? h('p', { class: 'small' }, 'Weak: ' + m.weakPoints.join('; ')) : null);
    })) : h('p', { class: 'empty' }, 'No mock interviews saved yet.');

    return h('section', { class: 'card' },
      h('h3', null, 'Mock interview'),
      h('p', { class: 'small muted' }, 'The AI interviews you for about 30 minutes on your weakest topics' + (projects.length ? ' and one of your projects' : '') + '. It does not change topic levels. It gives you a separate score to watch.'),
      copyBtn, note, det, msgArea(),
      h('label', { class: 'field', for: 'mockpaste' }, 'Paste the interview reply'), mockEl,
      h('div', { class: 'btn-row' }, saveBtn),
      avg !== null ? h('p', { class: 'small' }, 'Average of your last ' + Math.min(3, mocks.length) + ': ' + avg + '%') : null,
      list);
  }

  // ---------- backup ----------
  function daysAgoText(d) {
    if (!d) return 'You have not copied a backup yet.';
    var n = Math.round((L.parseDate(today()) - L.parseDate(d)) / 86400000);
    return 'Last backup copied ' + (n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago') + '.';
  }
  function backupPage() {
    var frag = document.createDocumentFragment();
    frag.appendChild(h('a', { class: 'back', href: '#today' }, '← Today'));
    frag.appendChild(h('div', null, h('h2', null, 'Backup and restore'),
      h('p', { class: 'small muted' }, 'Your progress lives in this browser only. Clearing site data or switching phone or browser erases it. Copy a backup now and then and keep the text in a notes app or message to yourself.')));

    var json = L.exportBackup(data, today());
    var outEl = h('textarea', { id: 'backupbox', class: 'promptbox mono', readonly: true, 'aria-label': 'Backup text' });
    outEl.value = json;
    var note = h('p', { class: 'small muted', role: 'status', 'aria-live': 'polite' }, daysAgoText(data.lastExport));
    var btn = h('button', { class: 'btn', type: 'button', id: 'backup-btn' }, 'Copy backup');
    var det = h('details', { class: 'more' }, h('summary', null, 'Show the backup text'), h('div', { class: 'inner' }, outEl));
    btn.addEventListener('click', function () {
      copyText(json).then(function (ok) {
        if (ok) {
          data.lastExport = today(); save();
          btn.textContent = 'Copied'; note.textContent = 'Backup copied (' + data.results.length + ' results). Paste it somewhere safe. ' + daysAgoText(data.lastExport);
          setTimeout(function () { btn.textContent = 'Copy backup'; }, 2500);
        } else { det.open = true; outEl.focus(); outEl.select(); note.textContent = 'Copy was blocked here. The backup is open below and selected. Copy it by hand.'; }
      });
    });
    frag.appendChild(h('section', { class: 'card' }, h('h3', null, 'Back up'), btn, note, det));

    frag.appendChild(msgArea());
    var inEl = h('textarea', { id: 'importbox', placeholder: 'Paste the backup text here', 'aria-label': 'Backup text to restore' });
    inEl.value = ui.importText || '';
    inEl.addEventListener('input', function () { ui.importText = inEl.value; });
    var checkBtn = h('button', { class: 'btn secondary', type: 'button', id: 'check-btn', onclick: function () {
      var v = L.validateBackup(inEl.value);
      if (!v.ok) { setMsg({ type: 'error', lines: [v.error] }); return; }
      var lines = ['Found ' + v.stats.results + ' results and ' + v.stats.projects + ' projects' + (v.stats.exportedOn ? ' (backed up ' + fmt(v.stats.exportedOn) + ')' : '') + '.',
        'This replaces everything saved in this browser (' + data.results.length + ' results now).'];
      if (v.stats.dropped) lines.push(v.stats.dropped + ' rows were unreadable and will be skipped.');
      setMsg({ type: 'warn', lines: lines, actions: [
        { label: 'Replace my data', kind: 'danger', fn: function () {
          data = v.data; data.lastExport = null; ui.importText = '';
          var ok = save();
          setMsg({ type: ok ? 'success' : 'error', lines: [ok ? 'Backup restored: ' + v.stats.results + ' results.' : 'Restored for now, but this browser would not save it. It will be lost when you close the page.'] });
        } },
        { label: 'Cancel', kind: 'secondary', fn: clearMsg }] });
    } }, 'Check backup');
    frag.appendChild(h('section', { class: 'card' }, h('h3', null, 'Restore'),
      h('p', { class: 'small muted' }, 'Nothing changes until you confirm.'),
      h('label', { class: 'field', for: 'importbox' }, 'Backup text'), inEl, h('div', { class: 'btn-row' }, checkBtn)));
    return frag;
  }

  // ---------- today page ----------
  function nextTask() { ui.msg = null; ui.todayId = null; ui.todayIdx = 0; ui.short = false; ui.copied = false; render(); }

  function streakCard(info) {
    var note;
    if (!data.results.length) note = 'Your streak starts with your first saved test.';
    else if (info.studiedToday) note = 'Studied today. Anything more is a bonus.';
    else if (info.missed > 0) note = info.missed + (info.missed === 1 ? ' day' : ' days') + ' missed. One short test today keeps you going.';
    else note = 'Not studied yet today.';
    return h('section', { class: 'summary', 'aria-label': 'Streak' },
      h('div', { class: 'summary-head' },
        h('h2', null, 'Streak: ' + info.streak + (info.streak === 1 ? ' day' : ' days')),
        h('span', { class: 'small muted' }, 'Studied this week: ' + info.weekDays + '/7 days')),
      h('p', { class: 'small muted' }, note));
  }

  function todayPage() {
    var st = states(), t = today();
    var queue = L.buildQueue(S.phases, st, t);
    var info = L.streakInfo(data.results, t);
    var frag = document.createDocumentFragment();
    frag.appendChild(streakCard(info));
    var buildNow = S.projects.filter(function (p) { return projState(p.id).status === 'notstarted' && L.projectReady(p, S.phases, st).ready; })[0];
    if (buildNow) {
      frag.appendChild(h('section', { class: 'card' },
        h('h3', null, 'Time to build: ' + buildNow.name),
        h('p', { class: 'small' }, 'Your skills for this project are ready. A built project counts for more than another test.'),
        h('div', { class: 'btn-row' }, h('a', { class: 'btn small secondary', href: '#projects', style: 'display:inline-flex;align-items:center;text-decoration:none' }, 'Open Projects'))));
    }

    var task = null;
    if (ui.todayId) {
      task = queue.filter(function (q) { return q.topic.id === ui.todayId; })[0];
      if (!task && byId[ui.todayId]) {        // pinned topic was just tested today: keep showing it with its result
        var bi = byId[ui.todayId];
        task = { topic: bi.topic, phase: bi.phase, state: st[ui.todayId], kind: st[ui.todayId].level === 'untested' ? 'new' : 'revision' };
      }
    }
    if (!task && queue.length) {
      task = queue[ui.todayIdx % queue.length];
      ui.todayId = task.topic.id;
      ui.mode = L.suggestMode(task.topic, task.state);
    }

    if (!task) {
      frag.appendChild(h('section', { class: 'card' },
        h('h2', null, 'Nothing to study right now'),
        h('p', null, 'Every topic is either done for today or not due yet. Revisions appear here on their due date.'),
        h('p', { class: 'small muted' }, 'Want to look anyway? Open any topic from the Syllabus.')));
      return frag;
    }

    var dueList = queue.filter(function (q) { return q.kind === 'revision'; });
    var core = S.phases.every(function (p) { return p.topics.every(function (x) { return !x.core || ['strong', 'done'].indexOf(st[x.id].level) >= 0; }); });
    var intro = null;
    if (!data.results.length) intro = 'Welcome. Start with a Quick test (5 questions). It shows where you stand before you pick what to revise.';
    else if (ui.short) intro = 'Minimum day: one test is enough to keep your streak.';
    else if (task.kind === 'new' && !dueList.length) intro = core ? 'Core is done. Next up: ' + task.topic.name + '.' : 'No revisions due. Here is a new topic.';

    var kind = task.kind === 'revision'
      ? 'Revision due' + (task.state.due && task.state.due < t ? ' since ' + fmt(task.state.due) : '')
      : 'New topic';
    var actions = [];
    if (!ui.short) actions.push(h('button', { class: 'btn small secondary', type: 'button', id: 'short-btn', onclick: function () {
      var pick = L.shortTask(queue); if (!pick) return;
      ui.short = true; ui.todayId = pick.topic.id; ui.mode = 'quick'; ui.copied = false; ui.msg = null; render();
    } }, 'Short on time?'));
    if (queue.length > 1) actions.push(h('button', { class: 'btn small secondary', type: 'button', id: 'other-btn', onclick: function () {
      ui.todayIdx = (ui.todayIdx + 1) % queue.length; ui.todayId = null; ui.short = false; ui.copied = false; ui.msg = null; render();
    } }, 'Another topic'));

    frag.appendChild(h('section', { class: 'card task', 'aria-label': 'Today’s task' },
      intro ? h('p', { class: 'small muted' }, intro) : null,
      h('p', { class: 'kicker' }, kind),
      h('h2', null, task.topic.name),
      h('p', { class: 'small muted' }, 'Phase ' + task.phase.number + ' · ' + task.phase.name + (task.topic.tag !== 'UNSET' ? ' · ' + task.topic.tag : '')),
      h('div', { class: 'meta', style: 'justify-content:flex-start' },
        badge(task.state.level),
        task.state.last ? h('span', { class: 'score' }, 'Last ' + task.state.last.score + '/' + task.state.last.total + ' on ' + fmt(task.state.last.date)) : null,
        h('a', { href: '#t-' + task.topic.id, class: 'small', style: 'color:var(--accent)' }, 'Open topic page')),
      actions.length ? h('div', { class: 'btn-row' }, actions) : null));

    frag.appendChild(studyCards(task.topic.id, true));

    if (!dueList.length) {
      var spot = L.pickSurprise(S.phases, st, t);
      if (spot) {
        frag.appendChild(h('section', { class: 'card', 'aria-label': 'Spot check' },
          h('h3', null, 'Spot check (optional)'),
          h('p', { class: 'small' }, spot.topic.name + ' is ' + LV[spot.state.level][1] + ', last tested ' + fmt(spot.state.last.date) + '. A 5-minute Quick test checks that you have not started to forget it.'),
          h('div', { class: 'btn-row' }, h('a', { class: 'btn small secondary', href: '#t-' + spot.topic.id, style: 'display:inline-flex;align-items:center;text-decoration:none',
            onclick: function () { ui.nextMode = 'quick'; } }, 'Test me'))));
      }
    }

    var others = dueList.filter(function (q) { return q.topic.id !== task.topic.id; });
    if (others.length) {
      frag.appendChild(h('section', { class: 'card' },
        h('h3', null, 'Revisions due (' + dueList.length + ')'),
        h('ul', { class: 'history' }, others.slice(0, 6).map(function (q) {
          return h('li', null, h('a', { class: 'topic', href: '#t-' + q.topic.id, style: 'padding:0;min-height:44px' },
            h('span', { class: 'name' }, q.topic.name),
            h('span', { class: 'meta' }, h('span', { class: 'score' }, 'due ' + fmt(q.state.due)), badge(q.state.level))));
        })),
        others.length > 6 ? h('p', { class: 'small muted' }, 'And ' + (others.length - 6) + ' more in the Syllabus (Due filter).') : null));
    }
    return frag;
  }

  function copyText(text) {
    return new Promise(function (resolve) {
      function legacy() {
        try {
          var ta = h('textarea', { 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;top:0;left:0;opacity:0;height:1px;width:1px' });
          ta.value = text;
          document.body.appendChild(ta);
          ta.focus(); ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          return ok;
        } catch (e) { return false; }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { resolve(legacy()); });
      } else resolve(legacy());
    });
  }

  // ---------- messages ----------
  function msgArea() {
    var box = h('div', { id: 'msg', role: 'status', 'aria-live': 'polite' });
    if (!ui.msg) return box;
    var m = ui.msg;
    var el = h('div', { class: 'msg ' + (m.type || '') }, (m.lines || []).map(function (l) { return h('p', null, l); }));
    if (m.actions && m.actions.length) {
      el.appendChild(h('div', { class: 'btn-row' }, m.actions.map(function (a) {
        return h('button', { class: 'btn small ' + (a.kind || 'secondary'), type: 'button', onclick: a.fn }, a.label);
      })));
    }
    box.appendChild(el);
    return box;
  }
  function setMsg(m) { ui.msg = m; render(); }
  function clearMsg() { ui.msg = null; render(); }

  // ---------- saving ----------
  function onSavePaste(curTopicId) {
    var text = pasteEl.value;
    var p = L.parseResult(text);
    if (!p.ok) { setMsg({ type: 'error', lines: [p.error] }); return; }
    var d = p.data;
    d.source = 'paste';
    if (d.topicId && d.topicId !== curTopicId) {
      var other = byId[d.topicId];
      var actions = [];
      if (other) actions.push({ label: 'Save for ' + other.topic.name, kind: '', fn: function () { checkDuplicate(d.topicId, d); } });
      actions.push({ label: 'Save for ' + byId[curTopicId].topic.name, kind: other ? 'secondary' : '', fn: function () { checkDuplicate(curTopicId, d); } });
      actions.push({ label: 'Cancel', kind: 'secondary', fn: clearMsg });
      setMsg({ type: 'warn', lines: [other
        ? 'This result is for ' + other.topic.name + ', but you opened ' + byId[curTopicId].topic.name + '.'
        : 'This result names a topic ID that is not in your syllabus (' + d.topicId + ').'], actions: actions });
      return;
    }
    checkDuplicate(curTopicId, d);
  }

  function checkDuplicate(topicId, d) {
    var t = today();
    var dup = data.results.some(function (r) {
      return r.topicId === topicId && r.date === t && r.score === d.score && r.total === d.total && r.mode === d.mode;
    });
    if (dup) {
      setMsg({ type: 'warn', lines: ['A result with the same score was already saved today for this topic. Save another anyway?'],
        actions: [{ label: 'Save anyway', kind: '', fn: function () { commit(topicId, d); } }, { label: 'Cancel', kind: 'secondary', fn: clearMsg }] });
      return;
    }
    commit(topicId, d);
  }

  function commit(topicId, d) {
    var rec = { id: uid(), topicId: topicId, date: today(), mode: d.mode, score: d.score, total: d.total,
      weakPoints: d.weakPoints || [], nextStep: d.nextStep || '', edited: false, source: d.source || 'paste' };
    data.results.push(rec);
    if (d.source === 'paste' && topicId === curId) { delete data.drafts[curId]; if (pasteEl) pasteEl.value = ''; }
    var ok = save();
    showSaved(topicId, rec, ok, false);
  }

  function showSaved(topicId, rec, ok, wasEdit) {
    var st = L.topicState(data.results, topicId, today());
    var name = byId[topicId].topic.name;
    var lines = [name + ': ' + rec.score + '/' + rec.total + ', ' + LV[st.level][1] + (wasEdit ? ' (edited)' : '') + '.'];
    if (rec.weakPoints.length) lines.push('Weak points: ' + rec.weakPoints.join('; '));
    if (rec.nextStep) lines.push('Next step: ' + rec.nextStep);
    lines.push(st.level === 'done' ? 'Done. Revision continues on ' + fmt(st.due) + '.' : 'Next revision: ' + fmt(st.due) + '.');
    if (!ok) lines.push('Could not save to this browser. Progress will be lost when you close the page.');
    if (topicId !== curId) lines.push('Saved under ' + name + '. Open it from the syllabus to see its history.');
    var actions = [];
    if (!wasEdit) actions.push({ label: 'Undo', kind: 'secondary', fn: function () { removeResult(rec.id); clearMsg(); } });
    actions.push({ label: 'Edit score', kind: 'secondary', fn: function () { startEdit(rec.id); } });
    if (route().name === 'today') actions.unshift({ label: 'Next task', kind: '', fn: nextTask });
    setMsg({ type: ok ? 'success' : 'error', lines: lines, actions: actions });
  }

  function removeResult(id) {
    data.results = data.results.filter(function (r) { return r.id !== id; });
    save();
  }

  // ---------- manual form (also used for editing) ----------
  function manualForm(topicId) {
    var rec = ui.editing ? data.results.filter(function (r) { return r.id === ui.editing; })[0] : null;
    var score = h('input', { type: 'number', id: 'm-score', inputmode: 'numeric', min: '0', step: '1' });
    var total = h('select', { id: 'm-total' }, h('option', { value: '5' }, '5 (Quick)'), h('option', { value: '10' }, '10 (Full)'));
    var weak = h('input', { type: 'text', id: 'm-weak', placeholder: 'HashMap vs TreeMap; Comparator' });
    var next = h('input', { type: 'text', id: 'm-next', placeholder: 'Practice custom comparators' });
    if (rec) {
      score.value = rec.score;
      if (rec.total !== 5 && rec.total !== 10) total.appendChild(h('option', { value: String(rec.total) }, String(rec.total)));
      total.value = String(rec.total);
      weak.value = rec.weakPoints.join('; ');
      next.value = rec.nextStep;
    } else total.value = ui.mode === 'full' ? '10' : '5';
    var err = h('p', { class: 'small', style: 'color:var(--weak)', role: 'alert', id: 'm-err' });
    var form = h('form', { class: 'inner', novalidate: true },
      h('p', { class: 'small muted' }, rec ? 'Editing a saved result. It will be marked as edited.' : 'Use this if the AI did not give a result block. Type the numbers it gave you.'),
      h('div', { class: 'row2' },
        h('label', { class: 'field', for: 'm-score' }, 'Score (correct answers)', score),
        h('label', { class: 'field', for: 'm-total' }, 'Out of', total)),
      h('label', { class: 'field', for: 'm-weak' }, 'Weak points (separate with ;)', weak),
      h('label', { class: 'field', for: 'm-next' }, 'Next step', next),
      err,
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'submit' }, rec ? 'Update result' : 'Save score'),
        rec ? h('button', { class: 'btn secondary', type: 'button', onclick: function () { ui.editing = null; ui.manualOpen = false; clearMsg(); } }, 'Cancel edit') : null));
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var s = score.value.trim(), tt = +total.value;
      if (!/^\d+$/.test(s)) { err.textContent = 'Enter the score as a whole number, for example 6.'; score.focus(); return; }
      var sc = +s;
      if (sc > tt) { err.textContent = 'Score looks wrong (' + sc + '/' + tt + '). The score cannot be more than the total.'; score.focus(); return; }
      var wp = L.splitList(weak.value), ns = next.value.trim();
      if (rec) {
        rec.score = sc; rec.total = tt; rec.weakPoints = wp; rec.nextStep = ns; rec.edited = true;
        var ok = save();
        ui.editing = null; ui.manualOpen = false;
        showSaved(rec.topicId, rec, ok, true);
      } else {
        ui.manualOpen = false;
        commit(topicId, { source: 'manual', mode: tt >= 10 ? 'full' : 'quick', score: sc, total: tt, weakPoints: wp, nextStep: ns });
      }
    });
    var d = h('details', { class: 'more', id: 'manual' }, h('summary', null, rec ? 'Edit result' : 'Enter score by hand'), form);
    d.open = ui.manualOpen || !!rec;
    d.addEventListener('toggle', function () { ui.manualOpen = d.open; });
    return d;
  }

  function startEdit(id) {
    ui.editing = id; ui.manualOpen = true; ui.msg = null;
    render();
    var d = document.getElementById('manual');
    if (d && d.scrollIntoView) d.scrollIntoView({ block: 'center' });
    var s = document.getElementById('m-score'); if (s) s.focus();
  }

  // ---------- history ----------
  function historyCard(id) {
    var list = L.resultsFor(data.results, id).slice().reverse();
    var card = h('section', { class: 'card' }, h('h3', null, 'History'));
    if (!list.length) { card.appendChild(h('p', { class: 'empty' }, 'No results yet. Your first test will show here.')); return card; }
    card.appendChild(h('ul', { class: 'history' }, list.map(function (r) {
      var lvl = L.levelFromPct(L.pct(r));
      return h('li', null,
        h('div', { class: 'hist-top' },
          h('strong', null, fmt(r.date)),
          h('span', { class: 'score' }, r.score + '/' + r.total),
          badge(lvl),
          h('span', { class: 'small muted' }, MODE_LABEL[r.mode] || r.mode),
          r.edited ? h('span', { class: 'edited' }, 'edited') : null),
        r.weakPoints.length ? h('p', { class: 'small' }, 'Weak: ' + r.weakPoints.join('; ')) : null,
        r.nextStep ? h('p', { class: 'small' }, 'Next: ' + r.nextStep) : null,
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn small secondary', type: 'button', onclick: function () { startEdit(r.id); } }, 'Edit'),
          h('button', { class: 'btn small danger', type: 'button', onclick: function () {
            setMsg({ type: 'warn', lines: ['Delete the ' + fmt(r.date) + ' result (' + r.score + '/' + r.total + ')? This cannot be undone.'],
              actions: [{ label: 'Delete', kind: 'danger', fn: function () { removeResult(r.id); clearMsg(); } }, { label: 'Cancel', kind: 'secondary', fn: clearMsg }] });
          } }, 'Delete')));
    })));
    return card;
  }

  window.addEventListener('hashchange', render);
  render();
})();
