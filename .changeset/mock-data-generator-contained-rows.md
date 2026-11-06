---
'@sap-ux/mock-data-generator': minor
---

FEAT: Generate the rows of contained entity types and write them inside the rows that contain them

An entity type that has no entity set and that another type contains (OData V4 `ContainsTarget`) now gets rows when the set that contains it is requested. They are written under the containment navigation of each new container row, as the SAP Fiori elements mockserver reads them: a list for a to-many navigation and a list of one row for a to-one navigation, at any depth. Each new container row holds at least one contained row before any holds two, and a contained row takes the values it shares with its container: the properties its referential constraint copies, or else the keys both declare by name. Supplied rows are published unchanged. Contained rows no container can hold are reported with `ROW_COUNT_REDUCED_CONTAINER_LIMIT`, and container rows left without one with `CONTAINED_ROWS_FEWER_THAN_CONTAINERS`.
