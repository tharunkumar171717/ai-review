const { LIMITS } = require('../constants');

const KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'with', 'else', 'do', 'typeof', 'new', 'await',
]);

// Each head ends right after the opening "(" of the parameter list.
// `between` must match the text between ")" and "{".
const FUNCTION_HEADS = [
  { regex: /\bfunction\b\s*\*?\s*([\w$]*)\s*\(/g, between: /^\s*(:[^=;{]*)?$/ },
  { regex: /([\w$]+)\s*[:=]\s*(?:async\s*)?\(/g, between: /^\s*(:[^;{]*)?=>\s*$/ },
  {
    regex: /^[ \t]*(?:(?:async|static|get|set|public|private|protected)\s+)*([\w$]+)\s*\(/gm,
    between: /^\s*(:[^=;{]*)?$/,
  },
];

function findMatching(code, openIndex, open, close) {
  let depth = 0;
  for (let i = openIndex; i < code.length; i++) {
    if (code[i] === open) depth++;
    else if (code[i] === close && --depth === 0) return i;
  }
  return -1;
}

function lineAt(code, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (code[i] === '\n') line++;
  return line;
}

function findBodyStart(code, parenIndex, betweenRegex) {
  const closeParen = findMatching(code, parenIndex, '(', ')');
  if (closeParen === -1) return -1;
  const tail = code.slice(closeParen + 1, closeParen + 1 + LIMITS.SIGNATURE_LOOKAHEAD_CHARS);
  const braceOffset = tail.indexOf('{');
  if (braceOffset === -1 || !betweenRegex.test(tail.slice(0, braceOffset))) return -1;
  return closeParen + 1 + braceOffset;
}

/** Finds functions (declarations, arrows, methods) that have a `{ ... }` body. */
function findFunctions(code) {
  const functions = [];
  const seenBodies = new Set();
  for (const head of FUNCTION_HEADS) {
    for (const match of code.matchAll(head.regex)) {
      const name = match[1] || '<anonymous>';
      if (KEYWORDS.has(name)) continue;
      const bodyStart = findBodyStart(code, match.index + match[0].length - 1, head.between);
      if (bodyStart === -1 || seenBodies.has(bodyStart)) continue;
      const bodyEnd = findMatching(code, bodyStart, '{', '}');
      if (bodyEnd === -1) continue;
      seenBodies.add(bodyStart);
      const startLine = lineAt(code, match.index + match[0].search(/\S/));
      const endLine = lineAt(code, bodyEnd);
      functions.push({ name, startLine, endLine, length: endLine - startLine + 1 });
    }
  }
  return functions.sort((a, b) => a.startLine - b.startLine);
}

module.exports = { findFunctions };
