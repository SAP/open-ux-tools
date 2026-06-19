#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

// Packages that should not have major version bumps
const BLOCKED_MAJOR_PACKAGES = [
    '@sap-ux/eslint-plugin-fiori-tools'
];

/**
 * Packages that use esbuild to bundle their devDependencies into the dist output.
 * Any @sap-ux/* or @sap-ux-private/* devDependency of these packages will be
 * treated as a bundled dep — if one is released, the bundler must be re-published too.
 *
 * Add a package here when it gains an esbuild-based bundle step. Remove it if
 * the package stops bundling its devDependencies.
 */
const ESBUILD_BUNDLING_PACKAGES = [
    '@sap-ux/fiori-mcp-server',
    'sap-ux-sap-systems-ext',
    '@sap-ux/eslint-plugin-fiori-tools'
];

const __dirname = import.meta.dirname;
const ROOT = path.join(__dirname, '..');
const VALID_SUMMARY_PREFIX = /^(FEAT|FIX|BUMP):/i;
const CHANGESET_DIR = path.join(ROOT, '.changeset');
const PACKAGES_DIR = path.join(ROOT, 'packages');

/** Read a package.json from the packages/ directory by package name. */
function readPackageJson(packageName) {
    for (const dir of fs.readdirSync(PACKAGES_DIR)) {
        const pkgJsonPath = path.join(PACKAGES_DIR, dir, 'package.json');
        if (!fs.existsSync(pkgJsonPath)) continue;
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
            if (pkg.name === packageName) return pkg;
        } catch {
            // ignore malformed package.json
        }
    }
    return null;
}

/**
 * Build reverse map: bundled workspace devDep → set of bundling packages.
 * Derived by reading each bundling package's devDependencies and collecting
 * those scoped to @sap-ux/* or @sap-ux-private/*.
 */
function buildBundledDepReverseMap() {
    /** @type {Map<string, Set<string>>} */
    const reverse = new Map();
    for (const bundler of ESBUILD_BUNDLING_PACKAGES) {
        const pkg = readPackageJson(bundler);
        if (!pkg) continue;
        for (const dep of Object.keys(pkg.devDependencies ?? {})) {
            if (!dep.startsWith('@sap-ux/') && !dep.startsWith('@sap-ux-private/')) continue;
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
                `   Must start with FEAT:, FIX:, or BUMP:`
            );
        }
    }

    // Check that bundling packages have a changeset whenever one of their
    // bundled workspace devDependencies is being released.
    const reverseMap = buildBundledDepReverseMap();
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
