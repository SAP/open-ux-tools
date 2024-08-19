import * as tracer from '../../../../src/tracing/trace';
import * as common from '../../../../src/common';
import * as writer from '@sap-ux/cards-editor-config-writer';
import { addCardsEditorConfigCommand } from '../../../../src/cli/add/cards-editor';
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
const testArgv = (args: string[]) => ['', '', 'cards-editor', appRoot, ...args];

describe('add/cards-editor', () => {
    const traceSpy = jest.spyOn(tracer, 'traceChanges');
    const npmInstallSpy = jest.spyOn(common, 'runNpmInstallCommand').mockImplementation(() => undefined);
    const generateSpy = jest.spyOn(writer, 'enableCardsEditor');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('add cards-editor', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        // Flow check
        expect(generateSpy).toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(npmInstallSpy).toBeCalled();
    });

    test('add cards-editor --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv(['--simulate']));

        // Flow check
        expect(generateSpy).toBeCalled();
        expect(traceSpy).toBeCalled();
        expect(npmInstallSpy).not.toBeCalled();
    });

    test('add cards-editor --skip-install', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv(['--skip-install']));

        // Flow check
        expect(generateSpy).toBeCalled();
        expect(traceSpy).not.toBeCalled();
        expect(npmInstallSpy).not.toBeCalled();
    });
});
