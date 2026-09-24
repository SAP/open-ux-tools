---
"@sap-ux/mock-data-generator": patch
---

FIX: Do not let a model string end in an escape that cannot complete

Under runtime contract 2, a string that had no letter or digit yet could take a backslash one character
before its maximum length; since `\u` escapes are not written, nothing could follow and the model call
for that entity failed. The backslash is no longer offered there.
