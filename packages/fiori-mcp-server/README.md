# @sap-ux/fiori-mcp-server

This package includes a [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for integration with AI coding assistants.

The server helps AI models create or modify SAP Fiori applications based on prompts, such as:

- _Please add a SAP Fiori elements list report app to my CAP project_
- _Generate a new CAP project and SAP Fiori app based on my_picture.png_
- _Add the FCL to the SAP Fiori elements app_
- _Enable initial load for the fiori app_

For the best experience we recommend using this server alongside [@cap-js/mcp-server](https://www.npmjs.com/package/@cap-js/mcp-server) and [@ui5/mcp-server](https://www.npmjs.com/package/@ui5/mcp-server).

> ⚠️ Caution
>
> This is an experimental feature and may change at any time without notice.
> It is not intended for productive use.
> Please back up your data before using it.

## [Usage](#usage)

### Method 1: npx

Configure your MCP client to start the server with command `fiori-mcp`. Here is a sample configuration for Cline:
```json
{
  "mcpServers": {
    "fiori-mcp": {
      "type": "stdio",
      "timeout": 600,
      "command": "npx",
      "args": ["--yes","@sap-ux/fiori-mcp-server@latest", "fiori-mcp"]
    }
  }
}
```
### Method 2: npm

First, install the required package globally using `npm`:
```bash
npm install -g @sap-ux/fiori-mcp-server
```
Then, configure your MCP client to start the server with command `fiori-mcp`. Here is a sample configuration for Cline:
```json
{
  "mcpServers": {
    "fiori-mcp": {
      "type": "stdio",
      "timeout": 600,
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
- When previewing the SAP Fiori elements application use the most specific `npm run watch-*` script for the app in the `package.json`.
```

Add these rules to your existing global or project-specific [`AGENTS.md`](https://agents.md/) (specifics may vary based on respective MCP client).

## [Available Tools](#available-tools)

#### `search_docs`
Searches SAP Fiori elements, Annotations, UI5, SAP Fiori tools documentation for the given query.

Note: the results are based on the most recent indexed version of UI5 documentation

#### `list_fiori_apps`
Scans a specified directory to find existing SAP Fiori applications that can be modified.

#### `list_functionalities` (Step 1 of 3)
Gets the list of supported functionalities to create a new or modify an existing SAP Fiori application.

The main functionalities are:

- Generating a Fiori elements app within an [SAP Cloud Application Programming Model (CAP)](https://cap.cloud.sap/) project
- Adding and deleting pages from an app
- Adding and modifying controller extensions
- Modifying `manifest.json` properties depending on the app (e.g. adding Flexible Column Layout, enabling initial load)

#### `get_functionality_details` (Step 2 of 3)
Gets the required parameters and detailed information for a specific functionality to create a new or modify an existing SAP Fiori application.

#### `execute_functionality` (Step 3 of 3)
Executes a specific functionality to create a new or modify an existing SAP Fiori application with provided parameters.


## [Telemetry](#telemetry)

You can enable and disable the collection of analytics. By default, non-personally identifiable information is used to help understand how you use the product to improve the Fiori MCP Server. In case you want to opt-out there exist two ways to disable the telemetry.

### Method 1: Configuration File

Create or change the file `~/.fioritools/telemetrysettings.json`:

```json
{
  "telemetrysettings": {
    "telemetrySetting": {
      "enableTelemetry": false
    }
  }
}
```

Set `enableTelemetry` to `false` to disable telemetry collection.

### Method 2: Environment Variable

Set the environment variable `SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY` to `true`:

```bash
export SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY=true
```

Setting this environment variable will disable the telemetry client.

## Code of Conduct

Everyone participating in this joint project is welcome as long as our [Code of Conduct](https://github.com/SAP/open-ux-tools/blob/main/docs/CODE_OF_CONDUCT.md) is being adhered to.

## Licensing

Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available via the [REUSE tool](https://api.reuse.software/info/github.com/SAP/open-ux-tools).
