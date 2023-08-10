import { join } from 'path';
import { loadModuleFromProject } from '../../src';
import { loadModule } from '../../src/project/module-loader';

describe('Test loadModuleFromProject()', () => {
    test('Load module', async () => {
        const projectModule = await loadModuleFromProject<{ FileName: {} }>(
            join(__dirname, '..'),
            '@sap-ux/ui5-config'
        );
        expect(typeof projectModule).toEqual('object');
    });

    test('Module not install in project, should throw error', async () => {
        try {
            await loadModuleFromProject('NONE/EXISTING_PATH', 'not-existing-node-module');
            fail(`Call to function loadModuleFromProject() should have thrown exception but did not.`);
        } catch (error) {
            expect(error.toString()).toContain('not-existing-node-module');
        }
    });
});

describe('Test loadModule()', () => {
    test('Load existing module', async () => {
        const module = await loadModule('@sap-ux/ui5-config');
        expect(typeof module).toEqual('object');
    });

    test('Load non existing module, should throw error', async () => {
        try {
            await loadModule('NOT_EXISTING_MODULE');
            fail('Loading a non existing module should throw an error but did not.');
        } catch (error) {
            expect(error.toString()).toContain('NOT_EXISTING_MODULE');
        }
    });
});
