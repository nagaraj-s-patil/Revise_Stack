import { h } from '../dom.js';
import { LEVEL_LABEL } from '../format.js';

/** Level badge: icon plus text, so meaning never depends on colour. */
export function badge(level) {
  return h('span', { class: 'lvl lvl-' + level }, h('i', { 'aria-hidden': 'true' }, LEVEL_LABEL[level][0]), LEVEL_LABEL[level][1]);
}
