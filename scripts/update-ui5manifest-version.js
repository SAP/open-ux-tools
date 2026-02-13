#!/usr/bin/env node
/**
 * Updates @ui5/manifest test fixtures and UI5 version fallbacks.
 *
 * This script complements Renovate's package.json updates by:
 * - Updating test assertions with new manifest descriptor versions
 * - Updating manifest.json fixtures
 * - Updating UI5 version fallbacks
 *
 * Note: Changeset creation is handled by dependency-changesets-action in the workflow
 * @see {@link https://www.npmjs.com/package/@ui5/manifest} @ui5/manifest on npm
 * @see {@link https://github.com/SAP/open-ux-tools/pull/3872} Sample PR #3872
 */

const fs = require('fs');
const { execSync } = require('child_process');

const CONFIG = {
    PACKAGE_JSON_PATH: 'packages/ui5-application-writer/package.json',
    TEST_PACKAGES: ['@sap-ux/ui5-application-writer', '@sap-ux/fiori-app-sub-generator']
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


/**
 * Updates @ui5/manifest test fixtures, UI5 version fallbacks, and updates lockfile.
 * Note: Changeset creation is handled by dependency-changesets-action in the workflow.
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

    console.log('\nDone. (Changeset will be created by workflow action)');
}

main().catch((e) => {
    console.error(`Script failed: ${e.message}`);
    process.exit(1);
});
