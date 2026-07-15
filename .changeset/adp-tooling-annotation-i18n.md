---
"@sap-ux/adp-tooling": patch
---

FEAT: Support annotation-based changes via the `@i18n` model. Generated adaptation projects register the `@i18n` model in the descriptor (enhancing an existing registration with `createIfMissing` when the base app already declares one, otherwise adding a new entry — never a duplicate). Translated key-user changes and rename/annotation changes authored in the adaptation editor extract their text into `i18n.properties` and bind against `{@i18n>...}`, so the UI5 annotation processor resolves them (the plain `i18n` model is ignored for annotation changes and shadowed in Fiori Elements V2).
