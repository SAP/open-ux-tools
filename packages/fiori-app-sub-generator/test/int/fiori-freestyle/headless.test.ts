import '@sap-ux/jest-file-matchers';
import { existsSync, readFileSync } from 'fs';
import 'jest-extended';
import { join } from 'path';
import yeomanTest from 'yeoman-test';
import { FioriAppGeneratorHeadless } from '../../../src/app-headless';
import type { FioriAppGeneratorOptions } from '../../../src/fiori-app-generator';
import * as install from '../../../src/fiori-app-generator/install';
import { type FFAppConfig } from '../../../src/types';
import { cleanTestDir, ignoreMatcherOpts } from '../test-utils';

const GENERATION_TEST_DIR = './test-output/headless';
const MOCK_FILES_DIR_NAME = './expected-output';
const testDir: string = join(__dirname, '..', GENERATION_TEST_DIR);
const originalCwd: string = process.cwd(); // Generation changes the cwd, this breaks sonar report so we restore later

jest.mock('@sap-ux/fiori-generator-shared', () => {
    const fioriGenShared = jest.requireActual('@sap-ux/fiori-generator-shared');
    return {
        ...fioriGenShared,
        sendTelemetry: jest.fn()
    };
});

jest.mock('@sap-ux/telemetry', () => {
    const telemetry = jest.requireActual('@sap-ux/telemetry');
    return {
        ...telemetry,
        setEnableTelemetry: jest.fn(),
        initTelemetrySettings: jest.fn()
    };
});

/**
 *
 * @param testNameOrJson - can be the partial test file name or the actual json as string
 * @param targetDir - override the standard output path
 */
async function runHeadlessGen(
    testNameOrJson: string,
    targetDir?: string,
    opts?: FioriAppGeneratorOptions
): Promise<any> {
    const testFilePath = join(__dirname, 'headless-input', `${testNameOrJson}-app-config.json`);
    const appConfig = JSON.parse(
        existsSync(testFilePath) ? readFileSync(testFilePath, 'utf-8') : testNameOrJson
    ) as FFAppConfig;
    appConfig.project.targetFolder = targetDir || testDir;
    opts = Object.assign({}, opts, { appConfig });

    return yeomanTest
        .create(
            FioriAppGeneratorHeadless,
            {
                resolved: join(__dirname, '../../src/app-headless') // Required to find root dir name
            },
            {}
        )
        .withOptions(
            Object.assign(
                {
                    'skip-install': opts.skipInstall ?? true
                },
                opts
            )
        )
        .run();
}

describe('Test headless generator', () => {
    let testProjectName: string;
    let expectedOutputPath: string;
    jest.setTimeout(60000);
    beforeAll(() => {
        cleanTestDir(testDir);
    });

    afterEach(() => {
        cleanTestDir(join(testDir, testProjectName));
        process.chdir(originalCwd);
    });

    it('Test app-headless generate - Simple v2', async () => {
        testProjectName = 'simpleflightv2';
        expectedOutputPath = join(__dirname, MOCK_FILES_DIR_NAME, 'headless', testProjectName);
        await runHeadlessGen(testProjectName);
        expect(join(testDir, testProjectName)).toMatchFolder(expectedOutputPath, ignoreMatcherOpts);
    });

    it('Test app-headless generate - Simple No Datasource', async () => {
        testProjectName = 'simpleflightnodatasource';
        expectedOutputPath = join(__dirname, MOCK_FILES_DIR_NAME, 'headless', testProjectName);
        await runHeadlessGen(testProjectName);
        expect(join(testDir, testProjectName)).toMatchFolder(expectedOutputPath, ignoreMatcherOpts);
    });

    it('Check install() is executed', async () => {
        testProjectName = 'simpleflightv2';
        expectedOutputPath = join(__dirname, MOCK_FILES_DIR_NAME, 'headless', testProjectName);
        // Mock writing, we are not testing that here
        jest.spyOn(FioriAppGeneratorHeadless.prototype, 'writing').mockImplementation(jest.fn());
        jest.spyOn(FioriAppGeneratorHeadless.prototype, 'end').mockImplementation(jest.fn());
        const installDepsSpy = jest.spyOn(install, 'installDependencies').mockResolvedValue();

        await runHeadlessGen(testProjectName, undefined, { skipInstall: false });
        expect(installDepsSpy).toHaveBeenCalled();

        installDepsSpy.mockClear();
        await runHeadlessGen(testProjectName, undefined, { force: true, skipInstall: true });
        expect(installDepsSpy).not.toHaveBeenCalled();
        // Restore only spies
        jest.restoreAllMocks();
    });
});
