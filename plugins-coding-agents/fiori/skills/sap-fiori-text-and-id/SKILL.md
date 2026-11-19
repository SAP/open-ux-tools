---
name: sap-fiori-text-and-id
description: 'Hide technical UUID/GUID keys and show business IDs or descriptive text in SAP Fiori elements apps. Use when asked to display business IDs instead of technical GUID, configure text arrangement (TextFirst/TextLast/TextOnly), add value help to foreign keys, turn valuehelp into dropdowns. Supports CAP and ABAP RAP.'
argument-hint: 'Entity + foreign-key element'
metadata:
  author: sap-fiori-tools
  version: "0.0.2"
---

# SAP Fiori elements — Text & ID Rendering for Foreign Keys

## Purpose

Configure foreign-key fields to display business IDs (AgencyID, CustomerID, Status code) and descriptive text instead of technical UUIDs/GUIDs. Guides how ID and text combinations are rendered in tables, forms, filter bars, and value help dialogs.

---

## Example User Prompts

This skill is invoked when users ask questions like:

- "Show Customer ID instead of GUID"
- "Display Travel Status as a dropdown"
- "Configure value help for Customer ID"
---

## Prerequisites

- **OData version:** V4 Only
- **Backend:** CAP or ABAP RAP
- **MCP servers:**
  - SAP Fiori MCP (required for manifest.json modifications)
  - CDS MCP (recommended for CAP — enables CDS model queries)
  - ABAP Development Tools MCP (required for RAP — included with ADT extension)
- **Hosts:** Works in all environments (GitHub Copilot in VS Code/BAS, Claude). ABAP RAP flows require ABAP Development Tools extension for VS Code; on other hosts, users perform ABAP changes manually in their SAP system, then return for UI configuration.

## Mandatory Inputs

Before writing any code, confirm these with the user. Ask if they are missing:

1. **Stack** — CAP or ABAP RAP? (determines which reference to follow)
2. **Service + entity** (e.g. `TravelService.Travels` or `ZC_Travel`)
3. **Which foreign-key field(s)** to configure (e.g. `Agency_ID`, `AgencyUUID`, `TravelStatus_code`, `TravelStatus`)
4. **Readable business key** on the target entity (e.g. `AgencyID` on `TravelAgencies`, `CustomerID` on `Passengers`, `code` on `TravelStatus`)
5. **Descriptive text field** for text arrangement (e.g. `Name`, `LastName`, `descr`). Optional — skip if the user only wants the ID
6. **Text arrangement preference** — choose default: `#TextFirst` (default), `#TextLast`, `#TextSeparate`, `#TextOnly`

Do not proceed until all inputs are confirmed.

---

## CAP Implementation

📖 **[Complete CAP Implementation Guide](./references/cap-implementation.md)**

---

## ABAP RAP Implementation

📖 **[Complete RAP Implementation Guide](./references/rap-implementation.md)**

---

## Verification

- [ ] Confirm the stack (CAP or ABAP RAP) with the user.
- [ ] Read the matching implementation guide **end-to-end** — including the pitfalls table:
  - CAP → `./references/cap-implementation.md`
  - RAP → `./references/rap-implementation.md`


## Testing

Refer to the **Application Preview Guidelines** section in the `sap-fiori-app-development` skill for detailed testing instructions, including:
- CAP project testing with watch scripts
- Standalone SAP Fiori project testing with live backend vs. mock mode
- Metadata refresh procedures after backend changes

---

## References

- [SAP Fiori elements: Value Help](https://ui5.sap.com/#/topic/fccb255723d3489cae955648756411f6)
- [Displaying Readable IDs Instead of Edm.Guid Values Using Common.ExternalID](https://ui5.sap.com/#/topic/f49a0f7eaafe444daf4cd62d48120ad0)
- [CAP: Value Lists and Dropdowns](https://cap.cloud.sap/docs/guides/uis/fiori#cdsodatavaluelist)
- [ABAP RAP: Text Arrangement (@UI.textArrangement)](https://help.sap.com/docs/abap-cloud/abap-rap/ui-textarrangement)
- [ABAP RAP: Value Help (@Consumption.valueHelpDefinition)](https://help.sap.com/docs/abap-cloud/abap-rap/consumption-valuehelpdefinition)
- [OData V4: Common Vocabulary Reference](https://sap.github.io/odata-vocabularies/vocabularies/Common.html)