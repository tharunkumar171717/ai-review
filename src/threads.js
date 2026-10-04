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
 * Returns the actions plus the keys of findings that already have a thread.
 */
function planThreadSync(threads, findings, botLogin) {
  const current = new Set(findings.map((f) => findingKey(f.path, f.line, f.ruleId)));
  const posted = new Set();
  const actions = [];
  for (const thread of botThreads(threads, botLogin)) {
    const key = findingKey(thread.path, thread.line, thread.ruleId);
    const stillThere = thread.line !== null && current.has(key);
    if (stillThere) posted.add(key);
    if (stillThere === thread.isResolved) actions.push({ threadId: thread.id, resolve: !stillThere });
  }
  return { posted, actions };
}

async function syncThreads(github, findings, botLogin) {
  const { posted, actions } = planThreadSync(await github.listReviewThreads(), findings, botLogin);
  for (const action of actions) await github.setThreadResolved(action.threadId, action.resolve);
  const resolved = actions.filter((action) => action.resolve).length;
  return { posted, resolved, reopened: actions.length - resolved };
}

module.exports = { findingKey, planThreadSync, syncThreads };
