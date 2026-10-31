// The loaded syllabus, plus a lookup from topic id to { topic, phase }.
export const context = { syllabus: null, byId: {} };

export function setSyllabus(syllabus) {
  context.syllabus = syllabus;
  context.byId = {};
  for (const phase of syllabus.phases) {
    for (const topic of phase.topics) context.byId[topic.id] = { topic, phase };
  }
}
