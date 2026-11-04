# AI Agent Guidelines for `@sap-ux/fiori-mcp-server`

This document describes the purpose of the key configuration files in this package that relate to MCP server distribution and plugin registries.

## Plugin Assets

Claude Code and Awesome Copilot plugin assets (skills, plugin manifests, `.mcp.json`) live in [`plugins-coding-agents/fiori/`](../../../plugins-coding-agents/fiori/). See the README there for installation instructions.

## Configuration Files

### `server.json`

This file is the **MCP server registry manifest**. It conforms to the [MCP server schema](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json) and is used to list this server in MCP server registries (e.g., the official MCP server registry at `registry.modelcontextprotocol.io`).

Key fields:
- `name` — Unique server identifier in reverse-domain notation (`io.github.SAP/fiori-mcp-server`)
- `description` — Short description shown in registry listings
- `repository` — Points to the GitHub source repository and subfolder
- `version` — Must be kept in sync with `package.json`
- `packages[].environmentVariables` — Documents environment variables users can configure (e.g., `LOG_LEVEL`, `SAP_UX_FIORI_TOOLS_DISABLE_TELEMETRY`)

> **Important:** Do not manually update `version` in `server.json`. The `scripts/sync-mcp-manifests.cjs` script runs automatically in the CI/CD pipeline (`version` job in `pipeline.yml`) after changesets bump `package.json`, and keeps the manifest files in sync.
