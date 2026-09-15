#!/usr/bin/env node
// Syncs the server version into server.json and .mcp.json.
// Called from the version job in pipeline.yml after `changeset version` bumps package versions.
// No-op if the server version has not changed (plugin-only release).

'use strict';

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const serverJsonPath = path.join(__dirname, '..', 'server.json');
// Climb from packages/fiori-mcp-server/scripts/ → repo root → plugins-coding-agents/fiori
const mcpJsonPath = path.join(__dirname, '..', '..', '..', 'plugins-coding-agents', 'fiori', '.mcp.json');

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

    const { version } = pkg;

    if (serverJson.version === version) {
        console.log(`Server version unchanged (${version}) — nothing to sync.`);
        process.exit(0);
    }

    const mcpJson = readJson(mcpJsonPath);

    // Update top-level version in server.json
    serverJson.version = version;
    if (Array.isArray(serverJson.packages)) {
        for (const packageEntry of serverJson.packages) {
            packageEntry.version = version;
        }
    }

    // Update pinned server version in .mcp.json args
    const fioriMcpServer = mcpJson.mcpServers?.['fiori-mcp'];
    if (!fioriMcpServer) {
        throw new Error('Expected mcpServers["fiori-mcp"] in .mcp.json');
    }
    fioriMcpServer.args = fioriMcpServer.args.map((arg) =>
        arg.startsWith('@sap-ux/fiori-mcp-server@') ? `@sap-ux/fiori-mcp-server@${version}` : arg
    );

    fs.writeFileSync(serverJsonPath, JSON.stringify(serverJson, null, 4) + '\n');
    console.log(`Updated server.json to version ${version}`);

    fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpJson, null, 4) + '\n');
    console.log(`Updated .mcp.json to server version ${version}`);
} catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
}
