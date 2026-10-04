const fs = require('fs');
const path = require('path');
const { IGNORED_PATH_PATTERN } = require('./constants');
const { runRules } = require('./rules');
const { buildFileModel, shouldReview } = require('./utils/source');
const { formatConsole } = require('./formatter');

function collectFiles(target) {
  if (IGNORED_PATH_PATTERN.test(target)) return [];
  if (fs.statSync(target).isFile()) return shouldReview(target) ? [target] : [];
  return fs.readdirSync(target).flatMap((entry) => collectFiles(path.join(target, entry)));
}

/** Reviews files/folders on disk and prints the findings. Handy before opening a PR. */
async function runLocal(targets) {
  const paths = (targets.length > 0 ? targets : ['.']).flatMap(collectFiles);
  const models = paths.map((filePath) => buildFileModel(path.relative(process.cwd(), filePath), fs.readFileSync(filePath, 'utf8')));
  const findings = runRules(models);
  process.stdout.write(`${formatConsole(findings)}\n`);
  return findings;
}

module.exports = { runLocal };
