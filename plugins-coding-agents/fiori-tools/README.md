# SAP Fiori Tools Plugin for Coding Agents

Plugin distribution assets for the SAP Fiori MCP server, enabling AI coding assistants (Claude Code and GitHub Copilot) to develop SAP Fiori applications.

## What is in this directory

| Asset | Purpose |
|---|---|
| `.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `.github/plugin/plugin.json` | GitHub Awesome Copilot plugin manifest |
| `.mcp.json` | MCP server launch config (pinned version) |
| `skills/` | Seven skills loaded by Claude Code and Awesome Copilot |

## Skills

| Skill | Description |
|---|---|
| `sap-fiori-app-development` | Fiori Elements and standalone app creation |
| `sap-fiori-analytical-chart` | Analytical chart and visual filter configuration |
| `sap-fiori-add-visual-filter` | Adding visual filters to Analytical List Pages |
| `sap-fiori-create-cli` | SAP Fiori tools CLI commands |
| `sap-fiori-eslint-plugin` | ESLint plugin for Fiori development |
| `sap-fiori-opa5-test-development` | OPA5 integration test development |
| `sap-fiori-tree-table` | Tree table implementation |

## MCP Server

The MCP server binary is published as [@sap-ux/fiori-mcp-server](https://www.npmjs.com/package/@sap-ux/fiori-mcp-server) on npm. Source code lives in [packages/fiori-mcp-server](../../packages/fiori-mcp-server/).

## Installing in Claude Code

Install via the Claude Code CLI:

```bash
claude plugin install https://github.com/SAP/open-ux-tools.git#plugins-coding-agents/fiori-tools
```

Or add via the Claude Code marketplace: search for `sap-fiori-mcp-server`.

## Version Alignment

The plugin version in `.claude-plugin/plugin.json`, `.github/plugin/plugin.json`, and the pinned server version in `.mcp.json` all track the `@sap-ux/fiori-mcp-server` npm package version. They are updated automatically by `packages/fiori-mcp-server/scripts/sync-mcp-manifests.cjs` when the server package version is bumped.
