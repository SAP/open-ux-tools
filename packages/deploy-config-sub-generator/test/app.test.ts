import { sep, join } from 'path';
import DeployGenerator from '../src/app';
import yeomanTest from 'yeoman-test';
import * as memfs from 'memfs';
import hasbin from 'hasbin';
import { TestFixture } from './fixtures';
import fs from 'fs';
import { generatorNamespace, initI18n } from '../src/utils';
import { TargetName } from '@sap-ux/deploy-config-generator-shared';
import { isAppStudio, listDestinations } from '@sap-ux/btp-utils';
import { mockDestinations } from '@sap-ux/abap-deploy-config-inquirer/test/fixtures/destinations';
import { Destination } from '@sap-ux/btp-utils';
import { type ServiceProvider } from '@sap-ux/axios-extension';
import * as cfInquirer from '@sap-ux/cf-deploy-config-inquirer';
import * as deployConfigShared from '@sap-ux/deploy-config-generator-shared';
import * as envUtils from '@sap-ux/fiori-generator-shared';

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
        jest.clearAllMocks();
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

    it('Validate S4 correctly exists', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
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
                        additionalPrompts: { confirmConfigUpdate: { show: true, configType: '~Test' } },
                        destinationRoot: appDir
                    },
                    launchStandaloneFromYui: true,
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
        expect(getCFQuestionsSpy).not.toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('Validate S4 correctly continues', async () => {
        cwd = `${OUTPUT_DIR_PREFIX}${sep}project1`;
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
                        additionalPrompts: { confirmConfigUpdate: { show: true, configType: '~Test' } },
                        destinationRoot: appDir
                    },
                    launchDeployConfigAsSubGenerator: true,
                    projectPath: OUTPUT_DIR_PREFIX,
                    projectName: 's4project'
                })
                .withPrompts({
                    confirmConfigUpdate: true,
                    targetSystem: TargetName.CF
                })
                .withGenerators([[mockSubGen, generatorNamespace('deploy')]])
                .withGenerators([[mockSubGen, generatorNamespace('cf')]])
                .run()
        ).resolves.not.toThrow();
        expect(getS4PromptsSpy).toHaveBeenLastCalledWith('~Test');
        expect(getCFQuestionsSpy).toHaveBeenCalled();
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
                    launchDeployConfigAsSubGenerator: true,
                    connectedSystem: {
                        serviceProvider,
                        destination
                    },
                    target: TargetName.CF
                })
                .withPrompts({
                    destination: 'ABHE_catalog'
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
});
