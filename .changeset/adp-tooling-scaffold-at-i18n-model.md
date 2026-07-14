---
"@sap-ux/adp-tooling": patch
---

FEAT: Register the `@i18n` model in adaptation projects so annotation-change bindings (`{@i18n>...}`) resolve. New projects get the model from the generator scaffold; projects that predate this (and take-over of translated key-user changes) register it at write time. Enhances an existing `@i18n` model registration with `createIfMissing` when the base app already declares one, otherwise adds a new entry — never producing a duplicate the merger would reject.
