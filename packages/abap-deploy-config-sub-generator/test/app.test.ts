import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import type { AbapDeployConfig } from '@sap-ux/ui5-config';

const __dirname = join(fileURLToPath(import.meta.url), '..');

const mockGetService = jest.fn();
const mockGetVariantNamespace = jest.fn();
const mockSendTelemetry = jest.fn();
const mockGetHostEnvironment = jest.fn();
const mockGetAppType = jest.fn();
const mockGetPrompts = jest.fn();
const mockHandleErrorMessage = jest.fn();

// Pre-import only lightweight modules before mocking
const realStore = await import('@sap-ux/store');
const realProjectAccess = await import('@sap-ux/project-access');
const realAbapInquirer = await import('@sap-ux/abap-deploy-config-inquirer');
const realTelemetry = await import('@sap-ux/telemetry');
const realUtilsProject = await import('../src/utils/project');
const realDeployShared = await import('@sap-ux/deploy-config-generator-shared');

jest.unstable_mockModule('@sap-ux/store', () => ({
    ...realStore,
    getService: mockGetService
}));

jest.unstable_mockModule('../src/utils/project.ts', () => ({
    ...realUtilsProject,
    getVariantNamespace: mockGetVariantNamespace
}));

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    sendTelemetry: mockSendTelemetry,
    isExtensionInstalled: jest.fn().mockReturnValue(true),
    getHostEnvironment: mockGetHostEnvironment,
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn()
    },
    hostEnvironment: { cli: 'CLI', bas: 'BAS', vscode: 'VSCode' },
    DefaultLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    LogWrapper: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    })),
    setYeomanEnvConflicterForce: jest.fn(),
    YUI_EXTENSION_ID: 'SAPOSS.app-studio-toolkit',
    YUI_MIN_VER_FILES_GENERATED_MSG: '1.14.0',
    getDefaultTargetFolder: jest.fn(),
    isCommandRegistered: jest.fn(),
    getPackageScripts: jest.fn(),
    getBootstrapResourceUrls: jest.fn(),
    getFlpId: jest.fn(),
    getSemanticObject: jest.fn(),
    generateAppGenInfo: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...realTelemetry,
    initTelemetrySettings: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/deploy-config-generator-shared', () => ({
    ...realDeployShared,
    handleErrorMessage: mockHandleErrorMessage
}));

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    getAppType: mockGetAppType
}));

jest.unstable_mockModule('@sap-ux/abap-deploy-config-inquirer', () => ({
    ...realAbapInquirer,
    getPrompts: mockGetPrompts
}));

// Dynamic imports after mock registration
const path = await import('node:path');
const yeomanTest = (await import('yeoman-test')).default;
const { default: AbapDeployGenerator } = await import('../src/app');
const { t } = await import('../src/utils/i18n');
const { MessageType } = await import('@sap-devx/yeoman-ui-types');
const { TestFixture } = await import('./fixtures');
const { PackageInputChoices, TargetSystemType, TransportChoices } = await import(
    '@sap-ux/abap-deploy-config-inquirer'
);
const { UI5Config } = await import('@sap-ux/ui5-config');
const { ABAP_DEPLOY_TASK } = await import('../src/utils/constants');
const { hostEnvironment } = await import('@sap-ux/fiori-generator-shared');
const { AuthenticationType } = await import('@sap-ux/store');
const { AdaptationProjectType } = await import('@sap-ux/axios-extension');
const { rimraf } = await import('rimraf');

const abapDeployGenPath = join(__dirname, '../../src/app');

/** Helper to create a temp directory with project files and return it */
function createTempProject(files: Record<string, string>): string {
    const tmpDir = fs.mkdtempSync(join(__dirname, 'test-output-'));
    for (const [relPath, content] of Object.entries(files)) {
        const fullPath = join(tmpDir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
    }
    return tmpDir;
}

describe('Test abap deploy configuration generator', () => {
    jest.setTimeout(60000);
    const testFixture = new TestFixture();
    const tempDirs: string[] = [];
    const originalCwd = process.cwd();

    function makeTempDir(files: Record<string, string>): string {
        const dir = createTempProject(files);
        tempDirs.push(dir);
        return dir;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        mockGetService.mockResolvedValueOnce({
            getAll: jest.fn().mockResolvedValue([])
        });
        mockGetVariantNamespace.mockResolvedValue(undefined);
        // Default: delegate getPrompts to real implementation
        mockGetPrompts.mockImplementation((...args: any[]) => (realAbapInquirer.getPrompts as any)(...args));
        // Default: handleErrorMessage throws in CLI, shows error in VSCode/BAS
        mockHandleErrorMessage.mockImplementation(
            (appWizard: any, { errorType, errorMsg }: { errorType?: string; errorMsg?: string }) => {
                const error =
                    errorMsg ?? realDeployShared.ErrorHandler.getErrorMsgFromType(errorType as any);
                const env = mockGetHostEnvironment();
                if (env === hostEnvironment.cli) {
                    throw new Error(error);
                } else {
                    // Non-CLI: just log, don't throw
                    appWizard?.showError?.(error);
                }
            }
        );
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    afterAll(() => {
        process.chdir(originalCwd);
        for (const dir of tempDirs) {
            rimraf.sync(dir);
        }
    });

    it('should run the generator', async () => {
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        const appDir = makeTempDir({
            'ui5.yaml': testFixture.getContents('/sample/ui5.yaml'),
            'package.json': JSON.stringify({ scripts: {} })
        });

        const showInformationSpy = jest.fn();
        const mockAppWizard = {
            setHeaderTitle: jest.fn(),
            showInformation: showInformationSpy
        };

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
        const appDir = makeTempDir({
            'ui5.yaml': testFixture.getContents('/samplelib/ui5.yaml'),
            'package.json': JSON.stringify({ scripts: {} })
        });

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

        const appDir = makeTempDir({
            'ui5.yaml': testFixture.getContents('/sample/ui5.yaml'),
            'package.json': JSON.stringify({ scripts: {} })
        });

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
        const appDir = makeTempDir({
            'ui5.yaml': testFixture.getContents('/sample/ui5.yaml'),
            'ui5-deploy.yaml': testFixture.getContents('/sample/ui5-deploy.yaml'),
            'package.json': JSON.stringify({ scripts: {} }),
            'webapp/index.html': '<html>mock index</html>'
        });

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
                appRootPath: appDir,
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

        expect(mockGetPrompts).toHaveBeenCalledWith(
            {
                adpProjectType: undefined,
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
                }
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
        mockGetPrompts.mockResolvedValue({
            prompts: [],
            answers: {} as any
        });
        mockGetAppType.mockResolvedValue('Fiori Adaptation');

        const appDir = makeTempDir({
            'ui5.yaml': testFixture.getContents('/sample/ui5.yaml'),
            'ui5-deploy.yaml': testFixture.getContents('/sample/ui5-deploy.yaml'),
            'package.json': JSON.stringify({ scripts: {} }),
            'webapp/index.html': '<html>mock index</html>'
        });

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
                appRootPath: appDir,
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

        expect(mockGetPrompts).toHaveBeenCalledWith(
            {
                adpProjectType: AdaptationProjectType.ON_PREMISE,
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
                }
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
        mockGetPrompts.mockResolvedValue({
            prompts: [],
            answers: {
                targetSystem: 'https://mock.system.sap:24300',
                packageInputChoice: PackageInputChoices.EnterManualChoice,
                packageManual: 'Z123456_UPDATED',
                transportInputChoice: TransportChoices.EnterManualChoice,
                transportManual: 'ZTESTK900001'
            } as any
        });
        mockGetAppType.mockResolvedValue('Fiori Adaptation');

        const appDir = makeTempDir({
            'ui5.yaml': testFixture.getContents('/sample/ui5.yaml'),
            'package.json': JSON.stringify({ scripts: {} }),
            'webapp/index.html': '<html>mock index</html>'
        });

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
                appRootPath: appDir,
                index: true,
                isS4HC: false
            });
        await expect(runContext.run()).resolves.not.toThrow();

        expect(mockGetPrompts).toHaveBeenCalledWith(
            {
                adpProjectType: AdaptationProjectType.ON_PREMISE,
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
                }
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
        const appDir = makeTempDir({});
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
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);

        const appDir = makeTempDir({});
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

        expect(mockGetPrompts).not.toHaveBeenCalled();
    });
});
