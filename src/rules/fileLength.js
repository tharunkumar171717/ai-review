const { RULES, LIMITS } = require('../constants');
const { createFinding } = require('./finding');

// A trailing newline produces an empty last element that isn't a real line.
const lineCount = (file) => file.lines.length - (file.content.endsWith('\n') ? 1 : 0);

function run(files) {
  return files
    .filter((file) => file.isCode && lineCount(file) > LIMITS.MAX_FILE_LINES)
    .map((file) => {
      const message = `File has **${lineCount(file)}** lines (limit ${LIMITS.MAX_FILE_LINES}). Split it into smaller modules.`;
      return createFinding(RULES.FILE_TOO_LONG, file, 1, message);
    });
}

module.exports = { run };
