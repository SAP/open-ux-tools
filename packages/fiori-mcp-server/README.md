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
- You MUST use call the get_fiori_rules tool from fiori mcp before creating or modifying fiori applications. You Do NOT propose, suggest or make any changes without first checking.
```

Add these rules to your existing global or project-specific [`AGENTS.md`](https://agents.md/) (specifics may vary based on respective MCP client).

## [Available Tools](#available-tools)

#### `get_fiori_rules`
Returns the complete set of rules and best practices for creating or modifying SAP Fiori elements applications.

Use this tool to understand constraints and guidelines for Fiori development, including:

- Application structure requirements (List Report, Object Pages)
- Data model requirements (entities, navigation properties, UUIDs)
- Sample data format requirements
- Preview and testing guidelines

This should be called when starting any Fiori application creation or modification task.

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

## Code of Conduct

Everyone participating in this joint project is welcome as long as our [Code of Conduct](https://github.com/SAP/open-ux-tools/blob/main/docs/CODE_OF_CONDUCT.md) is being adhered to.

## Licensing

Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available via the [REUSE tool](https://api.reuse.software/info/github.com/SAP/open-ux-tools).
