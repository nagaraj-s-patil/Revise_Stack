// Lets any screen ask for a re-render without importing the shell (which imports the screens).
let renderer = () => {};

export function setRenderer(fn) { renderer = fn; }
export function render() { renderer(); }
