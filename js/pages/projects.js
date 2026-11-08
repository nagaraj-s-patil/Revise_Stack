// Projects page: status, repository link and note for each portfolio project.
import { h, hideLabel } from '../ui/dom.js';
import { projectReady, BUILD_READY, orderedPhases, cleanCustomProjects, MAX_CUSTOM } from '../core/index.js';
import { render } from '../ui/render.js';
import { context } from '../state/context.js';
import { store, save } from '../state/store.js';
import { states, projState, projectList } from '../state/selectors.js';
import { STATUS_LABEL } from '../ui/format.js';
import { ui } from '../state/session.js';

function projectCard(project, st) {
  const saved = projState(project.id);
  const ready = projectReady(project, context.syllabus.phases, st);
  const percent = Math.round(ready.share * 100) + '%';

  const status = h('select', { id: 'st-' + project.id },
    Object.keys(STATUS_LABEL).map(k => h('option', { value: k }, STATUS_LABEL[k])));
  status.value = saved.status;
  const link = h('input', { type: 'text', id: 'ln-' + project.id, inputmode: 'url', placeholder: 'https://github.com/you/project', value: saved.link });
  const note = h('input', { type: 'text', id: 'nt-' + project.id, placeholder: 'One line: what is built, what is next', value: saved.note });
  const err = h('p', { class: 'small', style: 'color:var(--weak)', role: 'alert' });
  const ok = h('p', { class: 'small', style: 'color:var(--strong)', role: 'status', 'aria-live': 'polite' });

  const form = h('form', { class: 'inner stack', novalidate: true },
    h('label', { class: 'field', for: 'st-' + project.id }, 'Status', status),
    h('label', { class: 'field', for: 'ln-' + project.id }, 'Repository link', link),
    h('label', { class: 'field', for: 'nt-' + project.id }, 'Note', note),
    err, ok,
    h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'submit' }, 'Save project')));
  form.addEventListener('submit', e => {
    e.preventDefault();
    err.textContent = ''; ok.textContent = '';
    const url = link.value.trim();
    if (url && !/^https:\/\/\S+\.\S+/i.test(url)) { err.textContent = 'The link should start with https:// (for example https://github.com/you/project).'; link.focus(); return; }
    if (status.value === 'done' && !url) { err.textContent = 'Add the repository link before marking this project Done.'; link.focus(); return; }
    store.data.projects[project.id] = { status: status.value, link: url, note: note.value.trim() };
    ok.textContent = save() ? 'Saved.' : 'Could not save to this browser.';
  });

  const skills = 'Skills ready: ' + percent + ' of the needed core topics are Strong or Done. ' +
    (ready.ready ? 'You can start building.' : 'Building works best from ' + Math.round(BUILD_READY * 100) + '%.');
  const remove = project.custom ? h('button', { class: 'btn small secondary', type: 'button', id: 'rm-' + project.id, onclick: () => {
    if (!confirm('Remove "' + project.name + '" and its saved status, link and note?')) return;
    store.data.customProjects = store.data.customProjects.filter(p => p.id !== project.id);
    delete store.data.projects[project.id];
    save(); render();
  } }, 'Remove project') : null;
  if (remove) form.querySelector('.btn-row').appendChild(remove);
  return h('section', { class: 'card' + (project.custom ? ' custom-proj' : '') },
    h('div', null, h('h3', null, project.name), h('p', { class: 'small muted' }, (project.stack || 'Your own project') + (project.custom ? ' · added by you' : ''))),
    h('p', { class: 'small ' + (ready.ready ? '' : 'muted') }, skills),
    form);
}

/** "Add a project": name, stack and which phases it needs (so skills-ready works for it too). Closed until clicked. */
function addProjectCard() {
  const name = h('input', { type: 'text', id: 'np-name', maxlength: '80', placeholder: 'Library Management System' });
  const stack = h('input', { type: 'text', id: 'np-stack', maxlength: '120', placeholder: 'Java, Spring Boot and MySQL' });
  const boxes = orderedPhases(context.syllabus.phases).map(ph => {
    const cb = h('input', { type: 'checkbox', value: String(ph.number), id: 'np-ph-' + ph.number });
    return h('label', { class: 'np-phase', for: 'np-ph-' + ph.number }, cb, 'Phase ' + ph.number + ' · ' + ph.name);
  });
  const err = h('p', { class: 'small msg-bad', role: 'alert' });
  const form = h('form', { class: 'inner stack', id: 'add-project-form', novalidate: true },
    h('label', { class: 'field', for: 'np-name' }, 'Project name', name),
    h('label', { class: 'field', for: 'np-stack' }, 'Tech stack (optional)', stack),
    h('fieldset', { class: 'np-needs' }, h('legend', null, 'Skills it needs'),
      h('p', { class: 'small muted' }, 'Tick the phases this project uses. The project card then shows how ready your skills are.'), boxes),
    err,
    h('div', { class: 'btn-row' }, h('button', { class: 'btn', type: 'submit', id: 'np-save' }, 'Add project')));
  form.addEventListener('submit', e => {
    e.preventDefault(); err.textContent = '';
    const list = store.data.customProjects || [];
    if (list.length >= MAX_CUSTOM) { err.textContent = 'You can add up to ' + MAX_CUSTOM + ' projects. Remove one first.'; return; }
    if (!name.value.trim()) { err.textContent = 'Give the project a name.'; name.focus(); return; }
    const needs = boxes.map(l => l.firstChild).filter(c => c.checked).map(c => +c.value);
    const id = 'my-' + Date.now().toString(36);
    const [clean] = cleanCustomProjects([{ id, name: name.value, stack: stack.value, needs }]);
    store.data.customProjects = list.concat([clean]);
    store.data.projects[id] = { status: 'notstarted', link: '', note: '' };
    ui.addProjectOpen = false;
    save(); render();
  });
  const d = h('details', { class: 'card more', id: 'add-project' }, h('summary', null, 'Add a project'), form);
  d.open = !!ui.addProjectOpen;
  d.addEventListener('toggle', () => { ui.addProjectOpen = d.open; });
  return hideLabel(d, 'Add a project', 'Hide add project');
}

export function projectsPage() {
  const st = states();
  const frag = document.createDocumentFragment();
  frag.appendChild(h('div', null,
    h('h2', null, 'Projects'),
    h('p', { class: 'small muted' }, 'Fresher roles are scarce, so a project you can explain counts for more than a topic score.')));
  frag.appendChild(h('section', { class: 'card' },
    h('h3', null, 'Before you mark a project Done'),
    h('ul', { class: 'plain' },
      h('li', null, 'Authentication, validation and error handling are in.'),
      h('li', null, 'Unit and integration tests are written.'),
      h('li', null, 'It is on GitHub with a clear README, and you can explain every part of the code.'))));
  frag.appendChild(addProjectCard());
  for (const project of projectList()) frag.appendChild(projectCard(project, st));
  return frag;
}
