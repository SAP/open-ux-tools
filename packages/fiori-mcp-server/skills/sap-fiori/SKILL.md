---
name: sap-fiori
description: 'Guidelines for creation and development of SAP Fiori UI as part of CAP or standalone Fiori projects. Use this skill for every new Fiori Elements application or when modifying an existing one.'
argument-hint: 'fiori elements application creation or modification'
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# SAP Fiori UI Guidelines (CAP & Standalone Projects)

## General Guidelines (Applicable to CAP and Standalone Fiori Projects)

1. **Always ask the user** whether they want to create a Fiori app for **CAP** (Cloud Application Programming) or a **standalone Fiori project** connected to an external OData service before proceeding with implementation, unless the technology stack is explicitly specified in the user's request.
2. Use the Fiori MCP tools to create the Fiori UI using SAP Fiori Elements.
3. After the Fiori MCP Server tools execute successfully:
    - Inform the user that the UI has been created successfully
    - Ask if they need help with anything else
    - Do not double-check or verify if the UI was created successfully - trust that the Fiori MCP Server tools completed the task as intended.
4. The data model should be suitable for SAP Fiori elements: at minimum one entity type that serves as the main entity for the application. Navigation properties to related entities are optional but enable richer UI patterns.
5. Each property of an entity must have a proper datatype.
6. When modifying the SAP Fiori elements application (e.g., adding columns), **do not** use screen personalization.
7. Before modifying the code directly - first check whether Fiori MCP server provides a suitable function or tool.

### Available Application Templates (Both CAP and Standalone Projects)

The Fiori MCP can create the following application templates for both CAP and standalone project backends:

1. **FE_LROP** - List Report Object Page (most common, OData V2/V4)
2. **FE_ALP** - Analytical List Page (OData V2/V4)
3. **FE_OVP** - Overview Page (OData V2/V4)
4. **FE_WORKLIST** - Worklist (OData V2/V4)
5. **FE_FEOP** - Form Entry Object Page (OData V4 only)
6. **FE_FPM** - Flexible Programming Model / Custom Page (OData V4 only)
7. **FF_SIMPLE** - Basic SAPUI5 Freestyle template (can work without a data source)

### Available Page Types

The Fiori MCP can add the following page types to existing applications:

1. **ListReport** - Table view with filtering and search
2. **ObjectPage** - Detail page for viewing/editing records
3. **CustomPage** - Fully custom page with your own views

### Application Structure
- When asked to create a SAP Fiori elements app, check whether the user input can be interpreted as an application organized into one or more pages containing table data or forms.
- Applications typically start with a **List Report** page showing data in a table, but other templates are available (see above).
- Details of a specific table row are shown in an **Object Page** based on the base entity.
- An Object Page can contain sections based on navigation properties (both to-one (0..1) and to-many associations) of its entity type.
- Details of a table section row (for to-many associations) can be shown in another Object Page based on the association's target entity.

### Application Preview Guidelines
- Use the most specific script for the app in `package.json`.
- For CAP: Use watch scripts (e.g., `npm run watch-manage-travel`)
- For standalone Fiori projects: Use `npm start` (live backend) or `npm run start-mock` (mock data)

## CAP-Specific Guidelines

1. The fiori app must be created in the `app` folder under the CAP application root folder created before with `cds init` operation. This root folder is always a subfolder directly under working directory.
2. When creating UI applications following a CAP application summary, make sure to use UI application names as described in the project structure of the summary, unless user explicitly requested otherwise.
3. On any follow-up request to change or modify the UI of the full stack CAP application, always try first to make the change in the fiori app unless really required in service.
4. Provide primary keys of type UUID for all entities.
5. When creating sample data in CSV files, all primary keys and foreign keys MUST be in UUID format (e.g., `550e8400-e29b-41d4-a716-446655440001`).

## Standalone Fiori Project Guidelines

1. For standalone Fiori projects based on external services, the application is created at the root level by Fiori MCP tools.
2. **Destination or SAP System Name**: If the user doesn't provide a destination name or SAP system name, use the Fiori MCP Server to retrieve and present available destinations/systems for user selection.
3. **Fetching OData Service Metadata**: Use the Fiori MCP Server to discover and select services from the configured destination or SAP system. If the service metadata cannot be retrieved, try the Service Center MCP Server as an alternative.
4. **UI Modifications**: For any follow-up requests to change or modify the UI of a standalone Fiori project, modify the local annotation file (e.g., `/webapp/annotations/annotation.xml`) referenced in `manifest.json` with matching `uri` and `localUri` values:
   ```json
   "annotation": {
     "type": "ODataAnnotation",
     "uri": "annotations/annotation.xml",
     "settings": {
       "localUri": "annotations/annotation.xml"
     }
   }
   ```
5. Standalone Fiori projects connect to remote OData V2 or V4 services (defined in `manifest.json` dataSources).
6. **Mock Data Generation**: To generate or manage mock data for standalone Fiori projects based on external services, consult any available skill first; if none is available, fall back to the Fiori MCP Server with the query "generate mock data using data editor".
7. Metadata is **read-only**