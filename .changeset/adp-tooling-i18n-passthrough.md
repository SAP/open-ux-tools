---
"@sap-ux/adp-tooling": patch
---

FIX: Pass i18n .properties requests through to the base app proxy in ADP preview

The ADP preview proxy used to 302-redirect any request whose path matched a file
in the ADP webapp folder. For i18n .properties files this incorrectly substituted
the partial ADP bundle for the base app's complete bundle, hiding all base
translations and breaking annotation-side `{@i18n>...}` bindings (e.g. column
header labels in `UI.LineItem`). The runtime descriptor merge
(`appdescr_ui5_addNewModelEnhanceWith`) already handles ADP enhancement at the
model layer; substituting the file at the proxy layer was wrong. Now i18n
.properties requests fall through to the next middleware so the base app's
complete bundle is loaded, and the ADP's customer-prefixed keys still merge in
correctly via the manifest change. Covers default bundles, locale variants
(`i18n_de.properties`), and per-page bundles
(`/i18n/ListReport/<entity>/i18n.properties`).
