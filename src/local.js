const fs = require('fs');
const path = require('path');
const { IGNORED_PATH_PATTERN } = require('./constants');
const { runAiReview, readAiConfig } = require('./ai');
const { sortFindings } = require('./findings');
const { buildFileModel, shouldReview } = require('./utils/source');
const { formatConsole } = require('./formatter');

function collectFiles(target) {
  if (IGNORED_PATH_PATTERN.test(target)) return [];
  if (fs.statSync(target).isFile()) return shouldReview(target) ? [target] : [];
  return fs.readdirSync(target).flatMap((entry) => collectFiles(path.join(target, entry)));
}

/** AI-reviews files/folders on disk (every line counts as changed) and prints the findings. */
async function runLocal(targets) {
  const paths = (targets.length > 0 ? targets : ['.']).flatMap(collectFiles);
  const files = paths.map((filePath) => {
    const model = buildFileModel(path.relative(process.cwd(), filePath), fs.readFileSync(filePath, 'utf8'));
    return { ...model, addedLines: new Set(model.lines.map((_, index) => index + 1)) };
  });
  const { apiKey, model } = readAiConfig();
  const findings = await runAiReview(files, apiKey, model);
  if (findings === null) throw new Error('AI review could not run. Check GEMINI_API_KEY in .env and try again.');
  const sorted = sortFindings(findings);
  process.stdout.write(`${formatConsole(sorted)}\n`);
  return sorted;
}

module.exports = { runLocal };
