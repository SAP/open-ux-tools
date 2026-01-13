import type { ToolsLogger } from '@sap-ux/logger';
import type { Editor } from 'mem-fs-editor';
import { Command } from 'commander';
import { join } from 'node:path';
import * as adpTooling from '@sap-ux/adp-tooling';
import * as logger from '../../../../src/tracing/logger';
import * as tracer from '../../../../src/tracing/trace';
import * as validations from '../../../../src/validation/validation';
import { addAdaptationProjectCFConfigCommand } from '../../../../src/cli/add/adp-cf-config';

jest.mock('@sap-ux/adp-tooling');

describe('add/adp-cf-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/adaptation-project');
    const getArgv = (...arg: string[]) => ['', '', 'adp-cf-config', ...arg];

    let loggerMock: ToolsLogger;
    let logLevelSpy: jest.SpyInstance;
    let validateBasePathSpy: jest.SpyInstance;
    let validateAdpAppTypeSpy: jest.SpyInstance;
    let traceChangesSpy: jest.SpyInstance;
    let loadCfConfigMock: jest.SpyInstance;
    let isLoggedInCfMock: jest.SpyInstance;
    let generateCfConfigMock: jest.SpyInstance;

    const mockCfConfig = {
        org: { Name: 'test-org', GUID: 'org-guid' },
        space: { Name: 'test-space', GUID: 'space-guid' },
        token: 'test-token',
        url: 'cf.test.com'
    };

    const mockFs: Editor = {
        commit: jest.fn().mockImplementation((files, cb) => cb(null)),
        dump: jest.fn()
    } as Partial<Editor> as Editor;

    beforeEach(() => {
        jest.clearAllMocks();

        loggerMock = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        } as Partial<ToolsLogger> as ToolsLogger;

        jest.spyOn(logger, 'getLogger').mockReturnValue(loggerMock);
        logLevelSpy = jest.spyOn(logger, 'setLogLevelVerbose').mockImplementation(() => undefined);
        validateBasePathSpy = jest.spyOn(validations, 'validateBasePath').mockResolvedValue(undefined);
        validateAdpAppTypeSpy = jest.spyOn(validations, 'validateAdpAppType').mockResolvedValue(undefined);
        traceChangesSpy = jest.spyOn(tracer, 'traceChanges').mockResolvedValue(undefined);

        loadCfConfigMock = jest.spyOn(adpTooling, 'loadCfConfig').mockReturnValue(mockCfConfig);
        isLoggedInCfMock = jest.spyOn(adpTooling, 'isLoggedInCf').mockResolvedValue(true);
        generateCfConfigMock = jest.spyOn(adpTooling, 'generateCfConfig').mockResolvedValue(mockFs);
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

        expect(logLevelSpy).toHaveBeenCalled();
    });

    test('should complete setup successfully', async () => {
        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await command.parseAsync(getArgv(appRoot));

        expect(validateBasePathSpy).toHaveBeenCalledWith(appRoot);
        expect(validateAdpAppTypeSpy).toHaveBeenCalledWith(appRoot);
        expect(loadCfConfigMock).toHaveBeenCalledWith(loggerMock);
        expect(isLoggedInCfMock).toHaveBeenCalledWith(mockCfConfig, loggerMock);
        expect(generateCfConfigMock).toHaveBeenCalledWith(appRoot, 'ui5.yaml', mockCfConfig, loggerMock);
        expect(traceChangesSpy).toHaveBeenCalledWith(mockFs);
        expect(mockFs.commit).toHaveBeenCalled();
    });

    test('should use current directory when path not provided', async () => {
        const originalCwd = process.cwd();
        jest.spyOn(process, 'cwd').mockReturnValue(appRoot);

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await command.parseAsync(getArgv());

        expect(validateBasePathSpy).toHaveBeenCalledWith(appRoot);
        expect(generateCfConfigMock).toHaveBeenCalledWith(appRoot, 'ui5.yaml', mockCfConfig, loggerMock);

        jest.spyOn(process, 'cwd').mockReturnValue(originalCwd);
    });

    test('should use custom config file when --config option is provided', async () => {
        const customConfig = 'custom-ui5.yaml';
        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await command.parseAsync(getArgv(appRoot, '--config', customConfig));

        expect(generateCfConfigMock).toHaveBeenCalledWith(appRoot, customConfig, mockCfConfig, loggerMock);
    });

    test('should throw error when not logged in to CF', async () => {
        isLoggedInCfMock.mockResolvedValue(false);

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow(
            'You are not logged in to Cloud Foundry or your session has expired. Please run "cf login" first.'
        );
    });

    test('should throw error when base path validation fails', async () => {
        validateBasePathSpy.mockRejectedValue(new Error('Invalid base path'));

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv('/invalid/path'))).rejects.toThrow('Invalid base path');
    });

    test('should throw error when adp app type validation fails', async () => {
        validateAdpAppTypeSpy.mockRejectedValue(new Error('Not an adaptation project'));

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow('Not an adaptation project');
    });

    test('should throw error when generateCfConfig fails', async () => {
        generateCfConfigMock.mockRejectedValue(new Error('Generation failed'));

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow('Generation failed');

        expect(loggerMock.error).toHaveBeenCalledWith('Failed to setup CF adaptation project: Generation failed');
    });

    test('should throw error when commit fails', async () => {
        const commitError = new Error('Commit failed');
        mockFs.commit = jest.fn().mockImplementation((files, cb) => cb(commitError));

        const command = new Command('add');
        addAdaptationProjectCFConfigCommand(command);

        await expect(command.parseAsync(getArgv(appRoot))).rejects.toThrow('Commit failed');

        expect(loggerMock.error).toHaveBeenCalledWith('Failed to setup CF adaptation project: Commit failed');
    });
});
