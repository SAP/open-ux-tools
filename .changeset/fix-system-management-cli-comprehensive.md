---
'@sap-ux/create': minor
'@sap-ux/store': patch
---

FIX: system management CLI improvements (Issue #39060)

**@sap-ux/create:**
- Add `--no-credentials` flag to skip credential prompts for non-basic auth scenarios
- Add i18n localization with 40+ translation keys
- Implement real HTTP connection check with proper error handling
- Add smart URL-only lookup (finds systems when client differs)
- Make username/password prompts conditional on authenticationType
- Fix credential display format and add "Clear Credentials" option

**@sap-ux/store:**
- SECURITY: Remove credential count from log messages
- Change credential retrieval log level from `info` to `debug`
