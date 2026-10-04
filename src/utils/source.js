const path = require('path');
const { CODE_EXTENSIONS, ENV_FILE_PATTERN } = require('../constants');

function shouldReview(filePath) {
  return CODE_EXTENSIONS.includes(path.extname(filePath)) || ENV_FILE_PATTERN.test(filePath);
}

/** The bits of a file the AI review needs. */
function buildFileModel(filePath, content) {
  const normalizedPath = filePath.split(path.sep).join('/');
  return {
    path: normalizedPath,
    content,
    lines: content.split('\n'),
    isEnvFile: ENV_FILE_PATTERN.test(normalizedPath),
  };
}

module.exports = { buildFileModel, shouldReview };
