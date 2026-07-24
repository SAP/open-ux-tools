#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

// Packages that should not have major version bumps
const BLOCKED_MAJOR_PACKAGES = [
    '@sap-ux/eslint-plugin-fiori-tools'
];

/**
 * Packages that use esbuild to bundle their dependency graph into the dist output.
 *
 * When any of a bundler's transitive workspace deps is released, the bundler
 * must be re-published so consumers receive the updated bundle.
 *
 * Walk rule: the bundler's own devDependencies are bundled directly; for
 * transitive deps only their `dependencies` are followed (their devDependencies
 * are not installed in the bundler's node_modules and are never bundled).
 *
 * Add a package here when it gains an esbuild-based bundle step. Remove it if
 * the package stops bundling its dependencies.
 */
const ESBUILD_BUNDLING_PACKAGES = [
    '@sap-ux/fiori-mcp-server',
    'sap-ux-sap-systems-ext',
    '@sap-ux/eslint-plugin-fiori-tools'
];

/**
 * Packages that physically copy a fixed set of workspace packages into their dist
 * (e.g. via copyfiles) but do NOT inline the full dep graph via esbuild.
 * Only the explicitly listed deps trigger a cascade — runtime dependencies of those
 * deps are NOT followed.
 *
 * @sap-ux/preview-middleware copies @sap-ux-private/preview-middleware-client dist
 * into its own dist/client/ at build time. Always write the cascade changeset for
 * @sap-ux/preview-middleware, never for @sap-ux-private/preview-middleware-client alone.
 */
const PINNED_EMBED_DEPS = {
    '@sap-ux/preview-middleware': ['@sap-ux-private/preview-middleware-client']
};

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
 * Collect all workspace packages that end up in a bundler's esbuild output.
 *
 * esbuild resolves from node_modules, so the rule is:
 * - The bundler's own devDependencies ARE bundled (esbuild reads them directly)
 * - For every transitive dep, only its `dependencies` are followed — its
 *   devDependencies are not part of its published artifact and are never
 *   installed as part of the bundler's node_modules tree
 */
function transitiveWorkspaceDeps(startName, pkgMap) {
    const visited = new Set();
    function walk(name, isRoot) {
        if (visited.has(name)) return;
        visited.add(name);
        const pkg = pkgMap.get(name);
        if (!pkg) return;
        const toFollow = isRoot
            ? { ...pkg.dependencies, ...pkg.devDependencies }
            : { ...pkg.dependencies };
        for (const dep of Object.keys(toFollow)) {
            if (pkgMap.has(dep)) walk(dep, false);
        }
    }
    walk(startName, true);
    visited.delete(startName); // exclude self
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
    for (const [bundler, deps] of Object.entries(PINNED_EMBED_DEPS)) {
        for (const dep of deps) {
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
