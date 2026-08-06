---
"@sap-ux/store": major
---

FEAT: Merge ADT HTTP destinations (reentrance-ticket) from ~/.adtls/destinations.json into the backend system store as ABAP-on-BTP systems, tagged with a runtime-only ADT origin; reads/writes/deletes of these systems are routed to destinations.json and never written to systems.json. BREAKING: getAll()/read() now include ADT destinations for all store consumers; stored (systems.json) systems always take precedence on id collision.
