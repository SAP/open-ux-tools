# CAP Implementation — Text & ID Rendering

### Hide the technical GUID/UUID and instead show the business ID

Annotate the GUID foreign-key element with `@Common.ExternalID`, pointing to
the business-key property on the target entity (nested syntax):

```cds
annotate service.Travels {
    Agency   { ID @Common.ExternalID : Agency.AgencyID };
};
```

### Configure Text & TextArrangement on the business key

1) Place `@Common.Text` + `@Common.TextArrangement` on the **business-key
property** of the target entity. Choose the arrangement:

| Value | Rendered as | Use when |
|---|---|---|
| `#TextFirst` (recommended default) | `Hot Socks Travel (70007)` | Text is primary, id is secondary |
| `#TextLast`  | `70007 (Hot Socks Travel)` | ID is primary, text clarifies |
| `#TextOnly` | `Hot Socks Travel` | Users shouldn't see the ID at all |
| `#TextSeparate` | `70007` (text hidden in field, available for tooltip / filter chip) | Compact dropdowns |

```cds
annotate service.TravelAgencies with {
    AgencyID @(
        Common.Text            : Name,
        Common.TextArrangement : #TextFirst,
    )
};
```

**ℹ️ When to also annotate the association on the source entity**

- **If `@Common.ExternalID` is configured** on the association's `ID` (see the previous section), you do **not** need to annotate the association itself. The renderer resolves the ExternalID to the business key and inherits its `@Common.Text` / `@Common.TextArrangement` automatically — this is the recommended path for GUID/UUID foreign keys.
- **If `@Common.ExternalID` is not used** (e.g., the foreign key is already a human-readable code like `TravelStatus_code` and is rendered directly in a `UI.LineItem` / `UI.FieldGroup`), the text arrangement on the target entity's key is **not** inherited by the generated foreign-key column. In that case, annotate the association on the source entity so the renderer can resolve `@Common.Text` on the association itself:

```cds
annotate service.Travels with {
    TravelStatus @(
        Common.Text            : TravelStatus.name,
        Common.TextArrangement : #TextOnly,
    )
};
```

The `TravelStatus.name` path dereferences the association to reach the descriptive field on the target entity. Apply this pattern only for foreign keys that are **not** covered by `@Common.ExternalID`.

2) If value help (Common.ValueList) **already exists** on the association, then **remove the display-only parameter that points to the business key** (otherwise the business ID column would appear twice in the dialog):

> ⚠️ **Scope boundary:** Do **not** add a new `Common.ValueList` unless the user explicitly asked for value help. The steps in this guide (ExternalID + Text + TextArrangement) are sufficient to render the business ID in place of the GUID. Only modify an existing value help; do not create one.

> 💡 **Need to create a value help from scratch?** This skill assumes one already exists. For creating new `Common.ValueList` annotations, consult the **CDS MCP**.

```cds
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
                    ValueListProperty : 'AgencyID'
                }, // ❌ remove
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
};
```

**How it works:**
- `CollectionPath: 'TravelAgencies'` — the target entity set in the service
- `LocalDataProperty: Agency_ID` — the foreign key on `Travels` (generated from the managed association)
- `ValueListProperty: 'ID'` — the GUID primary key on `TravelAgencies`
- This is the **InOut** parameter — it binds the FK to the PK and drives the search/filter
- Additional `DisplayOnly` parameters show extra columns (Name, Street, City) in the value help dialog

### Configure Value Help as a fixed-values dropdown

Converting an existing value-help input into a dropdown is **always a three-step edit**. Perform the steps in this order and do **not stop early** — step 1 alone leaves dead annotations behind.

#### Step 1 — Add `Common.ValueListWithFixedValues : true`

For small, bounded code lists (status, category, type), add the flag as a peer of `Common.ValueList` on the association / foreign-key wrapper. This is what makes Fiori elements render a **dropdown (ComboBox)** instead of an input with a value-help dialog.

```cds
// TravelStatus is an association (managed or unmanaged)
annotate service.Travels with {
    TravelStatus @(
        Common.ValueListWithFixedValues : true,   // ← added
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'TravelStatus',
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut',
                  LocalDataProperty : TravelStatus_code,
                  ValueListProperty : 'code' },
                { $Type : 'Common.ValueListParameterDisplayOnly',
                  ValueListProperty : 'name' },
                { $Type : 'Common.ValueListParameterDisplayOnly',
                  ValueListProperty : 'criticality' },
            ],
        },
    )
};
```

#### Step 2 — Remove every `ValueListParameterDisplayOnly` entry

A fixed-values dropdown only renders the **key + its `@Common.Text`**. It never renders extra columns, so any `DisplayOnly` entry (e.g., `name`, `descr`, `criticality`) is dead weight and must be removed — **even if it was useful before the dropdown conversion**. Keep only the single `ValueListParameterInOut` entry.

```cds
annotate service.Travels with {
    TravelStatus @(
        Common.ValueListWithFixedValues : true,
        Common.ValueList : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'TravelStatus',
            Parameters : [
                { $Type : 'Common.ValueListParameterInOut',
                  LocalDataProperty : TravelStatus_code,
                  ValueListProperty : 'code' },
                // ❌ removed: ValueListParameterDisplayOnly → 'name'
                // ❌ removed: ValueListParameterDisplayOnly → 'criticality'
            ],
        },
    )
};
```

**Checklist before moving on:** The `Parameters` array now contains exactly one `ValueListParameterInOut` and zero `ValueListParameterDisplayOnly` entries.

#### Step 3 — Control the dropdown Values via `Common.Text` + `Common.TextArrangement`

Place both annotations on the **target entity's key** (not on the foreign-key field) so the dropdown shows the readable text instead of the raw code.

```cds
// TravelStatus entity (the target of the association)
annotate service.TravelStatus with {
    code @(
        Common.Text            : name,
        Common.TextArrangement : #TextOnly, // ← or #TextFirst / #TextLast / #TextSeparate
    )
};
```
---

## Common pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| UUID still visible | Common.ExternalID placed on wrong element, or SAP Fiori UI5 version too old | Re-check nested syntax on `{Assoc}.ID`; confirm UI5 ≥ supported version |
| Business ID column appears twice in value help dialog | Kept `ValueListParameterDisplayOnly` on the business key | Remove it from the Parameters array |
| CDS warning "Element Agency_ID has not been found" | Top-level `annotate … with { Agency_ID @… }` on managed association FK | Switch to nested syntax |
| TextArrangement ignored | Text/TextArrangement placed on the GUID instead of the business ID | Move both annotations to the business-key property |
| LineItem / FieldGroup still shows raw code (e.g., `A`, `B`) even though Text/TextArrangement are set on the target entity's key | Managed-association foreign key (e.g., `TravelStatus_code`) does not inherit text arrangement from the target entity, **and** `@Common.ExternalID` is not configured on the association's `ID` | Either (a) add `@Common.ExternalID` on the association's `ID` pointing to the business key — recommended for GUID/UUID FKs — **or** (b) annotate the association on the source entity: `annotate service.Travels { TravelStatus @Common.Text: TravelStatus.name @Common.TextArrangement: #TextOnly; };`. Do **not** do both. |
| Dropdown shows value help dialog instead | `Common.ValueListWithFixedValues` missing or on the wrong target | Place `@Common.ValueListWithFixedValues : true` as a peer of `Common.ValueList` on the association / foreign-key wrapper |
| Dropdown comes up empty for a `CodeList` foreign key | Target entity set not exposed in the service, or no seed CSV | Add a projection (e.g., `entity Currencies as projection on common.Currencies;`) and ship a seed CSV |
| Dropdown works but `Parameters` array still contains unused `DisplayOnly` entries (e.g., `name`, `criticality`) | Step 2 was skipped — only `ValueListWithFixedValues` was added | Remove **every** `ValueListParameterDisplayOnly` entry; a fixed-values dropdown only renders the key + its `@Common.Text` |
