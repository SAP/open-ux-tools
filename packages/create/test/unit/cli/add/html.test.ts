import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

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

jest.unstable_mockModule('../../../../src/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));
jest.unstable_mockModule('../../../../src/validation/validation', () => ({
    validateBasePath: jest.fn(),
    validateAdpAppType: jest.fn(),
    validateCloudAdpProject: jest.fn(),
    hasFileDeletes: jest.fn()
}));

const mockGeneratePreviewFiles = jest.fn();
jest.unstable_mockModule('@sap-ux/preview-middleware', () => ({
    generatePreviewFiles: mockGeneratePreviewFiles
}));

jest.unstable_mockModule('node:child_process', () => ({
    spawn: jest.fn(),
    spawnSync: jest.fn(),
    execSync: jest.fn(),
    exec: jest.fn()
}));

const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
const ui5YamlContent = readFileSync(join(appRoot, 'ui5.yaml'), 'utf-8');

jest.unstable_mockModule('mem-fs-editor', () => ({
    create(_store: Store) {
        return {
            commit: jest.fn().mockImplementation((cb) => cb()),
            dump: jest.fn(),
            read: jest.fn().mockReturnValue(ui5YamlContent),
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

const { addAddHtmlFilesCmd } = await import('../../../../src/cli/add/html');

const testArgv = (args: string[]) => ['', '', 'html', appRoot, ...args];

describe('add/html', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('add html', async () => {
        // Test execution
        const command = new Command('add');
        addAddHtmlFilesCmd(command);
        await command.parseAsync(testArgv([]));

        // Flow check
        expect(mockGeneratePreviewFiles).toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
    });

    test('add html --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddHtmlFilesCmd(command);
        await command.parseAsync(testArgv(['--simulate']));

        // Flow check
        expect(mockGeneratePreviewFiles).toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
    });
});
