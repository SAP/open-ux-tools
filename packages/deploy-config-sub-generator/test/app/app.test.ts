import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const hasbinSyncMock = jest.fn();
const mockIsAppStudio = jest.fn<typeof actualBtpUtils.isAppStudio>();

jest.unstable_mockModule('hasbin', () => ({
    default: { sync: hasbinSyncMock },
    sync: hasbinSyncMock
}));

// Phase 1: Pre-load and mock foundational modules first.
// btp-utils, store, cf-deploy-config-writer must be mocked BEFORE importing
// modules that depend on them (cf-deploy-config-inquirer, abap-deploy-config-sub-generator, etc.)
const actualCfWriter = await import('@sap-ux/cf-deploy-config-writer');
const actualStore = await import('@sap-ux/store');
const actualBtpUtils = await import('@sap-ux/btp-utils');

jest.unstable_mockModule('@sap-ux/cf-deploy-config-writer', () => ({
    ...actualCfWriter,
    isMTAFound: () => jest.fn().mockReturnValue(true)
}));

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...actualStore,
    getService: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: mockIsAppStudio,
    listDestinations: jest.fn()
}));

// Phase 2: Now import modules that depend on the mocked foundational modules.
// These imports will resolve btp-utils, store, etc. to their mocked versions.
const actualCfInquirer = await import('@sap-ux/cf-deploy-config-inquirer');
const actualAbapDeploySubGen = await import('@sap-ux/abap-deploy-config-sub-generator');
const actualProjectAccess = await import('@sap-ux/project-access');

const mockGetPrompts = jest.fn().mockImplementation(actualCfInquirer.getPrompts);
const mockGetAbapQuestions = jest.fn().mockImplementation(actualAbapDeploySubGen.getAbapQuestions);
const mockGetMtaPath = jest.fn().mockImplementation(actualProjectAccess.getMtaPath);
const mockFindCapProjectRoot = jest.fn().mockImplementation(actualProjectAccess.findCapProjectRoot);

jest.unstable_mockModule('@sap-ux/cf-deploy-config-inquirer', () => ({
    ...actualCfInquirer,
    getPrompts: mockGetPrompts
}));

jest.unstable_mockModule('@sap-ux/abap-deploy-config-sub-generator', () => ({
    ...actualAbapDeploySubGen,
    getAbapQuestions: mockGetAbapQuestions
}));

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...actualProjectAccess,
    getMtaPath: mockGetMtaPath,
    findCapProjectRoot: mockFindCapProjectRoot
}));

const { default: DeployGenerator } = await import('../../src/app/index.js');
const { default: yeomanTest } = await import('yeoman-test');
const { TestFixture } = await import('./fixtures/index.js');
const { generatorNamespace, initI18n } = await import('../../src/utils/index.js');
const { TargetName } = await import('@sap-ux/deploy-config-generator-shared');

describe('Deployment Generator', () => {
    jest.setTimeout(200000);
    let cwd: string;
    let outputDir: string;
    const deployPath = join(__dirname, '../src/app');
    const testFixture = new TestFixture();
    const mockSubGen = yeomanTest.createDummyGenerator();

    const seedFiles = (files: Record<string, string>): void => {
        for (const [filePath, contents] of Object.entries(files)) {
            fs.mkdirSync(dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, contents);
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        hasbinSyncMock.mockReturnValue(true);
        // Restore default implementations after clearAllMocks
        mockGetPrompts.mockImplementation(actualCfInquirer.getPrompts);
        mockGetAbapQuestions.mockImplementation(actualAbapDeploySubGen.getAbapQuestions);
        mockGetMtaPath.mockImplementation(actualProjectAccess.getMtaPath);
        mockFindCapProjectRoot.mockImplementation(actualProjectAccess.findCapProjectRoot);
        outputDir = fs.mkdtempSync(join(os.tmpdir(), 'deploy-config-'));
        const mockChdir = jest.spyOn(process, 'chdir');
        mockChdir.mockImplementation((dir): void => {
            cwd = dir;
        });
    });

    beforeAll(async () => {
        jest.clearAllMocks();
        await initI18n();
        // This is a hack to ensure it only returns CLI in all situations
        process.stdin.isTTY = true;
    });

    afterEach(() => {
        fs.rmSync(outputDir, { recursive: true, force: true });
    });

    afterAll(() => {
        jest.resetAllMocks();
        // Remove the test folder if the folder is empty (i.e. no failed tests)
    });

    it('Validate deployment generator exists if the incorrect target is set', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        seedFiles({
            [join(outputDir, 'project1/ui5.yaml')]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
        });

        const appDir = (cwd = join(outputDir, 'project1'));
        await expect(
            yeomanTest
                .create(
                    DeployGenerator,
                    {
                        resolved: deployPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    overwrite: false,
                    skipInstall: true,
                    launchDeployConfigAsSubGenerator: false,
                    projectPath: outputDir,
                    projectName: 'project1',
                    target: 'Unknown'
                })
                .run()
        ).rejects.toThrow(/Unrecognized target: Unknown/);
    });

    it('Validate deployment generator is loaded as root generator', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        const composeWithSpy = jest.spyOn(DeployGenerator.prototype as any, 'composeWith').mockResolvedValue(undefined);

        seedFiles({
            [join(outputDir, 'project1/ui5.yaml')]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
        });

        const appDir = (cwd = join(outputDir, 'project1'));
        await expect(
            yeomanTest
                .create(
                    DeployGenerator,
                    {
                        resolved: deployPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    overwrite: false,
                    skipInstall: true,
                    launchDeployConfigAsSubGenerator: false,
                    projectPath: outputDir,
                    projectName: 'project1',
                    appGenDestination: '~Destination',
                    appGenServiceHost: '~Host',
                    appGenClient: '110'
                })
                .withPrompts({
                    targetName: TargetName.ABAP
                })
                .withGenerators([[mockSubGen, generatorNamespace('test', 'abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('test', 'cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(composeWithSpy).toHaveBeenCalledWith('gen:test_abap', expect.any(Object));
        expect(mockGetPrompts).not.toHaveBeenCalled();
        expect(mockGetAbapQuestions).not.toHaveBeenCalled();
    });

    it('Validate deployment generator is loaded as sub generator', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        mockGetAbapQuestions.mockResolvedValueOnce({ prompts: [], answers: {} } as any);
        seedFiles({
            [join(outputDir, 'mta-app/project1/ui5.yaml')]: testFixture.getContents('mta1/app1/ui5-client-value.yaml'),
            [join(outputDir, 'mta-app/mta.yaml')]: testFixture.getContents('mta1/mta-with-router-deployer.yaml')
        });

        const appDir = (cwd = join(outputDir, 'mta-app/project1'));
        await expect(
            yeomanTest
                .create(
                    DeployGenerator,
                    {
                        resolved: deployPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    overwrite: false,
                    skipInstall: true,
                    data: {
                        destinationRoot: appDir,
                        launchDeployConfigAsSubGenerator: true
                    }
                })
                .withPrompts({
                    targetName: TargetName.ABAP
                })
                .withGenerators([[mockSubGen, generatorNamespace('test', 'abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('test', 'cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(mockGetPrompts).toHaveBeenCalledWith(
            expect.not.objectContaining({
                overwrite: expect.anything()
            }),
            expect.any(Object),
            undefined
        );
        expect(mockGetAbapQuestions).toHaveBeenCalledWith(
            expect.objectContaining({
                appRootPath: expect.stringContaining(join(outputDir, 'mta-app/project1')),
                backendConfig: {
                    client: 100,
                    path: '/sap',
                    scp: true,
                    url: 'https://abap.staging.hana.ondemand.com'
                }
            })
        );
    });

    it('Validate deployment generator is loaded and backend config is loaded from options', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        mockGetAbapQuestions.mockResolvedValueOnce({ prompts: [], answers: {} } as any);
        seedFiles({
            [join(outputDir, 'project1/ui5.yaml')]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
        });

        const appDir = (cwd = join(outputDir, 'project1'));
        await expect(
            yeomanTest
                .create(
                    DeployGenerator,
                    {
                        resolved: deployPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    overwrite: false,
                    skipInstall: true,
                    appGenDestination: '~Destination',
                    appGenServiceHost: '~Host',
                    appGenClient: '110',
                    launchDeployConfigAsSubGenerator: true
                })
                .withPrompts({
                    targetName: TargetName.ABAP
                })
                .withGenerators([[mockSubGen, generatorNamespace('test', 'abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('test', 'cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(mockGetPrompts).toHaveBeenCalledWith(
            {
                destinationName: {
                    addBTPDestinationList: true,
                    additionalChoiceList: expect.any(Array),
                    defaultValue: '~Destination',
                    hint: false,
                    useAutocomplete: true
                },
                overwriteCfConfig: {
                    hide: true
                },
                routerType: {
                    hide: false
                },
                addManagedAppRouter: {
                    hide: true
                }
            },
            expect.any(Object),
            undefined
        );
        expect(mockGetAbapQuestions).toHaveBeenCalledWith({
            appRootPath: expect.stringContaining('project1'),
            backendConfig: expect.objectContaining({
                destination: '~Destination',
                client: '110',
                scp: false,
                url: '~Host'
            }),
            configFile: undefined,
            connectedSystem: undefined,
            indexGenerationAllowed: false,
            logger: expect.any(Object),
            showOverwriteQuestion: false
        });
    });

    it('Validate deployment generator is ran standalone (no backend config)', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        mockGetAbapQuestions.mockResolvedValueOnce({ prompts: [], answers: {} } as any);
        seedFiles({
            [join(outputDir, 'project1/ui5.yaml')]: testFixture.getContents('mta1/app1/ui5.yaml')
        });

        const appDir = (cwd = join(outputDir, 'project1'));
        await expect(
            yeomanTest
                .create(
                    DeployGenerator,
                    {
                        resolved: deployPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    overwrite: false,
                    skipInstall: true,
                    data: {
                        destinationRoot: appDir,
                        launchDeployConfigAsSubGenerator: true
                    }
                })
                .withPrompts({
                    targetName: TargetName.ABAP
                })
                .withGenerators([[mockSubGen, generatorNamespace('test', 'abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('test', 'cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(mockGetPrompts).toHaveBeenCalled();
        expect(mockGetAbapQuestions).toHaveBeenCalled();
    });

    it('Validate deployment generator handles CAP project with missing MTA configuration', async () => {
        mockIsAppStudio.mockReturnValueOnce(true);
        mockGetMtaPath.mockResolvedValue(undefined);
        mockFindCapProjectRoot.mockResolvedValue('CAPNodejs');
        seedFiles({
            [join(outputDir, 'capproject/ui5.yaml')]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
        });

        const appDir = (cwd = join(outputDir, 'capproject'));
        await expect(
            yeomanTest
                .create(
                    DeployGenerator,
                    {
                        resolved: deployPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    overwrite: false,
                    skipInstall: true,
                    launchDeployConfigAsSubGenerator: false,
                    projectPath: outputDir,
                    projectName: 'capproject'
                })
                .withGenerators([[mockSubGen, generatorNamespace('test', 'abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('test', 'cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(mockGetPrompts).not.toHaveBeenCalled();
        expect(mockGetAbapQuestions).not.toHaveBeenCalled();
        expect(mockGetMtaPath).toHaveBeenCalledTimes(1);
        expect(mockFindCapProjectRoot).toHaveBeenCalledTimes(1);
    });
});
