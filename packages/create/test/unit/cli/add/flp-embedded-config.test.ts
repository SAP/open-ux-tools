import { jest } from '@jest/globals';
import { Command } from 'commander';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Editor } from 'mem-fs-editor';
import type { ToolsLogger } from '@sap-ux/logger';
const __dirname = dirname(fileURLToPath(import.meta.url));

const mockGetLogger = jest.fn();
const mockSetLogLevelVerbose = jest.fn();
jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: mockGetLogger,
    setLogLevelVerbose: mockSetLogLevelVerbose
}));

const mockGenerateFlpEmbeddedConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    generateFlpEmbeddedConfig: mockGenerateFlpEmbeddedConfig,
    DEFAULT_FLP_PATH: 'sap/bc/ui5_ui5/ui2/ushell/shells/abap/Fiorilaunchpad.html'
}));

jest.unstable_mockModule('prompts', () => ({
    default: jest.fn()
}));

const { addFlpEmbeddedConfigCommand } = await import('../../../../src/cli/add/flp-embedded-config.js');

describe('Test command add flp-embedded-config', () => {
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
        fsMock = {
            dump: jest.fn(),
            exists: jest.fn(),
            commit: jest.fn().mockImplementation((callback: (error?: Error) => void) => callback())
        } as Partial<Editor> as Editor;
        mockGenerateFlpEmbeddedConfig.mockResolvedValue(fsMock);
    });

    test('add flp-embedded-config with required bspApplication option', async () => {
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app']));

        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(loggerMock.debug).toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
        expect(mockGenerateFlpEmbeddedConfig).toHaveBeenCalledWith(
            appRoot,
            'my-bsp-app',
            expect.any(String),
            expect.any(String),
            undefined,
            loggerMock
        );
    });

    test('add flp-embedded-config --simulate', async () => {
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app', '--simulate']));

        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('add flp-embedded-config --verbose', async () => {
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app', '--verbose']));

        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('add flp-embedded-config passes error to logger when generateFlpEmbeddedConfig throws', async () => {
        mockGenerateFlpEmbeddedConfig.mockRejectedValueOnce(new Error('something went wrong'));
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app']));

        expect(loggerMock.error).toHaveBeenCalledWith(
            'Error while executing add flp-embedded-config: something went wrong'
        );
        expect(fsMock.commit).not.toHaveBeenCalled();
    });

    test('add flp-embedded-config passes commit error to logger', async () => {
        fsMock.commit = jest
            .fn()
            .mockImplementation((callback: (error?: Error) => void) => callback(new Error('disk full')));
        const command = new Command('add');
        addFlpEmbeddedConfigCommand(command);
        await command.parseAsync(getArgv(['flp-embedded-config', appRoot, '-b', 'my-bsp-app']));

        expect(loggerMock.error).toHaveBeenCalledWith('Error while executing add flp-embedded-config: disk full');
        expect(loggerMock.info).not.toHaveBeenCalled();
    });
});
