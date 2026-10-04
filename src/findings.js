const { SEVERITY_ORDER } = require('./constants');

/** P0 first, then by file and line. */
function sortFindings(findings) {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
      a.path.localeCompare(b.path) ||
      a.line - b.line,
  );
}

module.exports = { sortFindings };
