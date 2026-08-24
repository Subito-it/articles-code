---
description: Migrate a frontend repository's tests from Jest to Vitest
argument-hint: "<repository or file(s)>"
---

# Migrate Jest to Vitest

## What this command does

You are an expert frontend engineer. Your task is to migrate Jest test files to Vitest, applying every transformation rule below with surgical precision, and to tune the resulting Vitest setup for correctness and performance — not just convert syntax. The target files are: **$ARGUMENTS**

If no argument is provided, ask the user which file(s) or repository to migrate before proceeding.

This playbook was generalized from several real Jest→Vitest migrations. The per-file conversion rules (below) are close to mechanical and rarely cause trouble. The real risk in this kind of migration is not the syntax swap — it's pool selection, worker tuning, and libraries that were silently auto-mocked for years suddenly running for real. Sections 5–9 exist because skipping them is exactly what caused avoidable rework in the migrations this playbook is based on: one repo's first migration attempt had to be rolled back over flaky tests and retried a few days later, and one team shipped a performance "fix" that was later reverted for producing no measurable gain. Neither was a production incident — both were caught before users were affected — but both were extra round-trips a benchmark-first process would have skipped. Do not treat this command as done once `grep -n 'jest\.' <file>` returns nothing — it isn't done until Section 9 passes.

---

## 0 — Pre-flight: repository discovery & current-state audit

Before changing anything, establish a baseline. Run and record:

```bash
# Is this repo on Jest, Vitest, or a mix?
find . -maxdepth 2 -not -path '*/node_modules/*' \( -name "jest.config.*" -o -name "vitest.config.*" \)

# How big is the suite?
find . -not -path '*/node_modules/*' \( -name "*.spec.ts" -o -name "*.spec.tsx" -o -name "*.test.ts" -o -name "*.test.tsx" \) | wc -l

# What does the current test command actually do, and how long does it take under Jest?
grep -A2 '"test"' package.json
```

**Record the current Jest run time** (`time npm test` or equivalent) before migrating anything. You will need this number in Section 6 — without a real "before" measurement, any later claim that Vitest is "faster" or "slower" is a guess, not a finding.

---

## Mental model: key differences to keep in mind

Before touching any code, internalize these fundamental differences between Jest and Vitest:

- **Global `vi` object**: if the project sets `globals: true` in `vitest.config.ts`, `vi` is available everywhere — no import needed, except in `__mocks__/` files, which are outside the globals scope.
- **`__mocks__/` auto-mocking is disabled by default**: Jest automatically intercepts imports for any package that has a matching file in `__mocks__/`. Vitest does not — every `__mocks__/` file must be activated with an explicit `vi.mock('package-name')` at the top of the test file.
- **Default environment**: confirm what `environment` is set to in `vitest.config.ts` (commonly `jsdom` for component tests, `node` for server-side code). No per-file environment directive is needed once this is set correctly project-wide.
- **ESM-native**: Vitest uses native ES modules. Babel interop artifacts like `__esModule: true` are meaningless and should be removed.
- **`window.location.origin` differs**: Jest's jsdom typically reports `http://localhost` (port 80 implied); Vitest's dev-server-backed jsdom reports `http://localhost:<port>`. Any test that asserts on absolute URLs must account for this.

---

## Scope: what to migrate and what to leave alone

**Migrate:** Unit and integration test files — typically `*.spec.ts`, `*.spec.tsx`, `*.test.ts`, `*.test.tsx` — and snapshot files under `__snapshots__/`. Also migrate any `__mocks__/` files that use `jest.fn()`.

**Do NOT touch:** End-to-end tests that import from `@playwright/test`, `cypress`, or similar. These typically run in a completely separate pipeline and are unaffected by this migration.

Before processing any file, run this check:

```bash
grep -l '@playwright/test\|from .playwright\|cypress' <file-path>
```

If the file is returned, skip it entirely.

---

## Per-file workflow

Work through each eligible file sequentially. For every file:

1. Read the full file contents, line per line.
2. Identify which rules below apply.
3. Apply all applicable rules.
4. Write the migrated file back.
5. Run `grep -n 'jest\.' <file-path>` to catch any remaining `jest.*` occurrences and fix them.

---

## Migration Rules

### Rule 1 — Global API replacements (`jest.*` → `vi.*`)

Replace every `jest.*` call with its `vi.*` equivalent. These are direct, behavior-identical substitutions:

| Before | After |
|---|---|
| `jest.fn()` | `vi.fn()` |
| `jest.mock(...)` | `vi.mock(...)` |
| `jest.mocked(fn)` | `vi.mocked(fn)` |
| `jest.spyOn(...)` | `vi.spyOn(...)` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.resetAllMocks()` | `vi.resetAllMocks()` |
| `jest.restoreAllMocks()` | `vi.restoreAllMocks()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.useRealTimers()` | `vi.useRealTimers()` |
| `jest.runAllTimers()` | `vi.runAllTimers()` |
| `jest.runOnlyPendingTimers()` | `vi.runOnlyPendingTimers()` |
| `jest.advanceTimersByTime(n)` | `vi.advanceTimersByTime(n)` |

This applies to every module, including internal/private packages your project depends on — replace `jest.mock('your-internal-package')` with `vi.mock('your-internal-package')` exactly the same way you would for a third-party package.

> `vi` is globally available (if `globals: true` is set) except in `__mocks__/` files — see Rule 9.

---

### Rule 2 — TypeScript type annotations

The `jest.*` type namespace does not exist in Vitest. Replace every usage and add the corresponding import from `'vitest'` if not already present.

| Before | After | Import to add |
|---|---|---|
| `jest.Mock` | `Mock` | `import type { Mock } from 'vitest'` |
| `jest.MockedFunction<T>` | `MockedFunction<T>` | `import type { MockedFunction } from 'vitest'` |
| `jest.SpyInstance` | `MockInstance` | `import type { MockInstance } from 'vitest'` |

The `as jest.Mock` cast pattern should be replaced with `vi.mocked()` (preferred) or `as Mock`:

```ts
// Before
(fetchData as jest.Mock).mockResolvedValue({ id: 1 });

// After — preferred
vi.mocked(fetchData).mockResolvedValue({ id: 1 });

// After — alternative (when vi.mocked feels awkward in a variable declaration)
(fetchData as Mock).mockResolvedValue({ id: 1 });
// requires: import type { Mock } from 'vitest'
```

Variable declarations with `jest.MockedFunction`:

```ts
// Before
const mockedUseFoo = useFoo as jest.MockedFunction<typeof useFoo>;

// After
import type { MockedFunction } from 'vitest'
const mockedUseFoo = useFoo as MockedFunction<typeof useFoo>;
```

---

### Rule 3 — `jest.requireActual` → `vi.importActual` (async)

`vi.importActual` is async and returns a Promise. The `vi.mock()` factory must become `async`:

```ts
// Before
jest.mock('./hooks', () => {
  const original = jest.requireActual('./hooks');
  return { ...original, useViewport: jest.fn() };
});

// After
vi.mock('./hooks', async () => {
  const original = await vi.importActual<typeof import('./hooks')>('./hooks');
  return { ...original, useViewport: vi.fn() };
});
```

Both `Object.assign` and spread syntax work for merging actuals:

```ts
// Before
jest.mock('./hooks', () => {
  const original = jest.requireActual('./hooks');
  return Object.assign({}, original, { useViewport: jest.fn() });
});

// After
vi.mock('./hooks', async () => {
  const original = await vi.importActual<typeof import('./hooks')>('./hooks');
  return Object.assign({}, original, { useViewport: vi.fn() });
});
```

---

### Rule 4 — Remove `__esModule: true`

The `__esModule: true` flag is a Babel/Jest interop artifact. Vitest uses native ESM, so this property is unnecessary and must be removed from all `vi.mock()` factories:

```ts
// Before
jest.mock('./myModule', () => ({
  __esModule: true,
  default: jest.fn(),
  namedExport: jest.fn(),
}));

// After
vi.mock('./myModule', () => ({
  default: vi.fn(),
  namedExport: vi.fn(),
}));
```

---

### Rule 5 — Next.js module mocks (skip if not a Next.js project)

These modules must be mocked at the **top level of the file** (never inside a `describe` block) because Vitest hoists `vi.mock()` calls to the top of the module.

#### `next/headers`

In current Next.js versions, `headers()` and `cookies()` are async. Mock them with resolved values and a `get` method:

```ts
// Before — minimal mock without implementation
jest.mock('next/headers', () => ({
  headers: jest.fn(),
  cookies: jest.fn(),
}));

// After — async with resolved values
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('some-header-value'),
  }),
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue({ name: 'session-id', value: 'example-value' }),
  }),
}));
```

Once this top-level mock is in place, **remove any per-test repetition** of the same mock (e.g. blocks that re-mock `headers`/`cookies` inside `beforeEach` or individual test bodies). If a specific test needs different header/cookie values, use a one-time override:

```ts
vi.mocked(headers).mockResolvedValueOnce({ get: vi.fn().mockReturnValue('different-value') });
```

#### `next/navigation`

```ts
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  usePathname: vi.fn().mockReturnValue('/'),
  notFound: vi.fn(),
}));
```

Only include the exports that are actually imported in the test file. If the file uses `jest.requireActual('next/navigation')` to spread real exports, convert it with `vi.importActual` as described in Rule 3.

---

### Rule 6 — Fake timers with `userEvent`

When `userEvent.setup()` is configured with fake timers:

```ts
// Before
const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

// After
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
```

**Known gap:** at time of writing, `@testing-library/user-event`'s fake-timer integration checks specifically for Jest's timer API shape and may not recognize Vitest's `vi` object automatically. If tests using fake timers with `userEvent` hang or silently fail to advance time, add a Jest-shim in your setup file:

```ts
// vitest.setup.ts — only needed if userEvent's fake-timer detection doesn't recognize `vi`
// @ts-expect-error minimal shim so libraries that specifically check for Jest's timer API still work
globalThis.jest = {
  advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
};
```

Check the current version of `@testing-library/user-event` before adding this — it may already be fixed upstream.

---

### Rule 7 — `@jest-environment` docblock → remove or replace

The old Jest per-file environment directive is not recognized by Vitest:

```ts
// Before
/** @jest-environment node */

// After — single-line comment only, must be the first line of the file
// @vitest-environment node
```

If the project's default environment (set in `vitest.config.ts`) already matches what the docblock was requesting, remove the directive entirely instead of rewriting it.

---

### Rule 8 — `__mocks__/` directory: explicit activation + syntax update

**Why this matters — this is the single highest-risk step in the whole migration.** Jest automatically applies any file in `__mocks__/` that matches an npm package name, transitively, anywhere in the import graph. Vitest does not — it will load the real package from `node_modules` unless you explicitly opt in. Skipping this step doesn't always cause a loud failure: it can cause a test to silently exercise a different code path than the one it was written to verify, which is a false-positive-test risk, not just a broken build.

**Step 1 — Add explicit `vi.mock()` calls.**
Scan the **full module graph** rooted at the test file — not just the test file's own imports. For each package that has a corresponding file in the project's `__mocks__/` directory, add an explicit `vi.mock('package-name')` at the top of the test file:

```ts
// Add this if __mocks__/some-auth-package.ts exists and 'some-auth-package' is imported
// anywhere in the dependency graph — including inside the component under test.
vi.mock('some-auth-package');
```

> **Why the full graph matters:** in Jest, `__mocks__/` auto-mocking applied transitively — any import anywhere in the dependency chain was silently intercepted. In Vitest, only an explicit `vi.mock()` in the test file activates a manual mock. If the test renders `<Profile />` and `Profile` internally calls `getCurrentUser()` from an auth package, you must add `vi.mock('some-auth-package')` even though the test never imports that package itself. Without it, the real library code runs (often failing in jsdom/Node, or worse, succeeding differently than expected), and the component follows a different code path than the test was written to exercise.

**Step 2 — Update the `__mocks__/` file itself.**
Manual mock files under `__mocks__/` run outside Vitest's globals scope, so they must import `vi` explicitly:

```ts
// Before
const mockFn = jest.fn();

// After
import { vi } from 'vitest';
const mockFn = vi.fn();
```

Also convert any CommonJS exports to ES module syntax:

```ts
// Before
module.exports = { MyComponent: jest.fn() };

// After
import { vi } from 'vitest';
export const MyComponent = vi.fn();
```

**Step 3 — Proactively check known automocking-dependent libraries before they fail in CI.** Before declaring the migration done, specifically check whether the project uses any of the following, and verify each has an explicit mock if it's exercised in tests:

- **Error-tracking / observability SDKs** (Sentry, Bugsnag, and similar). These often expose functions that automocking silently resolves to `undefined` under some Vitest pool configurations — a call that should run (or fail loudly) instead does nothing, with no error raised.
- **Analytics or telemetry singletons** with a background sync/heartbeat timer. If the module was previously silently mocked out by Jest's `__mocks__/` auto-application, running the real module under Vitest can fire a real timer during test runs, producing unhandled promise rejections that look unrelated to the actual test.
- **Any shared internal package with a matching `__mocks__/` file**, even one the test file doesn't import directly — see Step 1.

---

### Rule 9 — `done` callback pattern

Vitest does not support the `done` callback in test functions. Convert to `async/await` (preferred) or a Promise wrapper:

```ts
// Before
it('should work', (done) => {
  someAsync(() => { done() });
});

// After — preferred (when someAsync can be awaited)
it('should work', async () => {
  await someAsync();
});

// After — Promise style (when refactoring to async is not straightforward)
it('should work', () => new Promise<void>((done) => {
  someAsync(() => { done(); });
}));
```

---

### Rule 10 — `beforeEach`/`beforeAll` returning a value

Vitest interprets a non-`undefined` return value from `beforeEach` or `beforeAll` as a **teardown function** and will call it after each test. This is a useful feature, but it means any expression that accidentally returns a value can cause unexpected cleanup. Wrap such expressions in an explicit block:

```ts
// Before — returns the result of the function call (could trigger unwanted teardown)
beforeEach(() => setupSomething())

// After — explicit block, returns undefined
beforeEach(() => { setupSomething() })
```

Conversely, you can use this feature intentionally to consolidate paired `beforeEach`/`afterEach` hooks:

```ts
// Before
beforeEach(() => connectToDatabase());
afterEach(() => disconnectFromDatabase());

// After — single hook with inline teardown
beforeEach(() => {
  connectToDatabase();
  return () => disconnectFromDatabase();
});
```

---

### Rule 11 — Environment variables and `replaceProperty`

For mutating environment variables in tests, use `vi.stubEnv` (automatically restored when `vi.unstubAllEnvs()` or `vi.restoreAllMocks()` is called):

```ts
// Before
process.env.SOME_PUBLIC_VAR = 'https://example.com';

// After
vi.stubEnv('SOME_PUBLIC_VAR', 'https://example.com');
```

**Watch out if the project uses the `threads` pool:** mutating `process.env` (including via `vi.stubEnv`) inside a long-lived worker thread can arrive too late for anything that reads the environment at process/V8 init time — most notably `TZ` for timezone-dependent date formatting. If date-formatted snapshots or assertions render in the wrong timezone only under CI, this is the likely cause; see Section 5 (pool selection) for the fix.

For `jest.replaceProperty` (which does not exist in Vitest), use `vi.spyOn` for getter properties or direct assignment for plain properties:

```ts
// Before
jest.replaceProperty(obj, 'key', value);

// After — getter property
vi.spyOn(obj, 'key', 'get').mockReturnValue(value);

// After — plain property
obj.key = value;
```

---

### Rule 12 — `window.location.origin` and absolute URL assertions

**Why this breaks:** jsdom resolves relative URLs against the document's base URL, which includes whatever port your dev server is listening on. Jest's jsdom setups typically report `http://localhost` (port 80 implied, omitted from the string); Vitest's jsdom (backed by Vite) reports `http://localhost:<port>` where `<port>` is Vite's dev server port. Any assertion that hard-codes the portless form will fail under Vitest.

**Where this shows up:** look for regex or string assertions on:
- DOM element attributes that hold absolute URLs: `img.src`, `a.href`, `link.href`
- `fetch` / `axios` call arguments captured via `vi.spyOn`
- Redirect targets built from `window.location.origin`

**What to do:** replace any regex that pins `localhost` immediately before a path with one that allows an optional port segment `(:\d+)?`:

```ts
// Before — only matches a portless origin
expect(container.querySelector('img')?.src).toMatch(
  /^http:\/\/localhost\/img\?rule=.*-1x-auto$/
);

// After — matches any port (or no port)
expect(container.querySelector('img')?.src).toMatch(
  /^http:\/\/localhost(:\d+)?\/img\?rule=.*-1x-auto$/
);
```

The same fix applies to string comparisons built with `window.location.origin`:

```ts
// Before
expect(redirectUrl).toBe('http://localhost/login');

// After
expect(redirectUrl).toMatch(/^http:\/\/localhost(:\d+)?\/login$/);
```

---

### Rule 13 — Jest-specific request/response mocking libraries → `node-mocks-http`

Libraries like `jest-express` and `mock-req-res` are Jest-specific, behavior-based mocking libraries (you verify calls via spies). Replace them with [`node-mocks-http`](https://github.com/howardabrams/node-mocks-http), a state-based library: methods update internal state, and you assert on helper accessors or plain properties. No spy framework needed, and it works identically under Jest, Vitest, or no test framework at all.

**Key differences:**

| Characteristic | Behavior-based (old) | `node-mocks-http` (new) |
|---|---|---|
| Testing approach | Behavior-based — verify spy calls | State-based — inspect final state |
| Reading response data | `res.json.calledWith(...)` | `res._getJSONData()` |
| Method behavior | Stubs that record calls | Real implementations that update headers/status/buffer |
| Stream / Events | Absent or very limited | Full `EventEmitter` support (`req.on('data', ...)`) |
| Spy dependency | Requires a spy/mock framework | Framework-agnostic |

**Import pattern to replace:**

```ts
// Before
import { mockRequest, mockResponse } from 'mock-req-res';

const req = mockRequest({ body: { id: 1 }, query: { page: '2' } });
const res = mockResponse();
expect(res.json.calledWith({ ok: true })).toBe(true);

// After
import httpMocks from 'node-mocks-http';

const req = httpMocks.createRequest({ body: { id: 1 }, query: { page: '2' } });
const res = httpMocks.createResponse();
expect(res._getJSONData()).toEqual({ ok: true });
```

**Response assertion mapping:**

| Old (behavior-based) | New (state-based) |
|---|---|
| `expect(res.json).toHaveBeenCalledWith({ ok: true })` | `expect(res._getJSONData()).toEqual({ ok: true })` |
| `expect(res.send).toHaveBeenCalledWith('text')` | `expect(res._getData()).toBe('text')` |
| `expect(res.status).toHaveBeenCalledWith(404)` | `expect(res.statusCode).toBe(404)` |
| `expect(res.setHeader).toHaveBeenCalledWith('X-Foo', 'bar')` | `expect(res.getHeader('X-Foo')).toBe('bar')` |
| `expect(res.redirect).toHaveBeenCalledWith('/login')` | `expect(res._getRedirectUrl()).toBe('/login')` |

**Fixture pattern** — `node-mocks-http` has no `resetMocked()`; recreate objects in `beforeEach` instead:

```ts
// Before
let req, res;
beforeEach(() => { req = new MockRequest(); res = new MockResponse(); });
afterEach(() => { req.resetMocked(); res.resetMocked(); });

// After
let req, res;
beforeEach(() => {
  req = httpMocks.createRequest();
  res = httpMocks.createResponse();
});
// No afterEach needed — objects are recreated fresh each time
```

Remove the old library from `package.json` devDependencies after all usages have been replaced.

---

### Rule 14 — Remove redundant `vi.clearAllMocks()` calls

If `vitest.config.ts` sets `clearMocks: true`, Vitest automatically resets all mock state after every test, and any explicit `vi.clearAllMocks()` call is redundant.

**What to remove:** any standalone `vi.clearAllMocks()` call inside `beforeEach`, `afterEach`, `beforeAll`, or `afterAll` — but only if `clearMocks: true` is actually set. If it isn't, leave the explicit calls in place, or consider adding the config option instead (equivalent outcome, less repetition).

```ts
// Before — clearAllMocks called manually
afterEach(() => {
  vi.clearAllMocks();
  server.close();
});

// After — clearAllMocks removed (config handles it); remaining logic stays
afterEach(() => {
  server.close();
});
```

If `vi.clearAllMocks()` is the **only** statement in the hook, remove the entire hook.

---

### Rule 15 — Remove redundant `@testing-library/jest-dom` imports

If your setup file (e.g. `vitest.setup.ts`) already imports `@testing-library/jest-dom/vitest` globally, any per-file import of `@testing-library/jest-dom` is redundant and can be removed:

```ts
// Before
import '@testing-library/jest-dom';

// After — remove the line entirely (already covered globally by the setup file)
```

Do not replace it with `@testing-library/jest-dom/vitest` per file — the setup file already covers this globally. Only apply this rule if you've confirmed the global import is actually present.

---

### Rule 16 — `vi.mock` factory with `importActual`: inline types, no outer `let`, pure factory

When writing a `vi.mock` factory that captures the real module implementation, follow these three rules:

**1. No named type alias** — use `typeof import('...')` inline in the generic; never extract it to a named type:

```ts
// Wrong
type FooModule = typeof import('../foo');
vi.mock('../foo', async () => {
  const orig = await vi.importActual<FooModule>('../foo');
  ...
});

// Right
vi.mock('../foo', async () => {
  const orig = await vi.importActual<typeof import('../foo')>('../foo');
  ...
});
```

**2. Capture actual values outside `vi.mock`** — if a test needs the real value of an export, capture it with a separate `vi.importActual` call before `vi.mock`, not via an outer `let` variable assigned inside the factory:

```ts
// Wrong — outer let, assigned inside factory as a side effect
let useFooActual;
vi.mock('../foo', async () => {
  const orig = await vi.importActual('../foo');
  useFooActual = orig.useFoo; // side effect
  return { ...orig, useFoo: vi.fn() };
});

// Right — captured outside the factory
const { useFoo: useFooActual } = await vi.importActual<
  typeof import('../foo')
>('../foo');

vi.mock('../foo', async () => {
  const originalModule = await vi.importActual<typeof import('../foo')>('../foo');
  return { ...originalModule, useFoo: vi.fn() };
});
```

**3. Factory must be pure** — the factory body should only do `importActual` → spread → override. No assignments to outer variables, no side effects.

---

## Vitest setup (one-time, per project)

Before migrating any test files, ensure the project is configured for Vitest.

---

### 1 — `package.json` dependencies

**Remove Jest packages** (adapt to what the project actually has installed — this is a representative list, not exhaustive):

```bash
npm uninstall jest jest-mock jest-environment-jsdom ts-jest @types/jest babel-jest identity-obj-proxy
```

**Remove Jest config files:**

```bash
rm -f jest.config.* jest.setup.* babel.config.*
```

(Only remove `babel.config.*` if it exists solely to support Jest — check whether anything else in the build depends on it first.)

**Install the generic Vitest core packages** (always the right install regardless of project specifics):

```bash
npm install --save-dev vitest jsdom @vitejs/plugin-react @vitest/coverage-v8 @vitest/ui
```

Add anything project-specific separately (e.g. an internal ESLint config package for Vitest, a request-mocking library like `node-mocks-http` if Rule 13 applies) — don't bundle those into the same install command as the generic core packages, since they vary per organization.

Update the `scripts` section in `package.json` to replace Jest commands with their Vitest equivalents:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "test:ci": "vitest run --coverage",
    "test:ui": "vitest --coverage --ui --watch"
  }
}
```

---

### 2 — `vitest.config.ts`

Create (or replace) `vitest.config.ts` at the project root. This is a starting point — adapt `alias` entries, `environment`, and CI-specific options to the project's needs, and see Section 5 below before finalizing `pool`/`maxWorkers`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const isEnvCI = !!process.env.CI;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    pool: 'forks',              // see Section 5 for why — do not default to vmThreads without reading it
    isolate: true,
    exclude: ['**/node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      reporter: isEnvCI ? ['lcov'] : ['text', 'html'],
    },
    setupFiles: ['./vitest.setup.ts'],
    clearMocks: true,
    environment: 'jsdom',
    include: ['**/*.spec.{ts,tsx}'],
  },
  resolve: {
    // Add any alias entries the project needs here — do not carry over
    // an example alias from another project without checking it applies.
  },
});
```

If the project has an existing `jest.setup.ts`, **rename it to `vitest.setup.ts`** rather than creating a new file — this preserves any existing setup logic. Then ensure it imports `vi` and any custom matchers your tests rely on:

```ts
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ResizeObserver is not available in jsdom — only add this if your components use it.
class ResizeObserverMock {
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();
}
Object.defineProperty(global, 'ResizeObserver', {
  value: ResizeObserverMock,
  writable: true,
  configurable: true,
});
```

Add mocks for any known automocking-dependent libraries identified in Rule 8, Step 3 (error trackers, analytics singletons) here, globally, rather than repeating them per test file.

If no `jest.setup.ts` exists, create `vitest.setup.ts` from scratch with the content above.

---

### 3 — `postcss.config.js` (if applicable)

Vite requires PostCSS plugins to be declared as **objects**, not strings. Convert every string-based plugin entry to object form:

```js
// Before
'postcss-flexbugs-fixes'

// After
'postcss-flexbugs-fixes': {}
```

For plugins that accept options, the options become the object value. Entries that already use object form can be left as-is.

---

### 4 — `tsconfig.json`

Add `"vitest/globals"` to the `types` array inside `compilerOptions` so TypeScript recognizes the globally-injected `vi`, `describe`, `it`, `expect`, etc. without needing per-file imports:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

If `types` does not yet exist, add it. If it exists with other entries, append `"vitest/globals"` to the array.

---

### 5 — Pool selection: the decision that matters most

Vitest offers three worker "pool" strategies, and **the choice is not cosmetic — it changes test correctness, not just speed.** Do not accept whatever pool the scaffolding defaults to without reading this section.

| Pool | How it works | Speed | Known correctness risks |
|---|---|---|---|
| `vmThreads` | Shares a single V8 context across test files in a worker | Fastest to start | Can mask real bugs that depend on module-scope isolation (a race condition that only surfaces when modules are freshly loaded per file); can break automocking assumptions some libraries rely on |
| `threads` | Real worker threads, isolated module registries | Middle | `process.env` mutations (including `TZ`) made inside an already-running thread can arrive too late for V8/ICU initialization — breaks timezone-dependent snapshots and any env-dependent module-load-time behavior |
| `forks` | Real child processes | Slowest by default (fresh jsdom + module graph per file) | Correct environment/timing semantics; exposes real races that shared-context pools can hide |

**Recommendation:** default to `forks` for correctness — timezone handling and environment-variable timing are the kind of bug that's expensive to debug later and cheap to avoid up front. Accept that this means you will need to do real performance tuning (Section 6) rather than getting speed for free.

**Before finalizing your choice, specifically test:**
- A date-formatted snapshot or assertion, with `TZ` set to something other than UTC, run under CI (not just locally where your machine's local TZ may match by coincidence).
- Any error-tracking/observability SDK call inside a mocked component — confirm it either runs the mock or fails loudly, not silently returns `undefined`.
- At least one test that depends on module-scope state being fresh per file (e.g. a module-level cache or singleton) — this is the class of bug `vmThreads` can hide.

---

### 6 — Mandatory: benchmark before you finalize `maxWorkers`

**Do not leave `maxWorkers` at whatever value you copied from an example config.** Every real migration this playbook is based on needed explicit tuning here — one team found their CI run went from roughly 35 seconds under Jest to roughly 3 minutes under Vitest, purely because of a worker-count mismatch, not because Vitest itself was slower. Another found their "obvious" performance fix (splitting tests into a `node` environment for DOM-free files) produced no measurable gain and had to be reverted.

Run a real sweep before committing to a value:

```bash
for n in 2 4 6 8 10; do
  echo "maxWorkers=$n:"
  VITEST_MAX_WORKERS=$n time npx vitest run
done
```

(Adapt the env var / CLI flag to however your `vitest.config.ts` reads the worker count — e.g. via `process.env.VITEST_MAX_WORKERS` if you wire it up, or by editing the config directly between runs.)

Plot the numbers, not just eyeball two runs — one real migration found their sweet spot at 6 workers on a 10-core machine, with *zero* further improvement at 8 or 10. Compare the best number you find against the Jest baseline you recorded in Section 0. If Vitest is still slower after this sweep, that is real information — do not paper over it by assuming a future Vitest release will fix it. Investigate `deps.optimizer` settings and whether `isolate: false` is safe for your suite before concluding you've hit a hard floor.

**If a performance "fix" doesn't produce a measurable improvement on the real CI runner (not just locally), revert it.** Don't leave speculative performance changes in the codebase on the assumption they must be helping — measure on CI, not just on your laptop.

---

### 7 — Checklist (run through for each file)

- [ ] All `jest.fn()` → `vi.fn()`
- [ ] All `jest.mock()` → `vi.mock()`
- [ ] All `jest.mocked()` → `vi.mocked()`
- [ ] All `jest.spyOn()` → `vi.spyOn()`
- [ ] All `jest.clearAllMocks()` / `resetAllMocks()` / `restoreAllMocks()` → `vi.*`
- [ ] All fake timer calls → `vi.*` equivalents
- [ ] All `jest.Mock`, `jest.MockedFunction`, `jest.SpyInstance` types → Vitest equivalents with imports
- [ ] All `(fn as jest.Mock)` casts → `vi.mocked(fn)` or `(fn as Mock)`
- [ ] All `jest.requireActual` → `async vi.importActual` (inline `typeof import()`, pure factory, actuals captured outside — Rule 16)
- [ ] All `__esModule: true` removed from `vi.mock()` factories
- [ ] Next.js mocks (if applicable) at top level with correct async signatures; per-test duplicates removed
- [ ] Explicit `vi.mock()` calls added for every `__mocks__/` file used by this test, including transitive dependencies (Rule 8)
- [ ] `__mocks__/` files themselves updated with explicit `vi` import and ES module exports
- [ ] `userEvent.setup({ advanceTimers })` updated
- [ ] `@jest-environment` docblocks replaced or removed
- [ ] `done` callbacks converted to async/await
- [ ] `beforeEach`/`beforeAll` returning values wrapped in blocks (or intentionally returning teardown)
- [ ] `process.env` mutations use `vi.stubEnv`; `jest.replaceProperty` replaced with `vi.spyOn` or direct assignment
- [ ] Absolute URL assertions updated to tolerate a port in the origin
- [ ] Jest-specific request/response mock libraries replaced with `node-mocks-http` (Rule 13)
- [ ] Redundant `import '@testing-library/jest-dom'` removed (only if covered globally)
- [ ] No remaining `jest.` occurrences: `grep -n 'jest\.' <file>`
- [ ] Tests pass: `npx vitest run <file-path>`

---

### 8 — Final sweep — residual Jest references

Once all files have been migrated, scan the entire repository for any remaining Jest traces and report them to the user. Run the following commands from the project root:

```bash
# 1. Jest API calls in source/test files (jest., @jest-environment, jest-mock, etc.)
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  -e 'jest\.' \
  -e '@jest-environment' \
  -e 'from .jest' \
  -e "from 'jest" \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude-dir=coverage \
  .

# 2. Jest packages still listed in package.json
grep -n '"jest' package.json

# 3. Jest-related config files still present at the root
find . -maxdepth 2 \( -name "jest.config.*" -o -name "jest.setup.*" -o -name "babel.config.*" \) \
  -not -path "*/node_modules/*"
```

Present the results to the user as a grouped list:

- **Remaining `jest.*` calls** — file path, line number, and the matching line (from command 1)
- **Jest packages in `package.json`** — package name and whether it is in `dependencies` or `devDependencies` (from command 2)
- **Leftover config files** — file path and a suggestion on whether it can be deleted (from command 3)

If any group is empty, say so explicitly so the user knows it was checked. Do not silently skip empty results.

---

### 9 — Go/no-go validation before declaring the migration done

**Do not consider the migration finished after a single green run.** One real migration this playbook is based on merged a fully green migration PR, and it still had to be **fully reverted** later the same day over flaky tests that only showed up under real usage. Build the following into your validation before calling it done, not after something breaks:

1. Run the full suite **at least 3 times in a row**, not once. A pool/isolation change can produce order-dependent flakiness that a single clean run won't reveal.
2. If running in CI, run it on the actual CI runner/hardware, not just locally — worker-count and timing behavior can differ significantly between a laptop and a CI container (see Section 6).
3. Confirm the Section 5 checks (timezone, automocking SDKs, module-scope isolation) explicitly, not just "the suite is green."
4. Only after all of the above, remove the old Jest config files and dependencies (Section 8) — keep them until the new setup has proven stable, so a revert is cheap if something surfaces late.

---

## Run the test suite — report only, never auto-fix

After the final sweep, run the test suite for the migrated files:

```bash
npx vitest run <file-path>
```

**IMPORTANT — read this before touching a single test failure:**

- Run the command, collect the output, and **report the results to the user**. That is all.
- Do **not** attempt to fix any failing test on your own.
- Do **not** infer that a failure is "trivial" and silently patch it.
- Do **not** start a fix-and-rerun loop.

Once you have the output, present a summary to the user:

- How many tests passed, failed, or were skipped.
- The name and file of each failing test, with the error message.

Then ask explicitly: **"Would you like me to fix the failing tests?"**

Only proceed with fixes if the user confirms. Wait for their answer.
