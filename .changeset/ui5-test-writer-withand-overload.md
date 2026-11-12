---
"@sap-ux/ui5-test-writer": patch
---

FIX: Improve generated TypeScript OPA5 tests

- Remove obsolete `@sapui5/types` workaround casts now that upstream types are correct
- Restore checkbox-group comments and the `iClickLink` row index in the TS journey templates
- Preserve overloaded sub-object method signatures in generated `OpaJourneyTypes` (e.g. `iClickLink`), fixing a `TS2554: Expected 1 arguments, but got 2` type-check error
