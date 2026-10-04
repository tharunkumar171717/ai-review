function createFinding(rule, file, line, message, severity = rule.severity) {
  return { ruleId: rule.id, title: rule.title, severity, path: file.path, line, message };
}

module.exports = { createFinding };
