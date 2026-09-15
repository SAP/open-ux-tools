#!/usr/bin/env node
// Syncs versions and validates metadata consistency across the fiori-mcp-server and plugin packages.
// Called from the version job in pipeline.yml after `changeset version` bumps package versions.
//
// On a fiori-mcp-server release:  updates server.json, .mcp.json (pinned server version), and both plugin manifests.
// On a plugin-only release:       updates both plugin manifests only (server.json / .mcp.json are written unchanged).

'use strict';

const fs = require('fs');
const path = require('path');

// Climb from packages/fiori-mcp-server/scripts/ → repo root → plugins-coding-agents/fiori
const pluginRoot = path.join(__dirname, '..', '..', '..', 'plugins-coding-agents', 'fiori');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pluginPkgPath = path.join(pluginRoot, 'package.json');
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
    const pluginPkg = readJson(pluginPkgPath);
    const serverJson = readJson(serverJsonPath);
    const claudePluginJson = readJson(claudePluginJsonPath);
    const awesomeCopilotPluginJson = readJson(awesomeCopilotPluginJsonPath);
    const mcpJson = readJson(mcpJsonPath);

    const { version } = pkg;
    const pluginVersion = pluginPkg.version;

    // Update top-level version in server.json
    serverJson.version = version;
    if (Array.isArray(serverJson.packages)) {
        for (const packageEntry of serverJson.packages) {
            packageEntry.version = version;
        }
    }

    // Sync plugin manifest versions from fiori-tools-plugin package.json
    claudePluginJson.version = pluginVersion;
    awesomeCopilotPluginJson.version = pluginVersion;

    // Update pinned server version in .mcp.json args
    const fioriMcpServer = mcpJson.mcpServers?.['fiori-mcp'];
    if (!fioriMcpServer) {
        throw new Error('Expected mcpServers["fiori-mcp"] in .mcp.json');
    }
    fioriMcpServer.args = fioriMcpServer.args.map((arg) =>
        arg.startsWith('@sap-ux/fiori-mcp-server@') ? `@sap-ux/fiori-mcp-server@${version}` : arg
    );

    // Warn if shared metadata fields have drifted between the two plugin manifests.
    // Only `version` is auto-synced here; other fields must be kept in sync manually.
    const SHARED_FIELDS = ['description', 'keywords', 'author', 'homepage', 'repository', 'license'];
    for (const field of SHARED_FIELDS) {
        const claudeVal = JSON.stringify(claudePluginJson[field]);
        const copilotVal = JSON.stringify(awesomeCopilotPluginJson[field]);
        if (claudeVal !== copilotVal) {
            console.warn(
                `⚠️  Metadata drift detected in field "${field}":\n` +
                `   .claude-plugin/plugin.json: ${claudeVal}\n` +
                `   .github/plugin/plugin.json: ${copilotVal}\n` +
                `   Update both files manually to keep them in sync.`
            );
        }
    }

    fs.writeFileSync(serverJsonPath, JSON.stringify(serverJson, null, 4) + '\n');
    console.log(`Updated server.json to version ${version}`);

    fs.writeFileSync(claudePluginJsonPath, JSON.stringify(claudePluginJson, null, 4) + '\n');
    console.log(`Updated .claude-plugin/plugin.json to version ${pluginVersion}`);

    fs.writeFileSync(awesomeCopilotPluginJsonPath, JSON.stringify(awesomeCopilotPluginJson, null, 4) + '\n');
    console.log(`Updated .github/plugin/plugin.json to version ${pluginVersion}`);

    fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpJson, null, 4) + '\n');
    console.log(`Updated .mcp.json to server version ${version}`);
} catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
}
