import { jest } from '@jest/globals';
import type { Editor } from 'mem-fs-editor';
import { Command } from 'commander';
import type { ToolsLogger } from '@sap-ux/logger';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProjectAccessMock } from '../__mocks__/project-access-mock.js';

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

jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

const mockGenerateOPAFiles = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/ui5-test-writer', () => ({
    generateOPAFiles: mockGenerateOPAFiles
}));

const mockReadManifest = jest.fn() as jest.Mock;
const mockCreateApplicationAccess = jest.fn() as jest.Mock;
const mockGetMinUI5VersionAsArray = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        createApplicationAccess: mockCreateApplicationAccess,
        getMinUI5VersionAsArray: mockGetMinUI5VersionAsArray
    })
);

const { addGenerateOpa5TestsCommand } = await import('../../../../src/cli/generate/opa5-tests.js');

describe('generate/opa5-tests', () => {
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
            commit: jest.fn().mockImplementation((callback: () => void) => callback())
        } as Partial<Editor> as Editor;

        mockReadManifest.mockResolvedValue({});
        mockCreateApplicationAccess.mockResolvedValue({ readManifest: mockReadManifest });
        mockGetMinUI5VersionAsArray.mockReturnValue(['1.120.0']);
        mockGenerateOPAFiles.mockResolvedValue(fsMock);
    });

    test('should generate OPA tests and write changes', async () => {
        const command = new Command('generate');
        addGenerateOpa5TestsCommand(command);
        await command.parseAsync(getArgv(['opa5-tests', appRoot]));

        expect(mockSetLogLevelVerbose).not.toHaveBeenCalled();
        expect(mockGenerateOPAFiles).toHaveBeenCalledWith(
            appRoot,
            { ui5Version: '1.120.0' },
            undefined,
            undefined,
            loggerMock,
            true
        );
        expect(fsMock.commit).toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(loggerMock.info).toHaveBeenCalledWith('Changes written.');
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should generate OPA tests --simulate (no write, verbose set)', async () => {
        const command = new Command('generate');
        addGenerateOpa5TestsCommand(command);
        await command.parseAsync(getArgv(['opa5-tests', appRoot, '--simulate']));

        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(mockGenerateOPAFiles).toHaveBeenCalled();
        expect(fsMock.commit).not.toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalledWith(fsMock);
        expect(loggerMock.info).not.toHaveBeenCalled();
        expect(loggerMock.error).not.toHaveBeenCalled();
    });

    test('should set verbose with --verbose', async () => {
        const command = new Command('generate');
        addGenerateOpa5TestsCommand(command);
        await command.parseAsync(getArgv(['opa5-tests', appRoot, '--verbose']));

        expect(mockSetLogLevelVerbose).toHaveBeenCalled();
        expect(fsMock.commit).toHaveBeenCalled();
    });

    test('should force TypeScript with --typescript', async () => {
        const command = new Command('generate');
        addGenerateOpa5TestsCommand(command);
        await command.parseAsync(getArgv(['opa5-tests', appRoot, '--typescript']));

        expect(mockGenerateOPAFiles).toHaveBeenCalledWith(
            appRoot,
            { enableTypeScript: true, ui5Version: '1.120.0' },
            undefined,
            undefined,
            loggerMock,
            true
        );
    });

    test('should pick the 1.x version when multiple minUI5Versions exist', async () => {
        mockGetMinUI5VersionAsArray.mockReturnValue(['2.0.0', '1.120.0']);

        const command = new Command('generate');
        addGenerateOpa5TestsCommand(command);
        await command.parseAsync(getArgv(['opa5-tests', appRoot]));

        expect(mockGenerateOPAFiles).toHaveBeenCalledWith(
            appRoot,
            { ui5Version: '1.120.0' },
            undefined,
            undefined,
            loggerMock,
            true
        );
    });

    test('should omit ui5Version when manifest has no valid version', async () => {
        mockGetMinUI5VersionAsArray.mockReturnValue([]);

        const command = new Command('generate');
        addGenerateOpa5TestsCommand(command);
        await command.parseAsync(getArgv(['opa5-tests', appRoot]));

        expect(mockGenerateOPAFiles).toHaveBeenCalledWith(appRoot, {}, undefined, undefined, loggerMock, true);
    });

    test('should default to current working directory when no path is provided', async () => {
        const cwd = process.cwd();

        const command = new Command('generate');
        addGenerateOpa5TestsCommand(command);
        await command.parseAsync(getArgv(['opa5-tests']));

        expect(mockCreateApplicationAccess).toHaveBeenCalledWith(cwd);
        expect(mockGenerateOPAFiles).toHaveBeenCalledWith(
            cwd,
            { ui5Version: '1.120.0' },
            undefined,
            undefined,
            loggerMock,
            true
        );
    });

    test('should report error and not write when generation fails', async () => {
        const errorObj = new Error('Cannot read manifest');
        mockGenerateOPAFiles.mockRejectedValueOnce(errorObj);

        const command = new Command('generate');
        addGenerateOpa5TestsCommand(command);
        await command.parseAsync(getArgv(['opa5-tests', appRoot, '--verbose']));

        expect(loggerMock.error).toHaveBeenCalledWith(
            `Error while executing generate opa5-tests '${errorObj.message}'`
        );
        expect(fsMock.commit).not.toHaveBeenCalled();
    });
});
