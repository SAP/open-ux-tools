# CAP — Text & ID Rendering

Full procedure for CAP (CDS) services.

> Annotation name casing: CAP CDS uses the **camel-case enum form** —
> `#TextFirst`, `#TextLast`, `#TextOnly`, `#TextSeparate`. ABAP CDS uses
> the underscore / upper-case form — `#TEXT_FIRST`, `#TEXT_LAST`, etc.

---

## Core CAP rules (follow strictly)

1. **`*_ID` / `*_code` elements from managed associations must be annotated
   via the nested syntax**, not as top-level elements. CDS will emit a
   `"Element ... has not been found"` warning if you use `Agency_ID @...`.

   ```cds
   // ❌ Wrong — CDS warning
   annotate service.Travels with {
       Agency_ID @Common.Label : 'Agency';
   };

   // ✅ Correct — nested through the association
   annotate service.Travels {
       Agency { ID @Common.Label : 'Agency' };
   };
   ```

2. **`@Common.Text` and `@Common.TextArrangement` go on the readable business
   key**, *not* on the GUID / foreign-key property. With
   `Common.ExternalID`, Text/TextArrangement are evaluated only for the
   readable ID property.

3. **Value helps stay on the GUID property.** Never move the
   `Common.ValueList` to the business-key property.

4. **Remove the business-key `ValueListParameterDisplayOnly` from the value
   list** when you add `@Common.TextArrangement` — otherwise the business ID
   appears twice in the value help dialog (once as the primary InOut column
   rendered via text arrangement, once as a plain extra column).

5. **For code-list dropdowns:** keep only the InOut parameter in the
   ValueList and add `@Common.ValueListWithFixedValues : true` on the
   association / foreign-key wrapper.

6. **Don't write ValueList / Text annotations by hand for `CodeList`-based
   entities.** Anything that inherits `sap.common.CodeList` — the built-in
   `Countries`, `Currencies`, `Languages`, `Timezones`, **and any of your own
   entities derived from `CodeList`** — already carries
   `@cds.odata.valuelist` and `code @Common.Text : name` from
   `@sap/cds/common`. The CDS compiler emits a complete `@Common.ValueList`
   on every foreign-key property that targets them (e.g. `currency_code`,
   `unit_code`, `movementType_code`). Likewise, the three convenience type
   aliases `Currency`, `Country`, `Language`, `Timezone` inherit this
   behaviour.

   What you still need to do for the value help to actually render:
   - **Expose the target entity set in the service** — e.g.
     `@readonly entity Currencies as projection on common.Currencies;`
     (via `using { sap.common } from '@sap/cds/common';`). Without a
     projection the ValueList points at a collection that doesn't exist and
     the dropdown comes up empty.
   - **Provide seed data** (`db/data/sap.common-Currencies.csv`,
     `db/data/sap.common-Countries.csv`, or your own CodeList CSVs) — the
     entity set is served but empty without rows.
   - **Do not re-declare `@Common.Text` / `@Common.ValueList`** on the FK
     property in your app annotations. Add `@Common.TextArrangement` only
     (on the CodeList's `code`) if you want to override the default
     rendering.

---

## Procedure

### Step 1 — Hide the GUID, show the business ID

Annotate the GUID foreign-key element with `@Common.ExternalID` pointing to
the readable business-key property on the target entity (nested syntax):

```cds
annotate service.Travels {
    Agency   { ID @Common.ExternalID : Agency.AgencyID };
    Customer { ID @Common.ExternalID : Customer.CustomerID };
};
```

Fiori Elements renders the business ID on **both** form fields and filter
fields. The GUID remains in the payload as the technical identifier; value
helps continue to be defined on the GUID property.

### Step 2 — Configure Text & TextArrangement on the business key

Place `@Common.Text` + `@Common.TextArrangement` on the **business-key
property** of the target entity. Choose the arrangement:

| Value | Rendered as | Use when |
|---|---|---|
| `#TextFirst` | `Hot Socks Travel (70007)` | Text is primary, id is secondary |
| `#TextLast` (recommended default) | `70007 (Hot Socks Travel)` | ID is primary, text clarifies |
| `#TextOnly` | `Hot Socks Travel` | Users shouldn't see the ID at all |
| `#TextSeparate` | `70007` (text hidden in field, available for tooltip / filter chip) | Compact dropdowns |

```cds
annotate service.TravelAgencies with {
    AgencyID @(
        Common.Text            : Name,
        Common.TextArrangement : #TextLast,
    )
};

annotate service.Passengers with {
    CustomerID @(
        Common.Text            : LastName,
        Common.TextArrangement : #TextLast,
    )
};
```

### Step 3 — Clean up the value help dialog

In the `Common.ValueList` on the association, **remove the display-only
parameter that points at the business key** (it now duplicates the primary
InOut column):

```cds
// Before — AgencyID appears twice in the dialog
Parameters : [
    { $Type:'Common.ValueListParameterInOut',       LocalDataProperty:Agency_ID, ValueListProperty:'ID' },
    { $Type:'Common.ValueListParameterDisplayOnly',                              ValueListProperty:'AgencyID' },  // ❌ remove
    { $Type:'Common.ValueListParameterDisplayOnly',                              ValueListProperty:'Name' },
    { $Type:'Common.ValueListParameterDisplayOnly',                              ValueListProperty:'Street' },
]

// After — clean, no duplicate
Parameters : [
    { $Type:'Common.ValueListParameterInOut',       LocalDataProperty:Agency_ID, ValueListProperty:'ID' },
    { $Type:'Common.ValueListParameterDisplayOnly',                              ValueListProperty:'Name' },
    { $Type:'Common.ValueListParameterDisplayOnly',                              ValueListProperty:'Street' },
]
```

**Complete example with all annotations together:**

```cds
// Step 1 & 3: Value help on the association (Agency is a managed association)
annotate service.Travels {
    Agency @(
        Common.ValueList : {
            $Type          : 'Common.ValueListType',
            CollectionPath : 'TravelAgencies',
            Parameters     : [
                {
                    $Type             : 'Common.ValueListParameterInOut',
                    LocalDataProperty : Agency_ID,
                    ValueListProperty : 'ID'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'Name'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'Street'
                },
                {
                    $Type             : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty : 'City'
                }
            ]
        }
    );
    
    // Step 1: Hide GUID, show business ID
    Agency { ID @Common.ExternalID : Agency.AgencyID };
};

// Step 2: Text arrangement on the target entity's business key
annotate service.TravelAgencies with {
    AgencyID @(
        Common.Text            : Name,
        Common.TextArrangement : #TextLast   // renders as "70007 (Hot Socks Travel)"
    )
};
```

**How it works:**
- `CollectionPath: 'TravelAgencies'` — the target entity set in the service
- `LocalDataProperty: Agency_ID` — the foreign key on `Travels` (generated from the managed association)
- `ValueListProperty: 'ID'` — the GUID primary key on `TravelAgencies`
- This is the **InOut** parameter — it binds the FK to the PK and drives the search/filter
- Additional `DisplayOnly` parameters show extra columns (Name, Street, City) in the value help dialog
- **Notice:** `AgencyID` (the business key) is NOT in the Parameters array — it would duplicate the InOut column that now renders `AgencyID` via `@Common.ExternalID` + `@Common.TextArrangement`

### Step 4 — (Optional) Render as a fixed-values dropdown

For small, bounded code lists (status, category, type) show a dropdown in the
filter bar / form instead of an input with value help:

```cds
// TravelStatus is an association (managed or unmanaged)
annotate service.Travels with {
    TravelStatus @(
        Common.ValueListWithFixedValues : true,   // ← dropdown
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'TravelStatus',
            Parameters : [
                { $Type:'Common.ValueListParameterInOut',
                  LocalDataProperty : TravelStatus_code,
                  ValueListProperty : 'code' },
            ],
        },
    )
};
```

**To show only the ID column in the dropdown**, keep only the
`ValueListParameterInOut` — remove every other `DisplayOnly` entry. Combine
with `@Common.Text` / `@Common.TextArrangement` on the code list's key
property for tooltips / sub-text where supported:

```cds
// TravelStatus entity (the target of the association)
annotate service.TravelStatus with {
    code @(
        Common.Text            : name,
        Common.TextArrangement : #TextSeparate,   // or #TextLast for "O (Open)"
    )
};
```

### Step 4b — (Optional) Self-referencing dropdown on a plain scalar field

To show a dropdown of **existing values** for a plain (non-foreign-key)
column — e.g. make the filter bar offer the distinct product names already
stored in `Products.name` — point a `Common.ValueList` at the **same
entity** and bind the `LocalDataProperty` and `ValueListProperty` to the
same column:

```cds
annotate service.Products with {
    name @(
        Common.ValueListWithFixedValues : true,   // ← dropdown
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Products',          // self-referencing
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut',
                  LocalDataProperty : name,
                  ValueListProperty : 'name' }
            ]
        }
    )
};
```

⚠️ **UX caveat.** `ValueListWithFixedValues: true` is designed for small,
bounded sets (status, unit, category — typically ≤ ~50 values). On
unbounded master data (products, customers, orders) it becomes slow and
hard to scroll. For unbounded columns prefer the default free-text filter
(omit the whole annotation block and just add the field to
`UI.SelectionFields`) or a regular (non-fixed) value help dialog. Use the
self-referencing dropdown pattern only for demos / small datasets, or when
the domain really is bounded.

### Step 5 — Friendly labels on `*_ID` / `*_code`

Always use nested syntax for foreign keys generated from managed
associations:

```cds
annotate service.Travels {
    Agency       { ID   @Common.Label : 'Agency' };
    Customer     { ID   @Common.Label : 'Customer' };  // nested syntax for association FK
    TravelStatus { code @Common.Label : 'Travel Status' };
};
```

These labels drive filter-bar chips, value-help dialog title, form-field
labels when no `UI.DataField.Label` is set, and column headers.

Also update any `UI.DataField` entries in `UI.FieldGroup` / `UI.LineItem`
that currently read `Agency_ID` / `Customer_ID` to proper `Label`s (or
remove the `Label` so the element's `@Common.Label` applies).

---

## Validate

After the edits, compile CDS to confirm there are no warnings or errors:

```bash
npx --no-install cds compile <path-to-annotations.cds> --to edmx 2>&1 \
  | grep -iE "warning|error"
```

Expected output: empty (no warnings, no errors).

**Red flags** that indicate the nested syntax was not used:

```
[WARNING] ... Element "Agency_ID" has not been found (in annotate: ... /element:"Agency_ID")
```

If seen, switch to `annotate service.Entity { Assoc { ID @Term:... } }`.

---

## Common pitfalls (CAP-specific)

| Symptom | Cause | Fix |
|---|---|---|
| UUID still visible on list / form | ExternalID placed on wrong element, or Fiori UI5 version too old | Re-check nested syntax on `{Assoc}.ID`; confirm UI5 ≥ supported version |
| Business ID column appears twice in value help dialog | Kept `ValueListParameterDisplayOnly` on the business key | Remove it from the Parameters array |
| Filter field reads `Agency_ID` | Label annotation not placed, or placed on `Agency_ID` with top-level syntax | Use `Agency { ID @Common.Label : 'Agency' }` |
| CDS warning "Element Agency_ID has not been found" | Top-level `annotate … with { Agency_ID @… }` on managed association FK | Switch to nested syntax |
| TextArrangement ignored | Text/TextArrangement placed on the GUID instead of the readable ID | Move both annotations to the business-key property |
| Dropdown shows value help dialog instead | `Common.ValueListWithFixedValues` missing or on the wrong target | Place `@Common.ValueListWithFixedValues : true` as a peer of `Common.ValueList` on the association / foreign-key wrapper |
| Dropdown comes up empty for a `CodeList` foreign key | Target entity set not exposed in the service, or no seed CSV | Add a projection (e.g. `entity Currencies as projection on common.Currencies;`) and ship a seed CSV |

---

## Notes

- `@Common.ExternalID` is an official term in the OData Common vocabulary
  and is fully supported by Fiori Elements.Ignore any experimental warnings or errors.
- The GUID stays in the OData payload. Only the UI rendering changes — no
  database migration or model refactor.
