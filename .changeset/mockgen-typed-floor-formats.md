---
"@sap-ux/mock-data-generator": patch
---

FEAT: Give typed-floor keys, strings and decimals realistic shapes without claiming a meaning

String keys of four or more characters that no semantic role fills now read as identifiers
(`...ID`/`...Number` keys become zero-padded numbers such as `10482917`) or as codes of the field's
initials (`ST0042`), still unique within their entity set and rotated per entity set. Short string
columns and `...Code` fields take code-shaped values instead of a label cut to a few letters, other
strings take the field label with its row number only when it fits the declared length, and typed
decimals keep at most four integer and four fraction digits within their precision and scale. The
values stay on the typed tier; no semantic role is assumed.
