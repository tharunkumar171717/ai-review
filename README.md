# AI PR Review

A zero-dependency GitHub Action that reviews every pull request and posts comments with **P0–P3 severity badges**:

- **Inline comments** on the changed lines, at most **15 issues per PR** (highest severity first).
- **One summary comment** with counts per severity. It is updated in place on every push, so it doesn't pile up.
- **The check fails** when a P0 issue is found, so you can block merging on it.

## Rules

| Severity | Rule | What it catches |
| --- | --- | --- |
| 🔴 P0 | `hardcoded-secret` | API keys, passwords, tokens written in code |
| 🔴 P0 | `env-file-committed` | `.env` files added to the PR |
| 🟠 P1 | `file-too-long` | Files over **500** lines |
| 🟠 P1 | `duplicate-code` | 6+ identical lines copied from elsewhere in the PR (not reused) |
| 🟡 P2 | `function-too-long` | Functions over **50** lines (declarations, arrows, methods) |
| 🟡 P2 | `hardcoded-value` | Magic numbers and URLs outside a `constants`/`config` file |
| 🔵 P3 | `debug-statement` | `console.log`, `debugger` |
| 🔵 P3 | `todo-comment` | `TODO` / `FIXME` / `HACK` |
| any | `ai-review` | Optional Gemini review for bugs, security and readability |

All limits, severities and patterns live in [`src/constants.js`](src/constants.js).

## Setup

1. Push this repo to GitHub. The workflow in `.github/workflows/ai-review.yml` runs on every PR.
2. *(Optional, enables the AI review)* add a repo secret `GEMINI_API_KEY` under Settings → Secrets and variables → Actions.

3. *(Optional, gives the comments the name "AI Review")* create a GitHub App with **Pull requests: write**, **Issues: write** and **Contents: read**, and install it on the repo. Then add its App ID as the repo **variable** `AI_REVIEW_APP_ID` and its private key as the repo **secret** `AI_REVIEW_APP_PRIVATE_KEY`. Without it, comments come from `github-actions[bot]`.

To use it in another repo, copy `src/` and the workflow file into that repo.

## Run locally

```bash
npm test               # unit tests
npm run demo           # review examples/badExample.js
node src/index.js --local path/to/project
```

## Project layout

```
src/
  index.js          entry point (CI mode or --local)
  pullRequest.js    GitHub flow: fetch PR files → run rules → post comments
  github.js         GitHub REST client
  ai.js             optional Gemini review
  formatter.js      badges + comment markdown
  constants.js      every limit / pattern / URL
  rules/            one file per rule
  utils/            source stripping, function finder, diff parser, .env loader
```

## Merge rules

`main` is protected: every change goes through a pull request, and `.github/CODEOWNERS` requires approval from **@tharunkumar171717** before it can be merged. Pushing new commits after approval resets the approval.
