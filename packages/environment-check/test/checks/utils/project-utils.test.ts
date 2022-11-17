import { findAllPackageJsonFolders } from '../../../src/checks/utils';
import { join } from 'path';

describe('Test findAllPackageJsonFolders:', () => {
    const sampleWorkspace = join(__dirname, '..', '..', 'sample-workspace');
    // Mock setup
    const wsFolders = [sampleWorkspace];
    test('Find all projects with package.json', async () => {
        const roots = await findAllPackageJsonFolders(wsFolders);
        expect(roots).toBeDefined();
        expect(roots.length).toBe(5);
    });
});
