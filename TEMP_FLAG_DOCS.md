# SAP UX Create - System Management CLI Improvements

**PR:** [fix(sap ux create): Fiori MCP create all fixes - #5028](https://github.com/SAP/open-ux-tools/pull/5028)  
**Status:** Merged to main (2026-09-21)  
**Related Issue:** Internal issue #39060

## Overview

Comprehensive improvements to the `@sap-ux/create` system management CLI, enhancing the system add/update/remove flows with better validation, smart lookup, internationalization, and explicit credential handling.

## Key Features

### 1. `--skip-credentials-prompt` Flag

Explicitly skip username/password prompts when adding systems that don't require stored credentials.

```bash
npx @sap-ux/create add system \
  --name "Mock System" \
  --url https://mock-system.example.com \
  --authenticationType reentranceTicket \
  --skip-credentials-prompt
```

**When to use:**
- **Mock/test systems** that don't require authentication
- **Browser-based auth flows** (`reentranceTicket`, `oauth2`, `oauth2ClientCredential`)
- **Scenarios where credentials will be provided later** via `update system`
- **Explicitly marking systems** that don't need stored credentials

**Benefits:**
- **Clearer intent:** Explicitly marks systems as "no credentials needed"
- **Fewer prompts:** Skips username/password prompts entirely (no need to press Enter twice)
- **Better UX for non-basic auth:** Ideal for authentication types that use browser-based flows

### 2. `--skip-connection-validation` Flag

Skip the HTTP connection check when adding or updating systems.

```bash
npx @sap-ux/create add system \
  --name "Test System" \
  --url https://test-system.example.com \
  --skip-connection-validation
```

**Use cases:**
- Systems that are temporarily unreachable
- Offline development scenarios
- Systems behind VPN/firewalls that require additional setup

**Note:** Replaces the deprecated `--skip-check` flag (still supported for backward compatibility).

### 3. Smart System Lookup by URL

Automatically find systems by URL across all connection types, with intelligent selection:

- **Single match:** Auto-select without prompting
- **Multiple matches:** Interactive selection with system details
- **No client prompt confusion:** When URL is provided, client prompts are skipped

```bash
# One system with this URL → auto-selected
npx @sap-ux/create get system --url https://unique-system.com

# Multiple systems with this URL → prompts to choose
npx @sap-ux/create update system --url https://shared-system.com

# Explicit client match → immediate return
npx @sap-ux/create remove system --url https://system.com --client 100
```

**Applies to:** `get system`, `update system`, `remove system` commands

### 4. Real Connection Validation

Implements proper HTTP connection checks using `@sap-ux/system-access`:

- **ABAP Catalog systems:** Validates by listing catalog services
- **OData Service systems:** Validates with metadata request
- **Generic Host systems:** Basic connectivity check
- **Smart 401 handling:** HTTP 401 treated as success (system is reachable, authentication will happen later)
- **Comprehensive error detection:** Handles DNS failures, timeouts, connection refused, etc.

### 5. Internationalization (i18n)

All user-facing strings are externalized using `i18next`:

- Prompts and validation messages
- Error messages and action feedback
- System lookup messages
- Support for future language translations

Translation files: `packages/create/src/translations/ux-create.i18n.json`

### 6. Clear Credentials Option

Interactive option to clear stored credentials when updating systems:

```bash
npx @sap-ux/create update system --name "My System"
# Select "Clear Credentials" from the update options
```

## Usage Examples

### Add a Mock System (No Credentials)

```bash
npx @sap-ux/create add system \
  --name "Mock Backend" \
  --url https://mock-api.example.com \
  --authenticationType reentranceTicket \
  --skip-credentials-prompt
```

### Add System with Connection Validation Disabled

```bash
npx @sap-ux/create add system \
  --name "VPN System" \
  --url https://internal-system.corp \
  --authenticationType basic \
  --skip-connection-validation
```

### Update System by URL (Smart Lookup)

```bash
# Finds system by URL automatically
npx @sap-ux/create update system \
  --url https://my-system.example.com \
  --username newuser
```

### Get System Credentials

```bash
# Auto-selects if only one system has this URL
npx @sap-ux/create get system --url https://my-system.example.com
```

## Alternative Approaches (Backward Compatible)

### Option 1: Skip credential prompts manually
Press Enter for username/password prompts (still works, just less ergonomic)

### Option 2: Deprecated `--skip-check` flag
Still supported for backward compatibility, but use `--skip-connection-validation` instead

### Option 3: Connection validation failure workflow
Let the connection check fail, then answer "Yes" to "Save system anyway?" prompt

## Technical Implementation

- **Authentication type validation:** Runtime checks ensure valid enum values from CLI
- **Type-safe enums:** Uses `SystemType`, `AuthenticationType`, `ConnectionType` from `@sap-ux/store`
- **Proper error handling:** Custom `ClearCredentialsCancelledError` class for cancellation flows
- **URL validation:** Leverages `@sap-ux/project-input-validator` for consistent validation
- **Connection provider:** Uses `createAbapServiceProvider` from `@sap-ux/system-access`
- **Error analysis:** Uses `ErrorHandler` from `@sap-ux/inquirer-common` for 30+ error types

## Testing

- **Unit tests:** 312 tests covering all system management flows
- **Test coverage:** Connection validation, smart lookup, credential handling, i18n
- **Manual QA:** Validated against internal test scenarios (Tests 1-18 from issue #39060)

## Documentation Updates

- Updated `packages/create/README.md` with new flags
- Updated `packages/fiori-mcp-server/skills/sap-fiori-create-cli/SKILL.md`
- Generated command documentation reflects all changes

## Migration Guide

### If you were using workarounds:

**Before:**
```bash
# Old workaround: skip-check + press Enter twice for credentials
npx @sap-ux/create add system \
  --name "Mock" --url https://mock.com --skip-check
# [Press Enter for username]
# [Press Enter for password]
```

**After:**
```bash
# New explicit flag: skip credential prompts entirely
npx @sap-ux/create add system \
  --name "Mock" --url https://mock.com \
  --skip-credentials-prompt
```

### If you were using `--skip-check`:

**Before:**
```bash
npx @sap-ux/create add system --name "Sys" --url https://test.com --skip-check
```

**After (preferred):**
```bash
npx @sap-ux/create add system --name "Sys" --url https://test.com --skip-connection-validation
```

**Note:** `--skip-check` still works but shows a deprecation notice.

## Related Packages

- `@sap-ux/create` - Core system management CLI (minor version bump)
- `@sap-ux/system-access` - Connection validation and service provider
- `@sap-ux/store` - System storage and credential management
- `@sap-ux/inquirer-common` - Shared prompts and error handling
- `@sap-ux/project-input-validator` - Input validation utilities

## Commits

113 commits including:
- Smart URL lookup implementation
- Real connection validation with ErrorHandler
- i18n localization support
- Credential clearing functionality
- Type safety improvements
- Comprehensive test coverage
- Documentation updates

---

## Testing Steps - Test 2: `--skip-credentials-prompt` Flag

### Prerequisites
- `@sap-ux/create` package installed from the merged PR
- Access to terminal/command line

### Test Case 1: Basic Auth with `--skip-credentials-prompt`

**Objective:** Verify that credential prompts are skipped when flag is provided.

**Steps:**
```bash
npx @sap-ux/create add system \
  --name "Test-BasicAuth-NoPrompt" \
  --url https://mock-system.example.com \
  --authenticationType basic \
  --skip-credentials-prompt
```

**Expected Result:**
- ✅ System name prompt appears
- ✅ URL prompt appears (or uses flag value)
- ✅ Authentication type prompt appears (or uses flag value)
- ✅ **Username prompt is SKIPPED**
- ✅ **Password prompt is SKIPPED**
- ✅ Connection validation runs (unless `--skip-connection-validation` also provided)
- ✅ System is saved without credentials
- ✅ Success message: "System added successfully"

**Verification:**
```bash
npx @sap-ux/create get system --name "Test-BasicAuth-NoPrompt"
```
Should show: "No credentials stored"

---

### Test Case 2: Re-entrance Ticket Auth with `--skip-credentials-prompt`

**Objective:** Verify flag works with browser-based authentication.

**Steps:**
```bash
npx @sap-ux/create add system \
  --name "Test-ReentTicket-NoPrompt" \
  --url https://sap-system.example.com \
  --authenticationType reentranceTicket \
  --skip-credentials-prompt
```

**Expected Result:**
- ✅ No username/password prompts appear
- ✅ Browser auth informational message appears:
  ```
  Note: Re-entrance ticket authentication will open a browser tab when the system is first used.
  ```
- ✅ Connection validation runs (validates system is reachable)
- ✅ HTTP 401 response treated as success (system reachable, auth happens in browser)
- ✅ System saved successfully

---

### Test Case 3: OAuth2 with `--skip-credentials-prompt`

**Objective:** Verify flag works with OAuth2 authentication type.

**Steps:**
```bash
npx @sap-ux/create add system \
  --name "Test-OAuth2-NoPrompt" \
  --url https://oauth-system.example.com \
  --authenticationType oauth2 \
  --skip-credentials-prompt
```

**Expected Result:**
- ✅ No credential prompts
- ✅ Connection validation runs
- ✅ 401 responses treated as success for OAuth2
- ✅ System saved without credentials

---

### Test Case 4: Combined with `--skip-connection-validation`

**Objective:** Verify both flags work together for fastest system addition.

**Steps:**
```bash
npx @sap-ux/create add system \
  --name "Test-Both-Flags" \
  --url https://any-system.example.com \
  --authenticationType reentranceTicket \
  --skip-credentials-prompt \
  --skip-connection-validation
```

**Expected Result:**
- ✅ No credential prompts
- ✅ No connection validation performed
- ✅ System saved immediately
- ✅ Fastest path for adding mock/test systems

---

### Test Case 5: Without Flag (Baseline Comparison)

**Objective:** Confirm default behavior still prompts for credentials.

**Steps:**
```bash
npx @sap-ux/create add system \
  --name "Test-With-Prompts" \
  --url https://system.example.com \
  --authenticationType basic
```

**Expected Result:**
- ✅ Username prompt appears
- ✅ Password prompt appears
- ✅ Can press Enter to skip (but requires two Enter presses)
- ✅ System saved with or without credentials

**Comparison:** Without the flag, you need to manually skip by pressing Enter twice. With the flag, prompts are completely bypassed.

---

### Test Case 6: Invalid URL with `--skip-credentials-prompt`

**Objective:** Verify connection validation catches bad URLs even when credentials are skipped.

**Steps:**
```bash
npx @sap-ux/create add system \
  --name "Test-BadURL" \
  --url https://definitely-not-a-real-system-12345.invalid \
  --authenticationType basic \
  --skip-credentials-prompt
```

**Expected Result:**
- ✅ No credential prompts
- ✅ Connection validation runs
- ❌ Connection fails (DNS lookup failure or timeout)
- ✅ Error message displayed with details
- ✅ Prompt: "Save system anyway? (y/N)"
- ✅ If "Y" → system saved
- ✅ If "N" → system not added

---

### Test Case 7: Interactive Mode (No CLI Flags)

**Objective:** Verify interactive prompts still work when flag is not provided.

**Steps:**
```bash
npx @sap-ux/create add system
```

**Interactive Flow:**
1. Enter name: "Test-Interactive"
2. Enter URL: "https://test.com"
3. Select auth type: "Re-entrance Ticket"
4. **Expected:** Username/password prompts should appear but can be skipped

**Expected Result:**
- ✅ All prompts appear in order
- ✅ For non-basic auth, credentials are optional (press Enter to skip)
- ✅ Browser auth message appears for reentranceTicket
- ✅ System saved successfully

---

### Test Case 8: Update System - Clear Credentials

**Objective:** Verify credential clearing works independently of the add flag.

**Steps:**
```bash
# First, add a system with credentials
npx @sap-ux/create add system \
  --name "Test-Update-Creds" \
  --url https://test.com \
  --authenticationType basic \
  --username testuser \
  --password testpass

# Then update to clear credentials
npx @sap-ux/create update system --name "Test-Update-Creds"
# Select "Clear Credentials" from the options
```

**Expected Result:**
- ✅ Update options prompt appears
- ✅ "Clear Credentials" option is available
- ✅ Confirmation prompt: "Are you sure you want to clear credentials?"
- ✅ If confirmed, credentials removed
- ✅ Success message: "System updated successfully"

**Verification:**
```bash
npx @sap-ux/create get system --name "Test-Update-Creds"
```
Should show: "No credentials stored"

---

### Test Case 9: Connection Type Validation

**Objective:** Verify connection validation uses appropriate method based on connection type.

**Steps:**

**ABAP Catalog System:**
```bash
npx @sap-ux/create add system \
  --name "Test-ABAP-Catalog" \
  --url https://abap-system.example.com \
  --connectionType abap_catalog \
  --authenticationType basic \
  --skip-credentials-prompt
```
**Expected:** Validates by attempting to list catalog services

**OData Service System:**
```bash
npx @sap-ux/create add system \
  --name "Test-OData-Service" \
  --url https://odata.example.com/service \
  --connectionType odata_service \
  --authenticationType basic \
  --skip-credentials-prompt
```
**Expected:** Validates with metadata request

**Generic Host System:**
```bash
npx @sap-ux/create add system \
  --name "Test-Generic-Host" \
  --url https://generic.example.com \
  --connectionType generic_host \
  --authenticationType basic \
  --skip-credentials-prompt
```
**Expected:** Basic connectivity check

---

### Test Case 10: Deprecated Flag Warning

**Objective:** Verify backward compatibility and deprecation notice.

**Steps:**
```bash
npx @sap-ux/create add system \
  --name "Test-Deprecated-Flag" \
  --url https://test.com \
  --skip-check
```

**Expected Result:**
- ✅ Deprecation warning displayed
- ✅ Message suggests using `--skip-connection-validation` instead
- ✅ Flag still works (backward compatible)
- ✅ Connection validation is skipped

---

## Summary of Key Test Scenarios

| Scenario | Flag Combination | Expected Behavior |
|----------|-----------------|-------------------|
| Mock system, no validation | `--skip-credentials-prompt --skip-connection-validation` | Fastest path, no prompts, no checks |
| Browser auth system | `--skip-credentials-prompt` + `reentranceTicket` | No credential prompts, shows browser message |
| Test system (unreachable) | `--skip-credentials-prompt --skip-connection-validation` | Saves without validation |
| Production system | (no flags) | All prompts, full validation |
| Basic auth, valid system | `--skip-credentials-prompt` | No credential prompts, validates connection |
| Invalid URL | `--skip-credentials-prompt` (no skip-validation) | Catches connection errors, offers to save anyway |

---

## Common Issues and Troubleshooting

### Issue 1: "Username prompt still appears"
**Cause:** Flag name might be incorrect  
**Solution:** Ensure you're using `--skip-credentials-prompt` (not `--no-credentials`)

### Issue 2: "Connection validation fails for valid system"
**Cause:** System requires credentials for validation  
**Solution:** Either provide credentials or use `--skip-connection-validation`

### Issue 3: "System saved but credentials not found later"
**Cause:** Expected behavior when using `--skip-credentials-prompt`  
**Solution:** Update system later with credentials: `npx @sap-ux/create update system --name "SystemName" --username user --password pass`

---

**For more details:** See the [full PR #5028](https://github.com/SAP/open-ux-tools/pull/5028)
