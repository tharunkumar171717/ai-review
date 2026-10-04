// Every tunable value of the reviewer lives here.

const SEVERITY = {
  P0: { label: 'P0', name: 'Critical', color: 'red', emoji: '🔴' },
  P1: { label: 'P1', name: 'High', color: 'orange', emoji: '🟠' },
  P2: { label: 'P2', name: 'Medium', color: 'yellow', emoji: '🟡' },
  P3: { label: 'P3', name: 'Low', color: 'blue', emoji: '🔵' },
};

const SEVERITY_ORDER = ['P0', 'P1', 'P2', 'P3'];

const RULES = {
  HARDCODED_SECRET: { id: 'hardcoded-secret', severity: 'P0', title: 'Hardcoded secret' },
  ENV_FILE_COMMITTED: { id: 'env-file-committed', severity: 'P0', title: '.env file committed' },
  FILE_TOO_LONG: { id: 'file-too-long', severity: 'P1', title: 'File too long' },
  DUPLICATE_CODE: { id: 'duplicate-code', severity: 'P1', title: 'Duplicate code' },
  FUNCTION_TOO_LONG: { id: 'function-too-long', severity: 'P2', title: 'Function too long' },
  HARDCODED_VALUE: { id: 'hardcoded-value', severity: 'P2', title: 'Hardcoded value' },
  DEBUG_STATEMENT: { id: 'debug-statement', severity: 'P3', title: 'Debug statement' },
  TODO_COMMENT: { id: 'todo-comment', severity: 'P3', title: 'TODO comment' },
  AI_REVIEW: { id: 'ai-review', title: 'AI review' },
};

const LIMITS = {
  MAX_FILE_LINES: 500,
  MAX_FUNCTION_LINES: 50,
  DUPLICATE_BLOCK_LINES: 6,
  MIN_DUPLICATE_LINE_CHARS: 10,
  MAX_FINDINGS_PER_RULE_PER_FILE: 5,
  MAX_REPORTED_FINDINGS: 15, // per PR, highest severity first
  MAX_AI_DIFF_CHARS: 60000,
  SIGNATURE_LOOKAHEAD_CHARS: 300,
};

// Numbers that are fine to write inline.
const ALLOWED_NUMBERS = new Set(['0', '1', '2']);

const CODE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'];
const CONSTANTS_FILE_PATTERN = /(^|\/)(constants?|config|enums?)(\.[\w]+$|\/)/i;
const TEST_FILE_PATTERN = /(\.test\.|\.spec\.|__tests__\/)/;
const IGNORED_PATH_PATTERN = /(^|\/)(node_modules|dist|build|coverage|\.git)(\/|$)|\.min\./;
const ENV_FILE_PATTERN = /(^|\/)\.env(\.(?!example$)[\w.-]+)?$/;

const SECRET_PATTERNS = [
  /(api[_-]?key|secret|password|passwd|token|access[_-]?key)[\w]*['"]?\s*[:=]\s*(['"`])[^'"`\s]{6,}\2/i,
  /AIza[0-9A-Za-z_-]{35}/, // Google API key
  /gh[pousr]_[A-Za-z0-9]{36}/, // GitHub token
  /sk-[A-Za-z0-9_-]{20,}/, // OpenAI / Anthropic style key
  /AKIA[0-9A-Z]{16}/, // AWS access key
];

const FAIL_ON_SEVERITIES = ['P0'];

const BADGE_BASE_URL = 'https://img.shields.io/badge';
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_PAGE_SIZE = 100;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const AI_TEMPERATURE = 0.2;

// Login the comments are posted as when REVIEW_BOT_LOGIN isn't set.
const DEFAULT_BOT_LOGIN = 'github-actions[bot]';

const SUMMARY_MARKER = '<!-- ai-review:summary -->';
const INLINE_MARKER_PREFIX = '<!-- ai-review rule=';
const LOCAL_FLAG = '--local';

module.exports = {
  SEVERITY,
  SEVERITY_ORDER,
  RULES,
  LIMITS,
  ALLOWED_NUMBERS,
  CODE_EXTENSIONS,
  CONSTANTS_FILE_PATTERN,
  TEST_FILE_PATTERN,
  IGNORED_PATH_PATTERN,
  ENV_FILE_PATTERN,
  SECRET_PATTERNS,
  FAIL_ON_SEVERITIES,
  BADGE_BASE_URL,
  GITHUB_API_URL,
  GITHUB_API_VERSION,
  GITHUB_PAGE_SIZE,
  GEMINI_API_URL,
  DEFAULT_GEMINI_MODEL,
  AI_TEMPERATURE,
  DEFAULT_BOT_LOGIN,
  SUMMARY_MARKER,
  INLINE_MARKER_PREFIX,
  LOCAL_FLAG,
};
