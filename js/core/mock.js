// Mock interview prompt and the average of recent mock scores.

export function buildMockPrompt(c) {
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

export function averageMock(mocks, n) {
  var last = mocks.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.id < b.id ? 1 : -1); }).slice(0, n);
  if (!last.length) return null;
  var sum = 0; last.forEach(function (m) { sum += m.score / m.total; });
  return Math.round(sum / last.length * 100);
}
