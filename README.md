# Revise Stack

A personal revision tracker for a Java Full Stack syllabus (117 topics, 3 projects).
Front end only: HTML, CSS and JavaScript. No backend, no login. Progress is saved in the browser (localStorage).

You take the tests in ChatGPT or Claude. This page only plans your day and records your level.

## How it works

1. **Today** shows one task: a due revision first, then a new topic.
2. **Copy test prompt** (Learn, Quick or Full) and paste it into an AI chat. Take the test.
3. **Paste the AI reply** back. The page reads the `RESULT_START ... RESULT_END` block and saves the score. A manual score form is the backup.
4. The page works out the level from the score:
   - Weak: below 6/10
   - OK: 6 to 7 out of 10
   - Strong: 8/10 or more
   - **Done:** 2 tests on 2 different days, both Strong, at least one a Full test (10 questions)
5. Revisions come back 1, 3, 7 and 14 days after the first test of a passing run. A result under 60% resets the schedule.
6. Streak: any saved test counts. One missed day per week is forgiven.

Other pages: Syllabus (filters, locked "Later" topics), Projects, Progress (readiness checks, weakest topics, mistakes that repeat, mock interview, progress summary for the AI) and Backup (copy and restore as text).

The levels, the 70% thresholds and the study order are suggestions, not facts. Change them in `src/logic.js`.

## Use it

Open `index.html` in a browser. It works without a server.

Progress is stored per browser and per address. If you host it, use one address and keep using it. Copy a backup from the **Backup** page now and then.

## Develop

Needs Node 18 or newer. No packages to install.

```
npm test            # logic tests
npm run build       # writes index.html (everything inlined)
npm run syllabus    # rebuilds src/syllabus.js from syllabus.md
```

- `src/logic.js`: parser, prompts, level and Done rules, revision dates, streak, queue, summary, backup. No page code, so Node can test it.
- `src/app.js`: screens and buttons.
- `src/styles.css`: styles, light and dark.
- `src/syllabus.js`: generated from `syllabus.md`. Topic ids are permanent. Never change an existing id, or that topic's history disconnects.
- `build.js`: inlines everything into `index.html`.

To change the syllabus, edit `syllabus.md`, run `npm run syllabus`, then `npm run build`.

## Known gaps

- Results for a topic id that is removed from the syllabus stay in your data and backup but are not shown on screen.
- Desktop uses a single centred column with the bottom tabs.
