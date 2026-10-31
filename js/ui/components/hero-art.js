// The laptop-and-books picture on the hero banner. Drawn here, no image file needed.
const NS = 'http://www.w3.org/2000/svg';

const ART = `
<ellipse cx="170" cy="168" rx="150" ry="9" fill="#06124A" opacity=".35"/>
<rect x="150" y="128" width="64" height="12" rx="3" fill="#F4B63F"/>
<rect x="156" y="116" width="58" height="12" rx="3" fill="#7CD4FF"/>
<rect x="148" y="104" width="62" height="12" rx="3" fill="#FF8FA6"/>
<rect x="46" y="38" width="130" height="84" rx="8" fill="#0A1A66"/>
<rect x="52" y="44" width="118" height="72" rx="4" fill="#142C9E"/>
<path d="M92 66l-16 14 16 14M130 66l16 14-16 14M117 62l-12 36" stroke="#7CD4FF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M30 122h162l-10 16H40z" fill="#C9D4FF"/>
<rect x="96" y="124" width="30" height="5" rx="2.5" fill="#8FA2E8"/>
<circle cx="228" cy="52" r="5" fill="#7CD4FF" opacity=".7"/>
<circle cx="24" cy="48" r="4" fill="#FF8FA6" opacity=".7"/>
<path d="M236 84l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#F4B63F"/>`;

export function heroArt() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 260 180');
  svg.setAttribute('class', 'hero-art');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = ART;
  return svg;
}
