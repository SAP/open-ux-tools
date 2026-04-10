import { jest } from '@jest/globals';
import { readdirSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { readFile, rename } from 'node:fs/promises';
import { rimraf } from 'rimraf';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AppConfig } from '@sap-ux/fiori-generator-shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Pre-load modules before mocking so we can spread their exports

// Pre-load @sap-ux/fiori-generator-shared (works because @vscode-logging/logger is mocked via jest config)
const actualFioriGenShared = await import('@sap-ux/fiori-generator-shared');

// Mock @sap-ux/fiori-generator-shared with real exports plus test overrides
jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...actualFioriGenShared,
    sendTelemetry: jest.fn(),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn()
    },
    getHostEnvironment: jest.fn(() => 'cli'),
    DefaultLogger: {
        fatal: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        getChildLogger: jest.fn(),
        getLogLevel: jest.fn(() => 'off'),
        log: jest.fn()
    }
}));

const actualChildProcess = await import('node:child_process');

const spawnSyncMock = jest.fn().mockReturnValue({ status: 0 });
const hasbinSyncMock = jest.fn().mockReturnValue(true);

jest.unstable_mockModule('@sap/mta-lib', async () => {
    const { MockMta } = await import('./mockMta.js');
    return { Mta: MockMta };
});

jest.unstable_mockModule('os-name', () => ({
    default: () => 'mocked-os'
}));

jest.unstable_mockModule('node:child_process', () => ({
    ...actualChildProcess,
    spawnSync: spawnSyncMock
}));

jest.unstable_mockModule('hasbin', () => ({
    default: { sync: hasbinSyncMock },
    sync: hasbinSyncMock
}));

const { toMatchFolder } = await import('@sap-ux/jest-file-matchers');
const { default: CFGen } = await import('@sap-ux/cf-deploy-config-sub-generator');
const { DeployTarget } = await import('@sap-ux/fiori-generator-shared');
const {
    INPUT_APP_DIR_CF,
    INPUT_APP_NAME_BASE,
    INPUT_APP_NAME_TS,
    INPUT_APP_NAME,
    INPUT_CAP_APP_NAME,
    INPUT_CAP_DEST_APP_NAME,
    INPUT_CAP_JAVA_DEST_APP_NAME,
    INPUT_LCAP_CHANGES,
    INPUT_PARENT_APP,
    ignoreMatcherOpts
} = await import('./fixtures/constants');
const { runHeadlessGen } = await import('./utils');
const { generatorNamespace, initI18n } = await import('../../src/utils');
const { default: HeadlessGenerator } = await import('../../src/headless');

expect.extend({ toMatchFolder });

export const OUTPUT_DIR = join(__dirname, '../test-output');
export const ORIGINAL_CWD: string = process.cwd();

/**
 * Headless tests for CF generator
 */
describe('Test headless generator', () => {
    jest.setTimeout(1200000);

    beforeAll(async () => {
        jest.restoreAllMocks();
        rimraf.rimrafSync(OUTPUT_DIR);
        cpSync(INPUT_APP_DIR_CF, OUTPUT_DIR, { recursive: true });
        process.stdin.isTTY = true;
    });

    beforeEach(() => {
        spawnSyncMock.mockReturnValue({ status: 0 });
    });

    afterEach(() => {
        process.chdir(ORIGINAL_CWD);
    });

    afterAll(() => {
        try {
            if (readdirSync(OUTPUT_DIR).length === 0) {
                console.log('Removing test output folder');
                rimraf.rimrafSync(OUTPUT_DIR);
            }
        } catch {
            // do nothing
        }
        jest.resetAllMocks();
    });

    it('Test: Headless deploy-config', async () => {
        const testAppName = 'app1';
        await rename(join(OUTPUT_DIR, INPUT_APP_NAME_BASE), join(OUTPUT_DIR, testAppName));

        await runHeadlessGen(testAppName, DeployTarget.CF, OUTPUT_DIR);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/xs-security.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/xs-app.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/.gitignore`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/webapp/manifest.json`, 'utf-8')).toMatchSnapshot();
        rimraf.rimrafSync(join(OUTPUT_DIR, testAppName));
    });

    it('Test: Headless deploy-config TypeScript - Headless Script', async () => {
        const testAppName = 'app2';
        await rename(join(OUTPUT_DIR, INPUT_APP_NAME_TS), join(OUTPUT_DIR, testAppName));

        await runHeadlessGen(testAppName, DeployTarget.CF, OUTPUT_DIR);
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/xs-security.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/xs-app.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/.gitignore`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/webapp/manifest.json`, 'utf-8')).toMatchSnapshot();
        rimraf.rimrafSync(join(OUTPUT_DIR, testAppName));
    });

    it('Test: Headless deploy-config - addToManagedAppRouter ', async () => {
        const testAppName = 'app3';
        cpSync(join(OUTPUT_DIR, INPUT_APP_NAME), join(OUTPUT_DIR, testAppName), { recursive: true });
        await runHeadlessGen(testAppName, DeployTarget.CF, OUTPUT_DIR);
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/xs-app.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/.gitignore`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/xs-security.json`, 'utf-8')).toMatchSnapshot();
        rimraf.rimrafSync(join(OUTPUT_DIR, testAppName));
    });

    it('Test: Headless deploy-config - addToManagedAppRouter inside a cap project', async () => {
        const testAppName = 'feproject-ui';

        await runHeadlessGen(INPUT_CAP_APP_NAME, DeployTarget.CF, join(OUTPUT_DIR, INPUT_CAP_APP_NAME, 'app'));
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/.gitignore`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/xs-security.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/app/${testAppName}/ui5-deploy.yaml`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/app/${testAppName}/xs-app.json`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/app/${testAppName}/package.json`, 'utf-8')
        ).toMatchSnapshot();
        rimraf.rimrafSync(join(OUTPUT_DIR, INPUT_CAP_APP_NAME));
    });

    it('Test: Headless deploy-config - addMTADestination inside a cap project', async () => {
        const testAppName = 'feproject-ui';

        await runHeadlessGen(
            INPUT_CAP_DEST_APP_NAME,
            DeployTarget.CF,
            join(OUTPUT_DIR, INPUT_CAP_DEST_APP_NAME, 'app')
        );
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/xs-security.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/app/${testAppName}/ui5-deploy.yaml`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/app/${testAppName}/xs-app.json`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/app/${testAppName}/package.json`, 'utf-8')
        ).toMatchSnapshot();
        rimraf.rimrafSync(join(OUTPUT_DIR, INPUT_CAP_DEST_APP_NAME));
    });

    it('Test: Headless deploy-config - addMTADestination inside a cap java project', async () => {
        const testAppName = 'feproject-ui';

        await runHeadlessGen(
            INPUT_CAP_JAVA_DEST_APP_NAME,
            DeployTarget.CF,
            join(OUTPUT_DIR, INPUT_CAP_JAVA_DEST_APP_NAME, 'app')
        );
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/xs-security.json`, 'utf-8')
        ).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/app/${testAppName}/ui5-deploy.yaml`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/app/${testAppName}/xs-app.json`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/app/${testAppName}/package.json`, 'utf-8')
        ).toMatchSnapshot();
        rimraf.rimrafSync(join(OUTPUT_DIR, INPUT_CAP_JAVA_DEST_APP_NAME));
    });

    it('Test: Headless deploy-config - localAppChanges inside an existing CAP project', async () => {
        const expectedOutputPath = join(__dirname, '/expected-output', INPUT_LCAP_CHANGES);

        await runHeadlessGen(INPUT_LCAP_CHANGES, DeployTarget.CF, join(OUTPUT_DIR, INPUT_LCAP_CHANGES, 'app'));
        expect(join(OUTPUT_DIR, INPUT_LCAP_CHANGES)).toMatchFolder(expectedOutputPath, ignoreMatcherOpts);
        rimraf.rimrafSync(join(OUTPUT_DIR, INPUT_LCAP_CHANGES));
    });

    it('Test: Headless deploy-config - localAppChanges flag is ignored if set to true when parent is non-CAP', async () => {
        const testAppName = 'feproject-ui';

        await runHeadlessGen(INPUT_PARENT_APP, DeployTarget.CF, join(OUTPUT_DIR, INPUT_PARENT_APP));
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(existsSync(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/xs-security.json`)).toBeTruthy();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/${testAppName}/ui5-deploy.yaml`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/${testAppName}/xs-app.json`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/${testAppName}/package.json`, 'utf-8')
        ).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/${testAppName}/webapp/manifest.json`, 'utf-8')
        ).toMatchSnapshot();
        rimraf.rimrafSync(join(OUTPUT_DIR, INPUT_PARENT_APP));
    });

    it('Test: Headless deploy-config - pass app config as file path and options', async () => {
        const testConfigFilePathBase = join(
            __dirname,
            '/fixtures/headless-configs/cf',
            `${INPUT_LCAP_CHANGES}-config-abs.json`
        );
        const targetDir = join(OUTPUT_DIR, INPUT_LCAP_CHANGES, 'app');
        const lcapTestProjectSrc = join(INPUT_APP_DIR_CF, INPUT_LCAP_CHANGES);
        const lcapTestProjectDest = join(OUTPUT_DIR, INPUT_LCAP_CHANGES);
        if (existsSync(lcapTestProjectDest)) {
            rimraf.rimrafSync(lcapTestProjectDest);
        }
        cpSync(lcapTestProjectSrc, lcapTestProjectDest, { recursive: true });
        const appConfigAbsTarget = JSON.parse(await readFile(testConfigFilePathBase, 'utf-8')) as AppConfig;

        appConfigAbsTarget.project.targetFolder = targetDir;
        const appConfigFilePathTest = join(OUTPUT_DIR, `${basename(testConfigFilePathBase, '.json')}-copy.json`);
        writeFileSync(appConfigFilePathTest, JSON.stringify(appConfigAbsTarget));

        await runHeadlessGen(appConfigFilePathTest, DeployTarget.CF, targetDir, undefined, { deleteFile: true });

        const expectedOutputPath = join(__dirname, '/expected-output', INPUT_LCAP_CHANGES);
        expect(join(OUTPUT_DIR, INPUT_LCAP_CHANGES)).toMatchFolder(expectedOutputPath, ignoreMatcherOpts);
        expect(existsSync(appConfigFilePathTest)).toBeFalsy();
        rimraf.rimrafSync(join(OUTPUT_DIR, INPUT_LCAP_CHANGES));
    });

    it('Test: Headless deploy-config - telemetry is sent', async () => {
        const testAppName = 'app5-telem';

        const expectedTelemetryProperties = {
            AppGenLaunchSource: 'Test Headless',
            AppGenLaunchSourceVersion: '1.1.1'
        };

        jest.spyOn(CFGen.prototype, 'writing').mockImplementation(jest.fn() as any);
        jest.spyOn(CFGen.prototype, 'initializing').mockImplementation(jest.fn() as any);
        const composeWithSpy = jest
            .spyOn(HeadlessGenerator.prototype as any, 'composeWith')
            .mockResolvedValue(undefined);
        await runHeadlessGen(testAppName, DeployTarget.CF, OUTPUT_DIR);

        expect(composeWithSpy).toHaveBeenCalledWith(
            expect.stringMatching(generatorNamespace('gen:test', 'cf')),
            expect.objectContaining({ telemetryData: expect.objectContaining(expectedTelemetryProperties) })
        );
        rimraf.rimrafSync(join(OUTPUT_DIR, testAppName));
    });

    it('Test: Headless deploy-config - should throw an exception if appConfig is missing', async () => {
        await initI18n();
        const testAppName = 'app6-missingappconfig';
        await expect(runHeadlessGen(testAppName, DeployTarget.CF, OUTPUT_DIR)).rejects.toThrow(
            'Please provide one of the following: 1) The first argument of the file path to the application config file, 2) The first argument of the application config file as a JSON string, or 3) The option `appconfig` as a JSON object.'
        );
        rimraf.rimrafSync(join(OUTPUT_DIR, testAppName));
    });
});
