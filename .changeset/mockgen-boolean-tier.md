---
"@sap-ux/mock-data-generator": patch
---

FIX: Count non-key boolean cells as declared values instead of the typed floor

A boolean's type enumerates both of its values, as a declared enumeration does, and declared
enumerations already count as declared (T0). Non-key booleans were counted on the typed floor (T3),
which overstated it by several points on draft-enabled services. They now count as declared; boolean
keys such as `IsActiveEntity` still count as keys, and the typed floor's `booleans` cause stays in
the report as zero for existing consumers. Generated values are unchanged.
