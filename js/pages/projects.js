// Projects page: status, repository link and note for each portfolio project.
import { h } from '../ui/dom.js';
import { projectReady, BUILD_READY } from '../core/index.js';
import { context } from '../state/context.js';
import { store, save } from '../state/store.js';
import { states, projState } from '../state/selectors.js';

const STATUS_LABEL = { notstarted: 'Not started', building: 'Building', done: 'Done' };

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
  return h('section', { class: 'card' },
    h('div', null, h('h3', null, project.name), h('p', { class: 'small muted' }, project.stack)),
    h('p', { class: 'small ' + (ready.ready ? '' : 'muted') }, skills),
    form);
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
  for (const project of context.syllabus.projects) frag.appendChild(projectCard(project, st));
  return frag;
}
