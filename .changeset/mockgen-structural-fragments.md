---
"@sap-ux/mock-data-generator": patch
---

FIX: Reject model values that are code or JSON fragments

A model string that starts with closing punctuation, contains braces or backticks, or repeats a JSON key/value
separator is rejected and the field keeps its fallback value.
