#!/usr/bin/env node
/**
 * Updates @ui5/manifest test fixtures and creates changeset.
 *
 * This script complements Renovate's package.json updates by:
 * - Updating test assertions with new manifest descriptor versions
 * - Updating manifest.json fixtures
 * - Creating a changeset for affected packages
 * @see {@link https://www.npmjs.com/package/@ui5/manifest} @ui5/manifest on npm
 * @see {@link https://github.com/SAP/open-ux-tools/pull/3872} Sample PR #3872
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const YAML = require('yaml');

const CONFIG = {
    PACKAGE_JSON_PATH: 'packages/ui5-application-writer/package.json',
    TEST_PACKAGES: ['@sap-ux/ui5-application-writer', '@sap-ux/fiori-app-sub-generator'],
    CHANGESET_PACKAGES: [
        '@sap-ux-private/preview-middleware-client',
        '@sap-ux/ui5-application-writer',
        '@sap-ux/project-access',
        '@sap-ux/ui5-info',
        '@sap-ux/fiori-app-sub-generator'
    ]
};

/** Gets @ui5/manifest version from package.json */
function getInstalledVersion() {
    try {
        const pkg = JSON.parse(fs.readFileSync(CONFIG.PACKAGE_JSON_PATH, 'utf8'));
        return pkg.dependencies?.['@ui5/manifest'] || pkg.devDependencies?.['@ui5/manifest'] || null;
    } catch {
        return null;
    }
}

/** Updates test snapshots with new manifest version */
function updateTestSnapshots() {
    try {
        for (const pkg of CONFIG.TEST_PACKAGES) {
            console.log(`  Updating ${pkg} snapshots...`);
            execSync(`pnpm --filter ${pkg} test-u`, { stdio: 'inherit' });
        }
        return true;
    } catch (e) {
        console.error(`  Error updating snapshots: ${e.message}`);
        return false;
    }
}

/** Updates UI5 version fallback TypeScript file using @sap-ux/ui5-info package */
async function updateUI5VersionFallback() {
    try {
        execSync('pnpm --filter @sap-ux/ui5-info update-fallbacks', { stdio: 'inherit' });
        return true;
    } catch (e) {
        console.error(`  Error updating UI5 version fallbacks: ${e.message}`);
        return false;
    }
}

/** Creates changeset file, skipping if one already exists from a previous run */
function createChangeset() {
    try {
        const changesetDir = '.changeset';
        const prefix = 'automated-cset-';

        // Skip if changeset already exists (avoid duplicate changelog entries on rebases and same message appearing in changeset once mergeds)
        const existing = fs.readdirSync(changesetDir).find((f) => f.startsWith(prefix));
        if (existing) {
            console.log(`  Changeset already exists: ${existing}, skipping`);
            return true;
        }

        const name = `${prefix}${Math.random().toString(36).slice(2, 6)}`;
        const packages = Object.fromEntries(CONFIG.CHANGESET_PACKAGES.map((p) => [p, 'patch']));
        // Trim YAML output to avoid extra newline before closing ---
        const content = `---\n${YAML.stringify(packages).trim()}\n---\n\nBump @ui5/manifest version and UI5 version fallbacks\n`;
        fs.writeFileSync(path.join(changesetDir, `${name}.md`), content);
        console.log(`  Created .changeset/${name}.md`);
        return true;
    } catch (e) {
        console.error(`  Error creating changeset: ${e.message}`);
        return false;
    }
}

/**
 * Updates @ui5/manifest test fixtures, UI5 version fallbacks, creates changeset, and updates lockfile.
 */
async function main() {
    console.log('Updating @ui5/manifest fixtures...\n');

    const installedVersion = getInstalledVersion();
    if (!installedVersion) {
        console.error('Could not determine installed @ui5/manifest version');
        process.exit(1);
    }
    console.log(`Installed @ui5/manifest version: ${installedVersion}\n`);

    let success = true;

    console.log('Updating test snapshots...');
    if (!updateTestSnapshots()) success = false;

    console.log('\nUpdating UI5 version fallbacks...');
    if (!(await updateUI5VersionFallback())) success = false;

    console.log('\nCreating changeset...');
    if (!createChangeset()) success = false;

    console.log('\nRunning pnpm install...');
    try {
        execSync('pnpm install --lockfile-only', { stdio: 'inherit' });
    } catch (e) {
        console.error(`  pnpm install failed: ${e.message}`);
        success = false;
    }

    if (!success) {
        console.error('\nCompleted with errors.');
        process.exit(1);
    }

    console.log('\nDone.');
}

main().catch((e) => {
    console.error(`Script failed: ${e.message}`);
    process.exit(1);
});
