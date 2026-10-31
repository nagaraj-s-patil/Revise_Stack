// Reads the RESULT_START ... RESULT_END block out of an AI reply. Forgiving about formatting.

export function stripMd(s) {
  return s.replace(/\*+/g, '').replace(/`/g, '').replace(/^[\s>\-•]+/, '').trim();
}

export function parseResult(text) {
  if (!text || !text.trim()) return { ok: false, error: "Paste the AI's full reply first." };

  var re = /RESULT_START([\s\S]*?)(?:RESULT_END|$)/gi;
  var blocks = [], m;
  while ((m = re.exec(text)) !== null) { blocks.push(m[1]); if (m[0].length === 0) re.lastIndex++; }
  if (!blocks.length) {
    return { ok: false, error: "No result block found. Ask the AI: 'Give the final result in the RESULT_START format.'" };
  }

  // The AI may print the empty template first, so try the last block first.
  var firstError = null;
  for (var b = blocks.length - 1; b >= 0; b--) {
    var res = parseBlock(blocks[b]);
    if (res.ok) return res;
    if (!firstError) firstError = res;
  }
  return firstError;
}

export function parseBlock(body) {
  var fields = {};
  body.split(/\r?\n/).forEach(function (raw) {
    var line = stripMd(raw);
    var i = line.indexOf(':');
    if (i < 1) return;
    var key = line.slice(0, i).trim().toLowerCase().replace(/[\s\-]+/g, '_');
    fields[key] = line.slice(i + 1).trim();
  });

  var scoreText = fields.score;
  if (scoreText === undefined) return { ok: false, error: 'The result block has no score line (example: score: 6/10).' };
  var sm = scoreText.match(/(\d+)\s*(?:\/|out\s+of)\s*(\d+)/i);
  if (!sm) return { ok: false, error: 'Could not read the score "' + scoreText + '". It should look like 6/10.' };
  var score = +sm[1], total = +sm[2];
  if (total < 1 || total > 50 || score > total) {
    return { ok: false, error: 'Score looks wrong (' + score + '/' + total + '). Check the AI reply and paste again.' };
  }

  var weak = splitList(fields.weak_points || fields.weakpoints || '');
  var mode = /full/i.test(fields.mode || '') ? 'full' : /quick/i.test(fields.mode || '') ? 'quick' : (total >= 10 ? 'full' : 'quick');
  return {
    ok: true,
    data: {
      topicId: (fields.topic_id || fields.topic || '').trim() || null,
      mode: mode,
      score: score,
      total: total,
      weakPoints: weak,
      nextStep: clean(fields.next_step || '')
    }
  };
}

export function clean(s) { return /^(none|n\/a|-|nil)\.?$/i.test(s.trim()) ? '' : s.trim(); }

export function splitList(s) {
  s = clean(s);
  if (!s) return [];
  var parts = s.indexOf(';') >= 0 ? s.split(';') : s.split(',');
  return parts.map(function (x) { return x.trim(); }).filter(Boolean);
}
