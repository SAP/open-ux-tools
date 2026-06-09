import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProjectAccessMock } from '../__mocks__/project-access-mock.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockTraceChanges = jest.fn() as jest.Mock;
jest.unstable_mockModule('../../../../src/tracing/trace', () => ({
    traceChanges: mockTraceChanges
}));

jest.unstable_mockModule('../../../../src/tracing/logger', () => ({
    getLogger: jest.fn().mockReturnValue({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }),
    setLogLevelVerbose: jest.fn()
}));

const mockFindProjectRoot = jest.fn() as jest.Mock;
const mockGetProjectType = jest.fn() as jest.Mock;
const mockGetMinimumUI5Version = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/project-access', () =>
    createProjectAccessMock({
        findProjectRoot: mockFindProjectRoot,
        getProjectType: mockGetProjectType,
        getMinimumUI5Version: mockGetMinimumUI5Version
    })
);

jest.unstable_mockModule('mem-fs-editor', () => ({
    create(_store: Store) {
        return {
            commit: jest.fn().mockImplementation((cb) => cb()),
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

const mockEnableCardGeneratorConfig = jest.fn() as jest.Mock;
const mockReadManifest = jest.fn() as jest.Mock;
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    enableCardGeneratorConfig: mockEnableCardGeneratorConfig,
    readManifest: mockReadManifest
}));

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const { addCardsEditorConfigCommand } = await import('../../../../src/cli/add/cards-generator.js');

const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
const testArgv = (args: string[]) => ['', '', 'cards-editor', appRoot, ...args];

describe('add/cards-generator', () => {
    beforeEach(() => {
        mockFindProjectRoot.mockResolvedValue('');
        (mockGetProjectType as any).mockResolvedValue('EDMXBackend');
        (mockReadManifest as any).mockResolvedValue({
            manifest: {
                'sap.ui5': {
                    dependencies: {
                        minUI5Version: '1.140.0'
                    }
                }
            }
        });
        (mockGetMinimumUI5Version as any).mockReturnValue('1.140.0');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('add cards-generator', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        // Flow check
        expect(mockEnableCardGeneratorConfig).toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
    });

    test('add cards-generator CAP', async () => {
        (mockGetProjectType as any).mockResolvedValue('CAPNodejs');
        (mockGetMinimumUI5Version as any).mockReturnValue('1.150.0');
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        // Flow check - CAP projects are now supported

        expect(mockEnableCardGeneratorConfig).toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
    });

    test('add cards-generator --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv(['--simulate']));

        // Flow check
        expect(mockEnableCardGeneratorConfig).toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
    });

    test('should exit with error when UI5 version is too low for EDMX project', async () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as any);
        (mockGetProjectType as any).mockResolvedValue('EDMXBackend');
        (mockGetMinimumUI5Version as any).mockReturnValue('1.120.0');

        const command = new Command('add');
        addCardsEditorConfigCommand(command);

        try {
            await command.parseAsync(testArgv([]));
        } catch (error: any) {
            // Expected to throw due to process.exit
            expect(error.message).toBe('process.exit called');
        }

        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
    });

    test('should exit with error when UI5 version is too low for CAP project', async () => {
        const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
            throw new Error('process.exit called');
        }) as any);
        (mockGetProjectType as any).mockResolvedValue('CAPNodejs');
        (mockGetMinimumUI5Version as any).mockReturnValue('1.140.0');

        const command = new Command('add');
        addCardsEditorConfigCommand(command);

        try {
            await command.parseAsync(testArgv([]));
        } catch (error: any) {
            // Expected to throw due to process.exit
            expect(error.message).toBe('process.exit called');
        }

        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
    });

    test('should proceed when UI5 version meets EDMX requirement (1.136.0)', async () => {
        (mockGetProjectType as any).mockResolvedValue('EDMXBackend');
        (mockGetMinimumUI5Version as any).mockReturnValue('1.136.0');

        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        expect(mockEnableCardGeneratorConfig).toHaveBeenCalled();
    });

    test('should proceed when UI5 version meets CAP requirement (1.149.0)', async () => {
        (mockGetProjectType as any).mockResolvedValue('CAPNodejs');
        (mockGetMinimumUI5Version as any).mockReturnValue('1.149.0');

        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        expect(mockEnableCardGeneratorConfig).toHaveBeenCalled();
    });
});
