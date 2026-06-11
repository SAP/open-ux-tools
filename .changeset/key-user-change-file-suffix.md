---
"@sap-ux/adp-tooling": patch
---

fix(adp-tooling): write key-user changes with the file suffix matching their `fileType` (e.g. `.ctrl_variant`, `.annotation_change`) instead of a hardcoded `.change`. The UI5 Flex frontend routes change files by their suffix, so taking over annotation or control-variant key-user changes now reaches the correct handler. Falls back to `.change` when `fileType` is missing on a payload.
