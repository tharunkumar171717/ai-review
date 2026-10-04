const { RULES, LIMITS } = require('../constants');
const { createFinding } = require('./finding');

function run(files) {
  return files
    .filter((file) => file.isCode && file.lines.length > LIMITS.MAX_FILE_LINES)
    .map((file) => {
      const message = `File has **${file.lines.length}** lines (limit ${LIMITS.MAX_FILE_LINES}). Split it into smaller modules.`;
      return createFinding(RULES.FILE_TOO_LONG, file, 1, message);
    });
}

module.exports = { run };
