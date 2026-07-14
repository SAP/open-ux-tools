---
"@sap-ux/adp-tooling": patch
---

FIX: Emit `{@i18n>...}` bindings for translated key-user annotation changes so the UI5 annotation processor resolves them (the plain `i18n` model is ignored for annotation changes and shadowed in Fiori Elements V2)
