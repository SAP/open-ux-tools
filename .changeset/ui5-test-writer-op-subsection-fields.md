---
"@sap-ux/ui5-test-writer": patch
---

FIX: Generate form field checks for Object Page standard form sections. The generator read the spec-model aggregation under the key `subSections`, but `@sap/ux-specification` emits it as `subsections`, so sections structured as CollectionFacet → ReferenceFacet (e.g. GeneralInformation) produced only a shallow `iCheckSection` with no `iCheckSubSection`/`iCheckField` checks.
