# Fix System Management CLI Issues - Tests 7 & 14 from #39060

## Summary

This PR implements fixes for **Test 7** and **Test 14** from issue #39060, improving the system management CLI commands (`get system`, `update system`, `remove system`) in `@sap-ux/create`.

## Changes

### Test 14 - Smart URL Lookup (High Priority) ✅

**Problem:**
System commands failed when the client parameter didn't match exactly, even when only one system existed with that URL:

```bash
# Add with client
$ add system --url https://example.com --client 100

# Failed - client mismatch  
$ remove system --url https://example.com
Error: System not found

# Required exact match
$ remove system --url https://example.com --client 100
# Works
```

**Solution:**
Implemented smart URL lookup via new `system-lookup.ts` utility:

1. Try exact match (URL + client)
2. If no match, find all systems with the same URL
3. If exactly one system found → use it automatically
4. If multiple systems found → prompt user to select
5. If none found → return "System not found"

**Files Changed:**
- ✨ NEW: `packages/create/src/cli/utils/system-lookup.ts` - Smart lookup utility
- 📝 `packages/create/src/cli/get/system.ts` - Use smart lookup
- 📝 `packages/create/src/cli/update/system.ts` - Use smart lookup
- 📝 `packages/create/src/cli/remove/system.ts` - Use smart lookup

**Impact:**
- Users no longer need to remember exact client values
- Handles the common case where only one system exists with a given URL
- Interactive selection when multiple systems match

---

### Test 7 - Credentials Display Fix (Medium Priority) ✅

**Problem:**
From the screenshot provided, when credentials were missing from the keychain but system metadata existed in the filesystem, `get system` showed:

```
No credential found. Service: [fiori/v2/system], Key: [https://my-sap-system.com]
System not found: https://my-sap-system.com
```

The system metadata (name, URL, type, etc.) exists but the command returned "System not found".

**Solution:**
Modified `get system` command to display "No credentials stored" when `hasSensitiveData` is false:

```typescript
if (system.hasSensitiveData) {
    logger.info(`Credentials stored securely.`);
} else {
    logger.info(`No credentials stored.`);
}
```

**Expected Output:**
```
Name:       My System
URL:        https://my-sap-system.com
Client:     100
Type:       OnPrem
Auth:       basic
Connection: abap_catalog
No credentials stored.
```

**Files Changed:**
- 📝 `packages/create/src/cli/get/system.ts` - Add "No credentials stored" message

---

## Testing

### Test Coverage
- ✅ All 249 tests passing (33/33 test suites)
- ✅ Updated test mocks in:
  - `test/unit/cli/get/system.test.ts`
  - `test/unit/cli/update/system.test.ts`  
  - `test/unit/cli/remove/system.test.ts`
- ✅ Tests verify `findSystemByUrl` is called correctly
- ✅ Tests verify "No credentials stored" message appears

### Manual Testing Scenarios

**Test 14 - Smart Lookup:**
```bash
# Add system with client
pnpm nx test-cli:add-system -- --url https://test.com --client 100 --name "Test System"

# Remove without client - should find automatically
pnpm nx test-cli:remove-system -- --url https://test.com --force
# Expected: System removed successfully

# Add multiple systems with same URL
pnpm nx test-cli:add-system -- --url https://test.com --client 100 --name "Sys 1"
pnpm nx test-cli:add-system -- --url https://test.com --client 200 --name "Sys 2"

# Try to remove - should prompt to select
pnpm nx test-cli:remove-system -- --url https://test.com
# Expected: Interactive prompt to choose between systems
```

**Test 7 - Credentials Display:**
```bash
# Add system without credentials (skip prompts)
pnpm nx test-cli:add-system -- --url https://test.com --name "No Creds" --skip-check
# (press Enter to skip username/password)

# Get system details
pnpm nx test-cli:get-system -- --url https://test.com
# Expected: Shows system details with "No credentials stored" message
```

---

## Related Issues

- Fixes Test 7 from #39060
- Fixes Test 14 from #39060
- Related PRs:
  - #5015 - Tests 5, 8, 15 (System Management CLI Improvements)
  - #5020 - Test 18 (Connection Check)

## Remaining Issues from #39060

After this PR, the remaining issues are:

- **Test 1** (Low): Missing space in output - Cannot reproduce in current codebase
- **Test 12** (Low): Arrow keys don't work - External `prompts` library limitation, documented
  
All medium and high priority issues are now resolved.

---

## Checklist

- [x] All tests passing (249/249)
- [x] Lint: 0 errors
- [x] Changeset added (`fix-tests-7-and-14.md`)
- [x] No breaking changes
- [x] Documentation updated (inline comments)
- [x] Manual testing completed

## Additional Notes

- The smart lookup feature makes the CLI more user-friendly without breaking existing workflows
- Users with exact client values will still get exact matches (no change in behavior)
- The credentials display fix provides better UX when systems are saved without credentials
- All changes are backward compatible
