const { RULES, ALLOWED_NUMBERS } = require('../constants');
const { createFinding } = require('./finding');

const NUMBER = /(?<![\w$.])\d+(?:\.\d+)?(?![\w$])/g;
const STRING_LITERAL = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
const URL = /https?:\/\/[^\s'"`]+/i;
const CONSTANT_DECLARATION = /^\s*(export\s+)?const\s+[A-Z][A-Z0-9_]*\s*=/;
const IMPORT_LINE = /^\s*import\b|\brequire\s*\(/;

function findHardcodedValue(codeLine, textLine) {
  for (const match of textLine.matchAll(STRING_LITERAL)) {
    const url = match[2].match(URL);
    if (url) return `Hardcoded URL \`${url[0]}\``;
  }
  const magic = [...codeLine.matchAll(NUMBER)].find((match) => !ALLOWED_NUMBERS.has(match[0]));
  return magic ? `Magic number \`${magic[0]}\`` : null;
}

function checkFile(file) {
  const findings = [];
  file.codeLines.forEach((codeLine, index) => {
    if (CONSTANT_DECLARATION.test(codeLine) || IMPORT_LINE.test(codeLine)) return;
    const value = findHardcodedValue(codeLine, file.textLines[index]);
    if (!value) return;
    const message = `${value} found. Move it to a constants/config file and import it.`;
    findings.push(createFinding(RULES.HARDCODED_VALUE, file, index + 1, message));
  });
  return findings;
}

function run(files) {
  return files.filter((file) => file.isCode && !file.isConstantsFile && !file.isTestFile).flatMap(checkFile);
}

module.exports = { run };
