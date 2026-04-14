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

## Pattern 13: `require` is not defined in ES module scope

**Error:**
```
ReferenceError: require is not defined in ES module scope, you can use import instead
```

**Cause:** Code uses `require()` or `require.resolve()` in a file that's treated as an ES module (either has `.mjs` extension, or package.json has `"type": "module"`). CommonJS `require` is not available in ESM scope.

**Fix:** Replace `require.resolve()` with ESM-compatible path resolution:

```typescript
// Before (CommonJS style - doesn't work in ESM)
const config = {
    globalSetup: require.resolve('./test/utils/setup')
};

// After (ESM compatible)
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
    globalSetup: join(__dirname, './test/utils/setup')
};
```

**Alternative for runtime require:** If you need `require()` functionality in ESM for dynamic imports of CommonJS modules, use `createRequire`:

```typescript
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Now you can use require() for CommonJS modules
const modulePath = require.resolve('some-package');
```

**Use case distinction:**
- **Static file paths** (like config files): Use `join(__dirname, ...)` with `import.meta.url`
- **Resolving package locations** (like node_modules): Use `createRequire(import.meta.url)`

**Packages fixed with this pattern:** preview-middleware (playwright.config.ts)

## Pattern 14: JSON import requires type attribute in ESM

**Error:**
```
TypeError [ERR_IMPORT_ATTRIBUTE_MISSING]: Module "file://.../package.json" needs an import attribute of "type: json"
```

**Cause:** Node.js ESM requires explicit type declaration when importing JSON files. Without the `with { type: 'json' }` attribute, Node.js doesn't know how to handle the .json file import.

**Fix:** Add the `with { type: 'json' }` import attribute:

```typescript
// Before (missing import attribute)
import packageJson from './package.json';
import translations from './translations/i18n.json';

// After (with import attribute)
import packageJson from './package.json' with { type: 'json' };
import translations from './translations/i18n.json' with { type: 'json' };
```

**Note:** This syntax is part of the ES Module Import Attributes proposal and is required in Node.js for JSON imports when using ES modules.

**Alternative:** If you need dynamic JSON imports or want to avoid the import attribute, use `readFileSync` and `JSON.parse`:

```typescript
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
    readFileSync(join(__dirname, 'package.json'), 'utf-8')
);
```

**Packages fixed with this pattern:** abap-deploy-config-inquirer, abap-deploy-config-sub-generator, adp-flp-config-sub-generator, adp-tooling, app-config-writer, backend-proxy-middleware, cap-config-writer, cf-deploy-config-inquirer, cf-deploy-config-sub-generator, cf-deploy-config-writer, control-property-editor, deploy-config-generator-shared, deploy-config-sub-generator, environment-check, fiori-app-sub-generator, fiori-elements-writer, fiori-freestyle-writer, fiori-generator-shared, fiori-mcp-server, flp-config-inquirer, flp-config-sub-generator, generator-adp, generator-odata-downloader, inquirer-common, launch-config, mockserver-config-writer, odata-service-inquirer, odata-service-writer, preview-middleware, project-input-validator, repo-app-import-sub-generator, sap-systems-ext, sap-systems-ext-webapp, store, telemetry, ui-service-inquirer, ui-service-sub-generator, ui5-application-inquirer, ui5-application-writer, ui5-library-inquirer, ui5-library-reference-inquirer, ui5-library-reference-sub-generator, ui5-library-sub-generator, ui5-library-writer, ui5-proxy-middleware, ui5-test-writer

**Troubleshooting:** 

1. **CI build cache issue:** If CI reports "Cannot find module '.../dist/types'" but the local build is correct (with `.js` extensions in dist files), the issue is likely a stale build cache on CI. Ensure the package was rebuilt after ESM migration changes by running `pnpm --filter @sap-ux/<package> build` and committing any updated dist files.

2. **TypeScript compilation error:** If you get `TS2823: Import attributes are only supported when the '--module' option is set to 'esnext'...`, update the package's `tsconfig.json` to change `"module": "ES2022"` to `"module": "ESNext"`. Import attributes require module set to one of: 'esnext', 'node18', 'node20', 'nodenext', or 'preserve'.

## Pattern 15: Jest setupFiles with TypeScript fails on Windows ESM

**Error:**
```
SyntaxError: Cannot use import statement outside a module

  D:\a\open-ux-tools\packages\package-name\test\global-setup.ts:1
  import { Something } from '../src/module';
  ^^^^^^
```

**Cause:** On Windows, Jest's `setupFiles` in ESM mode may not properly apply the ts-jest transform to TypeScript setup files, resulting in the raw TypeScript being executed as JavaScript.

**Fix:** Convert the setup file from `.ts` to `.mjs` and import from the compiled output instead of source:

```javascript
// Before: test/global-setup.ts
import { DiagnosticCache } from '../src/language/diagnostic-cache';
import { ProjectContext } from '../src/project-context/project-context';

ProjectContext.forceReindexOnFirstUpdate = true;
DiagnosticCache.forceReindexOnFirstUpdate = true;

// After: test/global-setup.mjs
import { DiagnosticCache } from '../lib/language/diagnostic-cache.js';
import { ProjectContext } from '../lib/project-context/project-context.js';

ProjectContext.forceReindexOnFirstUpdate = true;
DiagnosticCache.forceReindexOnFirstUpdate = true;
```

Update `jest.config.mjs`:
```javascript
export default {
    // Before
    setupFiles: ['<rootDir>/test/global-setup.ts'],
    // After
    setupFiles: ['<rootDir>/test/global-setup.mjs'],
}
```

**Note:** This requires the package to be built (`pnpm build`) before running tests, as the .mjs file imports from the compiled `lib/` or `dist/` directory.

**Packages fixed with this pattern:** eslint-plugin-fiori-tools

## Pattern 16: Windows path separators in test snapshots/JSON output

**Error:**
```
expect(jest.fn()).toHaveBeenCalledWith(...expected)

- Expected
+ Received

  "filePath": "../db/schema.cds",
- "filePath": "..\\db\\schema.cds",
```

**Cause:** On Windows, path functions like `path.relative()` return paths with backslashes (`\`), while Unix systems use forward slashes (`/`). When these paths are serialized to JSON or used in test assertions, the tests fail on Windows due to path separator mismatch.

**Fix:** Normalize all paths to use forward slashes when writing to files or comparing in tests:

```typescript
// Before (platform-specific separators)
const relativePath = relative(baseDir, filePath);
await writeFile(outputPath, JSON.stringify({ filePath: relativePath }));

// After (normalized to forward slashes)
const relativePath = relative(baseDir, filePath).replace(/\\/g, '/');
await writeFile(outputPath, JSON.stringify({ filePath: relativePath }));
```

**When to normalize:**
- When writing paths to JSON files
- When creating test snapshots
- When comparing paths in assertions
- When paths will be stored/transmitted cross-platform

**When NOT to normalize:**
- Internal path operations (join, resolve, etc. handle separators correctly)
- When passing paths to Node.js APIs (they accept both separators)
- When the path will only be used on the current platform

**Best practice:** Always use forward slashes in stored data (JSON, config files, etc.) as they work on all platforms. Use `path.join()` and `path.resolve()` for runtime path operations, which handle platform differences automatically.

**Packages fixed with this pattern:** project-integrity

