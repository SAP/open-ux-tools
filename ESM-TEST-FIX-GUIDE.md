# ESM Test Migration Guide

This guide documents patterns for migrating tests to ESM (ECMAScript Modules) compatibility in the SAP UX Tools monorepo.

## Table of Contents

- [Overview](#overview)
- [Core Patterns](#core-patterns)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Migration Checklist](#migration-checklist)

## Overview

The monorepo is migrating from CommonJS to ESM. Tests must be updated to use ESM-compatible patterns, especially for mocking and module imports.

**Key Configuration:**
- Base config: `jest.base.mjs` (ESM format)
- Setup file: `jest.setup.mjs`
- Package configs: `jest.config.mjs` (per package)

## Core Patterns

### 1. Import Jest from @jest/globals

**Before (CommonJS):**
```typescript
import { jest } from '@jest/globals';
```

**After (ESM):**
```typescript
import { jest } from '@jest/globals';
```

This pattern is actually already correct - always import jest from `@jest/globals`.

### 2. Mocking with jest.unstable_mockModule

**Critical:** In ESM, you MUST use `jest.unstable_mockModule()` BEFORE importing the modules that depend on the mocks.

**Pattern:**
```typescript
import { jest } from '@jest/globals';

// Step 1: Define mock functions
const mockIsAppStudio = jest.fn();
const mockListDestinations = jest.fn();

// Step 2: Use jest.unstable_mockModule() to mock the module
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: mockIsAppStudio,
    listDestinations: mockListDestinations,
    // Mock ALL exports, including types/enums as empty objects
    AbapEnvType: {},
    DestinationType: {},
    Authentication: {},
    // ... other exports
}));

// Step 3: Import the modules that use the mocked dependencies (AFTER mocking)
const { getProviderConfig } = await import('../../../src/abap/config');
const { SystemLookup } = await import('../../../src/source/systems');

// Step 4: Use in tests
describe('My tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockIsAppStudio.mockReturnValue(true);
    });
    
    it('should work', async () => {
        // test code
    });
});
```

**Key Points:**
- Use `jest.unstable_mockModule()` (NOT `jest.mock()`)
- Mock definition MUST come BEFORE any imports that use it
- Use `await import()` for dynamic imports AFTER mocking
- Mock ALL exports from the module (including types, enums, constants)
- Use empty objects `{}` for type/enum exports

### 3. Spying on Methods

**Before (CommonJS):**
```typescript
jest.spyOn(SystemLookup.prototype, 'getSystemByName').mockResolvedValue(value);
```

**After (ESM):**
```typescript
// Same pattern works, but must be done after import
const { SystemLookup } = await import('../../../src/source/systems');

let getSystemByNameSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
    getSystemByNameSpy = jest.spyOn(SystemLookup.prototype, 'getSystemByName');
});
```

### 4. Type Imports

**Pattern:**
```typescript
// Type-only imports can be at the top
import type { ToolsLogger } from '@sap-ux/logger';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

// Or inline type imports
type RequestOptions = import('../../../src/abap/config').RequestOptions;
```

### 5. Jest Config Migration

**Old:** `jest.config.js`
```javascript
module.exports = {
    ...require('../../jest.base'),
    displayName: 'package-name'
};
```

**New:** `jest.config.mjs`
```javascript
import baseConfig from '../../jest.base.mjs';

export default {
    ...baseConfig,
    displayName: 'package-name'
};
```

## Common Issues and Solutions

### Issue 1: "ReferenceError: exports is not defined"

**Cause:** Using CommonJS-style `jest.mock()` or importing before mocking in ESM.

**Solution:** 
1. Use `jest.unstable_mockModule()` instead of `jest.mock()`
2. Ensure mocks are defined BEFORE imports
3. Use `await import()` for modules that need mocking

**Example Fix:**
```typescript
// ❌ WRONG - will cause "exports is not defined"
import { myFunction } from '../../../src/myModule';
jest.mock('../../../src/dependency'); // Too late!

// ✅ CORRECT
import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/dependency', () => ({
    someDependency: jest.fn()
}));

const { myFunction } = await import('../../../src/myModule');
```

### Issue 2: Missing Mock Exports

**Cause:** Not mocking all exports from a module.

**Solution:** Include ALL exports in the mock, even if just as empty objects.

**Example:**
```typescript
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    // Functions
    isAppStudio: jest.fn(),
    listDestinations: jest.fn(),
    
    // Constants
    BAS_DEST_INSTANCE_CRED_HEADER: 'bas-destination-instance-cred',
    
    // Enums/Types (as empty objects)
    AbapEnvType: {},
    DestinationType: {},
    Authentication: {},
    Suffix: {},
    ProxyType: {}
}));
```

### Issue 3: Hoisting Issues

**Cause:** In ESM, jest.mock() hoisting doesn't work the same way as CommonJS.

**Solution:** Always follow the order:
1. Import jest from @jest/globals
2. Define mock functions with jest.fn()
3. Call jest.unstable_mockModule() with those functions
4. Import the modules under test with await import()
5. Write tests

### Issue 4: Circular Dependencies

**Cause:** Module A imports B which imports A.

**Solution:** 
- Refactor to remove circular dependencies
- Use dynamic imports `await import()` where needed
- Consider dependency injection patterns

## Migration Checklist

When migrating a test file to ESM:

- [ ] Convert jest.config.js → jest.config.mjs (if it exists)
- [ ] Import jest from '@jest/globals' at the top
- [ ] Replace all `jest.mock()` with `jest.unstable_mockModule()`
- [ ] Move all mocks BEFORE the imports they affect
- [ ] Change imports to `await import()` for mocked modules
- [ ] Mock ALL exports from mocked modules (including types/enums as {})
- [ ] Add `jest.clearAllMocks()` in beforeEach() if using mock functions
- [ ] Run the test to verify it passes: `pnpm --filter @sap-ux/package-name test`
- [ ] Verify no "exports is not defined" errors
- [ ] Verify no "Cannot find module" errors
- [ ] Verify coverage is maintained (>80%)

## Testing the Migration

After migrating a test file:

```bash
# Test specific package
pnpm --filter @sap-ux/package-name test

# Test with verbose output
pnpm --filter @sap-ux/package-name test -- --verbose

# Test specific file
pnpm --filter @sap-ux/package-name test -- path/to/test.test.ts
```

## Real-World Examples

### Example 1: Simple Mock Migration

**Before:**
```typescript
jest.mock('@sap-ux/logger');
import { createLogger } from '@sap-ux/logger';
import { myFunction } from '../src/myModule';
```

**After:**
```typescript
import { jest } from '@jest/globals';

jest.unstable_mockModule('@sap-ux/logger', () => ({
    createLogger: jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })),
    NullTransport: class {},
    ToolsLogger: class {}
}));

const { myFunction } = await import('../src/myModule');
```

### Example 2: Complex Mock with Multiple Dependencies

See `packages/adp-tooling/test/unit/abap/provider.test.ts` for a complete example with:
- Multiple module mocks
- Mock functions
- Type imports
- Spy setup
- Test structure

## Additional Resources

- Jest ESM Support: https://jestjs.io/docs/ecmascript-modules
- jest.unstable_mockModule docs: https://jestjs.io/docs/es6-class-mocks
- Base config: `/jest.base.mjs`
- Setup file: `/jest.setup.mjs`

## Pattern Summary

```typescript
// Template for ESM test migration

import { jest } from '@jest/globals';
import type { TypeImports } from 'some-package'; // types at top

// 1. Mock functions
const mockFn1 = jest.fn();
const mockFn2 = jest.fn();

// 2. Mock modules
jest.unstable_mockModule('dependency-1', () => ({
    export1: mockFn1,
    export2: mockFn2,
    TypeExport: {},
    EnumExport: {}
}));

jest.unstable_mockModule('dependency-2', () => ({
    someUtil: jest.fn()
}));

// 3. Import modules under test
const { functionUnderTest } = await import('../../../src/myModule');
const { ClassUnderTest } = await import('../../../src/myClass');

// 4. Tests
describe('My Feature', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    
    it('should do something', async () => {
        // arrange
        mockFn1.mockReturnValue('value');
        
        // act
        const result = await functionUnderTest();
        
        // assert
        expect(result).toBe('expected');
        expect(mockFn1).toHaveBeenCalled();
    });
});
```

---

**Last Updated:** 2026-04-09
**Status:** Living document - update with new patterns as discovered
