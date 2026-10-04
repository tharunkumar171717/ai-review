const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/** Calls `onLine(type, newLineNumber, text)` for each line of a unified diff patch. */
function walkPatch(patch, onLine) {
  let newLine = 0;
  for (const raw of (patch || '').split('\n')) {
    const hunk = raw.match(HUNK_HEADER);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith('\\')) continue;
    if (raw.startsWith('-')) {
      onLine('removed', null, raw.slice(1));
      continue;
    }
    onLine(raw.startsWith('+') ? 'added' : 'context', newLine, raw.slice(1));
    newLine++;
  }
}

function parseAddedLines(patch) {
  const added = new Set();
  walkPatch(patch, (type, line) => {
    if (type === 'added') added.add(line);
  });
  return added;
}

module.exports = { walkPatch, parseAddedLines };
