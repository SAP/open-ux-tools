---
"@sap-ux/adp-tooling": patch
---

FIX: Revert the `/i18n/...properties` pass-through introduced in #4858.

The pass-through was structurally correct for the bug it targeted (substituting partial ADP bundles for the base app's complete bundle, which broke `{@i18n>...}` annotation lookups like `UI.LineItem` headers) — but it regresses adaptation projects whose `appdescr_variant` does not declare an `appdescr_ui5_addNewModelEnhanceWith` for the `i18n` model. Those projects previously relied on the local `/i18n/i18n.properties` being 302-redirected to surface ADP-local keys, and pass-through silently drops those keys.

The proper fix requires the backend merger to support `createIfMissing: true` on `appdescr_ui5_addNewModelEnhanceWith` so the generator can layer customer keys onto the FEV2-safe `@i18n` model unconditionally. That work is scoped at the merger side and cannot be safely downported in the current release window. Reverting until it ships and the generator emits the matching change.
