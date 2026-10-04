const { RULES, SEVERITY, LIMITS, GEMINI_API_URL, DEFAULT_GEMINI_MODEL, AI_TEMPERATURE } = require('./constants');
const { walkPatch } = require('./utils/diff');

const PROMPT = `You are a strict senior code reviewer. Review ONLY the added lines (marked with "+") of this pull request diff.
Look for bugs, security problems, bad error handling, performance issues and unreadable code.
Severity: P0 = security hole / crash / data loss, P1 = bug or serious design flaw, P2 = maintainability, P3 = minor nit.
Respond with a JSON array (empty if nothing important) of objects: {"path": string, "line": number, "severity": "P0"|"P1"|"P2"|"P3", "message": string}.
"line" must be the number shown after "L" on an added line. Keep each message short and actionable.

DIFF:
`;

function buildAnnotatedDiff(prFiles) {
  const parts = prFiles.map((file) => {
    const lines = [`### ${file.filename}`];
    walkPatch(file.patch, (type, line, text) => {
      if (type === 'added') lines.push(`L${line} + ${text}`);
      else if (type === 'context') lines.push(`L${line}   ${text}`);
    });
    return lines.join('\n');
  });
  return parts.join('\n\n').slice(0, LIMITS.MAX_AI_DIFF_CHARS);
}

function toFindings(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => SEVERITY[item.severity] && item.path && Number.isInteger(item.line) && item.message)
    .map((item) => ({
      ruleId: RULES.AI_REVIEW.id,
      title: RULES.AI_REVIEW.title,
      severity: item.severity,
      path: item.path,
      line: item.line,
      message: item.message,
    }));
}

/** Asks Gemini to review the diff. Returns [] when no API key is configured or the call fails. */
async function runAiReview(prFiles, apiKey, model = DEFAULT_GEMINI_MODEL) {
  const reviewable = prFiles.filter((file) => file.patch);
  if (!apiKey || reviewable.length === 0) return [];
  try {
    const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT + buildAnnotatedDiff(reviewable) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: AI_TEMPERATURE },
      }),
    });
    if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
    const data = await response.json();
    return toFindings(JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'));
  } catch (error) {
    console.warn(`⚠️  AI review skipped: ${error.message}`);
    return [];
  }
}

module.exports = { runAiReview, buildAnnotatedDiff };
