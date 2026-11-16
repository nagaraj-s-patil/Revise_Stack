// "Learn from YouTube": ready-made search text for this topic. Copy it and paste it into YouTube, or open the search directly.
import { h, copyText } from '../dom.js';
import { youtubeSearches, youtubeUrl } from '../../core/index.js';

export function youtubeCard(topic, phase) {
  const note = h('p', { class: 'small', role: 'status', 'aria-live': 'polite' });
  const rows = youtubeSearches(topic, phase).map(s => {
    const copy = h('button', { class: 'btn small', type: 'button', 'data-yt': s.id }, 'Copy');
    copy.addEventListener('click', () => {
      copyText(s.query).then(ok => {
        copy.textContent = ok ? 'Copied' : 'Copy failed';
        note.textContent = ok ? 'Copied. Paste it into the YouTube search box.' : 'Copy was blocked here. Select the text above and copy it by hand.';
        setTimeout(() => { copy.textContent = 'Copy'; }, 2000);
      });
    });
    return h('li', { class: 'yt-row' },
      h('strong', null, s.label),
      h('code', { class: 'yt-query' }, s.query),
      h('span', { class: 'small muted' }, s.hint),
      h('div', { class: 'btn-row' }, copy,
        h('a', { class: 'btn small secondary', href: youtubeUrl(s.query), target: '_blank', rel: 'noopener noreferrer' }, 'Open YouTube')));
  });
  return h('section', { class: 'card', id: 'youtube-card', 'aria-label': 'Learn from YouTube' },
    h('h3', null, 'Learn from YouTube'),
    h('p', { class: 'small muted' }, 'Use one video, then practise, then take the test. Plan: watch up to 25 minutes, practise 25 minutes, test.'),
    h('ul', { class: 'plain yt-list' }, rows), note);
}
