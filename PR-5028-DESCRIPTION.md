# fix(sap-ux/create): comprehensive system management CLI fixes (38968)

## Overview

This PR addresses multiple issues from internal bug report 38968 for the `@sap-ux/create` system management CLI commands (`add system`, `update system`, `remove system`, `get system`, `list system`).

**Related Issue:** Internal 38968 - System Management CLI - Multiple Issues Found During Testing

## What Changed

### 🎯 Fixes Summary

| Issue | Status | Description |
|-------|--------|-------------|
| **PR Review** | ✅ Fixed | i18n string formatting consistency (4 error messages) |
| **Test 2** | ✅ Fixed | `--no-credentials` flag now works correctly |
| **Test 5** | ✅ Fixed | Added re-entrance ticket browser authentication message |
| **Test 8** | ✅ Fixed | Clear Credentials option restored with confirmation |
| **Test 14** | ✅ Fixed | Smart URL lookup - auto-select when unique, prompt when multiple |
| **Test 15** | ✅ Already Working | "System was not added" messages present on all failure paths |
| **Test 18** | ✅ Fixed | Real connection checking + 401 handling for basic auth |
| **Test 1, 7** | ⚠️ Out of Scope | Issues in `@sap-ux/store` package (different repository) |
| **Test 12** | ⚠️ Out of Scope | External `prompts` library limitation |

---

## Detailed Changes

### 1. PR Review Feedback - i18n String Formatting

**Files Changed:**
- `src/translations/ux-create.i18n.json`

**Changes:**
Fixed 4 error message formats for consistency per review feedback:
```json
"errors": {
    "authFailed": "Authentication failed. Error: HTTP 401 Unauthorized",
    "connectionRefused": "Connection refused. System may be unreachable",
    "hostNotFound": "Host not found. DNS resolution failed",
    "connectionReset": "Connection reset by server."
}
```

---

### 2. Test 5 - Re-entrance Ticket Authentication Message

**Files Changed:**
- `src/cli/utils/system-prompts.ts`
- `src/translations/ux-create.i18n.json`

**Changes:**
- Added informational message when `reentranceTicket` auth type is selected
- Message: "Note: Re-entrance ticket authentication will open a browser tab when the system is first used."
- Username/password prompts correctly skip for non-basic authentication types

**Before:**
```bash
$ add system --auth reentranceTicket
? Username (optional): _           # ❌ Shouldn't prompt
? Password (optional): _           # ❌ Shouldn't prompt
```

**After:**
```bash
$ add system --auth reentranceTicket
Note: Re-entrance ticket authentication will open a browser tab when the system is first used.
System 'BTP System' added.         # ✅ No credential prompts
```

---

### 3. Test 8 - Clear Credentials Option

**Files Changed:**
- `src/cli/utils/system-prompts.ts`
- `src/translations/ux-create.i18n.json`

**Changes:**
- Restored "Clear Credentials" option in update system multi-select
- Added confirmation prompt before clearing
- Previously lost in earlier refactoring, now restored from git history

**Interactive Flow:**
```bash
$ update system
? Select fields to update:
  ◯ Name (current: My System)
  ◯ Username (current: testuser)
  ◯ Password
  ◯ Clear Credentials              # ✅ Added

? Are you sure you want to clear all stored credentials? (y/N)
```

---

### 4. Test 18 - Real Connection Checking

**Files Changed:**
- `src/cli/utils/system-connection.ts`

**Changes:**
- Fixed 401 HTTP response handling for basic authentication
- **Old behavior:** 401 with basic auth but no credentials → treated as success
- **New behavior:** ALL basic auth 401 responses → treated as failure
- Non-basic auth types (reentranceTicket, oauth2) still treat 401 as "system reachable"

**Impact:**
```bash
# Before (incorrect):
$ add system --url https://fake-system-999.com --auth basic
✓ Connection successful            # ❌ Fake URL shouldn't succeed

# After (correct):
$ add system --url https://fake-system-999.com --auth basic
Connection check failed. Error: Host not found. DNS resolution failed
? Save system anyway? (y/N)        # ✅ Proper error handling
```

**Test Coverage:**
- DNS resolution failures (ENOTFOUND)
- Connection refused (ECONNREFUSED)
- Connection timeout (ETIMEDOUT)
- Connection reset (ECONNRESET)
- Authentication failures (401)
- Real HTTP requests with 5-second timeout

---

### 5. Test 2 - `--no-credentials` Flag Fix

**Files Changed:**
- `src/cli/add/system.ts`

**Changes:**
- Fixed Commander flag parsing issue
- Commander converts `--no-credentials` to `credentials: false`, not `noCredentials: true`
- Changed check from `!!options.noCredentials` to `options.credentials === false`

**Use Cases:**
- Mock/test systems without authentication
- Non-basic auth types (browser-based flows)
- Systems where credentials will be added later

**Before:**
```bash
$ add system --url https://mock.com --no-credentials
? Username (optional): _           # ❌ Still prompts
```

**After:**
```bash
$ add system --url https://mock.com --no-credentials
System 'MockSystem' added.         # ✅ No prompts
```

---

### 6. Test 14 - Smart URL Lookup (Option B)

**Files Changed:**
- `src/cli/utils/system-lookup.ts`
- `src/cli/utils/system-prompts.ts`
- `src/cli/get/system.ts`
- `src/cli/remove/system.ts`
- `src/cli/update/system.ts`

**Changes:**
Implemented smart URL lookup with auto-selection logic:

1. **Count matches FIRST** (not exact match first)
2. **If exactly 1 match** → auto-select (no prompt)
3. **If 2+ matches** → show all options and prompt
4. **Only exact match** when client explicitly provided via `--client` flag
5. **Skip client prompt** when `--url` flag provided (let smart lookup handle it)

**Smart Lookup Logic:**
```typescript
// Step 1: Find all systems with this URL
const matches = allSystems.filter(s => s.url === normalizedUrl);

// Step 2: If unique, auto-select
if (matches.length === 1) return matches[0];

// Step 3: If client provided, try exact match first
if (client !== undefined) {
    const exactMatch = matches.find(s => s.client === client);
    if (exactMatch) return exactMatch;
}

// Step 4: Multiple matches - prompt user
return promptToSelectSystem(matches);
```

**User Experience Improvements:**

**Scenario A: Unique URL (auto-select)**
```bash
$ get system --url https://unique-system.com
Name:       UniqueSystem          # ✅ No prompt needed
URL:        https://unique-system.com
```

**Scenario B: Multiple Systems (prompt)**
```bash
$ remove system --url https://shared-url.com
Multiple systems found with this URL:
1. System-Client100 (client: 100)
2. System-Client200 (client: 200)
3. System-NoClient (no client)
? Which system do you want to use? ›  # ✅ Clear selection
```

**Scenario C: Exact Match (when client provided)**
```bash
$ get system --url https://shared-url.com --client 100
Name:       System-Client100      # ✅ Immediate return (exact match)
Client:     100
```

**Scenario D: No Confusing Client Prompts**
```bash
# Before:
$ remove system --url https://test.com
? SAP Client (optional): _         # ❌ Confusing - I already gave URL

# After:
$ remove system --url https://test.com
Multiple systems found...          # ✅ Smart lookup - no client prompt
```

**Test Coverage:**
- 100% coverage of system-lookup.ts
- Exact match with client provided
- Multiple system selection
- Single system auto-selection
- URL normalization (trailing slash)
- No systems found scenarios

---

### 7. Test Fixes - All Tests Passing (278/278)

**Files Changed:**
- `test/unit/cli/create-fiori.test.ts`
- `test/unit/cli/utils/system-prompts.test.ts`
- `test/unit/cli/utils/system-lookup.test.ts`

**Changes:**

1. **create-fiori.test.ts** - Fixed 3 async test failures
   - Added `async/await` to tests calling `handleCreateFioriCommand()`
   - Tests were running assertions before async function completed

2. **system-prompts.test.ts** - Updated test expectations
   - Old: Expected client prompt when URL provided
   - New: No client prompt when URL provided (smart lookup handles it)

3. **system-lookup.test.ts** - Updated for new lookup logic
   - Old: Expected `service.read()` call first (exact match)
   - New: Expected `service.getAll()` call first (count matches)

**Test Results:**
```
Test Suites: 34 passed, 34 total
Tests:       278 passed, 278 total (100%)
```

---

## Breaking Changes

⚠️ **Minor Breaking Change:**

`promptForSystemIdentifier()` behavior changed when URL is provided via flag:
- **Before:** Always prompted for client (even when URL provided)
- **After:** Skips client prompt when URL provided (smart lookup handles multiple matches)

**Migration:**
No action needed. New behavior is more intuitive and user-friendly. If exact client is needed, use `--client` flag.

---

## Testing

### Manual Testing Completed
- ✅ Test 3: Add system with all flags (no prompts)
- ✅ Test 5: Re-entrance ticket message displays correctly
- ✅ Test 6: List systems --json (no sensitive data)
- ✅ Test 7: Get system (credentials display)
- ✅ Test 11: Clear credentials flag works
- ✅ Test 14a: GET with URL only (3 systems) → prompts
- ✅ Test 14b: GET with URL + client → immediate return
- ✅ Test 14c: GET with unique URL → auto-select
- ✅ Test 15: Invalid URL shows error message
- ✅ Test 18: Connection check failure → prompts to save anyway

### Unit Test Coverage
- All existing tests updated to match new behavior
- New tests added for smart lookup logic
- **278/278 tests passing (100%)**

---

## Out of Scope Issues

The following issues are NOT fixed in this PR:

**Test 1 & Test 7:** Issues in `@sap-ux/store` package
- Spacing in output messages
- "Count: X" messages from keystore logger
- System not found when credentials missing
- Requires changes in different repository

**Test 12:** Arrow keys don't work in interactive prompts
- Limitation of external `prompts` npm library
- Would require migration to `@inquirer/prompts` (separate effort)

---

## Commits in this PR

1. `b22bcb90d` - fix(sap-ux/create): add browser auth message for re-entrance ticket (Test 5)
2. `c072f8da8` - fix(sap-ux/create): correct 401 handling for basic auth without credentials (Test 18)
3. `b8e5cdc62` - fix(sap-ux/create): correct --no-credentials flag handling
4. `d0b6cde0f` - feat(sap-ux/create): implement smart URL lookup (Test 14)
5. `c2112e76e` - test(sap-ux/create): update tests to match new smart lookup behavior

---

## Review Checklist

- [x] All quality gates pass (`yarn build`, `yarn lint`, `yarn test`)
- [x] 278/278 tests passing (100%)
- [x] Manual testing completed for all affected commands
- [x] PR review feedback addressed
- [x] QA feedback addressed (Tests 2, 5, 8, 14, 15, 18)
- [x] No security vulnerabilities introduced
- [x] Breaking changes documented
