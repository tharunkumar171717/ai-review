# Review rules

These rules are sent to the AI reviewer as plain text. Edit them to change what gets flagged.
Each rule says which severity to use.

## P0 — Critical (blocks the merge)

- **Hardcoded secret**: API keys, passwords, tokens or private keys written in code. They must come from environment variables or a secret manager.
- **.env file committed**: any `.env` file added to the pull request (`.env.example` with empty values is fine).
- **Security hole**: SQL / command injection, `eval` on user input, disabled auth or TLS checks.
- **Crash or data loss**: code that will throw at runtime or can destroy data.

## P1 — High

- **File too long**: a file over 500 lines. Suggest how to split it.
- **Duplicate code**: a block of 6 or more lines copied instead of reused. Point to the original and suggest a shared function.
- **Bug**: wrong logic, missing `await`, assignment instead of comparison, wrong condition, off-by-one.

## P2 — Medium

- **Function too long**: a function over 50 lines. Report it on the function's first line.
- **Hardcoded value**: magic numbers (other than 0, 1, 2) and URLs written inline. They belong in a constants/config file. Values inside constants/config files and tests are fine.
- **Missing error handling**: unchecked HTTP responses, unhandled promise rejections, empty `catch` blocks.
- **Edge case**: empty lists, `null`/`undefined`, `0` or `false` treated as "missing".

## P3 — Low

- **Debug statement**: leftover `console.log`, `console.debug`, `debugger`.
- **TODO comment**: unresolved `TODO`, `FIXME`, `HACK`.
- **Readability**: confusing names or code that is hard to follow.
