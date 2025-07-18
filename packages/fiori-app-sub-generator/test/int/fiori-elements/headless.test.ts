import '@sap-ux/jest-file-matchers';
import { copyFileSync, existsSync, promises as fs, mkdirSync, readdirSync, readFileSync } from 'fs';
import 'jest-extended';
import { join } from 'path';
import yeomanTest from 'yeoman-test';
import { FioriAppGeneratorHeadless } from '../../../src/app-headless';
import type { FioriAppGeneratorOptions } from '../../../src/fiori-app-generator';
import * as install from '../../../src/fiori-app-generator/install';
import type { FEAppConfig } from '../../../src/types';
import { cleanTestDir, getTestData, getTestDir, ignoreMatcherOpts, originalCwd } from '../test-utils';
import { EXPECTED_OUTPUT_DIR_NAME } from './test-utils';

const testDir: string = getTestDir('headless');
const fixturesPath = join(__dirname, './fixtures');

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
 * @param serviceName - the service name used to load the service data for the test run
 * @param capProjectRoot - override the cap project path defined in the test files to point to the test cap project
 * @param opts - additional options passed to the generator
 */
async function runHeadlessGen(
    testNameOrJson: string,
    serviceName?: string,
    capProjectRoot?: string,
    opts?: FioriAppGeneratorOptions
): Promise<any> {
    const testFilePath = join(__dirname, './fixtures/headless', `${testNameOrJson}-app-config.json`);
    const appConfig = JSON.parse(
        existsSync(testFilePath) ? readFileSync(testFilePath, 'utf-8') : testNameOrJson
    ) as FEAppConfig;
    appConfig.project.targetFolder = testDir;

    // Rather than embedding the edmx and annotations as would usually be done by consumers,
    // we assign here to avoid replication of test data across test config files
    if (serviceName) {
        appConfig.service = {
            ...appConfig.service,
            edmx: getTestData(fixturesPath, serviceName, 'metadata')
        };
        // Only update annotations definitions(xml) from file if defined
        if (appConfig.service.annotations) {
            appConfig.service = {
                ...appConfig.service,
                annotations: Array.isArray(appConfig.service.annotations)
                    ? [
                          {
                              ...appConfig.service.annotations[0],
                              Definitions: getTestData(fixturesPath, serviceName, 'annotations')
                          }
                      ]
                    : {
                          ...appConfig.service.annotations,
                          Definitions: getTestData(fixturesPath, serviceName, 'annotations')
                      }
            };
        }
    }

    // Replace CAP project paths in test files with an absolute path to test CAP project
    if (appConfig.service?.capService?.projectPath && capProjectRoot) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error - assigning to a read-only property for testing
        appConfig.service.capService.projectPath = capProjectRoot;
    }

    opts = Object.assign({}, opts, { appConfig });

    return yeomanTest
        .create(FioriAppGeneratorHeadless, {}, {})
        .withOptions(
            Object.assign(
                {
                    force: true,
                    skipInstall: opts.skipInstall ?? true
                },
                opts
            )
        )
        .run();
}

describe('Headless generation', () => {
    let testProjectName: string;
    let expectedOutputPath: string;
    jest.setTimeout(60000);

    /**
     * Ignoring `appGenInfo.json` in headless tests as output has slight variations
     * vs those shared with regular writer tests (not worth duplicatig expected output apps)
     * Also, headless configs are very similar to appGenInfo.json
     */
    const matcherOptions = { ...ignoreMatcherOpts, exclude: ['**/.appGenInfo.json'] };

    beforeAll(() => {
        console.warn = () => {}; // Suppress warning messages from generator caching
        cleanTestDir(testDir);
    });

    afterAll(() => {
        // Remove the test folder if the folder is empty (i.e. no failed tests)
        try {
            if (readdirSync(testDir).length === 0) {
                console.log('Removing test output folder');
                cleanTestDir(testDir);
            }
            process.chdir(originalCwd);
        } catch {
            () => {
                // Needed for lint
            };
        }
    });

    it('LROP v2', async () => {
        testProjectName = 'lrop_v2';
        expectedOutputPath = join(__dirname, EXPECTED_OUTPUT_DIR_NAME, testProjectName);

        await runHeadlessGen('LROP-v2-0.2', 'sepmra_prod_man_v2');
        expect(join(testDir, testProjectName)).toMatchFolder(expectedOutputPath, matcherOptions);
        cleanTestDir(join(testDir, testProjectName));
    });

    /**
     * From the headless perspective there is little difference between this test
     * and the lrop url test except for the absence of the service url and host
     */
    it('LROP v2 - source url not provided', async () => {
        testProjectName = 'lrop_v2_no_url';
        expectedOutputPath = join(__dirname, EXPECTED_OUTPUT_DIR_NAME, 'headless', testProjectName);
        await runHeadlessGen('LROP-v2-0.2-no-url', 'sepmra_prod_man_v2');
        expect(join(testDir, testProjectName)).toMatchFolder(expectedOutputPath, matcherOptions);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('ALP v2', async () => {
        testProjectName = 'alp_v2';
        expectedOutputPath = join(__dirname, EXPECTED_OUTPUT_DIR_NAME, testProjectName);

        await runHeadlessGen('ALP-v2-0.2', 'sepmra_so_ana_alp_v2');
        expect(join(testDir, testProjectName)).toMatchFolder(expectedOutputPath, matcherOptions);
        cleanTestDir(join(testDir, testProjectName));
    });

    it('LROP v4', async () => {
        testProjectName = 'lrop_v4';
        expectedOutputPath = join(__dirname, EXPECTED_OUTPUT_DIR_NAME, testProjectName);

        await runHeadlessGen('LROP-v4-0.2', 'travel_v4');
        expect(join(testDir, testProjectName)).toMatchFolder(expectedOutputPath, matcherOptions);
        cleanTestDir(join(testDir, testProjectName));

        const testProjectNameNoVers = 'lrop_v4_no_ui5_version';
        await runHeadlessGen('LROP-v4-0.2-no-ui5-version', 'travel_v4');
        expectedOutputPath = join(__dirname, EXPECTED_OUTPUT_DIR_NAME, 'headless', testProjectNameNoVers);
        expect(join(testDir, testProjectNameNoVers)).toMatchFolder(expectedOutputPath, matcherOptions);
        cleanTestDir(join(testDir, testProjectNameNoVers));
    });

    it('LROP v4 CAP', async () => {
        testProjectName = 'lrop_v4_cap';
        expectedOutputPath = join(__dirname, EXPECTED_OUTPUT_DIR_NAME, testProjectName);
        const accessSpy = jest.spyOn(fs, 'access').mockResolvedValue();
        // Copy fake package.json to mimic real CAP project
        const testCAPProjectRoot = join(testDir, testProjectName);
        mkdirSync(testCAPProjectRoot, { recursive: true });
        copyFileSync(
            join(__dirname, './fixtures/cap-package-cds-dependency.json.test'),
            join(testCAPProjectRoot, 'package.json')
        );

        await runHeadlessGen('LROP-v4-CAP-0.2', undefined, testCAPProjectRoot);
        expect(testCAPProjectRoot).toMatchFolder(expectedOutputPath, matcherOptions);

        //change the cwd, otherwise win32 will not be able to delete the directory
        process.chdir(testDir);
        cleanTestDir(join(testDir, testProjectName));
        accessSpy.mockRestore();
    });

    it('Check install() is executed', async () => {
        testProjectName = 'lrop_v4';
        expectedOutputPath = join(__dirname, EXPECTED_OUTPUT_DIR_NAME, testProjectName);
        // Mock writing, we are not testing that here
        jest.spyOn(FioriAppGeneratorHeadless.prototype, 'writing').mockImplementation(jest.fn());
        jest.spyOn(FioriAppGeneratorHeadless.prototype, 'end').mockImplementation(jest.fn());
        const installDepsSpy = jest.spyOn(install, 'installDependencies').mockResolvedValue();

        await runHeadlessGen('LROP-v4-0.2', 'travel_v4', undefined, { skipInstall: false });
        expect(installDepsSpy).toHaveBeenCalled();

        installDepsSpy.mockClear();
        await runHeadlessGen('LROP-v4-0.2', 'travel_v4', undefined, { skipInstall: true });
        expect(installDepsSpy).not.toHaveBeenCalled();
        // Restore only spies
        jest.restoreAllMocks();
    });
});
