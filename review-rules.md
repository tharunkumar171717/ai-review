# Review rules

These rules are sent to the AI reviewer as plain text. Edit them to change what gets flagged.
Each rule says which severity to use. The bold text at the start of each rule is its short name:
use it as the finding's `rule`.

## How to review

Read these before applying any rule. They keep the review useful and stop it from blocking good PRs.

### Be precise

- Only report problems in lines changed by this PR (`+` lines). Unchanged code is context, not a target.
- Only report what you can point to in the code shown. Do not guess about files you cannot see.
- If you are not confident a problem is real, do not report it. A missed nit costs less than a false alarm.
- Report each problem once, on the line where it is easiest to fix. Do not repeat the same finding
  on every line where a pattern shows up. Report the first one and say "same issue on lines X, Y".
- When two rules match the same problem, report only the more severe one.
- Say what is wrong, why it matters, and how to fix it, in one or two short sentences.
- Suggest a concrete fix (a function name, a constant name, a guard) rather than "consider improving".

### Pick the right severity

- **P0 fails the check and blocks the merge.** Use it only when the problem is certain and serious:
  a leaked secret, an exploitable security hole, a guaranteed crash, data loss, or a broken build.
  If the problem depends on assumptions you cannot verify, use P1 instead.
- **P1** is a real bug or risk that should be fixed before merging, but does not have to block it.
- **P2** is a maintainability or robustness problem worth fixing soon.
- **P3** is polish. Keep P3 findings few; skip them if the PR already has serious findings.
- Never raise a severity because a problem appears many times. Raise it only because the impact is worse.

### Do not break the PR flow

- Do not flag style choices that a formatter or linter would handle (spacing, quotes, semicolons,
  trailing commas, import order), unless they change behavior.
- Do not ask for changes outside the scope of the PR, such as refactoring untouched code.
- Do not flag code as "unused" or "missing" when it may be defined in a file you cannot see.
- Do not demand tests, docs or types for trivial changes (renames, comments, config tweaks, version bumps).
- Generated files, lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`), vendored code,
  minified files and snapshots are not reviewed for style, length or duplication.
- Markdown, docs and rule files (like this one) are not checked against code rules
  (file length, function length, magic numbers, duplicate code).
- Example files such as `.env.example` with empty or placeholder values are fine.
- Test files may use hardcoded values, fake credentials that are clearly fake (`test-key`, `dummy`),
  long setup blocks and repeated arrange/act/assert code.

## P0 — Critical (blocks the merge)

### Secrets

- **Hardcoded secret**: API keys, passwords, tokens or private keys written in code. They must come
  from environment variables or a secret manager.
  - Includes strings that look like real keys: `sk-...`, `ghp_...`, `github_pat_...`, `AKIA...`,
    `AIza...`, `xox[baprs]-...`, `-----BEGIN ... PRIVATE KEY-----`, JWTs with a real-looking signature,
    and connection strings with an inline password (`postgres://user:pass@host`).
  - Does not include obvious placeholders (`your-api-key-here`, `<TOKEN>`, `xxx`, `changeme` in docs).
- **.env file committed**: any `.env` file added to the pull request (`.env.example` with empty values is fine).
- **Credential file committed**: private keys (`*.pem`, `*.key`, `id_rsa`), keystores (`*.p12`, `*.jks`),
  cloud credential files (`credentials.json`, service-account JSON, `.npmrc` or `.pypirc` with a token).

### Security holes

- **Injection**: user input built into SQL, shell commands, LDAP, XPath, NoSQL queries or templates by
  string concatenation or interpolation, instead of parameters or safe APIs.
  Examples: `` db.query(`SELECT * FROM users WHERE id = ${req.params.id}`) ``,
  `` exec(`git clone ${url}`) ``, `child_process.exec` with any user-controlled string.
- **Code execution**: `eval`, `new Function`, `vm.runInNewContext`, `setTimeout`/`setInterval` with a string,
  or `require`/`import()` of a user-controlled path.
- **Auth disabled**: authentication or authorization checks removed, commented out, bypassed with a flag
  (`if (true)`, `skipAuth`, `isAdmin = true`), or an endpoint that changes data without any auth check
  when its neighbours have one.
- **TLS disabled**: `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `verify=False`,
  `InsecureSkipVerify: true`, or certificate checks turned off outside tests.
- **Unsafe deserialization**: deserializing untrusted data with `pickle`, `yaml.load` without a safe loader,
  `unserialize`, Java object streams, or `node-serialize`.
- **Path traversal**: a file path built from user input (`req.query.file`, upload names) and passed to
  `fs`, `open`, `sendFile` or `path.join` without normalizing it and checking it stays inside an allowed folder.
- **Weak crypto for security**: `md5` or `sha1` for passwords or signatures, `Math.random()` for tokens,
  session IDs, reset links or OTPs, hardcoded IVs or salts, ECB mode, or plain-text password storage.
- **Permissive CORS with credentials**: `Access-Control-Allow-Origin: *` (or reflecting any origin) together
  with `credentials: true`.

### Crashes and data loss

- **Crash**: code that will certainly throw at runtime on the normal path: calling an undefined function,
  reading a property of something that is always `undefined`/`null` there, wrong import name, syntax error,
  `await` outside an `async` function in a non-module file.
- **Data loss**: code that can destroy or corrupt data:
  - `DELETE` or `UPDATE` without a `WHERE` clause, `DROP TABLE`, `TRUNCATE` in application code,
  - `rm -rf` or `fs.rm(..., { recursive: true })` on a path that can be empty, `/` or user-controlled,
  - overwriting a file or record without reading or merging the existing content when the intent is to update,
  - migrations that drop a column or table that still holds data without a backup or copy step.
- **Infinite loop or recursion**: a loop whose exit condition can never become true, or recursion without
  a base case, on a code path that will run.

### Broken build or deploy

- **Broken build**: a change that cannot compile or load: missing module in `package.json`, import of a file
  that does not exist in the PR or the shown code, invalid JSON/YAML in a config file, merge conflict markers
  (`<<<<<<<`, `=======`, `>>>>>>>`).
- **Broken CI or workflow**: a GitHub Actions workflow change that runs untrusted PR code with secrets
  (`pull_request_target` plus a checkout of the PR head), grants `permissions: write-all`, or interpolates
  `${{ github.event.* }}` user-controlled fields (titles, bodies, branch names) directly into a `run:` script.

## P1 — High

### Breaking changes (code must not break existing callers)

- **Breaking API change**: a public function, class, method or exported constant was removed, renamed, or had
  its parameters reordered, made required, or had their type changed, and the PR does not update its callers
  or keep a backward-compatible alias. Point to the old signature.
- **Breaking HTTP contract**: an API route was removed or renamed, its method changed, a request field became
  required, or a response field was removed, renamed or changed type, without versioning (`/v2/...`)
  or a compatibility period.
- **Breaking return value**: a function now returns a different shape or type (`null` instead of `[]`,
  a Promise instead of a value, an object instead of an array) while callers still expect the old one.
- **Breaking default**: a default value, option or environment variable changed in a way that silently changes
  behavior for existing users (timeouts, limits, feature flags, sort order) without a note in the PR.
- **Breaking config or env**: a new required environment variable or config key that has no default and is not
  added to `.env.example`, the README or the deployment config, so the app fails to start after deploy.
- **Breaking schema change**: a database migration that renames or drops a column, changes a type, or adds a
  `NOT NULL` column without a default, while running code still uses the old schema. Suggest
  expand-then-contract (add new, migrate, remove old later).
- **Breaking event or message format**: changed fields in queue messages, webhooks, events or cache entries
  that other services or older versions still read or write.
- **Removed export still in use**: an `export` or `module.exports` entry removed while another shown file still imports it.
- **Dependency major bump**: a dependency upgraded across a major version (e.g. `4.x` to `5.x`) without
  code changes for its breaking changes, when the shown code uses an API that changed.

### Bugs

- **Bug**: wrong logic, missing `await`, assignment instead of comparison, wrong condition, off-by-one.
- **Missing await**: an `async` call whose result is used as if it were the value (`if (isValid(x))` when
  `isValid` is async), or a Promise that is never awaited where order matters.
- **Async in forEach**: `array.forEach(async ...)` where the code after it expects the work to be finished.
  Suggest `for...of` with `await` or `Promise.all`.
- **Loose equality bug**: `==` / `!=` where type coercion changes the result (`0 == ''`, `null == undefined`
  used on purpose is fine).
- **Wrong comparison**: comparing objects or arrays by reference (`[] === []`), `NaN === NaN`,
  `typeof x === 'array'`, or comparing a Promise instead of its value.
- **Mutating shared state**: changing a function argument, a shared default object, a module-level constant
  object, or a React/Vue state object in place when callers do not expect it.
- **Race condition**: check-then-act on shared state across `await` (read, await, write) without a lock,
  transaction or atomic operation, e.g. "check stock, then decrement" or "find user, then create user".
- **Wrong `this`**: a method passed as a callback without binding, or an arrow function used where `this`
  is required.
- **Variable shadowing bug**: an inner variable hides an outer one and the code uses the wrong one.
- **Unreachable code**: code after `return`, `throw`, `break` or `continue`, or a condition that is always
  true or always false, when it hides intended logic.
- **Switch fall-through**: a `case` without `break`/`return` that falls into the next case by accident.
- **Floating point money**: currency or exact amounts calculated with floating point numbers. Use integer
  cents or a decimal library.
- **Date and time bug**: months treated as 1-based in `new Date(y, m, d)`, local time used where UTC is
  needed, timezone dropped when storing or comparing dates, or `Date.parse` on a non-ISO string.
- **Wrong parseInt**: `parseInt` without a radix on user input, or `parseInt` used on floats.
- **Integer overflow**: arithmetic that can exceed `Number.MAX_SAFE_INTEGER` (IDs, large counters,
  timestamps in nanoseconds) without `BigInt` or a string.
- **Regex bug**: a regex missing anchors (`^`/`$`) when used for validation, unescaped `.` in domains or
  versions, or a global regex (`/g`) reused with `.test()` across calls.

### Security risks

- **Secret exposure**: code that reads a secret (API keys, tokens, passwords, private keys, `process.env`
  values, secrets from config) and then exposes it:
  - logs or prints it (`console.log`, a logger, `print`), even partially or inside an object,
  - puts it in an error message, an exception, or a URL / query string,
  - returns it in an API response or sends it to the browser,
  - sends it to an external or unknown server (`fetch`, `axios`, webhooks) other than the service the secret belongs to.
  Point to where the secret is read and where it leaks.
- **Sensitive data in logs**: passwords, full card numbers, national IDs, session cookies, auth headers,
  or whole request bodies that may contain them, written to logs.
- **Missing input validation**: user input (body, query, params, headers, uploaded files) used for
  database writes, file paths, redirects or business decisions without checking its type, range or format.
- **XSS**: user input rendered as HTML without escaping: `innerHTML`, `outerHTML`, `document.write`,
  `dangerouslySetInnerHTML`, `v-html`, `insertAdjacentHTML`, or a template marked safe (`|safe`, `{{{ }}}`).
- **Open redirect**: redirecting to a URL taken from user input without checking it against an allow list.
- **SSRF**: the server fetches a URL that comes from user input without restricting the host
  (blocks internal addresses like `169.254.169.254`, `localhost`, private ranges).
- **Missing authorization check**: an endpoint loads or changes a record by ID without checking that the
  current user owns it or is allowed to access it (IDOR).
- **Mass assignment**: saving `req.body` (or the whole input object) straight into a model, so users can set
  fields like `role`, `isAdmin`, `ownerId` or `balance`.
- **Insecure cookie**: session or auth cookies set without `httpOnly`, `secure` and a `sameSite` value.
- **Prototype pollution**: deep-merging or assigning user-controlled keys into objects without blocking
  `__proto__`, `constructor` and `prototype`.
- **ReDoS**: a regex with nested quantifiers (`(a+)+`, `(.*)*`, `(\w+\s?)*`) applied to user input.
- **Timing-unsafe compare**: comparing secrets, tokens, HMACs or password hashes with `===` instead of a
  constant-time comparison (`crypto.timingSafeEqual`).
- **JWT misuse**: accepting `alg: none`, decoding a JWT without verifying it (`jwt.decode` used for auth),
  missing expiry, or a hardcoded signing secret.
- **Unrestricted file upload**: uploads accepted without a size limit, type check, or with the user's file
  name used as the stored path.
- **Rate limit missing on auth**: a new login, signup, password reset, OTP or token endpoint with no rate
  limiting or lockout, when other endpoints in the shown code have it.

### Code quality that blocks maintenance

- **File too long**: a code file over 500 lines. Suggest how to split it. Does not apply to Markdown, docs,
  rule files, generated files, lock files, fixtures or data files.
- **Duplicate code**: a block of 6 or more lines copied instead of reused. Point to the original and suggest a
  shared function. Does not apply to tests or configuration.
- **Dead feature flag path**: a feature flag check where both branches are now identical, or the flag is
  hardcoded on/off so one branch can never run.

### Data and database

- **N+1 query**: a database query or HTTP call inside a loop over records, when one batched query would do.
- **Missing transaction**: several related writes (create order + decrement stock, debit + credit) that must
  all succeed or all fail, done without a transaction.
- **Unbounded query**: a query without `LIMIT` or pagination on a table that can grow (users, orders, logs),
  returned straight to the client.
- **Missing index hint**: a new query filtering or sorting on a column that the PR's migration does not index,
  on a table the code clearly treats as large. Report only when the migration is in the PR.
- **Irreversible migration**: a migration with no `down` / rollback step when the project's other migrations have one.
- **Data backfill in request path**: a one-off data fix or backfill run inside normal request handling or app
  startup instead of a migration or script.
- **Soft delete ignored**: a new query that reads records without filtering out soft-deleted rows
  (`deletedAt`, `isDeleted`) when the surrounding queries do filter them.

### CI, containers and supply chain

- **Unpinned action**: a GitHub Action used by tag or branch (`@v4`, `@main`) instead of a full commit SHA,
  when the other actions in the repo are pinned.
- **Overbroad workflow permissions**: a workflow or job without a `permissions:` block, or with write
  permissions it does not need (`contents: write` for a lint job).
- **Secrets in workflow logs**: `echo` of a secret or token in a workflow, `set -x` in a step that uses
  secrets, or secrets passed as command-line arguments instead of environment variables.
- **Untrusted script download**: `curl ... | sh`, `wget ... | bash`, or downloading and running a binary
  without a checksum or signature check.
- **Container runs as root**: a Dockerfile with no `USER` instruction (or `USER root`) for the final image.
- **Unpinned base image**: `FROM image:latest` or no tag. Suggest a version tag or digest.
- **Secrets in image**: `ENV`, `ARG` or `COPY` that puts secrets, `.env` files or credentials into an image layer.
- **Bloated image**: dev dependencies, build tools, `.git` or test data copied into the production image when
  a multi-stage build or `.dockerignore` would remove them.
- **Install scripts from unknown packages**: a new dependency with a name close to a popular package
  (typosquatting, e.g. `expresss`, `lodahs`) or from an unknown Git URL.
- **Lock file out of sync**: `package.json` dependencies changed but the lock file was not updated in the
  PR (or the reverse), when the lock file is committed.

### Malicious or suspicious code

- **Suspicious code**: obfuscated code, long base64 or hex strings that are decoded and executed, code that
  sends environment variables or files to an unknown host, or postinstall scripts that download things.
  Report as P0 if it is clearly malicious.
- **Hidden behavior**: code whose name or comment says one thing but does another (a "logger" that uploads
  data, a "test" helper that disables auth in production).

## P2 — Medium

### Structure and size

- **Function too long**: a function over 50 lines. Report it on the function's first line.
- **Too many parameters**: a function with more than 5 parameters. Suggest an options object.
- **Deep nesting**: code nested more than 4 levels deep (`if` inside `for` inside `if` inside `try`...).
  Suggest early returns or extracting a function.
- **Complex condition**: a single `if` with more than 3 `&&`/`||` parts that is hard to read. Suggest a named
  boolean or helper function.
- **God function**: one function that does unrelated jobs (parses input, talks to the database, formats output
  and sends email). Suggest splitting by responsibility.
- **Long parameter flag**: a boolean parameter that switches a function between two different behaviors
  (`save(user, true)`). Suggest two functions or a named option.

### Hardcoded values

- **Hardcoded value**: magic numbers (other than 0, 1, 2) and URLs written inline. They belong in a
  constants/config file. Values inside constants/config files and tests are fine.
- **Hardcoded environment detail**: hostnames, ports, file system paths (`/Users/...`, `C:\\...`),
  bucket names, account IDs or email addresses that differ between environments.
- **Hardcoded timeout or retry**: timeouts, retry counts, intervals and limits written inline instead of a
  named constant or config value.
- **Magic string**: the same status, role, event name or key string written in more than one place.
  Suggest a constant or enum.

### Error handling

- **Missing error handling**: unchecked HTTP responses, unhandled promise rejections, empty `catch` blocks.
- **Unchecked HTTP status**: using `fetch` results without checking `response.ok` or the status code.
- **Swallowed error**: `catch` that only logs and then continues as if it succeeded, when the caller needs
  to know it failed.
- **Lost error cause**: re-throwing a new error without the original (`throw new Error('failed')` inside a
  `catch` that drops `error`). Suggest `{ cause: error }` or including the message.
- **Throwing non-errors**: `throw 'message'` or throwing plain objects instead of `Error` instances.
- **Missing timeout**: an HTTP call, database query or external process with no timeout, where a hang would
  block a request or job.
- **Missing cleanup**: file handles, DB connections, timers, intervals, event listeners or subscriptions
  opened without being closed (`finally`, `using`, unsubscribe in cleanup).
- **Process exit in library code**: `process.exit()` called from a library or request handler instead of
  throwing or returning an error.
- **Unhandled stream errors**: streams, sockets or event emitters without an `'error'` listener.

### Edge cases

- **Edge case**: empty lists, `null`/`undefined`, `0` or `false` treated as "missing".
- **Falsy check bug**: `if (!value)` or `value || default` where `0`, `''` or `false` are valid values.
  Suggest `??` or an explicit `=== undefined` check.
- **Empty collection**: code that assumes an array has at least one element (`items[0].id`, `Math.max(...[])`,
  `reduce` without an initial value).
- **Division by zero**: dividing by a count, length or total that can be zero.
- **Missing optional chaining**: reading a nested property from data that can be partial (API responses,
  user input, optional config) without a check.
- **Unicode and length**: using `.length` or `slice` to limit user-facing text where emoji or non-Latin text
  may be cut in half, when the limit matters (database column sizes, SMS).
- **Boundary values**: checks that use `<` where `<=` is needed (or the reverse) at limits like page size,
  max length, expiry time or age.
- **Concurrent duplicate**: a create endpoint that can make duplicates when called twice (double click,
  retry) without an idempotency key or unique constraint.

### Performance

- **Work inside loop**: a regex, `JSON.parse`, sort, or object creation repeated on every iteration when it
  could be done once before the loop.
- **Quadratic lookup**: `array.find`, `includes` or `indexOf` inside a loop over another large array.
  Suggest a `Map` or `Set`.
- **Blocking call**: synchronous file system, crypto or `child_process` calls (`readFileSync`, `execSync`)
  inside a request handler or hot path. Startup code and CLI scripts are fine.
- **Sequential awaits**: independent `await` calls run one after another when they could run together with
  `Promise.all`.
- **Unbounded concurrency**: `Promise.all` over a list of unknown size that makes network or database calls.
  Suggest batching or a concurrency limit.
- **Memory growth**: caches, maps or arrays at module level that grow forever without a size limit or expiry.
- **Large payload**: loading a whole file, table or response into memory when it can be large. Suggest
  streaming or pagination.

### API and interface design

- **Inconsistent response**: an endpoint that returns different shapes for success and error, or a different
  error format from the other endpoints in the shown code.
- **Wrong status code**: returning `200` for errors, `500` for bad user input (should be `4xx`), or `404`
  vs `403` used inconsistently with the rest of the API.
- **Missing pagination**: a new list endpoint that returns all items with no `limit`/`cursor` parameters.
- **Leaky internals**: returning raw database errors, stack traces or internal IDs/fields (password hashes,
  internal flags) in an API response.

### Dependencies

- **Unneeded dependency**: a new package added for something the language or an existing dependency already
  does in a few lines (e.g. `left-pad`, `is-number`).
- **Unpinned dependency**: a dependency added with `*`, `latest` or a Git branch instead of a version.
- **Dependency in wrong section**: a runtime package added to `devDependencies`, or a build/test-only package
  added to `dependencies`.
- **Deprecated API**: using an API the shown code or runtime marks as deprecated (`new Buffer()`,
  `url.parse` for untrusted input, `componentWillMount`) when a replacement exists.

### Tests

- **Missing test for bug fix**: a PR that fixes a bug in logic but adds no test that would have caught it,
  when the project has a test folder.
- **Weak test**: a test with no assertions, assertions that always pass (`expect(true).toBe(true)`), or that
  only checks that a function was called and not what it did.
- **Focused or skipped test**: `.only`, `fit`, `fdescribe`, `.skip`, `xit` left in a test file.
- **Flaky test**: tests that depend on real time, `setTimeout` sleeps, random values, test order or the
  network without mocks.
- **Test touches real services**: tests that call real external APIs, send real emails, or use production
  URLs or credentials.

### Other languages and file types

- **Python mutable default**: a function with a mutable default argument (`def f(items=[])`, `={}`).
- **Python bare except**: `except:` or `except Exception: pass` that hides every error, including typos.
- **Python resource leak**: `open()` without a `with` block.
- **Python shell=True**: `subprocess` with `shell=True` and any non-constant command (P0 if user input reaches it).
- **Shell unquoted variable**: unquoted `$VAR` in shell scripts where the value can contain spaces or be
  empty (`rm -rf $DIR/`), or scripts without `set -euo pipefail` that continue after a failed command.
- **SQL select star**: `SELECT *` in application queries that are returned to clients or mapped to models,
  so new columns (including sensitive ones) leak out.
- **YAML or JSON config mistake**: duplicate keys, wrong indentation that changes meaning, or values like
  `no`/`yes`/`on` that YAML turns into booleans by accident.
- **TypeScript type escape**: `any`, `as unknown as`, non-null assertions (`!`) or `@ts-ignore` added to hide
  a real type error, without a comment explaining why.
- **TypeScript loose types**: new public functions or API responses typed as `any` or `object` when the
  shape is known.

### Documentation and types

- **Misleading docs**: a README, docstring or JSDoc in the PR that describes behavior different from the code.
- **Missing changelog**: a user-visible or breaking change with no changelog entry, when the repo keeps a
  `CHANGELOG.md`.
- **Wrong example**: code examples in docs that would not run with the code in this PR (wrong function
  names, old parameters).

### Logging and observability

- **Missing error log**: a `catch` in a request handler or background job that returns an error without
  logging what went wrong (or adding it to the error response's cause).
- **Log without context**: error logs with no identifying context (`console.error('failed')`). Suggest
  including the operation and a request, user or record ID (not secrets).
- **Wrong log level**: errors logged as `info`/`debug`, or normal events logged as `error`, so alerts
  become noisy or real errors are missed.
- **Noisy logging**: logging inside a hot loop or on every request at `info` level with large objects.
- **Missing audit trail**: security-relevant actions (login, role change, password reset, deletion of
  records, payment changes) with no log or audit entry, when similar actions in the shown code have one.

### Configuration

- **Config read everywhere**: `process.env` read deep inside business logic in many places instead of one
  config module, when the project already has one (e.g. `src/constants.js` or a `config` file).
- **Missing config validation**: required configuration read at startup without checking it exists or has
  the right format, so the app fails later with a confusing error.
- **Environment check in code**: logic that branches on `NODE_ENV === 'production'` (or similar) to change
  security behavior, e.g. turning off validation, auth or TLS outside production.
- **Debug mode on**: debug flags, verbose error pages, stack traces or dev tools enabled in production config.

### Background jobs and concurrency

- **Non-idempotent job**: a queued job, webhook handler or cron task that does harm if it runs twice
  (double charge, duplicate email) and has no idempotency check.
- **Missing retry limit**: a retry loop with no maximum number of attempts or no backoff.
- **Fire and forget**: a Promise started without `await` or `.catch` in a request handler, so failures are
  lost and the process may crash on an unhandled rejection.
- **Shared mutable global**: module-level variables used to hold per-request or per-user data on a server
  that handles many requests at once.
- **Timer leak**: `setInterval` or long `setTimeout` started without a way to clear it on shutdown.
- **No graceful shutdown**: a new server, worker or queue consumer that does not stop cleanly on `SIGTERM`
  (finish in-flight work, close connections), when the app already handles shutdown elsewhere.

### Frontend

- **Missing key**: list rendering (`.map` to JSX, `v-for`) without a stable `key`, or using the array
  index as key for lists that can reorder.
- **Effect dependency bug**: a React `useEffect`/`useMemo`/`useCallback` that uses values missing from its
  dependency array, or an effect that sets state it depends on (infinite re-render).
- **State updated after unmount**: async work in an effect without cleanup or an abort signal.
- **Inaccessible control**: clickable `div`/`span` without a role and keyboard handler, images without `alt`,
  form inputs without labels, or buttons with only an icon and no accessible name.
- **Secret in frontend code**: private API keys or server-only environment variables used in code that runs
  in the browser (anything bundled for the client). Public keys meant for the browser are fine.
- **Token in local storage**: auth tokens stored in `localStorage`/`sessionStorage` where an XSS could read
  them, when an `httpOnly` cookie is possible.
- **Unvalidated form submit**: a form that sends data without basic client-side checks, and no loading or
  disabled state, so users can submit twice.
- **Missing loading or error state**: a component that fetches data but shows nothing (or crashes) while
  loading or when the request fails.
- **Hardcoded user-facing text**: new user-facing strings written inline in a project that uses a
  translation system (`t('...')`, i18n files).

## P3 — Low

### Leftovers

- **Debug statement**: leftover `console.log`, `console.debug`, `debugger`.
- **TODO comment**: unresolved `TODO`, `FIXME`, `HACK`.
- **Commented-out code**: blocks of code left commented out instead of deleted (git keeps the history).
- **Unused code**: variables, imports, parameters or functions added in this PR and never used in the shown
  code.
- **Leftover test data**: hardcoded test emails, user IDs, or `localhost` URLs left in non-test code.

### Readability

- **Readability**: confusing names or code that is hard to follow.
- **Unclear name**: names like `data`, `temp`, `obj`, `x`, `handle`, `doStuff`, or misleading names
  (`isValid` that returns a string, `getUser` that also creates one).
- **Inconsistent naming**: a new name that does not follow the naming style around it (camelCase vs
  snake_case, `get` vs `fetch` for the same kind of action).
- **Negative boolean**: double negatives like `if (!isNotEnabled)` or names like `disableNoCache`.
- **Nested ternary**: ternary operators nested inside each other. Suggest `if` statements or a lookup object.
- **Long line**: a line much longer than its neighbours that is hard to read, when it is not a string or URL.
- **Outdated comment**: a comment that no longer matches the code next to it after this PR's change.
- **Comment says what, not why**: comments that repeat the code (`// increment i`) instead of explaining intent.

### Small improvements

- **Prefer const**: `let` for a variable that is never reassigned, or `var` in new code.
- **Redundant code**: `if (x) return true; else return false;`, `x === true`, `await` on a non-Promise,
  `return await` outside a `try`, or an `else` after a `return`.
- **Simpler built-in**: a manual loop that a built-in does more clearly (`map`, `filter`, `some`, `Object.entries`,
  `Array.from`, optional chaining, `??`).
- **String building**: long string concatenation with `+` where a template literal is clearer.
- **Missing JSDoc on export**: a new exported function with non-obvious parameters or return value and no
  doc comment, in a file where other exports have one.

### PR hygiene

- **Unrelated change**: a change that has nothing to do with the rest of the PR (formatting a different file,
  an unrelated fix). Suggest a separate PR.
- **Missing docs update**: a change to setup, environment variables, commands or public behavior without
  updating the README or docs, when the README describes that behavior.
- **Missing env example**: a new environment variable read in code but not added to `.env.example`
  (use P1 "Breaking config or env" instead if the app cannot start without it).

### Consistency with the codebase

- **Reinvented helper**: new code that re-implements a helper, constant or util that already exists in the
  shown files. Point to the existing one.
- **Different pattern**: new code that solves a problem differently from the established pattern right next
  to it (callbacks where the file uses `async`/`await`, a new HTTP client when one is already used),
  without a reason.
- **Mixed module systems**: `require` and `import` mixed in the same file, or a new file using a different
  module system from the rest of the project.

## Do not flag

These are not problems. Skip them even if a rule above seems to match.

- Formatting and whitespace-only changes.
- Code that is unchanged in this PR, even if it breaks a rule.
- `console.log` / `console.error` in CLI scripts, build scripts, workflow scripts and startup messages
  where printing is the purpose (but secrets in them are still P1 "Secret exposure").
- Magic numbers that are self-explanatory in context: HTTP status codes (`200`, `404`), `100` for percent,
  `60`/`24`/`1000` in time conversions, array indexes in tests, and values in constants/config files.
- Long functions or files that only contain data, tables, configuration, translations or test cases.
- `process.env.X` reads with a sensible default (`process.env.PORT || 3000`).
- Placeholder values in docs, examples and `.env.example`.
- Using `any`, `// eslint-disable` or `@ts-ignore` with a comment explaining why.
- Personal preferences with no impact on correctness, safety or readability.
