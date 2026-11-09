// Projects page: your own projects only. Nothing is pre-made. Add a project when you build it: its name,
// the skills you learned and used, your GitHub link, status and a note. Everything can be edited later.
import { h } from '../ui/dom.js';
import { projectReady, BUILD_READY, orderedPhases, cleanCustomProjects, MAX_CUSTOM } from '../core/index.js';
import { render } from '../ui/render.js';
import { context } from '../state/context.js';
import { store, save } from '../state/store.js';
import { states, projState, projectList } from '../state/selectors.js';
import { STATUS_LABEL } from '../ui/format.js';
import { ui } from '../state/session.js';
import { icon } from '../ui/components/icons.js';

/**
 * One form for adding and editing. `project` is null when adding.
 * Fields: name, skills learned and used (free text), phases it needs (drives "skills ready"), status, GitHub link, note.
 */
function projectForm(project) {
  const adding = !project;
  const id = project ? project.id : 'new';
  const saved = project ? projState(project.id) : { status: 'notstarted', link: '', note: '' };
  const f = k => k + '-' + id;
  const name = h('input', { type: 'text', id: f('name'), maxlength: '80', placeholder: 'Library Management System', value: project ? project.name : '' });
  const stack = h('input', { type: 'text', id: f('stack'), maxlength: '120', placeholder: 'Java, Spring Boot, MySQL, JPA, JUnit', value: project ? project.stack : '' });
  const boxes = orderedPhases(context.syllabus.phases).map(ph => {
    const cb = h('input', { type: 'checkbox', value: String(ph.number), id: f('ph' + ph.number) });
    cb.checked = !!(project && project.needs.includes(ph.number));
    return h('label', { class: 'np-phase', for: f('ph' + ph.number) }, cb, 'Phase ' + ph.number + ' · ' + ph.name);
  });
  const status = h('select', { id: f('status') }, Object.keys(STATUS_LABEL).map(k => h('option', { value: k }, STATUS_LABEL[k])));
  status.value = saved.status;
  const link = h('input', { type: 'text', id: f('link'), inputmode: 'url', placeholder: 'https://github.com/you/project', value: saved.link });
  const note = h('input', { type: 'text', id: f('note'), placeholder: 'One line: what is built, what is next', value: saved.note });
  const err = h('p', { class: 'small msg-bad', role: 'alert' });

  const form = h('form', { class: 'stack', id: adding ? 'add-project-form' : 'edit-project-form', novalidate: true },
    h('label', { class: 'field', for: f('name') }, 'Project name', name),
    h('label', { class: 'field', for: f('stack') }, 'Skills I learned and used', stack),
    h('fieldset', { class: 'np-needs' }, h('legend', null, 'Areas it uses'),
      h('p', { class: 'small muted' }, 'Tick the phases this project uses. The card then shows how ready your skills are for it.'), boxes),
    h('label', { class: 'field', for: f('status') }, 'Status', status),
    h('label', { class: 'field', for: f('link') }, 'GitHub link', link),
    h('label', { class: 'field', for: f('note') }, 'Note', note),
    err,
    h('div', { class: 'btn-row' },
      h('button', { class: 'btn', type: 'submit', id: adding ? 'np-save' : 'ep-save' }, adding ? 'Add project' : 'Save changes'),
      h('button', { class: 'btn secondary', type: 'button', id: 'pj-cancel', onclick: () => { ui.addProjectOpen = false; ui.editProject = null; render(); } }, 'Cancel'),
      !adding ? h('button', { class: 'btn secondary', type: 'button', id: 'rm-' + project.id, onclick: () => {
        if (!confirm('Remove "' + project.name + '" and its saved status, link and note?')) return;
        store.data.customProjects = store.data.customProjects.filter(p => p.id !== project.id);
        delete store.data.projects[project.id];
        ui.editProject = null; save(); render();
      } }, 'Remove project') : null));

  form.addEventListener('submit', e => {
    e.preventDefault(); err.textContent = '';
    const list = store.data.customProjects || [];
    if (adding && list.length >= MAX_CUSTOM) { err.textContent = 'You can add up to ' + MAX_CUSTOM + ' projects. Remove one first.'; return; }
    if (!name.value.trim()) { err.textContent = 'Give the project a name.'; name.focus(); return; }
    const url = link.value.trim();
    if (url && !/^https:\/\/\S+\.\S+/i.test(url)) { err.textContent = 'The link should start with https:// (for example https://github.com/you/project).'; link.focus(); return; }
    if (status.value === 'done' && !url) { err.textContent = 'Add the GitHub link before marking this project Done.'; link.focus(); return; }
    const needs = boxes.map(l => l.firstChild).filter(c => c.checked).map(c => +c.value);
    const pid = adding ? 'my-' + Date.now().toString(36) : project.id;
    const [clean] = cleanCustomProjects([{ id: pid, name: name.value, stack: stack.value, needs }]);
    store.data.customProjects = adding ? list.concat([clean]) : list.map(p => (p.id === pid ? clean : p));
    store.data.projects[pid] = { status: status.value, link: url, note: note.value.trim() };
    ui.addProjectOpen = false; ui.editProject = null;
    save(); render();
  });
  return form;
}

/** Read-only card: name, skills, status, GitHub button, note and the skills-ready line. Edit opens the form. */
function projectCard(project, st) {
  if (ui.editProject === project.id) {
    return h('section', { class: 'card custom-proj' }, h('h3', null, 'Edit project'), projectForm(project));
  }
  const saved = projState(project.id);
  const ready = projectReady(project, context.syllabus.phases, st);
  const percent = Math.round(ready.share * 100) + '%';
  return h('section', { class: 'card custom-proj' },
    h('div', { class: 'summary-head' }, h('h3', null, project.name),
      h('span', { class: 'lvl lvl-' + (saved.status === 'done' ? 'strong' : saved.status === 'building' ? 'ok' : 'untested') }, STATUS_LABEL[saved.status])),
    project.stack ? h('p', { class: 'small' }, h('strong', null, 'Skills: '), project.stack) : null,
    saved.note ? h('p', { class: 'small muted' }, saved.note) : null,
    project.needs.length ? h('p', { class: 'small ' + (ready.ready ? '' : 'muted') },
      'Skills ready: ' + percent + ' of the core topics in the areas you ticked are Strong or Done. ' +
      (ready.ready ? 'You can start building.' : 'Building works best from ' + Math.round(BUILD_READY * 100) + '%.')) : null,
    h('div', { class: 'btn-row' },
      saved.link ? h('a', { class: 'btn small', href: saved.link, target: '_blank', rel: 'noopener noreferrer', id: 'gh-' + project.id }, 'Open GitHub') : null,
      h('button', { class: 'btn small secondary', type: 'button', id: 'edit-' + project.id, onclick: () => { ui.editProject = project.id; ui.addProjectOpen = false; render(); } }, 'Edit')));
}

export function projectsPage() {
  const st = states();
  const list = projectList();
  const frag = document.createDocumentFragment();
  frag.appendChild(h('div', { class: 'summary-head' },
    h('div', null, h('h2', null, 'Projects'),
      h('p', { class: 'small muted' }, 'Add a project when you build it: the skills you used, the status and your GitHub link.')),
    !ui.addProjectOpen ? h('button', { class: 'btn', type: 'button', id: 'add-project-btn', onclick: () => { ui.addProjectOpen = true; ui.editProject = null; render(); } }, icon('projects', 20), 'Add project') : null));
  if (ui.addProjectOpen) frag.appendChild(h('section', { class: 'card', id: 'add-project' }, h('h3', null, 'New project'), projectForm(null)));
  if (!list.length && !ui.addProjectOpen) {
    frag.appendChild(h('section', { class: 'card' }, h('p', { class: 'empty' }, 'No projects yet. When you build one, tap Add project and fill in what you used and your GitHub link.')));
  }
  for (const project of list) frag.appendChild(projectCard(project, st));
  frag.appendChild(h('section', { class: 'card' },
    h('h3', null, 'Before you mark a project Done'),
    h('ul', { class: 'plain' },
      h('li', null, 'Authentication, validation and error handling are in.'),
      h('li', null, 'Unit and integration tests are written.'),
      h('li', null, 'It is on GitHub with a clear README, and you can explain every part of the code.'))));
  return frag;
}
