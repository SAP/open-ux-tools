# MockGen semantic role adjudication guideline v1

You judge one field of an OData or CAP service at a time from structural metadata only: entity
name, property name, primitive type, key/nullable flags, facets, annotations, linked metadata
paths, relationship participation and neighbouring property names. You never see values.

Assign exactly one registered semantic role, or `unknown`.

Status family:
- `status`: any lifecycle, processing, workflow-state or business-object status of a document,
  booking, travel, incident, order, case, request, ticket, payment or similar object (for example
  a code that would hold values like open, in process, completed, cancelled, booked, released).
- `approval_status`: only the outcome state of an approval or release workflow step.
- `confidence_level`: only a confidence or certainty grade of an automated assessment.
- `data_enrichment_business_status`: only a business-status field produced by data enrichment.
- A linked status text or description column (the caption of a status code) is `description`
  when its owner code is the status; it is not a status code itself.

Other roles must match their evident meaning (for example `email`, `phone`, `city`,
`postal_code`, `country`, `currency`, `monetary_amount`, `quantity`, `unit_of_measure`, `date`,
`datetime`, `person_first_name`, `person_last_name`, `description`, `url`, `language`).
Prefer `unknown` when the meaning is not evident from the metadata, when the field is a technical
key, GUID, foreign key, draft-administration field, or when no registered role fits.

Flags:
- `supported`: true when a generator could produce sensible values for the assigned role without
  application-specific knowledge (formats such as email or postal code) or when the role is
  `status` (detection is supported even though value domains need evidence); false for `unknown`.
- `decisiveMetadata`: true only when an annotation, data element, value-help link or explicit
  type already determines the role without reading the property or entity name.

Never infer a role from the property name alone when the type, annotations or neighbours
contradict it. Do not guess. Rationale is at most 200 characters and must not restate metadata.
