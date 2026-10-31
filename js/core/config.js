// Tunable rules and constants. Change thresholds, study order and revision gaps here.

// The date you want to be ready to apply by (local calendar day, YYYY-MM-DD).
export const DEADLINE = '2027-01-28';

// Levels, as the share of correct answers in one test.
export const PASS = 0.6;     // 6/10 or better = OK
export const STRONG = 0.8;   // 8/10 or better = Strong, and counts towards Done

// Revision gaps in days after the first test of a passing run.
export const INTERVALS = [1, 3, 7, 14];

// Study order of the phases, by phase number. Follows the "Must Learn First" line of the syllabus:
// Java, SQL, Git, JDBC/JPA, Spring Boot and REST, JavaScript, React, Testing, then the rest.
export const PRIORITY = [1, 2, 4, 3, 6, 7, 5, 9, 8, 11, 12];

// Suggested thresholds. These are assumptions, not rules from any employer.
export const BUILD_READY = 0.7;   // start a project when 70% of its skills are Strong or Done

export const PROJECT_STATUS = ['notstarted', 'building', 'done'];
