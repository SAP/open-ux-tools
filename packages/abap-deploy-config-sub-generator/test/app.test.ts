import yeomanTest from 'yeoman-test';
import { join } from 'path';
import fs from 'fs';
import * as memfs from 'memfs';
import AbapDeployGenerator from '../src/app';
import * as abapInquirer from '@sap-ux/abap-deploy-config-inquirer';
import * as abapWriter from '@sap-ux/abap-deploy-config-writer';
import { t } from '../src/utils/i18n';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import { AuthenticationType, getService } from '@sap-ux/store';
import { mockTargetSystems } from './fixtures/targets';
import { TestFixture } from './fixtures';
import { PackageInputChoices, TargetSystemType, TransportChoices } from '@sap-ux/abap-deploy-config-inquirer';
import { AbapDeployConfig, UI5Config } from '@sap-ux/ui5-config';
import { ABAP_DEPLOY_TASK } from '../src/utils/constants';
import { getHostEnvironment, hostEnvironment, sendTelemetry } from '@sap-ux/fiori-generator-shared';

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn()
}));

const mockGetService = getService as jest.Mock;
mockGetService.mockResolvedValueOnce({
    getAll: jest.fn().mockResolvedValueOnce(mockTargetSystems)
});

jest.mock('fs', () => {
    const fsLib = jest.requireActual('fs');
    const Union = require('unionfs').Union;
    const vol = require('memfs').vol;
    const _fs = new Union().use(fsLib);
    _fs.constants = fsLib.constants;
    return _fs.use(vol as unknown as typeof fs);
});

jest.mock('@sap-ux/fiori-generator-shared', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    sendTelemetry: jest.fn(),
    isExtensionInstalled: jest.fn().mockReturnValue(true),
    getHostEnvironment: jest.fn()
}));

const mockGetHostEnvironment = getHostEnvironment as jest.Mock;
const mockSendTelemetry = sendTelemetry as jest.Mock;

jest.mock('@sap-ux/telemetry', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
            getAll: jest.fn().mockResolvedValue({})
        });
        const mockChdir = jest.spyOn(process, 'chdir');
        mockChdir.mockImplementation((dir): void => {
            cwd = dir;
        });
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
            'deploy': 'npm run build && fiori deploy --config ui5-deploy.yaml && rimraf archive.zip',
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
                name: 'ZFETRAVEL',
                description: 'Test Description',
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
                projectPath: OUTPUT_DIR_PREFIX,
                projectName: 'app1',
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
                ui5AbapRepo: { default: 'ZUI5_APP' },
                description: { default: 'Deployment description' },
                packageManual: { default: 'Z123456' },
                transportManual: { default: 'ZTESTK900000' },
                index: { indexGenerationAllowed: false },
                packageAutocomplete: { useAutocomplete: true },
                overwrite: { hide: true }
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

        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
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
