const { RULES, LIMITS } = require('../constants');
const { createFinding } = require('./finding');

const IMPORT_LINE = /^(import\b|.*\brequire\s*\()/;
// A bare name like `GEMINI_API_URL,` (import / export lists) isn't logic worth de-duplicating.
const NAME_ONLY_LINE = /^[\w$]+,?$/;

function meaningfulLines(file) {
  return file.textLines
    .map((text, index) => ({ text: text.trim().replace(/\s+/g, ' '), line: index + 1 }))
    .filter(({ text }) => text.length >= LIMITS.MIN_DUPLICATE_LINE_CHARS && !IMPORT_LINE.test(text) && !NAME_ONLY_LINE.test(text));
}

function isOverlapping(first, file, line) {
  return first.path === file.path && line - first.line < LIMITS.DUPLICATE_BLOCK_LINES;
}

/** Flags blocks of N identical (whitespace-insensitive) lines seen earlier in any changed file. */
function run(files) {
  const blockSize = LIMITS.DUPLICATE_BLOCK_LINES;
  const seen = new Map();
  const findings = [];
  for (const file of files.filter((f) => f.isCode)) {
    const entries = meaningfulLines(file);
    for (let i = 0; i + blockSize <= entries.length; i++) {
      const key = entries.slice(i, i + blockSize).map((entry) => entry.text).join('\n');
      const first = seen.get(key);
      const { line } = entries[i];
      if (!first) {
        seen.set(key, { path: file.path, line });
        continue;
      }
      if (isOverlapping(first, file, line)) continue;
      const message =
        `This block (${blockSize}+ lines) duplicates \`${first.path}:${first.line}\`. ` +
        'Extract it into a shared, reusable function.';
      findings.push(createFinding(RULES.DUPLICATE_CODE, file, line, message));
      i += blockSize - 1;
    }
  }
  return findings;
}

module.exports = { run };
