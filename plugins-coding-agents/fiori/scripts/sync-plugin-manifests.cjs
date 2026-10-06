#!/usr/bin/env node
// Syncs the plugin package version into both plugin manifests.
// Called from the version job in pipeline.yml after `changeset version` bumps package versions.
// Validates that both manifests are version-aligned before updating.

'use strict';

const fs = require('fs');
const path = require('path');
const { readJson } = require('../../../scripts/lib/read-json.cjs');

const pluginRoot = path.join(__dirname, '..');
const pluginPkgPath = path.join(pluginRoot, 'package.json');
const claudePluginJsonPath = path.join(pluginRoot, '.claude-plugin', 'plugin.json');
const awesomeCopilotPluginJsonPath = path.join(pluginRoot, '.github', 'plugin', 'plugin.json');

function deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null) return false;
    if (typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k, i) => bKeys[i] === k && deepEqual(a[k], b[k]));
}

try {
    const pluginPkg = readJson(pluginPkgPath);
    const claudePluginJson = readJson(claudePluginJsonPath);
    const awesomeCopilotPluginJson = readJson(awesomeCopilotPluginJsonPath);

    const { version: pluginVersion } = pluginPkg;

    // Warn if shared metadata fields have drifted — run unconditionally so drift
    // is surfaced even when no version bump is needed.
    const SHARED_FIELDS = ['description', 'keywords', 'author', 'homepage', 'repository', 'license'];
    for (const field of SHARED_FIELDS) {
        if (!deepEqual(claudePluginJson[field], awesomeCopilotPluginJson[field])) {
            console.warn(
                `⚠️  Metadata drift detected in field "${field}":\n` +
                `   .claude-plugin/plugin.json: ${JSON.stringify(claudePluginJson[field])}\n` +
                `   .github/plugin/plugin.json: ${JSON.stringify(awesomeCopilotPluginJson[field])}\n` +
                `   Update both files manually to keep them in sync.`
            );
        }
    }

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
