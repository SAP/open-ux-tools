# MockGen field-to-value relevance guideline v1

Each item shows one field of an entity (name, label, description, primitive type, maximum length,
the entity and resource names, and the name of the entity's key property) together with one
proposed value. Decide whether the value is relevant for that field.

- `relevant: true` when a domain expert would accept the value as a realistic, on-topic value for
  this specific field in this entity: its meaning, format and granularity fit the field (for
  example a product category name in a category field, a city in a city field, a free-text
  comment in a comment field, a plausible code in a code field).
- `relevant: false` when the value clearly belongs to a different kind of field or business
  domain (for example a person name in a product-category field, a street address in a job-title
  field, a currency code in a colour field), is instruction-like or meta text, or its format
  cannot fit the field (for example exceeds the maximum length or is the wrong kind of token).
- Generic text fields (descriptions, notes, comments) accept on-topic prose for the entity; prose
  about an unrelated domain is not relevant.
- Judge only the pair shown. Do not assume the value is correct because it looks well formed.
