import { sep, join } from 'path';
import DeployGenerator from '../src/app';
import yeomanTest from 'yeoman-test';
import * as memfs from 'memfs';
import hasbin from 'hasbin';
import { TestFixture, mockDestinations } from './fixtures';
import fs from 'fs';
import { generatorNamespace, initI18n } from '../src/utils';
import { TargetName } from '@sap-ux/deploy-config-generator-shared';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { Destination } from '@sap-ux/btp-utils';
import { type ServiceProvider } from '@sap-ux/axios-extension';
import * as cfInquirer from '@sap-ux/cf-deploy-config-inquirer';
import * as deployConfigShared from '@sap-ux/deploy-config-generator-shared';
import * as envUtils from '@sap-ux/fiori-generator-shared';
import * as abapDeploySubGen from '@sap-ux/abap-deploy-config-sub-generator';
import * as projectAccess from '@sap-ux/project-access';

jest.mock('fs', () => {
    const fsLib = jest.requireActual('fs');
    const Union = require('unionfs').Union;
    const vol = require('memfs').vol;
    const _fs = new Union().use(fsLib);
    _fs.constants = fsLib.constants;
    return _fs.use(vol as unknown as typeof fs);
});

jest.mock('@sap-ux/cf-deploy-config-writer', () => {
    return {
        ...(jest.requireActual('@sap-ux/cf-deploy-config-writer') as object),
        isMTAFound: () => jest.fn().mockReturnValue(true)
    };
});

jest.mock('hasbin', () => ({
    sync: jest.fn()
}));

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn(),
    listDestinations: jest.fn()
}));

const hasbinSyncMock = hasbin.sync as jest.MockedFunction<typeof hasbin.sync>;
const mockIsAppStudio = isAppStudio as jest.Mock;
const mockListDestinations = listDestinations as jest.Mock;

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
    });

    it('Validate deployment generator exists if the incorrect target is set', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/s4project/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/s4project`);
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
                    projectName: 's4project',
                    target: 'Unknown'
                })
                .run()
        ).rejects.toThrow(/Unrecognized target: Unknown/);
    });

    it('Validate deployment generator is loaded as root generator', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts');
        const getABAPPromptsSpy = jest.spyOn(abapDeploySubGen, 'getAbapQuestions');
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/s4project/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/s4project`);
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
                    projectName: 's4project',
                    appGenDestination: '~Destinaton',
                    appGenServiceHost: '~Host',
                    appGenClient: '110'
                })
                .withPrompts({
                    targetName: TargetName.ABAP
                })
                .withGenerators([[mockSubGen, generatorNamespace('abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(getCFQuestionsSpy).not.toHaveBeenCalled();
        expect(getABAPPromptsSpy).not.toHaveBeenCalled();
    });

    it('Validate deployment generator is loaded as sub generator', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts');
        const getABAPPromptsSpy = jest
            .spyOn(abapDeploySubGen, 'getAbapQuestions')
            .mockResolvedValueOnce({ prompts: [], answers: {} });
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/s4project/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/s4project`);
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
                    launchDeployConfigAsSubGenerator: true,
                    launchStandaloneFromYui: false,
                    projectPath: OUTPUT_DIR_PREFIX,
                    projectName: 's4project',
                    appGenDestination: '~Destinaton',
                    appGenServiceHost: '~Host',
                    appGenClient: '110'
                })
                .withPrompts({
                    targetName: TargetName.ABAP
                })
                .withGenerators([[mockSubGen, generatorNamespace('abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(getCFQuestionsSpy).toHaveBeenCalled();
        expect(getABAPPromptsSpy).toHaveBeenCalled();
    });

    it('Validate S4 correctly exists is users chooses not to proceed', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}s4project`;
        mockIsAppStudio.mockReturnValueOnce(true);
        jest.spyOn(envUtils, 'getHostEnvironment').mockReturnValue(envUtils.hostEnvironment.cli);
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts');
        const getS4PromptsSpy = jest.spyOn(deployConfigShared, 'getConfirmConfigUpdatePrompt');
        const mockExit = jest.spyOn(process, 'exit').mockImplementation();
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/s4project/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/s4project`);
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
                        additionalPrompts: {
                            confirmConfigUpdate: { show: true, configType: '~Test' }
                        },
                        launchDeployConfigAsSubGenerator: true,
                        destinationRoot: appDir
                    },
                    projectPath: OUTPUT_DIR_PREFIX,
                    projectName: 's4project'
                })
                .withPrompts({
                    confirmConfigUpdate: false
                })
                .withGenerators([[mockSubGen, generatorNamespace('deploy')]])
                .withGenerators([[mockSubGen, generatorNamespace('cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(getS4PromptsSpy).toHaveBeenLastCalledWith('~Test');
        expect(getCFQuestionsSpy).toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('Validate S4 correctly continues and enables target prompting', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        jest.spyOn(envUtils, 'getHostEnvironment').mockReturnValue(envUtils.hostEnvironment.cli);
        const getABAPPromptsSpy = jest.spyOn(abapDeploySubGen, 'getAbapQuestions');
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts').mockResolvedValueOnce([]);
        const getS4PromptsSpy = jest.spyOn(deployConfigShared, 'getConfirmConfigUpdatePrompt');
        const mockExit = jest.spyOn(process, 'exit').mockImplementation();
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/s4project/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml')
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/s4project`);
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
                        additionalPrompts: {
                            confirmConfigUpdate: { show: true, configType: '~Test' }
                        },
                        launchDeployConfigAsSubGenerator: false,
                        destinationRoot: appDir
                    },
                    projectPath: OUTPUT_DIR_PREFIX,
                    projectName: 's4project'
                })
                .withPrompts({
                    confirmConfigUpdate: true,
                    targetName: TargetName.CF
                })
                .withGenerators([[mockSubGen, generatorNamespace('deploy')]])
                .withGenerators([[mockSubGen, generatorNamespace('cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(getS4PromptsSpy).toHaveBeenLastCalledWith('~Test');
        expect(getABAPPromptsSpy).not.toHaveBeenCalled();
        expect(getCFQuestionsSpy).not.toHaveBeenCalled();
        expect(mockExit).not.toHaveBeenCalled();
    });

    it('Validate API Hub Enterprise application is correctly handled', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
        mockIsAppStudio.mockReturnValueOnce(true);
        mockListDestinations.mockResolvedValueOnce(mockDestinations);
        const getCFQuestionsSpy = jest.spyOn(cfInquirer, 'getPrompts').mockResolvedValueOnce([]);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/apibhubproject/ui5.yaml`]: testFixture.getContents('apiHubEnterprise/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/apibhubproject/.env`]: testFixture.getContents('apiHubEnterprise/env'),
                [`.${OUTPUT_DIR_PREFIX}/apibhubproject/webapp/manifest.json`]: testFixture.getContents(
                    'apiHubEnterprise/webapp/manifest.json'
                ),
                [`.${OUTPUT_DIR_PREFIX}/apibhubproject/package.json`]: JSON.stringify({ scripts: {} })
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/apibhubproject`);
        const serviceProvider = {
            log: jest.fn(),
            cookies: 'MockCookie',
            services: {}
        } as any as ServiceProvider;
        const destination: Destination = {
            Name: 'ABHE_catalog',
            Type: 'HTTP',
            Authentication: 'NoAuthentication',
            ProxyType: 'Internet',
            WebIDEAdditionalData: 'full_url',
            Description: 'ABHE_catalog OData Service',
            WebIDEUsage: 'odata_gen',
            Host: 'https://system1/'
        };
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
                    overwrite: false, // If overwrite is false, prompt the user to confirm.
                    skipInstall: true,
                    data: { destinationRoot: appDir, launchDeployConfigAsSubGenerator: true },
                    connectedSystem: {
                        serviceProvider,
                        destination
                    }
                })
                .withPrompts({
                    destination: 'ABHE_catalog',
                    targetName: TargetName.CF
                })
                .withGenerators([[mockSubGen, generatorNamespace('deploy')]])
                .withGenerators([[mockSubGen, generatorNamespace('cf')]])
                .run()
        ).resolves.not.toThrow();

        expect(getCFQuestionsSpy).toHaveBeenLastCalledWith(
            expect.objectContaining({
                addManagedAppRouter: true,
                destinationName: {
                    addBTPDestinationList: false, // todo: retest when modules are published, app studio mocking is not working
                    additionalChoiceList: [
                        {
                            name: 'ABHE_catalog',
                            value: 'ABHE_catalog'
                        }
                    ],
                    defaultValue: 'ABHE_catalog',
                    hint: false,
                    useAutocomplete: true
                },
                overwriteDestinationName: false
            })
        );
        getCFQuestionsSpy.mockRestore();
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
                    launchDeployConfigAsSubGenerator: true,
                    projectPath: OUTPUT_DIR_PREFIX,
                    projectName: 'capproject'
                })
                .withGenerators([[mockSubGen, generatorNamespace('abap')]])
                .withGenerators([[mockSubGen, generatorNamespace('cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(getCFQuestionsSpy).not.toHaveBeenCalled();
        expect(getABAPPromptsSpy).not.toHaveBeenCalled();
        expect(getMtaPathMock).toHaveBeenCalledTimes(1);
        expect(findCapProjectRootMock).toHaveBeenCalledTimes(1);
    });
});
