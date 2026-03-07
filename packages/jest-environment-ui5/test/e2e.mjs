import { UI5Config } from '@sap-ux/ui5-config';
import { getUI5Versions } from '@sap-ux/ui5-info';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FIXTURE_ROOT = join(__dirname, '..', 'test', 'fixtures', 'generated');
const BASE_CONFIG_PATH = join(__dirname, '..', 'test', 'fixtures', 'ui5.yaml');
const MIN_UI5_VERSION = '1.96'; // Version 1.71 is failing due to missing SAPUI5 distribution

/**
 * Prepares test configurations for all maintained UI5 versions.
 * @returns {Promise<Array<{name: string, config: string}>>} Array of version configurations
 */
async function prepareTestConfigurations() {
    const availableUI5Versions = await getUI5Versions({
        includeMaintained: true,
        onlyLatestPatchVersion: true,
        onlyVersionNumbers: true,
        includeDefault: true,
        minSupportedUI5Version: MIN_UI5_VERSION
    });

    // If TEST_LATEST is set, filter to only include the latest maintained version
    let maintainedVersions = availableUI5Versions.filter((v) => v.maintained);
    if (process.env.TEST_LATEST === 'true') {
        let latestVersion = maintainedVersions.find((v) => v.default);
        maintainedVersions = [latestVersion];
    }

    const configurations = [];
    const baseConfig = await readFile(BASE_CONFIG_PATH, 'utf-8');

    // Generate configs for each maintained version
    for (const { version } of maintainedVersions) {
        const configPath = await generateConfig(version, baseConfig);
        configurations.push({
            version,
            configPath
        });
    }

    return configurations;
}

/**
 * Generates a UI5 YAML configuration file for a specific version.
 * @param {string} version - UI5 version to set in the configuration
 * @param {string} baseConfig - Content of the base configuration file
 * @returns {Promise<string>} Path to the generated configuration file
 */
async function generateConfig(version, baseConfig) {
    const ui5Config = await UI5Config.newInstance(baseConfig);
    const configPath = join(FIXTURE_ROOT, `ui5-${version}.yaml`);
    ui5Config.addUI5Framework('SAPUI5', version, ['sap.ui.core', 'sap.m']);

    await mkdir(FIXTURE_ROOT, { recursive: true });
    await writeFile(configPath, ui5Config.toString(), 'utf-8');

    return configPath;
}

/**
 * Runs Jest with a specific UI5 configuration file.
 * @param {string} configFile - Path to the UI5 configuration YAML file
 * @returns {Promise<void>} Resolves if tests pass, rejects if tests fail
 * @throws {Error} When Jest exits with a non-zero exit code
 */
async function runJest(configFile) {
    console.log(`\nRunning tests with ${configFile}...`);

    const jest = spawn('npx', ['jest', '--config', 'jest-ui5.config.js', '--ci'], {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            UI5_JEST_CONFIG: configFile
        }
    });

    const exitCode = await new Promise((resolve, reject) => {
        jest.on('exit', (code) => resolve(code));
        jest.on('error', (error) => reject(error));
    });

    if (exitCode !== 0) {
        throw new Error(`Tests failed for ${configFile} with exit code ${exitCode}`);
    }
}

/**
 * Runs Jest tests against all configured UI5 versions.
 * @returns {Promise<void>}
 */
async function runAllTests() {
    let failedTests = [];
    const configurations = await prepareTestConfigurations();

    for (const version of configurations) {
        try {
            await runJest(version.configPath);
            console.log(`✓ Tests passed for UI5 ${version.version}`);
        } catch (error) {
            console.error(`✗ Tests failed for UI5 ${version.version}`);
            failedTests.push(version.version);
        }
    }

    if (failedTests.length > 0) {
        console.error(`\n✗ Tests failed for the following versions: ${failedTests.join(', ')}`);
        process.exit(1);
    } else {
        console.log('\n✓ All UI5 version tests passed!');
        process.exit(0);
    }
}

runAllTests();
