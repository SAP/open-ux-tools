---
"@sap-ux/ui5-test-writer": patch
---

FIX: Object Page OPA tests now use the correct sub-section id for CollectionFacets whose children are only FieldGroup/Identification facets. Fiori elements renders these as a single sub-section inheriting the CollectionFacet id (with one FormContainer per FieldGroup), so the generated `iCheckSubSection`/`onForm` calls no longer reference non-existent per-FieldGroup ids (e.g. `FieldGroup::Q1`).
