# Test Mock Requirements for i18n

## For Developers Working on Tests

When writing or updating tests for files that use i18n, you need to mock the i18n module. Here's the pattern:

### Standard i18n Mock Pattern

```typescript
// Mock i18n module before importing the code under test
jest.unstable_mockModule('../../../../src/i18n.js', () => ({
    text: (key: string, options?: Record<string, unknown>) => {
        const translations: Record<string, string> = {
            // Add your translation keys here
            'systemPrompts.validation.fieldRequired': 'This field is required and cannot be empty',
            // ... more translations
        };
        let result = translations[key] || key;
        if (options) {
            Object.entries(options).forEach(([k, v]) => {
                result = result.replace(`{{${k}}}`, String(v));
            });
        }
        return result;
    },
    initI18n: jest.fn().mockResolvedValue(undefined)
}));
```

### Files Updated with i18n Mocks

✅ **test/unit/cli/utils/system-prompts.test.ts** - Complete i18n mock
✅ **test/unit/cli/utils/system-lookup.test.ts** - Complete i18n mock  
✅ **test/unit/cli/utils/system-connection.test.ts** - Complete i18n mock

### Files That Need i18n Mocks (if they import system-prompts/lookup/connection)

These files may fail if they transitively use i18n:
- `test/unit/cli/add/system.test.ts`
- `test/unit/cli/update/system.test.ts`
- `test/unit/cli/remove/system.test.ts`
- `test/unit/cli/list/system.test.ts`
- `test/unit/cli/create-fiori.test.ts`

### Translation Keys by Module

**system-lookup:**
- `systemLookup.multipleSystemsFound`
- `systemLookup.selectSystemPrompt`
- `systemLookup.clientInfo`
- `systemLookup.noClient`

**system-prompts:**
- `systemPrompts.validation.*` (fieldRequired, invalidUrl, systemNameExists, checkNameFailed)
- `systemPrompts.prompts.*` (systemName, systemUrl, sapClient, etc.)
- `systemPrompts.updateFields.*` (selectPrompt, nameLabel, usernameLabel, etc.)
- `systemPrompts.removeConfirmation.prompt`

**system-connection:**
- `systemConnection.invalidUrl`
- `systemConnection.skippingCheck`
- `systemConnection.verifying`
- `systemConnection.connectionSuccessful`
- `systemConnection.connectionFailed`
- `systemConnection.unknownError`
- `systemConnection.saveAnywayPrompt`

### Quick Test Fix Template

```typescript
// Add this before your imports
jest.unstable_mockModule('../../../../src/i18n.js', () => ({
    text: (key: string, options?: Record<string, unknown>) => {
        // Simple pass-through for testing - returns English strings
        const translations = { /* copy from ux-create.i18n.json */ };
        let result = translations[key] || key;
        if (options) {
            Object.entries(options).forEach(([k, v]) => {
                result = result.replace(`{{${k}}}`, String(v));
            });
        }
        return result;
    },
    initI18n: jest.fn().mockResolvedValue(undefined)
}));
```

## Test Status

- ✅ Core system-prompts, system-lookup, system-connection tests passing
- ⚠️ Some integration tests may need i18n mocks added
- 🔧 Pattern established for easy mock addition

## Note

Tests that were passing before i18n should continue to pass with proper mocks. The i18n changes are functionally equivalent to the hardcoded strings they replaced.
