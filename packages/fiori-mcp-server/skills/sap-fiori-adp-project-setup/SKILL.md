---
name: sap-fiori-adp-project-setup
author: sap-fiori-tools
version: 0.0.1
description: Use when creating a new SAP Fiori adaptation project, setting up an adaptation editor, or adapting an existing Fiori app on an SAP system
---

# ADP Project Setup

End-to-end workflow for creating a SAP Fiori adaptation project and launching the adaptation editor.

## Prerequisites

- fiori-mcp server connected (provides `mcp__fiori-mcp__*` tools)
- User knows which SAP system and application to adapt (or will be guided)

### Installing fiori-mcp

This skill requires the `@sap-ux/fiori-mcp-server` MCP server. It is part of the [SAP UX Tools](https://github.com/SAP/open-ux-tools) open-source project.

**Install via npm:**

```bash
npm install -g @sap-ux/fiori-mcp-server
```

**Configure in your MCP client** (e.g. Claude Desktop `claude_desktop_config.json`, or VS Code `settings.json`):

```json
{
  "mcpServers": {
    "fiori-mcp": {
      "command": "npx",
      "args": ["-y", "@sap-ux/fiori-mcp-server"]
    }
  }
}
```

After adding the server, restart your MCP client. The `mcp__fiori-mcp__*` tools should appear in the available tools list.

## Workflow

### Step 1: Discover Available Systems

Call `mcp__fiori-mcp__list_sap_systems` to retrieve the list of configured SAP systems.

Present the systems to the user. If no systems are found, inform the user they need to configure a system first (via SAP Fiori tools system store or BAS destinations).

### Step 2: Gather Parameters

Ask the user for:
1. **System** — which SAP system to use (from the list)
2. **Application** — the application ID to adapt (e.g., `sap.ui.demoapps.rta.fe`)
3. **Target folder** — where to create the project (default: current working directory)
4. **Project name** — optional, defaults to `app.variant`

If the user does not know the application ID, suggest they check the Fiori Apps Library or their system's app index.

### Step 3: Generate the Adaptation Project

Call `mcp__fiori-mcp__generate_adaptation_project` with:
- `system`: selected system name
- `application`: the application ID
- `appPath`: current working directory or user-specified path
- `targetFolder`: where to generate (absolute path)
- `projectName`: user's choice or default

Optional parameters if user provides them: `namespace`, `applicationTitle`, `client`, `username`, `password`.

Wait for completion. Report success or failure.

### Step 4: Patch ui5.yaml for Local Proxy (DEMO ONLY)

**Only if the user explicitly requests demo/local mode or mentions localhost proxy.**

Read the generated `ui5.yaml` in the project root. In the `fiori-tools-proxy` middleware config, change:
- `url` → `http://localhost:8080`
- `version` → leave empty (remove the value)
- Keep `path` as-is

### Step 5: Launch the Adaptation Editor

Call `mcp__fiori-mcp__open_adaptation_editor` with:
- `appPath`: absolute path to the generated adaptation project root (where `package.json` resides)

The tool returns:
- `editorUrl` — full URL to open the adaptation editor
- `processId` — background server PID
- `port` — server port

### Step 6: Report Success

Present to the user:
- Project location (absolute path)
- Editor URL
- Server PID and port (for cleanup)
- Next step: "Use the `sap-fiori-adp-controller-extension-flow` skill to make RTA changes, or open the URL in your browser."

## Error Handling

- **No systems found:** User must configure systems first
- **Generation fails:** Check credentials, application ID validity, system connectivity
- **Editor launch fails:** Verify project path is correct and `package.json` exists
- **ui5.yaml not found:** Skip patch, warn user

## Cleanup

The editor server runs in background. To stop it later:
```bash
kill <processId>
# or by port:
lsof -ti:<port> | xargs kill
```
