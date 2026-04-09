import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockEnableCdsUi5Plugin = jest.fn();
jest.unstable_mockModule('@sap-ux/cap-config-writer', () => ({
    enableCdsUi5Plugin: mockEnableCdsUi5Plugin
}));

const mockExecNpmCommand = jest.fn().mockResolvedValue('');
jest.unstable_mockModule('@sap-ux/project-access', () => createProjectAccessMock({
    execNpmCommand: mockExecNpmCommand
}));

jest.unstable_mockModule('node:child_process', () => ({
    spawn: jest.fn(),
    spawnSync: jest.fn(),
    execSync: jest.fn(),
    exec: jest.fn()
}));

const { addAddCdsPluginUi5Command } = await import('../../../../src/cli/add/cds-plugin-ui');

describe('Test command add cds-plugin-ui5', () => {
    let loggerMock: ToolsLogger;
    let fsMock: Editor;
    let command: Command;

    const getArgv = (arg: string[]) => ['', '', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock setup
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
        mockEnableCdsUi5Plugin.mockResolvedValue(fsMock);
        command = new Command('add');
        addAddCdsPluginUi5Command(command);
    });

    test('Test create-fiori add cds-plugin-ui5 __dirname', async () => {
        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5', __dirname]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(mockExecNpmCommand).toHaveBeenCalledWith(['install'], { cwd: __dirname, logger: undefined });
    });

    test('Test create-fiori add cds-plugin-ui5 --simulate', async () => {
        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5', '--simulate']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori add cds-plugin-ui5 --simulate', async () => {
        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5', '--skip-install']));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test(`Test create-fiori add cds-plugin-ui5 --skip-install --verbose join(__dirname, '..')`, async () => {
        // Test execution
        const parentDir = join(__dirname, '..');
        await command.parseAsync(getArgv(['cds-plugin-ui5', '--skip-install', '--verbose', parentDir]));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        const loggerInfoCalls = (loggerMock.info as jest.Mock).mock.calls;
        const hasCdInfo = !!loggerInfoCalls.find(
            (c) => Array.isArray(c) && c.length >= 1 && typeof c[0] === 'string' && c[0].startsWith('cd ')
        );
        expect(hasCdInfo).toBe(true);
    });

    test('Error handling with --verbose', async () => {
        // Mock setup
        mockEnableCdsUi5Plugin.mockRejectedValueOnce('ENABLE_ERROR');

        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5']));

        // Result check
        expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('ENABLE_ERROR'));
        expect(loggerMock.debug).toHaveBeenCalled();
    });

    test('Error handling with non-string error', async () => {
        // Mock setup
        mockEnableCdsUi5Plugin.mockRejectedValueOnce(undefined);

        // Test execution
        await command.parseAsync(getArgv(['cds-plugin-ui5']));

        // Result check
        expect(loggerMock.error).toHaveBeenCalled();
    });
});
