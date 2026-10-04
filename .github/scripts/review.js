// AI pull request reviewer.
// Sends every changed file plus review-rules.md to Gemini and posts its findings
// as P0-P3 badged comments. Run by .github/workflows/ai-review.yml.
const fs = require('fs');

const RULES_FILE = 'review-rules.md';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const GITHUB_URL = 'https://api.github.com';
const MAX_COMMENTS = 15; // per PR, most serious first
const MAX_PROMPT_CHARS = 120000;
const RETRY_STATUSES = [429, 500, 503]; // rate limited / server error / overloaded
const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 5000;
const BLOCKING = ['P0']; // these fail the check
const SEVERITY = {
  P0: { name: 'Critical', color: 'red', emoji: '🔴' },
  P1: { name: 'High', color: 'orange', emoji: '🟠' },
  P2: { name: 'Medium', color: 'yellow', emoji: '🟡' },
  P3: { name: 'Low', color: 'blue', emoji: '🔵' },
};
const ORDER = Object.keys(SEVERITY);
const ENV_FILE = /(^|\/)\.env(\.(?!example$)[\w.-]+)?$/;
const SUMMARY_MARKER = '<!-- ai-review:summary -->';

const { GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH, GEMINI_API_KEY } = process.env;
const BOT = process.env.REVIEW_BOT_LOGIN || 'github-actions[bot]';
const pr = JSON.parse(fs.readFileSync(GITHUB_EVENT_PATH, 'utf8')).pull_request;
const prPath = `/repos/${GITHUB_REPOSITORY}/pulls/${pr.number}`;
const issuePath = `/repos/${GITHUB_REPOSITORY}/issues/${pr.number}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- GitHub ----------

async function github(method, path, body) {
  const response = await fetch(GITHUB_URL + path, {
    method,
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    body: body && JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`GitHub ${method} ${path}: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

async function listAll(path) {
  const items = [];
  for (let page = 1; ; page++) {
    const batch = await github('GET', `${path}?per_page=100&page=${page}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

async function upsertSummary(body) {
  const comments = await listAll(`${issuePath}/comments`);
  const old = comments.find((c) => c.user.login === BOT && c.body.includes(SUMMARY_MARKER));
  if (old) await github('PATCH', `/repos/${GITHUB_REPOSITORY}/issues/comments/${old.id}`, { body });
  else await github('POST', `${issuePath}/comments`, { body });
}

// ---------- Building the prompt ----------

/** Line numbers that this PR added or changed, read from the diff. */
function changedLines(patch = '') {
  const lines = new Set();
  let line = 0;
  for (const row of patch.split('\n')) {
    const hunk = row.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunk) line = Number(hunk[1]);
    else if (row.startsWith('+')) lines.add(line++);
    else if (!row.startsWith('-') && !row.startsWith('\\')) line++;
  }
  return lines;
}

/** A changed file with line numbers; "+" marks lines this PR changed. .env contents are never sent. */
function showFile(file) {
  if (ENV_FILE.test(file.filename)) return `### ${file.filename} (environment file added - content hidden)`;
  const changed = changedLines(file.patch);
  const lines = fs.readFileSync(file.filename, 'utf8').split('\n');
  const body = lines.map((text, i) => `${changed.has(i + 1) ? '+' : ' '}${i + 1}| ${text}`);
  return `### ${file.filename} (${lines.length} lines)\n${body.join('\n')}`;
}

function buildPrompt(files) {
  return `You are a strict senior code reviewer for a pull request.
Apply the REVIEW RULES to the FILES. Each file is shown in full with line numbers; lines starting with "+" were changed in this PR.
- Report problems on "+" lines. For file- or function-level rules (like length), use the first line of the file or function.
- Use the severity the rule gives. For a real problem no rule covers, pick P0-P3 yourself.
- Report each problem once, and only problems you are confident about.
Respond ONLY with a JSON array (empty if nothing is wrong) of:
{"path": string, "line": number, "severity": "P0"|"P1"|"P2"|"P3", "rule": string, "message": string}
"rule" is the short name of the broken rule. Keep "message" short and actionable.

REVIEW RULES:
${fs.readFileSync(RULES_FILE, 'utf8')}

FILES:
${files.map(showFile).join('\n\n')}`.slice(0, MAX_PROMPT_CHARS);
}

// ---------- Gemini ----------

/** Returns the AI's findings, or null if it couldn't run. Retries when Gemini is busy. */
async function askGemini(prompt) {
  if (!GEMINI_API_KEY) return console.warn('⚠️  GEMINI_API_KEY is not set.'), null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      }),
    });
    if (response.ok) {
      const data = await response.json();
      const items = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '[]');
      return (Array.isArray(items) ? items : []).filter((f) => SEVERITY[f.severity] && f.path && Number.isInteger(f.line));
    }
    console.warn(`⚠️  Gemini returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    if (!RETRY_STATUSES.includes(response.status)) return null;
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
  }
  return null;
}

// ---------- Comments ----------

const badge = (s) => `![${s} ${SEVERITY[s].name}](https://img.shields.io/badge/${s}-${SEVERITY[s].name}-${SEVERITY[s].color})`;
const commentBody = (f) => `${badge(f.severity)} **${f.rule || 'AI review'}**\n\n${f.message}`;

function summary(findings, notInline) {
  const counts = ORDER.map((s) => `${badge(s)} **${findings.filter((f) => f.severity === s).length}**`).join(' · ');
  const rows = notInline.map((f) => `| ${SEVERITY[f.severity].emoji} ${f.severity} | \`${f.path}:${f.line}\` | ${f.rule} — ${f.message} |`);
  return [
    SUMMARY_MARKER,
    '## 🤖 AI Code Review',
    counts,
    findings.length === 0 ? '\n✅ No issues found.' : '',
    rows.length ? `\n### Not shown inline\n| Severity | Where | Issue |\n| --- | --- | --- |\n${rows.join('\n')}` : '',
    findings.length ? '\n🔒 Resolve every review comment before merging.' : '',
  ].join('\n');
}

// ---------- Main ----------

async function main() {
  await github('POST', `${issuePath}/reactions`, { content: 'eyes' }).catch((e) => console.warn(e.message));

  const files = (await listAll(`${prPath}/files`)).filter((f) => f.status !== 'removed' && f.patch);
  const found = await askGemini(buildPrompt(files));
  if (found === null) {
    await upsertSummary(`${SUMMARY_MARKER}\n## 🤖 AI Code Review\n⚠️ **The AI review could not run**, so this PR has **not** been reviewed. Re-run the workflow to try again.`);
    throw new Error('AI review could not run.');
  }
  const findings = found
    .sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity))
    .slice(0, MAX_COMMENTS);

  // Comment inline where possible (only on changed lines), and skip comments already posted.
  const changed = new Map(files.map((f) => [f.filename, changedLines(f.patch)]));
  const posted = new Set((await listAll(`${prPath}/comments`)).filter((c) => c.user.login === BOT).map((c) => `${c.path}:${c.line}:${c.body}`));
  const inline = findings.filter((f) => changed.get(f.path)?.has(f.line));
  const fresh = inline.filter((f) => !posted.has(`${f.path}:${f.line}:${commentBody(f)}`));
  if (fresh.length) {
    const comments = fresh.map((f) => ({ path: f.path, line: f.line, side: 'RIGHT', body: commentBody(f) }));
    await github('POST', `${prPath}/reviews`, { commit_id: pr.head.sha, event: 'COMMENT', comments });
  }
  await upsertSummary(summary(findings, findings.filter((f) => !inline.includes(f))));

  findings.forEach((f) => console.log(`${SEVERITY[f.severity].emoji} [${f.severity}] ${f.path}:${f.line} ${f.rule} - ${f.message}`));
  if (findings.some((f) => BLOCKING.includes(f.severity))) throw new Error(`Blocking issues found (${BLOCKING.join(', ')}).`);
}

main().catch((error) => {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
});
