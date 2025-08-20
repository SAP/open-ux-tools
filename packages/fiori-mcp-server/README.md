# @sap-ux/fiori-mcp-server

This package includes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for integration with AI assistants.

> ⚠️ Caution
>
> This feature is currently in an experimental state.
>
> Experimental features may be changed by SAP at any time for any reason without notice.
>
> Experimental features are not for productive use. You must not demonstrate, test, examine, evaluate or otherwise use experimental features in a live operating environment or with data that has not been sufficiently backed up.

The server helps AI models to create or modify SAP Fiori applications like:

- _Create a new fiori app to the current project that I can use to maintain bookings for my dog grooming business_
- _Create a new fiori app to the current project according to my_picture.png_
- _Add the FCL to the SAP Fiori elements app_
- _Enable initial load for the fiori app_

The main functionalities are:

- generate a Fiori elements app inside an [SAP Cloud Application Programming Model (CAP)](https://cap.cloud.sap/) project
- generate a Fiori elements app standalone based on an OData resource
- adding and deleting pages from an app
- adding and modifying controller extensions
- `manifest.json` properties depending on the app (e.g. adding Flexible Column Layout, enabling initial load)

## [Usage](#usage)

### Method 1: npx

Add the following to your MCP client configuration file, e.g. cline:
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
Then, add the following to your MCP client configuration file, e.g. cline:
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
- The data model must be suitable for usage in a SAP Fiori elements frontend application. There must be one main entity and one or more navigation properties to related entities.
- Each property of an entity must have a proper datatype.
- For all entities in the data model provide primary keys of type UUID. When creating sample data, all primary keys and foreign keys MUST be in UUID format (e.g., `550e8400-e29b-41d4-a716-446655440001`).
- Whenever you create a SAP Fiori elements application, you MUST use the fiori-mcp.
- Whenever you attempt starting an app in the CAP project use the most specific script for the app in the 'package.json', only fallback to "npm start" if no specific start script exists.
```

## [Available Tools](#available-tools)

#### `list-fiori-apps`
Scans a specified directory to find existing SAP Fiori applications that can be modified.

#### `list-functionalities` (Step 1 of 3)
Gets the list of supported functionalities to create a new or modify an existing SAP Fiori application.

#### `get-functionality-details` (Step 2 of 3)
Gets the required parameters and detailed information for a specific functionality to create a new or modify an existing SAP Fiori application.

#### `execute-functionality` (Step 3 of 3)
Executes a specific functionality to create a new or modify an existing SAP Fiori application with provided parameters.

## Licensing

Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available via the [REUSE tool](https://api.reuse.software/info/github.com/SAP/open-ux-tools).

## Keywords
* SAP Fiori tools
* SAP Fiori elements
* SAP Fiori freestyle