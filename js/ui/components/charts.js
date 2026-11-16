// Small SVG helpers shared by the Analysis page and the dashboard.
const NS = 'http://www.w3.org/2000/svg';
export const svg = (tag, attrs, ...kids) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  kids.forEach(k => k != null && el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k));
  return el;
};

/** Donut: thin ring, one slice per part, share of the total in the middle. */
export function donut(parts, centerText, centerSub, label) {
  const R = 52, C = 2 * Math.PI * R, total = parts.reduce((a, x) => a + x.n, 0);
  const kids = [svg('circle', { cx: 70, cy: 70, r: R, fill: 'none', 'stroke-width': 16, class: 'dn-track' })];
  let off = 0;
  if (total) parts.forEach(x => {
    if (!x.n) return;
    const len = (x.n / total) * C, gap = parts.filter(y => y.n).length > 1 ? 2 : 0;
    kids.push(svg('circle', { cx: 70, cy: 70, r: R, fill: 'none', 'stroke-width': 16, class: x.cls, 'stroke-dasharray': Math.max(len - gap, 0.5) + ' ' + C,
      'stroke-dashoffset': -off, transform: 'rotate(-90 70 70)' }, svg('title', null, x.label + ': ' + x.n)));
    off += len;
  });
  kids.push(svg('text', { x: 70, y: 74, 'text-anchor': 'middle', class: 'dn-num' }, centerText));
  kids.push(svg('text', { x: 70, y: 92, 'text-anchor': 'middle', class: 'dn-sub' }, centerSub));
  return svg('svg', { viewBox: '0 0 140 140', class: 'donut', role: 'img', 'aria-label': label }, ...kids);
}

