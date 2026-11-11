# ABAP RAP: Text & ID Rendering (Short Version)

## Critical Rules

1. **Put UI and value-help annotations on the projection view (`ZC_*`)**, not the interface view (`ZR_*`).
2. **Value-help entities must be reachable through the service.**
3. **Hide UUIDs, don't remove them.**
   - ✅ `@UI.hidden: true`

---

## Show Business ID Instead of UUID

When users should see `AgencyID` instead of `AgencyUUID`:

```abap
@ObjectModel.text.element: [ 'AgencyID' ]
@UI.textArrangement: #TEXT_LAST
AgencyUUID,
```

Possible renderings:

| Value | Result |
|---------|---------|
| `#TEXT_FIRST` | Agency Name (70007) |
| `#TEXT_LAST` | 70007 (Agency Name) |
| `#TEXT_ONLY` | Agency Name |
| `#TEXT_SEPARATE` | 70007 |

---

## Hide UUID Fields

For technical keys:

```abap
@UI.hidden: true
key TravelUUID,

@UI.hidden: true
ParentUUID,
```

---

## Friendly Labels (Optional)

```abap
@EndUserText.label: 'Agency ID'
AgencyUUID;

@EndUserText.label: 'Customer ID'
CustomerUUID;
```

---

## Value Help (Most Common Pattern)

### Value Help View with UUID

```abap
@ObjectModel.supportedCapabilities: [ #VALUE_HELP_PROVIDER ]
@ObjectModel.representativeKey: 'SupplierUUID'
define view entity Z_I_SUPPLIER_VH
as select from zsupplier
{
  @UI.hidden: true
  key SupplierUUID,

  @Semantics.text: true
  Name,

  @ObjectModel.text.element: [ 'Name' ]
  SupplierID
}
```

### Consumption

```abap
define root view entity ZC_ENTITY
  provider contract TRANSACTIONAL_QUERY
  as projection on ZR_ENTITY
{
   key UUID,
   // ... other fields ...

   @Consumption.valueHelpDefinition: [ {
      entity.name:    'Z_I_SUPPLIER_VH',
      entity.element: 'SupplierID',                          // ← readable ID, NOT the UUID
      useForValidation: true
   } ]
   SupplierUUID,

   // ... other fields ...
}
```

**Important:** Bind to the business ID (`SupplierID`), not the UUID.
---

## Value Help With Business ID Only (No UUID)

Use this pattern when the value-help entity has **no UUID** — only a business key (e.g. `SupplierID`). This is the simplest and most common case for master data without technical keys.

> **✅ CRITICAL:** You do **NOT** need to add an association to the value help view in the projection. The `@Consumption.valueHelpDefinition` annotation alone is sufficient for the value help to work.

> **🎯 TEXT ARRANGEMENT IN RAP IS HANDLED BY THE FRAMEWORK:**
> - Configure `@ObjectModel.text.element` and `@UI.textArrangement` **ONLY in the value help view**
> - The framework **automatically applies** this text arrangement to the consuming field when referenced via `@Consumption.valueHelpDefinition`
> - **DO NOT duplicate** these annotations on the consuming projection view field
> - **DO NOT add extra fields** like `_Agency.Name as AgencyName` to the projection view
> - The value help view configuration controls BOTH the value help dialog display AND the field display in forms/tables

### Value Help View

```abap
@ObjectModel.dataCategory: #VALUE_HELP
define view entity Z_I_SUPPLIER_VH
as select from zsupplier_vhk
{
  @ObjectModel.text.element: [ 'SupplierName' ]
  @UI.textArrangement: #TEXT_FIRST              // ← This controls display in BOTH dialog AND consuming fields
  key SupplierID,
  
  @Semantics.text: true
  SupplierName
}
```

### Consumption on the Projection View (`ZC_*`)

```abap
@Consumption.valueHelpDefinition: [{
  entity.name: 'Z_I_SUPPLIER_VH',
  entity.element: 'SupplierID',
  useForValidation: true
}]
SupplierID,
```
- **Do not add** `@ObjectModel.text.element` or `@UI.textArrangement` here
- **Do not add** association to the value help view
- **Do not expose** extra text fields (e.g., `_Supplier.Name as SupplierName`)
- The framework handles text retrieval and display automatically from the value help view

---

## Dropdown vs Value Help Dialog

**Key Rule:** `@ObjectModel.resultSet.sizeCategory: #XS` changes the value help from a **dialog** to a **dropdown**.

### Dropdown (Fixed Values List)

Add this annotation to the **value help view**:

```abap
@ObjectModel.resultSet.sizeCategory: #XS
```

**Effect:** Instead of opening a dialog with search/filter, the field shows a dropdown list directly in the filter bar and forms.

**Use for:**
- Status fields (Open, In Progress, Completed)
- Category/Type fields
- Small reference lists (< 10-20 values)
- Any enumeration or code list

### Value Help Dialog (Searchable)

**Delete** `@ObjectModel.resultSet.sizeCategory: #XS` from the value help view.

**Effect:** Opens a full dialog with search, filter, and multi-column selection.

**Use for:**
- Master data (Suppliers, Customers, Products)
- Large reference lists (> 20 values)
- When users need to search/filter before selecting

---

## Creating Value Help Views Programmatically

**CRITICAL:** Value help CDS views CAN be created programmatically. Do NOT tell users to create them manually in Eclipse unless programmatic creation fails.

### Workflow

1. **Create the CDS view**:
   - List available creatable object types → find "Data Definition"
   - Get creation details and required fields
   - Validate the input parameters
   - Get transport request (empty for local packages like $TMP)
   - Create the view (generates a template with placeholder)

2. **Edit the generated template**:
   The creation step generates a skeleton with `DATA_SOURCE_NAME` placeholder.
   Immediately edit the file to replace it with the actual view definition.

3. **Activate**:
   - Activate the view to make it available in the system

4. **Expose in service definition**:
   - Edit service definition to add: `expose Z_I_*_VH as *ValueHelp;`
   - Activate the updated service definition

5. **Republish service binding**:
   - List available actions to find publish/unpublish operations
   - Unpublish the service binding
   - Republish to reload metadata with the new value help entity

### Complete Example: Status Dropdown

```abap
@AbapCatalog.viewEnhancementCategory: [#NONE]
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Value Help for Sales Order Status'
@Metadata.ignorePropagatedAnnotations: true
@ObjectModel.usageType: {
  serviceQuality: #A,
  sizeCategory:   #S,
  dataClass:      #MASTER
}
@ObjectModel.supportedCapabilities: [ #VALUE_HELP_PROVIDER ]
@ObjectModel.representativeKey: 'Status'
@ObjectModel.resultSet.sizeCategory: #XS
@Consumption.valueHelpDefault.fetchValues: #AUTOMATICALLY_WHEN_DISPLAYED
define view entity Z_I_SOSTATUS_VH
  as select from zzsosalesorder
{CRITICAL: Changes value help from dialog to dropdown**
- `@Consumption.valueHelpDefault.fetchValues: #AUTOMATICALLY_WHEN_DISPLAYED` — preloads values automatically
- `@UI.textArrangement: #TEXT_ONLY` on Status field — shows only text, hides code
- `@ObjectModel.text.element: [ 'StatusText' ]` — links Status to its description
- `@Semantics.text: true` on StatusText — marks it as the text provider

**Without `#XS`:** Opens a value help dialog  
**With `#XS`:** Shows a dropdown list
      @Semantics.text: true
      status as StatusText
}
group by status
```

**Key annotations for dropdown**:
- `@ObjectModel.supportedCapabilities: [ #VALUE_HELP_PROVIDER ]` — marks as value help
- `@ObjectModel.representativeKey: 'Status'` — the key field to return
- `@ObjectModel.resultSet.sizeCategory: #XS` — **THIS makes it a dropdown instead of dialog**
- `@Consumption.valueHelpDefault.fetchValues: #AUTOMATICALLY_WHEN_DISPLAYED` — preloads values
- `@UI.textArrangement: #TEXT_ONLY` on Status field — shows only text, hides code
- `@ObjectModel.text.element: [ 'StatusText' ]` — links Status to its description
- `@Semantics.text: true` on StatusText — marks it as the text provider

### Consumption Pattern

On the projection view (`ZC_*`):

```abap
@Consumption.valueHelpDefinition: [{
  entity.name: 'Z_I_SOSTATUS_VH',
  entity.element: 'StatusCode',
  useForValidation: true
}]
@ObjectModel.text.element: ['StatusText']
@UI.textArrangement: #TEXT_ONLY
Status,
```

### Service Definition

Must expose the value help entity:

```abap
define service ZZSOUI_SALES_ORDER_VHK_O4 provider contracts odata_v4_ui {
  expose ZZSOC_SALESORDER as SalesOrder;
  expose Z_I_SOSTATUS_VH as StatusValueHelp;  // ← REQUIRED
}
```

**Rule:** Value help entities MUST be exposed in the service definition (RAP Rule #2).

---

## Hide Admin Fields

Usually hide:

- `LocalCreatedBy`
- `LocalCreatedAt`
- `LocalLastChangedBy`
- `LocalLastChangedAt`
- `LastChangedAt`

Simplest approach:

Remove their UI annotations from the `.ddlx` metadata extension.

Keep fields in metadata for draft/ETag support.

---

## Refresh Cycle

After any annotation change:

1. Activate CDS
2. Activate `.ddlx`
3. Refresh local metadata (optional)

```bash
npx --yes @sap-ux/create@latest update service-metadata .
```

---

## Most Common Pitfalls

| Problem | Fix |
|----------|-----|
| UUID still visible | Add `@UI.hidden: true` |
| Draft broken | Remove `@Consumption.hidden: true` |
| Dialog shows GUIDs | Bind value help to business ID, not UUID |
| Value help not appearing | Check service definition exposes the VH entity |
| Programmatic creation fails | Use exact object type (e.g., `DDLS/DF` not just `DDLS`) when creating data definitions |
| Service activation fails with "Entity does not exist" | Value help view must be created and activated BEFORE exposing in service |
| Text not showing, only code | Add `@Semantics.text: true` on text field and `@ObjectModel.text.element` on key |

## Troubleshooting Workflow

### Value Help Not Working

1. **Check projection view** (`ZC_*`):
   - `@Consumption.valueHelpDefinition` present with correct entity name
   - `entity.element` points to business ID, not UUID
   - `useForValidation: true` is set

2. **Check value help view** exists and is activated:
   - Search for the view by name pattern (e.g., `Z_I_*_VH`)
   - Verify it's activated in the system

3. **Check service definition** exposes the VH entity:
   - Read the service definition source
   - Look for `expose Z_I_*_VH` statement

4. **Check service is published**:
   - List available actions on the service binding
   - If "Unpublish" action is available, service is published
   - If only "Publish" is available, service needs publishing