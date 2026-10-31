// Tiny DOM helpers. No framework: screens are built with h() and replaced on every render.

function append(el, child) {
  if (child == null || child === false) return;
  if (Array.isArray(child)) child.forEach(c => append(el, c));
  else if (child.nodeType) el.appendChild(child);
  else el.appendChild(document.createTextNode(String(child)));
}

/** h('div', { class: 'card', onclick: fn }, child, child) builds an element. Text is always added as text, never as HTML. */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'value') el.value = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  children.forEach(c => append(el, c));
  return el;
}

/** Copy text to the clipboard. Resolves true on success, false if the browser blocked it. */
export function copyText(text) {
  return new Promise(resolve => {
    function legacy() {
      try {
        const ta = h('textarea', { 'aria-hidden': 'true', tabindex: '-1', style: 'position:fixed;top:0;left:0;opacity:0;height:1px;width:1px' });
        ta.value = text;
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => resolve(true), () => resolve(legacy()));
    } else resolve(legacy());
  });
}
