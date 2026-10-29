// One-time generator: reads the syllabus text and writes src/syllabus.js with permanent topic ids.
const fs = require('fs');
const text = fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42).replace(/-$/, '');
const phases = [];
let cur = null;
for (const line of text) {
  const ph = line.match(/^## Phase (\d+): (.+)$/);
  if (ph) { cur = { n: +ph[1], name: ph[2].trim(), topics: [] }; phases.push(cur); continue; }
  if (/^## /.test(line)) { cur = null; continue; }
  const it = line.match(/^(\d+)\. (.+)$/);
  if (it && cur) {
    const m = it[2].match(/^(.*?) — (REVISE|LEARN|TEST|BUILD)(.*)$/);
    const name = m ? m[1].trim() : it[2].trim();
    const tag = m ? m[2] : 'UNSET';
    const note = m ? m[3].trim() : '';
    cur.topics.push({ id: `p${cur.n}-${slug(name)}`, name, tag, note, n: +it[1] });
  }
}
const coreRule = (p, t) => {
  if (p.n >= 11) return false;
  if (p.n === 8) return t.n >= 7;            // testing is core, security is "learn next"
  if (p.n === 4) return t.n <= 8;            // Oracle, MongoDB/Redis are later
  return true;
};
const out = { version: 1, phases: [] , projects: [] };
for (const p of phases) {
  if (p.n === 10) {
    out.projects = [
      { id: 'student-mgmt', name: 'Student Management System', stack: 'Java, JDBC and MySQL', needs: [2, 4, 6] },
      { id: 'employee-api', name: 'Employee Management REST API', stack: 'Spring Boot, JPA and MySQL', needs: [4, 6, 7] },
      { id: 'job-portal', name: 'Full Stack Job Portal', stack: 'React, TypeScript, Spring Boot and MySQL', needs: [4, 7, 9] }
    ];
    continue;
  }
  out.phases.push({
    id: `p${p.n}`, number: p.n, name: p.name,
    topics: p.topics.map(t => ({ id: t.id, name: t.name, tag: t.tag, note: t.note, core: coreRule(p, t) }))
  });
}
const ids = out.phases.flatMap(p => p.topics.map(t => t.id));
if (new Set(ids).size !== ids.length) { console.error('Duplicate ids', ids.filter((x, i) => ids.indexOf(x) !== i)); process.exit(1); }
fs.writeFileSync('src/syllabus.js', 'var SYLLABUS = ' + JSON.stringify(out, null, 1) + ';\nif (typeof module !== "undefined") module.exports = SYLLABUS;\n');
console.log(out.phases.length, 'phases,', ids.length, 'topics,', out.projects.length, 'projects');
