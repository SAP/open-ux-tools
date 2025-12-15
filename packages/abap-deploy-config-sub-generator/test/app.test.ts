import yeomanTest from 'yeoman-test';
import { join } from 'node:path';
import fs from 'node:fs';
import * as memfs from 'memfs';
import * as abapInquirer from '@sap-ux/abap-deploy-config-inquirer';
import * as abapWriter from '@sap-ux/abap-deploy-config-writer';
import * as projectAccess from '@sap-ux/project-access';
import AbapDeployGenerator from '../src/app';
import { t } from '../src/utils/i18n';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import { AuthenticationType, getService } from '@sap-ux/store';
import { mockTargetSystems } from './fixtures/targets';
import { TestFixture } from './fixtures';
import { PackageInputChoices, TargetSystemType, TransportChoices } from '@sap-ux/abap-deploy-config-inquirer';
import { UI5Config } from '@sap-ux/ui5-config';
import { ABAP_DEPLOY_TASK } from '../src/utils/constants';
import { getHostEnvironment, hostEnvironment, sendTelemetry } from '@sap-ux/fiori-generator-shared';
import type { AbapDeployConfig } from '@sap-ux/ui5-config';
import { getVariantNamespace } from '../src/utils/project';

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));

jest.mock('../src/utils/project.ts', () => ({
    ...jest.requireActual('../src/utils/project.ts'),
    getVariantNamespace: jest.fn()
}));

const mockGetVariantNamespace = getVariantNamespace as jest.Mock;

const mockGetService = getService as jest.Mock;
mockGetService.mockResolvedValueOnce({
    getAll: jest.fn().mockResolvedValueOnce(mockTargetSystems)
});

jest.mock('fs', () => {
    const fsLib = jest.requireActual('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const Union = require('unionfs').Union;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const vol = require('memfs').vol;
    const _fs = new Union().use(fsLib);
    _fs.constants = fsLib.constants;
    _fs.realpath = fsLib.realpath;
    _fs.realpathSync = fsLib.realpathSync;
    return _fs.use(vol as unknown as typeof fs);
});

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    sendTelemetry: jest.fn(),
    isExtensionInstalled: jest.fn().mockReturnValue(true),
    getHostEnvironment: jest.fn(),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn()
    }
}));

const mockGetHostEnvironment = getHostEnvironment as jest.Mock;
const mockSendTelemetry = sendTelemetry as jest.Mock;

jest.mock('@sap-ux/telemetry', () => ({
    ...(jest.requireActual('@sap-ux/telemetry') as {}),
    initTelemetrySettings: jest.fn()
}));

const abapDeployGenPath = join(__dirname, '../../src/app');

describe('Test abap deploy configuration generator', () => {
    jest.setTimeout(60000);
    const testFixture = new TestFixture();
    let cwd: string;
    const OUTPUT_DIR_PREFIX = join(`/output`);

    beforeEach(() => {
        jest.clearAllMocks();
        memfs.vol.reset();
    });

    beforeEach(() => {
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValue([])
        });
        const mockChdir = jest.spyOn(process, 'chdir');
        mockChdir.mockImplementation((dir): void => {
            cwd = dir;
        });
        mockGetVariantNamespace.mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should run the generator', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        cwd = join(`${OUTPUT_DIR_PREFIX}/app1`);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('/sample/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} })
            },
            '/'
        );

        const showInformationSpy = jest.fn();
        const mockAppWizard = {
            setHeaderTitle: jest.fn(),
            showInformation: showInformationSpy
        };
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);

        const runContext = yeomanTest
            .create(
                AbapDeployGenerator,
                {
                    resolved: abapDeployGenPath
                },
                {
                    cwd: appDir
                }
            )
            .withOptions({
                appWizard: mockAppWizard,
                skipInstall: true,
                launchStandaloneFromYui: true
            })
            .withPrompts({
                targetSystem: TargetSystemType.Url,
                url: 'https://mock.system.sap:24300',
                client: 'NO_CLIENT_FOR_SCP',
                scp: true,
                ui5AbapRepo: 'ZFETRAVEL',
                packageInputChoice: PackageInputChoices.EnterManualChoice,
                packageManual: 'ZLOCAL',
                description: 'Test Description',
                transportInputChoice: TransportChoices.CreateDuringDeployChoice
            });
        await expect(runContext.run()).resolves.not.toThrow();

        const pkgJson = JSON.parse(
            await fs.promises.readFile(`${appDir}/package.json`, {
                encoding: 'utf8'
            })
        );

        expect(pkgJson.scripts).toStrictEqual({
            'deploy': 'npm run build && fiori deploy --config ui5-deploy.yaml',
            'deploy-test': 'npm run build && fiori deploy --config ui5-deploy.yaml --testMode true',
            'undeploy': 'npm run build && fiori undeploy --config ui5-deploy.yaml'
        });

        // as rim raf version may change in future, we are just checking the presence of the dependency
        expect(pkgJson.devDependencies).toHaveProperty('rimraf');

        const ui5DeployConfig = await UI5Config.newInstance(
            await fs.promises.readFile(`${appDir}/ui5-deploy.yaml`, { encoding: 'utf8' })
        );
        const deployTask = ui5DeployConfig.findCustomTask<AbapDeployConfig>(ABAP_DEPLOY_TASK)?.configuration;

        expect(deployTask).toStrictEqual({
            app: {
                description: 'Test Description',
                name: 'ZFETRAVEL',
                package: 'ZLOCAL',
                transport: 'REPLACE_WITH_TRANSPORT'
            },
            target: {
                url: 'https://mock.system.sap:24300',
                scp: true
            },
            exclude: ['/test/']
        });

        expect(showInformationSpy).toHaveBeenCalledWith(t('info.filesGenerated'), MessageType.notification);
    });

    it('should run the generator for a library', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        cwd = join(`${OUTPUT_DIR_PREFIX}/lib1`);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/lib1/ui5.yaml`]: testFixture.getContents('/samplelib/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/lib1/package.json`]: JSON.stringify({ scripts: {} })
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/lib1`);

        const runContext = yeomanTest
            .create(
                AbapDeployGenerator,
                {
                    resolved: abapDeployGenPath
                },
                {
                    cwd: appDir
                }
            )
            .withOptions({
                skipInstall: true,
                launchStandaloneFromYui: true
            })
            .withPrompts({
                targetSystem: 'https://mock.url.target2.com',
                ui5AbapRepo: 'ZLIBRARY',
                packageInputChoice: PackageInputChoices.EnterManualChoice,
                packageManual: '$TMP',
                description: 'Test Description'
            });
        await expect(runContext.run()).resolves.not.toThrow();

        const pkgJson = JSON.parse(
            await fs.promises.readFile(`${appDir}/package.json`, {
                encoding: 'utf8'
            })
        );

        expect(pkgJson.scripts).toStrictEqual({
            'deploy': 'npm run build && fiori deploy --config ui5-deploy.yaml',
            'deploy-test': 'npm run build && fiori deploy --config ui5-deploy.yaml --testMode true',
            'undeploy': 'npm run build && fiori undeploy --config ui5-deploy.yaml'
        });

        // as rim raf version may change in future, we are just checking the presence of the dependency
        expect(pkgJson.devDependencies).toHaveProperty('rimraf');

        const ui5Config = await UI5Config.newInstance(
            await fs.promises.readFile(`${appDir}/ui5.yaml`, { encoding: 'utf8' })
        );
        const ui5TaskFlattenLib = ui5Config.findCustomTask<AbapDeployConfig>('ui5-task-flatten-library');
        expect(ui5TaskFlattenLib).toBeDefined();
        const ui5DeployConfig = await UI5Config.newInstance(
            await fs.promises.readFile(`${appDir}/ui5-deploy.yaml`, { encoding: 'utf8' })
        );
        const deployTask = ui5DeployConfig.findCustomTask<AbapDeployConfig>(ABAP_DEPLOY_TASK)?.configuration;

        expect(deployTask).toStrictEqual({
            app: {
                name: 'ZLIBRARY',
                description: 'Test Description',
                package: '$TMP',
                transport: ''
            },
            target: {
                url: 'https://mock.url.target2.com'
            },
            exclude: ['/test/']
        });
    });

    it('should run the generator as a subgenerator with options provided as answers', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        mockSendTelemetry.mockRejectedValueOnce(new Error('Telemetry error'));

        cwd = join(`${OUTPUT_DIR_PREFIX}/app1`);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('/sample/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} })
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);

        const runContext = yeomanTest
            .create(
                AbapDeployGenerator,
                {
                    resolved: abapDeployGenPath
                },
                {
                    cwd: appDir
                }
            )
            .withOptions({
                skipInstall: true,
                launchDeployConfigAsSubGenerator: true,
                targetSystem: TargetSystemType.Url,
                url: 'https://mock.system.sap:24300',
                client: 'NO_CLIENT_FOR_SCP',
                scp: true,
                ui5AbapRepo: 'ZFETRAVEL',
                packageInputChoice: PackageInputChoices.EnterManualChoice,
                packageManual: 'ZLOCAL',
                description: 'Test Description',
                transportInputChoice: TransportChoices.ListExistingChoice,
                transportFromList: 'TR123'
            });

        await expect(runContext.run()).resolves.not.toThrow();

        const ui5DeployConfig = await UI5Config.newInstance(
            await fs.promises.readFile(`${appDir}/ui5-deploy.yaml`, { encoding: 'utf8' })
        );
        const deployTask = ui5DeployConfig.findCustomTask<AbapDeployConfig>(ABAP_DEPLOY_TASK)?.configuration;

        expect(deployTask).toStrictEqual({
            app: {
                name: 'ZFETRAVEL',
                description: 'Test Description',
                package: 'ZLOCAL',
                transport: 'TR123'
            },
            target: {
                url: 'https://mock.system.sap:24300',
                scp: true
            },
            exclude: ['/test/']
        });
    });

    it('should run the generator with options and existing deploy config + index.html', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        const abapDeployConfigInquirerSpy = jest.spyOn(abapInquirer, 'getPrompts');
        cwd = join(`${OUTPUT_DIR_PREFIX}/app1`);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('/sample/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5-deploy.yaml`]: testFixture.getContents('/sample/ui5-deploy.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/index.html`]: '<html>mock index</html>'
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);

        const runContext = yeomanTest
            .create(
                AbapDeployGenerator,
                {
                    resolved: abapDeployGenPath
                },
                {
                    cwd: appDir
                }
            )
            .withOptions({
                skipInstall: true,
                appRootPath: join(`${OUTPUT_DIR_PREFIX}/app1`),
                index: true
            })
            .withPrompts({
                targetSystem: 'https://mock.url.target2.com',
                ui5AbapRepo: 'ZUI5_APP_UPDATED',
                description: 'New Deployment description',
                packageInputChoice: PackageInputChoices.EnterManualChoice,
                packageManual: 'Z123456_UPDATED',
                transportInputChoice: TransportChoices.EnterManualChoice,
                transportManual: 'ZTESTK900001'
            });
        await expect(runContext.run()).resolves.not.toThrow();

        expect(abapDeployConfigInquirerSpy).toHaveBeenCalledWith(
            {
                backendTarget: {
                    abapTarget: {
                        url: 'https://mock.url.target2.com',
                        authenticationType: AuthenticationType.ReentranceTicket,
                        client: '',
                        destination: undefined,
                        scp: undefined
                    },
                    systemName: undefined,
                    serviceProvider: undefined,
                    type: 'application'
                },
                ui5AbapRepo: { default: 'ZUI5_APP', hideIfOnPremise: false },
                description: { default: 'Deployment description' },
                packageManual: {
                    default: 'Z123456',
                    additionalValidation: {
                        shouldValidatePackageType: false,
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                },
                transportManual: { default: 'ZTESTK900000' },
                index: { indexGenerationAllowed: false },
                packageAutocomplete: {
                    useAutocomplete: true,
                    additionalValidation: {
                        shouldValidatePackageType: false,
                        shouldValidatePackageForStartingPrefix: false,
                        shouldValidateFormatAndSpecialCharacters: false
                    }
                },
                overwriteAbapConfig: { hide: true },
                transportInputChoice: {
                    hideIfOnPremise: false
                },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: false } }
            },
            {},
            false // isYUI
        );

        const ui5DeployConfig = await UI5Config.newInstance(
            await fs.promises.readFile(`${appDir}/ui5-deploy.yaml`, { encoding: 'utf8' })
        );
        const deployTask = ui5DeployConfig.findCustomTask<AbapDeployConfig>(ABAP_DEPLOY_TASK)?.configuration;

        expect(deployTask).toStrictEqual({
            app: {
                name: 'ZUI5_APP_UPDATED',
                description: 'New Deployment description',
                package: 'Z123456_UPDATED',
                transport: 'ZTESTK900001'
            },
            target: {
                url: 'https://mock.url.target2.com'
            },
            exclude: ['/test/']
        });
    });

    it('should run the generator with correct prompt options for adp project', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        mockGetVariantNamespace.mockResolvedValue('apps/workcenter/appVariants/customer.app.variant');
        const abapDeployConfigInquirerSpy = jest
            .spyOn(abapInquirer, 'getPrompts')
            .mockResolvedValue({ prompts: [], answers: {} as abapInquirer.AbapDeployConfigAnswersInternal });
        jest.spyOn(projectAccess, 'getAppType').mockResolvedValueOnce('Fiori Adaptation');
        cwd = join(`${OUTPUT_DIR_PREFIX}/app1`);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('/sample/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5-deploy.yaml`]: testFixture.getContents('/sample/ui5-deploy.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/index.html`]: '<html>mock index</html>'
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);

        const runContext = yeomanTest
            .create(
                AbapDeployGenerator,
                {
                    resolved: abapDeployGenPath
                },
                {
                    cwd: appDir
                }
            )
            .withOptions({
                skipInstall: true,
                appRootPath: join(`${OUTPUT_DIR_PREFIX}/app1`),
                index: true
            })
            .withPrompts({
                targetSystem: 'https://mock.url.target2.com',
                ui5AbapRepo: 'ZUI5_APP_UPDATED',
                description: 'New Deployment description',
                packageInputChoice: PackageInputChoices.EnterManualChoice,
                packageManual: 'Z123456_UPDATED',
                transportInputChoice: TransportChoices.EnterManualChoice,
                transportManual: 'ZTESTK900001'
            });
        await expect(runContext.run()).resolves.not.toThrow();

        expect(abapDeployConfigInquirerSpy).toHaveBeenCalledWith(
            {
                backendTarget: {
                    abapTarget: {
                        url: 'https://mock.url.target2.com',
                        authenticationType: AuthenticationType.ReentranceTicket,
                        client: '',
                        destination: undefined,
                        scp: undefined
                    },
                    systemName: undefined,
                    serviceProvider: undefined,
                    type: 'application'
                },
                ui5AbapRepo: { default: 'ZUI5_APP', hideIfOnPremise: true },
                description: { default: 'Deployment description' },
                packageManual: {
                    default: 'Z123456',
                    additionalValidation: {
                        shouldValidatePackageType: true,
                        shouldValidatePackageForStartingPrefix: true,
                        shouldValidateFormatAndSpecialCharacters: true
                    }
                },
                transportManual: { default: 'ZTESTK900000' },
                index: { indexGenerationAllowed: false },
                packageAutocomplete: {
                    useAutocomplete: true,
                    additionalValidation: {
                        shouldValidatePackageType: true,
                        shouldValidatePackageForStartingPrefix: true,
                        shouldValidateFormatAndSpecialCharacters: true
                    }
                },
                overwriteAbapConfig: { hide: true },
                transportInputChoice: {
                    hideIfOnPremise: true
                },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: true } }
            },
            {},
            false // isYUI
        );

        const ui5DeployConfig = await UI5Config.newInstance(
            await fs.promises.readFile(`${appDir}/ui5-deploy.yaml`, { encoding: 'utf8' })
        );
        const deployTask = ui5DeployConfig.findCustomTask<AbapDeployConfig>(ABAP_DEPLOY_TASK)?.configuration;

        expect(deployTask).toStrictEqual({
            app: {
                package: '$TMP',
                transport: ''
            },
            lrep: 'apps/workcenter/appVariants/customer.app.variant',
            target: {},
            exclude: ['/test/']
        });
    });

    it('should run the generator for adp project on-premise and generate a correct deploy task', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        mockGetVariantNamespace.mockResolvedValue('apps/workcenter/appVariants/customer.app.variant');
        const abapDeployConfigInquirerSpy = jest.spyOn(abapInquirer, 'getPrompts').mockResolvedValue({
            prompts: [],
            answers: {
                targetSystem: 'https://mock.system.sap:24300',
                packageInputChoice: PackageInputChoices.EnterManualChoice,
                packageManual: 'Z123456_UPDATED',
                transportInputChoice: TransportChoices.EnterManualChoice,
                transportManual: 'ZTESTK900001'
            } as abapInquirer.AbapDeployConfigAnswersInternal
        });
        jest.spyOn(projectAccess, 'getAppType').mockResolvedValueOnce('Fiori Adaptation');
        cwd = join(`${OUTPUT_DIR_PREFIX}/app1`);
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('/sample/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/index.html`]: '<html>mock index</html>'
            },
            '/'
        );

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);

        const runContext = yeomanTest
            .create(
                AbapDeployGenerator,
                {
                    resolved: abapDeployGenPath
                },
                {
                    cwd: appDir
                }
            )
            .withOptions({
                skipInstall: true,
                appRootPath: join(`${OUTPUT_DIR_PREFIX}/app1`),
                index: true,
                isS4HC: false
            });
        await expect(runContext.run()).resolves.not.toThrow();

        expect(abapDeployConfigInquirerSpy).toHaveBeenCalledWith(
            {
                backendTarget: {
                    abapTarget: {
                        url: 'https://mock.system.sap:24300',
                        authenticationType: undefined,
                        client: '',
                        destination: undefined,
                        scp: true
                    },
                    systemName: undefined,
                    serviceProvider: undefined,
                    type: 'application'
                },
                ui5AbapRepo: { default: undefined, hideIfOnPremise: true },
                description: { default: undefined },
                packageManual: {
                    default: undefined,
                    additionalValidation: {
                        shouldValidatePackageType: true,
                        shouldValidatePackageForStartingPrefix: true,
                        shouldValidateFormatAndSpecialCharacters: true
                    }
                },
                transportManual: { default: undefined },
                index: { indexGenerationAllowed: false },
                packageAutocomplete: {
                    useAutocomplete: true,
                    additionalValidation: {
                        shouldValidatePackageType: true,
                        shouldValidatePackageForStartingPrefix: true,
                        shouldValidateFormatAndSpecialCharacters: true
                    }
                },
                overwriteAbapConfig: { hide: true },
                transportInputChoice: {
                    hideIfOnPremise: true
                },
                targetSystem: { additionalValidation: { shouldRestrictDifferentSystemType: true } }
            },
            {},
            false // isYUI
        );

        const ui5DeployConfig = await UI5Config.newInstance(
            await fs.promises.readFile(`${appDir}/ui5-deploy.yaml`, { encoding: 'utf8' })
        );
        const deployTask = ui5DeployConfig.findCustomTask<AbapDeployConfig>(ABAP_DEPLOY_TASK)?.configuration;

        expect(deployTask).toStrictEqual({
            app: {
                package: 'Z123456_UPDATED',
                transport: 'ZTESTK900001'
            },
            lrep: 'apps/workcenter/appVariants/customer.app.variant',
            target: {
                url: 'https://mock.system.sap:24300'
            },
            exclude: ['/test/']
        });
    });

    it('handleProjectDoesNotExist - ui5.yaml does not exist in the app folder (CLI)', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
        await expect(
            yeomanTest
                .create(
                    AbapDeployGenerator,
                    {
                        resolved: abapDeployGenPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withOptions({ skipInstall: true })
                .run()
        ).rejects.toThrow(/.*ui5.yaml/i);
    });

    it('handleProjectDoesNotExist - ui5.yaml does not exist in the app folder (VSCode)', async () => {
        const abapDeployConfigInquirerSpy = jest.spyOn(abapInquirer, 'getPrompts');
        const abapDeployConfigWriterSpy = jest.spyOn(abapWriter, 'generate');
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
        await expect(
            yeomanTest
                .create(
                    AbapDeployGenerator,
                    {
                        resolved: abapDeployGenPath
                    },
                    {
                        cwd: appDir
                    }
                )
                .withOptions({ skipInstall: true })
                .run()
        ).resolves.not.toThrow();

        expect(abapDeployConfigInquirerSpy).not.toHaveBeenCalled();
        expect(abapDeployConfigWriterSpy).not.toHaveBeenCalled();
    });
});
