#!/usr/bin/env node
// Syncs version across server.json (packages/fiori-mcp-server) and all plugin manifests
// (plugins-coding-agents/fiori-tools). Called from the version job in pipeline.yml after
// `changeset version` bumps package.json.

'use strict';

const fs = require('fs');
const path = require('path');

const pluginRoot = path.join(__dirname, '..', '..', '..', 'plugins-coding-agents', 'fiori-tools');

const pkgPath = path.join(__dirname, '..', 'package.json');
const serverJsonPath = path.join(__dirname, '..', 'server.json');
const claudePluginJsonPath = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
const awesomeCopilotPluginJsonPath = path.join(pluginRoot, '.github', 'plugin', 'plugin.json');
const mcpJsonPath = path.join(pluginRoot, '.mcp.json');

/**
 * Reads and parses a JSON file, throwing a clear error if the file is missing or contains invalid JSON.
 * @param {string} filePath
 * @returns {object}
 */
function readJson(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(content);
    } catch (e) {
        throw new Error(`Invalid JSON in ${filePath}: ${e.message}`);
    }
}

try {
    const pkg = readJson(pkgPath);
    const serverJson = readJson(serverJsonPath);
    const claudePluginJson = readJson(claudePluginJsonPath);
    const awesomeCopilotPluginJson = readJson(awesomeCopilotPluginJsonPath);
    const mcpJson = readJson(mcpJsonPath);

    const { version } = pkg;

    // Update top-level version in server.json
    serverJson.version = version;
    if (Array.isArray(serverJson.packages)) {
        for (const packageEntry of serverJson.packages) {
            packageEntry.version = version;
        }
    }

    // Update version in Claude Code plugin manifest
    claudePluginJson.version = version;

    // Update version in Awesome Copilot plugin manifest
    awesomeCopilotPluginJson.version = version;

    // Update pinned server version in .mcp.json args
    const mcpArgs = mcpJson.mcpServers['fiori-mcp'].args;
    mcpJson.mcpServers['fiori-mcp'].args = mcpArgs.map((arg) =>
        arg.startsWith('@sap-ux/fiori-mcp-server@') ? `@sap-ux/fiori-mcp-server@${version}` : arg
    );

    fs.writeFileSync(serverJsonPath, JSON.stringify(serverJson, null, 4) + '\n');
    console.log(`Updated server.json to version ${version}`);

    fs.writeFileSync(claudePluginJsonPath, JSON.stringify(claudePluginJson, null, 4) + '\n');
    console.log(`Updated .claude-plugin/plugin.json to version ${version}`);

    fs.writeFileSync(awesomeCopilotPluginJsonPath, JSON.stringify(awesomeCopilotPluginJson, null, 4) + '\n');
    console.log(`Updated .github/plugin/plugin.json to version ${version}`);

    fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpJson, null, 4) + '\n');
    console.log(`Updated .mcp.json to server version ${version}`);
} catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
}
