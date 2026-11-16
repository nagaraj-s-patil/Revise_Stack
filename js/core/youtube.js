// YouTube search text for a topic, so you find one short video and practise, instead of browsing for hours.
// Pure text: the app copies it (or opens YouTube's search page) and you paste it into YouTube yourself.

// Technology word to put in front when the topic name does not already contain it, by phase number.
const TECH = { 1: 'Java', 2: 'Java', 4: 'SQL', 5: 'JavaScript', 6: 'Java', 7: 'Spring Boot', 8: 'Spring Boot', 9: 'React', 11: '', 12: '' };

function clean(s) { return s.replace(/[:/&()+]/g, ' ').replace(/\s+/g, ' ').trim(); }

/** The topic name as a search phrase, with the technology in front when it is missing. */
export function searchPhrase(topic, phase) {
  var name = clean(topic.name);
  var tech = TECH[phase && phase.number] || '';
  if (tech && name.toLowerCase().indexOf(tech.toLowerCase()) < 0) name = tech + ' ' + name;
  return name.slice(0, 90).trim();
}

/** Three searches: learn fast, practise, interview questions. Each has a time box so a topic does not eat your day. */
export function youtubeSearches(topic, phase) {
  var p = searchPhrase(topic, phase);
  return [
    { id: 'learn', label: 'Learn it fast', query: p + ' explained for beginners in 20 minutes', hint: 'Watch one video of 30 minutes or less. Pause and type the code yourself.' },
    { id: 'practice', label: 'Practise it', query: p + ' practice exercises coding along for beginners', hint: 'Do the exercises, not more videos. Aim for 25 minutes of typing.' },
    { id: 'interview', label: 'Interview questions', query: p + ' interview questions and answers for freshers', hint: 'Only after you have practised. Skip any video over 30 minutes.' }
  ];
}

export const youtubeUrl = query => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query);
