#!/usr/bin/env node
// Syncs the version in packages/fiori-mcp-server/server.json with its package.json.
// Called from the version job in pipeline.yml after `changeset version` bumps package.json.

'use strict';

const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const serverJsonPath = path.join(__dirname, '..', 'server.json');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const serverJson = JSON.parse(fs.readFileSync(serverJsonPath, 'utf8'));

const { version } = pkg;

// Update top-level version
serverJson.version = version;

// Update version inside packages[0] (npm package entry)
if (Array.isArray(serverJson.packages) && serverJson.packages.length > 0) {
    serverJson.packages[0].version = version;
}

fs.writeFileSync(serverJsonPath, JSON.stringify(serverJson, null, 4) + '\n');
console.log(`Updated server.json to version ${version}`);
