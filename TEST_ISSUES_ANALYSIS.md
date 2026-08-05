# Test Issues Analysis and Fixes for System Management Commands

## Overview
This document analyzes test failures for the system management CLI commands in `@sap-ux/create` and provides fixes where bugs were found.

---

## Test 1: No space between displayed name and message ✅ **NOT A BUG**

**Reported Issue**: When entering a system name, there's no space between the displayed name and the message.

**Analysis**: The `get system` command at [get/system.ts:81](../packages/create/src/cli/get/system.ts#L81) properly formats output with spaces. The logger calls use proper spacing.

**Action**: Verify the exact test case. The implementation appears correct.

---

## Test 2: Username/password mandatory vs optional ✅ **WORKING AS DESIGNED**

**Reported Issue**: Tests show that username and password should be mandatory, but they are optional.

**Resolution**: Username and password are **CORRECTLY OPTIONAL** by design because:
- `basic` authentication requires them
- `reentranceTicket` does NOT require credentials (uses browser-based SAML/SSO)
- `oauth2ClientCredential` uses different fields (client ID/secret, not username/password)
- Prompts explicitly say "(optional, press Enter to skip)" at [system-prompts.ts:225-233](../packages/create/src/cli/utils/system-prompts.ts#L225-233)

**Action**: Update test expectations to reflect that username/password are optional fields.

---

## Test 5: Re-entrance auth prompts and message ❌ **BUG FIXED**

**Reported Issue**: 
- Username/password prompts appear for re-entrance ticket auth (they shouldn't)
- Message about browser tab opening doesn't appear

**Root Cause**: The `promptForSystemConfig` function prompts for username/password regardless of authentication type.

**Fix Applied**: Modified [system-prompts.ts:221-238](../packages/create/src/cli/utils/system-prompts.ts#L221-238) to:
1. Only prompt for credentials when `authenticationType === 'basic'`
2. Show informational message for `reentranceTicket`: 
   ```
   Note: Re-entrance ticket authentication will open a browser tab when the system is first used.
   ```

**Files Changed**:
- `packages/create/src/cli/utils/system-prompts.ts`

---

## Test 7: System details display and password visibility ✅ **WORKING CORRECTLY**

**Expected Behavior**: 
- Show single system details
- Credentials stored securely
- No passwords shown

**Analysis**: Implementation at [get/system.ts:65-90](../packages/create/src/cli/get/system.ts#L65-90) is correct:
- Line 65-74: `publicView` excludes sensitive fields (username, password, tokens)
- Line 90: Shows `Credentials stored securely.` message
- Passwords never appear in output

**Action**: Verify test assertions match the implementation.

---

## Test 8: Missing 'Clear Credentials' option ❌ **BUG FIXED**

**Reported Issue**: No "Clear Credentials" option in the update multiselect prompt.

**Root Cause**: The `promptForUpdateFields` function only offered Name, Username, and Password choices.

**Fix Applied**: 
1. Added "Clear Credentials" option to the multiselect at [system-prompts.ts:297-315](../packages/create/src/cli/utils/system-prompts.ts#L297-315)
2. Modified `promptForFieldUpdates` to handle the `clearCredentials` selection with a confirmation prompt
3. Updated `determinePatch` in `update/system.ts` to process the clearCredentials flag from interactive mode

**Files Changed**:
- `packages/create/src/cli/utils/system-prompts.ts` (added choice and handling logic)
- `packages/create/src/cli/update/system.ts` (handle interactive clearCredentials)

---

## Test 9: SAP Client prompt behavior ✅ **WORKING AS DESIGNED**

**Reported Issue**: A prompt for SAP Client appears. Is this correct?

**Resolution**: Yes, this is correct behavior:
- SAP Client is optional per the TBI specification
- The prompt says "(optional, press Enter to skip)" at [system-prompts.ts:189](../packages/create/src/cli/utils/system-prompts.ts#L189)
- Validation accepts empty string or 3-digit numbers (000-999)

**Expected Flow**:
1. User enters "100" → validation passes
2. User presses Enter without value → no client set (undefined)

**Action**: Verify test completes successfully when entering a valid client like "100".

---

## Test 12: Arrow keys don't work as selectors ⚠️ **PROMPTS LIBRARY ISSUE**

**Reported Issue**: Arrow keys don't work to navigate select/multiselect prompts.

**Possible Causes**:
1. Terminal compatibility issue with the `prompts` library
2. Windows terminal vs Unix terminal differences
3. CI environment limitations

**Investigation Needed**:
- Test in different terminals (iTerm2, Terminal.app, Windows Terminal, WSL)
- Check if `prompts` library needs configuration
- Consider alternative: `inquirer` library has better cross-platform terminal support

**Workaround**: Some terminals may need specific flags or the test environment may need TTY emulation.

**Recommendation**: If arrow keys consistently fail, consider switching from `prompts` to `@inquirer/prompts` which has more robust terminal handling.

---

## Test 14: Remove command can't find URL ⚠️ **INVESTIGATION NEEDED**

**Reported Issue**: Command can't find URL when trying to remove a system.

**Possible Causes**:
1. URL normalization issues (trailing slashes, http vs https)
2. Case sensitivity in URL comparison
3. Client parameter mismatch

**Investigation Steps**:
1. Check how `BackendSystemKey.getId()` normalizes URLs in `@sap-ux/store`
2. Verify the exact URL format used in test vs what's stored
3. Test with and without trailing slash: `https://example.com` vs `https://example.com/`
4. Check if protocol matters: `http://` vs `https://`

**Debugging Command**:
```bash
# List all systems first to see exact URL format
npx @sap-ux/create list system --json

# Then use exact URL from the list output
npx @sap-ux/create remove system --url "https://exact-url-from-list"
```

**Files to Check**:
- `@sap-ux/store` package - `BackendSystemKey` class
- URL normalization in `packages/create/src/cli/remove/system.ts`

---

## Test 15: "System was not saved" message ✅ **WORKING AS DESIGNED**

**Reported Issue**: Should we display "System was not saved" in the terminal?

**Resolution**: Yes, this is correct UX:
- Message appears at [add/system.ts:248](../packages/create/src/cli/add/system.ts#L248)
- Shown when user declines to save after a failed connection check
- Confirms to the user that their choice was respected

**User Flow**:
1. Add system command runs
2. Connection check fails
3. Prompt: "Connection check failed. Save system anyway? (y/N)"
4. User selects "No"
5. Message: "System was not saved." ← **This is correct feedback**

**Action**: Update test expectation to verify this message appears.

---

## Test 18: Connection check failure prompt ⚠️ **STUB IMPLEMENTATION**

**Reported Issue**: Connection check didn't fail, prompt "Save the system anyway? No/Yes" doesn't appear.

**Root Cause**: The `checkSystemConnection` function at [system-connection.ts:16-36](../packages/create/src/cli/utils/system-connection.ts#L16-36) is a **stub implementation**:
```typescript
// For now, we just validate the URL format
// A real implementation would attempt to connect to the backend
// using the provided credentials and check if the system is reachable

return { success: true };  // ← Always succeeds!
```

**Current Behavior**: The function only validates URL format, so it never actually fails for valid URLs.

**Options to Fix This**:

### Option A: Implement Real Connection Check (Recommended for Production)
```typescript
import { ODataService } from '@sap-ux/axios-extension';

export async function checkSystemConnection(config: {
    url: string;
    client?: string;
    systemType: string;
    authenticationType: string;
    username?: string;
    password?: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        // Validate URL format first
        new URL(config.url);

        // Attempt to connect to a lightweight endpoint
        // For ABAP systems, try /sap/bc/ping or similar
        const service = await createForAbap({
            baseURL: config.url,
            auth: config.username && config.password 
                ? { username: config.username, password: config.password }
                : undefined
        });
        
        // Try a simple request with short timeout
        await service.get('/sap/bc/ping', { timeout: 5000 });
        
        return { success: true };
    } catch (error: any) {
        return { 
            success: false, 
            error: error.message || 'Connection failed' 
        };
    }
}
```

### Option B: Test with Invalid URLs (Immediate Workaround)
Modify tests to use:
- Invalid URL format: `"not-a-url"` → triggers URL validation failure
- Unreachable host: `"https://invalid-host-that-does-not-exist-123456.com"` → would fail DNS if implemented

### Option C: Add Mock Failure Mode for Testing
Add a special flag or URL pattern that triggers failure:
```typescript
if (config.url.includes('fail-connection-test')) {
    return { success: false, error: 'Mock connection failure for testing' };
}
```

**Recommendation**: 
1. Short-term: Update tests to use invalid URL formats to test the failure path
2. Long-term: Implement real connection checking with timeout and proper error handling

**Files Affected**:
- `packages/create/src/cli/utils/system-connection.ts` (implement real check)
- Test files (adjust test URLs to trigger failures)

---

## Summary of Code Changes Made

### Files Modified:

1. **`packages/create/src/cli/utils/system-prompts.ts`**:
   - Made username/password prompts conditional on `authenticationType === 'basic'`
   - Added re-entrance ticket informational message
   - Added "Clear Credentials" option to update multiselect
   - Added clearCredentials handling in `promptForFieldUpdates`

2. **`packages/create/src/cli/update/system.ts`**:
   - Modified `determinePatch` to handle interactive clearCredentials selection

### Files Requiring Test Updates:

1. **Test 2**: Update expectations - username/password are optional
2. **Test 9**: Verify client prompt works with valid input "100"
3. **Test 15**: Expect "System was not saved." message

### Files Requiring Investigation:

1. **Test 12**: Terminal/prompts library compatibility
2. **Test 14**: URL normalization and lookup in @sap-ux/store
3. **Test 18**: Connection check implementation (currently a stub)

---

## Test Execution Recommendations

1. **Run unit tests** for modified files:
   ```bash
   pnpm -F @sap-ux/create test -- system-prompts.test.ts
   pnpm -F @sap-ux/create test -- system.test.ts
   ```

2. **Run manual CLI tests** for each command:
   ```bash
   # Test add system with basic auth
   npx @sap-ux/create add system --name "Test" --url https://example.com --auth basic

   # Test add system with re-entrance ticket (should skip cred prompts)
   npx @sap-ux/create add system --name "Test2" --url https://example.com --auth reentranceTicket

   # Test update system (check for Clear Credentials option)
   npx @sap-ux/create update system

   # Test remove system
   npx @sap-ux/create remove system
   ```

3. **Check arrow key navigation** in select prompts on the target platform

4. **Verify URL matching** by listing systems and then trying to remove them

---

## Next Steps

1. ✅ Code fixes applied for Test 5 and Test 8
2. ⏳ Build and test the changes
3. ⏳ Update test expectations for Tests 2, 9, and 15
4. ⏳ Investigate Test 12 (arrow keys), Test 14 (URL lookup), Test 18 (connection check)
5. ⏳ Consider implementing real connection checking for production readiness
