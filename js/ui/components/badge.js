import { h } from '../dom.js';
import { LEVEL_LABEL } from '../format.js';

/** Level badge: icon plus text, so meaning never depends on colour. */
export function badge(level) {
  return h('span', { class: 'lvl lvl-' + level }, h('i', { 'aria-hidden': 'true' }, LEVEL_LABEL[level][0]), LEVEL_LABEL[level][1]);
}

/** Pre-test badge: the level the pre-test pointed to, labelled so it is never mistaken for a real level. */
export function preBadge(pre) {
  return h('span', { class: 'lvl lvl-' + pre.level, title: 'From the pre-test. Not counted in progress or revision.' },
    h('i', { 'aria-hidden': 'true' }, LEVEL_LABEL[pre.level][0]), 'Pre-test: ' + LEVEL_LABEL[pre.level][1]);
}
