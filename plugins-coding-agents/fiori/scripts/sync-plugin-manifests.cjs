#!/usr/bin/env node
// Syncs the plugin package version into both plugin manifests.
// Called from the version job in pipeline.yml after `changeset version` bumps package versions.
// Validates that both manifests are version-aligned before updating.

'use strict';

const fs = require('fs');
const path = require('path');

const pluginRoot = path.join(__dirname, '..');
const pluginPkgPath = path.join(pluginRoot, 'package.json');
const claudePluginJsonPath = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
const awesomeCopilotPluginJsonPath = path.join(pluginRoot, '.github', 'plugin', 'plugin.json');

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
    const pluginPkg = readJson(pluginPkgPath);
    const claudePluginJson = readJson(claudePluginJsonPath);
    const awesomeCopilotPluginJson = readJson(awesomeCopilotPluginJsonPath);

    const { version: pluginVersion } = pluginPkg;

    if (claudePluginJson.version === pluginVersion && awesomeCopilotPluginJson.version === pluginVersion) {
        console.log(`Plugin version unchanged (${pluginVersion}) — nothing to sync.`);
        process.exit(0);
    }

    // Validate both manifests are in sync before updating — catches manual drift
    if (claudePluginJson.version !== awesomeCopilotPluginJson.version) {
        throw new Error(
            `Plugin manifest versions are out of sync:\n` +
            `  .claude-plugin/plugin.json: ${claudePluginJson.version}\n` +
            `  .github/plugin/plugin.json: ${awesomeCopilotPluginJson.version}\n` +
            `  Manually align both files before running the release.`
        );
    }

    // Warn if shared metadata fields have drifted between the two manifests
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

    claudePluginJson.version = pluginVersion;
    awesomeCopilotPluginJson.version = pluginVersion;

    fs.writeFileSync(claudePluginJsonPath, JSON.stringify(claudePluginJson, null, 4) + '\n');
    console.log(`Updated .claude-plugin/plugin.json to version ${pluginVersion}`);

    fs.writeFileSync(awesomeCopilotPluginJsonPath, JSON.stringify(awesomeCopilotPluginJson, null, 4) + '\n');
    console.log(`Updated .github/plugin/plugin.json to version ${pluginVersion}`);
} catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
}
