# @sap-ux/fiori-mcp-server

This package includes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for integration with agentic AI tools.

The server helps AI models to create or modify SAP Fiori applications like:

- _Create a new fiori app to the current project that I can use to maintain bookings for my dog grooming business_
- _Create a new fiori app to the current project according to my_picture.png_
- _Add the FCL to the SAP Fiori elements app_
- _Enable initial load for the fiori app_

> ⚠️ Caution
>
> This feature is currently in an experimental state.
>
> Experimental features may be changed at any time for any reason without notice.
>
> Experimental features are not for productive use. Please consider backing up your data before using it.

## [Usage](#usage)

### Method 1: npx

Configure your MCP client to start the server with command `fiori-mcp`. Here is a sample config for Cline:
```json
{
  "servers": {
    "fiori-mcp": {
      "command": "npx",
      "args": ["--yes","@sap-ux/fiori-mcp-server", "fiori-mcp"]
    }
  }
}
```
### Method 2: npm

First, install the required package via `npm`:
```bash
npm install -g @sap-ux/fiori-mcp-server
```
Then, configure your MCP client to start the server with command `fiori-mcp`. Here is a sample config for Cline:
```json
{
  "servers": {
    "fiori-mcp": {
      "type": "stdio",
      "command": "fiori-mcp"
    }
  }
}
```

## [Rules](#rules)

The following rules help guide the LLM to use the server correctly:

```markdown
## Rules for creation or modification of SAP Fiori elements apps

- When asked to create an SAP Fiori elements app check whether the user input can be interpreted as an application organized into one or more pages containing table data or forms, these can be translated into a SAP Fiori elements application, else ask the user for suitable input.
- The application typically starts with a List Report page showing the data of the base entity of the application in a table. Details of a specific table row are shown in the ObjectPage. This first Object Page is therefore based on the base entity of the application.
- An Object Page can contain one or more table sections based on to-many associations of its entity type. The details of a table section row can be shown in an another Object Page based on the associations target entity.
- The data model must be suitable for usage in a SAP Fiori elements frontend application. So there must be one main entity and one or more navigation properties to related entities.
- Each property of an entity must have a proper datatype.
- For all entities in the data model provide primary keys of type UUID.
- When creating sample data in CSV files, all primary keys and foreign keys MUST be in UUID format (e.g., `550e8400-e29b-41d4-a716-446655440001`).
- When generating or modifying the SAP Fiori elements application on top of the CAP service use the Fiori MCP server if available.
- When attempting to modify the SAP Fiori elements application like adding columns you must not use the screen personalization but instead modify the code of the project, before this first check whether an MCP server provides a suitable function.
- When previewing the SAP Fiori elements application use the most specific script for the app in the `package.json`.
```

## [Available Tools](#available-tools)

#### `list-fiori-apps`
Scans a specified directory to find existing SAP Fiori applications that can be modified.

#### `list-functionalities` (Step 1 of 3)
Gets the list of supported functionalities to create a new or modify an existing SAP Fiori application.

The main functionalities are:

- Generate a Fiori elements app inside an [SAP Cloud Application Programming Model (CAP)](https://cap.cloud.sap/) project
- Adding and deleting pages from an app
- Adding and modifying controller extensions
- `manifest.json` properties depending on the app (e.g. adding Flexible Column Layout, enabling initial load)

#### `get-functionality-details` (Step 2 of 3)
Gets the required parameters and detailed information for a specific functionality to create a new or modify an existing SAP Fiori application.

#### `execute-functionality` (Step 3 of 3)
Executes a specific functionality to create a new or modify an existing SAP Fiori application with provided parameters.

## Code of Conduct

Everyone participating in this joint project is welcome as long as our [Code of Conduct](https://github.com/SAP/open-ux-tools/blob/main/docs/CODE_OF_CONDUCT.md) is being adhered to.

## Licensing

Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available via the [REUSE tool](https://api.reuse.software/info/github.com/SAP/open-ux-tools).