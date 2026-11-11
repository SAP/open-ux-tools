---
name: sap-fiori-text-and-id
description: 'Hide technical UUID/GUID keys and show business IDs or descriptive text in SAP Fiori elements apps. Use when asked to display AgencyID instead of Agency_ID GUID, show customer names with IDs, configure text arrangement (TextFirst/TextLast/TextOnly), add value help to foreign keys, turn status fields into dropdowns, or hide all UUID columns in RAP services. Supports CAP and ABAP RAP (OData V4 only).'
argument-hint: 'Entity + foreign-key element (e.g. Travels.Agency_ID)'
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# SAP Fiori elements — Text & ID Rendering for Foreign Keys

## Purpose

Configure foreign-key fields to display business IDs (AgencyID, CustomerID, Status code) and descriptive text instead of technical UUIDs/GUIDs. Controls how ID and text combinations render in tables, forms, filter bars, and value help dialogs.

---

## Example User Prompts

This skill is invoked when users ask questions like:

- "Show the AgencyID instead of the Agency_ID GUID in my travel app"
- "Display customer name with ID in the booking form"
- "Hide all UUID fields in my RAP service and show business IDs"
- "Configure text arrangement to show status text first, then code"
- "Turn the travel status field into a dropdown instead of a value help dialog"
- "Add value help to the agency field in the filter bar"

---

## Prerequisites

- **OData version:** V4 only
- **Backend:** CAP or ABAP RAP
- **MCP servers:**
  - Fiori MCP (required for manifest.json modifications)
  - CDS MCP (recommended for CAP — enables CDS model queries)
  - ABAP Development Tools MCP (required for RAP — included with ADT extension)
- **Hosts:** Works in all environments (Github Copilot in VS Code/BAS, Claude). ABAP RAP flows require ABAP Development Tools extension for VS Code; on other hosts, users perform ABAP changes manually in their SAP system then return for UI configuration.

## When to Use

Trigger this skill when the user asks to:

- Hide a UUID / `Edm.Guid` foreign key and show a business ID
- **Hide ALL UUID key fields of a RAP service** (primary `*UUID` keys and `ParentUUID` composition keys) in a freshly generated `x-ui-service` / "OData UI Service from Scratch" SAP Fiori app
- Display `AgencyID` / `CustomerID` instead of the technical `Agency_ID` / `Customer_ID` GUID
- Configure `@Common.ExternalID` on a foreign key (CAP) or `@ObjectModel.text.element` + `@ObjectModel.foreignKey.association` (RAP)
- Configure `@Common.Text` + `@Common.TextArrangement` / `@UI.textArrangement` (`#TextFirst`, `#TextLast`, `#TextOnly`, `#TextSeparate`)
- Render a code-list value help (TravelStatus, BookingStatus, etc.) as a **dropdown** in the filter bar instead of an input with value help
- Remove duplicate columns from the value help dialog
- *(Optional)* Set user-friendly labels (`@Common.Label` / `@EndUserText.label`) on `*_ID` / `*_code` elements generated from managed associations or ABAP compositions

## When NOT to Use

- Changing the data model (keys, associations, cardinality) → use the `cap-developer` skill
- Generating or adding SAP Fiori pages → use `sap-fiori-app-development`
- Adding filter *controls* (visual filters, charts) → use `sap-fiori-add-visual-filter`

## Mandatory Inputs

Before writing any code, confirm these with the user. Ask if they are missing:

1. **Stack** — CAP or ABAP RAP? (determines which reference to follow)
2. **Service + entity** (e.g. `TravelService.Travels` or `ZC_Travel`)
3. **Which foreign-key field(s)** to configure (e.g. `Agency_ID`, `AgencyUUID`, `TravelStatus_code`, `TravelStatus`)
4. **Readable business key** on the target entity (e.g. `AgencyID` on `TravelAgencies`, `CustomerID` on `Passengers`, `code` on `TravelStatus`)
5. **Descriptive text field** for text arrangement (e.g. `Name`, `LastName`, `descr`). Optional — skip if the user only wants the ID
6. **Text arrangement preference** — Ask the user to choose based on field type:
   
   **For code lists (Status, Category, Type):**
   - `#TextOnly` — Show only text (e.g., "Open", "Accepted") **[RECOMMENDED for status columns and dropdowns]**
   - `#TextFirst` — Text first, code in parentheses (e.g., "Open (O)")
   - `#TextLast` — Code first, text in parentheses (e.g., "O (Open)")
   - `#TextSeparate` — Code only in field, text in tooltip
   
   **For master data (Agency, Customer, Product):**
   - `#TextLast` — ID first, name in parentheses (e.g., "70007 (Hot Socks Travel)") **[RECOMMENDED for master data]**
   - `#TextFirst` — Name first, ID in parentheses (e.g., "Hot Socks Travel (70007)")
   - `#TextOnly` — Show only name, hide ID completely
   - `#TextSeparate` — ID only in field, name in tooltip
   
   **Ask:** "How would you like [field name] to be displayed?"
7. Whether the value help should be configured as a filter field in list report page
8. **Only for small code lists (Status, Category, Type with <50 entries)**: Whether the value help should become a **fixed-values dropdown** (yes / no) — default: yes for code lists, **NEVER for master data** (Agency, Customer, Product, etc.)

Do not proceed until all inputs are confirmed.


---

## Pick a Reference

| Stack | Reference |
|---|---|
| **CAP** | 📖 [`./references/cap-implementation.md`](./references/cap-implementation.md) |
| **ABAP RAP** (projection views) | 📖 [`./references/rap-implementation.md`](./references/rap-implementation.md) |

---

## Workflow (CAP)

1. **Gather required inputs** (items 1-5 above)
2. **Ask about text arrangement preference** (item 6):
   - Present options based on field type (code list vs master data)
   - Provide recommendations and examples for each option
   - Show how it will appear in different UI contexts (table, form, dropdown)
3. **Ask about value help dialog columns** (item 7):
   - Check if value list already exists and what columns it has
   - Include 3-5 most relevant fields that help users search and identify records
   - Preserve existing columns unless user wants to change them
4. **Ask about field placement** (item 8):
   - Filter bar, Object Page, Both, or Line Item table
5. **Ask about dropdown ONLY for small code lists** (item 8):
   - **ONLY** if the field is a code list (Status, Category, Type) with <50 entries
   - **NEVER** ask for master data (Customer, Agency, Product, etc.) — always use value help dialog
5. **Follow the appropriate reference** (CAP or RAP implementation)
6. **Configure value help and text arrangement**:
   - `Common.ValueList` — enables value help dialog in filter bar and forms
   - `Common.Text` + `Common.TextArrangement` — renders with chosen arrangement
   - `Common.ValueListWithFixedValues` — converts to dropdown (if chosen)
7. **Apply text arrangement to foreign key fields**:
   - For unmanaged associations: use nested syntax on the FK field itself
   - For managed associations: annotation on target entity may be sufficient
8. **Add to UI annotations** based on user's choice:
   - Filter bar → add to `UI.SelectionFields` (value help enabled for search/filter)
   - Object page → ensure it's in `UI.FieldGroup` or facet (value help enabled in form)
   - Line item table on List report page → add to `UI.LineItem` (text arrangement displays; no interactive value help)
9. **Validate** with CDS compilation or service preview

## Workflow (ABAP RAP)

1. **Gather required inputs** (items 1-8 above)
2. **Check for existing value help entities** (CRITICAL STEP):
   - **Search for existing value help views** in the system using `abap_repository_search_object` with patterns like:
     - `*<ENTITY>*VH*` (e.g., `*AGENCY*VH*`, `*CUSTOMER*VH*`)
     - Standard SAP value helps: `/DMO/I_*_STDVH`, `I_*VH`, `I_*_VH`
   - **Check if value help is already exposed in the service definition** by reading the service definition file
   - **Ask the user to choose**:
     - **Option 1: Reuse existing value help** — Use SAP standard or existing custom value help (faster, less maintenance)
     - **Option 2: Create new custom value help** — Build a new value help view in the user's package with custom columns and configuration
     - **Option 3: User provides entity name** — User already knows which value help entity to use
   - If reusing: Validate that the entity has appropriate columns and annotations for the use case
   - If creating new: Proceed with creation workflow (list creatable types → get details → validate → create → populate CDS code → activate)
4. **Identify where annotations go**:
   - **Always edit the projection view (`ZC_*`)**, never the interface view (`ZR_*`)
   - Metadata extensions (`.ddlx`) for UI annotations
   - Projection view (`.ddls. (ONLY code lists)**:
   - **Use ONLY for small code lists** (Status, Category, Type) with <50 fixed values
   - **NEVER use for master data** (Customer, Agency, Product, etc.)s`) for value help and text arrangement
5. **For dropdown value helps**:
   - **DO NOT ask user to create manually** — use programmatic creation
   - Creation workflow: list creatable types → get details → validate → create template → edit with actual code → activate
   - Key annotation: `@ObjectModel.resultSet.sizeCategory: #XS` for dropdown
   - MUST expose in service definition: `expose Z_I_*_VH as *ValueHelp;`
   - Republish service after changes
6. **Configure value help**:
   - **Value Help View**: Add `@ObjectModel.dataCategory: #VALUE_HELP`
   - **Text arrangement in RAP is handled by the framework**:
     - Configure `@ObjectModel.text.element: ['Name']` and `@UI.textArrangement` in the **value help view only**
     - The framework automatically applies this text arrangement when the value help is referenced via `@Consumption.valueHelpDefinition`
     - **DO NOT** duplicate text arrangement annotations (`@ObjectModel.text.element`, `@UI.textArrangement`) in the consuming projection view
     - **DO NOT** add extra fields like `_Agency.Name as AgencyName` to the projection view for text display
     - The value help view configuration is sufficient for both the value help dialog AND the field display in forms/tables
   - **Projection View Field**: Add `@Consumption.valueHelpDefinition` to enable the value help dialog
7. **Add to UI positions** based on user's choice:
   - Filter bar → ensure in `@UI.selectionField`
   - Object page → ensure in `@UI.fieldGroup`
8. **Activate and republish**:
   - Activate projection view and metadata extension
   - Activate value help view (if modified)
   - Activate service definition (if exposing new value help)
   - Unpublish and republish service binding
9. **Update SAP Fiori metadata** (if app exists):
   ```bash
   npx --yes @sap-ux/create@latest update service-metadata .
   ```
10. **Validate**: Hard reload SAP Fiori app (Cmd+Shift+R / Ctrl+Shift+R)

---

## Verification Checklist

After completing the implementation steps, verify:

### Configuration

- [ ] **After Step 1–3** — Annotations applied to correct location (nested syntax for CAP managed associations, projection view for RAP)
- [ ] **After Step 4** — `@Common.Text` references the descriptive text field (CAP) or `@ObjectModel.text.element` points to business key (RAP)
- [ ] **After Step 5** — Text arrangement enum matches user preference (`#TextFirst`, `#TextLast`, `#TextOnly`, or `#TextSeparate`)
- [ ] **After Step 6** — Value help annotations present: `@Common.ValueList` (CAP) or `@Consumption.valueHelpDefinition` (RAP)
- [ ] **After Step 7** — For dropdowns: `@Common.ValueListWithFixedValues: true` added (CAP) or `@ObjectModel.resultSet.sizeCategory: #XS` on value help view (RAP)
- [ ] **After Step 8** — Field added to `UI.SelectionFields` (filter bar) and/or `UI.FieldGroup`/`UI.LineItem` (object page/table) as requested

### Build & Metadata

- [ ] CDS compilation succeeds without errors (CAP: `cds build`, RAP: activate all objects)
- [ ] RAP only: Service definition includes value help entity if newly created
- [ ] RAP only: Service binding unpublished and republished
- [ ] SAP Fiori app metadata updated (`npx @sap-ux/create update service-metadata .`)

### Runtime

- [ ] **Business ID displays** instead of UUID/GUID in tables, forms, and filter bar
- [ ] **Text arrangement renders correctly** in all contexts (table cells, form fields, filter chips)
- [ ] **Value help dialog opens** when clicking the field or magnifying glass icon
- [ ] **Value help columns** show business ID + text + any additional search fields
- [ ] **No duplicate columns** in value help dialog (e.g., AgencyID appears once, not twice)
- [ ] **For dropdowns**: Filter bar field shows a dropdown (chevron icon), not a value help dialog trigger
- [ ] **For dropdowns**: All expected values appear in the dropdown list
- [ ] **Selection works**: Selecting from value help or dropdown populates the field correctly

### Regression

- [ ] UUID fields remain hidden (RAP: `@UI.hidden: true` applied)
- [ ] Other foreign keys not modified by this change still work
- [ ] Existing filters, navigation, and CRUD operations unaffected

---

## Testing

For starting the app and navigating to the feature:

- **CAP projects**: Consult the **Application Preview Guidelines** section in the `sap-fiori-app-development` skill for `cds watch` and `watch-<app>` commands
- **ABAP RAP projects**: Consult the **Application Preview Guidelines** section in the `sap-fiori-app-development` skill for live backend vs. mock server startup
- **Hard reload**: After backend changes (CDS model, service republish), always hard reload the app (Cmd+Shift+R / Ctrl+Shift+R) to refresh metadata

**Where to validate the feature:**

1. **Filter bar** (List Report) — If configured as selection field: Field shows value help icon or dropdown; text arrangement displays in filter chips after selection
2. **Table columns** (List Report) — Text arrangement renders in `UI.LineItem` columns (e.g., "70007 (Hot Socks Travel)")
3. **Form fields** (Object Page) — Value help opens on click; selected value displays with text arrangement
4. **Value help dialog** — Opens with correct columns (business ID, text, search fields); no duplicates; selection populates field
5. **Dropdown (code lists only)** — Filter bar field shows chevron icon; clicking opens inline dropdown; no value help dialog

---

## Common Errors and Solutions

**CAP: "Element ... has not been found in 'TravelService.Travels'"**
- Cause: Attempting to annotate `Agency_ID` directly when it is generated from a managed association
- Fix: Use nested syntax through the association:
  ```cds
  // ❌ Wrong
  annotate service.Travels with {
      Agency_ID @Common.Label: 'Agency';
  };
  
  // ✅ Correct
  annotate service.Travels {
      Agency { ID @Common.Label: 'Agency' };
  };
  ```

**CAP: Business ID appears twice in value help dialog**
- Cause: Business key field is both the InOut parameter and a DisplayOnly parameter
- Fix: Remove the `CollectionPath` parameter for the business key, keep only the InOut parameter on the foreign key:
  ```cds
  // Remove this:
  { $Type: 'Common.ValueListParameterDisplayOnly',
    LocalDataProperty: Agency.ID,
    ValueListProperty: 'AgencyID' }
  ```

**CAP: Text arrangement not rendering**
- Cause: `@Common.Text` and `@Common.TextArrangement` placed on the wrong element (GUID instead of business key)
- Fix: Apply annotations to the readable business key field:
  ```cds
  // ❌ Wrong — on the GUID
  annotate service.Travels {
      Agency @Common.Text: Agency.Name;
  };
  
  // ✅ Correct — on the business key
  annotate service.TravelAgencies {
      AgencyID @Common.Text: Name
                @Common.TextArrangement: #TextLast;
  };
  ```

**RAP: "Element AGENCYID must not be search enabled in a hierarchy node"**
- Cause: `@Search.defaultSearchElement` or `@Search.searchable` on a field used in `@ObjectModel.text.element`
- Fix: Remove all `@Search` annotations from the hierarchy node field and the text element in the value help projection view

**RAP: Value help entity not appearing in service**
- Cause: Entity created but not exposed in service definition
- Fix: Add expose statement and republish:
  ```abap
  expose Z_I_Agency_VH as AgencyValueHelp;
  ```
  Then unpublish and republish the service binding.

**RAP: Text arrangement not displaying in app**
- Cause: Text arrangement annotations duplicated in consuming projection view instead of value help view only
- Fix: Remove `@ObjectModel.text.element` and `@UI.textArrangement` from the consuming projection view (`ZC_Travel`). Keep these annotations ONLY in the value help view (`Z_I_Agency_VH`). The framework applies them automatically.

**Both: Dropdown not working, still shows value help dialog**
- Cause (CAP): Missing `@Common.ValueListWithFixedValues: true` on the association wrapper
- Cause (RAP): Missing `@ObjectModel.resultSet.sizeCategory: #XS` on the value help view
- Cause (Both): Value list has >100 entries (too large for dropdown)
- Fix: Verify annotation placement and check row count in value help entity. Use dropdown only for small code lists.

**Both: Hard reload required after metadata changes**
- Cause: Browser cached old `$metadata` or `annotations.xml`
- Fix: Always hard reload (Cmd+Shift+R / Ctrl+Shift+R) after CDS changes, service republish, or annotation updates. For RAP, also run `npx @sap-ux/create update service-metadata .` before reload.

---

## References

- [SAP Fiori elements: Value Help](https://ui5.sap.com/#/topic/fccb255723d3489cae955648756411f6
- [Displaying Readable IDs Instead of Edm.Guid Values Using Common.ExternalID](https://ui5.sap.com/#/topic/f49a0f7eaafe444daf4cd62d48120ad0)
- [CAP: Value Lists and Dropdowns](https://cap.cloud.sap/docs/guides/uis/fiori#cdsodatavaluelist)
- [ABAP RAP: Text Arrangement (@UI.textArrangement)](https://help.sap.com/docs/abap-cloud/abap-rap/ui-textarrangement)
- [ABAP RAP: Value Help (@Consumption.valueHelpDefinition)](https://help.sap.com/docs/abap-cloud/abap-rap/consumption-valuehelpdefinition)
- [OData V4: Common Vocabulary Reference](https://sap.github.io/odata-vocabularies/vocabularies/Common.html)