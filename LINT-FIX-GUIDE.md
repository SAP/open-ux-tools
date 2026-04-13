# Lint Fix Guide

This document will be used by workers to document common linting error patterns and their fix strategies.

## Pattern 1: `sonarjs/no-implicit-dependencies` + `import/no-unresolved` for `@jest/globals` in ESM test files

**Errors:**
```
error  Either remove this import or add it as a dependency  sonarjs/no-implicit-dependencies
error  Unable to resolve path to module '@jest/globals'     import/no-unresolved
```

**Cause:** ESM packages (`"type": "module"`) use `import { jest } from '@jest/globals'` in test files for `jest.unstable_mockModule()` and other Jest ESM APIs. The `@jest/globals` package is available transitively through `jest` but not listed as an explicit dependency.

**Fix:** Add `@jest/globals` as a devDependency matching the Jest version used in the monorepo:
```json
"devDependencies": {
    "@jest/globals": "30.3.0",
    ...
}
```
Then run `pnpm install --no-frozen-lockfile`.

**Do NOT** remove the import — it is required for ESM test files that use `jest.unstable_mockModule()`.

**Packages fixed with this pattern:** btp-utils, ui5-test-writer, odata-vocabularies, nodejs-utils, project-input-validator, ui5-library-reference-sub-generator, ui5-library-sub-generator, launch-config, ui5-info

## Pattern 2: `prettier/prettier` formatting errors

**Error:**
```
error  Replace `...` with `...`  prettier/prettier
```

**Fix:** Run `pnpm --filter @sap-ux/<package> lint:fix` to auto-fix formatting issues.

**Packages fixed with this pattern:** odata-vocabularies, ui5-library-reference-sub-generator, launch-config

## Pattern 3: `Parsing error: parserOptions.project` for `.cjs` files

**Error:**
```
error  Parsing error: "parserOptions.project" has been provided for @typescript-eslint/parser.
The file was not found in any of the provided project(s): <file>.cjs
```

**Cause:** `.cjs` files (CommonJS) are not included in the TypeScript `tsconfig.json` project, but ESLint is configured with `parserOptions.project` which requires all linted files to be part of a TS project.

**Fix:** Add an ESLint ignore pattern for these `.cjs` files in the package's `eslint.config.mjs`:
```javascript
export default [
    {
        ignores: ['jest.resolver.cjs', 'test/__cjs-proxies/**']
    },
    ...base,
    // rest of config
];
```

**Packages fixed with this pattern:** annotation-generator, fiori-annotation-api

## Pattern 4: `@typescript-eslint/ban-ts-comment` for `@ts-ignore`

**Error:**
```
error  Use "@ts-expect-error" instead of "@ts-ignore", as "@ts-ignore" will do nothing if the following line is error-free  @typescript-eslint/ban-ts-comment
```

**Fix:** Replace `// @ts-ignore` with `// @ts-expect-error` keeping the existing description comment.

**Packages fixed with this pattern:** ui5-library-sub-generator

## Pattern 5: `import/no-unresolved` for incorrect ESM directory import paths

**Error:**
```
error  Unable to resolve path to module '../../src/headless.js'  import/no-unresolved
```

**Cause:** In ESM, importing a directory with `.js` extension (e.g., `../../src/headless.js`) does not auto-resolve to `index.js`. The import must explicitly reference the `index.js` file.

**Fix:** Update the import path to include `/index.js`:
```typescript
// Before (incorrect)
const { default: HeadlessGenerator } = await import('../../src/headless.js');
// After (correct)
const { default: HeadlessGenerator } = await import('../../src/headless/index.js');
```

**Packages fixed with this pattern:** deploy-config-sub-generator

## Pattern 6: `@typescript-eslint/consistent-type-imports` for `import()` type annotations

**Error:**
```
error  `import()` type annotations are forbidden  @typescript-eslint/consistent-type-imports
```

**Cause:** Code uses inline `import()` type annotations like `type X = import('module').X` or `typeof import('module').func`. The ESLint rule requires using `import type` statements instead.

**Fix:** Replace inline `import()` type annotations with proper `import type` statements at the top of the file:
```typescript
// Before (incorrect)
type SystemPanel = import('../../../../src/panel').SystemPanel;
let originalFn: typeof import('@sap-ux/project-access').getMinimumUI5Version;

// After (correct)
import type { SystemPanel } from '../../../../src/panel';
import type { getMinimumUI5Version } from '@sap-ux/project-access';
// ...
let originalFn: typeof getMinimumUI5Version;
```

Note: `import type` is erased at runtime, so it's safe to use static type imports even for modules that are dynamically imported at runtime with `await import()`.

**Packages fixed with this pattern:** fe-fpm-writer, sap-systems-ext

## Pattern 7: `Parsing error: parserOptions.project` for test files excluded by parent tsconfig

**Error:**
```
error  Parsing error: "parserOptions.project" has been provided for @typescript-eslint/parser.
The file was not found in any of the provided project(s): test/unit/*.test.ts
```

**Cause:** The package's `tsconfig.json` has `"exclude": ["test"]` but `tsconfig.eslint.json` extends it and only overrides `"include"` to add test files. In TypeScript, `exclude` from the parent is inherited even when the child overrides `include`, so the test files remain excluded from the project.

**Fix:** Override `exclude` in `tsconfig.eslint.json` to remove the `test` exclusion:
```json
{
    "extends": "./tsconfig.json",
    "include": ["src", "test"],
    "exclude": ["dist", "node_modules", "coverage"]
}
```

Also add ESLint ignores for any non-TypeScript files (e.g., `.mjs`, `.cjs`) that are outside the tsconfig project:
```javascript
export default [
    {
        ignores: ['dist', 'prebuilds', 'test/json-esm-transform.mjs'],
    },
    ...base,
];
```

**Packages fixed with this pattern:** sap-systems-ext, control-property-editor

## Pattern 8: `@typescript-eslint/no-unused-expressions` for stray mock references

**Error:**
```
error  Expected an assignment or function call and instead saw an expression  @typescript-eslint/no-unused-expressions
```

**Cause:** A standalone variable reference like `mockFn;` on its own line has no side effect. This is typically leftover from copy-paste or an incomplete mock setup.

**Fix:** Remove the stray expression if it has no purpose, or convert it to a proper call/assignment:
```typescript
// Before (incorrect - no-op expression)
mockCreateForAbap;

// After (removed - the mock is already set up elsewhere)
```

**Packages fixed with this pattern:** odata-service-inquirer

## Pattern 9: `@typescript-eslint/no-use-before-define` for mock closures

**Error:**
```
error  'variableName' was used before it was defined  @typescript-eslint/no-use-before-define
```

**Cause:** A `jest.unstable_mockModule()` callback references a variable (e.g., mock object) that is defined later in the file. While this works at runtime because the callback is only executed when the module is imported (after the variable is defined), ESLint flags it.

**Fix:** Forward-declare the variable before the mock setup with `let`, and assign its value later:
```typescript
// Before
jest.unstable_mockModule('module', () => ({
    Constructor: jest.fn().mockImplementation(() => myMock) // error: used before defined
}));
// ... later ...
const myMock = { ... };

// After
// eslint-disable-next-line prefer-const
let myMock: Record<string, any>;
jest.unstable_mockModule('module', () => ({
    Constructor: jest.fn().mockImplementation(() => myMock)
}));
// ... later ...
myMock = { ... };
```

Note: The `eslint-disable-next-line prefer-const` comment may be needed because ESLint sees only one assignment and suggests `const`, but `const` cannot be used here since the variable must be declared before its value dependencies exist.

**Packages fixed with this pattern:** odata-service-inquirer

## Pattern 10: `jest.spyOn()` not intercepting ESM named imports

**Error:**
Test returns unexpected value (e.g., `undefined` instead of expected result)

**Cause:** Test uses `jest.spyOn(module, 'functionName')` to mock a function, but the implementation imports the function using named import destructuring (`import { functionName } from 'module'`). In ESM context, `jest.spyOn()` does not intercept named imports - the implementation gets the original function, not the spy.

**Fix:** Convert to `jest.unstable_mockModule()` before importing the modules:
```typescript
// Before (CJS-style spy - doesn't work in ESM)
import fs from 'node:fs';
const { getDefaultTargetFolder } = await import('../src/helpers');

test('should work', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true);
    // Test fails - implementation gets real existsSync, not the spy
});

// After (ESM-compatible mock)
import * as actualFs from 'node:fs';

const mockExistsSync = jest.fn();
jest.unstable_mockModule('node:fs', () => ({
    ...actualFs,
    existsSync: mockExistsSync
}));

const { getDefaultTargetFolder } = await import('../src/helpers');

test('should work', () => {
    mockExistsSync.mockReturnValueOnce(true);
    // Test passes - implementation gets the mock
});
```

**Key difference:** `jest.unstable_mockModule()` must be called BEFORE the `await import()` of the module being tested, so the mock is in place when the module loads.

**Packages fixed with this pattern:** fiori-generator-shared

## Pattern 11: Application Insights telemetry initialization errors in tests

**Error:**
```
Instrumentation key not found, please provide a connection string before starting Application Insights SDK.
```

**Cause:** Integration tests that use generators with telemetry try to initialize Application Insights without a valid instrumentation key. The telemetry initialization code runs during module import, before mocks can be applied.

**Fix:** Set the `SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY` environment variable to `'true'` at the top of the test file:
```typescript
import { jest } from '@jest/globals';
// ... other imports ...

// Disable telemetry for integration tests to avoid Application Insights initialization errors
process.env.SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY = 'true';

// Rest of test setup
const actualTelemetry = await import('@sap-ux/telemetry');
// ... etc
```

**Why this works:** Setting the environment variable before any imports ensures that telemetry code checks the flag and skips TelemetryClient instantiation, which requires an instrumentation key.

**Packages fixed with this pattern:** fiori-app-sub-generator (headless integration tests)

## Pattern 12: JavaScript heap out of memory during tests

**Error:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

**Cause:** Tests consume more memory than Node.js's default heap size (~2GB on 64-bit systems). This commonly happens with:
- Large test suites with many test cases
- Tests that load large datasets or fixtures
- Memory-intensive operations (code parsing, AST traversal, etc.)
- Coverage collection with c8 or nyc

**Fix:** Increase the Node.js heap size by adding `--max-old-space-size=4096` (or higher) to `NODE_OPTIONS`:
```json
{
  "scripts": {
    "test": "cross-env NODE_OPTIONS='--experimental-vm-modules --max-old-space-size=4096' jest --ci"
  }
}
```

**Common heap sizes:**
- `--max-old-space-size=2048` - 2GB (sufficient for most packages)
- `--max-old-space-size=4096` - 4GB (for large test suites)
- `--max-old-space-size=8192` - 8GB (for very large test suites, requires sufficient system RAM)

**Note:** Choose the smallest heap size that allows tests to pass. Excessive heap sizes can slow down garbage collection.

**Packages fixed with this pattern:** eslint-plugin-fiori-tools

