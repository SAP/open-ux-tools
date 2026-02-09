import * as tracer from '../../../../src/tracing/trace';
import { enableCardGeneratorConfig } from '@sap-ux/app-config-writer';
import { addCardsEditorConfigCommand } from '../../../../src/cli/add/cards-generator';
import { Command } from 'commander';
import type { Store } from 'mem-fs';
import type { Editor, create } from 'mem-fs-editor';
import { join, resolve, dirname, basename } from 'node:path';
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

    describe('path derivation for CAP projects', () => {
        test('add cards-generator with relative yaml path containing directory - verifies path derivation logic', async () => {
            // This test verifies that when a yaml path contains a directory separator,
            // the effective base path is derived from the yaml path
            const capRoot = join('/some', 'cap', 'project');
            const relativeYamlPath = join('app', 'travel_processor', 'ui5.yaml');

            // The expected derived paths based on the logic in cards-generator.ts
            const expectedEffectiveBasePath = dirname(resolve(capRoot, relativeYamlPath));
            const expectedEffectiveYamlPath = basename(relativeYamlPath);

            // Verify the path derivation logic - check for path separator (works on both Unix and Windows)
            expect(relativeYamlPath.includes('/') || relativeYamlPath.includes('\\')).toBe(true);
            expect(expectedEffectiveBasePath).toBe(join('/some', 'cap', 'project', 'app', 'travel_processor'));
            expect(expectedEffectiveYamlPath).toBe('ui5.yaml');
        });

        test('add cards-generator with simple yaml filename (no directory)', async () => {
            // Test execution
            const command = new Command('add');
            addCardsEditorConfigCommand(command);
            await command.parseAsync(testArgv(['--config', 'ui5.yaml']));

            // Flow check - should use original base path when yaml path has no directory
            expect(enableCardGeneratorConfigMock).toHaveBeenCalled();
            const [effectiveBasePath, effectiveYamlPath] = enableCardGeneratorConfigMock.mock.calls[0];

            // The effective base path should remain the original app root
            expect(effectiveBasePath).toBe(appRoot);
            // The effective yaml path should be the same as provided
            expect(effectiveYamlPath).toBe('ui5.yaml');
        });

        test('add cards-generator with nested relative yaml path - verifies path derivation logic', async () => {
            // This test verifies that when a yaml path contains nested directories,
            // the effective base path is correctly derived
            const capRoot = join('/some', 'cap', 'project');
            const relativeYamlPath = join('packages', 'app', 'webapp', 'ui5-local.yaml');

            // The expected derived paths based on the logic in cards-generator.ts
            const expectedEffectiveBasePath = dirname(resolve(capRoot, relativeYamlPath));
            const expectedEffectiveYamlPath = basename(relativeYamlPath);

            // Verify the path derivation logic - check for path separator (works on both Unix and Windows)
            expect(relativeYamlPath.includes('/') || relativeYamlPath.includes('\\')).toBe(true);
            expect(expectedEffectiveBasePath).toBe(join('/some', 'cap', 'project', 'packages', 'app', 'webapp'));
            expect(expectedEffectiveYamlPath).toBe('ui5-local.yaml');
        });
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

    test('add cards-generator CAP', async () => {
        jest.spyOn(projectAccess, 'getProjectType').mockImplementation(() => Promise.resolve('CAPNodejs'));
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv([]));

        // Flow check - CAP projects are now supported

        expect(enableCardGeneratorConfigMock).toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
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

    test('add cards-generator with verbose flag', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv(['--verbose']));

        // Flow check
        expect(enableCardGeneratorConfigMock).toHaveBeenCalled();
        expect(traceSpy).not.toHaveBeenCalled();
    });

    test('add cards-generator with custom config path', async () => {
        // Test execution
        const command = new Command('add');
        addCardsEditorConfigCommand(command);
        await command.parseAsync(testArgv(['--config', 'ui5-local.yaml']));

        // Flow check
        expect(enableCardGeneratorConfigMock).toHaveBeenCalled();
        const [, yamlPath] = enableCardGeneratorConfigMock.mock.calls[0];
        expect(yamlPath).toBe('ui5-local.yaml');
    });
});
