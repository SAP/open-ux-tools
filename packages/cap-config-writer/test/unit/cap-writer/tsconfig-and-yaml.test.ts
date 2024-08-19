import memFs from 'mem-fs';
import { join } from 'path';
import editor, { type Editor } from 'mem-fs-editor';
import { updateTsConfig, updateStaticLocationsInApplicationYaml } from '../../../src/cap-writer/tsconfig-and-yaml';
import { YamlDocument } from '@sap-ux/yaml';

jest.mock('@sap-ux/yaml', () => ({
    ...jest.requireActual('@sap-ux/yaml'),
    YamlDocument: {
        newInstance: jest.fn()
    }
}));

describe('Writing tsConfig and yaml files', () => {
    let fs: Editor;
    const testInputPath = join(__dirname, 'test-inputs');

    // beforeEach function to reset fs before each test
    beforeEach(() => {
        const store = memFs.create();
        // Create a new instance of the Editor class before each test
        fs = editor.create(store);
    });

    test('should update tsConfig files correctly', async () => {
        const projectName = 'test-cap-package-sapux';
        const projectPath = join(testInputPath, projectName);
        const tsConfigPath = join(projectPath, 'tsconfig.json');
        updateTsConfig(fs, projectPath);
        const tsConfigJson = (fs.readJSON(tsConfigPath) as any) ?? {};
        const compilerOptions = tsConfigJson.compilerOptions.typeRoots;
        expect(compilerOptions).toEqual([
            './node_modules/@types',
            '../../node_modules/@types'
        ]); // prettier-ignore
    });

    test('should update static location in application yaml files corectly when spring is undefined', async () => {
        const projectName = 'test-cap-java';
        const projectPath = join(testInputPath, projectName);
        const applicationYamlPath = join(projectPath, 'srv/src/main/resources', 'application.yaml');
        const mockedResponse = {
            documents: [{ spring: { 'web.resources.static-locations': undefined } }]
        } as unknown as YamlDocument;
        (YamlDocument.newInstance as jest.Mock).mockResolvedValue(mockedResponse);
        await updateStaticLocationsInApplicationYaml(fs, applicationYamlPath, 'capCustomPathsApp');
        const applicationYaml = (fs as any).dump(applicationYamlPath);
        const contents = applicationYaml[''].contents;
        expect(contents).toEqual('spring:\n  web.resources.static-locations: file:./capCustomPathsApp\n');
    });

    test('should not update static location in application yaml file if not found', async () => {
        const projectName = 'test-cap-java';
        const projectPath = join(testInputPath, projectName);
        const applicationYamlPath = join(projectPath, 'srv/src/main/resources', 'application-test.yaml');
        jest.spyOn(fs, 'write');
        await updateStaticLocationsInApplicationYaml(fs, applicationYamlPath, 'capCustomPathsApp');
        expect(fs.write).not.toHaveBeenCalled();
    });
});
