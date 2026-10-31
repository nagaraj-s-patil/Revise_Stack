// Builds the Learn, Quick and Full test prompts that you paste into an AI chat.

export const FORMAT_RULES =
  'Do not write a level such as Weak, OK or Strong. My tracker works that out from the score.\n' +
  'If an answer is unclear or incomplete, mark it wrong. Be strict, like a real interviewer.\n' +
  'In weak_points, use short consistent names (for example "HashMap vs TreeMap"). Use the same name every time for the same mistake.';

export function block(topic, mode, total) {
  return 'RESULT_START\n' +
    'topic_id: ' + topic.id + '\n' +
    'mode: ' + mode + '\n' +
    'score: <number correct>/' + total + '\n' +
    'weak_points: <short list separated by semicolons, or none>\n' +
    'next_step: <one concrete practice task>\n' +
    'RESULT_END';
}

export function buildPrompt(topic, phase, mode, prevWeak) {
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
