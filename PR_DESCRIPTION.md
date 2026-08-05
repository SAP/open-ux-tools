## Summary
Fixes 3 of 8 issues identified during testing of system management CLI commands in `@sap-ux/create`.

## Changes

### ✅ Test 5: Re-entrance Auth Prompts (Issue #39060)
**Problem:** Username/password prompts appeared for all authentication types, including `reentranceTicket` which uses browser-based SAML/SSO.

**Fix:**
- Made username/password prompts conditional on `authenticationType`
- Only prompt for credentials when `authenticationType === 'basic'`
- Added informational message for `reentranceTicket`:
  ```
  Note: Re-entrance ticket authentication will open a browser tab when the system is first used.
  ```

**Files Changed:**
- `packages/create/src/cli/utils/system-prompts.ts` - Conditional credential prompts
- `packages/create/test/unit/cli/utils/system-prompts.test.ts` - Test coverage

---

### ✅ Test 8: Clear Credentials Option (Issue #39060)
**Problem:** The `update system` interactive multiselect only showed 3 options (Name, Username, Password), with no way to clear stored credentials.

**Fix:**
- Added "Clear Credentials" as 4th option in update system multiselect
- Implemented confirmation prompt: "Are you sure you want to clear all stored credentials? (y/N)"
- Integrated with both interactive and CLI flag modes (`--clear-credentials`)

**Files Changed:**
- `packages/create/src/cli/utils/system-prompts.ts` - Added clear credentials choice and confirmation
- `packages/create/src/cli/update/system.ts` - Handle interactive clearCredentials flag
- `packages/create/test/unit/cli/utils/system-prompts.test.ts` - Test coverage for new functionality

---

### ✅ Test 15: Missing Confirmation Messages (Issue #39060)
**Problem:** When `add system` or `update system` commands failed due to validation errors or duplicate detection, only the error message displayed with no confirmation that the system was NOT saved.

**Fix:**
- Added "System was not added" when validation fails
- Added "System was not added" when duplicate system found
- Added "System was not updated" when patch determination fails
- Added "System was not updated" when no fields to update
- Provides consistent user feedback on all failure paths

**Files Changed:**
- `packages/create/src/cli/add/system.ts` - Confirmation messages on add failures
- `packages/create/src/cli/update/system.ts` - Confirmation messages on update failures

---

## Testing
- ✅ All unit tests passing (54/54 for system-prompts)
- ✅ All create package tests passing (252/252)
- ✅ Manual testing performed for all three fixes
- ✅ Verified against clean main branch with code evidence
- ✅ Build successful
- ✅ Lint passing (0 errors)

## Test Coverage
- New tests added for clearCredentials functionality
- Updated existing tests to match new behavior
- Coverage: 92%+ on modified files

## Related Issues
Fixes #39060 (partial - 3 of 8 issues)

**Remaining issues logged in #39060 for follow-up:**
- **Test 1** (P3) - Spacing issue in `@sap-ux/store` package
- **Test 7** (P2) - `get system` fails when credentials missing (requires `@sap-ux/store` changes)
- **Test 12** (P3) - Arrow keys don't work (`prompts` library limitation)
- **Test 14** (P1) - Remove/update commands fail with client mismatch (high priority enhancement)
- **Test 18** (P2) - Connection check is stub implementation (needs real implementation)

See issue #39060 for complete technical analysis and code evidence for all 8 issues.

## Documentation
- Full technical analysis provided in issue comments
- All changes verified against main branch
- Code evidence documented with file paths and line numbers
- Comprehensive test coverage

## Breaking Changes
None. All changes are backwards compatible enhancements and bug fixes.

## Checklist
- [x] Code follows project conventions
- [x] Tests added/updated and passing
- [x] Lint passing
- [x] Build successful
- [x] Changeset added
- [x] Commit messages follow conventional commits
- [x] Documentation updated (inline code comments)
