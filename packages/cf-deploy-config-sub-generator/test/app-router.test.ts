import * as fs from 'fs';
import { join } from 'path';
import AppRouterGenerator from '../src/app-router';
import { RouterModuleType } from '@sap-ux/cf-deploy-config-writer';
import yeomanTest from 'yeoman-test';
import yaml from 'js-yaml';
import { rimraf } from 'rimraf';
import * as memfs from 'memfs';
import hasbin from 'hasbin';
import { TestFixture } from './fixtures';
import { initI18n } from '../src/utils';
import { ErrorHandler, ERROR_TYPE } from '@sap-ux/deploy-config-generator-shared';
import * as deployConfigGenShared from '@sap-ux/deploy-config-generator-shared';
import * as cfConfigWriter from '@sap-ux/cf-deploy-config-writer';
import * as cfConfigInquirer from '@sap-ux/cf-deploy-config-inquirer';

jest.mock('fs', () => {
    const fsLib = jest.requireActual('fs');
    const Union = require('unionfs').Union;
    const vol = require('memfs').vol;
    const _fs = new Union().use(fsLib);
    _fs.constants = fsLib.constants;
    return _fs.use(vol as unknown as typeof fs);
});

jest.mock('hasbin', () => ({
    sync: jest.fn()
}));

jest.mock('@sap/mta-lib', () => {
    return {
        Mta: require('./utils/mock-mta').MockMta
    };
});

const hasbinSyncMock = hasbin.sync as jest.MockedFunction<typeof hasbin.sync>;
const sapUxTest = 'sap-ux-test';

describe('App router generator tests', () => {
    let cwd: string;
    const originalCwd: string = process.cwd();
    const targetfolder = join('/test-output');
    const testFixture = new TestFixture();
    const appRouterGenPath = join(__dirname, '../src/app-router');

    beforeEach(() => {
        memfs.vol.reset();
        jest.clearAllMocks();
        const mockChdir = jest.spyOn(process, 'chdir');
        mockChdir.mockImplementation((dir): void => {
            cwd = dir;
        });
    });

    beforeAll(async () => {
        jest.clearAllMocks();
        await initI18n();
    });

    afterEach(() => {
        process.chdir(originalCwd);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('Generate app router project with minimum configuration', async () => {
        const projectPrefix = sapUxTest;
        const appDir = join(targetfolder, projectPrefix);
        hasbinSyncMock.mockReturnValue(true);
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    { cwd: targetfolder }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: false,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
                .run()
        ).resolves.not.toThrow();

        const mtaContent = fs.readFileSync(`${appDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent);

        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.minimum.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);
        commonChecks(testFixture, appDir);
    });

    it('Generate app router project with connectivity config', async () => {
        hasbinSyncMock.mockReturnValue(true);
        const projectPrefix = sapUxTest;
        const appDir = join(targetfolder, projectPrefix);

        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    { cwd: targetfolder }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: true,
                    addABAPServiceBinding: false
                })
                .run()
        ).resolves.not.toThrow();

        const mtaContent = fs.readFileSync(`${appDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent);

        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.connectivity.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = fs.readFileSync(`${appDir}/router/xs-app.json`, 'utf-8');
        const xsapp = JSON.parse(xsappContent);
        const expectXsappContent = testFixture.getContents('sap-ux-test/router/xs-app.json');
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appDir);
    });

    it('Generate app router project with direct abap service config', async () => {
        hasbinSyncMock.mockReturnValue(true);
        const projectPrefix = sapUxTest;
        const appDir = join(targetfolder, projectPrefix);
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    { cwd: targetfolder }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: false,
                    addABAPServiceBinding: true,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
                .run()
        ).resolves.not.toThrow();

        const mtaContent = fs.readFileSync(`${appDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent);

        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.abapservice.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = fs.readFileSync(`${appDir}/router/xs-app.json`, 'utf-8');
        const xsapp = JSON.parse(xsappContent);
        const expectXsappContent = testFixture.getContents('sap-ux-test/router/xs-app-direct-binding.json');
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appDir);
    });

    it('Generate app router project with maximum mta config', async () => {
        const projectPrefix = sapUxTest;
        const appDir = join(targetfolder, projectPrefix);

        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    { cwd: targetfolder }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: true,
                    addABAPServiceBinding: true,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
                .run()
        ).resolves.not.toThrow();

        const mtaContent = fs.readFileSync(`${appDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent);
        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.maximum.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);

        const xsappContent = fs.readFileSync(`${appDir}/router/xs-app.json`, 'utf-8');
        const xsapp = JSON.parse(xsappContent);
        const expectXsappContent = testFixture.getContents('sap-ux-test/router/xs-app-direct-binding.json');
        const expectXsapp = JSON.parse(expectXsappContent);
        expect(xsapp).toEqual(expectXsapp);
        commonChecks(testFixture, appDir);
    });

    it('Generate app router project with managed app router', async () => {
        const projectPrefix = sapUxTest;
        const appDir = join(targetfolder, projectPrefix);
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    { cwd: targetfolder }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: sapUxTest,
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
                    routerType: RouterModuleType.Managed,
                    addConnectivityService: false,
                    addABAPServiceBinding: false
                })
                .run()
        ).resolves.not.toThrow();

        const mtaContent = fs.readFileSync(`${appDir}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent);
        const expectMtaContent = testFixture.getContents('sap-ux-test/mta.managed.yaml');
        const expectMtaConfig = yaml.load(expectMtaContent);
        expect(mtaConfig).toEqual(expectMtaConfig);
    });

    it('Generate throws error when no mta exe found (CLI)', async () => {
        hasbinSyncMock.mockReturnValue(false);
        // mocking cli behaviour
        jest.spyOn(deployConfigGenShared, 'handleErrorMessage').mockImplementationOnce(() => {
            throw new Error(ErrorHandler.getErrorMsgFromType(ERROR_TYPE.NO_MTA_BIN));
        });
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    { cwd: targetfolder }
                )
                .withOptions({ skipInstall: true })
                .run()
        ).rejects.toThrow();
    });

    it('Generate throws error when no mta exe found (VSCODE)', async () => {
        const getAppRouterPromptsSpy = jest.spyOn(cfConfigInquirer, 'getAppRouterPrompts');
        const generateBaseConfigSpy = jest.spyOn(cfConfigWriter, 'generateBaseConfig');
        hasbinSyncMock.mockReturnValue(false);
        // mocking vscode behaviour
        jest.spyOn(deployConfigGenShared, 'handleErrorMessage').mockImplementationOnce(() => {
            // logs no mta bin error
        });

        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterGenPath
                    },
                    { cwd: targetfolder }
                )
                .withOptions({ skipInstall: true })
                .run()
        ).resolves.not.toThrow();

        expect(getAppRouterPromptsSpy).not.toHaveBeenCalled();
        expect(generateBaseConfigSpy).not.toHaveBeenCalled();
    });
});

function commonChecks(testFixture: TestFixture, OUTPUT_DIR_PREFIX: string): void {
    const rootPackageJsonContent = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/package.json`, 'utf-8');
    const rootPackageJson = JSON.parse(rootPackageJsonContent);
    const expectRootPackageJsonContent = testFixture.getContents('sap-ux-test/package.json');
    const expectRootPackageJson = JSON.parse(expectRootPackageJsonContent);
    expect(rootPackageJson).toEqual(expectRootPackageJson);

    const routerPackageJsonContent = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/router/package.json`, 'utf-8');
    const routerPackageJson = JSON.parse(routerPackageJsonContent);
    const expectRouterPackageJsonContent = testFixture.getContents('sap-ux-test/router/package.json');
    const expectRouterPackageJson = JSON.parse(expectRouterPackageJsonContent);
    expect(routerPackageJson).toEqual(expectRouterPackageJson);
}
