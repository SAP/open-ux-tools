---
"@sap-ux/mock-data-generator": patch
---

FIX: Never let the model answer null for a field it is asked to fill

Under runtime contract 2 the grammar no longer offers `null` for model fields, even when the column is
nullable; a null only published an empty cell where the typed floor already had a value.
