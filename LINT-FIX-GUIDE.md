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

**Packages fixed with this pattern:** annotation-generator

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
