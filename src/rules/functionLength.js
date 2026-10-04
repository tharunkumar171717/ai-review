const { RULES, LIMITS } = require('../constants');
const { findFunctions } = require('../utils/functions');
const { createFinding } = require('./finding');

function run(files) {
  return files
    .filter((file) => file.isCode)
    .flatMap((file) =>
      findFunctions(file.code)
        .filter((fn) => fn.length > LIMITS.MAX_FUNCTION_LINES)
        .map((fn) => {
          const message =
            `\`${fn.name}\` is **${fn.length}** lines long (limit ${LIMITS.MAX_FUNCTION_LINES}). ` +
            'Break it into smaller, single-purpose functions.';
          return createFinding(RULES.FUNCTION_TOO_LONG, file, fn.startLine, message);
        }),
    );
}

module.exports = { run };
