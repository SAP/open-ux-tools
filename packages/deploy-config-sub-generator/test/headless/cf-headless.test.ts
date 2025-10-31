import hasbin from 'hasbin';
import * as childProcess from 'child_process';
import { toMatchFolder } from '@sap-ux/jest-file-matchers';
import { readdirSync, writeFileSync } from 'node:fs';
import { copy, existsSync } from 'fs-extra';
import { readFile, rename } from 'fs/promises';
import { rimraf } from 'rimraf';
import { basename, join } from 'node:path';
import CFGen from '@sap-ux/cf-deploy-config-sub-generator';
import { DeployTarget, type TelemetryHelper, hostEnvironment } from '@sap-ux/fiori-generator-shared';
import {
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
} from './fixtures/constants';
import { runHeadlessGen } from './utils';
import Generator from 'yeoman-generator';
import { generatorNamespace, initI18n } from '../../src/utils';
import type { AppConfig } from '@sap-ux/fiori-generator-shared';

expect.extend({ toMatchFolder });

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

jest.mock('@sap/mta-lib', () => {
    return {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Mta: require('./mockMta').MockMta
    };
});

jest.mock('os-name', () => {
    return () => 'mocked-os';
});

jest.mock('child_process');
let spawnMock: jest.SpyInstance;

export const OUTPUT_DIR = join(__dirname, '../test-output');
export const ORIGINAL_CWD: string = process.cwd(); // Generators change the cwd, this breaks sonar report so we restore later

/**
 * Headless tests for CF generator
 */
describe('Test headless generator', () => {
    jest.setTimeout(1200000);

    beforeAll(async () => {
        jest.spyOn(hasbin, 'sync').mockReturnValue(true);
        rimraf.rimrafSync(OUTPUT_DIR);
        await copy(INPUT_APP_DIR_CF, OUTPUT_DIR);
        // This is a hack to ensure it only returns CLI in all situations
        process.stdin.isTTY = true;
    });

    beforeEach(() => {
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
        await copy(join(OUTPUT_DIR, INPUT_APP_NAME), join(OUTPUT_DIR, testAppName));
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
        // CAP specific change
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/.gitignore`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/xs-security.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_APP_NAME}/package.json`, 'utf-8')).toMatchSnapshot();
        // FE project changes
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
        // CAP specific change
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/xs-security.json`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_DEST_APP_NAME}/package.json`, 'utf-8')).toMatchSnapshot();
        // FE project changes
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
        // CAP Java specific change
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(
            await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/xs-security.json`, 'utf-8')
        ).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_CAP_JAVA_DEST_APP_NAME}/package.json`, 'utf-8')).toMatchSnapshot();
        // FE project changes
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
        // Parent folder is not CAP so ignore the lcapModeOnly if set to true
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/mta.yaml`, 'utf-8')).toMatchSnapshot();
        expect(await readFile(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/package.json`, 'utf-8')).toMatchSnapshot();
        expect(existsSync(`${OUTPUT_DIR}/${INPUT_PARENT_APP}/xs-security.json`)).toBeTruthy();
        // FE project changes
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
        // Test passing file path instead of app config object
        const testConfigFilePathBase = join(
            __dirname,
            '/fixtures/headless-configs/cf',
            `${INPUT_LCAP_CHANGES}-config-abs.json`
        );
        const targetDir = join(OUTPUT_DIR, INPUT_LCAP_CHANGES, 'app');
        // copy a fresh copy of the CAP project to test out
        const lcapTestProjectSrc = join(INPUT_APP_DIR_CF, INPUT_LCAP_CHANGES);
        const lcapTestProjectDest = join(OUTPUT_DIR, INPUT_LCAP_CHANGES);
        if (existsSync(lcapTestProjectDest)) {
            rimraf.rimrafSync(lcapTestProjectDest);
        }
        await copy(lcapTestProjectSrc, lcapTestProjectDest);
        // Create the app config file with absolute target folder property
        const appConfigAbsTarget = JSON.parse(await readFile(testConfigFilePathBase, 'utf-8')) as AppConfig;

        appConfigAbsTarget.project.targetFolder = targetDir;
        // Write the updated app config file
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

        // Dont run the expensive phases that are not under test, prompting is run but doesnt prompt since `launchDeployConfigAsSubGenerator` is true
        jest.spyOn(CFGen.prototype, 'writing').mockImplementation(jest.fn());
        jest.spyOn(CFGen.prototype, 'initializing').mockImplementation(jest.fn());
        const composeWithSpy = jest.spyOn(Generator.prototype, 'composeWith');
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
