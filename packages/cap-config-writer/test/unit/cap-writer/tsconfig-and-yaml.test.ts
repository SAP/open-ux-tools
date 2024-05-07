import memFs from 'mem-fs';
import { join } from 'path';
import editor from 'mem-fs-editor';
import { updateTsConfigCap, updateStaticLocationsInApplicationYaml } from '../../../src/cap-writer/tsconfig-and-yaml';

describe('Writing tsConfig and yaml files', () => {
    const store = memFs.create();
    const fs = editor.create(store);
    const testInputPath = join(__dirname, 'test-inputs');

    test('should update tsConfig files correctly', async () => {
        const projectName = 'test-cap-package-sapux';
        const projectPath = join(testInputPath, projectName);
        const tsConfigPath = join(projectPath, 'webapp', 'manifest.json');
        updateTsConfigCap(fs, projectPath);
        expect((fs as any).dump(tsConfigPath)).toMatchSnapshot();
    });

    test('should update yaml files corectly', async () => {
        const projectName = 'test-cap-package-sapux';
        const projectPath = join(testInputPath, projectName);
        const applicationYamlPath = join(projectPath, 'ui5.yaml');
        await updateStaticLocationsInApplicationYaml(fs, applicationYamlPath, 'capCustomPathsApp');
        expect((fs as any).dump(applicationYamlPath)).toMatchSnapshot();
    });
});
