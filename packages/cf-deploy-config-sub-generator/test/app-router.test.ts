import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import yaml from 'js-yaml';
import yeomanTest from 'yeoman-test';
import { TestFixture } from './fixtures/index.js';

const __testdirname = dirname(fileURLToPath(import.meta.url));

const mockHasbinSync = jest.fn() as jest.Mock;

jest.unstable_mockModule('hasbin', () => ({
    default: { sync: mockHasbinSync },
    sync: mockHasbinSync
}));

const { MockMta } = await import('./utils/mock-mta.js');

jest.unstable_mockModule('@sap/mta-lib', () => ({
    Mta: MockMta
}));

const mockHandleErrorMessage = jest.fn() as jest.Mock;
const realDeployShared = await import('@sap-ux/deploy-config-generator-shared');

jest.unstable_mockModule('@sap-ux/deploy-config-generator-shared', () => ({
    ...realDeployShared,
    handleErrorMessage: (...args: unknown[]) => mockHandleErrorMessage(...args)
}));

const mockGetAppRouterPrompts = jest.fn<(...args: unknown[]) => unknown>();
const mockGenerateBaseConfig = jest.fn<(...args: unknown[]) => unknown>();
const realCfConfigInquirer = await import('@sap-ux/cf-deploy-config-inquirer');
const realCfConfigWriter = await import('@sap-ux/cf-deploy-config-writer');

jest.unstable_mockModule('@sap-ux/cf-deploy-config-inquirer', () => ({
    ...realCfConfigInquirer,
    getAppRouterPrompts: (...args: unknown[]) => mockGetAppRouterPrompts(...args)
}));

jest.unstable_mockModule('@sap-ux/cf-deploy-config-writer', () => ({
    ...realCfConfigWriter,
    generateBaseConfig: (...args: unknown[]) => mockGenerateBaseConfig(...args)
}));

const { default: AppRouterGenerator } = await import('../src/app-router/index.js');
const { initI18n } = await import('../src/utils/index.js');
const { ErrorHandler, ERROR_TYPE } = await import('@sap-ux/deploy-config-generator-shared');
const { RouterModuleType } = await import('@sap-ux/cf-deploy-config-writer');

const sapUxTest = 'sap-ux-test';

// Increase timeout for heavy generator lifecycle execution in ESM mode
jest.setTimeout(60000);

describe('App router generator tests', () => {
    const testFixture = new TestFixture();
    const appRouterGenPath = join(__testdirname, '../src/app-router');
    let outputDir: string;

    beforeEach(() => {
        jest.clearAllMocks();
        outputDir = fs.mkdtempSync(join(os.tmpdir(), 'cf-app-router-'));
        // Delegate to real implementations by default
        mockGetAppRouterPrompts.mockImplementation((...args) =>
            (realCfConfigInquirer.getAppRouterPrompts as Function)(...args)
        );
        mockGenerateBaseConfig.mockImplementation((...args) =>
            (realCfConfigWriter.generateBaseConfig as Function)(...args)
        );
    });

    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.resetAllMocks();
        fs.rmSync(outputDir, { recursive: true, force: true });
    });

    it('Generate app router project with minimum configuration', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = outputDir;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    {
                        cwd: targetFolder
                    }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: targetFolder,
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: false,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
                .run()
        ).resolves.not.toThrow();

        const appRouterDir = join(`${targetFolder}/${sapUxTest}`);

        const mtaContent = fs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);

        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.minimum.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);
        commonChecks(testFixture, appRouterDir);
    });

    it('Generate app router project with connectivity config', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = outputDir;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    {
                        cwd: targetFolder
                    }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: targetFolder,
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: true,
                    addABAPServiceBinding: false
                })
                .run()
        ).resolves.not.toThrow();

        const appRouterDir = join(`${targetFolder}/${sapUxTest}`);

        const mtaContent = fs.readFileSync(join(`${appRouterDir}/mta.yaml`), 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);

        const expectMtaContent = testFixture.getContents(join(`${sapUxTest}/mta.connectivity.yaml`));
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = fs.readFileSync(join(`${appRouterDir}/router/xs-app.json`), 'utf-8');
        const xsapp = JSON.parse(xsappContent as string);
        const expectXsappContent = testFixture.getContents(join(`${sapUxTest}/router/xs-app.json`));
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appRouterDir);
    });

    it('Generate app router project with direct abap service config', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = outputDir;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    {
                        cwd: targetFolder
                    }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: targetFolder,
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: false,
                    addABAPServiceBinding: true,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
                .run()
        ).resolves.not.toThrow();

        const appRouterDir = join(`${targetFolder}/${sapUxTest}`);

        const mtaContent = fs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);

        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.abapservice.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = fs.readFileSync(`${appRouterDir}/router/xs-app.json`, 'utf-8');
        const xsapp = JSON.parse(xsappContent as string);
        const expectXsappContent = testFixture.getContents('sap-ux-test/router/xs-app-direct-binding.json');
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appRouterDir);
    });

    it('Generate app router project with maximum mta config', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = outputDir;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    {
                        cwd: targetFolder
                    }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: targetFolder,
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: true,
                    addABAPServiceBinding: true,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
                .run()
        ).resolves.not.toThrow();

        const appRouterDir = join(`${targetFolder}/${sapUxTest}`);

        const mtaContent = fs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);
        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.maximum.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = fs.readFileSync(`${appRouterDir}/router/xs-app.json`, 'utf-8');
        const xsapp = JSON.parse(xsappContent as string);
        const expectXsappContent = testFixture.getContents('sap-ux-test/router/xs-app-direct-binding.json');
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appRouterDir);
    });

    it('Generate app router project with managed app router', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = outputDir;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    {
                        cwd: targetFolder
                    }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: targetFolder,
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
                    routerType: RouterModuleType.Managed,
                    addConnectivityService: false,
                    addABAPServiceBinding: false
                })
                .run()
        ).resolves.not.toThrow();

        const appRouterDir = join(`${targetFolder}/${sapUxTest}`);

        const mtaContent = fs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);
        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.managed.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);
    });

    it('Generate app router project with app frontend service', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = outputDir;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    {
                        cwd: targetFolder
                    }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: targetFolder,
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
                    routerType: RouterModuleType.AppFront
                })
                .run()
        ).resolves.not.toThrow();

        const appRouterDir = join(`${targetFolder}/${sapUxTest}`);

        const mtaContent = fs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);
        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.appfront.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);
        expect(fs.readFileSync(`${appRouterDir}/xs-security.json`, 'utf-8')).toMatchInlineSnapshot(`
            "{
              "description": "Security profile of called application",
              "scopes": [],
              "attributes": [],
              "role-templates": []
            }
            "
        `);
    });

    it('Generate throws error when no mta exe found (CLI)', async () => {
        mockHasbinSync.mockReturnValue(false);
        // mocking cli behaviour
        mockHandleErrorMessage.mockImplementationOnce(() => {
            throw new Error(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MTA_BIN));
        });
        const targetFolder = outputDir;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    {
                        cwd: targetFolder
                    }
                )
                .withOptions({ skipInstall: true })
                .run()
        ).rejects.toThrow();
    });

    it('Generate throws error when no mta exe found (VSCODE)', async () => {
        mockHasbinSync.mockReturnValue(false);
        // mocking vscode behaviour
        mockHandleErrorMessage.mockImplementationOnce(() => {
            // logs no mta bin error
        });

        const targetFolder = outputDir;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    {
                        cwd: targetFolder
                    }
                )
                .withOptions({ skipInstall: true })
                .run()
        ).resolves.not.toThrow();

        expect(mockGetAppRouterPrompts).not.toHaveBeenCalled();
        expect(mockGenerateBaseConfig).not.toHaveBeenCalled();
    });
});

function commonChecks(testFixture: TestFixture, appRouterDir: string): void {
    const rootPackageJsonContent = fs.readFileSync(`${appRouterDir}/package.json`, 'utf-8');
    const rootPackageJson = JSON.parse(rootPackageJsonContent as string);
    const expectRootPackageJsonContent = testFixture.getContents('sap-ux-test/package.json');
    const expectRootPackageJson = JSON.parse(expectRootPackageJsonContent);
    expect(rootPackageJson).toEqual(expectRootPackageJson);

    const routerPackageJsonContent = fs.readFileSync(`${appRouterDir}/router/package.json`, 'utf-8');
    const routerPackageJson = JSON.parse(routerPackageJsonContent as string);
    const expectRouterPackageJsonContent = testFixture.getContents('sap-ux-test/router/package.json');
    const expectRouterPackageJson = JSON.parse(expectRouterPackageJsonContent);
    expect(routerPackageJson).toEqual(expectRouterPackageJson);
}
