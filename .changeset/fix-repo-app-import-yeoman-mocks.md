---
"@sap-ux/repo-app-import-sub-generator": patch
---

fix(repo-app-import-sub-generator): fix async mock functions in tests for ESM compatibility

Fixed async mock functions in app.test.ts to return resolved promises. The validators mock now properly mocks `validateAppSelection` as an async function with `mockResolvedValue(true)`, and download-utils mock now includes `downloadApp` with `mockResolvedValue(undefined)`. This prevents test hangs due to unresolved promises in ESM mode.

Note: 4 yeoman-test integration tests still timeout at 30s due to the heavy generator lifecycle execution in ESM mode. These tests may need increased timeout values or conversion to unit tests.
