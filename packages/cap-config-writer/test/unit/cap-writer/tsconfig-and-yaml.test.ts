import { jest } from '@jest/globals';
import memFs from 'mem-fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import editor, { type Editor } from 'mem-fs-editor';

const mockYamlNewInstance = jest.fn();
const mockYamlDocumentToYamlString = jest.fn((doc: Record<string, Record<string, string>>) => {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(doc)) {
        lines.push(`${key}:`);
        if (typeof value === 'object' && value !== null) {
            for (const [subKey, subValue] of Object.entries(value)) {
                lines.push(`  ${subKey}: ${subValue}`);
            }
        }
    }
    return lines.join('\n') + '\n';
});

jest.unstable_mockModule('@sap-ux/yaml', () => ({
    YamlDocument: {
        newInstance: mockYamlNewInstance
    },
    yamlDocumentToYamlString: mockYamlDocumentToYamlString,
    errorCode: {},
    YAMLError: class YAMLError extends Error {}
}));

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    FileName: {
        Tsconfig: 'tsconfig.json',
        Package: 'package.json',
        Manifest: 'manifest.json'
    }
}));

const { updateTsConfig, updateStaticLocationsInApplicationYaml } = await import(
    '../../../src/cap-writer/tsconfig-and-yaml'
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Writing tsConfig and yaml files', () => {
    let fs: Editor;
    const testInputPath = join(__dirname, 'test-inputs');

    // beforeEach function to reset fs before each test
    beforeEach(() => {
        const store = memFs.create();
        // Create a new instance of the Editor class before each test
        fs = editor.create(store);
        jest.clearAllMocks();
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
        };
        mockYamlNewInstance.mockResolvedValue(mockedResponse);
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
