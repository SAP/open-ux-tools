#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

// Packages that should not have major version bumps
const BLOCKED_MAJOR_PACKAGES = [
    '@sap-ux/eslint-plugin-fiori-tools'
];

/**
 * Packages that use esbuild to bundle their entire dependency graph into the
 * dist output. esbuild resolves the full module graph at build time, so ALL
 * transitive workspace dependencies (not just direct devDeps) end up inlined.
 *
 * When any transitive workspace dep is released, the bundler must be
 * re-published so consumers receive the updated bundle.
 *
 * Add a package here when it gains an esbuild-based bundle step. Remove it if
 * the package stops bundling its dependencies.
 */
const ESBUILD_BUNDLING_PACKAGES = [
    '@sap-ux/fiori-mcp-server',
    'sap-ux-sap-systems-ext',
    '@sap-ux/eslint-plugin-fiori-tools'
];

const __dirname = import.meta.dirname;
const ROOT = path.join(__dirname, '..');
const VALID_SUMMARY_PREFIX = /^(FEAT|FIX|BUMP|INFRA):/i;
const CHANGESET_DIR = path.join(ROOT, '.changeset');
const PACKAGES_DIR = path.join(ROOT, 'packages');

/** Build a name → packageJson map for all workspace packages. */
function buildPackageMap() {
    /** @type {Map<string, object>} */
    const map = new Map();
    for (const dir of fs.readdirSync(PACKAGES_DIR)) {
        const pkgJsonPath = path.join(PACKAGES_DIR, dir, 'package.json');
        if (!fs.existsSync(pkgJsonPath)) continue;
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
            map.set(pkg.name, pkg);
        } catch {
            // ignore malformed package.json
        }
    }
    return map;
}

/**
 * Collect all transitive workspace dependencies of a package (including itself).
 * Walks dependencies, devDependencies, and peerDependencies recursively.
 * esbuild bundles the full module graph, so transitive deps are inlined too.
 */
function transitiveWorkspaceDeps(startName, pkgMap, visited = new Set()) {
    if (visited.has(startName)) return visited;
    visited.add(startName);
    const pkg = pkgMap.get(startName);
    if (!pkg) return visited;
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    for (const dep of Object.keys(allDeps)) {
        if (pkgMap.has(dep)) transitiveWorkspaceDeps(dep, pkgMap, visited);
    }
    return visited;
}

/**
 * Build reverse map: transitive workspace dep → set of bundling packages that
 * include it. Derived by walking the full dependency graph of each bundler.
 */
function buildBundledDepReverseMap(pkgMap) {
    /** @type {Map<string, Set<string>>} */
    const reverse = new Map();
    for (const bundler of ESBUILD_BUNDLING_PACKAGES) {
        if (!pkgMap.has(bundler)) continue;
        const allDeps = transitiveWorkspaceDeps(bundler, pkgMap);
        allDeps.delete(bundler); // exclude self
        for (const dep of allDeps) {
            if (!reverse.has(dep)) reverse.set(dep, new Set());
            reverse.get(dep).add(bundler);
        }
    }
    return reverse;
}

function validateChangesets() {
    const files = fs.readdirSync(CHANGESET_DIR);
    const changesetFiles = files.filter((f) => f.endsWith('.md') && f !== 'README.md');

    const errors = [];

    /** @type {Set<string>} */
    const packagesWithChangesets = new Set();

    for (const file of changesetFiles) {
        const filePath = path.join(CHANGESET_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // Parse frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!frontmatterMatch) {
            continue;
        }

        const frontmatter = yaml.parse(frontmatterMatch[1]);

        // Always collect packages — bot changesets (e.g. Renovate) must still
        // trigger the cascade check even though their prefix/bump validation is skipped.
        for (const pkg of Object.keys(frontmatter)) {
            packagesWithChangesets.add(pkg);
        }

        // Skip prefix/bump-type validation for bot-generated dependency changesets (e.g. Renovate)
        if (file.match(/^dependencies-GH-\d+\.md$/)) {
            continue;
        }

        // Check each package in the changeset
        for (const [packageName, bumpType] of Object.entries(frontmatter)) {
            if (BLOCKED_MAJOR_PACKAGES.includes(packageName) && bumpType === 'major') {
                errors.push(
                    `❌ Major version bump blocked for ${packageName} in ${file}\n` +
                        `   Reason: This package is restricted from major version changes.\n` +
                        `   Please use 'minor' or 'patch' instead.`
                );
            }
        }

        // Check summary prefix
        const bodyMatch = content.match(/^---\n[\s\S]*?\n---\n\n?([\s\S]*)/);
        const summary = bodyMatch ? bodyMatch[1].trim() : '';
        if (summary && !VALID_SUMMARY_PREFIX.test(summary)) {
            errors.push(
                `❌ Invalid changeset summary in ${file}\n` +
                `   Summary: "${summary.slice(0, 80)}"\n` +
                `   Must start with FEAT:, FIX:, BUMP:, or INFRA:`
            );
        }
    }

    // Check that bundling packages have a changeset whenever any transitive
    // workspace dependency is being released. esbuild inlines the full module
    // graph at build time, so even indirect deps end up in the bundle.
    const pkgMap = buildPackageMap();
    const reverseMap = buildBundledDepReverseMap(pkgMap);
    for (const [dep, bundlers] of reverseMap.entries()) {
        if (!packagesWithChangesets.has(dep)) continue;

        for (const bundler of bundlers) {
            if (!packagesWithChangesets.has(bundler)) {
                errors.push(
                    `❌ Missing cascading changeset for "${bundler}"\n` +
                        `   Reason: "${dep}" is being released and "${bundler}" bundles it via esbuild.\n` +
                        `   The bundler must be re-published so consumers receive the updated bundle.\n` +
                        `   Fix: Add a changeset for "${bundler}" (patch bump, BUMP: prefix):\n\n` +
                        `     ---\n` +
                        `     "${bundler}": patch\n` +
                        `     ---\n\n` +
                        `     BUMP: Rebuild bundle with updated ${dep}\n` +
                        `   To add a new bundling package: scripts/validate-changesets.mjs → ESBUILD_BUNDLING_PACKAGES`
                );
            }
        }
    }

    if (errors.length > 0) {
        console.error('\n🚫 Changeset validation failed:\n');
        errors.forEach((error) => console.error(error + '\n'));
        process.exit(1);
    }

    console.log('✅ All changesets validated successfully');
}

validateChangesets();
