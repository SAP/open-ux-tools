import { jest } from '@jest/globals';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const mockRunNpmInstallCommand = jest.fn();
jest.unstable_mockModule('../../../../src/common', () => ({
    promptYUIQuestions: jest.fn(),
    runNpmInstallCommand: mockRunNpmInstallCommand
}));

jest.unstable_mockModule('prompts', () => ({ default: jest.fn(), prompt: jest.fn() }));
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

const mockGenerate = jest.fn().mockResolvedValue({
    commit: jest.fn().mockImplementation((cb) => cb()),
    dump: jest.fn()
} as Partial<Editor> as Editor);
const mockPromptGeneratorInput = jest.fn();
const FlexLayer = { CUSTOMER_BASE: 'CUSTOMER_BASE', VENDOR: 'VENDOR' };
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    generate: mockGenerate,
    promptGeneratorInput: mockPromptGeneratorInput,
    FlexLayer
}));

const adp = await import('@sap-ux/adp-tooling');
const { addGenerateAdaptationProjectCommand } = await import('../../../../src/cli/generate/adaptation-project');

describe('generate/adaptation-project', () => {
    // test data
    const appRoot = join(__dirname, '../../../fixtures');
    const id = 'test.id';
    const reference = 'test.reference';
    const layer = adp.FlexLayer.CUSTOMER_BASE;
    const url = 'http://sap.example';
    const content = [
        {
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: {
                modelId: 'i18n',
                bundleUrl: 'i18n/i18n.properties',
                supportedLocales: [''],
                fallbackLocale: ''
            }
        }
    ];

    const getArgv = (...arg: string[]) => ['', '', 'adaptation-project', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();
        mockRunNpmInstallCommand.mockImplementation(() => Promise.resolve());
    });

    test('--id --reference --url', async () => {
        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(getArgv('--id', id, '--reference', reference, '--url', `${url}?sap-client=123`, '-y'));

        const expectedAppRoot = join(process.cwd(), id);
        // Flow check
        expect(mockPromptGeneratorInput).not.toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).toHaveBeenCalledWith(expectedAppRoot);
        // Generate call check
        expect(mockGenerate).toHaveBeenCalledWith(
            expectedAppRoot,
            expect.objectContaining({
                app: { id, reference, layer, content },
                target: { url, client: '123' }
            } as Partial<adp.AdpWriterConfig>)
        );
    });

    test('<appRoot> --id --reference --url', async () => {
        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(getArgv(appRoot, '--id', id, '--reference', reference, '--url', url, '-y'));

        // Flow check
        expect(mockPromptGeneratorInput).not.toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).toHaveBeenCalledWith(appRoot);
        expect(mockGenerate).toHaveBeenCalled();
    });

    test('<appRoot> --skip-install --id --reference --url --package', async () => {
        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(
            getArgv(
                appRoot,
                '--skip-install',
                '--id',
                id,
                '--reference',
                reference,
                '--url',
                url,
                '--package',
                '$tmp',
                '-y'
            )
        );

        // Flow check
        expect(mockPromptGeneratorInput).not.toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
        expect(mockGenerate).toHaveBeenCalled();
    });

    test('<appRoot> --simulate --id --reference --url', async () => {
        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(
            getArgv(appRoot, '--simulate', '--id', id, '--reference', reference, '--url', url, '-y')
        );

        // Flow check
        expect(mockPromptGeneratorInput).not.toHaveBeenCalled();
        expect(mockTraceChanges).toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).not.toHaveBeenCalled();
        expect(mockGenerate).toHaveBeenCalled();
    });

    test('<appRoot> --url', async () => {
        // mock prompting
        mockPromptGeneratorInput.mockResolvedValue({
            app: { id, reference, layer },
            target: { url }
        });

        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(getArgv(appRoot, '--url', url));

        // Flow check
        expect(mockPromptGeneratorInput).toHaveBeenCalled();
        expect(mockTraceChanges).not.toHaveBeenCalled();
        expect(mockRunNpmInstallCommand).toHaveBeenCalled();

        // Generate call check
        expect(mockGenerate).toHaveBeenCalledWith(
            appRoot,
            expect.objectContaining({
                app: { id, reference, layer, content },
                target: { url }
            } as Partial<adp.AdpWriterConfig>)
        );
    });

    test('error during generation', async () => {
        // mock error
        mockGenerate.mockRejectedValueOnce('test');

        // Test execution
        try {
            const command = new Command('generate');
            addGenerateAdaptationProjectCommand(command);
            await command.parseAsync(getArgv(appRoot, '--url', url));
            fail('Should have thrown an error.');
        } catch (error) {
            expect(error).toBeDefined();
        }
    });
});
