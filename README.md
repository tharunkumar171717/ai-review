# AI PR Review

Every pull request is reviewed by **AI (Google Gemini)** against plain-English rules, and gets comments with **P0–P3 severity badges**.

## Files

| File | What it is |
| --- | --- |
| [`review-rules.md`](review-rules.md) | **The rules.** Plain English, grouped by severity. Edit this to change what gets flagged. |
| [`.github/scripts/review.js`](.github/scripts/review.js) | The reviewer: sends the changed files + rules to Gemini and posts the comments |
| [`.github/workflows/ai-review.yml`](.github/workflows/ai-review.yml) | Runs the reviewer on every PR |
| [`src/app.js`](src/app.js), [`src/constants.js`](src/constants.js) | A tiny sample app to change in PRs |

## What happens on a PR

Only PRs into the default branch (`main`) are reviewed.

1. 👀 reaction from the bot
2. Gemini reviews every changed file against `review-rules.md`
3. Badged comments on the changed lines (max 15, most serious first) plus one summary comment
4. ❌ The check fails on any **P0**, or if the AI couldn't run

## Security model

The reviewer runs with secrets (Gemini key, App key) while reading untrusted PR code, so:

- **The reviewer and rules always come from `main`** (`pull_request_target`). A PR can't change the reviewer or loosen the rules for itself.
- **PR code is never executed or checked out.** Files are fetched as plain text through the GitHub API.
- **The AI is told that file contents are untrusted data.** Each file sits inside a random per-run boundary that the content can't fake.
- **Every AI finding is validated:** it must point at a changed line of a file in the PR, with a valid severity. Text is stripped of HTML and `@mentions`.
- **`.env` contents are never fetched or sent.**
- Actions are pinned to exact commits, and the App token is limited to this repo.

## Merge rules

`main` needs a pull request, approval from **@tharunkumar171717**, and every review comment resolved.

## Setup

- Repo secret `GEMINI_API_KEY`
- *(Optional, custom bot name)* a GitHub App with **Pull requests: write** and **Issues: write**, installed on the repo, with its ID in the variable `AI_REVIEW_APP_ID` and its private key in the secret `AI_REVIEW_APP_PRIVATE_KEY`
