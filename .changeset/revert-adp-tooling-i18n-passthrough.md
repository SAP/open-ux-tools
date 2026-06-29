---
"@sap-ux/adp-tooling": patch
---

FIX: Revert the `/i18n/...properties` pass-through introduced in #4858.

In adaptation projects built on top of Fiori Elements V2 ListReport/ObjectPage base apps, FEV2's `TemplateComponent` rebuilds the `i18n` model on every template view, which shadows the ADP's local `i18n.properties` once requests fall through to the base app. Customer-defined keys are no longer reachable from inside the editor's bindings.

The proper fix requires moving customer keys to the FEV2-safe `@i18n` model (backend merger + generator changes) and cannot be safely downported in this release window. A corrected fix will be reapplied once that support is in place.
