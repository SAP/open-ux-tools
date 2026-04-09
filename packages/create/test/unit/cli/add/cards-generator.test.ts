import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProjectAccessMock } from '../__mocks__/project-access-mock';

const __dirname = dirname(fileURLToPath(import.meta.url));

const mockTraceChanges = jest.fn();
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

const mockFindProjectRoot = jest.fn();
const mockGetProjectType = jest.fn();
jest.unstable_mockModule('@sap-ux/project-access', () => createProjectAccessMock({
    findProjectRoot: mockFindProjectRoot,
    getProjectType: mockGetProjectType
}));

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

const mockEnableCardGeneratorConfig = jest.fn();
jest.unstable_mockModule('@sap-ux/app-config-writer', () => ({
    enableCardGeneratorConfig: mockEnableCardGeneratorConfig
}));

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));

const { addCardsEditorConfigCommand } = await import('../../../../src/cli/add/cards-generator');

const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
const testArgv = (args: string[]) => ['', '', 'cards-editor', appRoot, ...args];

describe('add/cards-generator', () => {
    beforeEach(() => {
        mockFindProjectRoot.mockResolvedValue('');
        mockGetProjectType.mockResolvedValue('EDMXBackend');
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
        mockGetProjectType.mockResolvedValue('CAPNodejs');
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
});
