---
"@sap-ux/create": patch
---

fix(create): replace `change system` with canonical `update system` command

The original TBI (#37734) specified the command as `update system`, but the initial implementation used `change system`. This patch introduces `update system` as the canonical command and fully removes `change system` (which had not yet been in a stable release).
