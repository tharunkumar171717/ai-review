const { LIMITS, SEVERITY_ORDER } = require('../constants');

const RULE_MODULES = [
  require('./secrets'),
  require('./fileLength'),
  require('./duplicateCode'),
  require('./functionLength'),
  require('./hardcodedValues'),
  require('./debugLeftovers'),
];

function capPerRuleAndFile(findings) {
  const counts = new Map();
  return findings.filter((finding) => {
    const key = `${finding.ruleId}|${finding.path}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts.get(key) <= LIMITS.MAX_FINDINGS_PER_RULE_PER_FILE;
  });
}

function sortFindings(findings) {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      a.path.localeCompare(b.path) ||
      a.line - b.line,
  );
}

/** Runs every rule against the file models and returns sorted findings. */
function runRules(files) {
  return sortFindings(capPerRuleAndFile(RULE_MODULES.flatMap((rule) => rule.run(files))));
}

module.exports = { runRules, sortFindings };
