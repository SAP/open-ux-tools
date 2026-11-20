---
"@sap-ux/i18n": patch
---

fix: keep `.properties` values that start with `#`, `!`, `=` or `:` when parsing, instead of treating them as comments or a second separator
