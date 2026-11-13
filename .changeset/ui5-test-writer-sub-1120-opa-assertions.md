---
"@sap-ux/ui5-test-writer": patch
---

FIX: Split the V4 template buckets at 1.120 so apps below 1.120 no longer emit OPA5 assertions their runtime cannot support. The former 1.84 bucket now serves >=1.120 <1.148, and a new <1.120 (1.84) bucket omits iCheckSection, iCheckNumberOfSections and iCheckColumns (unavailable / empty column headers before 1.120). Object page sections that would be left with only a section-tab navigation and no assertion are now skipped entirely, so the generated journey no longer produces an OPA5 test that fails with "Expected at least one assertion, but none were run".
