import * as tracer from '../../../../src/tracing/trace';
import * as preview from '@sap-ux/preview-middleware';
import { addAddHtmlFilesCmd } from '../../../../src/cli/add/html';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor, create } from 'mem-fs-editor';
import { join } from 'path';

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

const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
const testArgv = (args: string[]) => ['', '', 'html', appRoot, ...args];

describe('add/html', () => {
    const traceSpy = jest.spyOn(tracer, 'traceChanges');
    const generateSpy = jest.spyOn(preview, 'generatePreviewFiles');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('add html', async () => {
        // Test execution
        const command = new Command('add');
        addAddHtmlFilesCmd(command);
        await command.parseAsync(testArgv([]));

        // Flow check
        expect(generateSpy).toBeCalled();
        expect(traceSpy).not.toBeCalled();
    });

    test('add html --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addAddHtmlFilesCmd(command);
        await command.parseAsync(testArgv(['--simulate']));

        // Flow check
        expect(generateSpy).toBeCalled();
        expect(traceSpy).toBeCalled();
    });
});
