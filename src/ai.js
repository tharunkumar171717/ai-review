const fs = require('fs');
const path = require('path');
const {
  RULES,
  SEVERITY,
  LIMITS,
  REVIEW_RULES_FILE,
  GEMINI_API_URL,
  DEFAULT_GEMINI_MODEL,
  AI_TEMPERATURE,
  AI_RETRYABLE_STATUSES,
  AI_MAX_ATTEMPTS,
  AI_RETRY_DELAY_MS,
} = require('./constants');

const RULES_PATH = path.resolve(__dirname, '..', REVIEW_RULES_FILE);

const INSTRUCTIONS = `You are a strict senior code reviewer for a pull request.
Apply the REVIEW RULES below to the changed files. Each file is shown in full with line numbers;
lines starting with "+" were added or changed in this pull request.
- Report problems on "+" lines. For file- or function-level rules (like length), report on the first line of the file or function.
- Use the severity the rule gives. For a real problem no rule covers, pick P0-P3 yourself.
- Report each problem once, and only problems you are confident about.
Respond ONLY with a JSON array (empty if nothing is wrong) of objects:
{"path": string, "line": number, "severity": "P0"|"P1"|"P2"|"P3", "rule": string, "message": string}
"rule" is the short name of the broken rule (e.g. "Hardcoded secret"). Keep "message" short and actionable.`;

/** Shows a file with line numbers, marking changed lines with "+". Secrets files are never sent. */
function numberFile(file) {
  if (file.isEnvFile) return `### ${file.path} (environment file added - content hidden)`;
  const body = file.lines.map((text, index) => `${file.addedLines.has(index + 1) ? '+' : ' '}${index + 1}| ${text}`);
  return `### ${file.path} (${file.lines.length} lines)\n${body.join('\n')}`;
}

function buildPrompt(files, rulesText = fs.readFileSync(RULES_PATH, 'utf8')) {
  const code = files.map(numberFile).join('\n\n').slice(0, LIMITS.MAX_AI_INPUT_CHARS);
  return `${INSTRUCTIONS}\n\nREVIEW RULES:\n${rulesText}\n\nFILES:\n${code}`;
}

function toFindings(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => SEVERITY[item.severity] && item.path && Number.isInteger(item.line) && item.message)
    .map((item) => {
      const rule = typeof item.rule === 'string' ? item.rule.trim().slice(0, LIMITS.MAX_RULE_TITLE_CHARS) : '';
      return {
        ruleId: RULES.AI_REVIEW.id,
        title: rule ? `AI · ${rule}` : RULES.AI_REVIEW.title,
        severity: item.severity,
        path: item.path,
        line: item.line,
        message: item.message,
      };
    });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls Gemini, retrying with a growing pause when it is rate-limited or overloaded. */
async function callGemini(apiKey, model, prompt, delayMs = AI_RETRY_DELAY_MS) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: AI_TEMPERATURE },
      }),
    });
    if (response.ok) return response.json();
    const canRetry = AI_RETRYABLE_STATUSES.includes(response.status) && attempt < AI_MAX_ATTEMPTS;
    if (!canRetry) throw new Error(`${response.status} ${await response.text()}`);
    console.warn(`⚠️  Gemini returned ${response.status}, retrying (attempt ${attempt + 1}/${AI_MAX_ATTEMPTS})...`);
    await sleep(delayMs * attempt);
  }
}

/**
 * Asks Gemini to review the changed files against review-rules.md.
 * `files` are file models with an `addedLines` Set. Returns null when the AI did not run
 * (no API key, or the call failed) so callers can tell "no AI issues" apart from "no AI answer".
 */
async function runAiReview(files, apiKey, model = DEFAULT_GEMINI_MODEL) {
  if (!apiKey) return null;
  if (files.length === 0) return [];
  try {
    const data = await callGemini(apiKey, model, buildPrompt(files));
    return toFindings(JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'));
  } catch (error) {
    console.warn(`⚠️  AI review skipped: ${error.message}`);
    return null;
  }
}

module.exports = { runAiReview, callGemini, buildPrompt };
