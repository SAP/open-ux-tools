---
'@sap-ux/create': patch
---

FIX: `migrate` now stops with a clear error message when a question cannot be answered because no input is available (for example in CI or with stdin redirected from `/dev/null`), instead of exiting silently with code 13
