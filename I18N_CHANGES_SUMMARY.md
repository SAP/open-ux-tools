# i18n Localization Changes for @sap-ux/create

## Overview

This document summarizes the i18n localization changes added to the `@sap-ux/create` package to support internationalization of all user-facing strings in the CLI.

## Changes Made

### 1. Created i18n Infrastructure

#### New Files Created:

**`src/i18n.ts`** - i18n module
- Imports and initializes i18next
- Exports `initI18n()` function to initialize the i18n system
- Exports `text(key, options)` function for translating strings
- Follows the same pattern as `@sap-ux/store` package

**`src/translations/ux-create.i18n.json`** - Translation strings
```json
{
    "systemLookup": {...},
    "systemPrompts": {
        "validation": {...},
        "prompts": {...},
        "updateFields": {...},
        "removeConfirmation": {...}
    },
    "systemConnection": {...}
}
```

### 2. Updated Source Files

#### `src/cli/utils/system-lookup.ts`
**Changes:**
- Added import: `import { text } from '../../i18n.js';`
- Replaced hardcoded strings with i18n calls:
  - `"Multiple systems found with this URL:"` → `text('systemLookup.multipleSystemsFound')`
  - `"Which system do you want to use?"` → `text('systemLookup.selectSystemPrompt')`
  - `"(client: ${client})"` → `text('systemLookup.clientInfo', { client })`
  - `"(no client)"` → `text('systemLookup.noClient')`

**Bot Review Fix:**
- Line 43: Already fixed - uses `backendSystemFilter: { connectionType: undefined as any }` to bypass the default 'abap_catalog' filter and search across all connection types

#### `src/cli/utils/system-prompts.ts`
**Changes:**
- Added import: `import { text } from '../../i18n.js';`
- Replaced all validation error messages:
  - `"This field is required and cannot be empty"` → `text('systemPrompts.validation.fieldRequired')`
  - `"Please enter a valid URL..."` → `text('systemPrompts.validation.invalidUrl')`
  - `"A system with the name '${value}' already exists..."` → `text('systemPrompts.validation.systemNameExists', { name: value })`
  - `"Unable to check system name uniqueness..."` → `text('systemPrompts.validation.checkNameFailed')`

- Replaced all prompt messages:
  - `"System name (display name):"` → `text('systemPrompts.prompts.systemName')`
  - `"System URL:"` → `text('systemPrompts.prompts.systemUrl')`
  - `"SAP client..."` → `text('systemPrompts.prompts.sapClient')`
  - `"System type:"` → `text('systemPrompts.prompts.systemType')`
  - `"Authentication type:"` → `text('systemPrompts.prompts.authenticationType')`
  - `"Connection type:"` → `text('systemPrompts.prompts.connectionType')`
  - `"Username..."` → `text('systemPrompts.prompts.username')`
  - `"Password..."` → `text('systemPrompts.prompts.password')`

- Replaced update field prompts:
  - `"Select fields to update:"` → `text('systemPrompts.updateFields.selectPrompt')`
  - `"Name (current: ${name})"` → `text('systemPrompts.updateFields.nameLabel', { name })`
  - `"Username (current: ${username})"` → `text('systemPrompts.updateFields.usernameLabel', { username })`
  - `"(none)"` → `text('systemPrompts.updateFields.usernameNone')`
  - `"Password"` → `text('systemPrompts.updateFields.passwordLabel')`
  - `"At least one field must be selected"` → `text('systemPrompts.updateFields.minOneRequired')`
  - `"New system name:"` → `text('systemPrompts.updateFields.newNamePrompt')`
  - `"New username:"` → `text('systemPrompts.updateFields.newUsernamePrompt')`
  - `"New password:"` → `text('systemPrompts.updateFields.newPasswordPrompt')`

- Replaced remove confirmation:
  - `"Are you sure you want to remove system '${systemName}'?"` → `text('systemPrompts.removeConfirmation.prompt', { systemName })`

#### `src/cli/utils/system-connection.ts`
**Changes:**
- Added import: `import { text } from '../../i18n.js';`
- Replaced all connection-related messages:
  - `"Invalid URL: ${url}"` → `text('systemConnection.invalidUrl', { url })`
  - `"Skipping connection check..."` → `text('systemConnection.skippingCheck')`
  - `"Verifying connection to backend system..."` → `text('systemConnection.verifying')`
  - `"✓ Connection successful"` → `text('systemConnection.connectionSuccessful')`
  - `"Connection check failed: ${error}"` → `text('systemConnection.connectionFailed', { error })`
  - `"Unknown error"` → `text('systemConnection.unknownError')`
  - `"Connection check failed. Save system anyway?"` → `text('systemConnection.saveAnywayPrompt')`

#### `src/cli/index.ts`
**Changes:**
- Added import: `import { initI18n } from '../i18n.js';`
- Changed `handleCreateFioriCommand()` from `void` to `async Promise<void>`
- Added `await initI18n();` before parsing commands to ensure translations are loaded before any CLI command executes

#### `src/index.ts`
**Changes:**
- Changed from `handleCreateFioriCommand(process.argv);` to `await handleCreateFioriCommand(process.argv);`
- Uses top-level await since Node.js 22+ and ES2023 support it

### 3. Configuration Updates

#### `package.json`
**Changes:**
- Added dependency: `"i18next": "26.3.6"` (same version used in other packages like `@sap-ux/store`)

#### `tsconfig.json`
**Changes:**
- Added `"src/translations/*.json"` to the `include` array
- Added `"resolveJsonModule": true` to `compilerOptions` to allow importing JSON files with `with { type: 'json' }` syntax

## Translation File Structure

The translation file follows a hierarchical structure organized by feature area:

```
ux-create.i18n.json
├── systemLookup (smart URL lookup prompts)
├── systemPrompts
│   ├── validation (field validation messages)
│   ├── prompts (interactive prompt messages)
│   ├── updateFields (system update prompts)
│   └── removeConfirmation (system removal prompt)
└── systemConnection (connection check messages)
```

## Bot Review Issues Addressed

### 1. ✅ **getAll({}) connection type filter issue (Line 43 in system-lookup.ts)**
**Issue:** `getAll({})` only returns systems with `abap_catalog` connection type by default.

**Resolution:** Already fixed in the current code. Uses `backendSystemFilter: { connectionType: undefined as any }` to explicitly bypass the default filter and search across all connection types.

### 2. ✅ **keyConstructor parameter coupling**
**Issue:** The `keyConstructor` parameter was unnecessary coupling since `BackendSystemKey` is already imported.

**Resolution:** Already removed in current code. The function directly uses `BackendSystemKeyClass` imported from `@sap-ux/store`.

### 3. ✅ **BackendSystemKey.from export availability**
**Issue:** Bot raised concern about whether `BackendSystemKey.from` is part of the public API.

**Resolution:** Verified in `/Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/store/src/index.ts` line 40:
```typescript
export * from './entities/backend-system.js';
```
This exports everything from `backend-system.ts` including the `static from()` method found at:
`/Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/store/src/entities/backend-system.ts`

The method is part of the public API and safe to use.

### 4. ℹ️ **Cancellation check uses === undefined**
**Issue:** Bot mentioned that `answer.index === undefined` is correct but asked for documentation.

**Context:** When using `prompts`, cancelled interactions return an object where the named property is `undefined`. The check `answer.index === undefined` correctly distinguishes between:
- User selected first item: `answer.index === 0` (falsy but not undefined)
- User cancelled: `answer.index === undefined`

This is the correct pattern for the `prompts` library being used.

## Pattern Followed

The i18n implementation follows the established pattern from `@sap-ux/store`:

1. **Single i18n instance** created with `i18next.createInstance()`
2. **Namespace-based organization** using `'ux-create'` as the namespace
3. **Async initialization** with `initI18n()` called at CLI startup
4. **Simple text() function** for retrieving translations with interpolation support
5. **JSON file organization** in `src/translations/` directory
6. **Import with type assertion** using `with { type: 'json' }` syntax

## Testing Recommendations

1. **Build verification:** ✅ Completed - `pnpm build` succeeds
2. **Manual CLI testing:** Test all interactive prompts:
   - `npx @sap-ux/create add system` (tests select prompts and validation)
   - `npx @sap-ux/create update system --url <url>` (tests checkbox multiselect)
   - `npx @sap-ux/create remove system --url <url>` (tests confirm prompt)
3. **Cross-terminal testing:** Verify prompts work correctly in:
   - iTerm2, Terminal.app, VS Code integrated terminal
   - Windows Terminal, PowerShell, Command Prompt
4. **Unit test updates:** Ensure existing tests that mock prompts are updated if needed

## Benefits

1. **Maintainability:** All user-facing strings centralized in one JSON file
2. **Consistency:** Follows the same pattern as other packages in the monorepo
3. **Future-ready:** Easy to add additional language translations (e.g., `de.json`, `fr.json`)
4. **Professional:** Standard i18next library used industry-wide
5. **Type-safe:** TypeScript validates interpolation parameters

## Files Changed Summary

- **Created (2 files):**
  - `src/i18n.ts`
  - `src/translations/ux-create.i18n.json`

- **Modified (6 files):**
  - `src/cli/utils/system-lookup.ts`
  - `src/cli/utils/system-prompts.ts`
  - `src/cli/utils/system-connection.ts`
  - `src/cli/index.ts`
  - `src/index.ts`
  - `package.json`
  - `tsconfig.json`

## Next Steps

1. Run full test suite: `pnpm test`
2. Update any test mocks that reference hardcoded strings
3. Manual testing across different terminals and platforms
4. Consider adding additional language translations if needed
5. Document the i18n structure for future contributors
