import memFs from 'mem-fs';
import { join } from 'path';
import editor from 'mem-fs-editor';
import { updateTsConfigCap, updateStaticLocationsInApplicationYaml } from '../../../src/cap-writer/tsconfig-and-yaml';
import { YamlDocument } from '@sap-ux/yaml';

jest.mock('@sap-ux/yaml', () => ({
    ...jest.requireActual('@sap-ux/yaml'),
    YamlDocument: {
        newInstance: jest.fn()
    }
}));

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

    test('should update static location in application yaml files corectly when spring is undefined', async () => {
        const projectName = 'test-cap-java';
        const projectPath = join(testInputPath, projectName);
        const applicationYamlPath = join(projectPath, 'application.yaml');
        const mockedResponse = {
            documents: [{ spring: { 'web.resources.static-locations': undefined } }]
        } as unknown as YamlDocument;
        (YamlDocument.newInstance as jest.Mock).mockResolvedValue(mockedResponse);
        await updateStaticLocationsInApplicationYaml(fs, applicationYamlPath, 'capCustomPathsApp');
        expect((fs as any).dump(applicationYamlPath)).toMatchSnapshot();
    });

    test('should not update static location in application yaml file if not found', async () => {
        const projectName = 'test-cap-java';
        const projectPath = join(testInputPath, projectName);
        const applicationYamlPath = join(projectPath, 'application-test.yaml');
        jest.spyOn(fs, 'write');
        await updateStaticLocationsInApplicationYaml(fs, applicationYamlPath, 'capCustomPathsApp');
        expect(fs.write).not.toHaveBeenCalled();
    });
});
