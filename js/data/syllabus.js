// Loads the syllabus from data/ (one JSON file per phase, plus projects.json) and checks that it is sound.
// The same assemble and validate functions are used by the browser and by the tests.

const TAGS = ['REVISE', 'LEARN', 'TEST', 'BUILD', 'UNSET'];

function fail(message) { throw new Error('Syllabus data problem: ' + message); }

/** Throws a clear error if the syllabus is malformed. Returns the syllabus when it is fine. */
export function validateSyllabus(s) {
  if (!s || !Array.isArray(s.phases) || !s.phases.length) fail('no phases found.');
  const phaseNumbers = new Set();
  const topicIds = new Set();
  for (const p of s.phases) {
    if (typeof p.id !== 'string' || !Number.isInteger(p.number) || typeof p.name !== 'string' || !Array.isArray(p.topics)) {
      fail('a phase is missing id, number, name or topics (' + JSON.stringify(p && p.id) + ').');
    }
    if (phaseNumbers.has(p.number)) fail('phase number ' + p.number + ' is used twice.');
    phaseNumbers.add(p.number);
    for (const t of p.topics) {
      if (typeof t.id !== 'string' || !t.id || typeof t.name !== 'string' || !t.name) fail('a topic in phase ' + p.number + ' has no id or name.');
      if (!TAGS.includes(t.tag)) fail('topic ' + t.id + ' has an unknown tag "' + t.tag + '".');
      if (typeof t.core !== 'boolean') fail('topic ' + t.id + ' needs core: true or false.');
      if (topicIds.has(t.id)) fail('topic id ' + t.id + ' is used twice.');
      topicIds.add(t.id);
    }
  }
  if (!Array.isArray(s.projects)) fail('projects must be a list.');
  const projectIds = new Set();
  for (const pr of s.projects) {
    if (typeof pr.id !== 'string' || !pr.id || typeof pr.name !== 'string' || typeof pr.stack !== 'string') fail('a project has no id, name or stack.');
    if (projectIds.has(pr.id)) fail('project id ' + pr.id + ' is used twice.');
    projectIds.add(pr.id);
    if (!Array.isArray(pr.needs) || pr.needs.some(n => !phaseNumbers.has(n))) fail('project ' + pr.id + ' needs a phase that does not exist.');
  }
  return s;
}

/** Combine the parsed files into one syllabus object: { version, phases, projects }. */
export function assembleSyllabus(index, phaseDocs, projectsDoc) {
  return validateSyllabus({ version: index.version, phases: phaseDocs, projects: projectsDoc.projects });
}

/** Fetch every data file in parallel and assemble them. `base` is relative to the page. */
export async function loadSyllabus(base = 'data/') {
  async function getJson(path) {
    const res = await fetch(base + path);
    if (!res.ok) throw new Error('Could not load ' + path + ' (' + res.status + ')');
    return res.json();
  }
  const index = await getJson('syllabus/index.json');
  const [phaseDocs, projectsDoc] = await Promise.all([
    Promise.all(index.phases.map(file => getJson('syllabus/' + file))),
    getJson('projects.json')
  ]);
  return assembleSyllabus(index, phaseDocs, projectsDoc);
}
