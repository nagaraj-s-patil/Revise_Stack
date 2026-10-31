// In-memory screen state. Lost on reload, which is fine: nothing here is progress.
export const ui = {
  filter: 'all',       // syllabus filter chip
  open: null,          // which syllabus phases are expanded
  mode: 'quick',       // test mode shown on the topic or Today card
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
  installDismissed: false
};

/** Back to a fresh Today screen (used after saving, to move to the next task). */
export function resetToday() {
  ui.msg = null; ui.todayId = null; ui.todayIdx = 0; ui.short = false; ui.copied = false;
}
