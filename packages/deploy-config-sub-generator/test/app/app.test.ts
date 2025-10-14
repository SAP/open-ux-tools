import { sep, join } from 'node:path';
import DeployGenerator from '../../src/app';
import yeomanTest from 'yeoman-test';
import * as memfs from 'memfs';
import hasbin from 'hasbin';
import { TestFixture } from './fixtures';
import { generatorNamespace, initI18n } from '../../src/utils';
import { TargetName } from '@sap-ux/deploy-config-generator-shared';
import { isAppStudio } from '@sap-ux/btp-utils';
import * as cfInquirer from '@sap-ux/cf-deploy-config-inquirer';
import * as abapDeploySubGen from '@sap-ux/abap-deploy-config-sub-generator';
import * as projectAccess from '@sap-ux/project-access';
import Generator from 'yeoman-generator';
import type fs from 'node:fs';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true)
}));

jest.mock('fs', () => {
    const fsLib = jest.requireActual('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Union = require('unionfs').Union;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vol = require('memfs').vol;
    const _fs = new Union().use(fsLib);
    _fs.constants = fsLib.constants;
    const memfs = _fs.use(vol as unknown as typeof fs);
    memfs.realpath = fsLib.realpath;
    memfs.realpathSync = fsLib.realpathSync;
    return memfs;
});

jest.mock('@sap-ux/cf-deploy-config-writer', () => {
    return {
        ...(jest.requireActual('@sap-ux/cf-deploy-config-writer') as object),
        isMTAFound: () => jest.fn().mockReturnValue(true)
    };
});

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));

jest.mock('hasbin', () => ({
    sync: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

const hasbinSyncMock = hasbin.sync as jest.MockedFunction<typeof hasbin.sync>;
const mockIsAppStudio = isAppStudio as jest.Mock;

describe('Deployment Generator', () => {
    jest.setTimeout(200000);
    let cwd: string;
    const deployPath = join(__dirname, '../src/app');
    const OUTPUT_DIR_PREFIX = join('/output');
    const testFixture = new TestFixture();
    const mockSubGen = yeomanTest.createDummyGenerator();

    beforeEach(() => {
        jest.restoreAllMocks();
        hasbinSyncMock.mockReturnValue(true);
        memfs.vol.reset();
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

    afterAll(() => {
        jest.resetAllMocks();
        // Remove the test folder if the folder is empty (i.e. no failed tests)
    });

    it('Validate deployment generator exists if the incorrect target is set', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/project1/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/project1`);
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
                    projectPath: OUTPUT_DIR_PREFIX,
                    projectName: 'project1',
                    target: 'Unknown'
                })
                .run()
        ).rejects.toThrow(/Unrecognized target: Unknown/);
    });

    it('Validate deployment generator is loaded as root generator', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        const composeWithSpy = jest.spyOn(Generator.prototype, 'composeWith');

        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts');
        const getABAPPromptsSpy = jest.spyOn(abapDeploySubGen, 'getAbapQuestions');
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/project1/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/project1`);
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
                    projectPath: OUTPUT_DIR_PREFIX,
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
        expect(getCFQuestionsSpy).not.toHaveBeenCalled();
        expect(getABAPPromptsSpy).not.toHaveBeenCalled();
    });

    it('Validate deployment generator is loaded as sub generator', async () => {
        cwd = join(OUTPUT_DIR_PREFIX, 'mta-app/project1');
        mockIsAppStudio.mockReturnValueOnce(true);
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts');
        const getABAPPromptsSpy = jest
            .spyOn(abapDeploySubGen, 'getAbapQuestions')
            .mockResolvedValueOnce({ prompts: [], answers: {} });
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/mta-app/project1/ui5.yaml`]: testFixture.getContents(
                    'mta1/app1/ui5-client-value.yaml'
                ),
                [`.${OUTPUT_DIR_PREFIX}/mta-app/mta.yaml`]: testFixture.getContents(
                    'mta1/mta-with-router-deployer.yaml'
                )
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/mta-app/project1`);
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
        expect(getCFQuestionsSpy).toHaveBeenCalled();
        expect(getABAPPromptsSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                appRootPath: expect.stringContaining(join('/output/mta-app/project1')),
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
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts');
        const getABAPPromptsSpy = jest
            .spyOn(abapDeploySubGen, 'getAbapQuestions')
            .mockResolvedValueOnce({ prompts: [], answers: {} });
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/project1/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/project1`);
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
        expect(getCFQuestionsSpy).toHaveBeenCalledWith(
            {
                destinationName: {
                    addBTPDestinationList: false,
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
            expect.any(Object)
        );
        expect(getABAPPromptsSpy).toHaveBeenCalledWith({
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
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts');
        const getABAPPromptsSpy = jest
            .spyOn(abapDeploySubGen, 'getAbapQuestions')
            .mockResolvedValueOnce({ prompts: [], answers: {} });
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/project1/ui5.yaml`]: testFixture.getContents('mta1/app1/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/project1`);
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
        expect(getCFQuestionsSpy).toHaveBeenCalled();
        expect(getABAPPromptsSpy).toHaveBeenCalled();
    });

    it('Validate deployment generator handles CAP project with missing MTA configuration', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}capproject`;
        mockIsAppStudio.mockReturnValueOnce(true);
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts');
        const getABAPPromptsSpy = jest.spyOn(abapDeploySubGen, 'getAbapQuestions');
        const getMtaPathMock = jest.spyOn(projectAccess, 'getMtaPath').mockResolvedValue(undefined);
        const findCapProjectRootMock = jest.spyOn(projectAccess, 'findCapProjectRoot').mockResolvedValue('CAPNodejs');
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/capproject/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/capproject`);
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
                    projectPath: OUTPUT_DIR_PREFIX,
                    projectName: 'capproject'
                })
                .withGenerators([[mockSubGen, generatorNamespace('test', 'abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('test', 'cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(getCFQuestionsSpy).not.toHaveBeenCalled();
        expect(getABAPPromptsSpy).not.toHaveBeenCalled();
        expect(getMtaPathMock).toHaveBeenCalledTimes(1);
        expect(findCapProjectRootMock).toHaveBeenCalledTimes(1);
    });
});
