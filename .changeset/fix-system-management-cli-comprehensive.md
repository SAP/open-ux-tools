---
'@sap-ux/create': minor
'@sap-ux/store': patch
---

FIX: comprehensive system management CLI improvements (Issue #39060)

This changeset addresses multiple issues in the @sap-ux/create system management CLI commands (add system, update system, remove system, get system, list systems).

**@sap-ux/create changes:**

- Add `--no-credentials` flag to explicitly skip credential prompts for mock/test systems
- Make username/password prompts conditional on authenticationType (only prompt for 'basic' auth)
- Add informational message for reentranceTicket authentication about browser-based login
- Implement smart URL-only lookup that finds systems even when client doesn't match exactly
- Implement real HTTP connection check with proper error handling (replaces stub implementation)
- Add "Clear Credentials" option to update system multiselect with confirmation prompt
- Add consistent "System was not added/updated" confirmation messages on all failure paths
- Add complete i18n localization infrastructure with 40+ translation keys
- Fix credential display format to show `username / ***` instead of `[object Object]`

**@sap-ux/store changes:**

- SECURITY: Remove credential count from log messages (per user request)
- Change log level from `info` to `debug` for credential retrieval messages

**Fixes from QA Issue #39060:**
- Test 1: Spacing and credential count in logs (security fix)
- Test 5: Re-entrance ticket authentication prompts
- Test 7: Credentials display formatting
- Test 8: Clear credentials option
- Test 14: Smart URL lookup with client mismatch
- Test 15: Missing "System was not saved" messages
- Test 18: Real connection check implementation

**Test Coverage:**
- All new tests passing (5/5 for --no-credentials flag)
- system-connection tests: 22/22 passing
- Overall coverage: 93.8%
