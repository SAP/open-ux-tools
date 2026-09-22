# MockGen semantic role adjudication guideline v3

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

Names, texts, titles, labels and descriptions (identifier ending in Name, Text, Title, Label,
Desc or Description, or a bare `name`/`title`/`text`/`label`):
- Use the specific registered name role when the entity or the owner code makes it evident:
  `person_first_name`, `person_last_name`, `person_full_name` for people; `org_name` for
  organizations, companies, suppliers, customers-as-organizations, agencies, airlines;
  `product_name` for products, materials, articles; `country_name`, `currency_name`,
  `region_name`, `language` display names for those codes; `city`, `street_address` for
  address parts.
- Otherwise a human-readable caption or short description of the entity or of a linked code
  (`Product.name`, `Book.title`, `Category.name`, `StatusText`, `TypeDescription`) is
  `description`, not `unknown`.
- Free-form multi-sentence text (notes, comments, remarks, reviews, posts, messages) is
  `long_text`.
- Use `unknown` for such fields only when the entity is technical (draft administration, logs,
  configuration, authorization) or when the identifier does not say what is named.

Product, equipment and measurement roles (added in v3):
- `manufacturer`: the company that makes a product, device, vehicle, machine or component
  (Manufacturer, ManufacturerName, Producer, Make of a vehicle). Not the seller, supplier, vendor
  or customer — those are `org_name` when they name an organization.
- `product_model`: the model designation of a product, device, vehicle or machine (Model,
  ModelName, ModelNumber, ModelCode of equipment). Not a data model, view model, business-object
  model, machine-learning model or pricing/billing model — those are `unknown`.
- `distance`: a numeric length or distance magnitude (Distance, Mileage, Odometer reading, travel
  or route length). Not the unit code beside it — that is `unit_of_measure` — and not a duration.
- `rating`: a numeric or ordinal score expressing quality or satisfaction (Rating, Stars, review
  Score on a small fixed scale). Not a credit or risk grade — that is `credit_rating` — and not a
  priority, severity or ranking position.

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
