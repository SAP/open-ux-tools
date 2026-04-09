import { jest } from '@jest/globals';
import type { ToolsLogger } from '@sap-ux/logger';
import { Command } from 'commander';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockValidateBasePath = jest.fn();
const mockValidateAdpAppType = jest.fn();
jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: mockValidateBasePath,
    validateAdpAppType: mockValidateAdpAppType,
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

const mockIsCFEnvironment = jest.fn();
const mockLoadCfConfig = jest.fn();
const mockIsLoggedInCf = jest.fn();
const mockSetupCfPreview = jest.fn();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    isCFEnvironment: mockIsCFEnvironment,
    loadCfConfig: mockLoadCfConfig,
    isLoggedInCf: mockIsLoggedInCf,
    setupCfPreview: mockSetupCfPreview
}));

jest.unstable_mockModule('node:child_process', () => ({
    spawn: jest.fn(),
    spawnSync: jest.fn(),
    execSync: jest.fn(),
    exec: jest.fn()
}));

const { addAdaptationProjectCFConfigCommand } = await import('../../../../src/cli/add/adp-cf-config');

describe('add/adp-cf-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/adaptation-project');
    const getArgv = (...arg: string[]) => ['', '', 'adp-cf-config', ...arg];

    let loggerMock: ToolsLogger;

    const mockCfConfig = {
        org: { Name: 'test-org', GUID: 'org-guid' },
        space: { Name: 'test-space', GUID: 'space-guid' },
        token: 'test-token',
        url: 'cf.test.com'
    };

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
        mockValidateBasePath.mockResolvedValue(undefined);
        mockValidateAdpAppType.mockResolvedValue(undefined);
        mockIsCFEnvironment.mockResolvedValue(true);
        mockLoadCfConfig.mockReturnValue(mockCfConfig);
        mockIsLoggedInCf.mockResolvedValue(true);
        mockSetupCfPreview.mockResolvedValue(undefined);
    });

    test('should add command with correct options', () => {
        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        const adpCfConfigCommand = command.commands.find((cmd) => cmd.name() === 'adp-cf-config');
        expect(adpCfConfigCommand).toBeDefined();
    });

    test('should set log level verbose when --verbose flag is used', async () => {
        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await command.parseAsync(getArgv(appRoot, '--verbose'));

        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
    });

    test('should complete setup successfully', async () => {
        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await command.parseAsync(getArgv(appRoot));

        expect(mockValidateBasePath).toHaveBeenCalledWith(appRoot);
        expect(mockValidateAdpAppType).toHaveBeenCalledWith(appRoot);
        expect(mockLoadCfConfig).toHaveBeenCalledWith(loggerMock);
        expect(mockIsLoggedInCf).toHaveBeenCalledWith(mockCfConfig, loggerMock);
        expect(mockSetupCfPreview).toHaveBeenCalledWith(appRoot, 'ui5.yaml', mockCfConfig, loggerMock);
    });

    test('should use current directory when path not provided', async () => {
        const originalCwd = process.cwd();
        jest.spyOn(process, 'cwd').mockReturnValue(appRoot);

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await command.parseAsync(getArgv());

        expect(mockValidateBasePath).toHaveBeenCalledWith(appRoot);
        expect(mockSetupCfPreview).toHaveBeenCalledWith(appRoot, 'ui5.yaml', mockCfConfig, loggerMock);

        jest.spyOn(process, 'cwd').mockReturnValue(originalCwd);
    });

    test('should use custom config file when --config option is provided', async () => {
        const customConfig = 'custom-ui5.yaml';
        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await command.parseAsync(getArgv(appRoot, '--config', customConfig));

        expect(mockSetupCfPreview).toHaveBeenCalledWith(appRoot, customConfig, mockCfConfig, loggerMock);
    });

    test('should throw error when not logged in to CF', async () => {
        mockIsLoggedInCf.mockResolvedValue(false);

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow(
            'You are not logged in to Cloud Foundry or your session has expired. Please run "cf login" first.'
        );
    });

    test('should throw error when base path validation fails', async () => {
        mockValidateBasePath.mockRejectedValue(new Error('Invalid base path'));

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv('/invalid/path'))).rejects.toThrow('Invalid base path');
    });

    test('should throw error when adp app type validation fails', async () => {
        mockValidateAdpAppType.mockRejectedValue(new Error('Not an adaptation project'));

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow('Not an adaptation project');
    });

    test('should throw error when not a CF environment', async () => {
        mockIsCFEnvironment.mockResolvedValue(false);

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow(
            'This command can only be used for Cloud Foundry adaptation projects.'
        );
    });

    test('should throw error when setupCfPreview fails', async () => {
        mockSetupCfPreview.mockRejectedValue(new Error('Generation failed'));

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow('Generation failed');

        expect(loggerMock.error).toHaveBeenCalledWith('Failed to setup CF adaptation project: Generation failed');
    });
});
