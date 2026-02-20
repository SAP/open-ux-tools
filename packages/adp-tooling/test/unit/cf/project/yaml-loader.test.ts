import fs from 'node:fs';
import yaml from 'js-yaml';

import type { MtaYaml } from '../../../../src/types';
import { getYamlContent, getProjectName, getProjectNameForXsSecurity } from '../../../../src/cf/project/yaml-loader';

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('js-yaml', () => ({
    load: jest.fn()
}));

const mockYamlLoad = yaml.load as jest.MockedFunction<typeof yaml.load>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

describe('YAML Loader Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getYamlContent', () => {
        test('should successfully parse YAML file', () => {
            const filePath = '/test/mta.yaml';
            const fileContent = 'ID: test-project\nmodules: []';
            const expectedParsed = { ID: 'test-project', modules: [] };

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(fileContent);
            mockYamlLoad.mockReturnValue(expectedParsed);

            const result = getYamlContent(filePath);

            expect(mockExistsSync).toHaveBeenCalledWith(filePath);
            expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
            expect(mockYamlLoad).toHaveBeenCalledWith(fileContent);
            expect(result).toEqual(expectedParsed);
        });

        test('should throw error when file does not exist', () => {
            const filePath = '/nonexistent/mta.yaml';

            mockExistsSync.mockReturnValue(false);

            expect(() => getYamlContent(filePath)).toThrow(`Could not find file ${filePath}`);
            expect(mockExistsSync).toHaveBeenCalledWith(filePath);
            expect(mockReadFileSync).not.toHaveBeenCalled();
            expect(mockYamlLoad).not.toHaveBeenCalled();
        });

        test('should throw error when YAML parsing fails', () => {
            const filePath = '/test/invalid.yaml';
            const fileContent = 'invalid: yaml: content: [';

            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(fileContent);
            mockYamlLoad.mockImplementation(() => {
                throw new Error('YAML parsing error');
            });

            expect(() => getYamlContent(filePath)).toThrow(`Error parsing file ${filePath}: YAML parsing error`);
            expect(mockExistsSync).toHaveBeenCalledWith(filePath);
            expect(mockReadFileSync).toHaveBeenCalledWith(filePath, 'utf-8');
            expect(mockYamlLoad).toHaveBeenCalledWith(fileContent);
        });
    });

    describe('getProjectName', () => {
        test('should return project ID when present', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'my-test-project',
                version: '1.0.0',
                modules: []
            };

            const result = getProjectName(yamlContent);

            expect(result).toBe('my-test-project');
        });

        test('should return null when ID is undefined', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: undefined as unknown as string,
                version: '1.0.0',
                modules: []
            };

            const result = getProjectName(yamlContent);

            expect(result).toBeNull();
        });
    });

    describe('getProjectNameForXsSecurity', () => {
        test('should return formatted project name with timestamp', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'My.Test.Project',
                version: '1.0.0',
                modules: []
            };
            const timestamp = '20231201';

            const result = getProjectNameForXsSecurity(yamlContent, timestamp);

            expect(result).toBe('my_test_project_20231201');
        });

        test('should return undefined when timestamp is empty', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: []
            };
            const timestamp = '';

            const result = getProjectNameForXsSecurity(yamlContent, timestamp);

            expect(result).toBeUndefined();
        });

        test('should return undefined when timestamp is null', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'test-project',
                version: '1.0.0',
                modules: []
            };
            const timestamp = null as unknown as string;

            const result = getProjectNameForXsSecurity(yamlContent, timestamp);

            expect(result).toBeUndefined();
        });

        test('should handle project name with special characters', () => {
            const yamlContent: MtaYaml = {
                '_schema-version': '3.2.0',
                ID: 'my-project-with-dashes',
                version: '1.0.0',
                modules: []
            };
            const timestamp = '20231201';

            const result = getProjectNameForXsSecurity(yamlContent, timestamp);

            expect(result).toBe('my-project-with-dashes_20231201');
        });
    });
});
