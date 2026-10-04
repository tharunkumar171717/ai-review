const fs = require('fs');
const {
  LIMITS,
  RULES,
  START_REACTION,
  DEFAULT_BOT_LOGIN,
  REVIEW_MODE,
  AI_FALLBACK_TO_RULES,
} = require('./constants');
const { createGithubClient } = require('./github');
const { runRules, sortFindings } = require('./rules');
const { runAiReview } = require('./ai');
const { buildFileModel, shouldReview } = require('./utils/source');
const { parseAddedLines } = require('./utils/diff');
const { formatInlineComment, formatSummary, formatConsole } = require('./formatter');
const { findingKey, syncThreads } = require('./threads');

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
    botLogin: process.env.REVIEW_BOT_LOGIN || DEFAULT_BOT_LOGIN,
  };
}

function loadModels(prFiles) {
  return prFiles
    .filter((file) => shouldReview(file.filename) && fs.existsSync(file.filename))
    .map((file) => buildFileModel(file.filename, fs.readFileSync(file.filename, 'utf8')));
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

const PATTERN_RULE_IDS = Object.values(RULES)
  .map((rule) => rule.id)
  .filter((id) => id !== RULES.AI_REVIEW.id);

/**
 * Runs the reviewers REVIEW_MODE asks for. Returns the findings plus the rule ids that did
 * not run this time, whose old threads must be left alone.
 */
async function collectFindings(models, addedLinesByPath, mode = REVIEW_MODE) {
  const aiKey = process.env.GEMINI_API_KEY || process.env.Google_Gemini_key;
  const aiFiles = models.map((model) => ({ ...model, addedLines: addedLinesByPath.get(model.path) || new Set() }));
  const aiFindings = mode === 'rules' ? null : await runAiReview(aiFiles, aiKey, process.env.GEMINI_MODEL || undefined);
  const aiFailed = mode !== 'rules' && aiFindings === null;
  const useRules = mode !== 'ai' || (aiFailed && AI_FALLBACK_TO_RULES);
  if (mode === 'ai' && aiFailed) {
    console.warn(useRules ? '⚠️  AI unavailable, falling back to pattern rules.' : '⚠️  AI unavailable, nothing reviewed.');
  }
  return {
    findings: sortFindings([...(useRules ? runRules(models) : []), ...(aiFindings || [])]),
    skippedRuleIds: [...(aiFindings === null ? [RULES.AI_REVIEW.id] : []), ...(useRules ? [] : PATTERN_RULE_IDS)],
  };
}

async function runPullRequest() {
  const context = readPrContext();
  const github = createGithubClient(context);
  await github.addReaction(START_REACTION).catch((error) => console.warn(`⚠️  Could not add reaction: ${error.message}`));
  const prFiles = (await github.listPrFiles()).filter((file) => file.status !== 'removed');

  const addedLinesByPath = new Map(prFiles.map((file) => [file.filename, parseAddedLines(file.patch)]));
  const { findings, skippedRuleIds } = await collectFindings(loadModels(prFiles), addedLinesByPath);
  const threads = await syncThreads(github, findings, context.botLogin, skippedRuleIds);
  process.stdout.write(`Threads: ${threads.resolved} auto-resolved, ${threads.reopened} re-opened.\n`);
  const { inline, outside, hiddenCount } = splitFindings(findings, addedLinesByPath, threads.posted);

  if (inline.length > 0) {
    const comments = inline.map((f) => ({ path: f.path, line: f.line, side: 'RIGHT', body: formatInlineComment(f) }));
    await github.createReview(context.headSha, comments);
  }
  await github.upsertSummary(formatSummary(findings, outside, hiddenCount));
  process.stdout.write(`${formatConsole(findings)}\n`);
  return findings;
}

module.exports = { runPullRequest, splitFindings, collectFindings };
