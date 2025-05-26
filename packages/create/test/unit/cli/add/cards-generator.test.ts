import * as tracer from '../../../../src/tracing/trace';
import { enableCardGeneratorConfig } from '@sap-ux/app-config-writer';
import { addCardsEditorConfigCommand } from '../../../../src/cli/add/cards-generator';
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

jest.mock('@sap-ux/app-config-writer', () => {
    return {
        ...jest.requireActual('@sap-ux/app-config-writer'),
        enableCardGeneratorConfig: jest.fn()
    };
});

const enableCardGeneratorConfigMock = enableCardGeneratorConfig as jest.Mock;
const appRoot = join(__dirname, '../../../fixtures/ui5-deploy-config');
const testArgv = (args: string[]) => ['', '', 'cards-editor', appRoot, ...args];

describe('add/cards-generator', () => {
    const traceSpy = jest.spyOn(tracer, 'traceChanges');

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('add cards-generator', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        // Flow check
        expect(enableCardGeneratorConfigMock).toBeCalled();
        expect(traceSpy).not.toBeCalled();
    });

    test('add cards-generator --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv(['--simulate']));

        // Flow check
        expect(enableCardGeneratorConfigMock).toBeCalled();
        expect(traceSpy).toBeCalled();
    });
});
