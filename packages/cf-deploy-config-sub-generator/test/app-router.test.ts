import * as fs from 'fs';
import * as path from 'path';
import yeomanTest from 'yeoman-test';
import { mtaExecutable } from '@sap-ux/deploy-config-generator-shared';
import yaml from 'js-yaml';
import { TestFixture } from './fixtures';
import AppRouterGenerator from '../src/app-router';
import { RouterModuleType } from '@sap-ux/cf-deploy-config-writer';
import * as memfs from 'memfs';
import { mkdirSync, readdirSync } from 'fs';
import hasbin from 'hasbin';
import * as rimraf from 'rimraf';

// Use an in-memory filesystem to generate the artifacts into.
// `unionfs` is used to unify node's std fs and memfs
jest.mock('fs', () => {
    const fs1 = jest.requireActual('fs');
    const Union = require('unionfs').Union;
    const vol = require('memfs').vol;
    const _fs = new Union().use(fs1);
    _fs.constants = fs1.constants;
    return _fs.use(vol as unknown as typeof fs);
});

jest.mock('@sap/mta-lib', () => {
    return {
        Mta: require('./utils/mock-mta').MockMta
    };
});

jest.mock('hasbin', () => ({
    sync: jest.fn()
}));

describe('App Router Generator Tests', () => {
    const originalCwd: string = process.cwd();
    const targetfolder = path.join(__dirname, './test-output');
    const testFixture = new TestFixture();
    const OUTPUT_DIR_PREFIX = '/mta1';
    const appRouterPath = path.join(__dirname, '../src/app-router');
    const hasSyncMock = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        memfs.vol.reset();
        hasSyncMock.mockImplementation((bin: string) =>
            bin === mtaExecutable ? true : jest.requireActual('hasbin').sync(bin)
        );
        (hasbin.sync as jest.Mock).mockReturnValue(true);
    });

    beforeAll(() => {
        rimraf.sync(targetfolder);
        try {
            mkdirSync(targetfolder, { recursive: true });
        } catch {}
        jest.clearAllMocks();
        jest.mock('hasbin', () => {
            return {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                ...(jest.requireActual('hasbin') as {}),
                sync: hasSyncMock
            };
        });
    });

    afterEach(() => {
        process.chdir(originalCwd);
    });

    afterAll(() => {
        jest.resetAllMocks();
        // Remove the test folder if the folder is empty (i.e. no failed tests)
        try {
            if (readdirSync(targetfolder).length === 0) {
                console.log('Removing test output folder');
                rimraf.sync(targetfolder);
            }
        } catch {}
    });

    it('Generate app router project with minimum configuration', async () => {
        const projectPrefix = 'sap-ux-test';
        const appDir = `${targetfolder}${path.sep}${projectPrefix}`;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterPath
                    },
                    { cwd: targetfolder }
                )
                .withOptions({ skipInstall: true, selectedABAPService: true })
                .withPrompts({
                    mtaPath: `${targetfolder}${path.sep}`,
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
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
        const projectPrefix = 'sap-ux-test';
        const appDir = `${targetfolder}${path.sep}${projectPrefix}`;

        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterPath
                    },
                    { cwd: appDir }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: `${targetfolder}${path.sep}`,
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
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
        const projectPrefix = 'sap-ux-test';
        const appDir = `${targetfolder}${path.sep}${projectPrefix}`;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterPath
                    },
                    { cwd: appDir }
                )
                .withOptions({ skipInstall: true, selectedABAPService: true })
                .withPrompts({
                    mtaPath: `${targetfolder}${path.sep}`,
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
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
        const projectPrefix = 'sap-ux-test';
        const appDir = `${targetfolder}${path.sep}${projectPrefix}`;

        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterPath
                    },
                    { cwd: appDir }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: `${targetfolder}${path.sep}`,
                    mtaId: 'sap-ux-test',
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
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
        const projectPrefix = 'sap-ux-test';
        const appDir = `${targetfolder}${path.sep}${projectPrefix}`;
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterPath
                    },
                    { cwd: appDir }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: `${targetfolder}${path.sep}`,
                    mtaId: 'sap-ux-test',
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

    it('Generate app router project with managed app router using long project name', async () => {
        const mtaId = 'sap-ux-test-using-a-very-very-very-long-project-name-for-testing';
        await expect(
            yeomanTest
                .create(
                    AppRouterGenerator,
                    {
                        resolved: appRouterPath
                    },
                    { cwd: OUTPUT_DIR_PREFIX }
                )
                .withOptions({ skipInstall: true })
                .withPrompts({
                    mtaPath: OUTPUT_DIR_PREFIX,
                    mtaId,
                    mtaDescription: 'Main MTA configuration for router',
                    mtaVersion: '0.0.1',
                    routerType: RouterModuleType.Managed,
                    addConnectivityService: false,
                    addDestinationService: false
                })
                .run()
        ).resolves.not.toThrow();

        const mtaContent = fs.readFileSync(`${OUTPUT_DIR_PREFIX}/${mtaId}/mta.yaml`, 'utf-8');
        const mtaConfig = yaml.load(mtaContent);
        expect(mtaConfig).toMatchSnapshot();
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
