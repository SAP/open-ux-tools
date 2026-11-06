---
'@sap-ux/mock-data-generator': patch
---

FIX: Generate mock data a Fiori elements app can open with the SAP Fiori elements mockserver

Write every row of a draft-enabled entity as an active instance without a draft (`IsActiveEntity` true, `HasActiveEntity` true, `HasDraftEntity` false, the initial draft UUID of a draft key and no draft administration data), as the mockserver loads mock data, so a list row opens its object page and its child tables.

Resolve a navigation without a referential constraint through the reference its target declares back to its source, as the mockserver does, instead of inferring a key-to-key mapping that tied child keys to parent keys.

Link the children of every to-many navigation to their parent as the mockserver lists them, so every object page table shows rows: an OData V2 association whose referential constraint names the parent as principal now references the parent from its dependents, an OData V2 navigation whose association declares no constraint is inferred like an OData V4 one, and the children of a navigation without any declared reference share the key values by name the mockserver matches.

Generate the rows of an entity set whose rows reference a parent row of the same set as a hierarchy without cycles: every row's parent is an earlier row, and the first row is the root, without a parent when the reference may be empty.

Keep every row of an entity set whose inferred references could not be satisfied together with its declared ones: a reference inferred through two or more properties that a declared reference maps to another entity set gives way to the declared one; a parent that declares some keys of its children as properties of its own, not its key, takes their values from a child row instead of the children taking them from the parent; and keys that references tie to one value domain are generated with one semantic role, so their values match. An OData V2 association whose constraint names principal properties other than the principal's key, and the dependent's complete key, is read as the principal referencing the dependent, so the dependent keeps its own key values.

Keep the empty reference of a hierarchy's root row when the reference has a value list: the last-resort fill no longer copies a value-help value into a relationship column.

Keep the draft flags of an active row when the name of a child entity set holds the word of a flag: the draft framework's keys and flags are never derived from children.

Give the parents without children theirs first when rows are generated next to existing rows: new children reference the parents fewest existing rows reference, so new parents no longer open an empty table.

Read the alternate keys of an entity type (`Core.AlternateKeys`). The realism report gains the `identifier-unique` check, which reports generated rows that repeat an alternate key or the properties a declared to-one reference selects its row by. Both identifier checks now also count a generated row that repeats a supplied row's identifier (realism checks version 9).

Derive count and presence fields from the relationships of a service once rather than once per entity set, so a service with thousands of entity sets is generated in seconds again.

New parent rows that no new child row references, because the child set holds fewer new rows, are reported with `CHILD_ROWS_FEWER_THAN_PARENTS`; value-list and code-list rows are not.
