---
"@sap-ux/ui5-test-writer": patch
---

FIX: Split the V4 template buckets at 1.120 so apps below 1.120 no longer emit OPA5 assertions their runtime cannot support. The former 1.84 bucket now serves >=1.120 <1.148, and a new <1.120 (1.84) bucket omits iCheckSection, iCheckNumberOfSections and iCheckColumns (unavailable / empty column headers before 1.120).
