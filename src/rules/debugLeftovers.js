const { RULES } = require('../constants');
const { createFinding } = require('./finding');

const DEBUG_CODE = /\bconsole\.(log|debug|trace)\s*\(|\bdebugger\b/;
const TODO = /\/\/.*\b(TODO|FIXME|HACK|XXX)\b|\/\*.*\b(TODO|FIXME|HACK|XXX)\b/;

function checkFile(file) {
  const findings = [];
  file.codeLines.forEach((codeLine, index) => {
    if (DEBUG_CODE.test(codeLine)) {
      const message = 'Remove debug statements before merging (use a proper logger if needed).';
      findings.push(createFinding(RULES.DEBUG_STATEMENT, file, index + 1, message));
    }
    if (TODO.test(file.lines[index])) {
      const message = 'Unresolved TODO/FIXME. Fix it now or link it to a ticket.';
      findings.push(createFinding(RULES.TODO_COMMENT, file, index + 1, message));
    }
  });
  return findings;
}

function run(files) {
  return files.filter((file) => file.isCode && !file.isTestFile).flatMap(checkFile);
}

module.exports = { run };
