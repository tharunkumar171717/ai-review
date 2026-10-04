const { INLINE_MARKER_PREFIX } = require('./constants');

const INLINE_RULE_ID = new RegExp(`${INLINE_MARKER_PREFIX}([\\w-]+)`);

const findingKey = (path, line, ruleId) => `${path}:${line}:${ruleId}`;

// GraphQL reports app logins without the "[bot]" suffix that REST uses.
const normalizeLogin = (login) => (login || '').replace(/\[bot\]$/, '');

function botThreads(threads, botLogin) {
  return threads
    .map((thread) => ({ ...thread, ruleId: thread.body?.match(INLINE_RULE_ID)?.[1] }))
    .filter((thread) => thread.ruleId && normalizeLogin(thread.author) === normalizeLogin(botLogin));
}

/**
 * Decides what to do with each of this bot's review threads:
 *  - issue fixed (or its line is gone) and thread open   → resolve
 *  - issue still present but someone resolved the thread → unresolve
 * Threads of `skippedRuleIds` (rules that didn't run this time, e.g. the AI review when Gemini
 * is down) are left untouched, since a missing finding doesn't mean the issue was fixed.
 * Returns the actions plus the keys of findings that already have a thread.
 */
function planThreadSync(threads, findings, botLogin, skippedRuleIds = []) {
  const current = new Set(findings.map((f) => findingKey(f.path, f.line, f.ruleId)));
  const posted = new Set();
  const actions = [];
  for (const thread of botThreads(threads, botLogin)) {
    if (skippedRuleIds.includes(thread.ruleId)) continue;
    const key = findingKey(thread.path, thread.line, thread.ruleId);
    const stillThere = thread.line !== null && current.has(key);
    if (stillThere) posted.add(key);
    if (stillThere === thread.isResolved) actions.push({ threadId: thread.id, resolve: !stillThere });
  }
  return { posted, actions };
}

async function syncThreads(github, findings, botLogin, skippedRuleIds = []) {
  const threads = await github.listReviewThreads();
  const { posted, actions } = planThreadSync(threads, findings, botLogin, skippedRuleIds);
  const done = [];
  for (const action of actions) {
    try {
      await github.setThreadResolved(action.threadId, action.resolve);
      done.push(action);
    } catch (error) {
      // Resolving threads needs "Contents: write"; don't fail the whole review without it.
      console.warn(`⚠️  Could not ${action.resolve ? 'resolve' : 'unresolve'} thread: ${error.message}`);
    }
  }
  const resolved = done.filter((action) => action.resolve).length;
  return { posted, resolved, reopened: done.length - resolved };
}

module.exports = { findingKey, planThreadSync, syncThreads };
