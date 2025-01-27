import path from 'path';
import { readFileSync } from 'fs';
import type { Editor } from 'mem-fs-editor';

import type { AdpWriterConfig } from '../../../src';
import {
    writeTemplateToFolder,
    writeUI5Yaml,
    writeUI5DeployYaml,
    getPackageJSONInfo
} from '../../../src/writer/project-utils';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    read: jest.fn(),
    copyTpl: jest.fn(),
    write: jest.fn(),
    readFileSync: jest.fn()
}));

const readFileSyncMock = readFileSync as jest.Mock;

describe('Project Utils', () => {
    const data: AdpWriterConfig = {
        app: {
            id: 'my.test.app',
            reference: 'the.original.app'
        },
        target: {
            url: 'http://sap.example'
        },
        options: {
            enableTypeScript: false
        }
    };

    const ui5Yaml = `# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json
                    specVersion: "3.0"
                    metadata:
                    name: ${data.app.id}
                    type: application`;

    describe('getPackageJSONInfo', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should return package.json content when file is read successfully', () => {
            const mockJSON = { name: 'test-package', version: '1.0.0' };
            readFileSyncMock.mockReturnValue(JSON.stringify(mockJSON));

            const result = getPackageJSONInfo();

            expect(result).toEqual(mockJSON);
        });

        it('should return default package info on read failure', () => {
            readFileSyncMock.mockImplementation(() => {
                throw new Error('File not found');
            });

            const result = getPackageJSONInfo();

            expect(result).toEqual({ name: '@sap-ux/adp-tooling', version: 'NO_VERSION_FOUND' });
        });
    });

    describe('writeTemplateToFolder', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const templatePath = '../../../templates/project';
        const projectPath = 'project';

        const writeFilesSpy = jest.fn();
        const mockFs = { copyTpl: writeFilesSpy };

        it('should write template to the specified folder', () => {
            writeTemplateToFolder(templatePath, projectPath, data, mockFs as unknown as Editor);

            expect(writeFilesSpy.mock.calls[0][0]).toEqual(`${templatePath}/**/*.*`);
            expect(writeFilesSpy.mock.calls[0][1]).toEqual(projectPath);
            expect(writeFilesSpy.mock.calls[0][2]).toEqual(data);
        });

        it('should write TS template to the specified folder when project supports typescript', () => {
            const newData = { ...data, options: { enableTypeScript: true } };
            writeTemplateToFolder(templatePath, projectPath, newData, mockFs as unknown as Editor);

            expect(writeFilesSpy.mock.calls[0][0]).toEqual(`${templatePath}/**/*.*`);
            expect(writeFilesSpy.mock.calls[0][1]).toEqual(projectPath);
            expect(writeFilesSpy.mock.calls[0][2]).toEqual(newData);
        });

        it('should throw error when writing file fails', () => {
            const errMsg = 'Corrupted file.';
            mockFs.copyTpl.mockImplementation(() => {
                throw new Error(errMsg);
            });

            expect(() => {
                writeTemplateToFolder(templatePath, projectPath, data, mockFs as unknown as Editor);
            }).toThrow(`Could not write template files to folder. Reason: ${errMsg}`);
        });
    });

    describe('writeUI5Yaml', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const projectPath = 'project';

        const writeFilesSpy = jest.fn();
        const mockFs = { write: writeFilesSpy, read: jest.fn().mockReturnValue(ui5Yaml) };

        it('should write ui5.yaml to the specified folder', async () => {
            await writeUI5Yaml(projectPath, data, mockFs as unknown as Editor);

            expect(writeFilesSpy.mock.calls[0][0]).toEqual(path.join(projectPath, 'ui5.yaml'));
        });

        it('should throw error when writing ui5.yaml fails', async () => {
            const errMsg = 'Corrupted file.';
            mockFs.write.mockImplementation(() => {
                throw new Error(errMsg);
            });

            try {
                await writeUI5Yaml(projectPath, data, mockFs as unknown as Editor);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).toBe(`Could not write ui5.yaml file. Reason: ${errMsg}`);
            }
        });
    });

    describe('writeUI5DeployYaml', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const projectPath = 'project';
        const config: AdpWriterConfig = {
            ...data,
            deploy: {
                package: '$TMP'
            }
        };

        const writeFilesSpy = jest.fn();
        const mockFs = { write: writeFilesSpy, read: jest.fn().mockReturnValue(ui5Yaml) };

        it('should write ui5-deploy.yaml to the specified folder', async () => {
            await writeUI5DeployYaml(projectPath, config, mockFs as unknown as Editor);

            expect(writeFilesSpy.mock.calls[0][0]).toEqual(path.join(projectPath, 'ui5-deploy.yaml'));
        });

        it('should throw error when writing ui5-deploy.yaml fails', async () => {
            const errMsg = 'Corrupted file.';
            mockFs.write.mockImplementation(() => {
                throw new Error(errMsg);
            });

            try {
                await writeUI5DeployYaml(projectPath, config, mockFs as unknown as Editor);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).toBe(`Could not write ui5-deploy.yaml file. Reason: ${errMsg}`);
            }
        });
    });
});
