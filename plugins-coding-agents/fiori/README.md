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
claude plugin install https://github.com/SAP/open-ux-tools.git#plugins-coding-agents/fiori
```

Or add via the Claude Code marketplace: search for `sap-ux-fiori-tools`.

## Version Alignment

Plugin versions in `.claude-plugin/plugin.json` and `.github/plugin/plugin.json` are independent of the MCP server version.

**Automated** — on each `@sap-ux/fiori-mcp-server` npm release, `packages/fiori-mcp-server/scripts/sync-mcp-manifests.cjs` runs in CI and:
- Patch-bumps the plugin `version` in both manifests
- Updates the pinned server version in `.mcp.json`

**Manual** — when skills change (editing a `SKILL.md`, adding or removing a skill), bump the `version` field in **both** `.claude-plugin/plugin.json` and `.github/plugin/plugin.json` by hand as part of the same commit.
