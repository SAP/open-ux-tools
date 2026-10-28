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

> Once listed in the [Claude Code public marketplace](https://github.com/anthropics/claude-plugins-official), this can be simplified to `claude plugin install sap-ux-fiori-tools`.

```bash
claude plugin marketplace add https://raw.githubusercontent.com/SAP/open-ux-tools/main/plugins-coding-agents/fiori/.claude-plugin/marketplace.json
claude plugin install sap-ux-fiori-tools
```

## Installing in GitHub Copilot

**VS Code:** In the Extensions view search box, type `@agentPlugins` to browse and install, or open the Command Palette and run `Chat: Plugins`.

**CLI** (requires GitHub Copilot CLI with `plugin` subcommand support):

```bash
copilot plugin install sap-ux-fiori-tools@awesome-copilot
```

## Version Alignment

Plugin versions in `.claude-plugin/plugin.json` and `.github/plugin/plugin.json` are independent of the MCP server version.

**Automated** — on each `@sap-ux/fiori-mcp-server` npm release, two scripts run in CI:
- `packages/fiori-mcp-server/scripts/sync-mcp-manifests.cjs` — updates `server.json` and the pinned server version in `.mcp.json`
- `plugins-coding-agents/fiori/scripts/sync-plugin-manifests.cjs` — patch-bumps the plugin `version` in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and `.github/plugin/plugin.json`

**Manual** — when skills change (editing a `SKILL.md`, adding or removing a skill), bump the `version` field in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and `.github/plugin/plugin.json` by hand as part of the same commit.
