# AI PR Review

A zero-dependency GitHub Action where **AI (Google Gemini) reviews every pull request** and posts comments with **P0–P3 severity badges**.

- 👀 reacts on the PR as soon as a review starts
- **Inline comments** on the changed lines, at most **15 issues per PR** (highest severity first)
- **One summary comment** with counts per severity, updated in place on every push
- **The check fails** on any P0 issue, or if the AI couldn't run, so nothing slips through unreviewed
- Comments are posted as the **ai-review-tharun[bot]** GitHub App

## The rules are plain English

What the AI checks lives in [`review-rules.md`](review-rules.md), grouped by severity:

| Severity | Examples |
| --- | --- |
| 🔴 P0 | hardcoded secrets, committed `.env` files, security holes, crashes |
| 🟠 P1 | files over 500 lines, duplicate code, bugs |
| 🟡 P2 | functions over 50 lines, magic numbers / URLs, missing error handling, edge cases |
| 🔵 P3 | `console.log`, TODOs, readability |

**To change what gets flagged, edit that file.** No code changes needed.

For each PR, Gemini receives every changed file in full, with line numbers and the changed lines marked, plus the rules text. The contents of `.env` files are never sent.

## Merge rules

`main` is protected:
- every change goes through a pull request,
- `.github/CODEOWNERS` requires approval from **@tharunkumar171717**,
- every review conversation must be resolved before merging.

On each push the bot resolves its own comments whose issue is fixed, and re-opens any that were resolved without fixing the issue.

## Setup

1. Add a repo secret `GEMINI_API_KEY` (Settings → Secrets and variables → Actions).
2. *(Optional, gives the comments a custom bot name)* create a GitHub App with **Pull requests: write**, **Issues: write** and **Contents: write**, and install it on the repo. Add its App ID as the repo **variable** `AI_REVIEW_APP_ID` and its private key as the repo **secret** `AI_REVIEW_APP_PRIVATE_KEY`. Without it, comments come from `github-actions[bot]`.

## Run locally

Put `GEMINI_API_KEY=...` in `.env`, then:

```bash
npm run demo                              # AI-review examples/badExample.js
node src/index.js --local path/to/project
```

## Project layout

```
review-rules.md     what the AI checks (plain English)
src/
  index.js          entry point (CI mode or --local)
  pullRequest.js    GitHub flow: 👀 → fetch PR files → AI review → sync threads → post comments
  ai.js             builds the prompt, calls Gemini (with retries), parses its findings
  github.js         GitHub REST + GraphQL client
  threads.js        auto-resolve / re-open review threads
  formatter.js      badges + comment markdown
  findings.js       sorting
  local.js          --local mode
  constants.js      settings: limits, model, URLs, emoji
  utils/            file loading, diff parser, .env loader
```
