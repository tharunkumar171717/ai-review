// Every tunable value of the reviewer lives here.
// WHAT gets flagged is decided by the plain-English rules in REVIEW_RULES_FILE.

const SEVERITY = {
  P0: { label: 'P0', name: 'Critical', color: 'red', emoji: '🔴' },
  P1: { label: 'P1', name: 'High', color: 'orange', emoji: '🟠' },
  P2: { label: 'P2', name: 'Medium', color: 'yellow', emoji: '🟡' },
  P3: { label: 'P3', name: 'Low', color: 'blue', emoji: '🔵' },
};

const SEVERITY_ORDER = ['P0', 'P1', 'P2', 'P3'];

// Fallback name for an AI finding that doesn't say which rule it broke.
const AI_REVIEW = { id: 'ai-review', title: 'AI review' };
const AI_RULE_ID_PREFIX = 'ai-';

const LIMITS = {
  MAX_REPORTED_FINDINGS: 15, // per PR, highest severity first
  MAX_AI_INPUT_CHARS: 120000,
  MAX_RULE_TITLE_CHARS: 60,
};

// Files sent to the AI for review.
const CODE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.java', '.go', '.rb', '.php', '.cs', '.kt', '.swift', '.rs',
  '.css', '.scss', '.html', '.vue', '.svelte', '.sql', '.sh', '.yml', '.yaml',
];
const IGNORED_PATH_PATTERN = /(^|\/)(node_modules|dist|build|coverage|\.git)(\/|$)|\.min\./;
// .env files are flagged by name only; their contents are never sent to the AI.
const ENV_FILE_PATTERN = /(^|\/)\.env(\.(?!example$)[\w.-]+)?$/;

const FAIL_ON_SEVERITIES = ['P0'];

const REVIEW_RULES_FILE = 'review-rules.md';

const BADGE_BASE_URL = 'https://img.shields.io/badge';
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_PAGE_SIZE = 100;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
const AI_TEMPERATURE = 0.2;
// Gemini errors worth retrying (rate limit, server error, overloaded) and how.
const AI_RETRYABLE_STATUSES = [429, 500, 503];
const AI_MAX_ATTEMPTS = 4;
const AI_RETRY_DELAY_MS = 5000; // multiplied by the attempt number

// Login the comments are posted as when REVIEW_BOT_LOGIN isn't set.
const DEFAULT_BOT_LOGIN = 'github-actions[bot]';

const START_REACTION = 'eyes'; // 👀 added to the PR when a review starts

const SUMMARY_MARKER = '<!-- ai-review:summary -->';
const INLINE_MARKER_PREFIX = '<!-- ai-review rule=';
const LOCAL_FLAG = '--local';

module.exports = {
  SEVERITY,
  SEVERITY_ORDER,
  AI_REVIEW,
  AI_RULE_ID_PREFIX,
  LIMITS,
  CODE_EXTENSIONS,
  IGNORED_PATH_PATTERN,
  ENV_FILE_PATTERN,
  FAIL_ON_SEVERITIES,
  REVIEW_RULES_FILE,
  BADGE_BASE_URL,
  GITHUB_API_URL,
  GITHUB_API_VERSION,
  GITHUB_PAGE_SIZE,
  GEMINI_API_URL,
  DEFAULT_GEMINI_MODEL,
  AI_TEMPERATURE,
  AI_RETRYABLE_STATUSES,
  AI_MAX_ATTEMPTS,
  AI_RETRY_DELAY_MS,
  DEFAULT_BOT_LOGIN,
  START_REACTION,
  SUMMARY_MARKER,
  INLINE_MARKER_PREFIX,
  LOCAL_FLAG,
};
