#!/usr/bin/env node
// Syncs the version in server.json and .claude-plugin/plugin.json with package.json.
// Called from the version job in pipeline.yml after `changeset version` bumps package.json.

'use strict';

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const serverJsonPath = path.join(__dirname, '..', 'server.json');
const pluginJsonPath = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');

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
    const pluginJson = readJson(pluginJsonPath);

    const { version } = pkg;

    // Update top-level version
    serverJson.version = version;

    // Update version in all package entries
    if (Array.isArray(serverJson.packages)) {
        for (const packageEntry of serverJson.packages) {
            packageEntry.version = version;
        }
    }

    // Update version in Claude Code plugin manifest
    pluginJson.version = version;

    fs.writeFileSync(serverJsonPath, JSON.stringify(serverJson, null, 4) + '\n');
    console.log(`Updated server.json to version ${version}`);

    fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginJson, null, 4) + '\n');
    console.log(`Updated .claude-plugin/plugin.json to version ${version}`);
} catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
}
