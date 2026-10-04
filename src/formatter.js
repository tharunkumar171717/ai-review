const { SEVERITY, SEVERITY_ORDER, LIMITS, BADGE_BASE_URL, SUMMARY_MARKER, INLINE_MARKER_PREFIX } = require('./constants');

function badge(severityKey) {
  const { label, name, color } = SEVERITY[severityKey];
  return `![${label} ${name}](${BADGE_BASE_URL}/${label}-${name}-${color})`;
}

const inlineMarker = (ruleId) => `${INLINE_MARKER_PREFIX}${ruleId} -->`;

function formatInlineComment(finding) {
  return [
    inlineMarker(finding.ruleId),
    `${badge(finding.severity)} **${finding.title}**`,
    '',
    finding.message,
    '',
    `<sub>rule: \`${finding.ruleId}\`</sub>`,
  ].join('\n');
}

function countBySeverity(findings) {
  const header = SEVERITY_ORDER.map((key) => badge(key)).join(' | ');
  const divider = SEVERITY_ORDER.map(() => ':---:').join(' | ');
  const counts = SEVERITY_ORDER.map((key) => findings.filter((f) => f.severity === key).length).join(' | ');
  return [`| ${header} |`, `| ${divider} |`, `| ${counts} |`].join('\n');
}

function findingsTable(findings) {
  const rows = findings.map(
    (f) => `| ${SEVERITY[f.severity].emoji} ${f.severity} | \`${f.path}:${f.line}\` | ${f.title} | ${f.message.replace(/\n/g, ' ')} |`,
  );
  return ['| Severity | Location | Rule | Details |', '| --- | --- | --- | --- |', ...rows].join('\n');
}

function formatSummary(allFindings, outsideDiff, hiddenCount = 0) {
  const sections = [SUMMARY_MARKER, '## 🤖 AI Code Review', '', countBySeverity(allFindings), ''];
  if (allFindings.length === 0) sections.push('✅ No issues found. Nice work!');
  if (outsideDiff.length > 0) {
    sections.push('### Issues not shown inline', '', findingsTable(outsideDiff));
  }
  if (hiddenCount > 0) {
    sections.push('', `➕ ${hiddenCount} lower-priority issue(s) hidden (max ${LIMITS.MAX_REPORTED_FINDINGS} per PR). Fix the ones above and push again.`);
  }
  if (allFindings.length > 0) {
    sections.push('', '🔒 Every review thread must be resolved before merging. Fixed issues are resolved automatically on your next push; resolving a thread without fixing it re-opens it.');
  }
  sections.push('', '<sub>P0 = must fix before merge · P1 = should fix · P2 = fix soon · P3 = nice to have</sub>');
  return sections.join('\n');
}

function formatConsole(findings) {
  if (findings.length === 0) return '✅ No issues found.';
  const lines = findings.map((f) => `${SEVERITY[f.severity].emoji} [${f.severity}] ${f.path}:${f.line}  ${f.title} - ${f.message}`);
  return [...lines, '', `Total: ${findings.length} issue(s)`].join('\n');
}

module.exports = { badge, inlineMarker, formatInlineComment, formatSummary, formatConsole };
