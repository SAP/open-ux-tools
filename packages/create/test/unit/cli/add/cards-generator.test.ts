import * as tracer from '../../../../src/tracing/trace';
import { enableCardGeneratorConfig } from '@sap-ux/app-config-writer';
import { addCardsEditorConfigCommand } from '../../../../src/cli/add/cards-generator';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor, create } from 'mem-fs-editor';
import { join } from 'node:path';
import * as projectAccess from '@sap-ux/project-access';

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

    beforeEach(() => {
        jest.spyOn(projectAccess, 'findProjectRoot').mockImplementation(() => Promise.resolve(''));
        jest.spyOn(projectAccess, 'getProjectType').mockImplementation(() => Promise.resolve('EDMXBackend'));
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
        expect(enableCardGeneratorConfigMock).toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
    });

    test('add cards-generator CAP with --app option', async () => {
        jest.spyOn(projectAccess, 'getProjectType').mockImplementation(() => Promise.resolve('CAPNodejs'));
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv(['--app', 'app/travel']));

        // Flow check - CAP projects with --app option should use the specified app path
        expect(enableCardGeneratorConfigMock).toHaveBeenCalledWith(
            expect.stringContaining('app/travel'),
            expect.any(String),
            expect.anything()
        );
        expect(traceSpy).not.toHaveBeenCalled();
    });

    test('add cards-generator CAP auto-detect app', async () => {
        jest.spyOn(projectAccess, 'getProjectType').mockImplementation(() => Promise.resolve('CAPNodejs'));
        jest.spyOn(projectAccess, 'findFioriArtifacts').mockImplementation(() =>
            Promise.resolve({
                applications: [
                    {
                        appRoot: join(appRoot, 'app/travel'),
                        projectRoot: appRoot,
                        manifestPath: join(appRoot, 'app/travel/webapp/manifest.json'),
                        manifest: { 'sap.app': { id: 'test.app' } } as any
                    }
                ]
            })
        );

        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        // Flow check - CAP projects should auto-detect the app
        expect(enableCardGeneratorConfigMock).toHaveBeenCalledWith(
            expect.stringContaining('app/travel'),
            expect.any(String),
            expect.anything()
        );
        expect(traceSpy).not.toHaveBeenCalled();
    });

    test('add cards-generator CAP no apps found', async () => {
        jest.spyOn(projectAccess, 'getProjectType').mockImplementation(() => Promise.resolve('CAPNodejs'));
        jest.spyOn(projectAccess, 'findFioriArtifacts').mockImplementation(() =>
            Promise.resolve({
                applications: []
            })
        );

        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        // Flow check - CAP projects with no apps should not call enableCardGeneratorConfig
        expect(enableCardGeneratorConfigMock).not.toHaveBeenCalled();
    });

    test('add cards-generator --simulate', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv(['--simulate']));

        // Flow check
        expect(enableCardGeneratorConfigMock).toHaveBeenCalled();
        expect(traceSpy).toHaveBeenCalled();
    });
});
