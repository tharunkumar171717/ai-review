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

1. 👀 reaction from the bot
2. Gemini reviews every changed file against `review-rules.md`
3. Badged comments on the changed lines (max 15, most serious first) plus one summary comment
4. ❌ The check fails on any **P0**, or if the AI couldn't run

## Merge rules

`main` needs a pull request, approval from **@tharunkumar171717**, and every review comment resolved.

## Setup

- Repo secret `GEMINI_API_KEY`
- *(Optional, custom bot name)* a GitHub App with **Pull requests: write** and **Issues: write**, installed on the repo, with its ID in the variable `AI_REVIEW_APP_ID` and its private key in the secret `AI_REVIEW_APP_PRIVATE_KEY`
