import { jest } from '@jest/globals';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import * as memfs from 'memfs';
import { Union } from 'unionfs';
import yeomanTest from 'yeoman-test';
import { TestFixture } from './fixtures';
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

const mockGenerateCAPConfig = jest.fn<(...args: unknown[]) => unknown>();
const mockGenerateAppConfig = jest.fn<(...args: unknown[]) => unknown>();
const realCfDeployWriter = await import('@sap-ux/cf-deploy-config-writer');

jest.unstable_mockModule('@sap-ux/cf-deploy-config-writer', () => ({
    ...realCfDeployWriter,
    generateCAPConfig: (...args: unknown[]) => mockGenerateCAPConfig(...args),
    generateAppConfig: (...args: unknown[]) => mockGenerateAppConfig(...args)
}));

// Dynamic imports after mock registration
const { default: CFGenerator } = await import('../src/app');
const { initI18n, t } = await import('../src/utils');
const { RouterModuleType } = await import('@sap-ux/cf-deploy-config-writer');

const mockShowInformation = jest.fn();
const mockShowError = jest.fn();
const mockAppWizard = {
    showInformation: mockShowInformation,
    showError: mockShowError
};

describe('Cloud foundry generator tests', () => {
    jest.setTimeout(10000);
    let cwd: string;
    let fsMock: Editor;
    const cfGenPath = join(__testdirname, '../src/app');
    const OUTPUT_DIR_PREFIX = join('/output');
    const testFixture = new TestFixture();

    beforeEach(() => {
        jest.clearAllMocks();
        memfs.vol.reset();
        const mockChdir = jest.spyOn(process, 'chdir');
        mockChdir.mockImplementation((dir): void => {
            cwd = dir;
        });
        fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        // Default: delegate to real implementations
        mockGenerateCAPConfig.mockImplementation((...args: unknown[]) =>
            (realCfDeployWriter.generateCAPConfig as Function)(...args)
        );
        mockGenerateAppConfig.mockImplementation((...args: unknown[]) =>
            (realCfDeployWriter.generateAppConfig as Function)(...args)
        );
        mockIsExtensionInstalled.mockReturnValue(true);
    });

    beforeAll(async () => {
        await initI18n();
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('Validate Approuter prompting aborts if user doesnt want to proceed', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockFindCapProjectRoot.mockReturnValueOnce('/capmissingmta');
        mockGenerateCAPConfig.mockResolvedValue(fsMock);
        mockGenerateAppConfig.mockResolvedValue(fsMock);

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/app/testui5app/webapp/manifest.json`]: testFixture.getContents(
                    'cap/app/testui5app/webapp/manifest.json'
                ),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/app/testui5app/package.json`]: testFixture.getContents(
                    'cap/app/testui5app/package.json'
                ),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/app/testui5app/ui5.yaml`]:
                    testFixture.getContents('cap/app/testui5app/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/app/services.cds`]:
                    testFixture.getContents('cap/app/services.cds'),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/db/schmea.cds`]: testFixture.getContents('cap/db/schema.cds'),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/srv/cat-service.cds`]:
                    testFixture.getContents('cap/srv/cat-service.cds')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'capmissingmta', 'app', 'testui5app');

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
                    launchDeployConfigAsSubGenerator: false
                })
                .withPrompts({
                    addCapMtaContinue: false,
                    routerType: RouterModuleType.Managed,
                    mtaPath: join(OUTPUT_DIR_PREFIX, 'capmissingmta'),
                    mtaId: 'capmtaid'
                })
                .run()
        ).resolves.not.toThrow();
        expect(mockGenerateCAPConfig).not.toHaveBeenCalled();
        expect(mockGenerateAppConfig).not.toHaveBeenCalled();
        expect(mockFindCapProjectRoot).toHaveBeenCalled();
        expect(mockSendTelemetry).not.toHaveBeenCalled();
    });

    it('Validate Approuter prompting is shown if HTML5 is being added to a CAP project with missing mta', async () => {
        mockHasbinSync.mockReturnValue(true);
        mockFindCapProjectRoot.mockReturnValue(join('/output/', '/capmissingmta'));
        mockGenerateCAPConfig.mockResolvedValue(fsMock);
        mockGenerateAppConfig.mockResolvedValue(fsMock);

        memfs.vol.fromNestedJSON(
            {
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/app/testui5app/webapp/manifest.json`]: testFixture.getContents(
                    'cap/app/testui5app/webapp/manifest.json'
                ),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/app/testui5app/package.json`]: testFixture.getContents(
                    'cap/app/testui5app/package.json'
                ),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/app/testui5app/ui5.yaml`]:
                    testFixture.getContents('cap/app/testui5app/ui5.yaml'),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/app/services.cds`]:
                    testFixture.getContents('cap/app/services.cds'),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/db/schmea.cds`]: testFixture.getContents('cap/db/schema.cds'),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/srv/cat-service.cds`]:
                    testFixture.getContents('cap/srv/cat-service.cds'),
                [`.${OUTPUT_DIR_PREFIX}/capmissingmta/package.json`]: testFixture.getContents('cap/package.json')
            },
            '/'
        );
        const appDir = join(OUTPUT_DIR_PREFIX, 'capmissingmta', 'app', 'testui5app');

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
                    launchDeployConfigAsSubGenerator: false
                })
                .withPrompts({
                    addCapMtaContinue: true,
                    routerType: RouterModuleType.Managed,
                    mtaPath: join(OUTPUT_DIR_PREFIX, 'capmissingmta'),
                    mtaId: 'capmtaid' // Will be ignored as question is disabled
                })
                .run()
        ).resolves.not.toThrow();
        expect(mockGenerateCAPConfig).toHaveBeenCalledWith(
            expect.objectContaining({
                mtaId: 'captestproject', // Read from the package.json
                addCapMtaContinue: true,
                mtaPath: join(OUTPUT_DIR_PREFIX, 'capmissingmta'),
                routerType: 'managed'
            }),
            expect.anything(),
            expect.anything()
        );
        expect(mockGenerateAppConfig).toHaveBeenCalled();
        expect(mockFindCapProjectRoot).toHaveBeenCalled();
        expect(mockSendTelemetry).toHaveBeenCalled();
        expect(mockIsExtensionInstalled).toHaveBeenCalled();
    });
});
