import memFs from 'mem-fs';
import { join } from 'path';
import editor from 'mem-fs-editor';
import { updateCAPManifestJson } from '../../../src/cap-writer/manifest-json';

describe('Writing/manifest json files', () => {
    const store = memFs.create();
    const fs = editor.create(store);
    const testInputPath = join(__dirname, 'test-inputs');

    test('should remove ODataAnnotations from manifest json where annotations are defined as an array', async () => {
        const projectName = 'test-cap-package-sapux';
        const projectPath = join(testInputPath, projectName);
        const manifestJsonPath = join(projectPath, 'webapp', 'manifest.json');
        updateCAPManifestJson(fs, projectPath);
        expect((fs as any).dump(manifestJsonPath)).toMatchSnapshot();
    });

    test('should remove ODataAnnotations from manifest json where annotations are defined as an object', async () => {
        const projectName = 'test-cap-package-no-sapux';
        const projectPath = join(testInputPath, projectName);
        const manifestJsonPath = join(projectPath, 'webapp', 'manifest.json');
        updateCAPManifestJson(fs, projectPath);
        expect((fs as any).dump(manifestJsonPath)).toMatchSnapshot();
    });

    test('should not update manifest for cap projects when project path is invalid', async () => {
        fs.extendJSON = jest.fn();
        fs.writeJSON = jest.fn();
        updateCAPManifestJson(fs, 'test/testFile');
        // Verify that fs.extendJSON is not called
        expect(fs.extendJSON).not.toHaveBeenCalled();
        // Verify that fs.writeJSON is not called
        expect(fs.writeJSON).not.toHaveBeenCalled();
    });
});
