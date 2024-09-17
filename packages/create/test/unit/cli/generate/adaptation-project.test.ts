import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor, create } from 'mem-fs-editor';
import { addGenerateAdaptationProjectCommand } from '../../../../src/cli/generate/adaptation-project';
import * as tracer from '../../../../src/tracing/trace';
import * as common from '../../../../src/common';
import * as adp from '@sap-ux/adp-tooling';
import { join } from 'path';

jest.mock('prompts');
// mock mem-fs commit so that nothing is written to the file system
jest.mock('mem-fs-editor', () => {
    const editor = jest.requireActual<{ create: typeof create }>('mem-fs-editor');
    return {
        ...editor,
        create(store: Store) {
            const memFs: Editor = editor.create(store);
            memFs.commit = jest.fn().mockImplementation((cb) => cb());
            return memFs;
        }
    };
});

describe('generate/adaptation-project', () => {
    // test data
    const appRoot = join(__dirname, '../../../fixtures');
    const id = 'test.id';
    const reference = 'test.reference';
    const layer = 'CUSTOMER_BASE';
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

    // mocks
    const traceSpy = jest.spyOn(tracer, 'traceChanges');
    const npmInstallSpy = jest.spyOn(common, 'runNpmInstallCommand').mockImplementation(() => undefined);
    const generateSpy = jest.spyOn(adp, 'generate');
    const promptSpy = jest.spyOn(adp, 'promptGeneratorInput');
    const getArgv = (...arg: string[]) => ['', '', 'adaptation-project', ...arg];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('--id --reference --url', async () => {
        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(getArgv('--id', id, '--reference', reference, '--url', `${url}?sap-client=123`, '-y'));

        const expectedAppRoot = join(process.cwd(), id);
        // Flow check
        expect(promptSpy).not.toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(npmInstallSpy).toBeCalledWith(expectedAppRoot);
        // Generate call check
        expect(generateSpy).toBeCalledWith(
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
        expect(promptSpy).not.toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(npmInstallSpy).toBeCalledWith(appRoot);
        expect(generateSpy).toBeCalled();
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
        expect(promptSpy).not.toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(npmInstallSpy).not.toBeCalled();
        expect(generateSpy).toBeCalled();
    });

    test('<appRoot> --simulate --id --reference --url', async () => {
        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(
            getArgv(appRoot, '--simulate', '--id', id, '--reference', reference, '--url', url, '-y')
        );

        // Flow check
        expect(promptSpy).not.toBeCalled();
        expect(traceSpy).toBeCalled();
        expect(npmInstallSpy).not.toBeCalled();
        expect(generateSpy).toBeCalled();
    });

    test('<appRoot> --url', async () => {
        // mock prompting
        promptSpy.mockImplementation(() =>
            Promise.resolve({
                app: { id, reference, layer },
                target: { url }
            })
        );

        // Test execution
        const command = new Command('generate');
        addGenerateAdaptationProjectCommand(command);
        await command.parseAsync(getArgv(appRoot, '--url', url));

        // Flow check
        expect(promptSpy).toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(npmInstallSpy).toBeCalled();

        // Generate call check
        expect(generateSpy).toBeCalledWith(
            appRoot,
            expect.objectContaining({
                app: { id, reference, layer, content },
                target: { url }
            } as Partial<adp.AdpWriterConfig>)
        );
    });

    test('error during generation', async () => {
        // mock error
        generateSpy.mockRejectedValueOnce('test');

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
