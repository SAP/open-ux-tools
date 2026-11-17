# Code Review Follow-up Items (PR #5420)

## W4: Three strict-mode ERROR paths produce no code

In strict mode, `getMessageType('WARNING', strict, true)` escalates to 'ERROR' in these files — but no code is set:

- `src/migration-process/validation.ts` — MISSING_METADATA_CONFIG
- `src/config/backend.ts` — MIGRATION_NO_BACKEND_URL
- `src/config/manifest-update.ts` — MISSING_MANIFEST_UI5_SECTION

Any telemetry consumer filtering on `type === 'ERROR'` would emit UNKNOWN_ERROR for these.

**Status:** Follow-up work - these sites need to be updated to set error codes when creating messages.

## W5: No integration-level test asserts code is populated end-to-end

BulkProjectMigrator and ProjectMigrator test files do not assert that a failure produces a `message.code`.

**Recommendation:** A simple assertion like `expect(messages[0].code).toBeDefined()` on known failure paths would protect against regressions where the import is accidentally removed.

**Status:** Follow-up work - add integration tests to verify error codes are populated in migration workflows.
