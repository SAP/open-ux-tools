---
"@sap-ux/mock-data-generator": patch
---

FIX: Generate every service whose metadata has unsupported types, dangling references or narrower foreign keys

Generating a whole service failed for about one in ten real SAP services because of one element:

- A property of a type with no JSON value (`Edm.Stream`, geography types, invalid type names) rejected
  the whole metadata document. It is now left out of the generated rows with a
  `SCHEMA_PROPERTY_OMITTED` diagnostic; OData serves streams through media links, never inline.
- An entity set whose entity type, base type or key cannot be resolved is left out with a
  `SCHEMA_ENTITY_SET_SKIPPED` diagnostic instead of failing the service. Relationships that name
  undeclared properties are ignored, blank key references are ignored, and a decimal precision of 0
  is treated as unspecified. OData V4 enumeration properties are generated from their member names.
- A foreign key that declares a shorter length or a different type than the key it references
  received values that did not fit it. Referenced keys are now generated within the facets of every
  foreign key that copies them.
- Binary values ignored their declared maximum length, and derived counts could overwrite keys,
  relationship fields and phone numbers, which produced duplicate keys and invalid values.
- A format role (email, phone, country, currency, IBAN, BIC, URL) on a field whose value another field
  supplies — a foreign key, a value-help parameter or a text companion — is kept only when the
  supplying field has the same role.
