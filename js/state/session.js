// In-memory screen state. Lost on reload, which is fine: nothing here is progress.
export const ui = {
  filter: 'all',       // syllabus filter chip
  open: null,          // which syllabus phases are expanded
  mode: 'full',        // test mode shown on the topic or Today card
  msg: null,           // the message box under the Copy card
  editing: null,       // id of the result being edited
  manualOpen: false,
  promptOpen: false,
  todayId: null,       // topic pinned on the Today card
  todayIdx: 0,         // position in today's queue
  short: false,        // "Short on time?" mode
  copied: false,       // prompt copied, so the paste box is shown
  from: 'today',       // where the topic page's back link goes
  nextMode: null,      // mode to open the next topic page with
  summaryTime: null,   // time chosen for the progress summary
  importText: '',      // text typed into the restore box
  editProject: null,       // id of the project being edited
  addProjectOpen: false,   // the Add a project form is open
  pfEdit: false,        // Profile page is showing the edit form
  installDismissed: false
};

/** Back to a fresh Today screen (used after saving, to move to the next task). */
export function resetToday() {
  ui.msg = null; ui.todayId = null; ui.todayIdx = 0; ui.short = false; ui.copied = false;
}
