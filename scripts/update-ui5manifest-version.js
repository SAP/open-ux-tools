#!/usr/bin/env node
/**
 * Updates @ui5/manifest dependency across the monorepo.
 *
 * Usage:
 *   node scripts/update-ui5manifest-version.js [--dry-run] [--force]
 *
 * @example GitHub Actions Triggers
 * The associated workflow (.github/workflows/update-ui5manifest-version.yml) has 3 triggers:
 * - Manual: workflow_dispatch with dry_run and force options
 * - Scheduled: Every Wednesday at 5 AM UTC
 * - Renovate PR: When Renovate creates a PR for @ui5/manifest
 *
 * Updates package.json files, test assertions, fixtures, creates changeset, and runs pnpm install.
 * @see {@link https://www.npmjs.com/package/@ui5/manifest} @ui5/manifest on npm
 * @see {@link https://github.com/UI5/manifest/blob/main/mapping.json} UI5 manifest mapping.json
 * @see {@link https://github.com/SAP/open-ux-tools/pull/3872} Sample PR #3872
 */

const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

const CONFIG = {
    PACKAGE_JSON_PATHS: [
        'packages/preview-middleware-client/package.json',
        'packages/project-access/package.json',
        'packages/ui5-application-writer/package.json'
    ],
    DATA_TEST_PATH: 'packages/ui5-application-writer/test/data.test.ts',
    EXPECTED_OUTPUT_MANIFEST_PATH:
        'packages/fiori-app-sub-generator/test/int/fiori-elements/expected-output/headless/lrop_v4_no_ui5_version/webapp/manifest.json',
    CHANGESET_PACKAGES: [
        '@sap-ux-private/preview-middleware-client',
        '@sap-ux/ui5-application-writer',
        '@sap-ux/project-access'
    ],
    NPM_REGISTRY_URL: 'https://registry.npmjs.org/@ui5/manifest/latest'
};

const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

/** Fetches JSON from URL, rejects on non-2xx status */
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
                        reject(new Error(`Failed to parse JSON from ${url}`));
                    }
                });
            })
            .on('error', reject);
    });
}

/** Sets GitHub Actions output variable */
function setOutput(name, value) {
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
    }
    console.log(`  [output] ${name}=${value}`);
}

/** Gets @ui5/manifest version from package.json */
function getCurrentVersion(path) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
        return pkg.dependencies?.['@ui5/manifest'] || pkg.devDependencies?.['@ui5/manifest'] || null;
    } catch {
        return null;
    }
}

/** Updates @ui5/manifest version in package.json */
function updatePackageJson(path, version) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
        let updated = false;
        if (pkg.dependencies?.['@ui5/manifest']) {
            pkg.dependencies['@ui5/manifest'] = version;
            updated = true;
        }
        if (pkg.devDependencies?.['@ui5/manifest']) {
            pkg.devDependencies['@ui5/manifest'] = version;
            updated = true;
        }
        if (updated) {
            fs.writeFileSync(path, JSON.stringify(pkg, null, 4) + '\n');
            console.log(`  Updated ${path}`);
        }
        return updated;
    } catch (e) {
        console.error(`  Error updating ${path}: ${e.message}`);
        return false;
    }
}

/** Updates test file with new manifest version */
function updateDataTest(path, oldVer, newVer) {
    try {
        let content = fs.readFileSync(path, 'utf8');
        const escaped = oldVer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Matches the specific test case with version and descriptorVersion in the same block 
        const regex = new RegExp(`(version: '1\\.199\\.0'[\\s\\S]*?descriptorVersion:\\s*')${escaped}(')`, 'g');

        if (regex.test(content)) {
            regex.lastIndex = 0; // Reset regex state for replace
            content = content.replace(regex, `$1${newVer}$2`);
            fs.writeFileSync(path, content);
            console.log(`  Updated ${path}`);
            return true;
        }
        console.log(`  Warning: Could not find test case in ${path}`);
        return false;
    } catch (e) {
        console.error(`  Error updating ${path}: ${e.message}`);
        return false;
    }
}

/** Updates manifest.json fixture */
function updateManifest(path, version) {
    try {
        const manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
        manifest._version = version;
        fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
        console.log(`  Updated ${path}`);
        return true;
    } catch (e) {
        console.error(`  Error updating ${path}: ${e.message}`);
        return false;
    }
}

/** Creates changeset file */
function createChangeset(packages) {
    try {
        const name = `manifest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const content = `---\n${packages.map((p) => `'${p}': patch`).join('\n')}\n---\n\nBump @ui5/manifest version\n`;
        fs.writeFileSync(`.changeset/${name}.md`, content);
        console.log(`  Created .changeset/${name}.md`);
        return true;
    } catch (e) {
        console.error(`  Error creating changeset: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log('Checking for @ui5/manifest updates...\n');

    // Fetch versions
    const latestNpm = await fetchJson(CONFIG.NPM_REGISTRY_URL).catch((e) => {
        console.error(`Failed to fetch npm: ${e.message}`);
        process.exit(1);
    });
    const latestVersion = latestNpm.version;
    const currentVersion = getCurrentVersion(CONFIG.PACKAGE_JSON_PATHS[0]);

    console.log(`Current: ${currentVersion}, Latest: ${latestVersion}\n`);

    if (!currentVersion) {
        console.error('Could not determine current version');
        process.exit(1);
    }

    if (currentVersion === latestVersion && !isForce) {
        console.log('Already up to date.\n');
        setOutput('updated', 'false');
        return;
    }

    if (isForce) console.log('Force mode enabled.\n');

    // Get manifest descriptor versions
    const latestMapping = await fetchJson(`https://unpkg.com/@ui5/manifest@${latestVersion}/mapping.json`).catch(
        (e) => {
            console.error(`Failed to fetch mapping: ${e.message}`);
            process.exit(1);
        }
    );
    if (!latestMapping.latest) {
        console.error('Invalid mapping.json: missing "latest" property');
        process.exit(1);
    }
    const latestManifestVer = latestMapping.latest;

    let currentManifestVer;
    try {
        const currentMapping = await fetchJson(`https://unpkg.com/@ui5/manifest@${currentVersion}/mapping.json`);
        currentManifestVer = currentMapping.latest;
    } catch {
        currentManifestVer = JSON.parse(fs.readFileSync(CONFIG.EXPECTED_OUTPUT_MANIFEST_PATH, 'utf8'))._version;
    }

    console.log(`Manifest version: ${currentManifestVer} -> ${latestManifestVer}\n`);

    if (isDryRun) {
        console.log('DRY RUN - Files that would be updated:');
        console.log(`  ${CONFIG.PACKAGE_JSON_PATHS.join('\n  ')}`);
        console.log(`  ${CONFIG.DATA_TEST_PATH}`);
        console.log(`  ${CONFIG.EXPECTED_OUTPUT_MANIFEST_PATH}`);
        console.log('  .changeset/<name>.md\n');
        setOutput('updated', 'false');
        setOutput('dry_run', 'true');
        return;
    }

    // Perform updates
    let success = true;

    console.log('Updating package.json files...');
    for (const path of CONFIG.PACKAGE_JSON_PATHS) {
        if (!updatePackageJson(path, latestVersion)) success = false;
    }

    console.log('\nUpdating test assertions...');
    if (!updateDataTest(CONFIG.DATA_TEST_PATH, currentManifestVer, latestManifestVer)) success = false;

    console.log('\nUpdating fixtures...');
    if (!updateManifest(CONFIG.EXPECTED_OUTPUT_MANIFEST_PATH, latestManifestVer)) success = false;

    console.log('\nCreating changeset...');
    if (!createChangeset(CONFIG.CHANGESET_PACKAGES)) success = false;

    console.log('\nRunning pnpm install...');
    try {
        execSync('pnpm install --lockfile-only', { stdio: 'inherit' });
        console.log('  Updated pnpm-lock.yaml');
    } catch (e) {
        console.error(`  pnpm install failed: ${e.message}`);
        success = false;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    if (success) {
        console.log(`Updated @ui5/manifest: ${currentVersion} -> ${latestVersion}`);
        setOutput('updated', 'true');
        setOutput('old_version', currentVersion);
        setOutput('new_version', latestVersion);
    } else {
        console.log('Update completed with warnings.');
        setOutput('updated', 'true');
        setOutput('warnings', 'true');
    }
    console.log('='.repeat(50));
}

main().catch((e) => {
    console.error(`Script failed: ${e.message}`);
    process.exit(1);
});
