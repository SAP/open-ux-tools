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

## Implementation

Follow the reference guide for your backend:

| Stack | Reference | Quick Summary |
|---|---|---|
| **CAP** | 📖 [`./references/cap-implementation.md`](./references/cap-implementation.md) | 3-step process: Hide GUID with `@Common.ExternalID`, configure text arrangement on business key, add value help to UI annotations |
| **ABAP RAP** | 📖 [`./references/rap-implementation.md`](./references/rap-implementation.md) | Configure value help view with text arrangement, link via `@Consumption.valueHelpDefinition`, activate and republish |

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

---

## Testing

Refer to the **Application Preview Guidelines** section in the `sap-fiori-app-development` skill for detailed testing instructions, including:
- CAP project testing with watch scripts
- Standalone Fiori project testing with live backend vs. mock mode
- Metadata refresh procedures after backend changes

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

---

## References

- [SAP Fiori elements: Value Help](https://ui5.sap.com/#/topic/fccb255723d3489cae955648756411f6)
- [Displaying Readable IDs Instead of Edm.Guid Values Using Common.ExternalID](https://ui5.sap.com/#/topic/f49a0f7eaafe444daf4cd62d48120ad0)
- [CAP: Value Lists and Dropdowns](https://cap.cloud.sap/docs/guides/uis/fiori#cdsodatavaluelist)
- [ABAP RAP: Text Arrangement (@UI.textArrangement)](https://help.sap.com/docs/abap-cloud/abap-rap/ui-textarrangement)
- [ABAP RAP: Value Help (@Consumption.valueHelpDefinition)](https://help.sap.com/docs/abap-cloud/abap-rap/consumption-valuehelpdefinition)
- [OData V4: Common Vocabulary Reference](https://sap.github.io/odata-vocabularies/vocabularies/Common.html)