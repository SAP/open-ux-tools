import fs from 'fs';
import { join } from 'path';
import yeomanTest from 'yeoman-test';
import yaml from 'js-yaml';
import { rimraf } from 'rimraf';
import hasbin from 'hasbin';
import { TestFixture } from './fixtures';
import AppRouterGenerator from '../src/app-router';
import { RouterModuleType } from '@sap-ux/cf-deploy-config-writer';
import { commonChecks } from './utils/checks';
import { initI18n } from '../src/utils';
import { ErrorMessages } from '@sap-ux/deploy-config-generator-shared';
import * as deployConfigGenShared from '@sap-ux/deploy-config-generator-shared';
import * as cfConfigWriter from '@sap-ux/cf-deploy-config-writer';
import * as cfConfigInquirer from '@sap-ux/cf-deploy-config-inquirer';

jest.mock('hasbin', () => ({
    sync: jest.fn()
}));

jest.mock('@sap/mta-lib', () => {
    return {
        Mta: require('./utils/mock-mta').MockMta
    };
});

const hasbinSyncMock = hasbin.sync as jest.MockedFunction<typeof hasbin.sync>;

describe('App router generator tests', () => {
    const targetfolder = join(__dirname, './test-output');
    const testFixture = new TestFixture();
    const appRouterGenPath = join(__dirname, '../src/app-router');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    beforeAll(async () => {
        jest.clearAllMocks();
        await initI18n();
        try {
            fs.mkdirSync(targetfolder);
        } catch {}
    });

    afterAll(() => {
        jest.resetAllMocks();
        rimraf.sync(join(targetfolder, 'sap-ux-test'));
    });

    it('Generate app router project with minimum configuration', async () => {
        const projectPrefix = 'sap-ux-test';
        const appDir = join(targetfolder, projectPrefix);
        hasbinSyncMock.mockReturnValue(true);
        await expect(
            yeomanTest
                .run(AppRouterGenerator, {
                    resolved: appRouterGenPath
                })
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: false,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
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
        const projectPrefix = 'sap-ux-test';
        const appDir = join(targetfolder, projectPrefix);

        await expect(
            yeomanTest
                .run(AppRouterGenerator, {
                    resolved: appRouterGenPath
                })
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: true,
                    addABAPServiceBinding: false
                })
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
        const projectPrefix = 'sap-ux-test';
        const appDir = join(targetfolder, projectPrefix);
        await expect(
            yeomanTest
                .run(AppRouterGenerator, {
                    resolved: appRouterGenPath
                })
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: false,
                    addABAPServiceBinding: true,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
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
        const projectPrefix = 'sap-ux-test';
        const appDir = join(targetfolder, projectPrefix);

        await expect(
            yeomanTest
                .run(AppRouterGenerator, {
                    resolved: appRouterGenPath
                })
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    routerType: RouterModuleType.Standard,
                    addConnectivityService: true,
                    addABAPServiceBinding: true,
                    abapServiceProvider: { label: 'ZZZ_00.0035', service: 'abap-haas' }
                })
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
        const projectPrefix = 'sap-ux-test';
        const appDir = join(targetfolder, projectPrefix);
        await expect(
            yeomanTest
                .run(AppRouterGenerator, {
                    resolved: appRouterGenPath
                })
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: join(targetfolder, '/'),
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
                    routerType: RouterModuleType.Managed,
                    addConnectivityService: false,
                    addABAPServiceBinding: false
                })
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
            throw new Error(ErrorMessages.noMtaBin);
        });
        await expect(
            yeomanTest
                .run(AppRouterGenerator, {
                    resolved: appRouterGenPath
                })
                .withOptions({ skipInstall: true, selectedABAPService: true })
        ).rejects.toThrow(ErrorMessages.noMtaBin);
    });

    it('Generate throws error when no mta exe found (VSCODE)', async () => {
        const getAppRouterPromptsSpy = jest.spyOn(cfConfigInquirer, 'getAppRouterPrompts');
        const generateBaseConfigSpy = jest.spyOn(cfConfigWriter, 'generateBaseConfig');
        hasbinSyncMock.mockReturnValue(false);
        // mocking vscode behaviour
        jest.spyOn(deployConfigGenShared, 'handleErrorMessage').mockImplementationOnce(() => {
            console.log(ErrorMessages.noMtaBin);
        });

        const spawnCommandSpy = jest.spyOn(AppRouterGenerator.prototype, 'spawnCommand').mockImplementationOnce(() => {
            Promise.resolve();
        });

        await expect(
            yeomanTest
                .run(AppRouterGenerator, {
                    resolved: appRouterGenPath
                })
                .withOptions({ skipInstall: false })
        ).resolves.not.toThrow();

        expect(getAppRouterPromptsSpy).not.toHaveBeenCalled();
        expect(generateBaseConfigSpy).not.toHaveBeenCalled();
        expect(spawnCommandSpy).toHaveBeenCalled();
    });
});
