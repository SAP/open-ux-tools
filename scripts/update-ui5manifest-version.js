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
const https = require('https');
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
    ],
    UI5_VERSION_FALLBACK_FILE: 'packages/ui5-info/src/ui5-version-fallback.ts',
    UI5_VERSION_OVERVIEW_URL: 'https://ui5.sap.com/versionoverview.json'
};

/**
 * Fetches JSON from URL
 * @param url
 */
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
                }
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON from ${url}, error: ${e.message}`));
                    }
                });
            })
            .on('error', reject);
    });
}

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

/** Updates UI5 version fallback TypeScript file from versionoverview.json */
async function updateUI5VersionFallback() {
    try {
        console.log(`  Fetching UI5 versions from ${CONFIG.UI5_VERSION_OVERVIEW_URL}...`);
        const data = await fetchJson(CONFIG.UI5_VERSION_OVERVIEW_URL);

        if (!data.versions || !Array.isArray(data.versions)) {
            console.error('  Invalid versionoverview.json: missing versions array');
            return false;
        }

        // Filter and map versions with support status
        const filteredVersions = data.versions
            .filter((v) => v.version && v.support)
            .map((v) => {
                const supportLower = v.support.toLowerCase();
                let support = null;

                if (supportLower === 'maintenance') {
                    support = 'supportState.maintenance';
                } else if (supportLower === 'out of maintenance') {
                    support = 'supportState.outOfMaintenance';
                }

                return support ? { version: v.version, support } : null;
            })
            .filter(Boolean);

        // Read existing file and check if it needs updating
        let content = fs.readFileSync(CONFIG.UI5_VERSION_FALLBACK_FILE, 'utf8');

        // Generate new array content with proper formatting (4-space indent)
        const formatEntry = (v) =>
            ['    {', `        version: '${v.version}',`, `        support: ${v.support}`, '    }'].join('\n');
        const newArray = [
            'export const ui5VersionFallbacks = [',
            filteredVersions.map(formatEntry).join(',\n'),
            '] as UI5VersionSupport[];'
        ].join('\n');

        // Check if content would change
        const arrayRegex = /export const ui5VersionFallbacks = \[[\s\S]*?\] as UI5VersionSupport\[\];/;
        const currentArray = content.match(arrayRegex)?.[0];

        if (currentArray === newArray) {
            console.log(`  No changes detected in UI5 versions, skipping update`);
            return true;
        }

        // Update the comment with current date
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const commentRegex = /\/\/ Updated .+ from https:\/\/ui5\.sap\.com\/versionoverview\.json/;
        content = content.replace(commentRegex, `// Updated ${today} from ${CONFIG.UI5_VERSION_OVERVIEW_URL}`);

        // Update the array
        content = content.replace(arrayRegex, newArray);

        fs.writeFileSync(CONFIG.UI5_VERSION_FALLBACK_FILE, content);
        console.log(`  Updated ${CONFIG.UI5_VERSION_FALLBACK_FILE} (${filteredVersions.length} versions)`);
        return true;
    } catch (e) {
        console.error(`  Error updating ${CONFIG.UI5_VERSION_FALLBACK_FILE}: ${e.message}`);
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
