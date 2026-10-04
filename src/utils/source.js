const path = require('path');
const {
  CODE_EXTENSIONS,
  CONSTANTS_FILE_PATTERN,
  TEST_FILE_PATTERN,
  ENV_FILE_PATTERN,
} = require('../constants');

const QUOTES = new Set(['"', "'", '`']);

const blank = (ch) => (ch === '\n' ? '\n' : ' ');

/**
 * Returns two copies of the source with the same line layout:
 *  - code:       comments AND string contents blanked out
 *  - noComments: only comments blanked out
 */
function stripSource(text) {
  let code = '';
  let noComments = '';
  let state = 'code';
  let quote = '';
  const push = (codeCh, keptCh) => {
    code += codeCh;
    noComments += keptCh;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (state === 'code') {
      if (ch === '/' && (next === '/' || next === '*')) {
        state = next === '/' ? 'line' : 'block';
        push(' ', ' ');
        continue;
      }
      if (QUOTES.has(ch)) [state, quote] = ['string', ch];
      push(ch, ch);
    } else if (state === 'line') {
      if (ch === '\n') state = 'code';
      push(blank(ch), blank(ch));
    } else if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code';
        push('  ', '  ');
        i++;
      } else push(blank(ch), blank(ch));
    } else if (ch === '\\') {
      push(' ' + blank(next || ''), ch + (next || ''));
      i++;
    } else if (ch === quote) {
      state = 'code';
      push(ch, ch);
    } else push(blank(ch), ch);
  }
  return { code, noComments };
}

function buildFileModel(filePath, content) {
  const normalizedPath = filePath.split(path.sep).join('/');
  const { code, noComments } = stripSource(content);
  return {
    path: normalizedPath,
    content,
    code,
    lines: content.split('\n'),
    codeLines: code.split('\n'),
    textLines: noComments.split('\n'),
    isCode: CODE_EXTENSIONS.includes(path.extname(normalizedPath)),
    isEnvFile: ENV_FILE_PATTERN.test(normalizedPath),
    isConstantsFile: CONSTANTS_FILE_PATTERN.test(normalizedPath),
    isTestFile: TEST_FILE_PATTERN.test(normalizedPath),
  };
}

function shouldReview(filePath) {
  return CODE_EXTENSIONS.includes(path.extname(filePath)) || ENV_FILE_PATTERN.test(filePath);
}

module.exports = { stripSource, buildFileModel, shouldReview };
