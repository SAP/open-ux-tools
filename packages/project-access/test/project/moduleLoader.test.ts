import { join } from 'path';
import { loadModuleFromProject } from '../../src/project/moduleLoader';

describe('Test loadModuleFromProject()', () => {
    test('Load module', () => {
        const projectModule = loadModuleFromProject(join(__dirname, '..'), '@sap/cds');
        expect(projectModule).toBeDefined();
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
