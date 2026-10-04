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
