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

/** Importance as stars: 5 = must know. Filled stars plus a text label, so it never depends on colour. */
export function stars(n, withText) {
  n = Math.max(1, Math.min(5, n | 0));
  const label = ['', 'Nice to know', 'Low priority', 'Useful', 'Important', 'Must know'][n];
  return h('span', { class: 'stars', role: 'img', 'aria-label': 'Importance ' + n + ' of 5: ' + label, title: label },
    h('span', { 'aria-hidden': 'true' }, '★'.repeat(n), h('span', { class: 'off' }, '☆'.repeat(5 - n))),
    withText ? h('span', { class: 'stars-text' }, label) : null);
}
