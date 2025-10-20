import path, { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { Editor } from 'mem-fs-editor';

import { getTypesPackage, getTypesVersion, getEsmTypesVersion, UI5_DEFAULT } from '@sap-ux/ui5-config';

import { type AdpWriterConfig, AppRouterType, FlexLayer } from '../../../src';
import {
    writeTemplateToFolder,
    writeUI5Yaml,
    writeUI5DeployYaml,
    writeCfUI5Yaml,
    writeCfUI5BuildYaml,
    getPackageJSONInfo,
    getTypes
} from '../../../src/writer/project-utils';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    read: jest.fn(),
    copyTpl: jest.fn(),
    write: jest.fn(),
    readFileSync: jest.fn()
}));

jest.mock('@sap-ux/ui5-config', () => ({
    ...jest.requireActual('@sap-ux/ui5-config'),
    getTypesPackage: jest.fn(),
    getEsmTypesVersion: jest.fn(),
    getTypesVersion: jest.fn()
}));

const readFileSyncMock = readFileSync as jest.Mock;
const mockedGetTypesPackage = getTypesPackage as jest.Mock;
const mockedGetTypesVersion = getTypesVersion as jest.Mock;
const mockedGetEsmTypesVersion = getEsmTypesVersion as jest.Mock;

const cfData = {
    app: {
        id: 'my.test.cf.app',
        title: 'My Test CF App',
        layer: FlexLayer.CUSTOMER_BASE,
        namespace: 'my.test.cf.app',
        manifest: {} as any
    },
    baseApp: {
        appId: 'the.original.app',
        appName: 'Original App',
        appVersion: '1.0.0',
        appHostId: 'host123',
        serviceName: 'service123',
        title: 'Original App Title'
    },
    cf: {
        url: 'https://cf.example.com',
        org: { Name: 'test-org', GUID: 'org-guid' },
        space: { Name: 'test-space', GUID: 'space-guid' },
        html5RepoRuntimeGuid: 'runtime-guid',
        approuter: AppRouterType.MANAGED,
        businessService: 'business-service'
    },
    project: {
        name: 'my-test-cf-project',
        path: '/test/path',
        folder: '/test/path/my-test-cf-project'
    },
    ui5: {
        version: '1.133.1'
    },
    options: {
        addStandaloneApprouter: false
    }
};

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
        },
        ui5: {
            version: '1.133.1'
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

    describe('getTypes', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return default types for snapshot version', () => {
            const result = getTypes('1.137.0-snapshot');

            expect(result).toEqual({
                typesPackage: UI5_DEFAULT.TYPES_PACKAGE_NAME,
                typesVersion: `~${UI5_DEFAULT.TYPES_VERSION_BEST}`
            });
        });

        it('should return classic types package and version when applicable', () => {
            mockedGetTypesPackage.mockReturnValue(UI5_DEFAULT.TYPES_PACKAGE_NAME);
            mockedGetTypesVersion.mockReturnValue('1.108.0');

            const result = getTypes('1.108.0');

            expect(mockedGetTypesPackage).toHaveBeenCalledWith('1.108.0');
            expect(mockedGetTypesVersion).toHaveBeenCalledWith('1.108.0');
            expect(result).toEqual({
                typesPackage: UI5_DEFAULT.TYPES_PACKAGE_NAME,
                typesVersion: '1.108.0'
            });
        });

        it('should return esm types package and version if not default', () => {
            mockedGetTypesPackage.mockReturnValue('@sapui5/esm-types');
            mockedGetEsmTypesVersion.mockReturnValue('1.112.1');

            const result = getTypes('1.112.1');

            expect(mockedGetTypesPackage).toHaveBeenCalledWith('1.112.1');
            expect(mockedGetEsmTypesVersion).toHaveBeenCalledWith('1.112.1');
            expect(result).toEqual({
                typesPackage: '@sapui5/esm-types',
                typesVersion: '1.112.1'
            });
        });

        it('should handle undefined version gracefully', () => {
            mockedGetTypesPackage.mockReturnValue(UI5_DEFAULT.TYPES_PACKAGE_NAME);
            mockedGetTypesVersion.mockReturnValue('1.136.0');

            const result = getTypes(undefined);

            expect(result).toEqual({
                typesPackage: UI5_DEFAULT.TYPES_PACKAGE_NAME,
                typesVersion: '1.136.0'
            });
        });
    });

    describe('writeTemplateToFolder', () => {
        beforeEach(() => {
            jest.clearAllMocks();

            mockedGetTypesPackage.mockReturnValue(UI5_DEFAULT.TYPES_PACKAGE_NAME);
            mockedGetTypesVersion.mockReturnValue('~1.136.0');
        });

        const templatePath = '../../../templates';
        const projectPath = 'project';

        const writeFilesSpy = jest.fn();
        const mockFs = { copyTpl: writeFilesSpy };

        it('should write template to the specified folder', () => {
            writeTemplateToFolder(templatePath, projectPath, data, mockFs as unknown as Editor);

            expect(writeFilesSpy.mock.calls[0][0]).toEqual(join(templatePath, 'project', '**', '*.*'));
            expect(writeFilesSpy.mock.calls[0][1]).toEqual(projectPath);
            expect(writeFilesSpy.mock.calls[0][2]).toEqual({
                ...data,
                typesPackage: '@sapui5/types',
                typesVersion: '~1.136.0'
            });
        });

        it('should write TS template to the specified folder when project supports typescript', () => {
            const newData = { ...data, options: { enableTypeScript: true } };
            writeTemplateToFolder(templatePath, projectPath, newData, mockFs as unknown as Editor);

            expect(writeFilesSpy.mock.calls[0][0]).toEqual(join(templatePath, 'project', '**', '*.*'));
            expect(writeFilesSpy.mock.calls[0][1]).toEqual(projectPath);
            expect(writeFilesSpy.mock.calls[0][2]).toEqual({
                ...newData,
                typesPackage: '@sapui5/types',
                typesVersion: '~1.136.0'
            });
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

    describe('writeCfUI5Yaml', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const projectPath = 'project';

        const ui5YamlContent = `# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json
specVersion: "3.0"
metadata:
  name: ${cfData.app.id}
  type: application`;

        const writeFilesSpy = jest.fn();
        const mockFs = {
            write: writeFilesSpy,
            read: jest.fn().mockReturnValue(ui5YamlContent)
        };

        it('should write ui5.yaml for CF project to the specified folder', async () => {
            await writeCfUI5Yaml(projectPath, cfData, mockFs as unknown as Editor);

            expect(mockFs.read).toHaveBeenCalledWith(path.join(projectPath, 'ui5.yaml'));
            expect(writeFilesSpy).toHaveBeenCalledWith(
                path.join(projectPath, 'ui5.yaml'),
                expect.stringContaining('propertiesFileSourceEncoding: UTF-8')
            );
            expect(writeFilesSpy).toHaveBeenCalledWith(
                path.join(projectPath, 'ui5.yaml'),
                expect.stringContaining('paths:')
            );
            expect(writeFilesSpy).toHaveBeenCalledWith(
                path.join(projectPath, 'ui5.yaml'),
                expect.stringContaining('webapp: dist')
            );
        });

        it('should throw error when reading ui5.yaml fails', async () => {
            const errMsg = 'File not found';
            mockFs.read.mockImplementation(() => {
                throw new Error(errMsg);
            });

            try {
                await writeCfUI5Yaml(projectPath, cfData, mockFs as unknown as Editor);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).toBe(`Could not write ui5.yaml file. Reason: ${errMsg}`);
            }
        });
    });

    describe('writeCfUI5BuildYaml', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const projectPath = 'project';

        const ui5BuildYamlContent = `# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5-build.yaml.json
specVersion: "3.0"
metadata:
  name: ${cfData.app.id}
  type: application`;

        const writeFilesSpy = jest.fn();
        const mockFs = {
            write: writeFilesSpy,
            read: jest.fn().mockReturnValue(ui5BuildYamlContent)
        };

        it('should write ui5-build.yaml for CF project to the specified folder', async () => {
            await writeCfUI5BuildYaml(projectPath, cfData, mockFs as unknown as Editor);

            expect(mockFs.read).toHaveBeenCalledWith(path.join(projectPath, 'ui5-build.yaml'));
            expect(writeFilesSpy).toHaveBeenCalledWith(
                path.join(projectPath, 'ui5-build.yaml'),
                expect.stringContaining('propertiesFileSourceEncoding: UTF-8')
            );
        });

        it('should throw error when reading ui5-build.yaml fails', async () => {
            const errMsg = 'File not found';
            mockFs.read.mockImplementation(() => {
                throw new Error(errMsg);
            });

            try {
                await writeCfUI5BuildYaml(projectPath, cfData, mockFs as unknown as Editor);
                fail('Expected error to be thrown');
            } catch (error) {
                expect(error.message).toBe(`Could not write ui5-build.yaml file. Reason: ${errMsg}`);
            }
        });
    });
});
