import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn() as jest.Mock;
const mockSetLogLevelVerbose = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockTraceChanges = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../../src/tracing/trace', () => ({
    traceChanges: mockTraceChanges
}));

const mockGenerateVariantsConfig = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    generateVariantsConfig: mockGenerateVariantsConfig
}));

jest.unstable_mockModule('node:child_process', () => ({
    spawn: jest.fn(),
    spawnSync: jest.fn(),
    execSync: jest.fn(),
    exec: jest.fn()
}));
jest.unstable_mockModule('prompts', () => ({
    default: jest.fn(),
    prompt: jest.fn()
}));

const { addAddVariantsConfigCommand } = await import('../../../../src/cli/add/variants-config.js');

describe('Test command add variants-config', () => {
    const appRoot = join(__dirname, '../../../fixtures/bare-minimum');
    let loggerMock: ToolsLogger;
    let fsMock: Editor;

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
            exists: jest.fn(),
            commit: jest.fn().mockImplementation((callback) => callback())
        } as Partial<Editor> as Editor;
        mockGenerateVariantsConfig.mockResolvedValue(fsMock);
    });

    test('Test create-fiori add variants-config <appRoot>', async () => {
        // Test execution
        const command = new Command('add');
        addAddVariantsConfigCommand(command);
        await command.parseAsync(getArgv(['variants-config', appRoot]));

        // Result check
        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('Test create-fiori add variants-config <appRoot> --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddVariantsConfigCommand(command);
        await command.parseAsync(getArgv(['variants-config', appRoot, '-s']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.warn).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('Test create-fiori add variants-config --verbose', async () => {
        // Test execution
        const command = new Command('add');
        addAddVariantsConfigCommand(command);
        await command.parseAsync(getArgv(['variants-config', '--verbose']));

        // Result check
        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.error).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });
});
