import { join, dirname } from 'node:path';
import { jest } from '@jest/globals';
import { cpSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { rimraf } from 'rimraf';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetService = jest.fn();
const mockIsAppStudio = jest.fn();
const mockListDestinations = jest.fn();
const spawnSyncMock = jest.fn().mockReturnValue({ status: 0 });

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

// Pre-load other modules that don't have vscode-logging issues
const actualChildProcess = await import('node:child_process');
const actualBtpUtils = await import('@sap-ux/btp-utils');
const actualStore = await import('@sap-ux/store');

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: mockGetService
}));

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: mockIsAppStudio,
    listDestinations: mockListDestinations
}));

jest.unstable_mockModule('node:child_process', () => ({
    ...actualChildProcess,
    spawnSync: spawnSyncMock
}));

const { runHeadlessGen } = await import('./utils');
const { DeployTarget } = await import('@sap-ux/fiori-generator-shared');
const { backendSystemBtp, backendSystemOnPrem, INPUT_APP_DIR_ABAP, INPUT_BASE_APP, mockDestinations } =
    await import('./fixtures/constants');

export const ORIGINAL_CWD: string = process.cwd();
export const OUTPUT_DIR = join(__dirname, '../test-output/abap');

describe('Test ABAP headless generator', () => {
    beforeAll(async () => {
        rimraf.rimrafSync(OUTPUT_DIR);
        cpSync(INPUT_APP_DIR_ABAP, OUTPUT_DIR, { recursive: true });
        process.stdin.isTTY = true;
    });

    beforeEach(() => {
        jest.resetAllMocks();
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
    });

    it('should generate ABAP deploy config for on-prem system (VSCode)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockGetService.mockResolvedValue({
            getAll: jest.fn().mockResolvedValue([backendSystemOnPrem])
        });
        const headlessConfig = 'app1';
        const testAppName = 'app-on-prem';

        cpSync(join(OUTPUT_DIR, INPUT_BASE_APP), join(OUTPUT_DIR, testAppName), { recursive: true });
        await runHeadlessGen(headlessConfig, DeployTarget.ABAP, OUTPUT_DIR, testAppName);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
    });

    it('should generate ABAP deploy config for btp system (VSCode)', async () => {
        mockIsAppStudio.mockReturnValue(false);
        mockGetService.mockResolvedValue({
            getAll: jest.fn().mockResolvedValue([backendSystemBtp])
        });
        const headlessConfig = 'app1';
        const testAppName = 'app1-btp';

        cpSync(join(OUTPUT_DIR, INPUT_BASE_APP), join(OUTPUT_DIR, testAppName), { recursive: true });
        await runHeadlessGen(headlessConfig, DeployTarget.ABAP, OUTPUT_DIR, testAppName);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
    });

    it('should generate ABAP deploy config for an on-prem destination (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockListDestinations.mockResolvedValue(mockDestinations);
        const headlessConfig = 'app2-bas';
        const testAppName = 'app2-bas-on-prem';

        cpSync(join(OUTPUT_DIR, INPUT_BASE_APP), join(OUTPUT_DIR, testAppName), { recursive: true });
        await runHeadlessGen(headlessConfig, DeployTarget.ABAP, OUTPUT_DIR, testAppName);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
    });

    it('should generate ABAP deploy config for an s4hc destination (BAS)', async () => {
        mockIsAppStudio.mockReturnValue(true);
        mockListDestinations.mockResolvedValue(mockDestinations);
        const headlessConfig = 'app3-bas';
        const testAppName = 'app3-bas-s4hc';

        cpSync(join(OUTPUT_DIR, INPUT_BASE_APP), join(OUTPUT_DIR, testAppName), { recursive: true });
        await runHeadlessGen(headlessConfig, DeployTarget.ABAP, OUTPUT_DIR, testAppName);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
    });
});
