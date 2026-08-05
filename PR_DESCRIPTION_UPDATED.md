# fix(create): comprehensive system management CLI fixes (Internal Issue 39060)

## Overview

This PR combines fixes for multiple issues in the `@sap-ux/create` system management CLI commands (`add system`, `update system`, `remove system`, `get system`, `list systems`). It addresses Tests 1, 5, 7, 8, 12, 14, 15, and 18 from internal issue 39060.

**Related Issue:** Internal 39060

## What Changed

### 🎯 Test Fixes Summary

| Test # | Issue | Fix |
|--------|-------|-----|
| **Test 1** | Extra space in reentrance ticket auth message | Fixed message formatting |
| **Test 5** | Username/password prompts for non-basic auth types | Conditional credential prompting (only for basic auth) |
| **Test 7** | Get/list commands show `[object Object]` instead of credentials | Properly format credentials display with masking |
| **Test 8** | No way to clear stored credentials | Added `--clear-credentials` option with confirmation |
| **Test 12** | Arrow keys don't work in interactive prompts | Migrated from `prompts` to `@inquirer/prompts` (separate PR #5014) |
| **Test 14** | Update command doesn't find system when client differs | Implemented smart URL-only lookup with user selection |
| **Test 15** | Missing confirmation when system not saved | Added "System was not added/updated" messages |
| **Test 18** | Connection check always succeeds (fake check) | Implemented real Axios-based connection check |

### 📦 Changes by Category

#### 1. CLI Interactive Prompting Improvements

**Files Changed:**
- `src/cli/add/system.ts` - Added confirmation message when system not added, `--no-credentials` flag
- `src/cli/update/system.ts` - Added `--clear-credentials` option and confirmation messages
- `src/cli/utils/system-prompts.ts` - Improved auth prompts (separate username/password for basic auth), conditional credential prompting

**Key Improvements:**
- ✅ `--no-credentials` flag for `add system` command to skip credential prompts entirely
- ✅ Conditional credential prompting (only prompts username/password for `basic` authenticationType)
- ✅ Separate username and password prompts for basic authentication
- ✅ `--clear-credentials` flag for `update system` command
- ✅ Confirmation messages when system not added/updated
- ✅ Fixed reentrance ticket authentication message formatting (Test 1)

**`--no-credentials` Flag Use Cases:**
- Mock/test systems that don't require authentication
- Systems using `reentranceTicket`, `oauth2`, or `oauth2ClientCredential` authentication (browser-based flows)
- Scenarios where credentials will be provided later via `update system`
- Explicit handling of systems that don't need credentials stored

#### 2. Real Connection Check Implementation

**Files Changed:**
- `src/cli/utils/system-connection.ts` - Implemented real Axios-based connection check
- `packages/store/src/secure-store/key-store.ts` - Changed log level from info to debug, removed credential count (security)

**Key Features:**
- ✅ Real HTTP connection check using `@sap-ux/axios-extension`
- ✅ Validates URL reachability before saving system
- ✅ Handles authentication types (basic, reentranceTicket, oauth2)
- ✅ Prompts user to save anyway if connection fails
- ✅ `--skip-check` flag to bypass connection validation
- ✅ Fixes Test 18 (connection check was always returning success)
- ✅ **SECURITY:** Removed credential count from log messages

**Test Coverage:**
- Connection success/failure scenarios
- Invalid URL handling
- User confirmation prompts
- Skip check flag behavior

#### 3. Smart URL Lookup & Credentials Display

**Files Changed:**
- `src/cli/utils/system-lookup.ts` **(NEW)** - Smart URL-based system lookup
- `src/cli/get/system.ts` - Use smart lookup, format credentials properly
- `src/cli/remove/system.ts` - Use smart lookup
- `src/cli/update/system.ts` - Use smart lookup  
- `src/i18n.ts` **(NEW)** - i18n localization module
- `src/translations/ux-create.i18n.json` **(NEW)** - Translation strings
- `package.json` - Added `i18next: 26.3.6` dependency
- `tsconfig.json` - Added JSON module resolution

**Key Features:**

**Smart URL Lookup Logic:**
1. Try exact match (URL + client)
2. If no match, find all systems with same URL (across all connection types)
3. If exactly one found, use it automatically
4. If multiple found, prompt user to select
5. If none found, return undefined

**Credentials Display:**
- Username shown as-is
- Password masked as `***` (length matches actual password)
- No credentials shown when both username/password are undefined
- Fixes Test 7 (`[object Object]` display issue)

**i18n Localization:**
- All user-facing strings moved to translation files
- 40+ translation keys organized hierarchically
- Follows `@sap-ux/store` i18n pattern
- Easy to add additional languages in future

**Test Coverage:**
- Exact match scenarios
- URL normalization (trailing slash removal)
- Multiple system selection
- Client mismatch handling
- Comprehensive test suite with 20+ tests
