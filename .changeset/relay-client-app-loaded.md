---
"@sap-ux/preview-middleware": patch
---

FEAT: the RTA relay browser client waits for the editor's `app-loaded` signal before `__ready__`/`startRTA` adopt the UI adaptation, listening for the same same-origin `[ext] app-loaded` post-message the Playwright transport uses (cross-origin senders are ignored). The listener is installed only in the top document, and the wait is a soft gate ahead of the existing RTA-instance check.
