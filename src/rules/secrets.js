const { RULES, SECRET_PATTERNS } = require('../constants');
const { createFinding } = require('./finding');

function checkEnvFile(file) {
  const message = 'Environment files must never be committed. Remove it, rotate the keys and add it to `.gitignore`.';
  return [createFinding(RULES.ENV_FILE_COMMITTED, file, 1, message)];
}

function checkSecrets(file) {
  const findings = [];
  file.textLines.forEach((text, index) => {
    if (!SECRET_PATTERNS.some((pattern) => pattern.test(text))) return;
    const message = 'Looks like a credential is hardcoded. Load it from an environment variable / secret manager instead.';
    findings.push(createFinding(RULES.HARDCODED_SECRET, file, index + 1, message));
  });
  return findings;
}

function run(files) {
  return files.flatMap((file) => {
    if (file.isEnvFile) return checkEnvFile(file);
    return file.isCode ? checkSecrets(file) : [];
  });
}

module.exports = { run };
