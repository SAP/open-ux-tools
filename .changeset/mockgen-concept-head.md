---
"@sap-ux/mock-data-generator": minor
---

FEAT: Add a prototype head to the classifier for field concepts that have no semantic role

About half of the fields in real services match none of the classifier's semantic roles (purchasing
groups, controlling areas, authorization groups, profit centers …), so they fell through to the
fine-tuned tier or the typed floor. The classifier now carries a second head on the same encoder: 926
field concepts mined from owner-authorized service metadata, each represented by the average encoder
vector of its real example fields and paired with a bank of realistic synthetic values written offline.

A field that no role accepts takes the nearest concept when it is at least as close as the concept's own
examples and clearly closer than any other concept; keys, flags, UUIDs, framework fields and SAP Gateway
protocol sets never do. Its cells are then filled from the concept's bank, keeping a code and its text on
the same pair within a row, and the fine-tuned tier is not asked. Routing statistics report these
fields as `conceptAccepted`.

Across 131 real services the share of cells with recognised values rises from 49.6% to 52.5% and the
typed floor falls from 36.0% to 33.1%, with no service getting worse. Judges accepted 93.4% of the
head's decisions on held-out services. The trained role head and its release gates are unchanged.
