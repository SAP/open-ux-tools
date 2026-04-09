import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockTraceChanges = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/trace', () => ({
    traceChanges: mockTraceChanges
}));

const mockPromptYUIQuestions = jest.fn();
const mockFilterLabelTypeQuestions = jest.fn().mockImplementation((questions) => Promise.resolve(questions ?? []));
jest.unstable_mockModule('../../../../src/common', () => ({
    promptYUIQuestions: mockPromptYUIQuestions,
    runNpmInstallCommand: jest.fn(),
    filterLabelTypeQuestions: mockFilterLabelTypeQuestions
}));
jest.unstable_mockModule('../../../../src/common/prompts', () => ({
    promptYUIQuestions: mockPromptYUIQuestions,
    filterLabelTypeQuestions: mockFilterLabelTypeQuestions
}));

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const mockValidateBasePath = jest.fn();
jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: mockValidateBasePath,
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));
jest.unstable_mockModule('../../../../src/validation/validation', () => ({
    validateBasePath: mockValidateBasePath,
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

const commitMock = jest.fn().mockImplementation((callback) => callback());
jest.unstable_mockModule('mem-fs-editor', () => ({
    create(_store: Store) {
        return {
            commit: commitMock,
            dump: jest.fn(),
            read: jest.fn(),
            readJSON: jest.fn(),
            write: jest.fn(),
            writeJSON: jest.fn(),
            copy: jest.fn(),
            copyTpl: jest.fn(),
            delete: jest.fn(),
            exists: jest.fn(),
            extendJSON: jest.fn(),
            move: jest.fn(),
            append: jest.fn()
        } as Partial<Editor> as Editor;
    }
}));

const mockFlpConfigurationExists = jest.fn();
const mockGetAdpConfig = jest.fn();
const mockGetVariant = jest.fn();
const mockGenerateInboundConfig = jest.fn();
const mockGetBaseAppInbounds = jest.fn();
const mockIsCFEnvironment = jest.fn().mockResolvedValue(false);
const mockGetCfBaseAppInbounds = jest.fn();
const mockLoadCfConfig = jest.fn().mockReturnValue({});
const mockGetAppParamsFromUI5Yaml = jest.fn().mockReturnValue({ appHostId: '', appName: '', appVersion: '', spaceGuid: '' });
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    flpConfigurationExists: mockFlpConfigurationExists,
    getAdpConfig: mockGetAdpConfig,
    getVariant: mockGetVariant,
    generateInboundConfig: mockGenerateInboundConfig,
    getBaseAppInbounds: mockGetBaseAppInbounds,
    getInboundsFromManifest: jest.fn(),
    isCFEnvironment: mockIsCFEnvironment,
    getCfBaseAppInbounds: mockGetCfBaseAppInbounds,
    loadCfConfig: mockLoadCfConfig,
    getAppParamsFromUI5Yaml: mockGetAppParamsFromUI5Yaml
}));

jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: jest.fn()
}));

const mockGetAppType = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => createProjectAccessMock({
    getAppType: mockGetAppType
}));

const mockGenerateInboundNavigationConfig = jest.fn();
const mockReadManifest = jest.fn();
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    generateInboundNavigationConfig: mockGenerateInboundNavigationConfig,
    readManifest: mockReadManifest
}));

const mockGetPrompts = jest.fn();
const mockGetTileSettingsQuestions = jest.fn();
const mockGetAdpFlpConfigPromptOptions = jest.fn();
const mockGetAdpFlpInboundsWriterConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/flp-config-inquirer', () => ({
    getPrompts: mockGetPrompts,
    tileActions: { REPLACE: 'replace', ADD: 'add' },
    getTileSettingsQuestions: mockGetTileSettingsQuestions,
    getAdpFlpConfigPromptOptions: mockGetAdpFlpConfigPromptOptions,
    getAdpFlpInboundsWriterConfig: mockGetAdpFlpInboundsWriterConfig
}));

const adpTooling = await import('@sap-ux/adp-tooling');
const projectAccess = await import('@sap-ux/project-access');
type Manifest = projectAccess.Manifest;
type ManifestNamespace = projectAccess.ManifestNamespace;
const { addInboundNavigationConfigCommand } = await import('../../../../src/cli/add/navigation-config');

const flpConfigAnswers = {
    semanticObject: 'so1',
    action: 'act1',
    title: 'title1',
    subTitle: '',
    additionalParameters: '',
    icon: '',
    inboundId: 'so1-act1'
};

const fakeManifest = {
    'sap.app': {
        crossNavigation: {
            inbounds: {
                existingInbound: {}
            }
        }
    }
} as unknown as Manifest;

describe('Test command add navigation-config with ADP scenario', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();

        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;
        mockGetLogger.mockReturnValue(loggerMock);
        mockSetLogLevelVerbose.mockImplementation(() => undefined);
        fsMock = {
            dump: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;

        mockGenerateInboundConfig.mockResolvedValue(fsMock);
        mockGenerateInboundNavigationConfig.mockResolvedValue(fsMock);
        mockPromptYUIQuestions.mockResolvedValue(flpConfigAnswers);

        mockReadManifest.mockResolvedValue({ manifest: fakeManifest, manifestPath: '' });
        mockGetPrompts.mockResolvedValue([]);
        mockGetTileSettingsQuestions.mockReturnValue([]);
        mockGetAdpFlpConfigPromptOptions.mockReturnValue({});
        mockGetAdpFlpInboundsWriterConfig.mockReturnValue([flpConfigAnswers]);
    });

    afterEach(() => {
        commitMock.mockClear();
    });

    test('Test add navigation-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(commitMock).toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot, '--simulate']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();

        expect(commitMock).not.toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
    });

    test('Test add inbound-navigation reports error', async () => {
        mockGetAppType.mockResolvedValue('SAP Fiori elements');
        mockValidateBasePath.mockRejectedValueOnce(new Error('Required file does not exist.'));
        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        // No project at path
        await command.parseAsync(getArgv(['inbound-navigation', join(__dirname, '../../../fixtures/'), '--verbose']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.info).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringMatching(/^Error while executing add inbound navigation configuration/)
        );
        expect(loggerMock.debug).toHaveBeenNthCalledWith(
            1,
            expect.stringMatching(/^Called add inbound navigation-config for path/)
        );
        expect(loggerMock.debug).toHaveBeenNthCalledWith(2, expect.any(Error));
        expect(commitMock).not.toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation calls generate when valid config is returned by prompting', async () => {
        mockGetAppType.mockResolvedValue('SAP Fiori elements');

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(mockGenerateInboundNavigationConfig).toHaveBeenCalledWith(
            expect.stringContaining('bare-minimum'),
            flpConfigAnswers,
            true,
            expect.any(Object)
        );
        expect(commitMock).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation returns and logs when config is undefined', async () => {
        mockGetAppType.mockResolvedValue('SAP Fiori elements');
        mockPromptYUIQuestions.mockResolvedValue({ ...flpConfigAnswers, overwrite: false });

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(loggerMock.info).toHaveBeenCalledWith(
            'User chose not to overwrite existing inbound navigation configuration.'
        );
        expect(mockGenerateInboundNavigationConfig).not.toHaveBeenCalled();
        expect(commitMock).not.toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation with ADP project where FLP configuration does not exist', async () => {
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockFlpConfigurationExists.mockReturnValue(false);
        mockGetBaseAppInbounds.mockResolvedValue({
            'semObject-action': {
                semanticObject: 'so1',
                action: 'act1',
                title: 'Test Title',
                subTitle: '',
                hideLauncher: false
            }
        });

        mockGetVariant.mockReturnValue({
            id: 'variantId',
            content: []
        });

        mockGetAdpConfig.mockResolvedValue({
            target: {},
            ignoreCertErrors: false
        });

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(commitMock).toHaveBeenCalled();
        expect(mockGenerateInboundConfig).toHaveBeenCalledWith(
            expect.stringContaining('bare-minimum'),
            expect.arrayContaining([flpConfigAnswers]),
            expect.any(Object)
        );
        expect(mockGenerateInboundNavigationConfig).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation with ADP project where FLP configuration does not exist with custom yaml config file', async () => {
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockFlpConfigurationExists.mockReturnValue(false);
        mockGetBaseAppInbounds.mockResolvedValue({
            'semObject-action': {
                semanticObject: 'so1',
                action: 'act1',
                title: 'Test Title',
                subTitle: '',
                hideLauncher: false
            }
        });

        mockGetVariant.mockReturnValue({
            id: 'variantId',
            content: []
        });

        mockGetAdpConfig.mockResolvedValue({
            target: {},
            ignoreCertErrors: false
        });

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot, '--config=/test/custom.yaml']));

        // Result check
        expect(mockGetAdpConfig).toHaveBeenCalledWith(appRoot, '/test/custom.yaml');
        expect(commitMock).toHaveBeenCalled();
        expect(mockGenerateInboundConfig).toHaveBeenCalledWith(
            expect.stringContaining('bare-minimum'),
            expect.arrayContaining([flpConfigAnswers]),
            expect.any(Object)
        );
        expect(mockGenerateInboundNavigationConfig).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation with ADP project where getAdpConfig throws an error', async () => {
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockFlpConfigurationExists.mockReturnValue(false);
        mockGetAdpConfig.mockRejectedValue(new Error('Failed to get ADP config'));

        // Test execution
        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        // Result check
        expect(commitMock).not.toHaveBeenCalled();
        expect(mockGenerateInboundConfig).not.toHaveBeenCalled();
        expect(mockGenerateInboundNavigationConfig).not.toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringMatching(
                /^Error while executing add inbound navigation configuration 'Failed to get ADP config'/
            )
        );
    });

    test('Test add inbound-navigation with CF ADP project fetches inbounds via FDC', async () => {
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockFlpConfigurationExists.mockReturnValue(false);
        const mockCfConfig = {
            org: { GUID: 'org-guid', Name: 'org' },
            space: { GUID: 'space-guid', Name: 'space' },
            url: '/test.cf',
            token: 'test-token'
        };
        mockIsCFEnvironment.mockResolvedValueOnce(true);
        mockLoadCfConfig.mockReturnValueOnce(mockCfConfig);
        mockGetAppParamsFromUI5Yaml.mockReturnValueOnce({
            appHostId: 'test-host-id',
            appName: 'test-app',
            appVersion: '1.0.0',
            spaceGuid: 'space-guid'
        });
        mockGetCfBaseAppInbounds.mockResolvedValueOnce({
            'semObject-action': {
                semanticObject: 'so1',
                action: 'act1',
                title: 'CF Title'
            }
        } as unknown as ManifestNamespace.Inbound);

        mockGetVariant.mockReturnValue({
            id: 'variantId',
            reference: 'base.app.id',
            content: []
        });

        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        expect(mockGetCfBaseAppInbounds).toHaveBeenCalledWith('base.app.id', 'test-host-id', mockCfConfig, expect.anything());
        expect(mockGetAdpConfig).not.toHaveBeenCalled();
        expect(commitMock).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('Test add inbound-navigation with CF ADP project fails when not logged in', async () => {
        mockGetAppType.mockResolvedValue('Fiori Adaptation');
        mockIsCFEnvironment.mockResolvedValueOnce(true);
        mockLoadCfConfig.mockReturnValueOnce({} as adpTooling.CfConfig);

        mockGetVariant.mockReturnValue({
            id: 'variantId',
            reference: 'base.app.id',
            content: []
        });

        const command = new Command('add');
        addInboundNavigationConfigCommand(command);
        await command.parseAsync(getArgv(['inbound-navigation', appRoot]));

        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('CF login required'));
    });
});
