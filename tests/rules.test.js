const test = require('node:test');
const assert = require('node:assert');
const { runRules } = require('../src/rules');
const { buildFileModel } = require('../src/utils/source');
const { findFunctions } = require('../src/utils/functions');
const { parseAddedLines } = require('../src/utils/diff');
const { LIMITS } = require('../src/constants');

const ruleIds = (findings) => findings.map((f) => f.ruleId);
const review = (path, content) => runRules([buildFileModel(path, content)]);

test('flags hardcoded secrets as P0', () => {
  const fakeSecretLine = ['const apiKey = "', 'abcdef123456', '";'].join(''); // split so the reviewer doesn't flag this test
  const [finding] = review('src/a.js', fakeSecretLine);
  assert.strictEqual(finding.ruleId, 'hardcoded-secret');
  assert.strictEqual(finding.severity, 'P0');
});

test('flags committed .env files', () => {
  assert.deepStrictEqual(ruleIds(review('.env', 'KEY=x')), ['env-file-committed']);
  assert.deepStrictEqual(review('.env.example', 'KEY='), []);
});

test('does not count the trailing newline as a line', () => {
  assert.deepStrictEqual(review('src/ok.js', 'let x;\n'.repeat(LIMITS.MAX_FILE_LINES)), []);
});

test('flags files longer than the limit', () => {
  const content = 'let x;\n'.repeat(LIMITS.MAX_FILE_LINES + 1);
  assert.ok(ruleIds(review('src/big.js', content)).includes('file-too-long'));
});

test('flags long functions, including arrow functions and methods', () => {
  const body = '  x++;\n'.repeat(LIMITS.MAX_FUNCTION_LINES);
  const content = `function a() {\n${body}}\nconst b = async (p) => {\n${body}};\nclass C {\n  m() {\n${body}  }\n}\n`;
  const names = findFunctions(buildFileModel('f.js', content).code).map((fn) => fn.name);
  assert.deepStrictEqual(names, ['a', 'b', 'm']);
  assert.strictEqual(ruleIds(review('src/f.js', content)).filter((id) => id === 'function-too-long').length, 3);
});

test('flags magic numbers and URLs but not in constants files', () => {
  const content = 'const total = price * 42;\nfetch("https://x.com/api");\n';
  assert.deepStrictEqual(ruleIds(review('src/a.js', content)), ['hardcoded-value', 'hardcoded-value']);
  assert.deepStrictEqual(review('src/constants.js', content), []);
});

test('ignores numbers inside strings and comments, and UPPER_CASE constants', () => {
  const content = 'const MAX = 99;\nconst s = "abc 42"; // 77\n';
  assert.deepStrictEqual(review('src/a.js', content), []);
});

test('flags duplicate code blocks across files', () => {
  const block = Array.from({ length: LIMITS.DUPLICATE_BLOCK_LINES }, (_, i) => `const value${i} = compute(x${i});`).join('\n');
  const findings = runRules([buildFileModel('src/a.js', block), buildFileModel('src/b.js', block)]);
  assert.deepStrictEqual(ruleIds(findings), ['duplicate-code']);
  assert.strictEqual(findings[0].path, 'src/b.js');
});

test('flags console.log and TODO as P3', () => {
  const findings = review('src/a.js', 'console.log(x); // TODO fix\n');
  assert.deepStrictEqual(ruleIds(findings).sort(), ['debug-statement', 'todo-comment']);
  assert.ok(findings.every((f) => f.severity === 'P3'));
});

test('parses added line numbers from a patch', () => {
  const patch = '@@ -1,3 +1,4 @@\n line1\n-old\n+new\n+added\n line3';
  assert.deepStrictEqual([...parseAddedLines(patch)], [2, 3]);
});

test('reports at most MAX_REPORTED_FINDINGS per PR and hides the rest', () => {
  const { splitFindings } = require('../src/pullRequest');
  const extra = 3;
  const findings = Array.from({ length: LIMITS.MAX_REPORTED_FINDINGS + extra }, (_, i) => ({
    ruleId: 'r', path: 'a.js', line: i + 1, severity: 'P3',
  }));
  const added = new Map([['a.js', new Set(findings.map((f) => f.line))]]);
  const { inline, outside, hiddenCount } = splitFindings(findings, added, new Set());
  assert.strictEqual(inline.length + outside.length, LIMITS.MAX_REPORTED_FINDINGS);
  assert.strictEqual(hiddenCount, extra);
});

test('resolves fixed threads, re-opens resolved threads whose issue is still there', () => {
  const { planThreadSync } = require('../src/threads');
  const marker = (rule) => `<!-- ai-review rule=${rule} -->`;
  const threads = [
    { id: 'fixed', isResolved: false, path: 'a.js', line: 3, author: 'bot', body: marker('hardcoded-value') },
    { id: 'wrongly-resolved', isResolved: true, path: 'a.js', line: 4, author: 'bot', body: marker('debug-statement') },
    { id: 'still-open', isResolved: false, path: 'a.js', line: 5, author: 'bot', body: marker('todo-comment') },
    { id: 'human', isResolved: false, path: 'a.js', line: 6, author: 'someone', body: 'looks good' },
  ];
  const findings = [
    { path: 'a.js', line: 4, ruleId: 'debug-statement' },
    { path: 'a.js', line: 5, ruleId: 'todo-comment' },
  ];
  const { actions, posted } = planThreadSync(threads, findings, 'bot[bot]');
  assert.deepStrictEqual(actions, [
    { threadId: 'fixed', resolve: true },
    { threadId: 'wrongly-resolved', resolve: false },
  ]);
  assert.deepStrictEqual([...posted], ['a.js:4:debug-statement', 'a.js:5:todo-comment']);
});

test('retries Gemini when it is overloaded, then succeeds', async () => {
  const { callGemini } = require('../src/ai');
  const realFetch = global.fetch;
  const statuses = [503, 503, 200];
  global.fetch = async () => {
    const status = statuses.shift();
    return { ok: status === 200, status, json: async () => ({ ok: true }), text: async () => 'busy' };
  };
  try {
    assert.deepStrictEqual(await callGemini('key', 'model', 'prompt', 0), { ok: true });
    assert.strictEqual(statuses.length, 0);
  } finally {
    global.fetch = realFetch;
  }
});

test('does not flag shared import / export name lists as duplicate code', () => {
  const names = Array.from({ length: LIMITS.DUPLICATE_BLOCK_LINES }, (_, i) => `  SOME_LONG_NAME_${i},`).join('\n');
  const findings = runRules([
    buildFileModel('src/a.js', `const {\n${names}\n} = require('./constants');`),
    buildFileModel('src/b.js', `module.exports = {\n${names}\n};`),
  ]);
  assert.deepStrictEqual(findings, []);
});

test('leaves AI threads alone when the AI review did not run', () => {
  const { planThreadSync } = require('../src/threads');
  const threads = [{ id: 'ai', isResolved: false, path: 'a.js', line: 7, author: 'bot', body: '<!-- ai-review rule=ai-review -->' }];
  assert.deepStrictEqual(planThreadSync(threads, [], 'bot', ['ai-review']).actions, []);
  assert.deepStrictEqual(planThreadSync(threads, [], 'bot').actions, [{ threadId: 'ai', resolve: true }]);
});

test('AI review returns null (did not run) without an API key', async () => {
  const { runAiReview } = require('../src/ai');
  assert.strictEqual(await runAiReview([{ filename: 'a.js', patch: '@@ -0,0 +1 @@\n+x' }], ''), null);
});
