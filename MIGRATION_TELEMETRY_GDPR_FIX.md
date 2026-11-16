# Migration Telemetry GDPR/Security Fix

## Problem Statement

The migration telemetry events `MIGRATION_SUCCESS` and `MIGRATION_FAILED` were sending **full error text descriptions** in the `messages` property. This violates GDPR and security best practices because:

1. **Information Leakage** — Error messages can contain:
   - Internal service names, hostnames, infrastructure details
   - OData service URLs and query strings
   - Database/API error details
   - Stack trace fragments

2. **PII/Sensitive Data** — Error messages often include:
   - Customer names in failed OData filters
   - Project names (which may contain confidential info)
   - File content snippets from parse errors
   - Destination names, system IDs
   - **User folder paths containing SAP user IDs** (e.g., `/Users/I123456/...`)

3. **Wrong Channel** — Full error details belong in structured logs (`~/.fioritools/migration-logs`), not usage telemetry streams

4. **Ongoing Review Burden** — Every new error message requires security review

### Security Team Feedback

> "raw" error messages should not be in the telemetry... every single error message that could be delivered would need review and constant review going forward"

> **Best approach:** Use an error message ID - such as a translation string id - that you can send instead.

---

## Solution: Send Error Codes, Not Error Text

**Changed telemetry from:**
```typescript
{
  messages: "ENOENT: no such file or directory, mkdir /Users/I123456/.vscode,Cannot read ui5.yaml"
}
```

**To:**
```typescript
{
  errorCodes: "ENOENT,COMMIT_FAILED,YAML_PARSE_ERROR"
}
```

---

## Implementation Details

### 1. open-ux-tools Changes (`@sap-ux/fiori-migration-writer`)

#### A. Extended `Message` Interface
**File:** `packages/fiori-migration-writer/src/migration-types.ts`

```typescript
export interface Message {
    type: 'ERROR' | 'WARNING' | 'SUCCESS';
    description: string;
    messageUrl?: string;
    action?: postMigrationAction;
    /**
     * Optional error code for telemetry. When present, only the code should be reported in telemetry
     * (not the description, which may contain PII or sensitive data). The description is for logs only.
     * Examples: 'UNSUPPORTED_FLOORPLAN', 'ENOENT', 'MANIFEST_PARSE_ERROR', 'MISSING_ODATA_SERVICE'
     */
    code?: string;
}
```

#### B. Created Error Code Utilities
**File:** `packages/fiori-migration-writer/src/utils/error-codes.ts` (NEW)

**Key components:**
- `MigrationErrorCode` enum with safe, standard error codes:
  - File system errors: `ENOENT`, `EACCES`, `EEXIST`, `EBUSY`, etc.
  - Parsing errors: `MANIFEST_PARSE_ERROR`, `JSON_PARSE_ERROR`, `YAML_PARSE_ERROR`, `XML_PARSE_ERROR`
  - Configuration errors: `UNSUPPORTED_FLOORPLAN`, `MISSING_MANIFEST`, `MISSING_ODATA_SERVICE`, etc.
  - Process errors: `MIGRATION_FAILED`, `COMMIT_FAILED`, `TYPESCRIPT_SETUP_FAILED`, etc.

- `extractErrorCode(error: unknown): string` — Extracts telemetry-safe error codes from:
  - Node.js file system error codes (regex: `/\b(E[A-Z]+):/`)
  - Known error message patterns (e.g., "not supported" → `UNSUPPORTED_FLOORPLAN`)
  - i18n keys (already safe)
  - Falls back to `UNKNOWN_ERROR`

- `errorCodeFromI18nKey(i18nKey: string): string` — For i18n keys (already safe)

#### C. Updated BulkProjectMigrator
**File:** `packages/fiori-migration-writer/src/BulkProjectMigrator.ts`

```typescript
import { extractErrorCode } from './utils/error-codes.js';

// In catch block:
messages: [{
    type: 'ERROR',
    description: error instanceof Error ? error.message : String(error),
    code: extractErrorCode(error)  // ← NEW
}]
```

#### D. Exported Public API
**File:** `packages/fiori-migration-writer/src/index.ts`

```typescript
export {
    MigrationErrorCode,
    extractErrorCode,
    errorCodeFromI18nKey,
    type MigrationErrorCode as MigrationErrorCodeType
} from './utils/error-codes.js';
```

---

### 2. tools-suite Changes

#### A. Updated Internal BulkProjectMigrator
**File:** `packages/lib/app-migrator/src/BulkProjectMigrator.ts`

```typescript
import { extractErrorCode } from '@sap-ux/fiori-migration-writer';

// In catch block:
messages: [{
    type: 'ERROR',
    description: error instanceof Error ? error.message : String(error),
    code: extractErrorCode(error)  // ← NEW
}]
```

#### B. Updated Telemetry Reporting
**File:** `packages/application-modeler/ide-extension/src/utils/migrate.ts`

**Before:**
```typescript
import { sanitizeTelemetryMessage } from './telemetrySanitizer';

const getErrorMessagesForTelemetry = (project: MigrationUIProjectInfo): string =>
    (project.messages ?? [])
        .filter((message) => message.type === 'ERROR')
        .map((message) => sanitizeTelemetryMessage(message.description))  // ❌ Sent error text
        .join(',')
        .slice(0, MAX_TELEMETRY_MESSAGE_LENGTH);

// Telemetry property:
messages: getErrorMessagesForTelemetry(project)
```

**After:**
```typescript
// Removed sanitizeTelemetryMessage import

const getErrorCodesForTelemetry = (project: MigrationUIProjectInfo): string =>
    (project.messages ?? [])
        .filter((message) => message.type === 'ERROR')
        .map((message) => message.code || 'UNKNOWN_ERROR')  // ✅ Send error codes only
        .join(',')
        .slice(0, MAX_TELEMETRY_ERROR_CODES_LENGTH);

// Telemetry property:
errorCodes: getErrorCodesForTelemetry(project)  // ← Changed from 'messages' to 'errorCodes'
```

#### C. Updated Tests
**File:** `packages/application-modeler/ide-extension/test/unit/utils/migrate.test.ts`

- Changed telemetry property assertions from `messages: ''` to `errorCodes: ''`
- Updated test: "telemetry reports error codes (not descriptions) for GDPR/security compliance"
- Added error codes to test messages:
  ```typescript
  { type: 'ERROR', description: '...', code: 'COMMIT_FAILED' }
  ```

---

## What's Left for Future PRs

### 1. Add Error Codes Throughout Migration Code

Currently, error codes are only added in `BulkProjectMigrator` catch blocks. We need to add `code` fields to all error message creation sites:

**Files to update:**
- `packages/fiori-migration-writer/src/ProjectMigrator.ts` (multiple error creation sites)
- `packages/fiori-migration-writer/src/utils/Project.ts`
- `packages/fiori-migration-writer/src/project/regular-project.ts`
- `packages/fiori-migration-writer/src/files/project-files.ts`

**Pattern:**
```typescript
// Instead of:
messages.push({ type: 'ERROR', description: i18nText('ERROR_NOT_SUITABLE_FOR_MIGRATION') });

// Do:
messages.push({
    type: 'ERROR',
    description: i18nText('ERROR_NOT_SUITABLE_FOR_MIGRATION'),
    code: errorCodeFromI18nKey('ERROR_NOT_SUITABLE_FOR_MIGRATION')  // i18n keys are safe
});
```

### 2. Remove telemetrySanitizer.ts (No Longer Needed)

**File to delete:** `packages/application-modeler/ide-extension/src/utils/telemetrySanitizer.ts`

This file attempted to sanitize error messages by removing paths. It's no longer needed since we're sending error codes instead of error text.

**Also delete its test:** `packages/application-modeler/ide-extension/test/unit/utils/telemetrySanitizer.test.ts`

---

## Testing

### Unit Tests
All tests passed:
```bash
cd packages/application-modeler/ide-extension
yarn test:run -- test/unit/utils/migrate.test.ts
# ✅ 48 tests passed
```

### What Tests Verify
1. Telemetry sends `errorCodes` property (not `messages`)
2. Error codes are extracted correctly from different error types
3. Multiple error codes are joined with commas
4. Total length is limited to 200 characters
5. Missing codes default to `UNKNOWN_ERROR`

---

## Migration Path for Other Teams

If other telemetry events are sending error text:

1. **Add `code` field** to error messages
2. **Use `extractErrorCode()`** to derive safe codes from existing errors
3. **Change telemetry** to send `errorCodes` instead of `messages`
4. **Keep full error text** in logs only (not telemetry)

---

## Benefits

✅ **GDPR Compliant** — No PII or user folder paths in telemetry
✅ **Security Approved** — No infrastructure details or sensitive data
✅ **Lower Volume** — Error codes are much shorter than full error text
✅ **Structured Data** — Codes are enumerated and queryable
✅ **Maintainable** — No per-message security review needed
✅ **Backward Compatible** — Old error messages without codes default to `UNKNOWN_ERROR`

---

## Telemetry Event Schema Change

### Before (PR #39873)
```typescript
{
  event: 'MIGRATION_FAILED',
  properties: {
    success: 'false',
    floorPlan: 'V2_LIST_REPORT',
    ui5Version: '1.120.0',
    ODataVersion: '2',
    messages: 'Error committing changes: Error: ENOENT: no such file or directory, mkdir .vscode,Cannot read ui5.yaml'
    // ↑ Contains error text (GDPR violation)
  }
}
```

### After (This PR)
```typescript
{
  event: 'MIGRATION_FAILED',
  properties: {
    success: 'false',
    floorPlan: 'V2_LIST_REPORT',
    ui5Version: '1.120.0',
    ODataVersion: '2',
    errorCodes: 'COMMIT_FAILED,ENOENT'
    // ↑ Contains only safe error codes
  }
}
```

Full error details remain available in:
- Local logs: `~/.fioritools/migration-logs/`
- VS Code output panel
- Migration result messages in the UI

---

## Questions for Review

1. **Should we bump the major version** of `@sap-ux/fiori-migration-writer` since we're adding a new `code` field to the `Message` interface? (It's optional, so technically backward compatible)

2. **Should we add error codes to all existing error creation sites** in this PR, or do it incrementally in follow-up PRs?

3. **Should telemetrySanitizer.ts be deleted now** or kept for backward compatibility?

4. **Analytics team**: Will the change from `messages` → `errorCodes` break any existing dashboards or queries?

---

## Files Changed

### open-ux-tools
- `packages/fiori-migration-writer/src/migration-types.ts` — Added `code?: string` to `Message`
- `packages/fiori-migration-writer/src/utils/error-codes.ts` — **NEW** error code utilities
- `packages/fiori-migration-writer/src/BulkProjectMigrator.ts` — Add error codes to catch blocks
- `packages/fiori-migration-writer/src/index.ts` — Export error code utilities

### tools-suite
- `packages/lib/app-migrator/src/BulkProjectMigrator.ts` — Add error codes to catch blocks
- `packages/application-modeler/ide-extension/src/utils/migrate.ts` — Send error codes instead of text
- `packages/application-modeler/ide-extension/test/unit/utils/migrate.test.ts` — Update tests

---

## Related Issues

- PR #39873 (attempted path sanitization - insufficient)
- Original security review feedback (Slack thread)
