const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '..', '..', '.env');
const ENV_LINE = /^\s*([\w.-]+)\s*=\s*(.*)\s*$/;

/** Minimal .env loader. Real environment variables always win. */
function loadEnv(envPath = ENV_PATH) {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(ENV_LINE);
    if (!match || line.trim().startsWith('#')) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

module.exports = { loadEnv };
