const fs = require('fs');
const { LIMITS, INLINE_MARKER_PREFIX } = require('./constants');
const { createGithubClient } = require('./github');
const { runRules, sortFindings } = require('./rules');
const { runAiReview } = require('./ai');
const { buildFileModel, shouldReview } = require('./utils/source');
const { parseAddedLines } = require('./utils/diff');
const { formatInlineComment, formatSummary, formatConsole } = require('./formatter');

const INLINE_RULE_ID = new RegExp(`${INLINE_MARKER_PREFIX}([\\w-]+)`);

function readPrContext() {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !GITHUB_EVENT_PATH) {
    throw new Error('Missing GITHUB_TOKEN / GITHUB_REPOSITORY / GITHUB_EVENT_PATH. Use --local to run outside GitHub Actions.');
  }
  const event = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, 'utf8'));
  if (!event.pull_request) throw new Error('This workflow must be triggered by a pull_request event.');
  return {
    token: GITHUB_TOKEN,
    repository: GITHUB_REPOSITORY,
    prNumber: event.pull_request.number,
    headSha: event.pull_request.head.sha,
  };
}

function loadModels(prFiles) {
  return prFiles
    .filter((file) => shouldReview(file.filename) && fs.existsSync(file.filename))
    .map((file) => buildFileModel(file.filename, fs.readFileSync(file.filename, 'utf8')));
}

const findingKey = (path, line, ruleId) => `${path}:${line}:${ruleId}`;

function existingInlineKeys(reviewComments) {
  return new Set(
    reviewComments
      .map((comment) => ({ comment, ruleId: comment.body?.match(INLINE_RULE_ID)?.[1] }))
      .filter(({ ruleId }) => ruleId)
      .map(({ comment, ruleId }) => findingKey(comment.path, comment.line, ruleId)),
  );
}

/**
 * Splits findings into ones we can comment inline (line is in the diff) and the rest.
 * At most MAX_REPORTED_FINDINGS are reported per PR (already-posted ones count too); the rest are hidden.
 */
function splitFindings(findings, addedLinesByPath, alreadyPosted) {
  const inline = [];
  const outside = [];
  let reported = 0;
  for (const finding of findings) {
    if (reported >= LIMITS.MAX_REPORTED_FINDINGS) break;
    reported++;
    if (alreadyPosted.has(findingKey(finding.path, finding.line, finding.ruleId))) continue;
    const inDiff = addedLinesByPath.get(finding.path)?.has(finding.line);
    (inDiff ? inline : outside).push(finding);
  }
  return { inline, outside, hiddenCount: findings.length - reported };
}

async function runPullRequest() {
  const context = readPrContext();
  const github = createGithubClient(context);
  const prFiles = (await github.listPrFiles()).filter((file) => file.status !== 'removed');

  const aiKey = process.env.GEMINI_API_KEY || process.env.Google_Gemini_key;
  const aiFindings = await runAiReview(prFiles, aiKey, process.env.GEMINI_MODEL || undefined);
  const findings = sortFindings([...runRules(loadModels(prFiles)), ...aiFindings]);

  const addedLinesByPath = new Map(prFiles.map((file) => [file.filename, parseAddedLines(file.patch)]));
  const alreadyPosted = existingInlineKeys(await github.listReviewComments());
  const { inline, outside, hiddenCount } = splitFindings(findings, addedLinesByPath, alreadyPosted);

  if (inline.length > 0) {
    const comments = inline.map((f) => ({ path: f.path, line: f.line, side: 'RIGHT', body: formatInlineComment(f) }));
    await github.createReview(context.headSha, comments);
  }
  await github.upsertSummary(formatSummary(findings, outside, hiddenCount));
  process.stdout.write(`${formatConsole(findings)}\n`);
  return findings;
}

module.exports = { runPullRequest, splitFindings };
