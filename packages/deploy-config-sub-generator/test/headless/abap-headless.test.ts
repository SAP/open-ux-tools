import { join } from 'node:path';
import * as childProcess from 'child_process';
import { copy, readdirSync } from 'fs-extra';
import { readFile } from 'fs/promises';
import { rimraf } from 'rimraf';
import { runHeadlessGen } from './utils';
import { DeployTarget, type TelemetryHelper, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
    backendSystemBtp,
    backendSystemOnPrem,
    INPUT_APP_DIR_ABAP,
    INPUT_BASE_APP,
    mockDestinations
} from './fixtures/constants';
import { getService } from '@sap-ux/store';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';

jest.mock('@sap-ux/fiori-generator-shared', () => {
    return {
        ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
        sendTelemetry: jest.fn(),
        TelemetryHelper: {
            initTelemetrySettings: jest.fn(),
            createTelemetryData: jest.fn()
        } as TelemetryHelper,
        getHostEnvironment: () => {
            return hostEnvironment.cli;
        }
    };
});

jest.mock('@sap-ux/store', () => {
    return {
        ...(jest.requireActual('@sap-ux/store') as {}),
        getService: jest.fn()
    };
});

jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...(jest.requireActual('@sap-ux/btp-utils') as {}),
        isAppStudio: jest.fn(),
        listDestinations: jest.fn()
    };
});

export const ORIGINAL_CWD: string = process.cwd(); // Generators change the cwd, this breaks sonar report so we restore later
export const OUTPUT_DIR = join(__dirname, '../test-output/abap');

jest.mock('child_process');
let spawnMock: jest.SpyInstance;

const getServiceMock = getService as jest.Mock;
const isAppStudioMock = isAppStudio as jest.Mock;
const listDestinationsMock = listDestinations as jest.Mock;

describe('Test ABAP headless generator', () => {
    beforeAll(async () => {
        rimraf.rimrafSync(OUTPUT_DIR);
        await copy(INPUT_APP_DIR_ABAP, OUTPUT_DIR);
        // This is a hack to ensure it only returns CLI in all situations
        process.stdin.isTTY = true;
    });

    beforeEach(() => {
        jest.resetAllMocks();
        spawnMock = jest.spyOn(childProcess, 'spawnSync').mockImplementation(() => ({ status: 0 } as any));
    });
    afterEach(() => {
        process.chdir(ORIGINAL_CWD);
    });

    afterAll(() => {
        // Remove the test folder if the folder is empty (i.e. no failed tests)
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
        isAppStudioMock.mockReturnValue(false);
        getServiceMock.mockResolvedValue({
            getAll: jest.fn().mockResolvedValue([backendSystemOnPrem])
        });
        const headlessConfig = 'app1';
        const testAppName = 'app-on-prem';

        await copy(join(OUTPUT_DIR, INPUT_BASE_APP), join(OUTPUT_DIR, testAppName));
        await runHeadlessGen(headlessConfig, DeployTarget.ABAP, OUTPUT_DIR, testAppName);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
    });

    it('should generate ABAP deploy config for btp system (VSCode)', async () => {
        isAppStudioMock.mockReturnValue(false);
        getServiceMock.mockResolvedValue({
            getAll: jest.fn().mockResolvedValue([backendSystemBtp])
        });
        const headlessConfig = 'app1';
        const testAppName = 'app1-btp';

        await copy(join(OUTPUT_DIR, INPUT_BASE_APP), join(OUTPUT_DIR, testAppName));
        await runHeadlessGen(headlessConfig, DeployTarget.ABAP, OUTPUT_DIR, testAppName);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
    });

    it('should generate ABAP deploy config for an on-prem destination (BAS)', async () => {
        isAppStudioMock.mockReturnValue(true);
        listDestinationsMock.mockResolvedValue(mockDestinations);
        const headlessConfig = 'app2-bas';
        const testAppName = 'app2-bas-on-prem';

        await copy(join(OUTPUT_DIR, INPUT_BASE_APP), join(OUTPUT_DIR, testAppName));
        await runHeadlessGen(headlessConfig, DeployTarget.ABAP, OUTPUT_DIR, testAppName);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
    });

    it('should generate ABAP deploy config for an s4hc destination (BAS)', async () => {
        isAppStudioMock.mockReturnValue(true);
        listDestinationsMock.mockResolvedValue(mockDestinations);
        const headlessConfig = 'app3-bas';
        const testAppName = 'app3-bas-s4hc';

        await copy(join(OUTPUT_DIR, INPUT_BASE_APP), join(OUTPUT_DIR, testAppName));
        await runHeadlessGen(headlessConfig, DeployTarget.ABAP, OUTPUT_DIR, testAppName);

        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${testAppName}/ui5-deploy.yaml`, 'utf-8')).toMatchSnapshot();
    });
});
