---
'@sap-ux/feature-toggle': patch
---

fix(feature-toggle): resolve vscode synchronously to fix first-run feature toggle race after ESM migration

The async IIFE introduced during the ESM migration left `_vscodeInstance` as `null` on the first call into the module, because synchronous consumers (e.g. the ADP generator constructor) read the cache before the deferred `import('vscode')` microtask resolved. Subsequent calls within the same process worked because the IIFE had completed in the meantime — making the bug invisible in warm sessions.

Resolution now uses `createRequire(import.meta.url)` to load `vscode` synchronously at module evaluation time, restoring the pre-migration behavior. Public API is unchanged. A test-only helper `_setVSCodeInstanceForTesting` is exported so tests can inject a mock instance (the `vscode` module is not resolvable outside the VS Code extension host).
