import { jest } from '@jest/globals';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import * as memfs from 'memfs';
import yaml from 'js-yaml';
import yeomanTest from 'yeoman-test';
import { TestFixture } from './fixtures';
import type { Editor } from 'mem-fs-editor';

const require = createRequire(import.meta.url);
const __testdirname = path.dirname(fileURLToPath(import.meta.url));

// CJS mock for 'fs' — intercepted by yeoman-generator and other CJS consumers
// jest.mock is hoisted, so we use require() inside the factory
jest.mock('fs', () => {
    const fsLib = jest.requireActual('fs');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const Union = require('unionfs').Union;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const vol = require('memfs').vol;
    const _fs = new Union().use(fsLib);
    const unionFs = _fs.use(vol as unknown as typeof fs);
    unionFs.constants = fsLib.constants;
    unionFs.realpath = fsLib.realpath;
    unionFs.realpathSync = fsLib.realpathSync;
    return unionFs;
});

// ESM mock for 'node:fs' — intercepted by ESM imports (e.g., mock-mta.ts)
// Build a separate unionfs instance but sharing the same memfs.vol singleton
const realFs = { ...fs };
const esmUnionFs = new (await import('unionfs')).Union()
    .use(realFs as unknown as typeof fs)
    .use(memfs.vol as unknown as typeof fs);
(esmUnionFs as any).constants = fs.constants;
(esmUnionFs as any).realpath = fs.realpath;
(esmUnionFs as any).realpathSync = fs.realpathSync;

jest.unstable_mockModule('node:fs', () => ({
    ...esmUnionFs,
    default: esmUnionFs
}));

const mockHasbinSync = jest.fn();

jest.unstable_mockModule('hasbin', () => ({
    default: { sync: mockHasbinSync },
    sync: mockHasbinSync
}));

// Import MockMta AFTER fs mocks are set up so it gets the mocked fs
const { MockMta } = await import('./utils/mock-mta');

jest.unstable_mockModule('@sap/mta-lib', () => ({
    Mta: MockMta
}));

const mockHandleErrorMessage = jest.fn();
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

const { default: AppRouterGenerator } = await import('../src/app-router');
const { initI18n } = await import('../src/utils');
const { ErrorHandler, ERROR_TYPE } = await import('@sap-ux/deploy-config-generator-shared');
const { RouterModuleType } = await import('@sap-ux/cf-deploy-config-writer');

// Use memfs.fs to read files written to virtual paths by the generator
const mockedFs = memfs.fs;

const sapUxTest = 'sap-ux-test';

describe('App router generator tests', () => {
    let cwd: string;
    const OUTPUT_DIR_PREFIX = join(`/output`);
    const testFixture = new TestFixture();
    const appRouterGenPath = join(__testdirname, '../src/app-router');

    beforeEach(() => {
        jest.clearAllMocks();
        memfs.vol.reset();
        const mockChdir = jest.spyOn(process, 'chdir');
        mockChdir.mockImplementation((dir): void => {
            cwd = dir;
        });
        // Delegate to real implementations by default
        mockGetAppRouterPrompts.mockImplementation((...args: unknown[]) =>
            (realCfConfigInquirer.getAppRouterPrompts as Function)(...args)
        );
        mockGenerateBaseConfig.mockImplementation((...args: unknown[]) =>
            (realCfConfigWriter.generateBaseConfig as Function)(...args)
        );
    });

    beforeAll(async () => {
        await initI18n();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('Generate app router project with minimum configuration', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = (cwd = join(`${OUTPUT_DIR_PREFIX}/${sapUxTest}`));
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

        const mtaContent = mockedFs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);

        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.minimum.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);
        commonChecks(testFixture, appRouterDir);
    });

    it('Generate app router project with connectivity config', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = (cwd = OUTPUT_DIR_PREFIX);
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

        const mtaContent = mockedFs.readFileSync(join(`${appRouterDir}/mta.yaml`), 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);

        const expectMtaContent = testFixture.getContents(join(`${sapUxTest}/mta.connectivity.yaml`));
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = mockedFs.readFileSync(join(`${appRouterDir}/router/xs-app.json`), 'utf-8');
        const xsapp = JSON.parse(xsappContent as string);
        const expectXsappContent = testFixture.getContents(join(`${sapUxTest}/router/xs-app.json`));
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appRouterDir);
    });

    it('Generate app router project with direct abap service config', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = (cwd = OUTPUT_DIR_PREFIX);
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

        const mtaContent = mockedFs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);

        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.abapservice.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = mockedFs.readFileSync(`${appRouterDir}/router/xs-app.json`, 'utf-8');
        const xsapp = JSON.parse(xsappContent as string);
        const expectXsappContent = testFixture.getContents('sap-ux-test/router/xs-app-direct-binding.json');
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appRouterDir);
    });

    it('Generate app router project with maximum mta config', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = (cwd = OUTPUT_DIR_PREFIX);
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

        const mtaContent = mockedFs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);
        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.maximum.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = mockedFs.readFileSync(`${appRouterDir}/router/xs-app.json`, 'utf-8');
        const xsapp = JSON.parse(xsappContent as string);
        const expectXsappContent = testFixture.getContents('sap-ux-test/router/xs-app-direct-binding.json');
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appRouterDir);
    });

    it('Generate app router project with managed app router', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = (cwd = OUTPUT_DIR_PREFIX);
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

        const mtaContent = mockedFs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);
        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.managed.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);
    });

    it('Generate app router project with app frontend service', async () => {
        mockHasbinSync.mockReturnValue(true);
        const targetFolder = (cwd = OUTPUT_DIR_PREFIX);
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

        const mtaContent = mockedFs.readFileSync(`${appRouterDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent as string);
        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.appfront.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);
        expect(mockedFs.readFileSync(`${appRouterDir}/xs-security.json`, 'utf-8')).toMatchInlineSnapshot(`
            "{
              "xsappname": "sap-ux-test",
              "tenant-mode": "dedicated",
              "description": "Security profile of called application",
              "scopes": [],
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
        const targetFolder = (cwd = OUTPUT_DIR_PREFIX);
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

        const targetFolder = (cwd = OUTPUT_DIR_PREFIX);
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

function commonChecks(testFixture: TestFixture, OUTPUT_DIR_PREFIX: string): void {
    const rootPackageJsonContent = mockedFs.readFileSync(`${OUTPUT_DIR_PREFIX}/package.json`, 'utf-8');
    const rootPackageJson = JSON.parse(rootPackageJsonContent as string);
    const expectRootPackageJsonContent = testFixture.getContents('sap-ux-test/package.json');
    const expectRootPackageJson = JSON.parse(expectRootPackageJsonContent);
    expect(rootPackageJson).toEqual(expectRootPackageJson);

    const routerPackageJsonContent = mockedFs.readFileSync(`${OUTPUT_DIR_PREFIX}/router/package.json`, 'utf-8');
    const routerPackageJson = JSON.parse(routerPackageJsonContent as string);
    const expectRouterPackageJsonContent = testFixture.getContents('sap-ux-test/router/package.json');
    const expectRouterPackageJson = JSON.parse(expectRouterPackageJsonContent);
    expect(routerPackageJson).toEqual(expectRouterPackageJson);
}
