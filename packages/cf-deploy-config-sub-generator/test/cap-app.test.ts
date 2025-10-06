import hasbin from 'hasbin';
import CFGenerator from '../src/app';
import yeomanTest from 'yeoman-test';
import { join } from 'node:path';
import { TestFixture } from './fixtures';
import { initI18n, t } from '../src/utils';
import { RouterModuleType } from '@sap-ux/cf-deploy-config-writer';
import type * as fs from 'node:fs';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';
import * as memfs from 'memfs';
import * as cfDeployWriter from '@sap-ux/cf-deploy-config-writer';
import type { Editor } from 'mem-fs-editor';

const mockIsAppStudio = jest.fn();
jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...(jest.requireActual('@sap-ux/btp-utils') as {}),
        isAppStudio: () => mockIsAppStudio(),
        listDestinations: () => jest.fn()
    };
});

const mockFindCapProjectRoot = jest.fn();
jest.mock('@sap-ux/project-access', () => {
    return {
        ...(jest.requireActual('@sap-ux/project-access') as {}),
        findCapProjectRoot: () => mockFindCapProjectRoot()
    };
});

jest.mock('fs', () => {
    const fsLib = jest.requireActual('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Union = require('unionfs').Union;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vol = require('memfs').vol;
    const _fs = new Union().use(fsLib);
    _fs.constants = fsLib.constants;
    _fs.realpath = fsLib.realpath;
    _fs.realpathSync = fsLib.realpathSync;
    return _fs.use(vol as unknown as typeof fs);
});

jest.mock('hasbin', () => ({
    sync: jest.fn()
}));

jest.mock('@sap/mta-lib', () => {
    return {
        get Mta() {
            return jest.requireActual('./utils/mock-mta').MockMta;
        }
    };
});

const mockGetHostEnvironment = jest.fn();
const mockSendTelemetry = jest.fn();
jest.mock('@sap-ux/fiori-generator-shared', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    sendTelemetry: () => mockSendTelemetry(),
    isExtensionInstalled: jest.fn().mockReturnValue(true),
    getHostEnvironment: () => mockGetHostEnvironment(),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn()
    }
}));

const hasbinSyncMock = hasbin.sync as jest.MockedFunction<typeof hasbin.sync>;

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
    const cfGenPath = join(__dirname, '../src/app');
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
    });

    beforeAll(async () => {
        await initI18n();
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('Validate Approuter prompting aborts if user doesnt want to proceed', async () => {
        hasbinSyncMock.mockReturnValue(true);
        mockFindCapProjectRoot.mockReturnValueOnce('/capmissingmta');
        const mockGenerateCAPConfig = jest.spyOn(cfDeployWriter, 'generateCAPConfig').mockResolvedValue(fsMock);
        const mockGenerateAppConfig = jest.spyOn(cfDeployWriter, 'generateAppConfig').mockResolvedValue(fsMock);
        jest.spyOn(fioriGenShared, 'isExtensionInstalled').mockImplementation(() => {
            return true;
        });

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
        expect(mockSendTelemetry).toHaveBeenCalled();
    });

    it('Validate Approuter prompting is shown if HTML5 is being added to a CAP project with missing mta', async () => {
        hasbinSyncMock.mockReturnValue(true);
        mockFindCapProjectRoot.mockReturnValue(join('/output/', '/capmissingmta'));
        const mockGenerateCAPConfig = jest.spyOn(cfDeployWriter, 'generateCAPConfig').mockResolvedValue(fsMock);
        const mockGenerateAppConfig = jest.spyOn(cfDeployWriter, 'generateAppConfig').mockResolvedValue(fsMock);
        const mockisExtensionInstalled = jest.spyOn(fioriGenShared, 'isExtensionInstalled').mockImplementation(() => {
            return true;
        });

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
        expect(mockisExtensionInstalled).toHaveBeenCalled();
    });
});
