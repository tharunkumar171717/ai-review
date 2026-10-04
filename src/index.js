#!/usr/bin/env node
const { LOCAL_FLAG, FAIL_ON_SEVERITIES } = require('./constants');
const { loadEnv } = require('./utils/env');
const { runLocal } = require('./local');
const { runPullRequest } = require('./pullRequest');

async function main() {
  loadEnv();
  const [mode, ...targets] = process.argv.slice(2);
  const findings = mode === LOCAL_FLAG ? await runLocal(targets) : await runPullRequest();

  const blocking = findings.filter((finding) => FAIL_ON_SEVERITIES.includes(finding.severity));
  if (blocking.length > 0) {
    console.error(`\n❌ ${blocking.length} blocking issue(s) (${FAIL_ON_SEVERITIES.join(', ')}) found.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
