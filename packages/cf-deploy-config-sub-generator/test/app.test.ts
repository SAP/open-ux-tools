import { jest } from '@jest/globals';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import * as memfs from 'memfs';
import { Union } from 'unionfs';
import { load, dump } from 'js-yaml';
import yeomanTest from 'yeoman-test';
import { TestFixture } from './fixtures';
import type { Manifest } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';

const require = createRequire(import.meta.url);
const __testdirname = path.dirname(fileURLToPath(import.meta.url));

// CJS mock for 'fs' — intercepted by yeoman-generator and other CJS consumers
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
const realFs = { ...fs };
const esmUnionFs = new Union().use(realFs as unknown as typeof fs).use(memfs.vol as unknown as typeof fs);
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

const mockIsAppStudio = jest.fn();
const realBtpUtils = await import('@sap-ux/btp-utils');

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...realBtpUtils,
    isAppStudio: () => mockIsAppStudio(),
    listDestinations: () => jest.fn()
}));

const mockFindCapProjectRoot = jest.fn();
const realProjectAccess = await import('@sap-ux/project-access');

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    ...realProjectAccess,
    findCapProjectRoot: () => mockFindCapProjectRoot()
}));

const mockGetHostEnvironment = jest.fn();
const mockSendTelemetry = jest.fn();
const mockIsExtensionInstalled = jest.fn().mockReturnValue(true);
const realFioriGenShared = await import('@sap-ux/fiori-generator-shared');

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    ...realFioriGenShared,
    sendTelemetry: () => mockSendTelemetry(),
    isExtensionInstalled: (...args: unknown[]) => mockIsExtensionInstalled(...args),
    getHostEnvironment: () => mockGetHostEnvironment(),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn()
    }
}));

const mockGetCFQuestions = jest.fn<(...args: unknown[]) => unknown>();
const realQuestions = await import('../src/app/questions');

jest.unstable_mockModule('../src/app/questions.js', () => ({
    ...realQuestions,
    getCFQuestions: (...args: unknown[]) => mockGetCFQuestions(...args)
}));

const mockGenerateAppConfig = jest.fn<(...args: unknown[]) => unknown>();
const realCfConfigWriter = await import('@sap-ux/cf-deploy-config-writer');

jest.unstable_mockModule('@sap-ux/cf-deploy-config-writer', () => ({
    ...realCfConfigWriter,
    generateAppConfig: (...args: unknown[]) => mockGenerateAppConfig(...args)
}));

// Dynamic imports after mock registration
const { default: CFGenerator } = await import('../src/app');
const { initI18n, t } = await import('../src/utils');
const { MessageType } = await import('@sap-devx/yeoman-ui-types');
const { hostEnvironment } = await import('@sap-ux/fiori-generator-shared');
const { ApiHubType, RouterModuleType } = await import('@sap-ux/cf-deploy-config-writer');

// Use memfs.fs to read files written to virtual paths by the generator
const mockedFs = memfs.fs;

const readJson = (filePath: string) => {
    return JSON.parse(mockedFs.readFileSync(filePath).toString());
};

const mockShowInformation = jest.fn();
const mockShowError = jest.fn();
const mockAppWizard = {
    showInformation: mockShowInformation,
    showError: mockShowError
};

describe('Cloud foundry generator tests', () => {
    let cwd: string;
    const cfGenPath = join(__testdirname, '../src/app');
    const OUTPUT_DIR_PREFIX = join('/output');
    const testFixture = new TestFixture();
    let fsMock: Editor;
    beforeEach(() => {
        jest.clearAllMocks();
        memfs.vol.reset();
        const mockChdir = jest.spyOn(process, 'chdir');
        mockChdir.mockImplementation((dir): void => {
            cwd = dir;
        });
        // Delegate to real implementations by default
        mockGetCFQuestions.mockImplementation((...args: unknown[]) =>
            (realQuestions.getCFQuestions as Function)(...args)
        );
        mockGenerateAppConfig.mockImplementation((...args: unknown[]) =>
            (realCfConfigWriter.generateAppConfig as Function)(...args)
        );
        mockIsExtensionInstalled.mockReturnValue(true);
    });

    beforeAll(async () => {
        await initI18n();
        fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('Generate CF deployment to an app within a managed app router', async () => {
        mockHasbinSync.mockReturnValue(true);

        mockIsExtensionInstalled.mockImplementation(() => {
            return true;
        });
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    appWizard: mockAppWizard,
                    launchStandaloneFromYui: true,
                    launchDeployConfigAsSubGenerator: true
                })
                .withPrompts({})
                .run()
        ).resolves.not.toThrow();

        // Before
        const mtaBeforeYaml = new MockMta(join(__testdirname, '/fixtures/mta-types/managed/'));
        const modulesBefore = await mtaBeforeYaml.getModules();
        const resourcesBefore = await mtaBeforeYaml.getResources();
        const parametersBefore = await mtaBeforeYaml.getParameters();

        expect(modulesBefore.length).toEqual(1);
        expect(resourcesBefore.length).toEqual(3);
        expect(parametersBefore).toStrictEqual({});

        // After
        const mtaAfterYaml = new MockMta(`${OUTPUT_DIR_PREFIX}/app1/`);
        const modulesAfter = await mtaAfterYaml.getModules();
        const resourcesAfter = await mtaAfterYaml.getResources();
        const parametersAfter = await mtaAfterYaml.getParameters();

        expect(modulesAfter.length).toEqual(3);
        expect(resourcesAfter.length).toEqual(3);

        const appDestination = modulesAfter.find((m: { name: string }) => m.name === 'managedApp-dest-content');
        // This ensures the `myTestApp` is also the name of the service added to the manifest
        expect(appDestination).toMatchInlineSnapshot(`
            {
              "build-parameters": {
                "no-source": true,
              },
              "name": "managedApp-dest-content",
              "parameters": {
                "content": {
                  "instance": {
                    "destinations": [
                      {
                        "Name": "myTestApp_managedApp_repo_host",
                        "ServiceInstanceName": "managedApp-html5-srv",
                        "ServiceKeyName": "managedApp_repo_host-key",
                        "sap.cloud.service": "myTestApp",
                      },
                      {
                        "Authentication": "OAuth2UserTokenExchange",
                        "Name": "myTestApp_uaa_managedApp",
                        "ServiceInstanceName": "managedApp-xsuaa-srv",
                        "ServiceKeyName": "uaa_managedApp-key",
                        "sap.cloud.service": "myTestApp",
                      },
                    ],
                    "existing_destinations_policy": "update",
                  },
                },
              },
              "requires": [
                {
                  "name": "managedApp-destination-service",
                  "parameters": {
                    "content-target": true,
                  },
                },
                {
                  "name": "managedApp_repo_host",
                  "parameters": {
                    "service-key": {
                      "name": "managedApp_repo_host-key",
                    },
                  },
                },
                {
                  "name": "uaa_managedApp",
                  "parameters": {
                    "service-key": {
                      "name": "uaa_managedApp-key",
                    },
                  },
                },
              ],
              "type": "com.sap.application.content",
            }
        `);
        expect(parametersAfter).toMatchInlineSnapshot(`
            {
              "deploy_mode": "html5-repo",
              "enable-parallel-deployments": true,
            }
        `);
        const appContent = modulesAfter.find((m: { name: string }) => m.name === 'managedApp-app-content');
        expect(appContent).toMatchInlineSnapshot(`
            {
              "build-parameters": {
                "build-result": "resources",
                "requires": [
                  {
                    "artifacts": [
                      "comfioritoolstravel.zip",
                    ],
                    "name": "comfioritoolstravel",
                    "target-path": "resources/",
                  },
                ],
              },
              "name": "managedApp-app-content",
              "path": ".",
              "requires": [
                {
                  "name": "managedApp_repo_host",
                  "parameters": {
                    "content-target": true,
                  },
                },
              ],
              "type": "com.sap.application.content",
            }
        `);
        expect(resourcesAfter).toMatchSnapshot(); // Shows the ui5 destination being added to an existing resource
        const changedManifest: Manifest = readJson(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`);
        expect(changedManifest['sap.cloud']).toMatchInlineSnapshot(`
            {
              "public": true,
              "service": "myTestApp",
            }
        `);
        const xsApp = mockedFs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/xs-app.json`, 'utf-8');
        expect(xsApp).toMatchSnapshot(); // Uses the xs-app-nodestination config
        expect(mockShowInformation).toHaveBeenCalledWith(t('cfGen.info.filesGenerated'), MessageType.notification);
    });

    it('Validate app is added to an existing managed approuter project with an existing FE app', async () => {
        mockHasbinSync.mockReturnValue(true);
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed-apps/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('/app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = (cwd = `${OUTPUT_DIR_PREFIX}/app1`);

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({ skipInstall: true, appRootPath: appDir })
                .withPrompts({ destinationName: 'testDestination' })
                .run()
        ).resolves.not.toThrow();

        // Before
        const mtaBeforeYaml = new MockMta(join(__testdirname, '/fixtures/mta-types/managed-apps/'));
        const modulesBefore = await mtaBeforeYaml.getModules();
        const resourcesBefore = await mtaBeforeYaml.getResources();
        const parametersBefore = await mtaBeforeYaml.getParameters();

        expect(modulesBefore.length).toEqual(3);
        expect(resourcesBefore.length).toEqual(3);
        expect(parametersBefore).toBeDefined();

        // After
        const mtaAfterYaml = new MockMta(`${OUTPUT_DIR_PREFIX}/app1/`);
        const modulesAfter = await mtaAfterYaml.getModules();
        const resourcesAfter = await mtaAfterYaml.getResources();
        const parametersAfter = await mtaAfterYaml.getParameters();

        expect(modulesAfter.length).toEqual(4);
        expect(resourcesAfter.length).toEqual(3);

        const appDestination = modulesAfter.find((m) => m.name === 'managedApp-dest-content');
        // This ensures the `myTestApp` is also the name of the service added to the manifest
        expect(appDestination).toMatchInlineSnapshot(`
            {
              "build-parameters": {
                "no-source": true,
              },
              "name": "managedApp-dest-content",
              "parameters": {
                "content": {
                  "instance": {
                    "destinations": [
                      {
                        "Name": "myTestApp_managedApp_repo_host",
                        "ServiceInstanceName": "managedApp-html5-srv",
                        "ServiceKeyName": "managedApp_repo_host-key",
                        "sap.cloud.service": "myTestApp",
                      },
                      {
                        "Authentication": "OAuth2UserTokenExchange",
                        "Name": "myTestApp_uaa_managedApp",
                        "ServiceInstanceName": "managedApp-xsuaa-srv",
                        "ServiceKeyName": "uaa_managedApp-key",
                        "sap.cloud.service": "myTestApp",
                      },
                    ],
                    "existing_destinations_policy": "update",
                  },
                },
              },
              "requires": [
                {
                  "name": "managedApp-destination-service",
                  "parameters": {
                    "content-target": true,
                  },
                },
                {
                  "name": "managedApp_repo_host",
                  "parameters": {
                    "service-key": {
                      "name": "managedApp_repo_host-key",
                    },
                  },
                },
                {
                  "name": "uaa_managedApp",
                  "parameters": {
                    "service-key": {
                      "name": "uaa_managedApp-key",
                    },
                  },
                },
              ],
              "type": "com.sap.application.content",
            }
        `);
        expect(parametersAfter).toMatchInlineSnapshot(`
            {
              "deploy_mode": "html5-repo",
              "enable-parallel-deployments": true,
            }
        `);
        const appContent = modulesAfter.find((m) => m.name === 'managedApp-app-content');
        // Will now contain two apps for deployment
        expect(appContent).toMatchInlineSnapshot(`
            {
              "build-parameters": {
                "build-result": "resources",
                "requires": [
                  {
                    "artifacts": [
                      "project1.zip",
                    ],
                    "name": "project1",
                    "target-path": "resources/",
                  },
                  {
                    "artifacts": [
                      "comfioritoolstravel.zip",
                    ],
                    "name": "comfioritoolstravel",
                    "target-path": "resources/",
                  },
                ],
              },
              "name": "managedApp-app-content",
              "path": ".",
              "requires": [
                {
                  "name": "managedApp_repo_host",
                  "parameters": {
                    "content-target": true,
                  },
                },
              ],
              "type": "com.sap.application.content",
            }
        `);
        const appHtml5 = modulesAfter.filter((m) => m.type === 'html5');
        expect(appHtml5).toMatchInlineSnapshot(`
            [
              {
                "build-parameters": {
                  "build-result": "dist",
                  "builder": "custom",
                  "commands": [
                    "npm install",
                    "npm run build:cf",
                  ],
                  "supported-platforms": [],
                },
                "name": "project1",
                "path": "project1",
                "type": "html5",
              },
              {
                "build-parameters": {
                  "build-result": "dist",
                  "builder": "custom",
                  "commands": [
                    "npm install",
                    "npm run build:cf",
                  ],
                  "supported-platforms": [],
                },
                "name": "comfioritoolstravel",
                "path": ".",
                "type": "html5",
              },
            ]
        `);

        const changedManifest: Manifest = readJson(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`);

        expect(changedManifest['sap.cloud']).toMatchInlineSnapshot(`
            {
              "public": true,
              "service": "myTestApp",
            }
        `);
        const xsApp = mockedFs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/xs-app.json`, 'utf-8');
        expect(xsApp).toMatchSnapshot();
    });

    it('Validate new managed approuter is added when there is no existing mta.yaml', async () => {
        mockHasbinSync.mockReturnValue(true);
        const projectName = 'TestApp';
        const manifestId = 'a'.repeat(200);
        const manifestConfig = JSON.parse(testFixture.getContents('/app1/webapp/manifest.json'));
        manifestConfig['sap.app'].id = manifestId;
        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/${projectName}/webapp/manifest.json`]: JSON.stringify(manifestConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/${projectName}/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/${projectName}/ui5.yaml`]: testFixture.getContents('/app1/ui5.yaml')
            },
            '/'
        );
        const appDir = `${OUTPUT_DIR_PREFIX}/app1`;

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    appRootPath: join(appDir, projectName),
                    launchDeployConfigAsSubGenerator: false,
                    destinationAuthType: 'NoAuthentication', // Validating SH4
                    routerType: RouterModuleType.Managed
                })
                .withPrompts({
                    destinationName: 'testDestination'
                })
                .run()
        ).resolves.not.toThrow();

        // After
        expect(mockedFs.existsSync(`${OUTPUT_DIR_PREFIX}/app1/mta.yaml`)).toBeFalsy(); // Ensure nothing is added to the root folder

        const mtaAfterYaml = new MockMta(`${OUTPUT_DIR_PREFIX}/app1/${projectName}/`);
        const idAfter = await mtaAfterYaml.getMtaID();
        const modulesAfter = await mtaAfterYaml.getModules();
        const resourcesAfter = await mtaAfterYaml.getResources();
        const parametersAfter = await mtaAfterYaml.getParameters();

        expect(idAfter.length).toEqual(128);
        expect(modulesAfter.length).toEqual(3);
        expect(resourcesAfter.length).toEqual(3);
        expect(parametersAfter).toMatchInlineSnapshot(`
            {
              "deploy_mode": "html5-repo",
              "enable-parallel-deployments": true,
            }
        `);
        const managedApprouter = modulesAfter.find((m) => m.name.includes('-destination-content'));
        expect(managedApprouter).toMatchSnapshot();
        const appContent = modulesAfter.find((m) => m.name.includes('-app-content'));
        expect(appContent).toMatchSnapshot();
        const appHtml5 = modulesAfter.find((m) => m.type === 'html5');
        expect(appHtml5).toMatchSnapshot();
        expect(resourcesAfter).toMatchSnapshot();
        const xsSecurity = readJson(`${OUTPUT_DIR_PREFIX}/app1/${projectName}/xs-security.json`);
        expect(xsSecurity).toMatchSnapshot();
        const gitIgnore = mockedFs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/${projectName}/.gitignore`, 'utf-8');
        expect(gitIgnore).toMatchSnapshot();
        const changedManifest: Manifest = readJson(`${OUTPUT_DIR_PREFIX}/app1/${projectName}/webapp/manifest.json`);
        expect(changedManifest['sap.cloud']).toMatchInlineSnapshot(`
            {
              "public": true,
              "service": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            }
        `);
        const xsApp = readJson(`${OUTPUT_DIR_PREFIX}/app1/${projectName}/xs-app.json`);
        expect(xsApp).toMatchSnapshot();
        const ui5Deploy = mockedFs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/${projectName}/ui5-deploy.yaml`, 'utf-8');
        const ui5DeployYaml = load(ui5Deploy);
        expect(ui5DeployYaml).toMatchSnapshot(); // Validates the archiveName is shortened
    });

    it('Validate app is added and configured for standalone approuter', async () => {
        mockHasbinSync.mockReturnValue(true);
        const standaloneRouterConfig = load(testFixture.getContents('mta-types/standalone/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('/app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('/app1/ui5-client-value.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(standaloneRouterConfig)
            },
            '/'
        );
        const appDir = `${OUTPUT_DIR_PREFIX}/app1`;

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true
                })
                .withPrompts({
                    destinationName: 'TestDestination',
                    addManagedAppRouter: false
                })
                .run()
        ).resolves.not.toThrow();

        // Before
        const mtaBeforeYaml = new MockMta(join(__testdirname, '/fixtures/mta-types/standalone/'));
        const modulesBefore = await mtaBeforeYaml.getModules();
        const resourcesBefore = await mtaBeforeYaml.getResources();
        const parametersBefore = await mtaBeforeYaml.getParameters();

        expect(modulesBefore.length).toEqual(1);
        expect(resourcesBefore.length).toEqual(3);
        expect(parametersBefore).toBeDefined();

        // After
        const mtaAfterYaml = new MockMta(`${OUTPUT_DIR_PREFIX}/app1/`);
        const modulesAfter = await mtaAfterYaml.getModules();
        const resourcesAfter = await mtaAfterYaml.getResources();
        const parametersAfter = await mtaAfterYaml.getParameters();

        expect(modulesAfter.length).toEqual(3);
        expect(resourcesAfter.length).toEqual(4);

        const standaloneRouter = modulesAfter.find((m) => m.type === 'approuter.nodejs');
        expect(standaloneRouter).toMatchInlineSnapshot(`
            {
              "name": "standaloneApp-router",
              "parameters": {
                "disk-quota": "256M",
                "memory": "256M",
              },
              "path": "router",
              "requires": [
                {
                  "name": "standaloneApp-html5-repo-runtime",
                },
                {
                  "name": "standaloneApp-uaa",
                },
                {
                  "group": "destinations",
                  "name": "standaloneApp-destination",
                  "properties": {
                    "forwardAuthToken": false,
                    "name": "ui5",
                    "url": "https://ui5.sap.com",
                  },
                },
              ],
              "type": "approuter.nodejs",
            }
        `);
        expect(parametersAfter).toMatchInlineSnapshot(`
            {
              "deploy_mode": "html5-repo",
              "enable-parallel-deployments": true,
            }
        `);
        const appContent = modulesAfter.find((m) => m.type === 'com.sap.application.content');
        expect(appContent).toMatchInlineSnapshot(`
            {
              "build-parameters": {
                "build-result": "resources",
                "requires": [
                  {
                    "artifacts": [
                      "comfioritoolstravel.zip",
                    ],
                    "name": "comfioritoolstravel",
                    "target-path": "resources/",
                  },
                ],
              },
              "name": "standaloneApp-app-content",
              "path": ".",
              "requires": [
                {
                  "name": "standaloneApp-repo-host",
                  "parameters": {
                    "content-target": true,
                  },
                },
              ],
              "type": "com.sap.application.content",
            }
        `);
        const appHtml5 = modulesAfter.find((m) => m.type === 'html5');
        expect(appHtml5).toMatchInlineSnapshot(`
            {
              "build-parameters": {
                "build-result": "dist",
                "builder": "custom",
                "commands": [
                  "npm install",
                  "npm run build:cf",
                ],
                "supported-platforms": [],
              },
              "name": "comfioritoolstravel",
              "path": ".",
              "type": "html5",
            }
        `);

        const packagejson: Manifest = readJson(`${OUTPUT_DIR_PREFIX}/app1/package.json`);
        expect(packagejson).toMatchSnapshot();

        const changedManifest: Manifest = readJson(`${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`);
        expect(changedManifest['sap.cloud']).toBeUndefined();

        // Validates ui5-deploy template being copied with comment
        const ui5DeployYamlContent = mockedFs.readFileSync(`${OUTPUT_DIR_PREFIX}/app1/ui5-deploy.yaml`, 'utf-8');
        const regExArr = ui5DeployYamlContent.match(/#.*/g);

        if (regExArr) {
            const comments = [...regExArr];
            expect(comments.length).toEqual(1);
            expect(comments[0]).toEqual(
                '# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json'
            );
        } else {
            fail('No comments found in the ui5.yaml file');
        }

        const xsApp = readJson(`${OUTPUT_DIR_PREFIX}/app1/xs-app.json`);
        expect(xsApp).toMatchSnapshot(); // authenticationType should equal `none`
    });

    it('Validate destination name is generated for for ApiHub Enterprise', async () => {
        mockHasbinSync.mockReturnValue(true);
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));
        const getCFQuestionsSpy = mockGetCFQuestions;

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    apiHubConfig: {
                        apiHubKey: 'mockApiHubKey',
                        apiHubType: ApiHubType.apiHubEnterprise
                    }
                })
                .withPrompts({})
                .run()
        ).resolves.not.toThrow();

        expect(getCFQuestionsSpy).toHaveBeenCalledWith({
            addOverwrite: true,
            apiHubConfig: {
                apiHubKey: 'mockApiHubKey',
                apiHubType: 'API_HUB_ENTERPRISE'
            },
            cfDestination: 'ABHE_sap_opu_odata_sap_ZUI_RAP_TRAVEL_M_U025',
            isAbapDirectServiceBinding: false,
            isCap: false,
            projectRoot: expect.stringContaining(appDir)
        });
    });

    it('Validate target path is updated if already exists', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockIsAppStudio.mockReturnValue(true);
        const standaloneRouterConfig = load(testFixture.getContents('mta-types/standalone-with-ui/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('/app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('/app1/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(standaloneRouterConfig)
            },
            '/'
        );
        const appDir = `${OUTPUT_DIR_PREFIX}/app1`;

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true
                })
                .withPrompts({ destinationName: 'TestDestination', addManagedAppRouter: false })
                .run()
        ).resolves.not.toThrow();

        // Before
        const mtaBeforeYaml = new MockMta(join(__testdirname, '/fixtures/mta-types/standalone-with-ui/'));
        const modulesBefore = await mtaBeforeYaml.getModules();
        const resourcesBefore = await mtaBeforeYaml.getResources();
        const parametersBefore = await mtaBeforeYaml.getParameters();

        expect(modulesBefore.length).toEqual(2);
        expect(resourcesBefore.length).toEqual(2);
        expect(parametersBefore).toStrictEqual({});

        // After
        const mtaAfterYaml = new MockMta(`${OUTPUT_DIR_PREFIX}/app1/`);
        const modulesAfter = await mtaAfterYaml.getModules();
        const resourcesAfter = await mtaAfterYaml.getResources();

        const destinationResource = resourcesAfter.find((m) => m.name.includes('-dest-srv'));
        // Validates standalone has HTML5Runtime_enabled set to false
        expect(destinationResource).toMatchInlineSnapshot(`undefined`);
        const appContent = modulesAfter.find((m) => m.type === 'com.sap.application.content');
        expect(appContent).toMatchInlineSnapshot(`
            {
              "build-parameters": {
                "build-result": "resources",
                "requires": [
                  {
                    "artifacts": [
                      "comfioritoolstravel.zip",
                    ],
                    "name": "comfioritoolstravel",
                    "target-path": "resources/",
                  },
                ],
              },
              "name": "standalonewithui_ui_deployer",
              "path": ".",
              "requires": [
                {
                  "name": "standalonewithui_html_repo_host",
                  "parameters": {
                    "content-target": true,
                  },
                },
              ],
              "type": "com.sap.application.content",
            }
        `);
        const appHtml5 = modulesAfter.find((m) => m.type === 'html5');
        expect(appHtml5).toMatchInlineSnapshot(`
            {
              "build-parameters": {
                "build-result": "dist",
                "builder": "custom",
                "commands": [
                  "npm install",
                  "npm run build:cf",
                ],
                "supported-platforms": [],
              },
              "name": "comfioritoolstravel",
              "path": ".",
              "type": "html5",
            }
        `);
    });

    it('Should throw error when mta executable is not found (CLI)', async () => {
        mockHasbinSync.mockReturnValue(false);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true
                })
                .withPrompts({})
                .run()
        ).rejects.toThrow(
            `Cannot find the \"mta\" executable. Please add it to the path or use \"npm i -g mta\" to install it.`
        );
    });

    it('Should show error when mta executable is not found (YUI) and skip lifecycle methods', async () => {
        mockHasbinSync.mockReturnValue(false);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.vscode);
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    appWizard: mockAppWizard
                })
                .withPrompts({})
                .run()
        ).resolves.not.toThrow();

        expect(mockShowError).toHaveBeenCalledWith(
            `Cannot find the \"mta\" executable. Please add it to the path or use \"npm i -g mta\" to install it.`,
            MessageType.notification
        );
    });

    it('Should throw error when cds executable is not found for CAP project', async () => {
        mockHasbinSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        mockFindCapProjectRoot.mockReturnValueOnce('/capRoot');
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true
                })
                .withPrompts({})
                .run()
        ).rejects.toThrow(
            `Cannot find the \"cds\" executable. Please add it to the path or use \"npm i -g @sap/cds-dk\" to install it.`
        );
    });

    it('Ensure init is loaded when loaded as a subgenerator', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        memfs.vol.fromNestedJSON({}, '/');
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    launchDeployConfigAsSubGenerator: true
                })
                .withPrompts({})
                .run()
        ).resolves.not.toThrow();
        expect(mockHasbinSync).toHaveBeenCalledWith('mta');
        expect(mockFindCapProjectRoot).toHaveBeenCalled();
    });

    it('Should throw error when base config is not found', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);

        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig)
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    base: 'missing-base.yaml'
                })
                .withPrompts({})
                .run()
        ).rejects.toThrow(`Error: could not read missing-base.yaml`);
    });

    it('Should throw error when manifest is not found', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    apiHubConfig: {
                        apiHubKey: 'mockApiHubKey',
                        apiHubType: ApiHubType.apiHubEnterprise
                    }
                })
                .withPrompts({})
                .run()
        ).rejects.toThrow('Error: could not read the file: `webapp/manifest.json`.');
    });

    it('Should throw error when not app name is found in manifest', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]: JSON.stringify({
                    'sap.app': { fakeid: 'myTestApp' }
                }),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    apiHubConfig: {
                        apiHubKey: 'mockApiHubKey',
                        apiHubType: ApiHubType.apiHubEnterprise
                    }
                })
                .withPrompts({})
                .run()
        ).rejects.toThrow('Cannot determine the application name from the `manifest.json` file.');
    });

    it('Should throw error if config writing fails', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockGetHostEnvironment.mockReturnValue(hostEnvironment.cli);
        mockGenerateAppConfig.mockImplementation(() => {
            throw new Error('MTA Error');
        });
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/app1/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/app1/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/app1/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/app1/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'app1');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: true,
                    appWizard: mockAppWizard
                })
                .withPrompts({})
                .run()
        ).rejects.toThrow();
    });

    it('Should not throw error in end phase if telemetry fails', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockSendTelemetry.mockImplementation(() => {
            throw new Error('Telemetry Error');
        });
        mockGenerateAppConfig.mockResolvedValue(fsMock);
        const cfGenSpawnSpy = jest.spyOn(CFGenerator.prototype as any, 'spawnCommand').mockResolvedValue({});
        const managedRouterConfig = load(testFixture.getContents('mta-types/managed/mta.yaml'));

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/telemetery/webapp/manifest.json`]:
                    testFixture.getContents('app1/webapp/manifest.json'),
                [`.${OUTPUT_DIR_PREFIX}/telemetery/package.json`]: JSON.stringify({ scripts: {} }),
                [`.${OUTPUT_DIR_PREFIX}/telemetery/mta.yaml`]: dump(managedRouterConfig),
                [`.${OUTPUT_DIR_PREFIX}/telemetery/ui5.yaml`]: testFixture.getContents('app1/ui5.yaml')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'telemetery');

        await expect(
            yeomanTest
                .create(
                    CFGenerator,
                    {
                        resolved: cfGenPath
                    },
                    { cwd: appDir }
                )
                .withOptions({
                    skipInstall: false,
                    appWizard: mockAppWizard,
                    launchStandaloneFromYui: true,
                    launchDeployConfigAsSubGenerator: false
                })
                .withPrompts({})
                .run()
        ).resolves.not.toThrow();
        expect(cfGenSpawnSpy).toHaveBeenCalled();
    });
});
